import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, useMemo, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Vault, ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp, Printer } from "lucide-react";

type User = { id: string; name: string; role: string };
type CashDeposit = { id: string; driverId: string; amount: string; depositDate: string; status: string; confirmedBy: string | null };
type BakeryExpense = { id: string; categoryId: string; amount: string; description: string; expenseDate: string; receiptImage: string | null };
type ExpenseCategory = { id: string; name: string };
type Transaction = { id: string; driverId: string; type: string; quantity: number; totalAmount: string; createdAt: string; notes: string };

export default function BakeryCashVaultPage() {
  const [dateFrom, setDateFrom] = useState(() => format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [filterType, setFilterType] = useState<string>("all");

  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: deposits = [] } = useQuery<CashDeposit[]>({ queryKey: ["/api/cash-deposits"] });
  const { data: bakeryExpenses = [] } = useQuery<BakeryExpense[]>({ queryKey: ["/api/bakery-expenses"] });
  const { data: categories = [] } = useQuery<ExpenseCategory[]>({ queryKey: ["/api/expense-categories"] });
  const { data: allTransactions = [] } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });

  const drivers = useMemo(() => users.filter(u => u.role === "DRIVER"), [users]);
  const getDriverName = (id: string) => drivers.find(d => d.id === id)?.name || "غير معروف";
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || "غير مصنف";
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const entries = useMemo(() => {
    const items: Array<{
      id: string;
      date: string;
      type: "income" | "expense";
      category: string;
      description: string;
      amount: number;
      source: string;
    }> = [];

    deposits
      .filter(d => d.status === "CONFIRMED")
      .forEach(d => {
        items.push({
          id: `dep-${d.id}`,
          date: d.depositDate,
          type: "income",
          category: "تسليم مبالغ",
          description: `تسليم من ${getDriverName(d.driverId)}`,
          amount: parseFloat(d.amount || "0"),
          source: "driver_deposit",
        });
      });

    bakeryExpenses.forEach(e => {
      items.push({
        id: `bexp-${e.id}`,
        date: e.expenseDate,
        type: "expense",
        category: getCategoryName(e.categoryId),
        description: e.description || getCategoryName(e.categoryId),
        amount: parseFloat(e.amount || "0"),
        source: "bakery_expense",
      });
    });

    allTransactions
      .filter(t => t.type === "EXPENSE")
      .forEach(t => {
        const date = t.createdAt ? format(new Date(t.createdAt), "yyyy-MM-dd") : "";
        items.push({
          id: `dexp-${t.id}`,
          date,
          type: "expense",
          category: "مصروفات مندوب",
          description: `${getDriverName(t.driverId)}${t.notes ? " - " + t.notes : ""}`,
          amount: parseFloat(t.totalAmount || "0"),
          source: "driver_expense",
        });
      });

    return items
      .filter(item => item.date >= dateFrom && item.date <= dateTo)
      .filter(item => {
        if (filterType === "all") return true;
        if (filterType === "income") return item.type === "income";
        if (filterType === "expense") return item.type === "expense";
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [deposits, bakeryExpenses, allTransactions, dateFrom, dateTo, filterType, drivers, categories]);

  const totalIncome = useMemo(() => entries.filter(e => e.type === "income").reduce((sum, e) => sum + e.amount, 0), [entries]);
  const totalExpense = useMemo(() => entries.filter(e => e.type === "expense").reduce((sum, e) => sum + e.amount, 0), [entries]);
  const netBalance = totalIncome - totalExpense;

  const allTimeEntries = useMemo(() => {
    const items: Array<{ type: "income" | "expense"; amount: number }> = [];

    deposits.filter(d => d.status === "CONFIRMED").forEach(d => {
      items.push({ type: "income", amount: parseFloat(d.amount || "0") });
    });
    bakeryExpenses.forEach(e => {
      items.push({ type: "expense", amount: parseFloat(e.amount || "0") });
    });
    allTransactions.filter(t => t.type === "EXPENSE").forEach(t => {
      items.push({ type: "expense", amount: parseFloat(t.totalAmount || "0") });
    });

    return items;
  }, [deposits, bakeryExpenses, allTransactions]);

  const allTimeIncome = useMemo(() => allTimeEntries.filter(e => e.type === "income").reduce((sum, e) => sum + e.amount, 0), [allTimeEntries]);
  const allTimeExpense = useMemo(() => allTimeEntries.filter(e => e.type === "expense").reduce((sum, e) => sum + e.amount, 0), [allTimeEntries]);
  const allTimeBalance = allTimeIncome - allTimeExpense;

  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>جرد الخزنة</title>
<style>
@page { size: A4; margin: 10mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; font-size: 11px; color: #111; }
.print-title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 4px; }
.print-date { text-align: center; font-size: 10px; color: #666; margin-bottom: 10px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
.summary-card { border: 1px solid #ddd; border-radius: 6px; padding: 6px 8px; text-align: center; }
.summary-card .label { font-size: 9px; color: #666; margin-bottom: 2px; }
.summary-card .value { font-size: 13px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; font-size: 10px; }
th { background: #f8fafc; font-weight: bold; padding: 5px 4px; border: 1px solid #d1d5db; text-align: center; white-space: nowrap; }
td { padding: 4px; border: 1px solid #d1d5db; text-align: center; }
.text-green { color: #047857; }
.text-red { color: #b91c1c; }
.text-blue { color: #1d4ed8; }
.text-bold { font-weight: bold; }
.totals-row { background: #f1f5f9; font-weight: bold; }
</style>
</head>
<body>
<div class="print-title">جرد الخزنة</div>
<div class="print-date">من ${dateFrom} إلى ${dateTo}</div>
<div class="summary-grid">
  <div class="summary-card"><div class="label">إجمالي الوارد</div><div class="value text-green">${fmt(totalIncome)} ر.س</div></div>
  <div class="summary-card"><div class="label">إجمالي المنصرف</div><div class="value text-red">${fmt(totalExpense)} ر.س</div></div>
  <div class="summary-card"><div class="label">صافي الفترة</div><div class="value ${netBalance >= 0 ? 'text-green' : 'text-red'}">${fmt(netBalance)} ر.س</div></div>
  <div class="summary-card"><div class="label">رصيد الخزنة الكلي</div><div class="value ${allTimeBalance >= 0 ? 'text-blue' : 'text-red'}">${fmt(allTimeBalance)} ر.س</div></div>
</div>
<table>
  <thead><tr><th>م</th><th>التاريخ</th><th>النوع</th><th>التصنيف</th><th>البيان</th><th>وارد</th><th>منصرف</th></tr></thead>
  <tbody>
${entries.map((e, i) => `<tr>
  <td>${i + 1}</td>
  <td>${e.date}</td>
  <td class="${e.type === 'income' ? 'text-green' : 'text-red'}">${e.type === 'income' ? 'وارد' : 'منصرف'}</td>
  <td>${e.category}</td>
  <td>${e.description}</td>
  <td class="text-green">${e.type === 'income' ? fmt(e.amount) : ''}</td>
  <td class="text-red">${e.type === 'expense' ? fmt(e.amount) : ''}</td>
</tr>`).join('')}
  <tr class="totals-row">
    <td colspan="5">المجموع</td>
    <td class="text-green">${fmt(totalIncome)}</td>
    <td class="text-red">${fmt(totalExpense)}</td>
  </tr>
  </tbody>
</table>
</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  }, [entries, dateFrom, dateTo, totalIncome, totalExpense, netBalance, allTimeBalance]);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Vault className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold" data-testid="text-page-title">جرد الخزنة</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint} data-testid="btn-print">
            <Printer className="h-4 w-4 ml-1" />
            طباعة
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" data-testid="input-date-from" />
          </div>
          <div>
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" data-testid="input-date-to" />
          </div>
          <div>
            <Label className="text-xs">النوع</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="income">الوارد فقط</SelectItem>
                <SelectItem value="expense">المنصرف فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                <p className="text-xs text-emerald-600 font-medium">إجمالي الوارد</p>
              </div>
              <p className="text-lg font-bold text-emerald-700" data-testid="text-total-income">{fmt(totalIncome)} <span className="text-xs">ر.س</span></p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpCircle className="h-4 w-4 text-red-600" />
                <p className="text-xs text-red-600 font-medium">إجمالي المنصرف</p>
              </div>
              <p className="text-lg font-bold text-red-700" data-testid="text-total-expense">{fmt(totalExpense)} <span className="text-xs">ر.س</span></p>
            </CardContent>
          </Card>
          <Card className={netBalance >= 0 ? "border-blue-200 bg-blue-50/50" : "border-orange-200 bg-orange-50/50"}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className={`h-4 w-4 ${netBalance >= 0 ? "text-blue-600" : "text-orange-600"}`} />
                <p className={`text-xs font-medium ${netBalance >= 0 ? "text-blue-600" : "text-orange-600"}`}>صافي الفترة</p>
              </div>
              <p className={`text-lg font-bold ${netBalance >= 0 ? "text-blue-700" : "text-orange-700"}`} data-testid="text-net-balance">{fmt(netBalance)} <span className="text-xs">ر.س</span></p>
            </CardContent>
          </Card>
          <Card className={allTimeBalance >= 0 ? "border-indigo-200 bg-indigo-50/50" : "border-red-200 bg-red-50/50"}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className={`h-4 w-4 ${allTimeBalance >= 0 ? "text-indigo-600" : "text-red-600"}`} />
                <p className={`text-xs font-medium ${allTimeBalance >= 0 ? "text-indigo-600" : "text-red-600"}`}>رصيد الخزنة الكلي</p>
              </div>
              <p className={`text-lg font-bold ${allTimeBalance >= 0 ? "text-indigo-700" : "text-red-700"}`} data-testid="text-all-time-balance">{fmt(allTimeBalance)} <span className="text-xs">ر.س</span></p>
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">سجل الحركات ({entries.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {entries.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-center text-xs font-bold w-10">م</TableHead>
                        <TableHead className="text-center text-xs font-bold whitespace-nowrap">التاريخ</TableHead>
                        <TableHead className="text-center text-xs font-bold whitespace-nowrap">النوع</TableHead>
                        <TableHead className="text-center text-xs font-bold whitespace-nowrap">التصنيف</TableHead>
                        <TableHead className="text-center text-xs font-bold">البيان</TableHead>
                        <TableHead className="text-center text-xs font-bold whitespace-nowrap">وارد</TableHead>
                        <TableHead className="text-center text-xs font-bold whitespace-nowrap">منصرف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry, i) => (
                        <TableRow key={entry.id} className="text-sm">
                          <TableCell className="text-center text-xs">{i + 1}</TableCell>
                          <TableCell className="text-center text-xs whitespace-nowrap">{entry.date}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={entry.type === "income" ? "default" : "destructive"} className="text-[10px]">
                              {entry.type === "income" ? "وارد" : "منصرف"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs">{entry.category}</TableCell>
                          <TableCell className="text-right text-xs">{entry.description}</TableCell>
                          <TableCell className="text-center text-emerald-600 font-medium">
                            {entry.type === "income" ? fmt(entry.amount) : ""}
                          </TableCell>
                          <TableCell className="text-center text-red-600 font-medium">
                            {entry.type === "expense" ? fmt(entry.amount) : ""}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-100 font-bold">
                        <TableCell colSpan={5} className="text-center text-sm">المجموع</TableCell>
                        <TableCell className="text-center text-emerald-700">{fmt(totalIncome)}</TableCell>
                        <TableCell className="text-center text-red-700">{fmt(totalExpense)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد حركات في الفترة المحددة</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
