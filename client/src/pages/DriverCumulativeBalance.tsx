import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, ArrowDownCircle, Banknote, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type Transaction = {
  id: string;
  driverId: string;
  type: string;
  quantity: number;
  totalAmount: string;
  createdAt: string;
  productId?: string;
};

type CashDeposit = {
  id: string;
  driverId: string;
  amount: string;
  depositDate: string;
  status: string;
};

type CustomerDebt = {
  id: string;
  driverId: string;
  amount: string;
  paidAmount: string;
  isPaid: boolean;
  createdAt: string;
};

type User = {
  id: string;
  name: string;
  role: string;
};

export default function DriverCumulativeBalancePage() {
  const [selectedDriverId, setSelectedDriverId] = useState<string>("all");
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: allTransactions = [] } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
  const { data: allDeposits = [] } = useQuery<CashDeposit[]>({ queryKey: ["/api/cash-deposits"] });
  const { data: allDebts = [] } = useQuery<CustomerDebt[]>({ queryKey: ["/api/customer-debts"] });

  const drivers = useMemo(() => users.filter(u => u.role === "DRIVER"), [users]);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const driverSummaries = useMemo(() => {
    const filteredDrivers = selectedDriverId === "all" ? drivers : drivers.filter(d => d.id === selectedDriverId);

    return filteredDrivers.map(driver => {
      const driverTx = allTransactions.filter(t => t.driverId === driver.id);
      const driverDeposits = allDeposits.filter(d => d.driverId === driver.id);
      const driverDebts = allDebts.filter(d => d.driverId === driver.id);

      const totalCashSales = driverTx
        .filter(t => t.type === "CASH_SALE")
        .reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);

      const totalCreditSales = driverTx
        .filter(t => t.type === "CREDIT_SALE")
        .reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);

      const totalSales = totalCashSales + totalCreditSales;

      const totalBreadSold = driverTx
        .filter(t => t.type === "CASH_SALE" || t.type === "CREDIT_SALE")
        .reduce((sum, t) => sum + t.quantity, 0);

      const totalPaidToBakery = driverDeposits
        .filter(d => d.status === "CONFIRMED")
        .reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);

      const totalExpenses = driverTx
        .filter(t => t.type === "EXPENSE")
        .reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);

      const unpaidDebts = driverDebts
        .filter(d => !d.isPaid)
        .reduce((sum, d) => sum + (parseFloat(d.amount) - parseFloat(d.paidAmount || "0")), 0);

      const cumulativeBalance = totalSales - totalPaidToBakery - unpaidDebts;

      const dateMap = new Map<string, {
        cashSales: number;
        creditSales: number;
        breadSold: number;
        paidToBakery: number;
        expenses: number;
        creditUnpaid: number;
      }>();

      driverTx.forEach(t => {
        if (!t.createdAt) return;
        const date = format(new Date(t.createdAt), "yyyy-MM-dd");
        const entry = dateMap.get(date) || { cashSales: 0, creditSales: 0, breadSold: 0, paidToBakery: 0, expenses: 0, creditUnpaid: 0 };
        const amount = parseFloat(t.totalAmount || "0");
        if (t.type === "CASH_SALE") {
          entry.cashSales += amount;
          entry.breadSold += t.quantity;
        } else if (t.type === "CREDIT_SALE") {
          entry.creditSales += amount;
          entry.breadSold += t.quantity;
        } else if (t.type === "EXPENSE") {
          entry.expenses += amount;
        }
        dateMap.set(date, entry);
      });

      driverDeposits.filter(d => d.status === "CONFIRMED").forEach(d => {
        const date = d.depositDate || "";
        if (!date) return;
        const entry = dateMap.get(date) || { cashSales: 0, creditSales: 0, breadSold: 0, paidToBakery: 0, expenses: 0, creditUnpaid: 0 };
        entry.paidToBakery += parseFloat(d.amount || "0");
        dateMap.set(date, entry);
      });

      driverDebts.filter(d => !d.isPaid).forEach(d => {
        if (!d.createdAt) return;
        const date = format(new Date(d.createdAt), "yyyy-MM-dd");
        const entry = dateMap.get(date) || { cashSales: 0, creditSales: 0, breadSold: 0, paidToBakery: 0, expenses: 0, creditUnpaid: 0 };
        entry.creditUnpaid += parseFloat(d.amount) - parseFloat(d.paidAmount || "0");
        dateMap.set(date, entry);
      });

      const dailyRows = Array.from(dateMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, data]) => ({
          date,
          ...data,
          totalSales: data.cashSales + data.creditSales,
        }));

      let runningBalance = 0;
      const dailyRowsWithRunning = Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => {
          const dailyNet = data.cashSales + data.creditSales - data.paidToBakery - data.creditUnpaid;
          runningBalance += dailyNet;
          return { date, ...data, totalSales: data.cashSales + data.creditSales, dailyNet, cumulative: runningBalance };
        })
        .reverse();

      return {
        driver,
        totalCashSales,
        totalCreditSales,
        totalSales,
        totalBreadSold,
        totalPaidToBakery,
        totalExpenses,
        unpaidDebts,
        cumulativeBalance,
        dailyRows: dailyRowsWithRunning,
      };
    });
  }, [drivers, allTransactions, allDeposits, allDebts, selectedDriverId]);

  const grandTotals = useMemo(() => {
    return driverSummaries.reduce(
      (acc, s) => ({
        totalSales: acc.totalSales + s.totalSales,
        totalCashSales: acc.totalCashSales + s.totalCashSales,
        totalCreditSales: acc.totalCreditSales + s.totalCreditSales,
        totalBreadSold: acc.totalBreadSold + s.totalBreadSold,
        totalPaidToBakery: acc.totalPaidToBakery + s.totalPaidToBakery,
        totalExpenses: acc.totalExpenses + s.totalExpenses,
        unpaidDebts: acc.unpaidDebts + s.unpaidDebts,
        cumulativeBalance: acc.cumulativeBalance + s.cumulativeBalance,
      }),
      { totalSales: 0, totalCashSales: 0, totalCreditSales: 0, totalBreadSold: 0, totalPaidToBakery: 0, totalExpenses: 0, unpaidDebts: 0, cumulativeBalance: 0 }
    );
  }, [driverSummaries]);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold" data-testid="text-page-title">رصيد المندوب التراكمي</h1>
          </div>
          <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
            <SelectTrigger className="w-[200px]" data-testid="select-driver-filter">
              <SelectValue placeholder="اختر المندوب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المندوبين</SelectItem>
              {drivers.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <p className="text-xs text-blue-600 font-medium">إجمالي المبيعات</p>
              </div>
              <p className="text-lg font-bold text-blue-700" data-testid="text-grand-total-sales">{fmt(grandTotals.totalSales)} <span className="text-xs">ر.س</span></p>
              <div className="flex gap-2 mt-1 text-[10px] text-gray-500">
                <span>نقدي: {fmt(grandTotals.totalCashSales)}</span>
                <span>آجل: {fmt(grandTotals.totalCreditSales)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                <p className="text-xs text-emerald-600 font-medium">المدفوع للمخبز</p>
              </div>
              <p className="text-lg font-bold text-emerald-700" data-testid="text-grand-total-paid">{fmt(grandTotals.totalPaidToBakery)} <span className="text-xs">ر.س</span></p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <p className="text-xs text-orange-600 font-medium">ديون غير مسددة</p>
              </div>
              <p className="text-lg font-bold text-orange-700" data-testid="text-grand-unpaid-debts">{fmt(grandTotals.unpaidDebts)} <span className="text-xs">ر.س</span></p>
            </CardContent>
          </Card>
          <Card className={grandTotals.cumulativeBalance >= 0 ? "border-indigo-200 bg-indigo-50/50" : "border-red-200 bg-red-50/50"}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className={`h-4 w-4 ${grandTotals.cumulativeBalance >= 0 ? "text-indigo-600" : "text-red-600"}`} />
                <p className={`text-xs font-medium ${grandTotals.cumulativeBalance >= 0 ? "text-indigo-600" : "text-red-600"}`}>الرصيد التراكمي</p>
              </div>
              <p className={`text-lg font-bold ${grandTotals.cumulativeBalance >= 0 ? "text-indigo-700" : "text-red-700"}`} data-testid="text-grand-cumulative-balance">
                {fmt(grandTotals.cumulativeBalance)} <span className="text-xs">ر.س</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {driverSummaries.map(summary => (
          <Card key={summary.driver.id} className="border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  {summary.driver.name}
                </CardTitle>
                <Badge variant={summary.cumulativeBalance >= 0 ? "default" : "destructive"} className="text-sm px-3" data-testid={`badge-balance-${summary.driver.id}`}>
                  {fmt(summary.cumulativeBalance)} ر.س
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-3 text-center">
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-[10px] text-blue-500">المبيعات النقدية</p>
                  <p className="text-sm font-bold text-blue-700" data-testid={`text-cash-sales-${summary.driver.id}`}>{fmt(summary.totalCashSales)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2">
                  <p className="text-[10px] text-amber-500">المبيعات الآجلة</p>
                  <p className="text-sm font-bold text-amber-700" data-testid={`text-credit-sales-${summary.driver.id}`}>{fmt(summary.totalCreditSales)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2">
                  <p className="text-[10px] text-emerald-500">المدفوع للمخبز</p>
                  <p className="text-sm font-bold text-emerald-700" data-testid={`text-paid-${summary.driver.id}`}>{fmt(summary.totalPaidToBakery)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2">
                  <p className="text-[10px] text-orange-500">ديون غير مسددة</p>
                  <p className="text-sm font-bold text-orange-700" data-testid={`text-debts-${summary.driver.id}`}>{fmt(summary.unpaidDebts)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <p className="text-[10px] text-red-500">المصروفات</p>
                  <p className="text-sm font-bold text-red-700" data-testid={`text-expenses-${summary.driver.id}`}>{fmt(summary.totalExpenses)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2">
                  <p className="text-[10px] text-purple-500">الخبز المباع</p>
                  <p className="text-sm font-bold text-purple-700" data-testid={`text-bread-sold-${summary.driver.id}`}>{summary.totalBreadSold}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setExpandedDriver(expandedDriver === summary.driver.id ? null : summary.driver.id)}
                data-testid={`btn-expand-${summary.driver.id}`}
              >
                {expandedDriver === summary.driver.id ? (
                  <><ChevronUp className="h-3 w-3 ml-1" /> إخفاء التفاصيل اليومية</>
                ) : (
                  <><ChevronDown className="h-3 w-3 ml-1" /> عرض التفاصيل اليومية</>
                )}
              </Button>

              {expandedDriver === summary.driver.id && summary.dailyRows.length > 0 && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-center text-xs font-bold whitespace-nowrap">التاريخ</TableHead>
                          <TableHead className="text-center text-xs font-bold whitespace-nowrap">الخبز المباع</TableHead>
                          <TableHead className="text-center text-xs font-bold whitespace-nowrap">نقدي</TableHead>
                          <TableHead className="text-center text-xs font-bold whitespace-nowrap">آجل</TableHead>
                          <TableHead className="text-center text-xs font-bold whitespace-nowrap">إجمالي المبيعات</TableHead>
                          <TableHead className="text-center text-xs font-bold whitespace-nowrap">المدفوع للمخبز</TableHead>
                          <TableHead className="text-center text-xs font-bold whitespace-nowrap">المصروفات</TableHead>
                          <TableHead className="text-center text-xs font-bold whitespace-nowrap">ديون غير مسددة</TableHead>
                          <TableHead className="text-center text-xs font-bold whitespace-nowrap">الرصيد التراكمي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.dailyRows.map(row => (
                          <TableRow key={row.date} className="text-sm">
                            <TableCell className="text-center whitespace-nowrap text-xs font-medium">{row.date}</TableCell>
                            <TableCell className="text-center">{row.breadSold || ""}</TableCell>
                            <TableCell className="text-center text-blue-600">{row.cashSales ? fmt(row.cashSales) : ""}</TableCell>
                            <TableCell className="text-center text-amber-600">{row.creditSales ? fmt(row.creditSales) : ""}</TableCell>
                            <TableCell className="text-center font-bold">{row.totalSales ? fmt(row.totalSales) : ""}</TableCell>
                            <TableCell className="text-center text-emerald-600">{row.paidToBakery ? fmt(row.paidToBakery) : ""}</TableCell>
                            <TableCell className="text-center text-red-600">{row.expenses ? fmt(row.expenses) : ""}</TableCell>
                            <TableCell className="text-center text-orange-600">{row.creditUnpaid ? fmt(row.creditUnpaid) : ""}</TableCell>
                            <TableCell className={`text-center font-bold ${row.cumulative >= 0 ? "text-indigo-700" : "text-red-700"}`}>
                              {fmt(row.cumulative)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {expandedDriver === summary.driver.id && summary.dailyRows.length === 0 && (
                <p className="text-center text-sm text-muted-foreground mt-3">لا توجد بيانات</p>
              )}
            </CardContent>
          </Card>
        ))}

        {driverSummaries.length === 0 && (
          <Card className="border">
            <CardContent className="p-8 text-center text-muted-foreground">
              لا يوجد مندوبين
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
