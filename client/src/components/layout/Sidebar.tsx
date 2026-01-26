import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Truck, 
  Package, 
  RotateCcw, 
  Users, 
  Settings 
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: "لوحة التحكم", href: "/" },
    { icon: ShoppingCart, label: "الطلبات", href: "/orders" },
    { icon: Truck, label: "التوزيع", href: "/dispatch" },
    { icon: Package, label: "المخزون", href: "/inventory" },
    { icon: RotateCcw, label: "المرتجعات", href: "/returns" },
    { icon: Users, label: "العملاء", href: "/customers" },
  ];

  return (
    <div className={cn("pb-12 min-h-screen bg-sidebar text-sidebar-foreground text-right", className)}>
      <div className="space-y-4 py-4">
        <div className="px-6 py-2 flex items-center gap-2 flex-row-reverse">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">مخبز OS</h2>
        </div>
        <div className="px-3 py-2">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex-row-reverse",
                  location === item.href ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="px-3 py-2 mt-auto">
           <h3 className="mb-2 px-4 text-xs font-semibold text-sidebar-foreground/50 tracking-wider uppercase">
            الإعدادات
          </h3>
           <div className="space-y-1">
            <Link 
              href="/settings"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex-row-reverse"
            >
              <Settings className="h-4 w-4" />
              <span>الإعدادات العامة</span>
            </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
