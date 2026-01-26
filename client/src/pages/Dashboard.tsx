import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { DollarSign, Package, Truck, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { orders, dispatchRuns, customers } = useStore();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysOrders = orders.filter(o => o.date === todayStr);
  const activeRuns = dispatchRuns.filter(r => r.status !== 'CLOSED');
  
  const totalRevenue = todaysOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground text-wrap">نظرة عامة على عمليات المخبز اليوم.</p>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="col-span-1">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-3 pb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right p-3 pt-0">
              <div className="text-lg md:text-2xl font-bold">{todaysOrders.length}</div>
              <p className="text-[10px] text-muted-foreground truncate">إجمالي الطلبات</p>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-3 pb-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right p-3 pt-0">
              <div className="text-lg md:text-2xl font-bold">{activeRuns.length}</div>
              <p className="text-[10px] text-muted-foreground truncate">الرحلات النشطة</p>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-3 pb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right p-3 pt-0">
              <div className="text-lg md:text-2xl font-bold truncate">{totalRevenue.toFixed(0)} ر.س</div>
              <p className="text-[10px] text-muted-foreground truncate">الإيرادات</p>
            </CardContent>
          </Card>
          <Card className="col-span-1 border-destructive/50">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-3 pb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent className="text-right p-3 pt-0">
              <div className="text-lg md:text-2xl font-bold text-destructive">
                {todaysOrders.filter(o => o.status === 'DRAFT').length}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">طلبات مسودة</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader className="text-right px-4">
              <CardTitle className="text-base md:text-lg">أحدث الطلبات</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="space-y-3">
                {orders.slice(0, 5).map(order => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0 flex-row-reverse gap-2">
                      <div className="text-right flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{customer?.name || 'غير معروف'}</div>
                        <div className="text-xs text-muted-foreground">{order.items.length} صنف • {order.date}</div>
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        <div className="font-bold text-xs whitespace-nowrap">{order.totalAmount.toFixed(1)} ر.س</div>
                        <StatusBadge status={order.status} className="text-[8px] px-1.5 py-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader className="text-right px-4">
              <CardTitle className="text-base md:text-lg">حالة التوزيع</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="space-y-3">
                 {dispatchRuns.map(run => (
                   <div key={run.id} className="flex items-center justify-between flex-row-reverse gap-2">
                     <div className="flex items-center gap-2 flex-row-reverse flex-1 min-w-0">
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div className="text-right truncate">
                          <div className="font-medium text-sm truncate">{run.routeId.toUpperCase()}</div>
                          <div className="text-xs text-muted-foreground truncate">{run.driverName}</div>
                        </div>
                     </div>
                     <StatusBadge status={run.status} className="text-[8px] px-1.5 py-0" />
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
