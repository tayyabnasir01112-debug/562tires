import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Settings as SettingsIcon,
  DollarSign,
  Tag,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Store,
} from "lucide-react";
import type { Category } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const [globalTaxRate, setGlobalTaxRate] = useState("9.5");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const { data: settings, isLoading: settingsLoading } = useQuery<{ globalTaxRate: string }>({
    queryKey: ["/api/settings/tax"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Set tax rate from settings when loaded
  useState(() => {
    if (settings?.globalTaxRate) {
      setGlobalTaxRate(settings.globalTaxRate);
    }
  });

  const updateTaxMutation = useMutation({
    mutationFn: async (rate: string) => {
      return apiRequest("POST", "/api/settings/tax", { globalTaxRate: rate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/tax"] });
      toast({ title: "Tax rate updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update tax rate", variant: "destructive" });
    },
  });

  const saveCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      if (editingCategory) {
        return apiRequest("PATCH", `/api/categories/${editingCategory.id}`, data);
      }
      return apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: editingCategory ? "Category updated" : "Category created",
      });
      handleCloseCategoryForm();
    },
    onError: () => {
      toast({
        title: "Failed to save category",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const handleCloseCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDescription("");
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setShowCategoryForm(true);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) return;
    saveCategoryMutation.mutate({
      name: categoryName,
      description: categoryDescription,
    });
  };

  const handleDeleteCategory = (category: Category) => {
    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage store settings, tax rates, and product categories
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Store Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Information
            </CardTitle>
            <CardDescription>
              Your store details displayed on invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">562 Tires</p>
                <p className="text-sm text-muted-foreground">13441 Imperial Hwy, Whittier, CA 90605</p>
                <p className="text-sm text-muted-foreground">Phone: (562) 469-1064</p>
                <p className="text-xs text-muted-foreground">
                  Mon-Fri 8am-7pm • Sat 8am-5pm • Sun 8am-3pm
                </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Contact support to update store information
            </p>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Tax Settings
            </CardTitle>
            <CardDescription>
              Configure global sales tax and per-item tax rates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="globalTaxRate">Global Sales Tax Rate (%)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="globalTaxRate"
                    type="number"
                    step="0.01"
                    value={globalTaxRate}
                    onChange={(e) => setGlobalTaxRate(e.target.value)}
                    placeholder="9.5"
                    className="font-mono"
                    data-testid="input-global-tax-rate"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
                <Button
                  onClick={() => updateTaxMutation.mutate(globalTaxRate)}
                  disabled={updateTaxMutation.isPending}
                  data-testid="button-save-tax-rate"
                >
                  {updateTaxMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                California state sales tax is 9.5%. This applies to all sales.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Per-Item Tax</Label>
              <p className="text-sm text-muted-foreground">
                Per-item taxes (like the $1.73/tire fee) are configured on each
                product individually in the Inventory section.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Product Categories
            </CardTitle>
            <CardDescription>
              Organize inventory into categories
            </CardDescription>
          </div>
          <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-category">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Category" : "Add Category"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryName">Name *</Label>
                  <Input
                    id="categoryName"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g., Tires"
                    data-testid="input-category-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryDescription">Description</Label>
                  <Input
                    id="categoryDescription"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Optional description"
                    data-testid="input-category-description"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={handleCloseCategoryForm}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveCategory}
                    disabled={!categoryName.trim() || saveCategoryMutation.isPending}
                    data-testid="button-save-category"
                  >
                    {saveCategoryMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingCategory ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <p className="text-sm text-muted-foreground">Loading categories...</p>
          ) : categories && categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} data-testid={`row-category-${category.id}`}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No categories yet</p>
              <p className="text-xs">Create categories to organize your inventory</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
