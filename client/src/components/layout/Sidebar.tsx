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
  MapPin
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const user = useStore((state) => state.user);

  const menuItems = [
    { icon: LayoutDashboard, label: "الرئيسية", href: "/", roles: ['ADMIN', 'SALES'] },
    { icon: ShoppingCart, label: "طلبات الخبز", href: "/orders", roles: ['ADMIN', 'SALES'] },
    { icon: Truck, label: "رحلات التوزيع", href: "/dispatch", roles: ['ADMIN', 'DRIVER'] },
    { icon: Package, label: "مستودع الخبز", href: "/inventory", roles: ['ADMIN'] },
    { icon: Users, label: "قائمة العملاء", href: "/customers", roles: ['ADMIN', 'SALES'] },
    { icon: MapPin, label: "خطوط التوزيع", href: "/routes", roles: ['ADMIN'] },
    { icon: Shield, label: "الموظفين والصلاحيات", href: "/users", roles: ['ADMIN'] },
    { icon: FileText, label: "تقارير المبيعات", href: "/reports", roles: ['ADMIN'] },
  ].filter(item => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className={cn("py-6 text-right", className)}>
      <div className="space-y-1 px-4">
        {menuItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex items-center gap-4 rounded-xl px-4 py-3 text-[15px] font-bold transition-all flex-row group",
              location === item.href 
                ? "bg-primary/10 text-primary shadow-sm" 
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 ml-4",
              location === item.href ? "text-primary" : "text-slate-300 group-hover:text-slate-400"
            )} />
            <span className="flex-1 text-right">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
