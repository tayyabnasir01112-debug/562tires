import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { SaleWithItems } from "@shared/schema";
import { Loader2, Copy, Share2, Download, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useEffect } from "react";

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

  const { data: sale, isLoading, error } = useQuery<SaleWithItems>({
    queryKey: ["/api/receipt", params?.id],
    enabled: !!params?.id,
    retry: 1,
    queryFn: async ({ queryKey }) => {
      try {
        const url = queryKey.join("/");
        console.log("Fetching receipt from URL:", url);
        console.log("Query key:", queryKey);
        
        const res = await fetch(url, {
          credentials: "include",
        });
        
        console.log("Response status:", res.status);
        console.log("Response ok:", res.ok);
        
        if (!res.ok) {
          const text = (await res.text()) || res.statusText;
          console.error("Fetch error:", res.status, text);
          throw new Error(`${res.status}: ${text}`);
        }
        
        const data = await res.json();
        console.log("Receipt data received:", data);
        console.log("Items count:", data?.items?.length);
        
        if (!data || !data.items) {
          console.error("Invalid data structure:", data);
          throw new Error("Invalid receipt data structure");
        }
        
        return data;
      } catch (err) {
        console.error("Query function error:", err);
        throw err;
      }
    },
  });

  useEffect(() => {
    console.log("Receipt page - Params:", params);
    console.log("Receipt page - ID:", params?.id);
    console.log("Receipt page - Loading:", isLoading);
    console.log("Receipt page - Error:", error);
    console.log("Receipt page - Sale:", sale);
    if (error) {
      console.error("Receipt fetch error details:", error);
    }
  }, [params, params?.id, isLoading, error, sale]);

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

  // Calculate California Tire Fee breakdown
  const tireFeeBreakdown = useMemo(() => {
    if (!sale || totals.perItemTax <= 0) return null;
    
    // Find items with tire fee and calculate breakdown
    const tireFeeItems = sale.items.filter(item => {
      const itemTax = parseFloat(item.perItemTax || "0");
      return itemTax > 0;
    });

    if (tireFeeItems.length === 0) return null;

    // Calculate total quantity and per-item fee
    let totalQuantity = 0;
    let perItemFee = 0;
    
    tireFeeItems.forEach(item => {
      const itemTax = parseFloat(item.perItemTax || "0");
      if (itemTax > 0) {
        totalQuantity += item.quantity || 1;
        // Use the first item's per-item tax as the fee rate
        if (perItemFee === 0) {
          perItemFee = itemTax;
        }
      }
    });

    return { perItemFee, totalQuantity, total: totals.perItemTax };
  }, [sale, totals.perItemTax]);

  const shareWhatsApp = () => {
    if (!params?.id || !sale) return;
    const link = `${window.location.origin}/receipt/${params.id}`;
    const message = `Thank you for shopping at 562 Tires!\n\nHere is your copy of invoice ${sale.invoiceNumber}.\n\nTotal: $${totals.total.toFixed(2)}\n\nView your invoice: ${link}\n\nWe appreciate your business!`;
    const text = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareEmail = () => {
    if (!params?.id || !sale) return;
    const link = `${window.location.origin}/receipt/${params.id}`;
    const subject = encodeURIComponent(`Your Invoice ${sale.invoiceNumber} from 562 Tires`);
    const body = encodeURIComponent(`Thank you for shopping at 562 Tires!\n\nHere is your copy of invoice ${sale.invoiceNumber}.\n\nTotal: $${totals.total.toFixed(2)}\n\nView your invoice: ${link}\n\nWe appreciate your business!`);
    window.location.href = `mailto:${sale.customerEmail || ''}?subject=${subject}&body=${body}`;
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invoice...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-lg font-semibold text-gray-900">Error loading invoice</div>
          <div className="text-sm text-gray-600">
            {error instanceof Error ? error.message : "Unable to load invoice. Please check the link and try again."}
          </div>
          <div className="text-xs text-gray-500 mt-4">
            Receipt ID: {params?.id || "N/A"}
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-lg font-semibold text-gray-900">Invoice not found</div>
          <div className="text-sm text-gray-600">
            The requested invoice could not be found.
          </div>
          <div className="text-xs text-gray-500 mt-4">
            Receipt ID: {params?.id || "N/A"}
          </div>
        </div>
      </div>
    );
  }

  const totalFormatted = formatTotal(totals.total);
  const isCash = sale.paymentMethod?.toLowerCase() === "cash";
  const cashGiven = parseFloat((sale as any).cashReceived || "0") || (isCash ? totals.total : 0);
  const changeReceived = parseFloat((sale as any).changeGiven || "0") || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header - Dark Teal/Green Background */}
        <header className="bg-[#0d9488] text-white rounded-t-lg p-6 text-center">
          {/* Company Logo */}
          <div className="mx-auto mb-4 flex items-center justify-center">
            <img 
              src="/562logo.png" 
              alt="562 Tires Logo" 
              className="w-20 h-20 object-contain rounded-full"
              style={{ 
                maxWidth: '80px',
                maxHeight: '80px',
                width: 'auto',
                height: 'auto'
              }}
            />
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

        {/* Action Buttons - Mobile responsive */}
        <div className="flex flex-wrap gap-2 justify-center py-4 bg-white border-x border-gray-200 px-2" style={{ opacity: 1, visibility: 'visible' }}>
          <button
            type="button"
            onClick={copyLink}
            className="flex-1 min-w-[100px] sm:flex-none inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
            style={{ 
              WebkitAppearance: 'none', 
              appearance: 'none',
              opacity: 1,
              visibility: 'visible',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Copy Link</span>
            <span className="sm:hidden">Copy</span>
          </button>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="flex-1 min-w-[100px] sm:flex-none inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
            style={{ 
              WebkitAppearance: 'none', 
              appearance: 'none',
              opacity: 1,
              visibility: 'visible',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            WhatsApp
          </button>
          {sale?.customerEmail && (
            <button
              type="button"
              onClick={shareEmail}
              className="flex-1 min-w-[100px] sm:flex-none inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
              style={{ 
                WebkitAppearance: 'none', 
                appearance: 'none',
                opacity: 1,
                visibility: 'visible',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </button>
          )}
          <a 
            href={`/api/receipt/${params?.id}/invoice`} 
            download
            className="flex-1 min-w-[100px] sm:flex-none inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
            style={{ 
              WebkitAppearance: 'none', 
              appearance: 'none',
              opacity: 1,
              visibility: 'visible',
              textDecoration: 'none'
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </a>
        </div>

        {/* Receipt Content - White Background */}
        <div className="bg-white rounded-b-lg p-6 space-y-4 border-x border-b border-gray-200">
          {/* Line Items */}
          <div className="space-y-2">
            {sale.items.map((item) => {
              const itemName = item.productName || "Item";
              const itemTotal = parseFloat(item.lineTotal || "0");
              const quantity = item.quantity || 1;
              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-900">• {itemName} {quantity > 1 ? `x ${quantity}` : ""}</span>
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

          {/* Labor Cost */}
          {totals.labor > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-900">Labor</span>
              <span className="text-gray-900 font-medium">{formatMoney(totals.labor)}</span>
            </div>
          )}

          {/* Discount */}
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-900">Discount</span>
              <span className="text-gray-900 font-medium text-red-600">-{formatMoney(totals.discount)}</span>
            </div>
          )}

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
          {tireFeeBreakdown && (
            <div className="border-t border-gray-200 pt-2">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="text-gray-900">
                      California Tire Fee
                      {tireFeeBreakdown.totalQuantity > 1 && (
                        <span className="text-gray-600 ml-1">
                          ({formatMoney(tireFeeBreakdown.perItemFee)} x {tireFeeBreakdown.totalQuantity})
                        </span>
                      )}
                    </td>
                    <td></td>
                    <td className="text-right text-gray-900 font-medium">{formatMoney(tireFeeBreakdown.total)}</td>
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
          <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-900 uppercase font-medium">Payment Method</span>
              <span className="text-gray-900 font-medium capitalize">
                {sale.paymentMethod === "card" ? "Credit/Debit Card" : sale.paymentMethod === "cash" ? "Cash" : "Check"}
              </span>
            </div>
            {sale.paymentMethod === "check" && (sale as any).chequeNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-900 uppercase font-medium">Cheque Number</span>
                <span className="text-gray-900 font-mono">{(sale as any).chequeNumber}</span>
              </div>
            )}
            {isCash && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-900 uppercase font-medium">Cash Given</span>
                  <span className="text-gray-900 font-medium">{formatMoney(cashGiven)}</span>
                </div>
                {changeReceived > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900 uppercase font-medium">Change Received</span>
                    <span className="text-gray-900 font-medium">{formatMoney(changeReceived)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-gray-900 uppercase">Cash Paid</span>
                  <span className="text-gray-900">{formatMoney(totals.total)}</span>
                </div>
              </>
            )}
          </div>
          
          {/* Warranty Information */}
          {(sale as any).warrantyType && (sale as any).warrantyType !== "none" && (
            <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
              <div className="text-sm font-semibold text-gray-900 mb-2">Warranty Information</div>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-gray-600">Type: </span>
                  <span className="text-gray-900 capitalize">
                    {(sale as any).warrantyType === "full" ? "Full Invoice" : "Partial Items"}
                  </span>
                </div>
                {(sale as any).warrantyDuration && (
                  <div>
                    <span className="text-gray-600">Duration: </span>
                    <span className="text-gray-900">{(sale as any).warrantyDuration}</span>
                  </div>
                )}
                {(sale as any).warrantyType === "partial" && (sale as any).warrantyItemIds && (
                  <div className="mt-2">
                    <div className="text-gray-600 mb-1">Items Covered:</div>
                    {(() => {
                      try {
                        const itemIds = typeof (sale as any).warrantyItemIds === "string" 
                          ? JSON.parse((sale as any).warrantyItemIds) 
                          : (sale as any).warrantyItemIds || [];
                        return sale.items
                          .filter(item => itemIds.includes(item.id))
                          .map(item => (
                            <div key={item.id} className="text-xs text-gray-600 ml-2">
                              • {item.productName} (Qty: {item.quantity})
                            </div>
                          ));
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 mt-4 text-xs text-gray-600 space-y-1">
            <div>{formatDate(sale.saleDate!)}</div>
            <div>Payment ID: {sale.invoiceNumber}</div>
            <div>Order ID: {sale.id}</div>
          </div>

          {/* Marketing Footer */}
          <div className="border-t-2 border-gray-300 pt-4 mt-6 text-center space-y-2">
            <div className="text-sm font-semibold text-gray-900">Need a similar system for your business?</div>
            <div className="text-xs text-gray-700 space-y-1">
              <div className="font-medium">Tayyab Automates LTD</div>
              <div>
                <a 
                  href="https://tayyabautomates.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  https://tayyabautomates.com/
                </a>
              </div>
              <div>
                <a 
                  href="mailto:connect@tayyabautomates.com"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  connect@tayyabautomates.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
