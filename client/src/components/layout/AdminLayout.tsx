import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Package, LogOut, Link2 } from "lucide-react";
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
    <div className="flex min-h-screen w-full bg-[#f8fafc] flex-row-reverse" dir="rtl">
      {/* Sidebar - Right side matching the image */}
      <aside className="hidden md:flex flex-col w-72 border-r bg-white flex-shrink-0 z-30 shadow-sm h-screen sticky top-0">
        <div className="p-8 border-b">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 w-full justify-end">
              <div className="text-right">
                <h2 className="text-xl font-black text-slate-800">صيدلية الشفاء</h2>
                <p className="text-[10px] font-medium text-slate-400">نظام الإدارة</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-primary rotate-45" />
              </div>
            </div>
          </div>
        </div>
        <Sidebar className="flex-1" />
        <div className="p-6 border-t mt-auto">
          <Button 
            variant="ghost" 
            className="w-full justify-end gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-4"
            onClick={() => logout()}
          >
            <span>تسجيل الخروج</span>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden h-screen overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden flex h-16 items-center gap-4 border-b bg-white px-4 sticky top-0 z-40">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-72 border-l">
              <div className="p-8 border-b">
                <div className="flex items-center gap-3 justify-end w-full">
                   <h2 className="text-xl font-black text-slate-800">نظام المخبز</h2>
                   <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                     <Package className="h-5 w-5 text-primary" />
                   </div>
                </div>
              </div>
              <Sidebar className="border-0" />
            </SheetContent>
          </Sheet>
          <div className="flex-1 text-right">
            <span className="font-bold text-slate-800">صيدلية الشفاء</span>
          </div>
        </header>

        {/* Main Content */}
        <main className={cn("p-6 md:p-12 space-y-8", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
