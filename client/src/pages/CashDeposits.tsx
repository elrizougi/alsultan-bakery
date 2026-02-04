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
import { useUsers } from "@/hooks/useData";
import { useStore } from "@/lib/store";
import { Send, Check, X, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function CashDepositsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useStore(state => state.user);
  const { data: users = [] } = useUsers();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositNotes, setDepositNotes] = useState<string>("");
  const [depositDate, setDepositDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const drivers = users.filter(u => u.role === "DRIVER");

  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ["/api/cash-deposits"],
    queryFn: api.getCashDeposits,
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
      toast({ title: "خطأ", description: "يرجى اختيار السائق وإدخال مبلغ صحيح", variant: "destructive" });
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
      toast({ title: "تم التأكيد", description: "تم تأكيد تسليم المبلغ وخصمه من عهدة السائق" });
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

  const pendingDeposits = deposits.filter((d: CashDeposit) => d.status === "PENDING");
  const processedDeposits = deposits.filter((d: CashDeposit) => d.status !== "PENDING");

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">تسليم المبالغ المحصلة</h1>
            <p className="text-muted-foreground">
              إدارة طلبات تسليم المبالغ من السائقين للمخبز
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
                  <Label className="mb-2 block">السائق</Label>
                  <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                    <SelectTrigger data-testid="select-driver-deposit">
                      <SelectValue placeholder="اختر السائق" />
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
                    <TableHead className="text-right">السائق</TableHead>
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
                    <TableHead className="text-right">السائق</TableHead>
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
