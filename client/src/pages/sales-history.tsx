import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  FileText,
  Download,
  Eye,
  Calendar,
  DollarSign,
  ShoppingCart,
} from "lucide-react";
import type { Sale } from "@shared/schema";

export default function SalesHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const { data: sales, isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const filteredSales = sales?.filter((sale) => {
    const matchesSearch =
      sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const saleDate = new Date(sale.saleDate!);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let matchesDate = true;
    if (dateFilter === "today") {
      matchesDate = saleDate >= startOfToday;
    } else if (dateFilter === "week") {
      matchesDate = saleDate >= startOfWeek;
    } else if (dateFilter === "month") {
      matchesDate = saleDate >= startOfMonth;
    }

    const matchesPayment =
      paymentFilter === "all" || sale.paymentMethod === paymentFilter;

    return matchesSearch && matchesDate && matchesPayment;
  });

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const response = await fetch(`/api/sales/export?format=${format}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Sales History</h1>
          <p className="text-sm text-muted-foreground">
            View and manage all sales transactions
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => handleExport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport("xlsx")}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button asChild>
            <Link href="/sales/new" data-testid="button-new-sale">
              <ShoppingCart className="h-4 w-4 mr-2" />
              New Sale
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name or invoice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-sales"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-date-filter">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-payment-filter">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      {isLoading ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : filteredSales && filteredSales.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                  <TableCell className="font-mono text-sm">
                    {sale.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{sale.customerName}</p>
                      {sale.vehicleMake && sale.vehicleModel && (
                        <p className="text-xs text-muted-foreground">
                          {sale.vehicleYear} {sale.vehicleMake} {sale.vehicleModel}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(sale.saleDate!).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {sale.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    ${parseFloat(sale.grandTotal).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/sales/${sale.id}`} data-testid={`button-view-sale-${sale.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-1">No sales found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || dateFilter !== "all" || paymentFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first sale"}
            </p>
            {!searchQuery && dateFilter === "all" && paymentFilter === "all" && (
              <Button asChild>
                <Link href="/sales/new">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Create Sale
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
