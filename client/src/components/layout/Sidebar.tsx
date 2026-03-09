import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  RotateCcw, 
  Users, 
  Settings,
  PlusSquare,
  FileText,
  Shield,
  MapPin,
  Wallet,
  Send,
  UserCheck,
  Receipt,
  ClipboardList,
  Clipboard,
  BarChart3
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const user = useStore((state) => state.user);

  const menuItems = [
    { icon: LayoutDashboard, label: "الرئيسية", href: "/" },
    { icon: FileText, label: "التقرير اليومي", href: "/driver-daily-report" },
    { icon: ClipboardList, label: "تقرير سحب الخبز", href: "/daily-withdrawal-report" },
    { icon: Clipboard, label: "ورقة المندوب", href: "/rep-print-sheet" },
    { icon: Wallet, label: "العمليات الميدانية", href: "/driver-transactions" },
    { icon: UserCheck, label: "عملائي", href: "/my-customers" },
    { icon: BarChart3, label: "رصيد المندوب التراكمي", href: "/driver-cumulative-balance" },
    { icon: Send, label: "تسليم المبالغ", href: "/cash-deposits" },
    { icon: Receipt, label: "مصروفات المخبز", href: "/bakery-expenses" },
    { icon: Package, label: "خبز في الصالة", href: "/inventory" },
    { icon: Users, label: "قائمة العملاء", href: "/customers" },
    { icon: MapPin, label: "خطوط التوزيع", href: "/routes" },
    { icon: Shield, label: "الموظفين والصلاحيات", href: "/users" },
  ];

  return (
    <div className={cn("py-4 text-right h-full overflow-y-auto", className)}>
      <div className="space-y-0.5 px-3">
        {menuItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all duration-200 flex-row group",
                isActive 
                  ? "bg-primary text-white shadow-md shadow-primary/30" 
                  : "text-slate-500 hover:text-primary hover:bg-primary/5"
              )}
              data-testid={`menu-item-${item.href.replace('/', '') || 'home'}`}
            >
              {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />
              )}
              <item.icon className={cn(
                "h-4 w-4 ml-3 transition-all duration-200 flex-shrink-0",
                isActive ? "text-white" : "text-slate-400 group-hover:text-primary"
              )} />
              <span className="flex-1 text-right truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
