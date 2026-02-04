import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProducts, useUsers, useCustomers } from "@/hooks/useData";
import { FileText, TrendingUp, TrendingDown, Wallet, Package, ShoppingCart, AlertTriangle, CheckCircle, Banknote, CreditCard, Gift, RotateCcw, Calendar, Send, Clock, X } from "lucide-react";
import { format, isToday, parseISO, startOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const transactionTypeLabels: Record<string, { label: string; color: string }> = {
  CASH_SALE: { label: "بيع نقدي", color: "bg-green-100 text-green-700" },
  CREDIT_SALE: { label: "بيع آجل", color: "bg-blue-100 text-blue-700" },
  RETURN_GOOD: { label: "مرتجع سليم", color: "bg-amber-100 text-amber-700" },
  RETURN_DAMAGED: { label: "مرتجع تالف", color: "bg-red-100 text-red-700" },
  FREE_DISTRIBUTION: { label: "توزيع مجاني", color: "bg-purple-100 text-purple-700" },
  SAMPLE: { label: "عينة", color: "bg-pink-100 text-pink-700" },
};

export default function DriverReportPage() {
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositNotes, setDepositNotes] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: users = [] } = useUsers();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: api.getOrders,
  });

  const drivers = users.filter(u => u.role === "DRIVER");

  const { data: cashDeposits = [] } = useQuery({
    queryKey: ["driver-cash-deposits", selectedDriverId],
    queryFn: () => api.getDriverCashDeposits(selectedDriverId),
    enabled: !!selectedDriverId,
  });

  const createDepositMutation = useMutation({
    mutationFn: api.createCashDeposit,
    onSuccess: () => {
      toast({ title: "تم تقديم طلب التسليم", description: "سيتم خصم المبلغ بعد تأكيد المخبز" });
      setDepositAmount("");
      setDepositNotes("");
      queryClient.invalidateQueries({ queryKey: ["driver-cash-deposits"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تقديم طلب التسليم", variant: "destructive" });
    },
  });

  const handleSubmitDeposit = () => {
    if (!selectedDriverId || !depositAmount || parseFloat(depositAmount) <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }
    createDepositMutation.mutate({
      driverId: selectedDriverId,
      amount: parseFloat(depositAmount),
      depositDate: selectedDate,
      notes: depositNotes || undefined,
    });
  };

  const { data: transactions = [] } = useQuery({
    queryKey: ["driver-transactions", selectedDriverId],
    queryFn: () => api.getDriverTransactions(selectedDriverId),
    enabled: !!selectedDriverId,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["driver-inventory", selectedDriverId],
    queryFn: () => api.getDriverInventory(selectedDriverId),
    enabled: !!selectedDriverId,
  });

  const { data: balance } = useQuery({
    queryKey: ["driver-balance", selectedDriverId],
    queryFn: () => api.getDriverBalance(selectedDriverId),
    enabled: !!selectedDriverId,
  });

  const { data: debts = [] } = useQuery({
    queryKey: ["driver-debts", selectedDriverId],
    queryFn: () => api.getDriverCustomerDebts(selectedDriverId),
    enabled: !!selectedDriverId,
  });

  const getProductName = (productId: string) => products.find(p => p.id === productId)?.name || "غير معروف";
  const getProductPrice = (productId: string) => parseFloat(products.find(p => p.id === productId)?.price || "0");
  const getCustomerName = (customerId: string) => customers.find(c => c.id === customerId)?.name || "غير معروف";
  const getDriverName = (driverId: string) => users.find(u => u.id === driverId)?.name || "غير معروف";

  const driverOrders = orders.filter(o => {
    if (o.customerId !== selectedDriverId || o.status !== "ASSIGNED") return false;
    if (!o.date) return false;
    const orderDate = typeof o.date === 'string' ? o.date.split('T')[0] : format(new Date(o.date), "yyyy-MM-dd");
    return orderDate === selectedDate;
  });
  
  const receivedInventory = driverOrders.flatMap(order => 
    order.items?.map(item => ({
      productId: item.productId,
      quantity: item.receivedQuantity || item.quantity,
      bakeryPrice: getProductPrice(item.productId),
    })) || []
  );

  const aggregatedReceived = receivedInventory.reduce((acc, item) => {
    const existing = acc.find(a => a.productId === item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, [] as typeof receivedInventory);

  const totalReceivedValue = aggregatedReceived.reduce((sum, item) => 
    sum + (item.quantity * item.bakeryPrice), 0
  );

  const dailyTransactions = transactions.filter(t => {
    if (!t.createdAt) return false;
    const txDate = typeof t.createdAt === 'string' ? t.createdAt.split('T')[0] : format(new Date(t.createdAt), "yyyy-MM-dd");
    return txDate === selectedDate;
  });

  const cashSales = dailyTransactions.filter(t => t.type === "CASH_SALE");
  const creditSales = dailyTransactions.filter(t => t.type === "CREDIT_SALE");
  const returns = dailyTransactions.filter(t => (t.type as string) === "RETURN_GOOD" || (t.type as string) === "RETURN_DAMAGED");
  const freeDist = dailyTransactions.filter(t => t.type === "FREE_DISTRIBUTION");
  const samples = dailyTransactions.filter(t => (t.type as string) === "SAMPLE");

  const totalCashSales = cashSales.reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);
  const totalCreditSales = creditSales.reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);
  const totalReturns = returns.reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);
  const totalFreeDist = freeDist.reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);
  const totalSamples = samples.reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);

  const totalSales = totalCashSales + totalCreditSales;
  const actualCashBalance = parseFloat(balance?.cashBalance || "0");
  // Expected cash = cash sales (returns/free dist don't add cash, they reduce inventory only)
  const expectedCash = totalCashSales;
  const cashDifference = actualCashBalance - expectedCash;
  const netSales = totalSales - totalReturns - totalFreeDist - totalSamples;

  const unpaidDebts = debts.filter((d: any) => !d.isPaid);
  const totalUnpaidDebts = unpaidDebts.reduce((sum: number, d: any) => {
    const total = parseFloat(d.amount);
    const paid = parseFloat(d.paidAmount || "0");
    return sum + (total - paid);
  }, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              تقرير السائقين
            </h1>
            <p className="text-muted-foreground mt-1">
              تقرير شامل لعمليات السائق والحسابات
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-right">اختر السائق والتاريخ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label className="mb-2 block">السائق</Label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger className="w-full" data-testid="select-driver-report">
                    <SelectValue placeholder="اختر السائق لعرض التقرير" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <Label className="mb-2 block">التاريخ</Label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pr-10"
                    data-testid="input-report-date"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedDriverId && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">إجمالي المبيعات</p>
                      <p className="text-2xl font-bold text-blue-700">{totalSales.toFixed(2)} ر.س</p>
                    </div>
                    <ShoppingCart className="h-10 w-10 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">مبيعات نقدية</p>
                      <p className="text-2xl font-bold text-green-700">{totalCashSales.toFixed(2)} ر.س</p>
                    </div>
                    <Banknote className="h-10 w-10 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-600 font-medium">مبيعات آجلة</p>
                      <p className="text-2xl font-bold text-amber-700">{totalCreditSales.toFixed(2)} ر.س</p>
                    </div>
                    <CreditCard className="h-10 w-10 text-amber-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br ${cashDifference >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-red-50 to-red-100 border-red-200'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${cashDifference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        الفرق النقدي
                      </p>
                      <p className={`text-2xl font-bold ${cashDifference >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {cashDifference >= 0 ? '+' : ''}{cashDifference.toFixed(2)} ر.س
                      </p>
                    </div>
                    {cashDifference >= 0 ? (
                      <TrendingUp className="h-10 w-10 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-10 w-10 text-red-500" />
                    )}
                  </div>
                  {cashDifference < 0 && (
                    <div className="mt-2 flex items-center gap-1 text-red-600 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      <span>يوجد نقص في المبلغ!</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-right flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  العهدة المستلمة من المخبز
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aggregatedReceived.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">لا توجد عهدة مستلمة</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المنتج</TableHead>
                        <TableHead className="text-right">الكمية</TableHead>
                        <TableHead className="text-right">سعر المخبز</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aggregatedReceived.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{getProductName(item.productId)}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.bakeryPrice.toFixed(2)} ر.س</TableCell>
                          <TableCell className="font-bold">{(item.quantity * item.bakeryPrice).toFixed(2)} ر.س</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 font-bold">
                        <TableCell colSpan={3} className="text-left">إجمالي قيمة العهدة</TableCell>
                        <TableCell className="text-primary">{totalReceivedValue.toFixed(2)} ر.س</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  عمليات التوزيع اليومية
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">لا توجد عمليات لهذا اليوم</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">العميل</TableHead>
                        <TableHead className="text-right">المنتج</TableHead>
                        <TableHead className="text-right">الكمية</TableHead>
                        <TableHead className="text-right">سعر البيع</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyTransactions.map(t => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <Badge className={transactionTypeLabels[t.type]?.color || "bg-gray-100"}>
                              {transactionTypeLabels[t.type]?.label || t.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{getCustomerName(t.customerId || "")}</TableCell>
                          <TableCell>{getProductName(t.productId || "")}</TableCell>
                          <TableCell>{t.quantity}</TableCell>
                          <TableCell>{parseFloat(t.unitPrice || "0").toFixed(2)} ر.س</TableCell>
                          <TableCell className="font-bold">{parseFloat(t.totalAmount || "0").toFixed(2)} ر.س</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-right flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  حالة محفظة السائق - {getDriverName(selectedDriverId)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-700 font-medium flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        العهدة المستلمة (قيمة)
                      </span>
                      <span className="font-bold text-blue-800">{totalReceivedValue.toFixed(2)} ر.س</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700 font-medium flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        مبيعات نقدية
                      </span>
                      <span className="font-bold text-green-800">{totalCashSales.toFixed(2)} ر.س</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                      <span className="text-amber-700 font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        مبيعات آجلة
                      </span>
                      <span className="font-bold text-amber-800">{totalCreditSales.toFixed(2)} ر.س</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="text-orange-700 font-medium flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        مرتجعات
                      </span>
                      <span className="font-bold text-orange-800">{totalReturns.toFixed(2)} ر.س</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-700 font-medium flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        عينات مجانية
                      </span>
                      <span className="font-bold text-purple-800">{(totalFreeDist + totalSamples).toFixed(2)} ر.س</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg border-2 border-slate-300">
                      <span className="text-slate-700 font-bold">المبلغ الواجب تسليمه</span>
                      <span className="font-bold text-slate-800 text-lg">{expectedCash.toFixed(2)} ر.س</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border-2 border-emerald-300">
                      <span className="text-emerald-700 font-bold">المسلم فعلياً (رصيد المحفظة)</span>
                      <span className="font-bold text-emerald-800 text-lg">{actualCashBalance.toFixed(2)} ر.س</span>
                    </div>

                    <div className={`flex justify-between items-center p-4 rounded-lg border-2 ${
                      cashDifference >= 0 
                        ? 'bg-green-100 border-green-400' 
                        : 'bg-red-100 border-red-400'
                    }`}>
                      <span className={`font-bold flex items-center gap-2 ${
                        cashDifference >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {cashDifference >= 0 ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5" />
                        )}
                        الفرق {cashDifference >= 0 ? '(زيادة)' : '(نقص)'}
                      </span>
                      <span className={`font-bold text-xl ${
                        cashDifference >= 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {Math.abs(cashDifference).toFixed(2)} ر.س
                      </span>
                    </div>

                    {cashDifference < 0 && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-bold">تنبيه للمندوب!</span>
                        </div>
                        <p className="text-red-600 mt-2 text-sm">
                          يوجد نقص في المبلغ المسلم بقيمة {Math.abs(cashDifference).toFixed(2)} ر.س
                          يرجى مراجعة الحسابات والتأكد من صحة المبالغ.
                        </p>
                      </div>
                    )}

                    {totalUnpaidDebts > 0 && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-700 font-medium">ديون غير محصلة</span>
                          <span className="font-bold text-amber-800">{totalUnpaidDebts.toFixed(2)} ر.س</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  المخزون المتبقي لدى السائق
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">لا يوجد مخزون</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المنتج</TableHead>
                        <TableHead className="text-right">الكمية المتبقية</TableHead>
                        <TableHead className="text-right">القيمة (بسعر المخبز)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{getProductName(item.productId)}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="font-bold">
                            {(item.quantity * getProductPrice(item.productId)).toFixed(2)} ر.س
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
