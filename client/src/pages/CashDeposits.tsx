import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, CashDeposit } from "@/lib/api";
import { useUsers, useProducts } from "@/hooks/useData";
import { useStore } from "@/lib/store";
import { Send, Check, X, Clock, Plus, FileText, User, Package, DollarSign, Undo2, Gift, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function CashDepositsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useStore(state => state.user);
  const { data: users = [] } = useUsers();
  const { data: products = [] } = useProducts();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositNotes, setDepositNotes] = useState<string>("");
  const [depositDate, setDepositDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  const [settlementDriverId, setSettlementDriverId] = useState<string>("");
  const [showSettlement, setShowSettlement] = useState(false);

  const [filterDate, setFilterDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [filterDriverId, setFilterDriverId] = useState<string>("");
  
  const [isSettlementDepositOpen, setIsSettlementDepositOpen] = useState(false);
  const [settlementDepositAmount, setSettlementDepositAmount] = useState<string>("");
  const [settlementDepositNotes, setSettlementDepositNotes] = useState<string>("");

  const drivers = users.filter(u => u.role === "DRIVER");

  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ["/api/cash-deposits"],
    queryFn: api.getCashDeposits,
  });

  const { data: settlementTransactions = [], isLoading: settlementLoading } = useQuery({
    queryKey: ["driver-transactions", settlementDriverId],
    queryFn: () => api.getDriverTransactions(settlementDriverId),
    enabled: !!settlementDriverId && showSettlement,
  });

  const { data: settlementDebts = [] } = useQuery({
    queryKey: ["driver-debts", settlementDriverId],
    queryFn: () => api.getDriverCustomerDebts(settlementDriverId),
    enabled: !!settlementDriverId && showSettlement,
  });

  const { data: settlementBalance } = useQuery({
    queryKey: ["driver-balance", settlementDriverId],
    queryFn: () => api.getDriverBalance(settlementDriverId),
    enabled: !!settlementDriverId && showSettlement,
  });

  const createDepositMutation = useMutation({
    mutationFn: api.createCashDeposit,
    onSuccess: () => {
      toast({ title: "تم إضافة عملية التسليم", description: "تم تسجيل استلام المبلغ بنجاح" });
      setSelectedDriverId("");
      setDepositAmount("");
      setDepositNotes("");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cash-deposits"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في إضافة عملية التسليم", variant: "destructive" });
    },
  });

  const handleCreateDeposit = () => {
    if (!selectedDriverId || !depositAmount || parseFloat(depositAmount) <= 0) {
      toast({ title: "خطأ", description: "يرجى اختيار المندوب وإدخال مبلغ صحيح", variant: "destructive" });
      return;
    }
    createDepositMutation.mutate({
      driverId: selectedDriverId,
      amount: parseFloat(depositAmount),
      depositDate,
      notes: depositNotes || undefined,
    });
  };

  const confirmMutation = useMutation({
    mutationFn: ({ id, confirmedBy }: { id: string; confirmedBy: string }) => 
      api.confirmCashDeposit(id, confirmedBy),
    onSuccess: () => {
      toast({ title: "تم التأكيد", description: "تم تأكيد تسليم المبلغ وخصمه من عهدة المندوب" });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["driver-balance"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تأكيد التسليم", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, confirmedBy }: { id: string; confirmedBy: string }) => 
      api.rejectCashDeposit(id, confirmedBy),
    onSuccess: () => {
      toast({ title: "تم الرفض", description: "تم رفض طلب التسليم" });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-deposits"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في رفض التسليم", variant: "destructive" });
    },
  });

  const settlementDepositMutation = useMutation({
    mutationFn: async (data: { driverId: string; amount: number; notes?: string }) => {
      const deposit = await api.createCashDeposit({
        driverId: data.driverId,
        amount: data.amount,
        depositDate: format(new Date(), "yyyy-MM-dd"),
        notes: data.notes,
      });
      if (user?.id) {
        await api.confirmCashDeposit(deposit.id, user.id);
      }
      return deposit;
    },
    onSuccess: () => {
      toast({ title: "تم الاستلام", description: "تم استلام المبلغ وخصمه من حساب المندوب" });
      setIsSettlementDepositOpen(false);
      setSettlementDepositAmount("");
      setSettlementDepositNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/cash-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["driver-balance", settlementDriverId] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في استلام المبلغ", variant: "destructive" });
    },
  });

  const handleSettlementDeposit = () => {
    if (!settlementDriverId || !settlementDepositAmount || parseFloat(settlementDepositAmount) <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }
    settlementDepositMutation.mutate({
      driverId: settlementDriverId,
      amount: parseFloat(settlementDepositAmount),
      notes: settlementDepositNotes || `استلام من مخالصة - ${getDriverName(settlementDriverId)}`,
    });
  };

  const getDriverName = (driverId: string) => users.find(u => u.id === driverId)?.name || "غير معروف";
  const getConfirmerName = (confirmerId?: string) => confirmerId ? users.find(u => u.id === confirmerId)?.name || "غير معروف" : "";
  const getProductName = (productId: string) => products.find(p => p.id === productId)?.name || "غير معروف";

  const pendingDeposits = deposits.filter((d: CashDeposit) => d.status === "PENDING");

  const handleConfirm = (id: string) => {
    if (!user?.id) return;
    confirmMutation.mutate({ id, confirmedBy: user.id });
  };

  const handleReject = (id: string) => {
    if (!user?.id) return;
    rejectMutation.mutate({ id, confirmedBy: user.id });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-green-100 text-green-700">تم التأكيد</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-700">مرفوض</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700">قيد الانتظار</Badge>;
    }
  };

  const handleShowSettlement = () => {
    if (!settlementDriverId) {
      toast({ title: "يرجى اختيار المندوب", variant: "destructive" });
      return;
    }
    setShowSettlement(true);
  };

  const getSettlementStats = () => {
    const cashSales = settlementTransactions.filter(t => t.type === 'CASH_SALE');
    const creditSales = settlementTransactions.filter(t => t.type === 'CREDIT_SALE');
    const returns = settlementTransactions.filter(t => t.type === 'RETURN');
    const damaged = settlementTransactions.filter(t => t.type === 'DAMAGED');
    const freeSamples = settlementTransactions.filter(t => t.type === 'FREE_SAMPLE');
    const freeDistribution = settlementTransactions.filter(t => t.type === 'FREE_DISTRIBUTION');

    const dailyStats: Record<string, { soldQty: number; totalAmount: number; cashAmount: number; creditAmount: number; depositAmount: number }> = {};
    
    const ensureDay = (day: string) => {
      if (!dailyStats[day]) {
        dailyStats[day] = { soldQty: 0, totalAmount: 0, cashAmount: 0, creditAmount: 0, depositAmount: 0 };
      }
    };

    cashSales.forEach(t => {
      const day = t.date || '';
      ensureDay(day);
      dailyStats[day].soldQty += t.quantity || 0;
      dailyStats[day].totalAmount += parseFloat(t.totalAmount || '0');
      dailyStats[day].cashAmount += parseFloat(t.totalAmount || '0');
    });

    creditSales.forEach(t => {
      const day = t.date || '';
      ensureDay(day);
      dailyStats[day].soldQty += t.quantity || 0;
      dailyStats[day].totalAmount += parseFloat(t.totalAmount || '0');
      dailyStats[day].creditAmount += parseFloat(t.totalAmount || '0');
    });

    const driverDeposits = deposits.filter((d: CashDeposit) => d.driverId === settlementDriverId && d.status === 'CONFIRMED');
    driverDeposits.forEach((d: CashDeposit) => {
      const day = d.depositDate || '';
      ensureDay(day);
      dailyStats[day].depositAmount += parseFloat(d.amount);
    });

    const totalSold = [...cashSales, ...creditSales].reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalReturned = [...returns, ...damaged].reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalSamples = freeSamples.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalFree = freeDistribution.reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalAmount = [...cashSales, ...creditSales].reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
    const cashSalesAmount = cashSales.reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
    const creditAmount = creditSales.reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
    
    const collectedDebts = settlementDebts.reduce((sum, d) => sum + parseFloat(d.paidAmount || '0'), 0);
    const totalDebt = settlementDebts.reduce((sum, d) => 
      sum + (parseFloat(d.amount || '0') - parseFloat(d.paidAmount || '0')), 0);
    
    const cashAmount = cashSalesAmount + collectedDebts;

    return {
      dailyStats,
      totalSold,
      totalReturned,
      totalSamples,
      totalFree,
      totalAmount,
      cashAmount,
      cashSalesAmount,
      collectedDebts,
      creditAmount,
      totalDebt,
    };
  };

  const stats = showSettlement ? getSettlementStats() : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">تسليم المبالغ المحصلة</h1>
            <p className="text-muted-foreground">
              إدارة طلبات تسليم المبالغ من المناديب للمخبز
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700" data-testid="button-open-deposit-dialog">
                <Plus className="h-4 w-4 ml-2" />
                عملية استلام جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right">إضافة عملية استلام مبالغ</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="mb-2 block">المندوب</Label>
                  <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                    <SelectTrigger data-testid="select-driver-deposit">
                      <SelectValue placeholder="اختر المندوب" />
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
                <div>
                  <Label className="mb-2 block">المبلغ</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="أدخل المبلغ"
                    className="text-lg"
                    data-testid="input-admin-deposit-amount"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">التاريخ</Label>
                  <Input
                    type="date"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    data-testid="input-admin-deposit-date"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">ملاحظات (اختياري)</Label>
                  <Input
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                    placeholder="ملاحظات..."
                    data-testid="input-admin-deposit-notes"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleCreateDeposit}
                    disabled={!selectedDriverId || !depositAmount || parseFloat(depositAmount) <= 0 || createDepositMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    data-testid="button-create-deposit"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    {createDepositMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-right flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              مخالصة المندوب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4 mb-6">
              <div className="flex-1 min-w-[200px]">
                <Label className="mb-2 block">اختر المندوب</Label>
                <Select value={settlementDriverId} onValueChange={(v) => { setSettlementDriverId(v); setShowSettlement(false); }}>
                  <SelectTrigger data-testid="select-settlement-driver">
                    <SelectValue placeholder="اختر المندوب لعرض المخالصة" />
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
              <Button 
                onClick={handleShowSettlement} 
                disabled={!settlementDriverId}
                className="bg-primary"
                data-testid="button-show-settlement"
              >
                <FileText className="h-4 w-4 ml-2" />
                عرض المخالصة
              </Button>
            </div>

            {showSettlement && settlementDriverId && (
              settlementLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-white rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-primary rounded-full">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{getDriverName(settlementDriverId)}</h3>
                        <p className="text-sm text-muted-foreground">تاريخ المخالصة: {format(new Date(), "yyyy/MM/dd")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-green-600">إجمالي المباع</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700 mt-1">{stats?.totalSold || 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 border-red-200">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <Undo2 className="h-5 w-5 text-red-600" />
                          <span className="text-sm text-red-600">المرتجع</span>
                        </div>
                        <p className="text-2xl font-bold text-red-700 mt-1">{stats?.totalReturned || 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <Gift className="h-5 w-5 text-blue-600" />
                          <span className="text-sm text-blue-600">العينات</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700 mt-1">{stats?.totalSamples || 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <Gift className="h-5 w-5 text-purple-600" />
                          <span className="text-sm text-purple-600">المجاني</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-700 mt-1">{stats?.totalFree || 0}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">حساب المندوب حسب اليوم</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const dailyEntries = stats ? Object.entries(stats.dailyStats).sort(([a], [b]) => a.localeCompare(b)) : [];
                        const grandTotalQty = dailyEntries.reduce((s, [, d]) => s + d.soldQty, 0);
                        const grandTotalAmount = dailyEntries.reduce((s, [, d]) => s + d.totalAmount, 0);
                        const grandCash = dailyEntries.reduce((s, [, d]) => s + d.cashAmount, 0);
                        const grandCredit = dailyEntries.reduce((s, [, d]) => s + d.creditAmount, 0);
                        const grandDeposit = dailyEntries.reduce((s, [, d]) => s + d.depositAmount, 0);
                        const grandAvgPrice = grandTotalQty > 0 ? grandTotalAmount / grandTotalQty : 0;

                        return (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-right">التاريخ</TableHead>
                                <TableHead className="text-right">عدد المباع</TableHead>
                                <TableHead className="text-right">متوسط السعر</TableHead>
                                <TableHead className="text-right">نقدي</TableHead>
                                <TableHead className="text-right">آجل</TableHead>
                                <TableHead className="text-right">المجموع</TableHead>
                                <TableHead className="text-right">المدفوع للمخبز</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dailyEntries.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    لا توجد مبيعات مسجلة
                                  </TableCell>
                                </TableRow>
                              ) : (
                                <>
                                  {dailyEntries.map(([day, data]) => {
                                    const avgPrice = data.soldQty > 0 ? data.totalAmount / data.soldQty : 0;
                                    return (
                                      <TableRow key={day}>
                                        <TableCell className="font-medium">{day}</TableCell>
                                        <TableCell className="text-green-600 font-bold">{data.soldQty}</TableCell>
                                        <TableCell>{avgPrice.toFixed(2)} ر.س</TableCell>
                                        <TableCell className="text-blue-600 font-bold">{data.cashAmount.toFixed(2)} ر.س</TableCell>
                                        <TableCell className="text-amber-600 font-bold">{data.creditAmount.toFixed(2)} ر.س</TableCell>
                                        <TableCell className="font-bold">{data.totalAmount.toFixed(2)} ر.س</TableCell>
                                        <TableCell className="text-emerald-600 font-bold">{data.depositAmount > 0 ? data.depositAmount.toFixed(2) + ' ر.س' : '-'}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                  <TableRow className="bg-slate-100 font-bold border-t-2">
                                    <TableCell>الإجمالي</TableCell>
                                    <TableCell className="text-green-700">{grandTotalQty}</TableCell>
                                    <TableCell>{grandAvgPrice.toFixed(2)} ر.س</TableCell>
                                    <TableCell className="text-blue-700">{grandCash.toFixed(2)} ر.س</TableCell>
                                    <TableCell className="text-amber-700">{grandCredit.toFixed(2)} ر.س</TableCell>
                                    <TableCell className="text-primary">{grandTotalAmount.toFixed(2)} ر.س</TableCell>
                                    <TableCell className="text-emerald-700">{grandDeposit.toFixed(2)} ر.س</TableCell>
                                  </TableRow>
                                </>
                              )}
                            </TableBody>
                          </Table>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-green-100 to-emerald-100 border-green-300">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <p className="text-sm text-green-600 font-medium">إجمالي المبلغ</p>
                          <p className="text-3xl font-bold text-green-700">{stats?.totalAmount.toFixed(2) || '0.00'} ر.س</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-100 to-cyan-100 border-blue-300">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                          <p className="text-sm text-blue-600 font-medium">النقدي المحصل</p>
                          <p className="text-3xl font-bold text-blue-700">{stats?.cashAmount.toFixed(2) || '0.00'} ر.س</p>
                          <div className="text-xs text-blue-600 mt-2 space-y-1">
                            <p>مبيعات نقدية: {stats?.cashSalesAmount.toFixed(2) || '0.00'} ر.س</p>
                            <p>ديون محصلة: {stats?.collectedDebts.toFixed(2) || '0.00'} ر.س</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-300">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <FileText className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                          <p className="text-sm text-amber-600 font-medium">الديون المتبقية</p>
                          <p className="text-3xl font-bold text-amber-700">{stats?.totalDebt.toFixed(2) || '0.00'} ر.س</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>


                </div>
              )
            )}
          </CardContent>
        </Card>

        {pendingDeposits.length > 0 && (
          <Card className="border-2 border-amber-300">
            <CardHeader className="bg-amber-50">
              <CardTitle className="text-right flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                طلبات تسليم بانتظار التأكيد ({pendingDeposits.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المندوب</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">تاريخ التسليم</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDeposits.map((deposit: CashDeposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="font-medium">{getDriverName(deposit.driverId)}</TableCell>
                      <TableCell className="font-bold text-lg">{parseFloat(deposit.amount).toFixed(2)} ر.س</TableCell>
                      <TableCell>{deposit.depositDate}</TableCell>
                      <TableCell>{deposit.notes || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(deposit.id)}
                            disabled={confirmMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`button-confirm-deposit-${deposit.id}`}
                          >
                            <Check className="h-4 w-4 ml-1" />
                            تأكيد
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(deposit.id)}
                            disabled={rejectMutation.isPending}
                            data-testid={`button-reject-deposit-${deposit.id}`}
                          >
                            <X className="h-4 w-4 ml-1" />
                            رفض
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-right flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              سجل طلبات التسليم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Label className="font-bold whitespace-nowrap">التاريخ:</Label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="w-44 bg-white"
                  data-testid="input-filter-date"
                />
                {filterDate !== format(new Date(), 'yyyy-MM-dd') && (
                  <Button variant="outline" size="sm" onClick={() => setFilterDate(format(new Date(), 'yyyy-MM-dd'))}>
                    اليوم
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label className="font-bold whitespace-nowrap">المندوب:</Label>
                <Select value={filterDriverId} onValueChange={setFilterDriverId}>
                  <SelectTrigger className="w-48 bg-white" data-testid="select-filter-driver">
                    <SelectValue placeholder="جميع المناديب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المناديب</SelectItem>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterDriverId && filterDriverId !== "all" && (
                  <Button variant="outline" size="sm" onClick={() => setFilterDriverId("")}>
                    الكل
                  </Button>
                )}
              </div>
            </div>
            {(() => {
              const filtered = deposits.filter((d: CashDeposit) => {
                const matchDate = !filterDate || d.depositDate === filterDate;
                const matchDriver = !filterDriverId || filterDriverId === "all" || d.driverId === filterDriverId;
                return matchDate && matchDriver;
              });
              const totalFiltered = filtered.reduce((sum: number, d: CashDeposit) => sum + parseFloat(d.amount), 0);
              const confirmedTotal = filtered.filter((d: CashDeposit) => d.status === 'CONFIRMED').reduce((sum: number, d: CashDeposit) => sum + parseFloat(d.amount), 0);

              return isLoading ? (
                <p className="text-center py-4">جاري التحميل...</p>
              ) : filtered.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا توجد طلبات تسليم في هذا اليوم</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-4 mb-4">
                    <Badge className="bg-blue-100 text-blue-700 text-sm px-3 py-1">
                      عدد العمليات: {filtered.length}
                    </Badge>
                    <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1">
                      إجمالي المبالغ: {totalFiltered.toFixed(2)} ر.س
                    </Badge>
                    <Badge className="bg-emerald-100 text-emerald-700 text-sm px-3 py-1">
                      المؤكد: {confirmedTotal.toFixed(2)} ر.س
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المندوب</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">تاريخ التسليم</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">تأكيد بواسطة</TableHead>
                        <TableHead className="text-right">ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((deposit: CashDeposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell className="font-medium">{getDriverName(deposit.driverId)}</TableCell>
                          <TableCell className="font-bold">{parseFloat(deposit.amount).toFixed(2)} ر.س</TableCell>
                          <TableCell>{deposit.depositDate}</TableCell>
                          <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                          <TableCell>{getConfirmerName(deposit.confirmedBy) || "-"}</TableCell>
                          <TableCell>{deposit.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
