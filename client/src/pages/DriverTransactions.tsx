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
import { Plus, Loader2, DollarSign, Package, ShoppingCart, Undo2, Gift, FileText, Check, UserPlus, CheckCircle, Edit3, Banknote, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type TransactionType, type InsertTransaction, type Transaction, type DriverInventory, type DriverBalance, type CustomerDebt, type Order, type CashDeposit } from "@/lib/api";
import { useProducts, useCustomers, useCreateCustomer, useOrders } from "@/hooks/useData";
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

  const createOrderMutation = useMutation({
    mutationFn: api.createOrder,
    onSuccess: () => {
      toast({ title: "تم إنشاء طلب الخبز بنجاح" });
      setOrderItems([]);
      setIsOrderDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في إنشاء الطلب", variant: "destructive" });
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
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  
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
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number }[]>([]);
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

  const handleSubmitOrder = () => {
    if (orderItems.length === 0) {
      toast({ title: "يرجى إضافة منتج واحد على الأقل", variant: "destructive" });
      return;
    }

    const totalAmount = orderItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (parseFloat(product?.price || "0") * item.quantity);
    }, 0);

    createOrderMutation.mutate({
      customerId: driverId,
      date: new Date().toISOString().split('T')[0],
      status: "DRAFT" as any,
      totalAmount: totalAmount.toFixed(2),
      items: orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      })) as any,
    });
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { productId: "", quantity: 1 }]);
  };

  const updateOrderItem = (index: number, field: "productId" | "quantity", value: string | number) => {
    const newItems = [...orderItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setOrderItems(newItems);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
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
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => setIsOrderDialogOpen(true)} 
              variant="outline"
              className="w-full sm:w-auto flex-row gap-2 rounded-xl h-11 px-6 font-bold border-amber-500 text-amber-700 hover:bg-amber-50"
              data-testid="button-new-order"
            >
              <ShoppingCart className="h-4 w-4" /> طلب خبز
            </Button>
            <Button 
              onClick={() => setIsCreateOpen(true)} 
              className="w-full sm:w-auto flex-row gap-2 bg-primary hover:bg-primary/90 rounded-xl h-11 px-6 shadow-lg shadow-primary/20 font-bold"
              data-testid="button-new-transaction"
            >
              <Plus className="h-4 w-4" /> عملية جديدة
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                الرصيد النقدي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold text-green-600" data-testid="text-cash-balance">
                {parseFloat(balance?.cashBalance || "0").toFixed(2)} ر.س
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setIsDepositDialogOpen(true)}
                data-testid="button-open-deposit-dialog"
              >
                <Banknote className="h-4 w-4 ml-2" />
                تسليم مبلغ للمخبز
              </Button>
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

        {/* قسم طلبات الخبز */}
        {(pendingOrders.length > 0 || assignedOrders.length > 0) && (
          <Card className="border-slate-100 mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                طلبات الخبز
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* طلبات تنتظر تأكيد الاستلام */}
              {pendingOrders.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    طلبات تنتظر التأكيد ({pendingOrders.length})
                  </h4>
                  {pendingOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-lg p-3 mb-2 border border-amber-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-slate-500">#{order.id.slice(0, 8)}</span>
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                          بانتظار التأكيد
                        </Badge>
                      </div>
                      <div className="space-y-1 mb-3">
                        {order.items?.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{getProductName(item.productId)}</span>
                            <span className="font-bold">{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleConfirmReceipt(order)}
                          disabled={confirmReceipt.isPending}
                          className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                          data-testid={`btn-confirm-receipt-${order.id}`}
                        >
                          {confirmReceipt.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              تأكيد الاستلام
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenModifyDialog(order)}
                          className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50 gap-2"
                          data-testid={`btn-modify-order-${order.id}`}
                        >
                          <Edit3 className="h-4 w-4" />
                          تعديل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* الطلبات المستلمة من الإدارة */}
              {assignedOrders.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    طلبات مستلمة من المخبز ({assignedOrders.length})
                  </h4>
                  {assignedOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-lg p-3 mb-2 border border-green-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-slate-500">#{order.id.slice(0, 8)}</span>
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          تم الاستلام
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {order.items?.map(item => {
                          const received = item.receivedQuantity ?? item.quantity;
                          const isDifferent = item.receivedQuantity !== undefined && item.receivedQuantity !== item.quantity;
                          return (
                            <div key={item.id} className="flex justify-between text-sm items-center">
                              <span className="flex items-center gap-1">
                                {isDifferent && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                                {getProductName(item.productId)}
                              </span>
                              <span className={`font-bold ${isDifferent ? 'text-amber-600' : 'text-green-600'}`}>
                                {received}
                                {isDifferent && (
                                  <span className="text-xs text-slate-400 mr-1">
                                    (طلب: {item.quantity})
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

        {/* تقرير السائق */}
        <Card className="border-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تقرير السائق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* إجمالي الخبز المستلم */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-sm text-green-600 mb-1">إجمالي الخبز المستلم</p>
                <p className="text-2xl font-bold text-green-700" data-testid="report-total-received">
                  {assignedOrders.reduce((sum, order) => 
                    sum + (order.items?.reduce((itemSum, item) => 
                      itemSum + (item.receivedQuantity ?? item.quantity), 0) || 0), 0)}
                </p>
              </div>

              {/* إجمالي المرتجع */}
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-sm text-orange-600 mb-1">المرتجع إلى المخبز</p>
                <p className="text-2xl font-bold text-orange-700" data-testid="report-total-returns">
                  {transactions.filter(t => t.type === 'RETURN').reduce((sum, t) => sum + t.quantity, 0)}
                </p>
              </div>

              {/* التوزيع المجاني */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-sm text-purple-600 mb-1">التوزيع المجاني</p>
                <p className="text-2xl font-bold text-purple-700" data-testid="report-free-distribution">
                  {transactions.filter(t => t.type === 'FREE_DISTRIBUTION').reduce((sum, t) => sum + t.quantity, 0)}
                </p>
              </div>

              {/* العينات المجانية */}
              <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                <p className="text-sm text-pink-600 mb-1">العينات المجانية</p>
                <p className="text-2xl font-bold text-pink-700" data-testid="report-free-samples">
                  {transactions.filter(t => t.type === 'FREE_SAMPLE').reduce((sum, t) => sum + t.quantity, 0)}
                </p>
              </div>

              {/* إجمالي المبيعات */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm text-blue-600 mb-1">إجمالي المبيعات</p>
                <p className="text-2xl font-bold text-blue-700" data-testid="report-total-sales">
                  {transactions.filter(t => t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE')
                    .reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0).toFixed(2)} ر.س
                </p>
              </div>

              {/* بيع نقدي */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-sm text-emerald-600 mb-1">بيع نقدي</p>
                <p className="text-2xl font-bold text-emerald-700" data-testid="report-cash-sales">
                  {transactions.filter(t => t.type === 'CASH_SALE')
                    .reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0).toFixed(2)} ر.س
                </p>
              </div>

              {/* بيع آجل */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-sm text-amber-600 mb-1">بيع آجل</p>
                <p className="text-2xl font-bold text-amber-700" data-testid="report-credit-sales">
                  {transactions.filter(t => t.type === 'CREDIT_SALE')
                    .reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0).toFixed(2)} ر.س
                </p>
              </div>

              {/* الفروقات */}
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <p className="text-sm text-red-600 mb-1">الفروقات</p>
                <p className="text-2xl font-bold text-red-700" data-testid="report-difference">
                  {(() => {
                    const received = assignedOrders.reduce((sum, order) => 
                      sum + (order.items?.reduce((itemSum, item) => 
                        itemSum + (item.receivedQuantity ?? item.quantity), 0) || 0), 0);
                    const sold = transactions.filter(t => t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE')
                      .reduce((sum, t) => sum + t.quantity, 0);
                    const returned = transactions.filter(t => t.type === 'RETURN').reduce((sum, t) => sum + t.quantity, 0);
                    const free = transactions.filter(t => t.type === 'FREE_DISTRIBUTION' || t.type === 'FREE_SAMPLE')
                      .reduce((sum, t) => sum + t.quantity, 0);
                    const currentInventory = inventory.reduce((sum, i) => sum + i.quantity, 0);
                    return received - sold - returned - free - currentInventory;
                  })()}
                </p>
              </div>

              {/* المبالغ الموردة للمخبز */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 col-span-2">
                <p className="text-sm text-slate-600 mb-1">المبالغ الموردة للمخبز</p>
                <p className="text-2xl font-bold text-slate-700" data-testid="report-deposits">
                  {cashDeposits.filter(d => d.status === 'CONFIRMED')
                    .reduce((sum, d) => sum + parseFloat(d.amount), 0).toFixed(2)} ر.س
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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

      {/* حوار إنشاء طلب خبز */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>طلب خبز جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {orderItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">المنتج</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(value) => updateOrderItem(index, "productId", value)}
                    >
                      <SelectTrigger>
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
                  <div className="w-24">
                    <Label className="text-xs">الكمية</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateOrderItem(index, "quantity", parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeOrderItem(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={addOrderItem}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة منتج
            </Button>
            {orderItems.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-sm font-bold">
                  الإجمالي: {orderItems.reduce((sum, item) => {
                    const product = products.find(p => p.id === item.productId);
                    return sum + (parseFloat(product?.price || "0") * item.quantity);
                  }, 0).toFixed(2)} ر.س
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsOrderDialogOpen(false); setOrderItems([]); }}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSubmitOrder}
              disabled={createOrderMutation.isPending || orderItems.length === 0 || orderItems.some(item => !item.productId)}
              data-testid="button-submit-order"
            >
              {createOrderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال الطلب"}
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
    </AdminLayout>
  );
}
