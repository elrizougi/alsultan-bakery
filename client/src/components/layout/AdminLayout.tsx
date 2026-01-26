import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Package } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminLayout({ children, className }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-muted/20 flex-col" dir="rtl">
      {/* Mobile Header */}
      <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 sticky top-0 z-40">
        <div className="md:hidden flex items-center gap-2 flex-1">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-72 border-l">
              <Sidebar className="h-full border-0" />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">نظام المخبز</span>
          </div>
        </div>

        <div className="hidden md:flex flex-1 text-right">
          <h1 className="text-sm font-medium text-muted-foreground">
            المؤسسة: <span className="text-foreground font-semibold">مخبز نجمة الصباح</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 flex-row-reverse">
          <div className="text-xs text-muted-foreground hidden sm:block">مدير النظام</div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            مد
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden border-l w-64 md:block flex-shrink-0">
          <Sidebar className="h-full" />
        </div>

        {/* Main Content */}
        <main className={cn("flex-1 overflow-auto p-4 md:p-8 text-right", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
