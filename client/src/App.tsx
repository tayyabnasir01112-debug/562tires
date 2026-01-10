import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
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
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Redirect } from "@/components/Redirect";

function Router() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [location, setLocation] = useLocation();

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

  // Redirect logged-in users away from login page
  useEffect(() => {
    if (isAuthenticated && location === "/login") {
      setLocation("/");
    }
  }, [isAuthenticated, location, setLocation]);

  // If not authenticated, show login for protected routes
  if (!isAuthenticated && location !== "/login" && !location.startsWith("/receipt/")) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/receipt/:id" component={Receipt} />
      <Route path="/">
        {isAuthenticated && isAdmin ? (
          <ProtectedRoute requireAdmin>
            <Dashboard />
          </ProtectedRoute>
        ) : isAuthenticated ? (
          <Redirect to="/inventory" />
        ) : (
          <Login />
        )}
      </Route>
      <Route path="/inventory">
        {isAuthenticated ? (
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        ) : (
          <Login />
        )}
      </Route>
      <Route path="/sales/new">
        {isAuthenticated && isAdmin ? (
          <ProtectedRoute requireAdmin>
            <NewSale />
          </ProtectedRoute>
        ) : (
          <Login />
        )}
      </Route>
      <Route path="/sales/:id">
        {isAuthenticated && isAdmin ? (
          <ProtectedRoute requireAdmin>
            <SaleDetail />
          </ProtectedRoute>
        ) : (
          <Login />
        )}
      </Route>
      <Route path="/sales">
        {isAuthenticated && isAdmin ? (
          <ProtectedRoute requireAdmin>
            <SalesHistory />
          </ProtectedRoute>
        ) : (
          <Login />
        )}
      </Route>
      <Route path="/expenses">
        {isAuthenticated && isAdmin ? (
          <ProtectedRoute requireAdmin>
            <Expenses />
          </ProtectedRoute>
        ) : (
          <Login />
        )}
      </Route>
      <Route path="/analytics">
        {isAuthenticated && isAdmin ? (
          <ProtectedRoute requireAdmin>
            <Analytics />
          </ProtectedRoute>
        ) : (
          <Login />
        )}
      </Route>
      <Route path="/employees">
        {isAuthenticated && isAdmin ? (
          <ProtectedRoute requireAdmin>
            <Employees />
          </ProtectedRoute>
        ) : (
          <Login />
        )}
      </Route>
      <Route path="/settings">
        {isAuthenticated && isAdmin ? (
          <ProtectedRoute requireAdmin>
            <Settings />
          </ProtectedRoute>
        ) : (
          <Login />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  const isReceiptPage = location.startsWith("/receipt/");
  const isLoginPage = location === "/login";
  
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

  // Render login page or unauthenticated pages without sidebar
  if (!isLoading && (!isAuthenticated || isLoginPage)) {
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

  // Render authenticated pages with sidebar
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
