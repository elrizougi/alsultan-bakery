import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Package, LogOut } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminLayout({ children, className }: AdminLayoutProps) {
  const { user, logout } = useStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen w-full bg-slate-50/50 flex-col" dir="rtl">
      {/* Mobile Header */}
      <header className="flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-md px-4 md:px-6 sticky top-0 z-40 shadow-sm">
        <div className="md:hidden flex items-center gap-2 flex-1">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-slate-100">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-72 border-l shadow-2xl">
              <Sidebar className="h-full border-0" />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-slate-800">نظام المخبز</span>
          </div>
        </div>

        <div className="hidden md:flex flex-1 text-right">
          <div className="bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">المؤسسة:</span>
            <span className="text-sm font-bold text-slate-700 mr-2">مخبز نجمة الصباح</span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-row-reverse">
          <div className="flex items-center gap-3 flex-row-reverse bg-slate-50 p-1.5 pr-4 rounded-full border border-slate-100 shadow-inner">
            <div className="text-xs font-bold text-slate-700 hidden sm:block">{user.name}</div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-primary-foreground font-black text-xs uppercase shadow-md shadow-primary/10">
              {user.username.substring(0, 2)}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-red-50 hover:text-red-500 transition-all" onClick={() => logout()} title="تسجيل الخروج">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden border-l w-72 md:block flex-shrink-0 shadow-xl z-30">
          <Sidebar className="h-full" />
        </div>

        {/* Main Content */}
        <main className={cn("flex-1 overflow-auto p-4 md:p-10 text-right space-y-8", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
