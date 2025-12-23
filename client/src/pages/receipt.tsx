import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { SaleWithItems } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Share2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

function formatMoney(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v || "0") : v;
  return `$${num.toFixed(2)}`;
}

function formatTotal(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v || "0") : v;
  const parts = num.toFixed(2).split(".");
  return { dollars: parts[0], cents: parts[1] };
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

  const taxesAndFees = useMemo(() => {
    return totals.perItemTax + totals.salesTax;
  }, [totals]);

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

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${month} ${day}, ${year} • ${displayHours}:${displayMinutes} ${ampm}`;
  };

  if (isLoading || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invoice...
        </div>
      </div>
    );
  }

  const totalFormatted = formatTotal(totals.total);
  const isCash = sale.paymentMethod?.toLowerCase() === "cash";
  const cashGiven = isCash ? totals.total : 0;
  const changeReceived = 0; // We don't track this currently

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header - Dark Teal/Green Background */}
        <header className="bg-[#0d9488] text-white rounded-t-lg p-6 text-center">
          {/* Logo placeholder - circular with light blue background */}
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-400 rounded-full flex items-center justify-center">
            <div className="w-10 h-10 bg-white rounded-full"></div>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">562 Tires Corp</h1>
          <p className="text-sm italic text-white/90 mb-4">Thank you for choosing 562 Tires!</p>
          
          <div className="text-sm space-y-1 mt-4">
            <a 
              href="https://maps.google.com/?q=13441+IMPERIAL+HWY+WHITTIER+CA+90605" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-200 underline hover:text-blue-100 block"
            >
              13441 IMPERIAL HWY
            </a>
            <a 
              href="https://maps.google.com/?q=13441+IMPERIAL+HWY+WHITTIER+CA+90605" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-200 underline hover:text-blue-100 block"
            >
              WHITTIER, CA 90605
            </a>
            <a 
              href="tel:+15629417351" 
              className="text-blue-200 underline hover:text-blue-100 block"
            >
              +1 562-941-7351
            </a>
          </div>
        </header>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center py-4 bg-white border-x border-gray-200">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={shareWhatsApp}>
            <Share2 className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/sales/${params?.id}/invoice`} download>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </a>
          </Button>
        </div>

        {/* Receipt Content - White Background */}
        <div className="bg-white rounded-b-lg p-6 space-y-4 border-x border-b border-gray-200">
          {/* Line Items */}
          <div className="space-y-2">
            {sale.items.map((item) => {
              const itemName = item.productName || "Item";
              const itemTotal = parseFloat(item.lineTotal || "0");
              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-900">• {itemName}</span>
                  <span className="text-gray-900 font-medium">{formatMoney(itemTotal)}</span>
                </div>
              );
            })}
          </div>

          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-900">Subtotal</span>
            <span className="text-gray-900 font-medium">{formatMoney(totals.subtotal)}</span>
          </div>

          {/* Tax Breakdown Table */}
          <div className="border-t border-gray-200 pt-2">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="text-gray-900">Whittier</td>
                  <td className="text-right text-gray-600">{sale.globalTaxRate}%</td>
                  <td className="text-right text-gray-900 font-medium">{formatMoney(totals.salesTax)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* California Tire Fee */}
          {totals.perItemTax > 0 && (
            <div className="border-t border-gray-200 pt-2">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="text-gray-900">California Tire Fee</td>
                    <td></td>
                    <td className="text-right text-gray-900 font-medium">{formatMoney(totals.perItemTax)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Taxes and Fees Total */}
          <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
            <span className="text-gray-900">Taxes and Fees</span>
            <span className="text-gray-900 font-medium">{formatMoney(taxesAndFees)}</span>
          </div>

          {/* Total - Large Blue Text */}
          <div className="flex justify-between items-baseline border-t-2 border-gray-300 pt-4 mt-4">
            <span className="text-xl font-bold text-blue-600">Total</span>
            <span className="text-3xl font-bold text-blue-600">
              $ {totalFormatted.dollars}.<span className="text-2xl">{totalFormatted.cents}</span>
            </span>
          </div>

          {/* Payment Information */}
          {isCash && (
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">$</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-900 uppercase font-medium">Cash Given</span>
                <span className="text-gray-900 font-medium">{formatMoney(cashGiven)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-900 uppercase font-medium">Change Received</span>
                <span className="text-gray-900 font-medium">{formatMoney(changeReceived)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-900 uppercase">Cash Paid</span>
                <span className="text-gray-900">{formatMoney(totals.total)}</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 mt-4 text-xs text-gray-600 space-y-1">
            <div>{formatDate(sale.saleDate!)}</div>
            <div>Payment ID: {sale.invoiceNumber}</div>
            <div>Order ID: {sale.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
