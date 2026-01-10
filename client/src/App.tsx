import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import NewSale from "@/pages/sales-new";
import SalesHistory from "@/pages/sales-history";
import SaleDetail from "@/pages/sale-detail";
import Expenses from "@/pages/expenses";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Receipt from "@/pages/receipt";
import Employees from "@/pages/employees";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated (except for login and receipt pages)
  if (!isAuthenticated && location !== "/login" && !location.startsWith("/receipt/")) {
    setLocation("/login");
    return null;
  }

  // Redirect logged-in users away from login page
  if (isAuthenticated && location === "/login") {
    setLocation("/");
    return null;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/receipt/:id" component={Receipt} />
      <Route path="/" component={() => <ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute>} />
      <Route path="/inventory" component={() => <ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/sales/new" component={() => <ProtectedRoute requireAdmin><NewSale /></ProtectedRoute>} />
      <Route path="/sales/:id" component={() => <ProtectedRoute requireAdmin><SaleDetail /></ProtectedRoute>} />
      <Route path="/sales" component={() => <ProtectedRoute requireAdmin><SalesHistory /></ProtectedRoute>} />
      <Route path="/expenses" component={() => <ProtectedRoute requireAdmin><Expenses /></ProtectedRoute>} />
      <Route path="/analytics" component={() => <ProtectedRoute requireAdmin><Analytics /></ProtectedRoute>} />
      <Route path="/employees" component={() => <ProtectedRoute requireAdmin><Employees /></ProtectedRoute>} />
      <Route path="/settings" component={() => <ProtectedRoute requireAdmin><Settings /></ProtectedRoute>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isReceiptPage = location.startsWith("/receipt/");
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  // Render receipt page without sidebar
  if (isReceiptPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <SidebarInset className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between gap-2 p-2 border-b border-border h-12 shrink-0">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto bg-background">
                  <Router />
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
