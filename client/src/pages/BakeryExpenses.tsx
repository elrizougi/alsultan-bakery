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
import { Plus, Trash2, Edit3, Download, Receipt, Loader2, Calendar, DollarSign, TrendingUp, Settings2, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";

const colorOptions = [
  { value: "bg-blue-100 text-blue-800", label: "أزرق" },
  { value: "bg-green-100 text-green-800", label: "أخضر" },
  { value: "bg-red-100 text-red-800", label: "أحمر" },
  { value: "bg-yellow-100 text-yellow-800", label: "أصفر" },
  { value: "bg-purple-100 text-purple-800", label: "بنفسجي" },
  { value: "bg-orange-100 text-orange-800", label: "برتقالي" },
  { value: "bg-cyan-100 text-cyan-800", label: "سماوي" },
  { value: "bg-pink-100 text-pink-800", label: "وردي" },
  { value: "bg-indigo-100 text-indigo-800", label: "نيلي" },
  { value: "bg-amber-100 text-amber-800", label: "كهرماني" },
  { value: "bg-gray-100 text-gray-800", label: "رمادي" },
];

interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
}

interface BakeryExpense {
  id: string;
  categoryId: string;
  amount: string;
  description: string;
  expenseDate: string;
  createdAt: string;
  createdBy: string | null;
}

export default function BakeryExpensesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BakeryExpense | null>(null);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [expenseForm, setExpenseForm] = useState({
    categoryId: "",
    amount: "",
    description: "",
    expenseDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    color: "bg-gray-100 text-gray-800",
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ExpenseCategory[]>({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const res = await fetch("/api/expense-categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<BakeryExpense[]>({
    queryKey: ["bakery-expenses"],
    queryFn: async () => {
      const res = await fetch("/api/bakery-expenses");
      if (!res.ok) throw new Error("Failed to fetch expenses");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bakery-expenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bakery-expenses"] });
      toast({ title: "تم إضافة المصروف بنجاح" });
      resetExpenseForm();
    },
    onError: () => {
      toast({ title: "خطأ في إضافة المصروف", variant: "destructive" });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/bakery-expenses/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bakery-expenses"] });
      toast({ title: "تم تعديل المصروف بنجاح" });
      resetExpenseForm();
    },
    onError: () => {
      toast({ title: "خطأ في تعديل المصروف", variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
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

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/expense-categories", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      toast({ title: "تم إضافة البند بنجاح" });
      resetCategoryForm();
    },
    onError: (error: any) => {
      toast({ title: error.message || "خطأ في إضافة البند", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/expense-categories/${id}`, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      toast({ title: "تم تعديل البند بنجاح" });
      resetCategoryForm();
    },
    onError: (error: any) => {
      toast({ title: error.message || "خطأ في تعديل البند", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/expense-categories/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      toast({ title: "تم حذف البند" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "خطأ في حذف البند", variant: "destructive" });
    },
  });

  const resetExpenseForm = () => {
    setExpenseForm({ categoryId: "", amount: "", description: "", expenseDate: format(new Date(), 'yyyy-MM-dd') });
    setEditingExpense(null);
    setShowExpenseDialog(false);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", color: "bg-gray-100 text-gray-800" });
    setEditingCategory(null);
    setShowCategoryDialog(false);
  };

  const handleExpenseSubmit = () => {
    if (!expenseForm.categoryId || !expenseForm.amount || !expenseForm.description || !expenseForm.expenseDate) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data: expenseForm });
    } else {
      createExpenseMutation.mutate(expenseForm);
    }
  };

  const handleCategorySubmit = () => {
    if (!categoryForm.name.trim()) {
      toast({ title: "يرجى إدخال اسم البند", variant: "destructive" });
      return;
    }
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryForm });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const handleEditExpense = (expense: BakeryExpense) => {
    setEditingExpense(expense);
    setExpenseForm({
      categoryId: expense.categoryId,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate,
    });
    setShowExpenseDialog(true);
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, color: category.color });
    setShowCategoryDialog(true);
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المصروف؟")) {
      deleteExpenseMutation.mutate(id);
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا البند؟ لا يمكن الحذف إذا كانت هناك مصروفات مرتبطة.")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || "غير محدد";
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.color || "bg-gray-100 text-gray-800";
  };

  const filteredExpenses = expenses.filter(e => {
    const monthStart = startOfMonth(parseISO(filterMonth + '-01'));
    const monthEnd = endOfMonth(parseISO(filterMonth + '-01'));
    const expDate = parseISO(e.expenseDate);
    const inMonth = isWithinInterval(expDate, { start: startOfDay(monthStart), end: endOfDay(monthEnd) });
    const inCategory = filterCategory === "all" || e.categoryId === filterCategory;
    return inMonth && inCategory;
  }).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

  const categoryTotals = filteredExpenses.reduce((acc, e) => {
    acc[e.categoryId] = (acc[e.categoryId] || 0) + parseFloat(e.amount || '0');
    return acc;
  }, {} as Record<string, number>);

  const handleExportCSV = () => {
    const headers = ["التاريخ", "البند", "الوصف", "المبلغ"];
    const rows = filteredExpenses.map(e => [
      e.expenseDate,
      getCategoryName(e.categoryId),
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

  if (expensesLoading || categoriesLoading) {
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
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => { resetExpenseForm(); setShowExpenseDialog(true); }} className="gap-2" data-testid="button-add-expense" disabled={categories.length === 0}>
              <Plus className="h-4 w-4" />
              إضافة مصروف
            </Button>
            <Button onClick={() => setShowCategoryManager(!showCategoryManager)} variant="outline" className="gap-2" data-testid="button-manage-categories">
              <Settings2 className="h-4 w-4" />
              إدارة البنود
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="gap-2" data-testid="button-export-csv">
              <Download className="h-4 w-4" />
              تصدير CSV
            </Button>
          </div>
        </div>

        {showCategoryManager && (
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  إدارة بنود المصروفات
                </CardTitle>
                <Button size="sm" onClick={() => { resetCategoryForm(); setShowCategoryDialog(true); }} className="gap-2" data-testid="button-add-category">
                  <Plus className="h-4 w-4" />
                  إضافة بند
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Tag className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p>لا توجد بنود بعد. أضف بند جديد للبدء.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white" data-testid={`category-item-${cat.id}`}>
                      <Badge className={cat.color}>{cat.name}</Badge>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditCategory(cat)} data-testid={`button-edit-category-${cat.id}`}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => handleDeleteCategory(cat.id)} data-testid={`button-delete-category-${cat.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
              <CardTitle className="text-lg">توزيع المصروفات حسب البند</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(categoryTotals)
                  .sort((a, b) => b[1] - a[1])
                  .map(([catId, total]) => (
                    <div key={catId} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border">
                      <Badge className={getCategoryColor(catId)}>
                        {getCategoryName(catId)}
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
                <Label className="text-xs text-slate-500">البند</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40" data-testid="select-filter-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
                <p>{categories.length === 0 ? "أضف بنود المصروفات أولاً من زر إدارة البنود" : "لا توجد مصروفات في هذه الفترة"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-right font-bold">التاريخ</TableHead>
                      <TableHead className="text-right font-bold">البند</TableHead>
                      <TableHead className="text-right font-bold">الوصف</TableHead>
                      <TableHead className="text-right font-bold">المبلغ</TableHead>
                      <TableHead className="text-right font-bold">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{expense.expenseDate}</TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(expense.categoryId)}>
                            {getCategoryName(expense.categoryId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                        <TableCell className="font-bold text-primary">
                          {parseFloat(expense.amount).toFixed(2)} ر.س
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditExpense(expense)} data-testid={`button-edit-${expense.id}`}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(expense.id)} className="text-red-600 hover:text-red-700" data-testid={`button-delete-${expense.id}`}>
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

        <Dialog open={showExpenseDialog} onOpenChange={(open) => { if (!open) resetExpenseForm(); }}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingExpense ? "تعديل مصروف" : "إضافة مصروف جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>البند *</Label>
                <Select value={expenseForm.categoryId} onValueChange={(v) => setExpenseForm(prev => ({ ...prev, categoryId: v }))}>
                  <SelectTrigger data-testid="select-expense-category">
                    <SelectValue placeholder="اختر البند" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span className={`inline-block w-3 h-3 rounded-full ${cat.color.split(' ')[0]}`} />
                          {cat.name}
                        </span>
                      </SelectItem>
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
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  data-testid="input-expense-amount"
                />
              </div>
              <div>
                <Label>الوصف *</Label>
                <Input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف المصروف"
                  data-testid="input-expense-description"
                />
              </div>
              <div>
                <Label>التاريخ *</Label>
                <Input
                  type="date"
                  value={expenseForm.expenseDate}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, expenseDate: e.target.value }))}
                  data-testid="input-expense-date"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetExpenseForm} data-testid="button-cancel-expense">إلغاء</Button>
              <Button
                onClick={handleExpenseSubmit}
                disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                data-testid="button-submit-expense"
              >
                {(createExpenseMutation.isPending || updateExpenseMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {editingExpense ? "تعديل" : "إضافة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCategoryDialog} onOpenChange={(open) => { if (!open) resetCategoryForm(); }}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "تعديل بند" : "إضافة بند جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم البند *</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: إيجار، كهرباء، رواتب..."
                  data-testid="input-category-name"
                />
              </div>
              <div>
                <Label>اللون</Label>
                <Select value={categoryForm.color} onValueChange={(v) => setCategoryForm(prev => ({ ...prev, color: v }))}>
                  <SelectTrigger data-testid="select-category-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${opt.value}`}>{opt.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2">
                  <Badge className={categoryForm.color}>{categoryForm.name || "معاينة"}</Badge>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetCategoryForm} data-testid="button-cancel-category">إلغاء</Button>
              <Button
                onClick={handleCategorySubmit}
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                data-testid="button-submit-category"
              >
                {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {editingCategory ? "تعديل" : "إضافة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
