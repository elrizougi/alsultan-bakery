import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { useOrders, useDispatchRuns, useCustomers, useRoutes } from "@/hooks/useData";
import { DollarSign, Package, Truck, AlertCircle, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";

export default function Dashboard() {
  const user = useStore((state) => state.user);
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: dispatchRuns = [], isLoading: runsLoading } = useDispatchRuns();
  const { data: customers = [] } = useCustomers();
  const { data: routes = [] } = useRoutes();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysOrders = orders.filter(o => o.date === todayStr);
  const activeRuns = dispatchRuns.filter(r => r.status !== 'CLOSED');
  
  const totalRevenue = todaysOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);

  if (ordersLoading || runsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8 animate-in fade-in duration-700" dir="rtl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-primary via-blue-600 to-indigo-700 p-8 md:p-12 text-white shadow-2xl shadow-primary/20">
          <div className="relative z-10">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">أهلاً بك، {user?.name || 'مستخدم'}</h1>
            <p className="text-primary-foreground/90 text-lg md:text-xl font-medium max-w-2xl">هذا هو ملخص عمليات المخبز ليوم {format(new Date(), 'eeee, d MMMM yyyy')}.</p>
          </div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-48 w-48 rounded-full bg-blue-400/20 blur-2xl" />
        </div>

        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-slate-800">{todaysOrders.length}</div>
              <p className="text-sm font-medium text-slate-500 mt-1">إجمالي الطلبات</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Truck className="h-5 w-5 text-indigo-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-slate-800">{activeRuns.length}</div>
              <p className="text-sm font-medium text-slate-500 mt-1">الرحلات النشطة</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-slate-800">{totalRevenue.toFixed(0)} <span className="text-sm font-bold text-slate-400">ر.س</span></div>
              <p className="text-sm font-medium text-slate-500 mt-1">الإيرادات المحققة</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-amber-600">
                {todaysOrders.filter(o => o.status === 'DRAFT').length}
              </div>
              <p className="text-sm font-medium text-slate-500 mt-1">طلبات قيد المراجعة</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
          <Card className="lg:col-span-4 rounded-3xl border-0 shadow-sm">
            <CardHeader className="text-right px-8 py-6">
              <CardTitle className="text-xl font-bold text-slate-800">أحدث الطلبات</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="space-y-4">
                {orders.slice(0, 5).map(order => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors flex-row-reverse gap-4 border border-slate-100/50">
                      <div className="text-right flex-1 min-w-0">
                        <div className="font-bold text-slate-800 truncate">{customer?.name || 'عميل غير مسجل'}</div>
                        <div className="text-xs font-medium text-slate-400 mt-0.5">{order.items?.length || 0} أصناف • {order.date}</div>
                      </div>
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="font-black text-sm text-slate-700">{parseFloat(order.totalAmount).toFixed(1)} <span className="text-[10px]">ر.س</span></div>
                        <StatusBadge status={order.status} className="text-[10px] px-3 py-1 rounded-full font-bold" />
                      </div>
                    </div>
                  );
                })}
                {orders.length === 0 && (
                  <div className="text-center py-8 text-slate-400">لا توجد طلبات حتى الآن</div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-3 rounded-3xl border-0 shadow-sm">
            <CardHeader className="text-right px-8 py-6">
              <CardTitle className="text-xl font-bold text-slate-800">مراقبة الرحلات</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="space-y-4">
                 {dispatchRuns.map(run => {
                   const route = routes.find(r => r.id === run.routeId);
                   return (
                     <div key={run.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 flex-row-reverse gap-3 border border-slate-100">
                       <div className="flex items-center gap-3 flex-row-reverse flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Truck className="h-5 w-5 text-indigo-500" />
                          </div>
                          <div className="text-right truncate">
                            <div className="font-bold text-slate-800 truncate">{route?.name || run.routeId}</div>
                            <div className="text-xs font-medium text-slate-400 truncate">{run.driverName}</div>
                          </div>
                       </div>
                       <StatusBadge status={run.status} className="text-[10px] px-3 py-1 rounded-full font-bold" />
                     </div>
                   );
                 })}
                 {dispatchRuns.length === 0 && (
                   <div className="text-center py-8 text-slate-400">لا توجد رحلات نشطة</div>
                 )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
