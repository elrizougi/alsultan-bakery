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
  EXPENSE: { label: "مصروفات", color: "bg-orange-100 text-orange-700" },
};

export default function DriverReportPage() {
  const [selectedDriverId, setSelectedDriverId] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
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

  const { data: allCashDeposits = [] } = useQuery({
    queryKey: ["all-cash-deposits"],
    queryFn: async () => {
      const allDeposits: any[] = [];
      for (const driver of drivers) {
        const deposits = await api.getDriverCashDeposits(driver.id);
        allDeposits.push(...deposits);
      }
      return allDeposits;
    },
    enabled: drivers.length > 0,
  });

  const { data: singleDriverDeposits = [] } = useQuery({
    queryKey: ["driver-cash-deposits", selectedDriverId],
    queryFn: () => api.getDriverCashDeposits(selectedDriverId),
    enabled: selectedDriverId !== "all" && !!selectedDriverId,
  });

  const cashDeposits = selectedDriverId === "all" ? allCashDeposits : singleDriverDeposits;

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
      depositDate: format(new Date(), "yyyy-MM-dd"),
      notes: depositNotes || undefined,
    });
  };

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["all-driver-transactions"],
    queryFn: async () => {
      const allTx: any[] = [];
      for (const driver of drivers) {
        const tx = await api.getDriverTransactions(driver.id);
        allTx.push(...tx);
      }
      return allTx;
    },
    enabled: drivers.length > 0,
  });

  const { data: singleDriverTransactions = [] } = useQuery({
    queryKey: ["driver-transactions", selectedDriverId],
    queryFn: () => api.getDriverTransactions(selectedDriverId),
    enabled: selectedDriverId !== "all" && !!selectedDriverId,
  });

  const transactions = selectedDriverId === "all" ? allTransactions : singleDriverTransactions;

  const { data: allInventory = [] } = useQuery({
    queryKey: ["all-driver-inventory"],
    queryFn: async () => {
      const allInv: any[] = [];
      for (const driver of drivers) {
        const inv = await api.getDriverInventory(driver.id);
        allInv.push(...inv);
      }
      return allInv;
    },
    enabled: drivers.length > 0,
  });

  const { data: singleDriverInventory = [] } = useQuery({
    queryKey: ["driver-inventory", selectedDriverId],
    queryFn: () => api.getDriverInventory(selectedDriverId),
    enabled: selectedDriverId !== "all" && !!selectedDriverId,
  });

  const inventory = selectedDriverId === "all" ? allInventory : singleDriverInventory;

  const { data: allBalances = [] } = useQuery({
    queryKey: ["all-driver-balances"],
    queryFn: async () => {
      const balances: any[] = [];
      for (const driver of drivers) {
        const bal = await api.getDriverBalance(driver.id);
        if (bal) balances.push(bal);
      }
      return balances;
    },
    enabled: drivers.length > 0,
  });

  const { data: singleDriverBalance } = useQuery({
    queryKey: ["driver-balance", selectedDriverId],
    queryFn: () => api.getDriverBalance(selectedDriverId),
    enabled: selectedDriverId !== "all" && !!selectedDriverId,
  });

  const balance = selectedDriverId === "all" 
    ? { cashBalance: allBalances.reduce((sum, b) => sum + parseFloat(b?.cashBalance || "0"), 0).toString() }
    : singleDriverBalance;

  const { data: allDebts = [] } = useQuery({
    queryKey: ["all-driver-debts"],
    queryFn: async () => {
      const debtsArr: any[] = [];
      for (const driver of drivers) {
        const d = await api.getDriverCustomerDebts(driver.id);
        debtsArr.push(...d);
      }
      return debtsArr;
    },
    enabled: drivers.length > 0,
  });

  const { data: singleDriverDebts = [] } = useQuery({
    queryKey: ["driver-debts", selectedDriverId],
    queryFn: () => api.getDriverCustomerDebts(selectedDriverId),
    enabled: selectedDriverId !== "all" && !!selectedDriverId,
  });

  const debts = selectedDriverId === "all" ? allDebts : singleDriverDebts;

  const getProductName = (productId: string) => products.find(p => p.id === productId)?.name || "غير معروف";
  const getProductPrice = (productId: string) => parseFloat(products.find(p => p.id === productId)?.price || "0");
  const getCustomerName = (customerId: string) => customers.find(c => c.id === customerId)?.name || "غير معروف";
  const getDriverName = (driverId: string) => {
    if (driverId === "all") return "جميع المناديب";
    return users.find(u => u.id === driverId)?.name || "غير معروف";
  };

  const isDateInRange = (dateStr: string) => {
    const date = dateStr.split('T')[0];
    return date >= startDate && date <= endDate;
  };

  const driverOrders = orders.filter(o => {
    if (selectedDriverId !== "all" && o.customerId !== selectedDriverId) return false;
    if (selectedDriverId === "all" && !drivers.some(d => d.id === o.customerId)) return false;
    if (!["ASSIGNED", "DELIVERED", "CLOSED"].includes(o.status)) return false;
    if (!o.date) return false;
    return isDateInRange(o.date);
  });
  
  // العهدة المستلمة من المخبز - من مخزون السائق الفعلي
  type ReceivedItem = { productId: string; quantity: number; bakeryPrice: number };
  const aggregatedReceived = inventory.reduce((acc: ReceivedItem[], item) => {
    const existing = acc.find((a: ReceivedItem) => a.productId === item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      acc.push({ 
        productId: item.productId, 
        quantity: item.quantity, 
        bakeryPrice: getProductPrice(item.productId) 
      });
    }
    return acc;
  }, [] as ReceivedItem[]);

  const totalReceivedValue = aggregatedReceived.reduce((sum: number, item: ReceivedItem) => 
    sum + (item.quantity * item.bakeryPrice), 0
  );

  const dailyTransactions = transactions.filter(t => {
    if (!t.createdAt) return false;
    return isDateInRange(t.createdAt);
  });

  const cashSales = dailyTransactions.filter(t => t.type === "CASH_SALE");
  const creditSales = dailyTransactions.filter(t => t.type === "CREDIT_SALE");
  const returns = dailyTransactions.filter(t => t.type === "RETURN");
  const damaged = dailyTransactions.filter(t => t.type === "DAMAGED");
  const freeDist = dailyTransactions.filter(t => t.type === "FREE_DISTRIBUTION");
  const samples = dailyTransactions.filter(t => t.type === "FREE_SAMPLE");

  const totalCashSales = cashSales.reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);
  const totalCreditSales = creditSales.reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);
  const totalReturns = returns.reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);
  const totalFreeDist = freeDist.reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);
  const totalSamples = samples.reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);

  const totalReceivedQty = aggregatedReceived.reduce((sum: number, item: ReceivedItem) => sum + item.quantity, 0);
  const returnedQty = returns.reduce((sum, t) => sum + t.quantity, 0);
  const damagedQty = damaged.reduce((sum, t) => sum + t.quantity, 0);
  const samplesQty = samples.reduce((sum, t) => sum + t.quantity, 0);
  const freeDistQty = freeDist.reduce((sum, t) => sum + t.quantity, 0);
  const soldQty = cashSales.reduce((sum, t) => sum + t.quantity, 0) + creditSales.reduce((sum, t) => sum + t.quantity, 0);
  const remainingInventoryQty = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const breadDifference = totalReceivedQty - soldQty - returnedQty - damagedQty - samplesQty - freeDistQty;

  const uniqueCustomers = new Set(dailyTransactions
    .filter(t => t.type === "CASH_SALE" || t.type === "CREDIT_SALE")
    .map(t => t.customerId)
    .filter(Boolean)
  );
  const customerCount = uniqueCustomers.size;

  const nonPackagedSales = dailyTransactions.filter(t => {
    if (t.type !== "CASH_SALE" && t.type !== "CREDIT_SALE") return false;
    const product = products.find(p => p.id === t.productId);
    return product && !product.name?.includes("مغلف");
  });
  const avgSellingPrice = nonPackagedSales.length > 0
    ? nonPackagedSales.reduce((sum, t) => sum + parseFloat(t.unitPrice || "0"), 0) / nonPackagedSales.length
    : 0;

  const totalDeposits = cashDeposits
    .filter((d: any) => d.status === 'CONFIRMED')
    .reduce((sum: number, d: any) => sum + parseFloat(d.amount), 0);

  const totalSales = totalCashSales + totalCreditSales;
  const actualCashBalance = parseFloat(balance?.cashBalance || "0");
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
              تقرير المناديب
            </h1>
            <p className="text-muted-foreground mt-1">
              تقرير شامل لعمليات المندوب والحسابات
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-right">اختر المندوب والفترة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="mb-2 block">المندوب</Label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger className="w-full" data-testid="select-driver-report">
                    <SelectValue placeholder="اختر المندوب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المناديب</SelectItem>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">من تاريخ</Label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pr-10"
                    data-testid="input-start-date"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">إلى تاريخ</Label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pr-10"
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {(selectedDriverId === "all" || selectedDriverId) && (
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
                      {aggregatedReceived.map((item: ReceivedItem, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{getProductName(item.productId)}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.bakeryPrice.toFixed(2)} ر.س</TableCell>
                          <TableCell className="font-bold">{(item.quantity * item.bakeryPrice).toFixed(2)} ر.س</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 font-bold">
                        <TableCell className="text-right">إجمالي أعداد الخبز</TableCell>
                        <TableCell className="text-primary">{totalReceivedQty}</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow className="bg-orange-50 font-bold">
                        <TableCell className="text-right text-orange-700">الخبز الحالي</TableCell>
                        <TableCell className="text-orange-800">{remainingInventoryQty}</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-right flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  حالة محفظة المندوب - {getDriverName(selectedDriverId)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      تتبع أعداد الخبز
                    </h4>
                    
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700 font-medium flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        الكمية المستلمة
                      </span>
                      <span className="font-bold text-green-800 text-lg">{totalReceivedQty}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="text-orange-700 font-medium flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        مرتجع
                      </span>
                      <span className="font-bold text-orange-800 text-lg">{returnedQty}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        خبز تالف
                      </span>
                      <span className="font-bold text-gray-800 text-lg">{damagedQty}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-pink-50 rounded-lg">
                      <span className="text-pink-700 font-medium flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        عينات
                      </span>
                      <span className="font-bold text-pink-800 text-lg">{samplesQty}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-700 font-medium flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        توزيع مجاني
                      </span>
                      <span className="font-bold text-purple-800 text-lg">{freeDistQty}</span>
                    </div>

                    <div className={`flex justify-between items-center p-4 rounded-lg border-2 ${
                      breadDifference === 0 
                        ? 'bg-green-100 border-green-400' 
                        : 'bg-red-100 border-red-400'
                    }`}>
                      <span className={`font-bold flex items-center gap-2 ${
                        breadDifference === 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {breadDifference === 0 ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5" />
                        )}
                        الفرق في الخبز
                      </span>
                      <span className={`font-bold text-xl ${
                        breadDifference === 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {breadDifference}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <span className="text-orange-700 font-medium flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        المخزون المتبقي
                      </span>
                      <span className="font-bold text-orange-800 text-lg">{remainingInventoryQty}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      المعلومات المالية
                    </h4>

                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-700 font-medium flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        عدد العملاء
                      </span>
                      <span className="font-bold text-blue-800 text-lg">{customerCount}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                      <span className="text-indigo-700 font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        متوسط سعر البيع
                      </span>
                      <span className="font-bold text-indigo-800 text-lg">{avgSellingPrice.toFixed(2)} ر.س</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border-2 border-emerald-300">
                      <span className="text-emerald-700 font-bold flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        رصيد المحفظة
                      </span>
                      <span className="font-bold text-emerald-800 text-lg">{actualCashBalance.toFixed(2)} ر.س</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="text-amber-700 font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        ديون غير محصلة
                      </span>
                      <span className="font-bold text-amber-800 text-lg">{totalUnpaidDebts.toFixed(2)} ر.س</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg border-2 border-slate-300">
                      <span className="text-slate-700 font-bold flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        المبالغ المسلمة للمخبز
                      </span>
                      <span className="font-bold text-slate-800 text-lg">{totalDeposits.toFixed(2)} ر.س</span>
                    </div>

                    {breadDifference !== 0 && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-bold">تنبيه!</span>
                        </div>
                        <p className="text-red-600 mt-2 text-sm">
                          يوجد فرق في أعداد الخبز ({Math.abs(breadDifference)}) يرجى المراجعة.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-right flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  الخبز الحالي
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
