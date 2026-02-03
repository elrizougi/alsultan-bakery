import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Truck, 
  Package, 
  RotateCcw, 
  Users, 
  Settings,
  PlusSquare,
  FileText,
  Shield,
  MapPin,
  Wallet
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const user = useStore((state) => state.user);

  const menuItems = [
    { icon: LayoutDashboard, label: "الرئيسية", href: "/", roles: ['ADMIN', 'SALES'] },
    { icon: ShoppingCart, label: "طلبات الخبز", href: "/orders", roles: ['ADMIN', 'SALES', 'DRIVER'] },
    { icon: Truck, label: "رحلات التوزيع", href: "/dispatch", roles: ['ADMIN', 'DRIVER'] },
    { icon: Wallet, label: "العمليات الميدانية", href: "/driver-transactions", roles: ['DRIVER'] },
    { icon: Package, label: "خبز في الصالة", href: "/inventory", roles: ['ADMIN'] },
    { icon: Users, label: "قائمة العملاء", href: "/customers", roles: ['ADMIN', 'SALES'] },
    { icon: MapPin, label: "خطوط التوزيع", href: "/routes", roles: ['ADMIN'] },
    { icon: Shield, label: "الموظفين والصلاحيات", href: "/users", roles: ['ADMIN'] },
    { icon: FileText, label: "تقارير المبيعات", href: "/reports", roles: ['ADMIN'] },
  ].filter(item => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className={cn("py-6 text-right", className)}>
      <div className="space-y-1 px-4">
        {menuItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "relative flex items-center gap-4 rounded-xl px-4 py-3.5 text-[15px] font-bold transition-all duration-200 flex-row group",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/30" 
                  : "text-slate-500 hover:text-primary hover:bg-primary/5 hover:pr-6"
              )}
              data-testid={`menu-item-${item.href.replace('/', '') || 'home'}`}
            >
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full" />
              )}
              <item.icon className={cn(
                "h-5 w-5 ml-4 transition-all duration-200",
                isActive ? "text-white" : "text-slate-400 group-hover:text-primary group-hover:scale-110"
              )} />
              <span className="flex-1 text-right">{item.label}</span>
              {!isActive && (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                  ←
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
