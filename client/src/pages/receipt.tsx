import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { SaleWithItems } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

function formatMoney(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v || "0") : v;
  return `$${num.toFixed(2)}`;
}

export default function Receipt() {
  const [match, params] = useRoute("/receipt/:id");
  const { toast } = useToast();

  const { data: sale, isLoading } = useQuery<SaleWithItems>({
    queryKey: ["/api/sales", params?.id],
    enabled: !!params?.id,
  });

  const totals = useMemo(() => {
    if (!sale) return { subtotal: 0, perItemTax: 0, discount: 0, salesTax: 0, labor: 0, total: 0 };
    const subtotal = sale.items.reduce((sum, item) => sum + parseFloat(item.lineTotal || "0"), 0);
    const perItemTax = sale.items.reduce((sum, item) => sum + (parseFloat(item.perItemTax || "0") * item.quantity), 0);
    const discount = parseFloat(sale.discount || "0");
    const labor = parseFloat((sale as any).laborCost || "0");
    const salesTax = parseFloat(sale.globalTaxAmount || "0");
    const total = subtotal - discount + labor + perItemTax + salesTax;
    return { subtotal, perItemTax, discount, salesTax, labor, total };
  }, [sale]);

  const shareWhatsApp = () => {
    if (!params?.id) return;
    const link = `${window.location.origin}/receipt/${params.id}`;
    const text = encodeURIComponent(`Invoice ${sale?.invoiceNumber || params.id}\n${link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const copyLink = async () => {
    if (!params?.id) return;
    const link = `${window.location.origin}/receipt/${params.id}`;
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: "Invoice link copied to clipboard." });
  };

  if (isLoading || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invoice...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-slate-900 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">562 Tires Corp</h1>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>13441 Imperial Hwy, Whittier, CA 90605</p>
            <p>+1 (562) 941-7351</p>
            <p>Mon-Fri 8am-7pm • Sat 8am-5pm • Sun 8am-3pm</p>
          </div>
        </header>

        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button variant="outline" onClick={shareWhatsApp}>
            <Share2 className="h-4 w-4 mr-2" />
            Share via WhatsApp
          </Button>
          <Button asChild>
            <Link href={`/api/sales/${params?.id}/invoice`}>Download PDF</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoice</p>
                <p className="text-lg font-semibold">{sale.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">{new Date(sale.saleDate!).toLocaleString()}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                <p className="text-sm font-semibold">{sale.paymentStatus?.toUpperCase?.()}</p>
              </div>
            </div>

            <Separator />

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bill To</p>
                <p className="font-semibold">{sale.customerName || "Walk-in Customer"}</p>
                {sale.customerPhone && <p className="text-sm text-muted-foreground">{sale.customerPhone}</p>}
                {sale.customerEmail && <p className="text-sm text-muted-foreground">{sale.customerEmail}</p>}
                {sale.customerAddress && <p className="text-sm text-muted-foreground">{sale.customerAddress}</p>}
              </div>
              <div>
                {(sale.vehicleMake || sale.vehicleModel) && (
                  <>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Vehicle</p>
                    <p className="font-semibold">
                      {sale.vehicleYear} {sale.vehicleMake} {sale.vehicleModel}
                    </p>
                    {sale.licensePlate && <p className="text-sm text-muted-foreground">Plate: {sale.licensePlate}</p>}
                    {sale.mileage && <p className="text-sm text-muted-foreground">Mileage: {sale.mileage}</p>}
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-2 pr-2">Item</th>
                    <th className="py-2 pr-2">SKU</th>
                    <th className="py-2 pr-2 text-right">Qty</th>
                    <th className="py-2 pr-2 text-right">Unit Price</th>
                    <th className="py-2 pr-2 text-right">CA Tire Fee</th>
                    <th className="py-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sale.items.map((item) => {
                    const lineTax = parseFloat(item.perItemTax || "0") * item.quantity;
                    const lineTotal = parseFloat(item.lineTotal || "0");
                    return (
                      <tr key={item.id}>
                        <td className="py-2 pr-2">{item.productName}</td>
                        <td className="py-2 pr-2 text-muted-foreground">{item.productSku}</td>
                        <td className="py-2 pr-2 text-right">{item.quantity}</td>
                        <td className="py-2 pr-2 text-right">{formatMoney(item.unitPrice)}</td>
                        <td className="py-2 pr-2 text-right">{formatMoney(lineTax)}</td>
                        <td className="py-2 text-right">{formatMoney(lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Payment Method: {sale.paymentMethod?.toUpperCase?.()}</p>
                {sale.notes && <p>Notes: {sale.notes}</p>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatMoney(totals.subtotal)}</span>
                </div>
                {totals.labor > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Labor</span>
                    <span className="font-mono">{formatMoney(totals.labor)}</span>
                  </div>
                )}
                {totals.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-mono text-destructive">-{formatMoney(totals.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CA Tire Fee</span>
                  <span className="font-mono">{formatMoney(totals.perItemTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sales Tax ({sale.globalTaxRate}%)</span>
                  <span className="font-mono">{formatMoney(totals.salesTax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="font-mono">{formatMoney(totals.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

