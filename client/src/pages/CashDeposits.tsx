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

    const productStats: Record<string, { sold: number; returned: number; samples: number; free: number; amount: number }> = {};
    
    [...cashSales, ...creditSales].forEach(t => {
      const productName = getProductName(t.productId || '');
      if (!productStats[productName]) {
        productStats[productName] = { sold: 0, returned: 0, samples: 0, free: 0, amount: 0 };
      }
      productStats[productName].sold += t.quantity || 0;
      productStats[productName].amount += parseFloat(t.totalAmount || '0');
    });

    returns.forEach(t => {
      const productName = getProductName(t.productId || '');
      if (!productStats[productName]) {
        productStats[productName] = { sold: 0, returned: 0, samples: 0, free: 0, amount: 0 };
      }
      productStats[productName].returned += t.quantity || 0;
    });

    damaged.forEach(t => {
      const productName = getProductName(t.productId || '');
      if (!productStats[productName]) {
        productStats[productName] = { sold: 0, returned: 0, samples: 0, free: 0, amount: 0 };
      }
      productStats[productName].returned += t.quantity || 0;
    });

    freeSamples.forEach(t => {
      const productName = getProductName(t.productId || '');
      if (!productStats[productName]) {
        productStats[productName] = { sold: 0, returned: 0, samples: 0, free: 0, amount: 0 };
      }
      productStats[productName].samples += t.quantity || 0;
    });

    freeDistribution.forEach(t => {
      const productName = getProductName(t.productId || '');
      if (!productStats[productName]) {
        productStats[productName] = { sold: 0, returned: 0, samples: 0, free: 0, amount: 0 };
      }
      productStats[productName].free += t.quantity || 0;
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
      productStats,
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
                      <CardTitle className="text-lg">تفاصيل الخبز حسب النوع</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">نوع الخبز</TableHead>
                            <TableHead className="text-right">المباع</TableHead>
                            <TableHead className="text-right">المرتجع</TableHead>
                            <TableHead className="text-right">العينات</TableHead>
                            <TableHead className="text-right">المجاني</TableHead>
                            <TableHead className="text-right">المبلغ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats && Object.entries(stats.productStats).map(([productName, data]) => (
                            <TableRow key={productName}>
                              <TableCell className="font-medium">{productName}</TableCell>
                              <TableCell className="text-green-600 font-bold">{data.sold}</TableCell>
                              <TableCell className="text-red-600">{data.returned || '-'}</TableCell>
                              <TableCell className="text-blue-600">{data.samples || '-'}</TableCell>
                              <TableCell className="text-purple-600">{data.free || '-'}</TableCell>
                              <TableCell className="font-bold">{data.amount.toFixed(2)} ر.س</TableCell>
                            </TableRow>
                          ))}
                          {stats && Object.keys(stats.productStats).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                لا توجد عمليات مسجلة
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
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

                  <div className="p-4 bg-slate-100 rounded-lg border">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">الرصيد النقدي الحالي:</span>
                      <span className="text-2xl font-bold text-primary">
                        {parseFloat(settlementBalance?.cashBalance || '0').toFixed(2)} ر.س
                      </span>
                    </div>
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
              سجل جميع طلبات التسليم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-4">جاري التحميل...</p>
            ) : deposits.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">لا توجد طلبات تسليم</p>
            ) : (
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
                  {deposits.map((deposit: CashDeposit) => (
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
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
