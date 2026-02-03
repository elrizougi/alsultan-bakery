import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, DollarSign, Package, ShoppingCart, Undo2, Gift, FileText, Check, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type TransactionType, type InsertTransaction, type Transaction, type DriverInventory, type DriverBalance, type CustomerDebt } from "@/lib/api";
import { useProducts, useCustomers, useCreateCustomer } from "@/hooks/useData";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const transactionTypeLabels: Record<TransactionType, { label: string; icon: React.ReactNode; color: string }> = {
  CASH_SALE: { label: "بيع نقدي", icon: <DollarSign className="h-4 w-4" />, color: "bg-green-500" },
  CREDIT_SALE: { label: "بيع آجل", icon: <FileText className="h-4 w-4" />, color: "bg-yellow-500" },
  RETURN: { label: "مرتجع", icon: <Undo2 className="h-4 w-4" />, color: "bg-red-500" },
  FREE_DISTRIBUTION: { label: "توزيع مجاني", icon: <Gift className="h-4 w-4" />, color: "bg-purple-500" },
  FREE_SAMPLE: { label: "عينات", icon: <Package className="h-4 w-4" />, color: "bg-blue-500" },
};

export default function DriverTransactionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = useStore(state => state.user);
  const driverId = currentUser?.id || "";

  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["driver-transactions", driverId],
    queryFn: () => api.getDriverTransactions(driverId),
    enabled: !!driverId,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["driver-inventory", driverId],
    queryFn: () => api.getDriverInventory(driverId),
    enabled: !!driverId,
  });

  const { data: balance } = useQuery({
    queryKey: ["driver-balance", driverId],
    queryFn: () => api.getDriverBalance(driverId),
    enabled: !!driverId,
  });

  const { data: debts = [] } = useQuery({
    queryKey: ["driver-debts", driverId],
    queryFn: () => api.getDriverCustomerDebts(driverId),
    enabled: !!driverId,
  });

  const createTransaction = useMutation({
    mutationFn: api.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["driver-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["driver-balance"] });
      queryClient.invalidateQueries({ queryKey: ["driver-debts"] });
      toast({ title: "تم تسجيل العملية بنجاح" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "حدث خطأ في تسجيل العملية", variant: "destructive" });
    },
  });

  const updateDebt = useMutation({
    mutationFn: ({ id, isPaid }: { id: string; isPaid: boolean }) => api.updateCustomerDebt(id, isPaid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-debts"] });
      queryClient.invalidateQueries({ queryKey: ["driver-balance"] });
      toast({ title: "تم تحديث حالة الدين" });
    },
  });

  const createCustomer = useCreateCustomer();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [customPrice, setCustomPrice] = useState<string>("");
  
  const [formData, setFormData] = useState<Partial<InsertTransaction> & { customerId?: string }>({
    type: "CASH_SALE",
    driverId: driverId,
    productId: "",
    quantity: 1,
    customerId: undefined,
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      type: "CASH_SALE",
      driverId: driverId,
      productId: "",
      quantity: 1,
      customerId: undefined,
      notes: "",
    });
    setCustomPrice("");
    setShowNewCustomerForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerAddress("");
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast({ title: "يرجى إدخال اسم العميل", variant: "destructive" });
      return;
    }
    
    try {
      const newCustomer = await createCustomer.mutateAsync({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || "",
        address: newCustomerAddress.trim() || "",
      });
      
      setFormData({ ...formData, customerId: newCustomer.id });
      setShowNewCustomerForm(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      toast({ title: "تم إضافة العميل بنجاح" });
    } catch (error) {
      toast({ title: "حدث خطأ في إضافة العميل", variant: "destructive" });
    }
  };

  const handleSubmit = () => {
    if (!formData.productId || !formData.type) {
      toast({ title: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    
    // التحقق من اختيار عميل (إجباري لجميع أنواع العمليات)
    if (!formData.customerId) {
      toast({ title: "يرجى اختيار العميل أو إضافة عميل جديد", variant: "destructive" });
      return;
    }

    const product = products.find(p => p.id === formData.productId);
    if (!product) return;

    const unitPrice = customPrice ? customPrice : product.price;
    const totalAmount = (parseFloat(unitPrice) * (formData.quantity || 1)).toFixed(2);

    createTransaction.mutate({
      type: formData.type as TransactionType,
      driverId: driverId,
      productId: formData.productId,
      quantity: formData.quantity || 1,
      customerId: formData.customerId,
      unitPrice,
      totalAmount,
      notes: formData.notes,
    });
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || "غير معروف";
  };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return "-";
    return customers.find(c => c.id === customerId)?.name || "غير معروف";
  };

  if (transactionsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const unpaidDebts = debts.filter(d => !d.isPaid);
  const totalDebts = unpaidDebts.reduce((sum, d) => sum + parseFloat(d.amount), 0);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 font-black">العمليات الميدانية</h1>
            <p className="text-sm text-muted-foreground">إدارة عمليات البيع والتوزيع والمرتجعات</p>
          </div>
          <Button 
            onClick={() => setIsCreateOpen(true)} 
            className="w-full sm:w-auto flex-row gap-2 bg-primary hover:bg-primary/90 rounded-xl h-11 px-6 shadow-lg shadow-primary/20 font-bold"
            data-testid="button-new-transaction"
          >
            <Plus className="h-4 w-4" /> عملية جديدة
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                الرصيد النقدي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-cash-balance">
                {parseFloat(balance?.cashBalance || "0").toFixed(2)} ر.س
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                إجمالي الديون
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-total-debts">
                {totalDebts.toFixed(2)} ر.س
              </div>
              <p className="text-xs text-muted-foreground">{unpaidDebts.length} دين غير مدفوع</p>
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                العمليات اليوم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary" data-testid="text-today-transactions">
                {transactions.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Package className="h-5 w-5" />
                مخزوني الحالي
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا يوجد مخزون حالياً</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => (
                      <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                        <TableCell>{getProductName(item.productId)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                الديون غير المدفوعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unpaidDebts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا توجد ديون</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidDebts.map((debt) => (
                      <TableRow key={debt.id} data-testid={`row-debt-${debt.id}`}>
                        <TableCell>{getCustomerName(debt.customerId)}</TableCell>
                        <TableCell>{parseFloat(debt.amount).toFixed(2)} ر.س</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateDebt.mutate({ id: debt.id, isPaid: true })}
                            data-testid={`button-mark-paid-${debt.id}`}
                          >
                            <Check className="h-4 w-4 ml-1" />
                            تم الدفع
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-bold">سجل العمليات</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">لا توجد عمليات مسجلة</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const typeInfo = transactionTypeLabels[tx.type];
                    return (
                      <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                        <TableCell>
                          <Badge className={`${typeInfo.color} text-white gap-1`}>
                            {typeInfo.icon}
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{getProductName(tx.productId)}</TableCell>
                        <TableCell>{tx.quantity}</TableCell>
                        <TableCell>{tx.totalAmount ? `${parseFloat(tx.totalAmount).toFixed(2)} ر.س` : "-"}</TableCell>
                        <TableCell>{getCustomerName(tx.customerId)}</TableCell>
                        <TableCell>
                          {tx.createdAt ? format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm", { locale: ar }) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">عملية جديدة</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>نوع العملية *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as TransactionType })}
              >
                <SelectTrigger data-testid="select-transaction-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(transactionTypeLabels).map(([key, { label, icon }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {icon}
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>المنتج *</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) => setFormData({ ...formData, productId: value })}
              >
                <SelectTrigger data-testid="select-product">
                  <SelectValue placeholder="اختر المنتج" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.price} ر.س
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>الكمية *</Label>
              <Input
                type="number"
                min={1}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                data-testid="input-quantity"
              />
            </div>

            <div className="grid gap-2">
              <Label>العميل *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.customerId || ""}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                >
                  <SelectTrigger data-testid="select-customer" className="flex-1">
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                  data-testid="button-add-new-customer"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              
              {showNewCustomerForm && (
                <div className="p-3 bg-slate-50 rounded-lg space-y-3 mt-2">
                  <div className="text-sm font-medium text-slate-700">إضافة عميل جديد</div>
                  <Input
                    placeholder="اسم العميل *"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    data-testid="input-new-customer-name"
                  />
                  <Input
                    placeholder="رقم الهاتف"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    data-testid="input-new-customer-phone"
                  />
                  <Input
                    placeholder="العنوان"
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    data-testid="input-new-customer-address"
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleAddNewCustomer}
                    disabled={createCustomer.isPending}
                    data-testid="button-save-new-customer"
                  >
                    {createCustomer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ العميل"}
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>السعر المخصص (اتركه فارغاً لاستخدام سعر المنتج)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={formData.productId ? `سعر المنتج: ${products.find(p => p.id === formData.productId)?.price || 0} ر.س` : "اختر المنتج أولاً"}
                data-testid="input-custom-price"
              />
            </div>

            <div className="grid gap-2">
              <Label>ملاحظات</Label>
              <Input
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                data-testid="input-notes"
              />
            </div>

            {formData.productId && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  المبلغ الإجمالي:{" "}
                  <span className="font-bold text-primary">
                    {(parseFloat(customPrice || products.find(p => p.id === formData.productId)?.price || "0") * (formData.quantity || 1)).toFixed(2)} ر.س
                  </span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createTransaction.isPending}
              data-testid="button-submit-transaction"
            >
              {createTransaction.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ العملية"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
