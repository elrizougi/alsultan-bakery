import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { useCustomers, useProducts, useUsers } from "@/hooks/useData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Loader2, ShoppingCart, Banknote, CreditCard, Receipt, Building2 } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Dashboard() {
  const user = useStore((state) => state.user);
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: users = [] } = useUsers();
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: api.getAllTransactions
  });
  const { data: allDebts = [] } = useQuery({
    queryKey: ['allCustomerDebts'],
    queryFn: api.getAllCustomerDebts
  });

  const { data: bakeryExpenses = [] } = useQuery<any[]>({
    queryKey: ['bakery-expenses'],
    queryFn: async () => {
      const res = await fetch("/api/bakery-expenses");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const currentMonth = format(new Date(), 'yyyy-MM');
  
  const monthTransactions = transactions.filter(t => {
    if (!t.createdAt) return false;
    const txDate = format(new Date(t.createdAt), 'yyyy-MM');
    return txDate === currentMonth;
  });

  const monthSales = monthTransactions.filter(t => ['CASH_SALE', 'CREDIT_SALE'].includes(t.type as string));
  const totalSalesCount = monthSales.reduce((sum, t) => sum + (t.quantity || 0), 0);

  const totalBreadSold = monthSales.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const doughBatches = Math.floor(totalBreadSold / 450);

  const totalCashCollected = monthTransactions
    .filter(t => (t.type as string) === 'CASH_SALE')
    .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);

  const monthCreditDebts = allDebts.filter((d: any) => {
    if (!d.createdAt) return false;
    const debtMonth = format(new Date(d.createdAt), 'yyyy-MM');
    return debtMonth === currentMonth;
  });
  const unpaidCreditValue = monthCreditDebts
    .filter((d: any) => !d.isPaid)
    .reduce((sum: number, d: any) => sum + parseFloat(d.remainingAmount || d.amount || '0'), 0);

  const totalExpenses = monthTransactions
    .filter(t => (t.type as string) === 'EXPENSE')
    .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const totalBakeryExpenses = bakeryExpenses
    .filter((e: any) => {
      if (!e.expenseDate) return false;
      const expDate = parseISO(e.expenseDate);
      return isWithinInterval(expDate, { start: startOfDay(monthStart), end: endOfDay(monthEnd) });
    })
    .reduce((sum: number, e: any) => sum + parseFloat(e.amount || '0'), 0);
  
  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);

  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);

  if (isLoading) {
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
              ملخص عمليات المخبز لشهر {format(new Date(), 'MMMM yyyy', { locale: ar })}.
            </p>
          </div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-48 w-48 rounded-full bg-blue-400/20 blur-2xl" />
        </div>

        {/* Main Stats */}
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              <div className="text-3xl font-black text-emerald-700">{fmt(totalCashCollected)} <span className="text-sm font-bold text-slate-400">ر.س</span></div>
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
              <div className="text-3xl font-black text-yellow-700">{fmt(unpaidCreditValue)} <span className="text-sm font-bold text-slate-400">ر.س</span></div>
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
              <div className="text-3xl font-black text-red-600">{fmt(totalExpenses)} <span className="text-sm font-bold text-slate-400">ر.س</span></div>
              <p className="text-sm font-medium text-slate-500 mt-1">مصروفات التوزيع</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1" data-testid="stat-bakery-expenses">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 p-6 pb-2">
              <div className="h-10 w-10 rounded-2xl bg-orange-50 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent className="text-right p-6 pt-0">
              <div className="text-3xl font-black text-orange-600">{fmt(totalBakeryExpenses)} <span className="text-sm font-bold text-slate-400">ر.س</span></div>
              <p className="text-sm font-medium text-slate-500 mt-1">مصروفات المخبز</p>
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
              monthTransactions.forEach(t => {
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
                        <TableHead className="text-right font-bold">الراجع</TableHead>
                        <TableHead className="text-right font-bold">التالف</TableHead>
                        <TableHead className="text-right font-bold">متوسط سعر البيع</TableHead>
                        <TableHead className="text-right font-bold">المحصل نقداً</TableHead>
                        <TableHead className="text-right font-bold">الآجل غير المدفوع</TableHead>
                        <TableHead className="text-right font-bold">مصروفات التوزيع</TableHead>
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
                        const returnedBread = dayTx
                          .filter(t => (t.type as string) === 'RETURN')
                          .reduce((sum, t) => sum + (t.quantity || 0), 0);
                        const damagedBread = dayTx
                          .filter(t => (t.type as string) === 'DAMAGED')
                          .reduce((sum, t) => sum + (t.quantity || 0), 0);
                        const mughalafId = products.find(p => p.name === 'مغلف')?.id;
                        const salesForAvg = dayTx
                          .filter(t => ['CASH_SALE', 'CREDIT_SALE'].includes(t.type as string) && t.productId !== mughalafId);
                        const avgSalesAmount = salesForAvg.reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
                        const avgSalesQty = salesForAvg.reduce((sum, t) => sum + (t.quantity || 0), 0);
                        const avgPrice = avgSalesQty > 0 ? avgSalesAmount / avgSalesQty : 0;
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
                            <TableCell className="text-blue-600 font-semibold">{returnedBread}</TableCell>
                            <TableCell className="text-gray-600 font-semibold">{damagedBread}</TableCell>
                            <TableCell className="text-purple-700 font-semibold">{avgPrice > 0 ? `${fmt(avgPrice)} ر.س` : '-'}</TableCell>
                            <TableCell className="text-emerald-700 font-semibold">{fmt(cashCollected)} ر.س</TableCell>
                            <TableCell className="text-yellow-700 font-semibold">{fmt(creditUnpaid)} ر.س</TableCell>
                            <TableCell className="text-red-600 font-semibold">{fmt(expenses)} ر.س</TableCell>
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
