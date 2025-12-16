import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
} from "lucide-react";
import type { Product, Sale } from "@shared/schema";

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  todaySales: number;
  todayRevenue: string;
  weekRevenue: string;
  monthRevenue: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
  variant?: "default" | "warning" | "success";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={`p-2 rounded-md ${
            variant === "warning"
              ? "bg-amber-100 dark:bg-amber-900/30"
              : variant === "success"
              ? "bg-emerald-100 dark:bg-emerald-900/30"
              : "bg-muted"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${
              variant === "warning"
                ? "text-amber-600 dark:text-amber-400"
                : variant === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            }`}
          />
        </div>
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
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span
              className={`text-xs ${
                trend === "up" ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LowStockItem({ product }: { product: Product }) {
  const stockPercentage = (product.quantity / product.minStockLevel) * 100;
  
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold">{product.quantity}</p>
          <p className="text-xs text-muted-foreground">in stock</p>
        </div>
        <Badge 
          variant={stockPercentage <= 50 ? "destructive" : "secondary"}
          className="text-xs"
        >
          {stockPercentage <= 50 ? "Critical" : "Low"}
        </Badge>
      </div>
    </div>
  );
}

function RecentSaleItem({ sale }: { sale: Sale }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{sale.customerName}</p>
        <p className="text-xs text-muted-foreground font-mono">{sale.invoiceNumber}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold font-mono">${parseFloat(sale.grandTotal).toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(sale.saleDate!).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: lowStockProducts, isLoading: lowStockLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/low-stock"],
  });

  const { data: recentSales, isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales/recent"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back to 562 Tyres Management
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild>
            <Link href="/sales/new" data-testid="button-new-sale">
              <Plus className="h-4 w-4 mr-2" />
              New Sale
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/inventory" data-testid="button-add-inventory">
              <Package className="h-4 w-4 mr-2" />
              Inventory
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-32 mt-2" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Today's Revenue"
              value={`$${parseFloat(stats?.todayRevenue || "0").toFixed(2)}`}
              subtitle={`${stats?.todaySales || 0} sales today`}
              icon={DollarSign}
              variant="success"
            />
            <StatCard
              title="This Week"
              value={`$${parseFloat(stats?.weekRevenue || "0").toFixed(2)}`}
              icon={TrendingUp}
            />
            <StatCard
              title="Total Products"
              value={stats?.totalProducts || 0}
              subtitle="Active inventory items"
              icon={Package}
            />
            <StatCard
              title="Low Stock Items"
              value={stats?.lowStockCount || 0}
              subtitle="Need restocking"
              icon={AlertTriangle}
              variant={stats?.lowStockCount && stats.lowStockCount > 0 ? "warning" : "default"}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Stock Alert
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory?filter=low-stock">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {lowStockLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20 mt-1" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : lowStockProducts && lowStockProducts.length > 0 ? (
              <div>
                {lowStockProducts.slice(0, 5).map((product) => (
                  <LowStockItem key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">All stock levels are healthy</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Recent Sales
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sales">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20 mt-1" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : recentSales && recentSales.length > 0 ? (
              <div>
                {recentSales.slice(0, 5).map((sale) => (
                  <RecentSaleItem key={sale.id} sale={sale} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sales recorded yet</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/sales/new">Make your first sale</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
