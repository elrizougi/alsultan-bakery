import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { useOrders, useDispatchRuns, useCustomers, useRoutes, useProducts, useUsers } from "@/hooks/useData";
import { DollarSign, Package, Truck, AlertCircle, Loader2, Users, UserCheck, MapPin, ShoppingBag, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { api, Transaction } from "@/lib/api";

export default function Dashboard() {
  const user = useStore((state) => state.user);
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: dispatchRuns = [], isLoading: runsLoading } = useDispatchRuns();
  const { data: customers = [] } = useCustomers();
  const { data: routes = [] } = useRoutes();
  const { data: products = [] } = useProducts();
  const { data: users = [] } = useUsers();
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: api.getAllTransactions
  });

  const transactionTypeLabels: Record<string, string> = {
    'CASH_SALE': 'بيع نقدي',
    'CREDIT_SALE': 'بيع آجل',
    'RETURN': 'مرتجع',
    'FREE_DISTRIBUTION': 'توزيع مجاني',
    'FREE_SAMPLE': 'عينة مجانية',
    'DAMAGED': 'تالف'
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysOrders = orders.filter(o => o.date === todayStr);
  const activeRuns = dispatchRuns.filter(r => r.status !== 'CLOSED');
  
  const totalRevenue = todaysOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
  
  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);
  const salesReps = users.filter(u => u.role === 'SALES' && u.isActive !== false);
  const admins = users.filter(u => u.role === 'ADMIN' && u.isActive !== false);
  
  const lowStockProducts = products.filter(p => p.stock < 50);
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * parseFloat(p.price)), 0);

  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED' || o.status === 'CLOSED');
  const deliveryRate = orders.length > 0 ? Math.round((deliveredOrders.length / orders.length) * 100) : 0;

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
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-primary via-blue-600 to-indigo-700 p-8 md:p-12 text-white shadow-2xl shadow-primary/20">
          <div className="relative z-10">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">أهلاً بك، {user?.name || 'مستخدم'}</h1>
            <p className="text-primary-foreground/90 text-lg md:text-xl font-medium max-w-2xl">
              هذا هو ملخص عمليات المخبز ليوم {format(new Date(), 'eeee, d MMMM yyyy', { locale: ar })}.
            </p>
          </div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-48 w-48 rounded-full bg-blue-400/20 blur-2xl" />
        </div>

        {/* Main Stats */}
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1" data-testid="stat-orders">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-slate-800">{todaysOrders.length}</div>
              <p className="text-sm font-medium text-slate-500 mt-1">طلبات اليوم</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1" data-testid="stat-runs">
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
          
          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1" data-testid="stat-revenue">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-slate-800">{totalRevenue.toFixed(0)} <span className="text-sm font-bold text-slate-400">ر.س</span></div>
              <p className="text-sm font-medium text-slate-500 mt-1">إيرادات اليوم</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1" data-testid="stat-pending">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-amber-600">
                {todaysOrders.filter(o => o.status === 'DRAFT').length}
              </div>
              <p className="text-sm font-medium text-slate-500 mt-1">قيد المراجعة</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats - Customers, Drivers, Routes, Products */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <Card className="rounded-2xl border border-slate-100 shadow-sm" data-testid="stat-customers">
            <CardContent className="p-4 flex items-center gap-3 flex-row-reverse">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="text-right flex-1">
                <div className="text-2xl font-black text-slate-800">{customers.length}</div>
                <p className="text-xs font-medium text-slate-500">العملاء</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border border-slate-100 shadow-sm" data-testid="stat-drivers">
            <CardContent className="p-4 flex items-center gap-3 flex-row-reverse">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div className="text-right flex-1">
                <div className="text-2xl font-black text-slate-800">{drivers.length}</div>
                <p className="text-xs font-medium text-slate-500">المناديب</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border border-slate-100 shadow-sm" data-testid="stat-sales">
            <CardContent className="p-4 flex items-center gap-3 flex-row-reverse">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div className="text-right flex-1">
                <div className="text-2xl font-black text-slate-800">{salesReps.length}</div>
                <p className="text-xs font-medium text-slate-500">فريق المبيعات</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border border-slate-100 shadow-sm" data-testid="stat-routes">
            <CardContent className="p-4 flex items-center gap-3 flex-row-reverse">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div className="text-right flex-1">
                <div className="text-2xl font-black text-slate-800">{routes.length}</div>
                <p className="text-xs font-medium text-slate-500">خطوط التوزيع</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border border-slate-100 shadow-sm" data-testid="stat-products">
            <CardContent className="p-4 flex items-center gap-3 flex-row-reverse">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
              <div className="text-right flex-1">
                <div className="text-2xl font-black text-slate-800">{products.length}</div>
                <p className="text-xs font-medium text-slate-500">المنتجات</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border border-slate-100 shadow-sm" data-testid="stat-admins">
            <CardContent className="p-4 flex items-center gap-3 flex-row-reverse">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-500/20">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div className="text-right flex-1">
                <div className="text-2xl font-black text-slate-800">{admins.length}</div>
                <p className="text-xs font-medium text-slate-500">المدراء</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Indicators */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-row-reverse mb-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-700">نسبة التوصيل</p>
                  <div className="text-3xl font-black text-emerald-600">{deliveryRate}%</div>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="w-full bg-emerald-200 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${deliveryRate}%` }}
                />
              </div>
              <p className="text-xs text-emerald-600 mt-2">{deliveredOrders.length} من {orders.length} طلب تم توصيله</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-row-reverse mb-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-700">قيمة المخزون</p>
                  <div className="text-3xl font-black text-blue-600">{totalStockValue.toLocaleString()}</div>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Package className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-600 font-bold">ر.س</span>
                <span className="text-slate-500">إجمالي قيمة المخزون الحالي</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className={`rounded-2xl border-0 shadow-sm ${lowStockProducts.length > 0 ? 'bg-gradient-to-br from-red-50 to-orange-50' : 'bg-gradient-to-br from-slate-50 to-gray-50'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-row-reverse mb-4">
                <div className="text-right">
                  <p className={`text-sm font-medium ${lowStockProducts.length > 0 ? 'text-red-700' : 'text-slate-700'}`}>مخزون منخفض</p>
                  <div className={`text-3xl font-black ${lowStockProducts.length > 0 ? 'text-red-600' : 'text-slate-600'}`}>{lowStockProducts.length}</div>
                </div>
                <div className={`h-14 w-14 rounded-2xl ${lowStockProducts.length > 0 ? 'bg-red-500 shadow-red-500/30' : 'bg-slate-400 shadow-slate-400/30'} flex items-center justify-center shadow-lg`}>
                  <AlertCircle className="h-7 w-7 text-white" />
                </div>
              </div>
              {lowStockProducts.length > 0 ? (
                <div className="space-y-1">
                  {lowStockProducts.slice(0, 2).map(p => (
                    <div key={p.id} className="text-xs text-red-600 flex items-center gap-1 flex-row-reverse">
                      <ArrowDownRight className="h-3 w-3" />
                      <span>{p.name} ({p.stock} قطعة)</span>
                    </div>
                  ))}
                  {lowStockProducts.length > 2 && (
                    <p className="text-xs text-red-500">و {lowStockProducts.length - 2} منتجات أخرى...</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">جميع المنتجات متوفرة بكميات كافية</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* سجل العمليات اليومية */}
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="text-right px-8 py-6">
            <CardTitle className="text-xl font-bold text-slate-800">سجل العمليات اليومية</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {transactions.slice(0, 12).map(transaction => {
                const driver = users.find(u => u.id === transaction.driverId);
                const customer = customers.find(c => c.id === transaction.customerId);
                const product = products.find(p => p.id === transaction.productId);
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors flex-row-reverse gap-4 border border-slate-100/50" data-testid={`transaction-item-${transaction.id}`}>
                    <div className="text-right flex-1 min-w-0">
                      <div className="font-bold text-slate-800 truncate">{product?.name || 'منتج'}</div>
                      <div className="text-xs font-medium text-slate-400 mt-0.5">
                        {driver?.name || 'سائق'} • {transaction.quantity} قطعة
                      </div>
                      {customer && <div className="text-xs font-medium text-slate-500 mt-0.5">{customer.name}</div>}
                    </div>
                    <div className="flex flex-col items-start gap-1.5">
                      <div className="font-black text-sm text-slate-700">{parseFloat(transaction.totalAmount || '0').toFixed(1)} <span className="text-[10px]">ر.س</span></div>
                      <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${
                        transaction.type === 'CASH_SALE' ? 'bg-green-100 text-green-700' :
                        transaction.type === 'CREDIT_SALE' ? 'bg-yellow-100 text-yellow-700' :
                        transaction.type === 'RETURN' ? 'bg-blue-100 text-blue-700' :
                        transaction.type === 'DAMAGED' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {transactionTypeLabels[transaction.type] || transaction.type}
                      </span>
                    </div>
                  </div>
                );
              })}
              {transactions.length === 0 && (
                <div className="col-span-full text-center py-8 text-slate-400">لا توجد عمليات حتى الآن</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
