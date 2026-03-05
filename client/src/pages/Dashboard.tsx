import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { useOrders, useDispatchRuns, useCustomers, useRoutes, useProducts, useUsers } from "@/hooks/useData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Package, Truck, AlertCircle, Loader2, Users, UserCheck, MapPin, ShoppingBag, TrendingUp, ArrowUpRight, ArrowDownRight, ShoppingCart, FileText, Banknote, CreditCard, CircleDollarSign, Receipt } from "lucide-react";
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
  const { data: allDebts = [] } = useQuery({
    queryKey: ['allCustomerDebts'],
    queryFn: api.getAllCustomerDebts
  });

  const isDriver = user?.role === 'DRIVER';
  const driverId = user?.id || '';

  const { data: driverInventory = [] } = useQuery({
    queryKey: ['driverInventory', driverId],
    queryFn: () => api.getDriverInventory(driverId),
    enabled: isDriver && !!driverId
  });

  const { data: driverTransactions = [] } = useQuery({
    queryKey: ['driverTransactions', driverId],
    queryFn: () => api.getDriverTransactions(driverId),
    enabled: isDriver && !!driverId
  });

  const { data: driverBalance } = useQuery({
    queryKey: ['driverBalance', driverId],
    queryFn: () => api.getDriverBalance(driverId),
    enabled: isDriver && !!driverId
  });

  const { data: driverDebts = [] } = useQuery({
    queryKey: ['driverDebts', driverId],
    queryFn: () => api.getDriverCustomerDebts(driverId),
    enabled: isDriver && !!driverId
  });

  const transactionTypeLabels: Record<string, string> = {
    'CASH_SALE': 'بيع نقدي',
    'CREDIT_SALE': 'بيع آجل',
    'RETURN': 'مرتجع',
    'FREE_DISTRIBUTION': 'توزيع مجاني',
    'FREE_SAMPLE': 'عينة مجانية',
    'DAMAGED': 'تالف',
    'EXPENSE': 'مصروفات'
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysOrders = orders.filter(o => o.date === todayStr);
  const activeRuns = dispatchRuns.filter(r => r.status !== 'CLOSED');
  
  const todaysTransactions = transactions.filter(t => {
    if (!t.createdAt) return false;
    const txDate = format(new Date(t.createdAt), 'yyyy-MM-dd');
    return txDate === todayStr;
  });

  const todaysSales = todaysTransactions.filter(t => ['CASH_SALE', 'CREDIT_SALE'].includes(t.type as string));
  const totalSalesCount = todaysSales.reduce((sum, t) => sum + (t.quantity || 0), 0);

  const totalBreadSold = todaysSales.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const doughBatches = Math.floor(totalBreadSold / 450);

  const totalCashCollected = todaysTransactions
    .filter(t => (t.type as string) === 'CASH_SALE')
    .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);

  const todaysCreditDebts = allDebts.filter((d: any) => {
    if (!d.createdAt) return false;
    const debtDate = format(new Date(d.createdAt), 'yyyy-MM-dd');
    return debtDate === todayStr;
  });
  const unpaidCreditValue = todaysCreditDebts
    .filter((d: any) => !d.isPaid)
    .reduce((sum: number, d: any) => sum + parseFloat(d.remainingAmount || d.amount || '0'), 0);

  const totalExpenses = todaysTransactions
    .filter(t => (t.type as string) === 'EXPENSE')
    .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
  
  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);

  // حسابات السائق
  const driverTotalInventory = driverInventory.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
  const driverInventoryValue = driverInventory.reduce((sum: number, inv: any) => {
    const product = products.find(p => p.id === inv.productId);
    return sum + (inv.quantity || 0) * parseFloat(product?.price || '0');
  }, 0);

  const driverSoldBread = driverTransactions
    .filter((t: any) => ['CASH_SALE', 'CREDIT_SALE'].includes(t.type))
    .reduce((sum: number, t: any) => sum + (t.quantity || 0), 0);
  const driverSoldValue = driverTransactions
    .filter((t: any) => ['CASH_SALE', 'CREDIT_SALE'].includes(t.type))
    .reduce((sum: number, t: any) => sum + parseFloat(t.totalAmount || '0'), 0);

  const driverUniqueCustomers = new Set(
    driverTransactions
      .filter((t: any) => ['CASH_SALE', 'CREDIT_SALE'].includes(t.type))
      .map((t: any) => t.customerId)
  ).size;

  const driverTotalDebts = driverDebts.reduce((sum: number, debt: any) => 
    sum + parseFloat(debt.remainingAmount || '0'), 0);
  const driverUnpaidDebtsCount = driverDebts.filter((d: any) => parseFloat(d.remainingAmount || '0') > 0).length;

  const driverTodayTransactions = driverTransactions.filter((t: any) => {
    if (!t.createdAt) return false;
    const txDate = format(new Date(t.createdAt), 'yyyy-MM-dd');
    return txDate === todayStr;
  });

  const driverTotalExpenses = driverTransactions
    .filter((t: any) => (t.type as string) === 'EXPENSE')
    .reduce((sum: number, t: any) => sum + parseFloat(t.totalAmount || '0'), 0);

  if (ordersLoading || runsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  // عرض لوحة تحكم السائق
  if (isDriver) {
    return (
      <AdminLayout>
        <div className="flex flex-col gap-8 animate-in fade-in duration-700" dir="rtl">
          {/* Hero Section للسائق */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-500 via-green-600 to-teal-700 p-8 md:p-12 text-white shadow-2xl shadow-emerald-500/20">
            <div className="relative z-10">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">أهلاً بك، {user?.name || 'مستخدم'}</h1>
              <p className="text-primary-foreground/90 text-lg md:text-xl font-medium max-w-2xl">
                هذا هو ملخص عملياتك ليوم {format(new Date(), 'eeee, d MMMM yyyy', { locale: ar })}.
              </p>
            </div>
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-48 w-48 rounded-full bg-teal-400/20 blur-2xl" />
          </div>

          {/* بطاقة الرصيد النقدي */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 flex-row-reverse">
                <div className="p-4 bg-green-500 rounded-2xl shadow-md">
                  <Banknote className="h-10 w-10 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-lg font-medium text-green-700">الرصيد النقدي</p>
                  <div className="text-4xl md:text-5xl font-bold text-green-600">
                    {parseFloat(driverBalance?.cashBalance || "0").toFixed(2)} <span className="text-2xl">ر.س</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* إحصائيات السائق الرئيسية */}
          <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-orange-50" data-testid="stat-driver-inventory">
              <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
                <div className="h-10 w-10 rounded-2xl bg-orange-500 flex items-center justify-center">
                  <Package className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="text-right p-6 pt-0">
                <div className="text-3xl font-black text-orange-700">{driverTotalInventory}</div>
                <p className="text-sm font-medium text-orange-600 mt-1">المخزون الحالي</p>
                <p className="text-xs text-orange-500">{driverInventoryValue.toFixed(2)} ر.س</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-green-50" data-testid="stat-driver-sold">
              <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
                <div className="h-10 w-10 rounded-2xl bg-green-500 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="text-right p-6 pt-0">
                <div className="text-3xl font-black text-green-700">{driverSoldBread}</div>
                <p className="text-sm font-medium text-green-600 mt-1">الخبز المباع</p>
                <p className="text-xs text-green-500">{driverSoldValue.toFixed(2)} ر.س</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-purple-50" data-testid="stat-driver-customers">
              <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
                <div className="h-10 w-10 rounded-2xl bg-purple-500 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="text-right p-6 pt-0">
                <div className="text-3xl font-black text-purple-700">{driverUniqueCustomers}</div>
                <p className="text-sm font-medium text-purple-600 mt-1">عدد العملاء</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-slate-50" data-testid="stat-driver-today-ops">
              <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
                <div className="h-10 w-10 rounded-2xl bg-slate-500 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="text-right p-6 pt-0">
                <div className="text-3xl font-black text-slate-700">{driverTodayTransactions.length}</div>
                <p className="text-sm font-medium text-slate-600 mt-1">العمليات اليوم</p>
              </CardContent>
            </Card>
          </div>

          {/* الإحصائيات المالية للسائق */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-amber-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-row-reverse mb-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-yellow-700">إجمالي الديون</p>
                    <div className="text-3xl font-black text-yellow-600">{driverTotalDebts.toFixed(2)} ر.س</div>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                    <CreditCard className="h-7 w-7 text-white" />
                  </div>
                </div>
                <p className="text-xs text-yellow-600">{driverUnpaidDebtsCount} دين غير مدفوع</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-red-50 to-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-row-reverse mb-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-700">إجمالي المصروفات</p>
                    <div className="text-3xl font-black text-red-600">{driverTotalExpenses.toFixed(2)} ر.س</div>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                    <DollarSign className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* سجل عمليات السائق */}
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader className="text-right px-8 py-6">
              <CardTitle className="text-xl font-bold text-slate-800">سجل عملياتك اليومية</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {driverTransactions.slice(0, 12).map((transaction: any) => {
                  const customer = customers.find(c => c.id === transaction.customerId);
                  const product = products.find(p => p.id === transaction.productId);
                  const isExpense = (transaction.type as string) === 'EXPENSE';
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors flex-row-reverse gap-4 border border-slate-100/50" data-testid={`driver-transaction-${transaction.id}`}>
                      <div className="text-right flex-1 min-w-0">
                        <div className="font-bold text-slate-800 truncate">
                          {isExpense ? (transaction.notes || 'مصروفات') : (product?.name || 'منتج')}
                        </div>
                        <div className="text-xs font-medium text-slate-400 mt-0.5">
                          {!isExpense && `${transaction.quantity} قطعة`}
                        </div>
                        {!isExpense && customer && <div className="text-xs font-medium text-slate-500 mt-0.5">{customer.name}</div>}
                      </div>
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="font-black text-sm text-slate-700">{parseFloat(transaction.totalAmount || '0').toFixed(1)} <span className="text-[10px]">ر.س</span></div>
                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${
                          (transaction.type as string) === 'CASH_SALE' ? 'bg-green-100 text-green-700' :
                          (transaction.type as string) === 'CREDIT_SALE' ? 'bg-yellow-100 text-yellow-700' :
                          (transaction.type as string) === 'RETURN' ? 'bg-blue-100 text-blue-700' :
                          (transaction.type as string) === 'DAMAGED' ? 'bg-red-100 text-red-700' :
                          (transaction.type as string) === 'EXPENSE' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {transactionTypeLabels[transaction.type] || transaction.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {driverTransactions.length === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-400">لا توجد عمليات حتى الآن</div>
                )}
              </div>
            </CardContent>
          </Card>
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
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1" data-testid="stat-sales-count">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-slate-800">{totalSalesCount}</div>
              <p className="text-sm font-medium text-slate-500 mt-1">عدد المبيعات</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1" data-testid="stat-dough-batches">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-amber-600">{doughBatches}</div>
              <p className="text-sm font-medium text-slate-500 mt-1">عدد العجنات</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1" data-testid="stat-cash-collected">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-emerald-700">{totalCashCollected.toFixed(2)} <span className="text-sm font-bold text-slate-400">ر.س</span></div>
              <p className="text-sm font-medium text-slate-500 mt-1">المبلغ المحصل نقداً</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1" data-testid="stat-unpaid-credit">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-yellow-50 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-yellow-700">{unpaidCreditValue.toFixed(2)} <span className="text-sm font-bold text-slate-400">ر.س</span></div>
              <p className="text-sm font-medium text-slate-500 mt-1">آجل غير مدفوع</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1" data-testid="stat-expenses">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-red-50 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-red-600">{totalExpenses.toFixed(2)} <span className="text-sm font-bold text-slate-400">ر.س</span></div>
              <p className="text-sm font-medium text-slate-500 mt-1">المصروفات</p>
            </CardContent>
          </Card>
        </div>

        {/* التقرير اليومي المجمع بالتاريخ */}
        <Card className="rounded-3xl border-0 shadow-sm">
          <CardHeader className="text-right px-8 py-6">
            <CardTitle className="text-xl font-bold text-slate-800">التقرير اليومي المجمع</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {(() => {
              const dateMap: Record<string, typeof transactions> = {};
              transactions.forEach(t => {
                if (!t.createdAt) return;
                const dateKey = format(new Date(t.createdAt), 'yyyy-MM-dd');
                if (!dateMap[dateKey]) dateMap[dateKey] = [];
                dateMap[dateKey].push(t);
              });
              const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));

              if (sortedDates.length === 0) {
                return <p className="text-muted-foreground text-center py-8">لا توجد عمليات مسجلة</p>;
              }

              return (
                <div className="rounded-md border bg-card overflow-hidden">
                  <Table className="text-right">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right font-bold">التاريخ</TableHead>
                        <TableHead className="text-right font-bold">عدد المناديب</TableHead>
                        <TableHead className="text-right font-bold">الخبز الكلي</TableHead>
                        <TableHead className="text-right font-bold">الخبز المباع</TableHead>
                        <TableHead className="text-right font-bold">المحصل نقداً</TableHead>
                        <TableHead className="text-right font-bold">الآجل غير المدفوع</TableHead>
                        <TableHead className="text-right font-bold">المصروفات</TableHead>
                        <TableHead className="text-right font-bold">عدد العملاء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedDates.map(dateKey => {
                        const dayTx = dateMap[dateKey];
                        const activeDrivers = new Set(dayTx.map(t => t.driverId)).size;
                        const totalBread = dayTx
                          .filter(t => !['EXPENSE'].includes(t.type as string))
                          .reduce((sum, t) => sum + (t.quantity || 0), 0);
                        const soldBread = dayTx
                          .filter(t => ['CASH_SALE', 'CREDIT_SALE'].includes(t.type as string))
                          .reduce((sum, t) => sum + (t.quantity || 0), 0);
                        const cashCollected = dayTx
                          .filter(t => (t.type as string) === 'CASH_SALE')
                          .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
                        const dayCreditDebts = allDebts.filter((d: any) => {
                          if (!d.createdAt) return false;
                          return format(new Date(d.createdAt), 'yyyy-MM-dd') === dateKey && !d.isPaid;
                        });
                        const creditUnpaid = dayCreditDebts
                          .reduce((sum: number, d: any) => sum + parseFloat(d.remainingAmount || d.amount || '0'), 0);
                        const expenses = dayTx
                          .filter(t => (t.type as string) === 'EXPENSE')
                          .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
                        const uniqueCustomers = new Set(
                          dayTx
                            .filter(t => ['CASH_SALE', 'CREDIT_SALE'].includes(t.type as string) && t.customerId)
                            .map(t => t.customerId)
                        ).size;
                        const isToday = dateKey === todayStr;

                        return (
                          <TableRow key={dateKey} className={isToday ? 'bg-blue-50/50' : ''} data-testid={`row-date-summary-${dateKey}`}>
                            <TableCell className="font-bold">
                              {format(new Date(dateKey), 'eeee d/MM/yyyy', { locale: ar })}
                              {isToday && <span className="mr-2 text-xs text-blue-600 font-medium">(اليوم)</span>}
                            </TableCell>
                            <TableCell>{activeDrivers}</TableCell>
                            <TableCell>{totalBread}</TableCell>
                            <TableCell>{soldBread}</TableCell>
                            <TableCell className="text-emerald-700 font-semibold">{cashCollected.toFixed(2)} ر.س</TableCell>
                            <TableCell className="text-yellow-700 font-semibold">{creditUnpaid.toFixed(2)} ر.س</TableCell>
                            <TableCell className="text-red-600 font-semibold">{expenses.toFixed(2)} ر.س</TableCell>
                            <TableCell>{uniqueCustomers}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
