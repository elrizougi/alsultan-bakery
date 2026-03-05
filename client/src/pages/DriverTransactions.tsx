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
import { Plus, Loader2, DollarSign, Package, ShoppingCart, Undo2, Gift, FileText, Check, UserPlus, CheckCircle, Edit3, Banknote, AlertTriangle, Users, Trash2, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type TransactionType, type InsertTransaction, type Transaction, type DriverInventory, type DriverBalance, type CustomerDebt, type Order, type CashDeposit } from "@/lib/api";
import { useProducts, useCustomers, useCreateCustomer, useOrders, useUsers } from "@/hooks/useData";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const transactionTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  CASH_SALE: { label: "بيع نقدي", icon: <DollarSign className="h-4 w-4" />, color: "bg-green-500" },
  CREDIT_SALE: { label: "بيع آجل", icon: <FileText className="h-4 w-4" />, color: "bg-yellow-500" },
  RETURN: { label: "مرتجع", icon: <Undo2 className="h-4 w-4" />, color: "bg-red-500" },
  FREE_DISTRIBUTION: { label: "توزيع مجاني", icon: <Gift className="h-4 w-4" />, color: "bg-purple-500" },
  FREE_SAMPLE: { label: "عينات", icon: <Package className="h-4 w-4" />, color: "bg-blue-500" },
  DAMAGED: { label: "خبز تالف", icon: <AlertTriangle className="h-4 w-4" />, color: "bg-gray-500" },
  EXPENSE: { label: "مصروفات", icon: <DollarSign className="h-4 w-4" />, color: "bg-orange-500" },
};

export default function DriverTransactionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = useStore(state => state.user);
  const isAdmin = currentUser?.role === 'ADMIN';
  const { data: users = [] } = useUsers();
  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const driverId = isAdmin ? selectedDriverId : (currentUser?.id || "");

  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useOrders();
  
  // طلبات السائق التي تحتاج تأكيد استلام
  const pendingOrders = orders.filter(o => o.customerId === driverId && o.status === 'CONFIRMED');
  
  // طلبات السائق المؤكدة من الإدارة (المستلمة)
  const assignedOrders = orders.filter(o => o.customerId === driverId && o.status === 'ASSIGNED');
  
  // طلبات تم تسليمها للعملاء
  const deliveredOrders = orders.filter(o => o.customerId === driverId && o.status === 'DELIVERED');
  
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

  const { data: cashDeposits = [] } = useQuery({
    queryKey: ["driver-cash-deposits", driverId],
    queryFn: () => api.getDriverCashDeposits(driverId),
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

  const deleteTransaction = useMutation({
    mutationFn: api.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["driver-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["driver-balance"] });
      queryClient.invalidateQueries({ queryKey: ["driver-debts"] });
      toast({ title: "تم حذف العملية بنجاح" });
    },
    onError: () => {
      toast({ title: "حدث خطأ في حذف العملية", variant: "destructive" });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { quantity?: number; unitPrice?: string; customerId?: string; notes?: string } }) =>
      api.updateTransaction(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["driver-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["driver-balance"] });
      queryClient.invalidateQueries({ queryKey: ["driver-debts"] });
      toast({ title: "تم تعديل العملية بنجاح" });
      setEditingTransaction(null);
    },
    onError: () => {
      toast({ title: "حدث خطأ في تعديل العملية", variant: "destructive" });
    },
  });

  const loadInventory = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      api.loadDriverInventory(driverId, productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "تم تحميل الخبز للمندوب بنجاح" });
      setIsLoadDialogOpen(false);
      setLoadProductId("");
      setLoadQuantity("");
    },
    onError: (error: any) => {
      const message = error?.message || "حدث خطأ في تحميل الخبز";
      toast({ title: message, variant: "destructive" });
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

  const partialPayment = useMutation({
    mutationFn: ({ id, paymentAmount }: { id: string; paymentAmount: number }) => 
      api.makePartialPayment(id, paymentAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-debts"] });
      queryClient.invalidateQueries({ queryKey: ["driver-balance"] });
      toast({ title: "تم تسجيل الدفع الجزئي" });
      setPaymentDialogDebt(null);
      setPaymentAmount("");
    },
    onError: () => {
      toast({ title: "حدث خطأ في تسجيل الدفع", variant: "destructive" });
    },
  });

  const createDepositMutation = useMutation({
    mutationFn: api.createCashDeposit,
    onSuccess: () => {
      toast({ title: "تم تقديم طلب التسليم", description: "سيتم خصم المبلغ بعد تأكيد المخبز" });
      setDepositAmount("");
      setDepositNotes("");
      setIsDepositDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["driver-cash-deposits"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تقديم طلب التسليم", variant: "destructive" });
    },
  });


  const [paymentDialogDebt, setPaymentDialogDebt] = useState<typeof debts[0] | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const createCustomer = useCreateCustomer();

  const confirmReceipt = useMutation({
    mutationFn: ({ orderId, receivedItems }: { orderId: string; receivedItems: { id: string; receivedQuantity: number }[] }) => 
      api.confirmOrderReceipt(orderId, receivedItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["driver-inventory"] });
      toast({ title: "تم تأكيد استلام الطلب وإضافته للمخزون" });
    },
    onError: () => {
      toast({ title: "حدث خطأ في تأكيد الاستلام", variant: "destructive" });
    },
  });

  const handleConfirmReceipt = (order: Order) => {
    const receivedItems = order.items?.map(item => ({
      id: item.id!,
      receivedQuantity: item.quantity,
    })) || [];
    confirmReceipt.mutate({ orderId: order.id, receivedItems });
  };

  // State for modification dialog
  const [modifyingOrder, setModifyingOrder] = useState<Order | null>(null);
  const [modifiedQuantities, setModifiedQuantities] = useState<Record<string, number>>({});
  const [modificationNotes, setModificationNotes] = useState("");

  const createModification = useMutation({
    mutationFn: api.createOrderModification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "تم إرسال طلب التعديل للمسؤول" });
      setModifyingOrder(null);
      setModifiedQuantities({});
      setModificationNotes("");
    },
    onError: () => {
      toast({ title: "حدث خطأ في إرسال طلب التعديل", variant: "destructive" });
    },
  });

  const handleOpenModifyDialog = (order: Order) => {
    setModifyingOrder(order);
    const quantities: Record<string, number> = {};
    order.items?.forEach(item => {
      quantities[item.productId] = item.quantity;
    });
    setModifiedQuantities(quantities);
  };

  const handleSubmitModification = () => {
    if (!modifyingOrder) return;
    
    const items = modifyingOrder.items?.map(item => ({
      productId: item.productId,
      originalQuantity: item.quantity,
      requestedQuantity: modifiedQuantities[item.productId] || 0,
    })) || [];

    createModification.mutate({
      orderId: modifyingOrder.id,
      driverId: driverId,
      items,
      notes: modificationNotes || undefined,
    });
  };
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  
  // حالة إغلاق الرحلة
  const [closingOrder, setClosingOrder] = useState<Order | null>(null);
  const [unsoldQuantities, setUnsoldQuantities] = useState<Record<string, number>>({});
  
  const updateOrderStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) => 
      api.updateOrder(orderId, { status: status as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "تم تحديث حالة الطلب" });
    },
    onError: () => {
      toast({ title: "حدث خطأ في تحديث الحالة", variant: "destructive" });
    },
  });
  
  const handleDeliverOrder = (order: Order) => {
    updateOrderStatus.mutate({ orderId: order.id, status: 'DELIVERED' });
  };
  
  const handleOpenCloseDialog = (order: Order) => {
    setClosingOrder(order);
    const quantities: Record<string, number> = {};
    order.items?.forEach(item => {
      quantities[item.productId] = 0;
    });
    setUnsoldQuantities(quantities);
  };
  
  const handleCloseOrder = () => {
    if (!closingOrder) return;
    updateOrderStatus.mutate({ orderId: closingOrder.id, status: 'CLOSED' });
    setClosingOrder(null);
    setUnsoldQuantities({});
  };
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositNotes, setDepositNotes] = useState<string>("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({ quantity: 1, unitPrice: "", customerId: "", notes: "" });
  const [editCustomerSearchOpen, setEditCustomerSearchOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [loadProductId, setLoadProductId] = useState("");
  const [loadQuantity, setLoadQuantity] = useState<string>("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerLocationUrl, setNewCustomerLocationUrl] = useState("");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseDescription, setExpenseDescription] = useState<string>("");
  
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
    setExpenseAmount("");
    setExpenseDescription("");
    setShowNewCustomerForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerLocationUrl("");
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
        address: "",
        locationUrl: newCustomerLocationUrl.trim() || "",
        driverId: driverId,
      });
      
      setFormData({ ...formData, customerId: newCustomer.id });
      setShowNewCustomerForm(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerLocationUrl("");
      toast({ title: "تم إضافة العميل بنجاح" });
    } catch (error) {
      toast({ title: "حدث خطأ في إضافة العميل", variant: "destructive" });
    }
  };

  const handleSubmit = () => {
    // معالجة خاصة للمصروفات
    if ((formData.type as string) === 'EXPENSE') {
      const amount = parseFloat(expenseAmount);
      if (!amount || amount <= 0) {
        toast({ title: "يرجى إدخال مبلغ المصروفات", variant: "destructive" });
        return;
      }
      if (!expenseDescription.trim()) {
        toast({ title: "يرجى إدخال وصف المصروفات", variant: "destructive" });
        return;
      }

      // للمصروفات نستخدم أول منتج وأول عميل كقيم افتراضية (حقول مطلوبة في قاعدة البيانات)
      const defaultProduct = products[0];
      const defaultCustomer = customers[0];
      
      if (!defaultProduct || !defaultCustomer) {
        toast({ title: "يجب وجود منتج وعميل واحد على الأقل في النظام", variant: "destructive" });
        return;
      }

      createTransaction.mutate({
        type: 'EXPENSE' as TransactionType,
        driverId: driverId,
        productId: defaultProduct.id,
        quantity: 0,
        customerId: defaultCustomer.id,
        unitPrice: "0",
        totalAmount: amount.toFixed(2),
        notes: `${expenseDescription}${formData.notes ? ' - ' + formData.notes : ''}`,
      });
      return;
    }

    if (!formData.productId || !formData.type) {
      toast({ title: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const noCustomerTypes: string[] = ['RETURN'];
    
    if (!noCustomerTypes.includes(formData.type as string) && !formData.customerId) {
      toast({ title: "يرجى اختيار العميل أو إضافة عميل جديد", variant: "destructive" });
      return;
    }

    const product = products.find(p => p.id === formData.productId);
    if (!product) return;

    const requestedQuantity = formData.quantity || 1;

    const unitPrice = customPrice ? customPrice : product.price;
    const totalAmount = (parseFloat(unitPrice) * requestedQuantity).toFixed(2);

    let customerId = formData.customerId;
    if (noCustomerTypes.includes(formData.type as string) && !customerId) {
      const defaultCustomer = customers[0];
      if (!defaultCustomer) {
        toast({ title: "يجب وجود عميل واحد على الأقل في النظام", variant: "destructive" });
        return;
      }
      customerId = defaultCustomer.id;
    }

    createTransaction.mutate({
      type: formData.type as TransactionType,
      driverId: driverId,
      productId: formData.productId,
      quantity: requestedQuantity,
      customerId: customerId!,
      unitPrice,
      totalAmount,
      notes: formData.notes,
    });
  };

  const handleSubmitDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast({ title: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    createDepositMutation.mutate({
      driverId: driverId,
      amount: amount,
      depositDate: new Date().toISOString().split('T')[0],
      notes: depositNotes || undefined,
    });
  };

  const normalizeArabic = (text: string) => {
    return text
      .replace(/[إأآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ى/g, 'ي');
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
  const totalDebts = unpaidDebts.reduce((sum, d) => sum + (parseFloat(d.amount) - parseFloat(d.paidAmount || "0")), 0);

  // حساب المخزون الحالي مع القيمة
  const totalCurrentInventory = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalCurrentInventoryValue = inventory.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (item.quantity * parseFloat(product?.price || '0'));
  }, 0);

  // حساب الخبز المباع (بيع نقدي + بيع آجل) مع القيمة
  const totalSoldBread = transactions
    .filter(t => t.type === "CASH_SALE" || t.type === "CREDIT_SALE")
    .reduce((sum, t) => sum + t.quantity, 0);
  const totalSoldValue = transactions
    .filter(t => t.type === "CASH_SALE" || t.type === "CREDIT_SALE")
    .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);

  // حساب عدد العملاء الفريدين
  const uniqueCustomersSet = new Set(
    transactions
      .filter(t => t.type === "CASH_SALE" || t.type === "CREDIT_SALE")
      .map(t => t.customerId)
      .filter(Boolean)
  );
  const uniqueCustomersCount = uniqueCustomersSet.size;

  const totalReturnBread = transactions
    .filter(t => t.type === 'RETURN')
    .reduce((sum, t) => sum + t.quantity, 0);

  const totalDamagedBread = transactions
    .filter(t => t.type === 'DAMAGED')
    .reduce((sum, t) => sum + t.quantity, 0);

  const totalReturnAndDamaged = totalReturnBread + totalDamagedBread;

  // عمليات السجل (بدون المرتجع)
  const logTransactions = transactions.filter(t => t.type !== 'RETURN');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // حساب إجمالي المصروفات
  const totalExpenses = transactions
    .filter(t => (t.type as string) === 'EXPENSE')
    .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 font-black">العمليات الميدانية</h1>
            <p className="text-sm text-muted-foreground">إدارة عمليات البيع والتوزيع والمرتجعات</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => setIsCreateOpen(true)} 
              className="w-full sm:w-auto flex-row gap-2 bg-primary hover:bg-primary/90 rounded-xl h-11 px-6 shadow-lg shadow-primary/20 font-bold"
              data-testid="button-new-transaction"
              disabled={isAdmin && !driverId}
            >
              <Plus className="h-4 w-4" /> عملية جديدة
            </Button>
            <Button 
              onClick={() => setIsLoadDialogOpen(true)} 
              className="w-full sm:w-auto flex-row gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl h-11 px-6 shadow-lg shadow-blue-600/20 font-bold"
              data-testid="button-load-bread"
              disabled={isAdmin && !driverId}
            >
              <Truck className="h-4 w-4" /> تحميل خبز
            </Button>
          </div>
        </div>

        {isAdmin && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <Label className="font-bold text-lg whitespace-nowrap">اختر المندوب:</Label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger className="max-w-xs bg-white" data-testid="select-driver">
                    <SelectValue placeholder="اختر المندوب لعرض عملياته" />
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
            </CardContent>
          </Card>
        )}

        {isAdmin && !driverId && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg">يرجى اختيار المندوب أولاً لعرض العمليات الميدانية</p>
          </div>
        )}

        {(!isAdmin || driverId) && (<>
        {/* بطاقة الرصيد النقدي الكبيرة */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-green-500 rounded-2xl shadow-md">
                  <DollarSign className="h-10 w-10 text-white" />
                </div>
                <div className="text-center md:text-right">
                  <p className="text-lg font-medium text-green-700">الرصيد النقدي</p>
                  <div className="text-4xl md:text-5xl font-bold text-green-600" data-testid="text-cash-balance">
                    {parseFloat(balance?.cashBalance || "0").toFixed(2)} <span className="text-2xl">ر.س</span>
                  </div>
                </div>
              </div>
              <Button 
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg rounded-xl shadow-md"
                onClick={() => setIsDepositDialogOpen(true)}
                data-testid="button-open-deposit-dialog"
              >
                <Banknote className="h-6 w-6 ml-2" />
                تسليم مبلغ للمخبز
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* الصف الأول: إحصائيات المخزون والمبيعات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card className="border-slate-100 bg-orange-50 hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-xl">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-600">المخزون الحالي</p>
                  <p className="text-2xl font-bold text-orange-700" data-testid="text-current-inventory">{totalCurrentInventory}</p>
                  <p className="text-xs text-orange-600/70">{totalCurrentInventoryValue.toFixed(2)} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 bg-green-50 hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500 rounded-xl">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600">الخبز المباع</p>
                  <p className="text-2xl font-bold text-green-700" data-testid="text-sold-bread">{totalSoldBread}</p>
                  <p className="text-xs text-green-600/70">{totalSoldValue.toFixed(2)} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 bg-purple-50 hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500 rounded-xl">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-600">عدد العملاء</p>
                  <p className="text-2xl font-bold text-purple-700" data-testid="text-customers-count">{uniqueCustomersCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 bg-red-50 hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500 rounded-xl">
                  <Undo2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-600">مرتجع + تالف</p>
                  <p className="text-2xl font-bold text-red-700" data-testid="text-return-bread">{totalReturnAndDamaged}</p>
                  <div className="flex gap-3 text-xs text-red-600/80 mt-1">
                    <span>مرتجع: {totalReturnBread}</span>
                    <span>تالف: {totalDamagedBread}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الصف الثاني: الإحصائيات المالية */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-slate-100 bg-yellow-50 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-yellow-600">إجمالي الديون</p>
                  <p className="text-xl font-bold text-yellow-700" data-testid="text-total-debts">{totalDebts.toFixed(2)} ر.س</p>
                  <p className="text-xs text-yellow-600/70">{unpaidDebts.length} دين غير مدفوع</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 bg-red-50 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-red-600">إجمالي المصروفات</p>
                  <p className="text-xl font-bold text-red-700" data-testid="text-total-expenses">{totalExpenses.toFixed(2)} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 bg-slate-50 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-500 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600">العمليات اليوم</p>
                  <p className="text-xl font-bold text-slate-700" data-testid="text-today-transactions">{transactions.length}</p>
                </div>
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
                      <TableHead className="text-right">المبلغ الكلي</TableHead>
                      <TableHead className="text-right">المدفوع</TableHead>
                      <TableHead className="text-right">الباقي</TableHead>
                      <TableHead className="text-right">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidDebts.map((debt) => {
                      const total = parseFloat(debt.amount);
                      const paid = parseFloat(debt.paidAmount || "0");
                      const remaining = total - paid;
                      return (
                        <TableRow key={debt.id} data-testid={`row-debt-${debt.id}`}>
                          <TableCell>{getCustomerName(debt.customerId)}</TableCell>
                          <TableCell>{total.toFixed(2)} ر.س</TableCell>
                          <TableCell className="text-green-600">{paid.toFixed(2)} ر.س</TableCell>
                          <TableCell className="text-red-600 font-bold">{remaining.toFixed(2)} ر.س</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setPaymentDialogDebt(debt)}
                                data-testid={`button-partial-pay-${debt.id}`}
                              >
                                دفع جزئي
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => updateDebt.mutate({ id: debt.id, isPaid: true })}
                                data-testid={`button-mark-paid-${debt.id}`}
                              >
                                <Check className="h-4 w-4 ml-1" />
                                دفع كامل
                              </Button>
                            </div>
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

        <Card className="border-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-bold">سجل العمليات</CardTitle>
          </CardHeader>
          <CardContent>
            {logTransactions.length === 0 ? (
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
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logTransactions.map((tx) => {
                    const typeInfo = transactionTypeLabels[tx.type];
                    const isExpense = (tx.type as string) === 'EXPENSE';
                    const txDate = tx.createdAt ? new Date(tx.createdAt) : null;
                    const isToday = txDate ? txDate >= today : false;
                    return (
                      <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                        <TableCell>
                          <Badge className={`${typeInfo?.color || 'bg-gray-500'} text-white gap-1`}>
                            {typeInfo?.icon}
                            {typeInfo?.label || tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{isExpense ? (tx.notes || '-') : getProductName(tx.productId)}</TableCell>
                        <TableCell>{isExpense ? '-' : tx.quantity}</TableCell>
                        <TableCell>{tx.totalAmount ? `${parseFloat(tx.totalAmount).toFixed(2)} ر.س` : "-"}</TableCell>
                        <TableCell>{isExpense ? '-' : getCustomerName(tx.customerId)}</TableCell>
                        <TableCell>
                          {tx.createdAt ? format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm", { locale: ar }) : "-"}
                        </TableCell>
                        <TableCell>
                          {isToday && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => {
                                  setEditingTransaction(tx);
                                  setEditForm({
                                    quantity: tx.quantity,
                                    unitPrice: tx.unitPrice || "",
                                    customerId: tx.customerId || "",
                                    notes: tx.notes || "",
                                  });
                                }}
                                data-testid={`button-edit-transaction-${tx.id}`}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm("هل أنت متأكد من حذف هذه العملية؟")) {
                                    deleteTransaction.mutate(tx.id);
                                  }
                                }}
                                disabled={deleteTransaction.isPending}
                                data-testid={`button-delete-transaction-${tx.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </>)}
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

            {/* حقول خاصة بالمصروفات */}
            {(formData.type as string) === 'EXPENSE' ? (
              <>
                <div className="grid gap-2">
                  <Label>المبلغ *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="أدخل مبلغ المصروفات"
                    data-testid="input-expense-amount"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>البند / الوصف *</Label>
                  <Input
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="مثال: وقود، صيانة، غداء..."
                    data-testid="input-expense-description"
                  />
                </div>

                {expenseAmount && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      المبلغ:{" "}
                      <span className="font-bold text-orange-600">
                        {parseFloat(expenseAmount || "0").toFixed(2)} ر.س
                      </span>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
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

                {(formData.type as string) !== 'RETURN' && (
                <div className="grid gap-2">
                  <Label>العميل *</Label>
                  <div className="flex gap-2">
                    <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={customerSearchOpen}
                          className="flex-1 justify-between font-normal"
                          data-testid="select-customer"
                        >
                          {formData.customerId
                            ? customers.find(c => c.id === formData.customerId)?.name || "اختر العميل"
                            : "اختر العميل"}
                          <span className="mr-2 h-4 w-4 shrink-0 opacity-50">▼</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command filter={(value, search) => {
                          const customer = customers.find(c => c.id === value);
                          if (!customer) return 0;
                          const normalizedSearch = normalizeArabic(search);
                          const normalizedName = normalizeArabic(customer.name);
                          return normalizedName.includes(normalizedSearch) ? 1 : 0;
                        }}>
                          <CommandInput placeholder="ابحث عن العميل..." data-testid="input-search-customer" />
                          <CommandList>
                            <CommandEmpty>لا يوجد عميل بهذا الاسم</CommandEmpty>
                            <CommandGroup>
                              {customers.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={customer.id}
                                  onSelect={(value) => {
                                    setFormData({ ...formData, customerId: value });
                                    setCustomerSearchOpen(false);
                                  }}
                                >
                                  <Check className={`ml-2 h-4 w-4 ${formData.customerId === customer.id ? "opacity-100" : "opacity-0"}`} />
                                  {customer.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                        placeholder="رابط موقع الخريطة"
                        value={newCustomerLocationUrl}
                        onChange={(e) => setNewCustomerLocationUrl(e.target.value)}
                        data-testid="input-new-customer-location"
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
                )}
              </>
            )}

            {(formData.type as string) !== 'EXPENSE' && (
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
            )}

            <div className="grid gap-2">
              <Label>ملاحظات</Label>
              <Input
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                data-testid="input-notes"
              />
            </div>

            {(formData.type as string) !== 'EXPENSE' && formData.productId && (
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

      {/* نافذة تعديل الطلب */}
      <Dialog open={!!modifyingOrder} onOpenChange={(open) => !open && setModifyingOrder(null)}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل كميات الطلب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              عدّل الكميات المستلمة فعلياً، سيتم إرسال طلب التعديل للمسؤول للموافقة عليه
            </p>
            
            {modifyingOrder?.items?.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium">{getProductName(item.productId)}</span>
                  <span className="text-sm text-muted-foreground mr-2">
                    (الطلب الأصلي: {item.quantity})
                  </span>
                </div>
                <Input
                  type="number"
                  min="0"
                  value={modifiedQuantities[item.productId] || 0}
                  onChange={(e) => setModifiedQuantities(prev => ({
                    ...prev,
                    [item.productId]: parseInt(e.target.value) || 0
                  }))}
                  className="w-24 text-center"
                  data-testid={`input-modify-qty-${item.productId}`}
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Input
                placeholder="سبب التعديل..."
                value={modificationNotes}
                onChange={(e) => setModificationNotes(e.target.value)}
                data-testid="input-modification-notes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModifyingOrder(null)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSubmitModification} 
              disabled={createModification.isPending}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="button-submit-modification"
            >
              {createModification.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال طلب التعديل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة الدفع الجزئي */}
      <Dialog open={!!paymentDialogDebt} onOpenChange={(open) => !open && setPaymentDialogDebt(null)}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">دفع جزئي</DialogTitle>
          </DialogHeader>
          {paymentDialogDebt && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">العميل:</span>
                  <span className="font-medium">{getCustomerName(paymentDialogDebt.customerId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ الكلي:</span>
                  <span>{parseFloat(paymentDialogDebt.amount).toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المدفوع مسبقاً:</span>
                  <span className="text-green-600">{parseFloat(paymentDialogDebt.paidAmount || "0").toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">المتبقي:</span>
                  <span className="text-red-600 font-bold">
                    {(parseFloat(paymentDialogDebt.amount) - parseFloat(paymentDialogDebt.paidAmount || "0")).toFixed(2)} ر.س
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>المبلغ المدفوع الآن</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(parseFloat(paymentDialogDebt.amount) - parseFloat(paymentDialogDebt.paidAmount || "0")).toFixed(2)}
                  placeholder="أدخل المبلغ..."
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  data-testid="input-payment-amount"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentDialogDebt(null)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => {
                if (paymentDialogDebt && paymentAmount) {
                  partialPayment.mutate({ 
                    id: paymentDialogDebt.id, 
                    paymentAmount: parseFloat(paymentAmount) 
                  });
                }
              }} 
              disabled={partialPayment.isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
              data-testid="button-confirm-partial-payment"
            >
              {partialPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد الدفع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تسليم المبالغ للمخبز */}
      <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تسليم مبلغ للمخبز</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>المبلغ (ر.س)</Label>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="أدخل المبلغ المراد تسليمه"
                data-testid="input-deposit-amount"
              />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Input
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                placeholder="ملاحظات إضافية"
                data-testid="input-deposit-notes"
              />
            </div>
            {parseFloat(balance?.cashBalance || "0") > 0 && (
              <div className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg">
                رصيدك الحالي: <span className="font-bold text-green-600">{parseFloat(balance?.cashBalance || "0").toFixed(2)} ر.س</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDepositDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSubmitDeposit}
              disabled={createDepositMutation.isPending || !depositAmount || parseFloat(depositAmount) <= 0}
              data-testid="button-submit-deposit"
            >
              {createDepositMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تقديم طلب التسليم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* حوار إغلاق الرحلة */}
      <Dialog open={!!closingOrder} onOpenChange={(open) => !open && setClosingOrder(null)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              إغلاق الرحلة
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              حدد الكمية غير المباعة لكل منتج (إن وجدت):
            </p>
            
            {closingOrder?.items?.map(item => {
              const received = item.receivedQuantity ?? item.quantity;
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium">{getProductName(item.productId)}</span>
                    <span className="text-sm text-muted-foreground mr-2">
                      (المستلم: {received})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">غير مباع:</Label>
                    <Input
                      type="number"
                      min="0"
                      max={received}
                      value={unsoldQuantities[item.productId] || 0}
                      onChange={(e) => setUnsoldQuantities(prev => ({
                        ...prev,
                        [item.productId]: parseInt(e.target.value) || 0
                      }))}
                      className="w-20 text-center"
                      data-testid={`input-unsold-${item.productId}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClosingOrder(null)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleCloseOrder}
              disabled={updateOrderStatus.isPending}
              data-testid="button-confirm-close"
            >
              {updateOrderStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "تأكيد الإغلاق"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTransaction} onOpenChange={(open) => { if (!open) setEditingTransaction(null); }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل العملية</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <div className="grid gap-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>النوع:</span>
                  <Badge className={`${transactionTypeLabels[editingTransaction.type]?.color} text-white`}>
                    {transactionTypeLabels[editingTransaction.type]?.label}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  المنتج: <span className="font-bold">{getProductName(editingTransaction.productId)}</span>
                </div>
              </div>

              {(editingTransaction.type as string) !== 'EXPENSE' && (
                <div className="grid gap-2">
                  <Label>الكمية</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                    data-testid="input-edit-quantity"
                  />
                </div>
              )}

              {(editingTransaction.type as string) !== 'EXPENSE' && (
                <div className="grid gap-2">
                  <Label>سعر الوحدة</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={editForm.unitPrice}
                    onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                    data-testid="input-edit-unit-price"
                  />
                </div>
              )}

              {(editingTransaction.type as string) !== 'EXPENSE' && (editingTransaction.type as string) !== 'RETURN' && (
                <div className="grid gap-2">
                  <Label>العميل</Label>
                  <Popover open={editCustomerSearchOpen} onOpenChange={setEditCustomerSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                        data-testid="select-edit-customer"
                      >
                        {editForm.customerId
                          ? customers.find(c => c.id === editForm.customerId)?.name || "اختر العميل"
                          : "اختر العميل"}
                        <span className="mr-2 h-4 w-4 shrink-0 opacity-50">▼</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command filter={(value, search) => {
                        const customer = customers.find(c => c.id === value);
                        if (!customer) return 0;
                        return normalizeArabic(customer.name).includes(normalizeArabic(search)) ? 1 : 0;
                      }}>
                        <CommandInput placeholder="ابحث عن العميل..." />
                        <CommandList>
                          <CommandEmpty>لا يوجد عميل بهذا الاسم</CommandEmpty>
                          <CommandGroup>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.id}
                                onSelect={(value) => {
                                  setEditForm({ ...editForm, customerId: value });
                                  setEditCustomerSearchOpen(false);
                                }}
                              >
                                <Check className={`ml-2 h-4 w-4 ${editForm.customerId === customer.id ? "opacity-100" : "opacity-0"}`} />
                                {customer.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="grid gap-2">
                <Label>ملاحظات</Label>
                <Input
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  data-testid="input-edit-notes"
                />
              </div>

              {(editingTransaction.type as string) !== 'EXPENSE' && editForm.unitPrice && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    الإجمالي: <span className="font-bold text-blue-600">
                      {(parseFloat(editForm.unitPrice || "0") * editForm.quantity).toFixed(2)} ر.س
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingTransaction(null)}
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!editingTransaction) return;
                updateTransaction.mutate({
                  id: editingTransaction.id,
                  updates: {
                    quantity: editForm.quantity,
                    unitPrice: editForm.unitPrice,
                    customerId: editForm.customerId || undefined,
                    notes: editForm.notes,
                  },
                });
              }}
              disabled={updateTransaction.isPending}
              data-testid="button-save-edit"
            >
              {updateTransaction.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">تحميل خبز للمندوب</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>المنتج *</Label>
              <Select value={loadProductId} onValueChange={setLoadProductId}>
                <SelectTrigger data-testid="select-load-product">
                  <SelectValue placeholder="اختر المنتج" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
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
                value={loadQuantity}
                onChange={(e) => setLoadQuantity(e.target.value)}
                placeholder="أدخل الكمية"
                data-testid="input-load-quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsLoadDialogOpen(false); setLoadProductId(""); setLoadQuantity(""); }}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                const qty = parseInt(loadQuantity);
                if (!loadProductId || !qty || qty <= 0) {
                  toast({ title: "يرجى اختيار المنتج وإدخال الكمية", variant: "destructive" });
                  return;
                }
                loadInventory.mutate({ productId: loadProductId, quantity: qty });
              }}
              disabled={loadInventory.isPending}
              data-testid="button-confirm-load"
            >
              {loadInventory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحميل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
