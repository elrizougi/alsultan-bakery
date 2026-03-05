import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit3, Download, Receipt, Loader2, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";

const categoryLabels: Record<string, { label: string; color: string }> = {
  RENT: { label: "إيجار", color: "bg-blue-100 text-blue-800" },
  ELECTRICITY: { label: "كهرباء", color: "bg-yellow-100 text-yellow-800" },
  WATER: { label: "مياه", color: "bg-cyan-100 text-cyan-800" },
  GAS: { label: "غاز", color: "bg-orange-100 text-orange-800" },
  SALARIES: { label: "رواتب", color: "bg-purple-100 text-purple-800" },
  MAINTENANCE: { label: "صيانة", color: "bg-red-100 text-red-800" },
  SUPPLIES: { label: "مستلزمات", color: "bg-green-100 text-green-800" },
  FUEL: { label: "وقود", color: "bg-amber-100 text-amber-800" },
  INSURANCE: { label: "تأمين", color: "bg-indigo-100 text-indigo-800" },
  OTHER: { label: "أخرى", color: "bg-gray-100 text-gray-800" },
};

interface BakeryExpense {
  id: string;
  category: string;
  amount: string;
  description: string;
  expenseDate: string;
  createdAt: string;
  createdBy: string | null;
}

export default function BakeryExpensesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BakeryExpense | null>(null);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [formData, setFormData] = useState({
    category: "OTHER" as string,
    amount: "",
    description: "",
    expenseDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: expenses = [], isLoading } = useQuery<BakeryExpense[]>({
    queryKey: ["bakery-expenses"],
    queryFn: async () => {
      const res = await fetch("/api/bakery-expenses");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bakery-expenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bakery-expenses"] });
      toast({ title: "تم إضافة المصروف بنجاح" });
      resetForm();
    },
    onError: () => {
      toast({ title: "خطأ في إضافة المصروف", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/bakery-expenses/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bakery-expenses"] });
      toast({ title: "تم تعديل المصروف بنجاح" });
      resetForm();
    },
    onError: () => {
      toast({ title: "خطأ في تعديل المصروف", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/bakery-expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bakery-expenses"] });
      toast({ title: "تم حذف المصروف" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف المصروف", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      category: "OTHER",
      amount: "",
      description: "",
      expenseDate: format(new Date(), 'yyyy-MM-dd'),
    });
    setEditingExpense(null);
    setShowDialog(false);
  };

  const handleSubmit = () => {
    if (!formData.amount || !formData.description || !formData.expenseDate) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (expense: BakeryExpense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate,
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المصروف؟")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const monthStart = startOfMonth(parseISO(filterMonth + '-01'));
    const monthEnd = endOfMonth(parseISO(filterMonth + '-01'));
    const expDate = parseISO(e.expenseDate);
    const inMonth = isWithinInterval(expDate, { start: startOfDay(monthStart), end: endOfDay(monthEnd) });
    const inCategory = filterCategory === "all" || e.category === filterCategory;
    return inMonth && inCategory;
  }).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

  const categoryTotals = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount || '0');
    return acc;
  }, {} as Record<string, number>);

  const handleExportCSV = () => {
    const headers = ["التاريخ", "التصنيف", "الوصف", "المبلغ"];
    const rows = filteredExpenses.map(e => [
      e.expenseDate,
      categoryLabels[e.category]?.label || e.category,
      e.description,
      parseFloat(e.amount).toFixed(2),
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `مصروفات_المخبز_${filterMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800" data-testid="text-page-title">مصروفات المخبز</h1>
            <p className="text-sm text-muted-foreground">إدارة وتتبع جميع مصروفات المخبز</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => { resetForm(); setShowDialog(true); }} className="gap-2" data-testid="button-add-expense">
              <Plus className="h-4 w-4" />
              إضافة مصروف
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="gap-2" data-testid="button-export-csv">
              <Download className="h-4 w-4" />
              تصدير CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                  <p className="text-xl font-bold text-primary" data-testid="text-total-expenses">{totalAmount.toFixed(2)} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">عدد المصروفات</p>
                  <p className="text-xl font-bold" data-testid="text-expense-count">{filteredExpenses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">متوسط المصروف</p>
                  <p className="text-xl font-bold" data-testid="text-avg-expense">
                    {filteredExpenses.length > 0 ? (totalAmount / filteredExpenses.length).toFixed(2) : '0.00'} ر.س
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الشهر</p>
                  <p className="text-xl font-bold" data-testid="text-current-month">
                    {format(parseISO(filterMonth + '-01'), 'MMMM yyyy', { locale: ar })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {Object.keys(categoryTotals).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">توزيع المصروفات حسب التصنيف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(categoryTotals)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, total]) => (
                    <div key={cat} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border">
                      <Badge className={categoryLabels[cat]?.color || "bg-gray-100 text-gray-800"}>
                        {categoryLabels[cat]?.label || cat}
                      </Badge>
                      <span className="font-bold text-sm">{total.toFixed(2)} ر.س</span>
                      <span className="text-xs text-muted-foreground">
                        ({((total / totalAmount) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">الشهر</Label>
                <Input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-44"
                  data-testid="input-filter-month"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">التصنيف</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40" data-testid="select-filter-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {Object.entries(categoryLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>لا توجد مصروفات في هذه الفترة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-right font-bold">التاريخ</TableHead>
                      <TableHead className="text-right font-bold">التصنيف</TableHead>
                      <TableHead className="text-right font-bold">الوصف</TableHead>
                      <TableHead className="text-right font-bold">المبلغ</TableHead>
                      <TableHead className="text-right font-bold">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`} className="hover:bg-slate-50">
                        <TableCell className="font-medium">
                          {expense.expenseDate}
                        </TableCell>
                        <TableCell>
                          <Badge className={categoryLabels[expense.category]?.color || "bg-gray-100 text-gray-800"}>
                            {categoryLabels[expense.category]?.label || expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                        <TableCell className="font-bold text-primary">
                          {parseFloat(expense.amount).toFixed(2)} ر.س
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(expense)}
                              data-testid={`button-edit-${expense.id}`}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-${expense.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-100 font-bold">
                      <TableCell colSpan={3} className="text-right font-bold">المجموع</TableCell>
                      <TableCell className="font-bold text-primary">{totalAmount.toFixed(2)} ر.س</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingExpense ? "تعديل مصروف" : "إضافة مصروف جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>التصنيف *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger data-testid="select-expense-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المبلغ (ر.س) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  data-testid="input-expense-amount"
                />
              </div>
              <div>
                <Label>الوصف *</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف المصروف"
                  data-testid="input-expense-description"
                />
              </div>
              <div>
                <Label>التاريخ *</Label>
                <Input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                  data-testid="input-expense-date"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel">إلغاء</Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-expense"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {editingExpense ? "تعديل" : "إضافة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
