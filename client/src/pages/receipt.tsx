import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { SaleWithItems } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Share2, ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen bg-slate-100 text-slate-900 py-10 px-4 flex justify-center">
      <div className="w-full max-w-2xl space-y-4">
        <header className="bg-slate-800 text-slate-50 rounded-xl p-6 text-center shadow">
          <h1 className="text-xl font-semibold">562 Tires Corp</h1>
          <p className="text-sm text-slate-200 mt-1">Thank you for choosing 562 Tires!</p>
          <div className="text-sm text-blue-100 space-y-1 mt-3">
            <p>13441 IMPERIAL HWY</p>
            <p>WHITTIER, CA 90605</p>
            <p>+1 562-941-7351</p>
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

        <Card className="bg-white shadow">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">Invoice</p>
                <p className="text-lg font-semibold text-slate-900">{sale.invoiceNumber}</p>
                <p className="text-sm text-slate-500">{new Date(sale.saleDate!).toLocaleString()}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <p className="text-sm font-semibold text-slate-900">{sale.paymentStatus?.toUpperCase?.()}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Bill To</p>
              <p className="font-semibold">{sale.customerName || "Walk-in Customer"}</p>
              {sale.customerPhone && <p className="text-sm text-slate-600">{sale.customerPhone}</p>}
              {sale.customerEmail && <p className="text-sm text-slate-600">{sale.customerEmail}</p>}
              {sale.customerAddress && <p className="text-sm text-slate-600">{sale.customerAddress}</p>}
            </div>

            {(sale.vehicleMake || sale.vehicleModel) && (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">Vehicle</p>
                <p className="font-semibold">
                  {sale.vehicleYear} {sale.vehicleMake} {sale.vehicleModel}
                </p>
                {sale.licensePlate && <p className="text-sm text-slate-600">Plate: {sale.licensePlate}</p>}
                {sale.mileage && <p className="text-sm text-slate-600">Mileage: {sale.mileage}</p>}
              </div>
            )}

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {sale.items.map((item) => {
                    const lineTax = parseFloat(item.perItemTax || "0") * item.quantity;
                    const lineTotal = parseFloat(item.lineTotal || "0");
                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{item.productName}</div>
                          <div className="text-xs text-slate-500">{item.productSku}</div>
                        </td>
                        <td className="py-3 px-3 text-right align-top">{item.quantity}</td>
                        <td className="py-3 px-3 text-right align-top">{formatMoney(item.unitPrice)}</td>
                        <td className="py-3 px-3 text-right align-top">{formatMoney(lineTax)}</td>
                        <td className="py-3 px-3 text-right align-top">{formatMoney(lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-mono text-slate-900">{formatMoney(totals.subtotal)}</span>
              </div>
              {totals.labor > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Labor</span>
                  <span className="font-mono text-slate-900">{formatMoney(totals.labor)}</span>
                </div>
              )}
              {totals.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Discount</span>
                  <span className="font-mono text-red-600">-{formatMoney(totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">California Tire Fee</span>
                <span className="font-mono text-slate-900">{formatMoney(totals.perItemTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Sales Tax ({sale.globalTaxRate}%)</span>
                <span className="font-mono text-slate-900">{formatMoney(totals.salesTax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span className="font-mono">{formatMoney(totals.total)}</span>
              </div>
            </div>

            <div className="space-y-1 text-sm text-slate-600">
              <p>Payment Method: {sale.paymentMethod?.toUpperCase?.()}</p>
              {sale.notes && <p>Notes: {sale.notes}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


