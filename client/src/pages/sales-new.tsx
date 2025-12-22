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
} from "lucide-react";
import type { Product, Category } from "@shared/schema";
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
  })).min(1, "At least one item is required"),
});

type SaleFormData = z.infer<typeof saleFormSchema>;

const GLOBAL_TAX_RATE = 9.5; // California sales tax

export default function NewSale() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: settings } = useQuery<{ globalTaxRate: string }>({
    queryKey: ["/api/settings/tax"],
  });

  const { data: categories } = useQuery<Category[]>({
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

  // Calculate totals
  const subtotal = watchedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.unitPrice || "0") * item.quantity);
  }, 0);

  const perItemTaxTotal = watchedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.perItemTax || "0") * item.quantity);
  }, 0);

  const discount = parseFloat(watchedDiscount || "0");
const laborCost = parseFloat(watchedLabor || "0");
const taxableAmount = subtotal + laborCost - discount;
  const globalTaxAmount = taxableAmount * (globalTaxRate / 100);
const grandTotal = taxableAmount + globalTaxAmount + perItemTaxTotal;

  const createSaleMutation = useMutation({
    mutationFn: async (data: SaleFormData) => {
      const payload = {
        ...data,
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
      const isTireCategory =
        product.categoryId !== null &&
        product.categoryId !== undefined &&
        tireCategoryIds.includes(product.categoryId);
      const looksLikeTire = (product.name || "").toLowerCase().includes("tire");
      const inferredPerItemTax =
        product.perItemTax ||
        ((isTireCategory || looksLikeTire) && (product.condition || "new").toLowerCase() === "new" ? "1.75" : "0");

      append({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: 1,
        unitPrice: product.sellingPrice,
        perItemTax: inferredPerItemTax,
        maxQuantity: product.quantity,
        categoryId: product.categoryId || undefined,
        condition: product.condition,
      });
    }
    setProductSearchOpen(false);
    setSearchQuery("");
  };

  const filteredProducts = products?.filter(
    (p) =>
      p.isActive &&
      p.quantity > 0 &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              {filteredProducts?.slice(0, 10).map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={product.sku}
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
                            <TableHead className="text-right">Per-Item Tax</TableHead>
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
                                    <p className="text-xs text-muted-foreground font-mono">
                                      {field.productSku}
                                    </p>
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
                                            max={field.maxQuantity}
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
                    <FormField
                      control={form.control}
                      name="laborCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Labor Cost</FormLabel>
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
                          <span className="text-muted-foreground">Per-Item Taxes</span>
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
    </div>
  );
}
