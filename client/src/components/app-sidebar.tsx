import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  FileText,
  Circle,
  DollarSign,
  Users,
  LogOut,
  User,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const allMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, adminOnly: true },
  { title: "Inventory", url: "/inventory", icon: Package, adminOnly: false },
  { title: "New Sale", url: "/sales/new", icon: ShoppingCart, adminOnly: true },
  { title: "Sales History", url: "/sales", icon: FileText, adminOnly: true },
  { title: "Expenses", url: "/expenses", icon: DollarSign, adminOnly: true },
  { title: "Analytics", url: "/analytics", icon: BarChart3, adminOnly: true },
  { title: "Employees", url: "/employees", icon: Users, adminOnly: true },
  { title: "Settings", url: "/settings", icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAdmin, logout } = useAuth();

  // Filter menu items based on role
  const menuItems = allMenuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <Circle className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-sidebar-foreground" data-testid="text-brand-name">
              562 Tyres
            </h1>
            <p className="text-xs text-muted-foreground">Los Angeles, CA</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-2">
        {user && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sidebar-foreground font-medium">{user.username}</span>
            <span className="text-xs text-muted-foreground">({user.role})</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
        <div className="text-xs text-muted-foreground">
          <p>562 Tyres Management</p>
          <p>v1.0.0</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
