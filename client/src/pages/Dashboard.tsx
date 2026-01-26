import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { DollarSign, Package, Truck, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function Dashboard() {
  const { orders, dispatchRuns, customers } = useStore();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysOrders = orders.filter(o => o.date === todayStr);
  const activeRuns = dispatchRuns.filter(r => r.status !== 'CLOSED');
  
  const totalRevenue = todaysOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const statusTranslations: Record<string, string> = {
    'DRAFT': 'مسودة',
    'CONFIRMED': 'مؤكد',
    'ASSIGNED': 'مخصص',
    'DELIVERED': 'تم التوصيل',
    'CLOSED': 'مغلق',
    'CANCELED': 'ملغي',
    'LOADED': 'محمل',
    'OUT': 'في الطريق',
    'RETURNED': 'عاد'
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
          <p className="text-muted-foreground">نظرة عامة على عمليات المخبز اليوم.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلبات (اليوم)</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold">{todaysOrders.length}</div>
              <p className="text-xs text-muted-foreground">
                {todaysOrders.filter(o => o.status === 'CONFIRMED').length} مؤكدة
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الرحلات النشطة</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold">{activeRuns.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeRuns.filter(r => r.status === 'OUT').length} في التوصيل حالياً
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إيرادات اليوم</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} ر.س</div>
              <p className="text-xs text-muted-foreground">
                +20.1% مقارنة بالأمس
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">تنبيهات هامة</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold text-destructive">
                {todaysOrders.filter(o => o.status === 'DRAFT').length}
              </div>
              <p className="text-xs text-muted-foreground">
                طلبات مسودة تحتاج تأكيد
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader className="text-right">
              <CardTitle>أحدث الطلبات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.slice(0, 5).map(order => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0 flex-row-reverse">
                      <div className="text-right">
                        <div className="font-medium">{customer?.name || 'غير معروف'}</div>
                        <div className="text-sm text-muted-foreground">{order.items.length} أصناف • {order.date}</div>
                      </div>
                      <div className="flex items-center gap-4 flex-row-reverse">
                        <div className="font-medium">{order.totalAmount.toFixed(2)} ر.س</div>
                        <StatusBadge status={order.status} className="text-[10px]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader className="text-right">
              <CardTitle>حالة التوزيع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 {dispatchRuns.map(run => (
                   <div key={run.id} className="flex items-center justify-between flex-row-reverse">
                     <div className="flex items-center gap-3 flex-row-reverse">
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{run.routeId.toUpperCase()}</div>
                          <div className="text-xs text-muted-foreground">{run.driverName}</div>
                        </div>
                     </div>
                     <StatusBadge status={run.status} className="text-[10px]" />
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
