import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Calendar,
  Download,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import type { SaleWithItems, Expense } from "@shared/schema";

interface TodayActivity {
  sales: SaleWithItems[];
  expenses: Expense[];
  revenue: number;
  expensesTotal: number;
  cogs: number;
  profit: number;
}

interface ComparisonData {
  sales: SaleWithItems[];
  expenses: Expense[];
  revenue: number;
  expensesTotal: number;
  cogs: number;
  profit: number;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  trendLabel,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  trendLabel?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-2">
            {trend === "up" ? (
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
            ) : trend === "down" ? (
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            ) : (
              <Minus className="h-3 w-3 text-muted-foreground" />
            )}
            <span
              className={`text-xs ${
                trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"
              }`}
            >
              {trendValue} {trendLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonCard({
  title,
  today,
  comparison,
  label,
}: {
  title: string;
  today: number;
  comparison: number;
  label: string;
}) {
  const diff = today - comparison;
  const percentChange = comparison > 0 ? ((diff / comparison) * 100) : (today > 0 ? 100 : 0);
  const trend = diff > 0 ? "up" : diff < 0 ? "down" : "neutral";
  const trendValue = comparison > 0 
    ? `${Math.abs(percentChange).toFixed(1)}%`
    : today > 0 ? "New" : "Same";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold">${today.toFixed(2)}</span>
            <div className="flex items-center gap-1">
              {trend === "up" ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              ) : trend === "down" ? (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              ) : (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
              <span
                className={`text-xs ${
                  trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                {trendValue}
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {label}: ${comparison.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            Difference: ${diff >= 0 ? "+" : ""}${diff.toFixed(2)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data: todayData, isLoading: todayLoading } = useQuery<TodayActivity>({
    queryKey: ["/api/analytics/today"],
  });

  // Get previous day (yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const { data: yesterdayData } = useQuery<ComparisonData>({
    queryKey: ["/api/analytics/comparison", yesterdayStr],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/comparison?date=${yesterdayStr}`);
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  // Get same day last week
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().split("T")[0];

  const { data: lastWeekData } = useQuery<ComparisonData>({
    queryKey: ["/api/analytics/comparison", lastWeekStr],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/comparison?date=${lastWeekStr}`);
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  if (todayLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const revenue = todayData?.revenue || 0;
  const expenses = todayData?.expensesTotal || 0;
  const profit = todayData?.profit || 0;
  const salesCount = todayData?.sales.length || 0;
  const expensesCount = todayData?.expenses.length || 0;

  // Calculate trends
  const revenueVsYesterday = yesterdayData 
    ? ((revenue - yesterdayData.revenue) / (yesterdayData.revenue || 1)) * 100
    : 0;
  const profitVsYesterday = yesterdayData
    ? ((profit - yesterdayData.profit) / (Math.abs(yesterdayData.profit) || 1)) * 100
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Today's activity and performance insights
          </p>
        </div>
      </div>

      {/* Today's Summary */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Today's Summary</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Revenue"
            value={`$${revenue.toFixed(2)}`}
            subtitle={`${salesCount} sale${salesCount !== 1 ? "s" : ""}`}
            icon={DollarSign}
            trend={revenueVsYesterday > 0 ? "up" : revenueVsYesterday < 0 ? "down" : "neutral"}
            trendValue={yesterdayData ? `${Math.abs(revenueVsYesterday).toFixed(1)}%` : undefined}
            trendLabel="vs yesterday"
          />
          <StatCard
            title="Expenses"
            value={`$${expenses.toFixed(2)}`}
            subtitle={`${expensesCount} expense${expensesCount !== 1 ? "s" : ""}`}
            icon={Receipt}
          />
          <StatCard
            title="Cost of Goods"
            value={`$${(todayData?.cogs || 0).toFixed(2)}`}
            subtitle="Product costs"
            icon={Package}
          />
          <StatCard
            title="Profit"
            value={`$${profit.toFixed(2)}`}
            subtitle={`${((profit / (revenue || 1)) * 100).toFixed(1)}% margin`}
            icon={TrendingUp}
            trend={profitVsYesterday > 0 ? "up" : profitVsYesterday < 0 ? "down" : "neutral"}
            trendValue={yesterdayData ? `${Math.abs(profitVsYesterday).toFixed(1)}%` : undefined}
            trendLabel="vs yesterday"
          />
        </div>
      </div>

      {/* Comparisons */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Comparisons</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Today vs Yesterday
            </h3>
            <div className="grid gap-4 grid-cols-2">
              <ComparisonCard
                title="Revenue"
                today={revenue}
                comparison={yesterdayData?.revenue || 0}
                label="Yesterday"
              />
              <ComparisonCard
                title="Profit"
                today={profit}
                comparison={yesterdayData?.profit || 0}
                label="Yesterday"
              />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Today vs Same Day Last Week
            </h3>
            <div className="grid gap-4 grid-cols-2">
              <ComparisonCard
                title="Revenue"
                today={revenue}
                comparison={lastWeekData?.revenue || 0}
                label="Last Week"
              />
              <ComparisonCard
                title="Profit"
                today={profit}
                comparison={lastWeekData?.profit || 0}
                label="Last Week"
              />
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales">Today's Sales</TabsTrigger>
          <TabsTrigger value="expenses">Today's Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Made Today</CardTitle>
            </CardHeader>
            <CardContent>
              {!todayData || todayData.sales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No sales made today</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayData.sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-sm">
                            {sale.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sale.customerName}</p>
                              {sale.customerPhone && (
                                <p className="text-xs text-muted-foreground">
                                  {sale.customerPhone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(sale.saleDate!), "h:mm a")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{sale.items.length} items</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            ${parseFloat(sale.grandTotal).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/sales/${sale.id}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expenses Today</CardTitle>
            </CardHeader>
            <CardContent>
              {!todayData || todayData.expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No expenses recorded today</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayData.expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(expense.expenseDate), "h:mm a")}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{expense.description}</p>
                              {expense.notes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {expense.notes}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {expense.category || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="capitalize">
                            {expense.paymentMethod || "cash"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            ${parseFloat(expense.amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
