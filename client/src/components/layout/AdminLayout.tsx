import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminLayout({ children, className }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <div className="hidden border-r w-64 md:block flex-shrink-0">
        <Sidebar className="h-full" />
      </div>
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px]">
          <div className="flex-1">
            <h1 className="text-sm font-medium text-muted-foreground">
              Organization: <span className="text-foreground font-semibold">Morning Star Bakery</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted-foreground">Admin User</div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              AD
            </div>
          </div>
        </header>
        <main className={cn("flex-1 overflow-auto p-6 md:p-8", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
