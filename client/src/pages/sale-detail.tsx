import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Download,
  Printer,
  FileText,
  User,
  Car,
  Receipt,
  Circle,
  Share2,
  Copy,
  Edit,
} from "lucide-react";
import type { SaleWithItems } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function SaleDetail() {
  const [match, params] = useRoute("/sales/:id");
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    paymentMethod: "card" as "cash" | "card" | "check",
    cashReceived: "",
    changeGiven: "",
    chequeNumber: "",
    warrantyType: "none" as "none" | "full" | "partial",
    warrantyDuration: "",
    notes: "",
  });

  const { data: sale, isLoading, error } = useQuery<SaleWithItems>({
    queryKey: ["/api/sales", params?.id],
    enabled: !!params?.id,
    retry: 1,
  });

  // Initialize edit form when sale loads
  useEffect(() => {
    if (sale) {
      setEditForm({
        customerName: sale.customerName || "",
        customerPhone: sale.customerPhone || "",
        customerEmail: sale.customerEmail || "",
        customerAddress: sale.customerAddress || "",
        paymentMethod: (sale.paymentMethod as "cash" | "card" | "check") || "card",
        cashReceived: (sale as any).cashReceived || "",
        changeGiven: (sale as any).changeGiven || "",
        chequeNumber: (sale as any).chequeNumber || "",
        warrantyType: ((sale as any).warrantyType as "none" | "full" | "partial") || "none",
        warrantyDuration: (sale as any).warrantyDuration || "",
        notes: sale.notes || "",
      });
    }
  }, [sale]);

  const updateSaleMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      return apiRequest("PUT", `/api/sales/${params?.id}`, data);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({
        title: "Sale updated",
        description: "The sale has been updated successfully.",
      });
      setEditOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sale",
        variant: "destructive",
      });
    },
  });

  const handleDownloadInvoice = async () => {
    try {
      const response = await fetch(`/api/sales/${params?.id}/invoice`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to generate invoice");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${sale?.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Invoice downloaded",
        description: "The invoice PDF has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareLink = async () => {
    if (!params?.id) return;
    const link = `${window.location.origin}/receipt/${params.id}`;
    await navigator.clipboard.writeText(link);
    toast({
      title: "Link copied",
      description: "Invoice link copied to clipboard. Share it with your customer via text, email, or WhatsApp.",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-1">Sale not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The requested sale could not be found.
            </p>
            <Button asChild>
              <Link href="/sales">Back to Sales</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sales" data-testid="button-back-to-sales">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Invoice {sale.invoiceNumber}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(sale.saleDate!).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleShareLink}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownloadInvoice} data-testid="button-download-invoice">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Preview */}
      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center">
                <Circle className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">562 Tyres</h2>
                <p className="text-sm text-muted-foreground">Los Angeles, CA</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-semibold">{sale.invoiceNumber}</p>
              <Badge variant="secondary" className="capitalize mt-1">
                {sale.paymentStatus}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 mb-8">
            {/* Customer Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <User className="h-4 w-4" />
                Customer
              </div>
              <p className="font-medium">{sale.customerName}</p>
              {sale.customerPhone && (
                <p className="text-sm text-muted-foreground">{sale.customerPhone}</p>
              )}
              {sale.customerEmail && (
                <p className="text-sm text-muted-foreground">{sale.customerEmail}</p>
              )}
              {sale.customerAddress && (
                <p className="text-sm text-muted-foreground">{sale.customerAddress}</p>
              )}
            </div>

            {/* Vehicle Info */}
            {(sale.vehicleMake || sale.vehicleModel) && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Car className="h-4 w-4" />
                  Vehicle
                </div>
                <p className="font-medium">
                  {sale.vehicleYear} {sale.vehicleMake} {sale.vehicleModel}
                </p>
                {sale.licensePlate && (
                  <p className="text-sm text-muted-foreground font-mono">
                    {sale.licensePlate}
                  </p>
                )}
                {sale.mileage && (
                  <p className="text-sm text-muted-foreground">
                    {sale.mileage} miles
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">California Tire Fee</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sale.items || []).map((item) => {
                  const lineTotal = parseFloat(item.unitPrice || "0") * (item.quantity || 0);
                  const lineTax = parseFloat(item.perItemTax || "0") * (item.quantity || 0);
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {item.productSku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${parseFloat(item.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        ${lineTax.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${lineTotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">${parseFloat(sale.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat((sale as any).laborCost || "0") > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Labor</span>
                  <span className="font-mono">${parseFloat((sale as any).laborCost || "0").toFixed(2)}</span>
                </div>
              )}
              {parseFloat(sale.discount || "0") > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-mono text-destructive">
                    -${parseFloat(sale.discount || "0").toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Sales Tax ({parseFloat(sale.globalTaxRate).toFixed(1)}%)
                </span>
                <span className="font-mono">
                  ${parseFloat(sale.globalTaxAmount).toFixed(2)}
                </span>
              </div>
              {parseFloat(sale.perItemTaxTotal || "0") > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">California Tire Fee</span>
                  <span className="font-mono">
                    ${parseFloat(sale.perItemTaxTotal || "0").toFixed(2)}
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium text-lg">
                <span>Grand Total</span>
                <span className="font-mono" data-testid="text-invoice-total">
                  ${parseFloat(sale.grandTotal).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="mt-8 pt-6 border-t">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Receipt className="h-4 w-4" />
              Payment Information
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="capitalize">
                  {sale.paymentMethod === "card" ? "Credit/Debit Card" : sale.paymentMethod === "cash" ? "Cash" : "Check"}
                </Badge>
                <Badge variant={sale.paymentStatus === "paid" ? "default" : "secondary"}>
                  {sale.paymentStatus}
                </Badge>
              </div>
              {sale.paymentMethod === "cash" && (sale as any).cashReceived && (
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash Received:</span>
                    <span className="font-mono">${parseFloat((sale as any).cashReceived || "0").toFixed(2)}</span>
                  </div>
                  {(sale as any).changeGiven && parseFloat((sale as any).changeGiven || "0") > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Change Given:</span>
                      <span className="font-mono">${parseFloat((sale as any).changeGiven || "0").toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
              {sale.paymentMethod === "check" && (sale as any).chequeNumber && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Cheque Number: </span>
                  <span className="font-mono">{(sale as any).chequeNumber}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Warranty Info */}
          {(sale as any).warrantyType && (sale as any).warrantyType !== "none" && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <FileText className="h-4 w-4" />
                Warranty Information
              </div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Warranty Type: </span>
                  <span className="capitalize">{(sale as any).warrantyType === "full" ? "Full Invoice" : "Partial Items"}</span>
                </div>
                {(sale as any).warrantyDuration && (
                  <div>
                    <span className="text-muted-foreground">Duration: </span>
                    <span>{(sale as any).warrantyDuration}</span>
                  </div>
                )}
                {(sale as any).warrantyType === "partial" && (sale as any).warrantyItemIds && (
                  <div className="mt-2">
                    <span className="text-muted-foreground">Items Covered: </span>
                    <div className="mt-1 space-y-1">
                      {(() => {
                        try {
                          const itemIds = typeof (sale as any).warrantyItemIds === "string" 
                            ? JSON.parse((sale as any).warrantyItemIds) 
                            : (sale as any).warrantyItemIds || [];
                          return sale.items
                            .filter(item => itemIds.includes(item.id))
                            .map(item => (
                              <div key={item.id} className="text-xs text-muted-foreground">
                                • {item.productName} (Qty: {item.quantity})
                              </div>
                            ));
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {sale.notes && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Notes</p>
              <p className="text-sm text-muted-foreground">{sale.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>Thank you for choosing 562 Tyres!</p>
            <p>Questions? Contact us at (555) 562-TIRE</p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name *</label>
                <Input
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={editForm.customerEmail}
                  onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={editForm.customerAddress}
                  onChange={(e) => setEditForm({ ...editForm, customerAddress: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method *</label>
              <Select
                value={editForm.paymentMethod}
                onValueChange={(value: "cash" | "card" | "check") =>
                  setEditForm({ ...editForm, paymentMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.paymentMethod === "cash" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cash Received</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.cashReceived}
                    onChange={(e) => setEditForm({ ...editForm, cashReceived: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Change Given</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.changeGiven}
                    onChange={(e) => setEditForm({ ...editForm, changeGiven: e.target.value })}
                  />
                </div>
              </div>
            )}
            {editForm.paymentMethod === "check" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Cheque Number</label>
                <Input
                  value={editForm.chequeNumber}
                  onChange={(e) => setEditForm({ ...editForm, chequeNumber: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Warranty Type</label>
              <Select
                value={editForm.warrantyType}
                onValueChange={(value: "none" | "full" | "partial") =>
                  setEditForm({ ...editForm, warrantyType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Warranty</SelectItem>
                  <SelectItem value="full">Full Invoice Warranty</SelectItem>
                  <SelectItem value="partial">Partial Items Warranty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.warrantyType !== "none" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Warranty Duration</label>
                <Input
                  placeholder="e.g., 1 year, 6 months, 90 days"
                  value={editForm.warrantyDuration}
                  onChange={(e) => setEditForm({ ...editForm, warrantyDuration: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateSaleMutation.mutate(editForm)}
              disabled={updateSaleMutation.isPending || !editForm.customerName}
            >
              {updateSaleMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
