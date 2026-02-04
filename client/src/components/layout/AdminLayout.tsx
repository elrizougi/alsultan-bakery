import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Package, LogOut, User, Shield, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AdminLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: "مدير النظام",
  DRIVER: "سائق",
  SALES: "مبيعات",
};

export function AdminLayout({ children, className }: AdminLayoutProps) {
  const { user, logout } = useStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  if (!user) return null;

  const userInitials = user.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "م";

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] flex-row" dir="rtl">
      {/* Sidebar - Right side matching Arabic layout */}
      <aside className="hidden md:flex flex-col w-72 border-l bg-white flex-shrink-0 z-30 shadow-sm h-screen sticky top-0">
        <div className="p-8 border-b text-right">
          <div className="flex flex-row-reverse items-center gap-3 w-full justify-start">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black text-slate-800">نظام المخبز</h2>
              <p className="text-[10px] font-medium text-slate-400">توزيع الخبز واللوجستيات</p>
            </div>
          </div>
        </div>
        <Sidebar className="flex-1" />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden h-screen overflow-y-auto">
        {/* Desktop Top Header with Profile */}
        <header className="hidden md:flex h-16 items-center justify-between border-b bg-white px-8 sticky top-0 z-20">
          <div className="text-slate-500 text-sm">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3 hover:bg-slate-100 rounded-xl">
                  <Avatar className="h-9 w-9 bg-primary">
                    <AvatarFallback className="bg-primary text-white font-bold text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-right">
                    <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                    <p className="text-xs text-slate-500">{roleLabels[user.role] || user.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <div>
                      <p className="font-bold">{user.name}</p>
                      <p className="text-xs text-muted-foreground font-normal">{user.username}</p>
                    </div>
                    <Avatar className="h-8 w-8 bg-primary">
                      <AvatarFallback className="bg-primary text-white text-xs font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer justify-end gap-2"
                  onClick={() => logout()}
                >
                  <span>تسجيل الخروج</span>
                  <LogOut className="h-4 w-4" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex h-16 items-center gap-4 border-b bg-white px-4 sticky top-0 z-40 flex-row-reverse">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-72 border-l flex flex-col">
              <div className="p-8 border-b text-right">
                <div className="flex items-center gap-3 justify-end w-full">
                   <h2 className="text-xl font-black text-slate-800">نظام المخبز</h2>
                   <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                     <Package className="h-5 w-5 text-primary" />
                   </div>
                </div>
              </div>
              <Sidebar className="border-0 flex-1" />
              <div className="p-4 border-t bg-slate-50">
                <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white border">
                  <Avatar className="h-9 w-9 bg-primary">
                    <AvatarFallback className="bg-primary text-white font-bold text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-right">
                    <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                    <p className="text-xs text-primary">{roleLabels[user.role] || user.role}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex-1 flex items-center gap-2 justify-end">
            <span className="font-bold text-slate-800">نظام توزيع الخبز</span>
            <Avatar className="h-8 w-8 bg-primary">
              <AvatarFallback className="bg-primary text-white font-bold text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Main Content */}
        <main className={cn("p-6 md:p-12 space-y-8 text-right", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
