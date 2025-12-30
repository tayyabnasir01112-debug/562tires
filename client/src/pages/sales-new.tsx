import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  Search,
  ChevronsUpDown,
  Check,
  Loader2,
  FileText,
  Car,
  User,
  ShoppingCart,
  Receipt,
  PackagePlus,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Product } from "@shared/schema";
import { cn } from "@/lib/utils";

const saleFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  licensePlate: z.string().optional(),
  mileage: z.string().optional(),
  paymentMethod: z.enum(["cash", "card", "check"]),
  cashReceived: z.string().optional(),
  changeGiven: z.string().optional(),
  chequeNumber: z.string().optional(),
  warrantyType: z.enum(["none", "full", "partial"]).optional(),
  warrantyDuration: z.string().optional(),
  warrantyItemIds: z.array(z.number()).optional(),
  notes: z.string().optional(),
  discount: z.string().optional(),
  laborCost: z.string().optional(),
  items: z.array(z.object({
    productId: z.number(),
    productName: z.string(),
    productSku: z.string(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.string(),
    perItemTax: z.string(),
    maxQuantity: z.number(),
    categoryId: z.number().optional(),
    condition: z.string().optional(),
    isTaxable: z.boolean().optional(), // For custom items - whether to include in global tax
  })).min(1, "At least one item is required"),
});

type SaleFormData = z.infer<typeof saleFormSchema>;

const GLOBAL_TAX_RATE = 9.5; // California sales tax

export default function NewSale() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({
    name: "",
    price: "",
    quantity: "",
    applySalesTax: false,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: settings } = useQuery<{ globalTaxRate: string }>({
    queryKey: ["/api/settings/tax"],
  });

  const { data: categories } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/categories"],
  });

  const globalTaxRate = parseFloat(settings?.globalTaxRate || String(GLOBAL_TAX_RATE));

  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      vehicleMake: "",
      vehicleModel: "",
      vehicleYear: "",
      licensePlate: "",
      mileage: "",
      paymentMethod: "card",
      notes: "",
      discount: "0",
      laborCost: "0",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const watchedDiscount = form.watch("discount");
  const watchedLabor = form.watch("laborCost");
  const watchedPaymentMethod = form.watch("paymentMethod");
  const watchedCashReceived = form.watch("cashReceived");
  const watchedWarrantyType = form.watch("warrantyType");

  // Calculate totals
  const subtotal = watchedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.unitPrice || "0") * item.quantity);
  }, 0);

  const perItemTaxTotal = watchedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.perItemTax || "0") * item.quantity);
  }, 0);

  const discount = parseFloat(watchedDiscount || "0");
  const laborCost = parseFloat(watchedLabor || "0");
  
  // Calculate taxable amount - exclude non-taxable items (custom items with toggle off)
  const taxableSubtotal = watchedItems.reduce((sum, item) => {
    // If isTaxable is explicitly false, exclude from taxable amount
    // Default to true for regular items (undefined means taxable)
    if (item.isTaxable === false) {
      return sum;
    }
    return sum + (parseFloat(item.unitPrice || "0") * item.quantity);
  }, 0);
  
  // Only apply tax if there are taxable items
  // If all items are non-taxable, no tax should be applied (including on labor)
  const taxableAmount = taxableSubtotal > 0 
    ? taxableSubtotal + laborCost - discount
    : 0;
  const globalTaxAmount = taxableAmount * (globalTaxRate / 100);
  const grandTotal = subtotal + laborCost - discount + globalTaxAmount + perItemTaxTotal;

  const createSaleMutation = useMutation({
    mutationFn: async (data: SaleFormData) => {
      // Convert -1 productId to null for custom items
      const items = data.items.map(item => ({
        ...item,
        productId: item.productId === -1 ? null : item.productId,
      }));
      
      const payload = {
        ...data,
        items,
        subtotal: subtotal.toFixed(2),
        globalTaxRate: globalTaxRate.toFixed(2),
        globalTaxAmount: globalTaxAmount.toFixed(2),
        perItemTaxTotal: perItemTaxTotal.toFixed(2),
        discount: discount.toFixed(2),
        laborCost: laborCost.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
      };
      return apiRequest("POST", "/api/sales", payload);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sale completed",
        description: `Invoice ${data.invoiceNumber} has been created.`,
      });
      navigate(`/sales/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sale",
        variant: "destructive",
      });
    },
  });

  const tireCategoryIds = (categories || [])
    .filter((c) => c.name.toLowerCase().includes("tire"))
    .map((c) => c.id);

  const addProduct = (product: Product) => {
    // Check if product already in cart
    const existingIndex = fields.findIndex(
      (item) => item.productId === product.id
    );

    if (existingIndex >= 0) {
      const currentQty = watchedItems[existingIndex].quantity;
      if (currentQty < product.quantity) {
        form.setValue(`items.${existingIndex}.quantity`, currentQty + 1);
      } else {
        toast({
          title: "Maximum quantity reached",
          description: `Only ${product.quantity} units available in stock.`,
          variant: "destructive",
        });
      }
    } else {
      const isTire =
        product.categoryId !== null &&
        product.categoryId !== undefined &&
        tireCategoryIds.includes(product.categoryId);
      const isNew = ((product as any).condition || "new").toLowerCase() === "new";

      const productPerItemTax = parseFloat(product.perItemTax || "0");
      const inferredPerItemTax =
        productPerItemTax > 0
          ? productPerItemTax.toFixed(2)
          : (isTire && isNew ? "1.75" : "0");

      append({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: 1,
        unitPrice: product.sellingPrice,
        perItemTax: inferredPerItemTax,
        maxQuantity: product.quantity,
        categoryId: product.categoryId || undefined,
        condition: (product as any).condition,
      });
    }
    setProductSearchOpen(false);
  };

  const filteredProducts = products?.filter(
    (p) =>
      p.isActive &&
      p.quantity > 0
  );

  const addCustomItem = () => {
    if (!customItemForm.name.trim()) {
      toast({
        title: "Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(customItemForm.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Error",
        description: "Valid price is required",
        variant: "destructive",
      });
      return;
    }

    // Quantity is optional, default to 1 if not provided
    const quantity = customItemForm.quantity.trim() === "" 
      ? 1 
      : parseInt(customItemForm.quantity) || 1;
    
    if (quantity < 1) {
      toast({
        title: "Error",
        description: "Quantity must be at least 1",
        variant: "destructive",
      });
      return;
    }

    // Custom items don't have per-item tax (California tire fee only applies to new tires)
    // Only sales tax toggle controls whether item is taxable
    append({
      productId: -1, // Sentinel value for custom items
      productName: customItemForm.name.trim(),
      productSku: "CUSTOM",
      quantity: quantity,
      unitPrice: price.toFixed(2),
      perItemTax: "0", // No per-item tax for custom items
      maxQuantity: 999999, // No limit for custom items
      categoryId: undefined,
      condition: undefined,
      isTaxable: customItemForm.applySalesTax, // Include in global tax only if toggle is on
    });

    setCustomItemForm({
      name: "",
      price: "",
      quantity: "",
      applySalesTax: false,
    });
    setCustomItemOpen(false);
  };

  const onSubmit = (data: SaleFormData) => {
    createSaleMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">New Sale</h1>
          <p className="text-sm text-muted-foreground">
            Create a new sale transaction
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Smith"
                              {...field}
                              data-testid="input-customer-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(555) 123-4567"
                              {...field}
                              data-testid="input-customer-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="customerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              {...field}
                              data-testid="input-customer-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123 Main St, Los Angeles, CA"
                              {...field}
                              data-testid="input-customer-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="vehicleMake"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Toyota"
                              {...field}
                              data-testid="input-vehicle-make"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vehicleModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Camry"
                              {...field}
                              data-testid="input-vehicle-model"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vehicleYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="2022"
                              {...field}
                              data-testid="input-vehicle-year"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="licensePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Plate</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ABC1234"
                              {...field}
                              className="uppercase font-mono"
                              data-testid="input-license-plate"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mileage</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="45,000"
                              {...field}
                              data-testid="input-mileage"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Items
                    </span>
                    <div className="flex gap-2">
                      <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid="button-add-item"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="end">
                        <Command>
                          <CommandInput
                            placeholder="Search products..."
                          />
                          <CommandList>
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              {filteredProducts?.slice(0, 10).map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.name} ${product.sku}`}
                                  onSelect={() => addProduct(product)}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {product.sku} • {product.quantity} in stock
                                    </p>
                                  </div>
                                  <span className="font-mono text-sm ml-2">
                                    ${parseFloat(product.sellingPrice).toFixed(2)}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomItemOpen(true)}
                        data-testid="button-add-custom-item"
                      >
                        <PackagePlus className="h-4 w-4 mr-2" />
                        Add Custom Item
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No items added yet</p>
                      <p className="text-xs">Click "Add Item" to add products to this sale</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="w-[100px]">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">California Tire Fee</TableHead>
                            <TableHead className="text-right">Line Total</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => {
                            const item = watchedItems[index];
                            const lineTotal =
                              parseFloat(item?.unitPrice || "0") * (item?.quantity || 0);
                            const lineTax =
                              parseFloat(item?.perItemTax || "0") * (item?.quantity || 0);

                            return (
                              <TableRow key={field.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{field.productName}</p>
                                    {field.productSku !== "CUSTOM" && (
                                      <p className="text-xs text-muted-foreground font-mono">
                                        {field.productSku}
                                      </p>
                                    )}
                                    {field.productSku === "CUSTOM" && (
                                      <p className="text-xs text-muted-foreground italic">
                                        Custom Item
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.quantity`}
                                    render={({ field: qtyField }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min={1}
                                            max={field.maxQuantity === 999999 ? undefined : field.maxQuantity}
                                            {...qtyField}
                                            onChange={(e) =>
                                              qtyField.onChange(parseInt(e.target.value) || 1)
                                            }
                                            className="w-20"
                                            data-testid={`input-item-qty-${index}`}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  ${parseFloat(item?.unitPrice || "0").toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                  ${lineTax.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-medium">
                                  ${lineTotal.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    data-testid={`button-remove-item-${index}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {form.formState.errors.items && (
                    <p className="text-sm text-destructive mt-2">
                      {form.formState.errors.items.message}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Payment & Notes */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Payment & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-method">
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="card">Credit/Debit Card</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="check">Check</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                $
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                className="pl-7 font-mono"
                                data-testid="input-discount"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Payment Details based on payment method */}
                  {watchedPaymentMethod === "cash" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="cashReceived"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cash Received</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  $
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  className="pl-7 font-mono"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Recalculate grand total for change calculation
                                    const received = parseFloat(e.target.value) || 0;
                                    const currentSubtotal = watchedItems.reduce((sum, item) => {
                                      return sum + (parseFloat(item.unitPrice || "0") * item.quantity);
                                    }, 0);
                                    const currentPerItemTax = watchedItems.reduce((sum, item) => {
                                      return sum + (parseFloat(item.perItemTax || "0") * item.quantity);
                                    }, 0);
                                    const currentDiscount = parseFloat(watchedDiscount || "0");
                                    const currentLabor = parseFloat(watchedLabor || "0");
                                    const currentTaxableSubtotal = watchedItems.reduce((sum, item) => {
                                      if (item.isTaxable === false) return sum;
                                      return sum + (parseFloat(item.unitPrice || "0") * item.quantity);
                                    }, 0);
                                    const currentTaxableAmount = currentTaxableSubtotal > 0 
                                      ? currentTaxableSubtotal + currentLabor - currentDiscount
                                      : 0;
                                    const currentGlobalTax = currentTaxableAmount * (globalTaxRate / 100);
                                    const currentGrandTotal = currentSubtotal + currentLabor - currentDiscount + currentGlobalTax + currentPerItemTax;
                                    const change = received - currentGrandTotal;
                                    form.setValue("changeGiven", change > 0 ? change.toFixed(2) : "0.00");
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="changeGiven"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Change Given</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  $
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  className="pl-7 font-mono"
                                  readOnly
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  {watchedPaymentMethod === "check" && (
                    <FormField
                      control={form.control}
                      name="chequeNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cheque Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter cheque number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="laborCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Labor</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              className="pl-7 font-mono"
                              data-testid="input-labor-cost"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Warranty Section */}
                  <div className="space-y-4 border-t pt-4">
                    <FormField
                      control={form.control}
                      name="warrantyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warranty</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select warranty type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Warranty</SelectItem>
                              <SelectItem value="full">Full Invoice Warranty</SelectItem>
                              <SelectItem value="partial">Partial Items Warranty</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {watchedWarrantyType && watchedWarrantyType !== "none" && (
                      <>
                        <FormField
                          control={form.control}
                          name="warrantyDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Warranty Duration</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., 1 year, 6 months, 90 days"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {watchedWarrantyType === "partial" && (
                          <div className="space-y-2">
                            <FormLabel>Select Items for Warranty</FormLabel>
                            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                              {watchedItems.map((item, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={form.watch(`warrantyItemIds`)?.includes(index) || false}
                                    onChange={(e) => {
                                      const currentIds = form.watch("warrantyItemIds") || [];
                                      if (e.target.checked) {
                                        form.setValue("warrantyItemIds", [...currentIds, index]);
                                      } else {
                                        form.setValue("warrantyItemIds", currentIds.filter(id => id !== index));
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <label className="text-sm">
                                    {item.productName} (Qty: {item.quantity})
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional notes for this sale..."
                            {...field}
                            data-testid="input-sale-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-mono">${subtotal.toFixed(2)}</span>
                      </div>
                      {laborCost > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Labor</span>
                          <span className="font-mono">${laborCost.toFixed(2)}</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="font-mono text-destructive">
                            -${discount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Sales Tax ({globalTaxRate}%)
                        </span>
                        <span className="font-mono">${globalTaxAmount.toFixed(2)}</span>
                      </div>
                      {perItemTaxTotal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">California Tire Fee</span>
                          <span className="font-mono">${perItemTaxTotal.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium text-lg">
                      <span>Total</span>
                      <span className="font-mono" data-testid="text-grand-total">
                        ${grandTotal.toFixed(2)}
                      </span>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={createSaleMutation.isPending || fields.length === 0}
                      data-testid="button-complete-sale"
                    >
                      {createSaleMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Complete Sale
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Invoice will be generated upon completion
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </form>
      </Form>

      {/* Custom Item Dialog */}
      <Dialog open={customItemOpen} onOpenChange={setCustomItemOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product/Service Name *</label>
              <Input
                placeholder="e.g., Labor, Service Fee, Custom Product"
                value={customItemForm.name}
                onChange={(e) =>
                  setCustomItemForm({ ...customItemForm, name: e.target.value })
                }
                data-testid="input-custom-item-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={customItemForm.price}
                    onChange={(e) =>
                      setCustomItemForm({ ...customItemForm, price: e.target.value })
                    }
                    className="pl-7 font-mono"
                    data-testid="input-custom-item-price"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity (optional)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={customItemForm.quantity}
                  onChange={(e) =>
                    setCustomItemForm({ ...customItemForm, quantity: e.target.value })
                  }
                  className="font-mono"
                  data-testid="input-custom-item-quantity"
                />
                <p className="text-xs text-muted-foreground">Defaults to 1 if not specified</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Apply Sales Tax</label>
                  <p className="text-xs text-muted-foreground">
                    Apply {globalTaxRate}% sales tax to this item
                  </p>
                </div>
                <Switch
                  checked={customItemForm.applySalesTax}
                  onCheckedChange={(checked) =>
                    setCustomItemForm({ ...customItemForm, applySalesTax: checked })
                  }
                  data-testid="switch-apply-sales-tax"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCustomItemOpen(false);
                setCustomItemForm({
                  name: "",
                  price: "",
                  quantity: "",
                  applySalesTax: false,
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={addCustomItem} data-testid="button-add-custom-item-submit">
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
