import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import type { Product, Category } from "@shared/schema";
import { Loader2 } from "lucide-react";

const productFormSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  quantity: z.number().min(0, "Quantity must be 0 or more"),
  minStockLevel: z.number().min(0, "Min stock level must be 0 or more"),
  costPrice: z.string().min(1, "Cost price is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  perItemTax: z.string().optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
  isActive: z.boolean(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product | null;
  categories: Category[];
  onClose: () => void;
}

function generateSku() {
  const ts = Date.now().toString(36).toUpperCase();
  return `SKU-${ts.slice(-8)}`;
}

export function ProductForm({ product, categories, onClose }: ProductFormProps) {
  const { toast } = useToast();
  const isEditing = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      sku: product?.sku || generateSku(),
      name: product?.name || "",
      description: product?.description || "",
      categoryId: product?.categoryId?.toString() || "",
      brand: product?.brand || "",
      size: product?.size || "",
      quantity: product?.quantity || 0,
      minStockLevel: product?.minStockLevel || 5,
      costPrice: product?.costPrice || "",
      sellingPrice: product?.sellingPrice || "",
      perItemTax: product?.perItemTax || "0",
      location: product?.location || "",
      condition: (product as any)?.condition || "new",
      isActive: product?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const payload = {
        ...data,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        condition: data.condition || "new",
      };
      
      if (isEditing) {
        return apiRequest("PATCH", `/api/products/${product.id}`, payload);
      }
      return apiRequest("POST", "/api/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: isEditing ? "Product updated" : "Product created",
        description: isEditing
          ? "The product has been updated successfully."
          : "The product has been added to inventory.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Auto-generated" 
                    {...field} 
                    className="font-mono"
                    data-testid="input-product-sku"
                    disabled
                  />
                </FormControl>
                <FormDescription>Generated automatically</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., All-Season Tire 225/65R17" 
                    {...field}
                    data-testid="input-product-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Product description..." 
                  {...field}
                  data-testid="input-product-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-product-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || "new"}>
                  <FormControl>
                    <SelectTrigger data-testid="select-product-condition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="refurbished">Refurbished</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Michelin" 
                    {...field}
                    data-testid="input-product-brand"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., 225/65R17" 
                    {...field}
                    className="font-mono"
                    data-testid="input-product-size"
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
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Price *</FormLabel>
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
                      data-testid="input-product-cost"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price *</FormLabel>
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
                      data-testid="input-product-price"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity in Stock</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-product-quantity"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minStockLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Stock Level</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-product-min-stock"
                  />
                </FormControl>
                <FormDescription>Alert when stock falls below</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="perItemTax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Per-Item Tax</FormLabel>
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
                      data-testid="input-product-per-item-tax"
                    />
                  </div>
                </FormControl>
                <FormDescription>Fixed tax per unit (e.g., $1.73/tire)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warehouse Location</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., Aisle 3, Shelf B" 
                  {...field}
                  data-testid="input-product-location"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Product</FormLabel>
                <FormDescription>
                  Inactive products won't appear in sales
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-product-active"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-product">
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
