import { useState, useRef } from "react";
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
import { Plus, Loader2, DollarSign, Package, ShoppingCart, Undo2, Gift, FileText, Check, UserPlus, CheckCircle, Edit3, Banknote, AlertTriangle, Users, Trash2, Truck, BarChart3, Download, Upload } from "lucide-react";
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
  DRIVER_DEBT: { label: "مديونية على المندوب", icon: <Banknote className="h-4 w-4" />, color: "bg-rose-600" },
};

export default function DriverTransactionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = useStore(state => state.user);
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUB_ADMIN';
  const canExportCSV = currentUser?.role !== 'SUB_ADMIN';
  const { data: users = [] } = useUsers();
  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const driverId = isAdmin ? selectedDriverId : (currentUser?.id || "");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useOrders();
  
  // طلبات السائق التي تحتاج تأكيد استلام
  const pendingOrders = orders.filter(o => o.customerId === driverId && o.status === 'CONFIRMED');
  
  // طلبات السائق المؤكدة من الإدارة (المستلمة)
  const assignedOrders = orders.filter(o => o.customerId === driverId && o.status === 'ASSIGNED');
  
  // طلبات تم تسليمها للعملاء
  const deliveredOrders = orders.filter(o => o.customerId === driverId && o.status === 'DELIVERED');
  
  const { data: allDriverTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["driver-transactions", driverId],
    queryFn: () => api.getDriverTransactions(driverId),
    enabled: !!driverId,
  });

  const { data: allSystemTransactions = [] } = useQuery({
    queryKey: ["all-transactions"],
    queryFn: () => api.getAllTransactions(),
    enabled: isAdmin && !driverId,
  });

  const transactions = allDriverTransactions.filter(t =>
    t.createdAt && format(new Date(t.createdAt), 'yyyy-MM-dd') === selectedDate
  );

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
    mutationFn: ({ productId, quantity, mode }: { productId: string; quantity: number; mode: 'load' | 'return' }) =>
      api.loadDriverInventory(driverId, productId, quantity, mode),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["driver-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: variables.mode === 'return' ? "تم إرجاع الخبز للمخبز بنجاح" : "تم تحميل الخبز للمندوب بنجاح" });
      setIsLoadDialogOpen(false);
      setLoadProductId("");
      setLoadQuantity("");
      setLoadMode("load");
    },
    onError: (error: any) => {
      const message = error?.message || "حدث خطأ";
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
      toast({ title: "تم استلام المبلغ", description: isAdmin ? "تم التأكيد تلقائياً" : "سيتم خصم المبلغ بعد تأكيد المخبز" });
      setDepositAmount("");
      setDepositNotes("");
      setIsDepositDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["driver-cash-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["driver-balance"] });
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
  const [loadMode, setLoadMode] = useState<'load' | 'return'>('load');
  const [duplicateWarning, setDuplicateWarning] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [loadProductId, setLoadProductId] = useState("");
  const [loadQuantity, setLoadQuantity] = useState<string>("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerLocationUrl, setNewCustomerLocationUrl] = useState("");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseDescription, setExpenseDescription] = useState<string>("");
  const [expenseReceiptFile, setExpenseReceiptFile] = useState<File | null>(null);
  const [expenseReceiptPreview, setExpenseReceiptPreview] = useState<string>("");
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [debtSubType, setDebtSubType] = useState<"cash" | "bread">("cash");
  
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
    setDebtSubType("cash");
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

  const checkDuplicateAndSubmit = (txData: { type: string; customerId?: string; productId?: string; quantity: number }, submitFn: () => void) => {
    const isDuplicate = transactions.some(t =>
      t.type === txData.type &&
      t.customerId === txData.customerId &&
      t.productId === txData.productId &&
      t.quantity === txData.quantity
    );
    if (isDuplicate) {
      const customerName = txData.customerId ? (customers.find(c => c.id === txData.customerId)?.name || '') : '';
      const typeName = transactionTypeLabels[txData.type]?.label || txData.type;
      setDuplicateWarning({
        message: `توجد عملية مشابهة (${typeName}${customerName ? ' - ' + customerName : ''} - ${txData.quantity} قطعة) مسجلة مسبقاً اليوم. هل تريد المتابعة؟`,
        onConfirm: () => { setDuplicateWarning(null); submitFn(); },
      });
      return;
    }
    submitFn();
  };

  const handleSubmit = async () => {
    // معالجة خاصة للمديونية على المندوب
    if ((formData.type as string) === 'DRIVER_DEBT') {
      if (!expenseDescription.trim()) {
        toast({ title: "يرجى إدخال وصف المديونية", variant: "destructive" });
        return;
      }

      const defaultCustomer = customers[0];
      if (!defaultCustomer) {
        toast({ title: "يجب وجود عميل واحد على الأقل في النظام", variant: "destructive" });
        return;
      }

      if (debtSubType === 'bread') {
        if (!formData.productId) {
          toast({ title: "يرجى اختيار المنتج", variant: "destructive" });
          return;
        }
        const qty = formData.quantity || 1;
        if (qty <= 0) {
          toast({ title: "يرجى إدخال كمية صحيحة", variant: "destructive" });
          return;
        }
        const product = products.find(p => p.id === formData.productId);
        const unitPrice = product?.price || "0";
        const totalAmount = (parseFloat(unitPrice) * qty).toFixed(2);

        createTransaction.mutate({
          type: 'DRIVER_DEBT' as TransactionType,
          driverId: driverId,
          productId: formData.productId,
          quantity: qty,
          customerId: defaultCustomer.id,
          unitPrice,
          totalAmount,
          notes: `فرق خبز: ${expenseDescription}${formData.notes ? ' - ' + formData.notes : ''}`,
          createdAt: new Date(selectedDate + 'T12:00:00').toISOString(),
        });
      } else {
        const amount = parseFloat(expenseAmount);
        if (!amount || amount <= 0) {
          toast({ title: "يرجى إدخال مبلغ المديونية", variant: "destructive" });
          return;
        }
        const defaultProduct = products[0];
        if (!defaultProduct) {
          toast({ title: "يجب وجود منتج واحد على الأقل في النظام", variant: "destructive" });
          return;
        }

        createTransaction.mutate({
          type: 'DRIVER_DEBT' as TransactionType,
          driverId: driverId,
          productId: defaultProduct.id,
          quantity: 0,
          customerId: defaultCustomer.id,
          unitPrice: "0",
          totalAmount: amount.toFixed(2),
          notes: `فرق نقدي: ${expenseDescription}${formData.notes ? ' - ' + formData.notes : ''}`,
          createdAt: new Date(selectedDate + 'T12:00:00').toISOString(),
        });
      }
      return;
    }

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

      const defaultProduct = products[0];
      const defaultCustomer = customers[0];
      
      if (!defaultProduct || !defaultCustomer) {
        toast({ title: "يجب وجود منتج وعميل واحد على الأقل في النظام", variant: "destructive" });
        return;
      }

      let receiptUrl: string | undefined;
      if (expenseReceiptFile) {
        if (expenseReceiptFile.size > 50 * 1024 * 1024) {
          toast({ title: "حجم الملف يتجاوز 50 ميغابايت", variant: "destructive" });
          return;
        }
        setIsUploadingReceipt(true);
        try {
          const fd = new FormData();
          fd.append("receipt", expenseReceiptFile);
          const uploadRes = await fetch("/api/upload-receipt", { method: "POST", body: fd });
          if (!uploadRes.ok) {
            const err = await uploadRes.json();
            toast({ title: "خطأ في رفع الصورة", description: err.message, variant: "destructive" });
            setIsUploadingReceipt(false);
            return;
          }
          const { url } = await uploadRes.json();
          receiptUrl = url;
        } catch {
          toast({ title: "خطأ في رفع الصورة", variant: "destructive" });
          setIsUploadingReceipt(false);
          return;
        }
        setIsUploadingReceipt(false);
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
        receiptImage: receiptUrl || null,
        createdAt: new Date(selectedDate + 'T12:00:00').toISOString(),
      });
      setExpenseReceiptFile(null);
      setExpenseReceiptPreview("");
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

    const doSubmit = () => {
      createTransaction.mutate({
        type: formData.type as TransactionType,
        driverId: driverId,
        productId: formData.productId,
        quantity: requestedQuantity,
        customerId: customerId!,
        unitPrice,
        totalAmount,
        notes: formData.notes,
        createdAt: new Date(selectedDate + 'T12:00:00').toISOString(),
      });
    };

    checkDuplicateAndSubmit({ type: formData.type as string, customerId: customerId!, productId: formData.productId, quantity: requestedQuantity }, doSubmit);
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
      ...(isAdmin && currentUser ? { confirmedBy: currentUser.id } : {}),
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

  const driverCustomers = customers.filter(c => c.driverId === driverId);

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

  const totalFreeDistribution = transactions
    .filter(t => t.type === 'FREE_DISTRIBUTION' || t.type === 'FREE_SAMPLE')
    .reduce((sum, t) => sum + t.quantity, 0);

  const totalLoadedBread = totalSoldBread + totalReturnAndDamaged + totalFreeDistribution + totalCurrentInventory;

  const moghallafProduct = products.find(p => p.name === 'مغلف');
  const salesExcludingMoghallaf = transactions
    .filter(t => (t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE') && t.productId !== moghallafProduct?.id);
  const avgSalePriceQty = salesExcludingMoghallaf.reduce((sum, t) => sum + t.quantity, 0);
  const avgSalePriceTotal = salesExcludingMoghallaf.reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
  const avgSalePrice = avgSalePriceQty > 0 ? avgSalePriceTotal / avgSalePriceQty : 0;

  const logTransactions = transactions;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // حساب إجمالي المصروفات
  const totalExpenses = transactions
    .filter(t => (t.type as string) === 'EXPENSE')
    .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);

  const dailyCashSales = transactions
    .filter(t => t.type === 'CASH_SALE')
    .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
  const dailyCreditSales = transactions
    .filter(t => t.type === 'CREDIT_SALE')
    .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
  const dailyPaidToBakery = cashDeposits
    .filter(d => d.depositDate === selectedDate && d.status === 'CONFIRMED')
    .reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0);
  const driverCashBalance = totalSoldValue - dailyPaidToBakery - dailyCreditSales;

  const allTotalSales = allDriverTransactions
    .filter(t => t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE')
    .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
  const allCreditSales = allDriverTransactions
    .filter(t => t.type === 'CREDIT_SALE')
    .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
  const allPaidToBakery = cashDeposits
    .filter(d => d.status === 'CONFIRMED')
    .reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0);
  const cumulativeBalance = allTotalSales - allPaidToBakery - allCreditSales;

  const driverName = users.find(u => u.id === driverId)?.name || '';

  const handleExportCSV = () => {
    const esc = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const headers = ['التاريخ', 'المندوب', 'النوع', 'المنتج', 'الكمية', 'سعر الوحدة', 'المبلغ', 'العميل', 'ملاحظات'];
    const csvRows = [headers.map(esc).join(',')];

    const typeReverseMap: Record<string, string> = {
      CASH_SALE: 'بيع نقدي',
      CREDIT_SALE: 'بيع آجل',
      RETURN: 'مرتجع',
      FREE_DISTRIBUTION: 'توزيع مجاني',
      FREE_SAMPLE: 'عينات',
      DAMAGED: 'تالف',
      EXPENSE: 'مصروفات',
      DRIVER_DEBT: 'مديونية على المندوب',
    };

    transactions.forEach(tx => {
      const isExpenseType = (tx.type as string) === 'EXPENSE';
      const isDriverDebt = (tx.type as string) === 'DRIVER_DEBT';
      const isBreadDebt = isDriverDebt && tx.quantity > 0;
      const isExpense = isExpenseType || (isDriverDebt && !isBreadDebt);

      const cols = [
        tx.createdAt ? format(new Date(tx.createdAt), 'yyyy-MM-dd') : selectedDate,
        esc(driverName),
        esc(typeReverseMap[tx.type] || tx.type),
        esc(isExpense ? '' : getProductName(tx.productId)),
        isExpense ? '0' : String(tx.quantity),
        isExpense ? '0' : String(tx.unitPrice || '0'),
        String(tx.totalAmount || '0'),
        esc((isExpense || isDriverDebt) ? '' : getCustomerName(tx.customerId)),
        esc(tx.notes || ''),
      ];
      csvRows.push(cols.join(','));
    });

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `عمليات_${driverName || 'المندوب'}_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadImportTemplate = () => {
    const driverNames = drivers.map(d => d.name).join(' / ');
    const productNames = products.map(p => p.name).join(' / ');
    const customerNames = customers.slice(0, 3).map(c => c.name).join(' / ');
    const types = 'بيع نقدي / بيع آجل / مرتجع / توزيع مجاني / عينات / تالف / مصروفات / مديونية على المندوب';

    const headers = 'التاريخ,المندوب,النوع,المنتج,الكمية,سعر الوحدة,المبلغ,العميل,ملاحظات';
    const instructions = [
      `# التاريخ: بصيغة YYYY-MM-DD مثال: ${format(new Date(), 'yyyy-MM-dd')}`,
      `# المناديب المتاحون: ${driverNames}`,
      `# أنواع العمليات: ${types}`,
      `# المنتجات المتاحة: ${productNames}`,
      `# العملاء (أمثلة): ${customerNames || 'لا يوجد عملاء'}`,
      `# الكمية: عدد صحيح (للمصروفات والمديونية النقدية اتركه 0)`,
      `# سعر الوحدة: سعر القطعة الواحدة`,
      `# المبلغ: يُحسب تلقائياً (الكمية × السعر) - للمصروفات والمديونية ضع المبلغ هنا`,
      `# العميل: مطلوب للبيع الآجل - اختياري للبيع النقدي`,
      `# ملاحظات: اختيارية (مطلوبة للمصروفات والمديونية)`,
    ];
    const example1 = `${format(new Date(), 'yyyy-MM-dd')},${drivers[0]?.name || 'اسم المندوب'},بيع نقدي,${products[0]?.name || 'اسم المنتج'},100,0.50,,${customers[0]?.name || ''},`;
    const example2 = `${format(new Date(), 'yyyy-MM-dd')},${drivers[0]?.name || 'اسم المندوب'},بيع آجل,${products[0]?.name || 'اسم المنتج'},50,0.50,,${customers[0]?.name || 'اسم العميل'},`;
    const example3 = `${format(new Date(), 'yyyy-MM-dd')},${drivers[0]?.name || 'اسم المندوب'},مرتجع,${products[0]?.name || 'اسم المنتج'},20,0,,,`;
    const example4 = `${format(new Date(), 'yyyy-MM-dd')},${drivers[0]?.name || 'اسم المندوب'},مصروفات,,0,0,50,,بنزين`;

    const csvContent = instructions.join('\n') + '\n' + headers + '\n' + example1 + '\n' + example2 + '\n' + example3 + '\n' + example4;
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `نموذج_استيراد_عمليات.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

      if (lines.length < 2) {
        toast({ title: "خطأ", description: "الملف فارغ أو لا يحتوي على بيانات", variant: "destructive" });
        return;
      }

      const headerLine = lines[0];
      const csvHeaders = headerLine.split(',').map(h => h.trim());

      const dateIdx = csvHeaders.indexOf('التاريخ');
      const driverIdx = csvHeaders.indexOf('المندوب');
      const typeIdx = csvHeaders.indexOf('النوع');
      const productIdx = csvHeaders.indexOf('المنتج');
      const qtyIdx = csvHeaders.indexOf('الكمية');
      const priceIdx = csvHeaders.indexOf('سعر الوحدة');
      const amountIdx = csvHeaders.indexOf('المبلغ');
      const customerIdx = csvHeaders.indexOf('العميل');
      const notesIdx = csvHeaders.indexOf('ملاحظات');

      const rows = [];
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const ch = line[j];
          if (inQuotes) {
            if (ch === '"' && line[j + 1] === '"') { current += '"'; j++; }
            else if (ch === '"') { inQuotes = false; }
            else { current += ch; }
          } else {
            if (ch === '"') { inQuotes = true; }
            else if (ch === ',') { result.push(current.trim()); current = ''; }
            else { current += ch; }
          }
        }
        result.push(current.trim());
        return result;
      };

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.every(c => !c)) continue;
        rows.push({
          date: dateIdx >= 0 ? cols[dateIdx] : '',
          driverName: driverIdx >= 0 ? cols[driverIdx] : '',
          type: typeIdx >= 0 ? cols[typeIdx] : '',
          productName: productIdx >= 0 ? cols[productIdx] : '',
          quantity: qtyIdx >= 0 ? cols[qtyIdx] : '0',
          unitPrice: priceIdx >= 0 ? cols[priceIdx] : '0',
          totalAmount: amountIdx >= 0 ? cols[amountIdx] : '0',
          customerName: customerIdx >= 0 ? cols[customerIdx] : '',
          notes: notesIdx >= 0 ? cols[notesIdx] : '',
        });
      }

      if (rows.length === 0) {
        toast({ title: "خطأ", description: "لا توجد بيانات صالحة في الملف", variant: "destructive" });
        return;
      }

      const result = await api.bulkImportTransactions(rows);
      const errors = result.results?.filter((r: any) => r.status === 'error') || [];

      if (errors.length > 0) {
        const errorMessages = errors.slice(0, 5).map((e: any) => `سطر ${e.row}: ${e.error}`).join('\n');
        toast({
          title: result.message,
          description: errorMessages + (errors.length > 5 ? `\n... و ${errors.length - 5} أخطاء أخرى` : ''),
          variant: errors.length === rows.length ? "destructive" : "default",
        });
      } else {
        toast({ title: "تم بنجاح", description: result.message });
      }

      queryClient.invalidateQueries({ queryKey: ["driver-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["driver-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["driver-balance"] });
      queryClient.invalidateQueries({ queryKey: ["driver-debts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["allCustomerDebts"] });
    } catch (error: any) {
      toast({ title: "خطأ في الاستيراد", description: error.message || "حدث خطأ أثناء استيراد البيانات", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 font-black">العمليات الميدانية</h1>
            <p className="text-sm text-muted-foreground">إدارة عمليات البيع والتوزيع</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => setIsCreateOpen(true)} 
              className="flex-row gap-2 bg-primary hover:bg-primary/90 rounded-xl h-11 px-6 shadow-lg shadow-primary/20 font-bold"
              data-testid="button-new-transaction"
              disabled={isAdmin && !driverId}
            >
              <Plus className="h-4 w-4" /> عملية جديدة
            </Button>
            <Button 
              onClick={() => setIsLoadDialogOpen(true)} 
              className="flex-row gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl h-11 px-6 shadow-lg shadow-blue-600/20 font-bold"
              data-testid="button-load-bread"
              disabled={isAdmin && !driverId}
            >
              <Truck className="h-4 w-4" /> تحميل خبز
            </Button>
            {canExportCSV && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                  data-testid="input-import-csv"
                />
                <Button
                  variant="outline"
                  className="flex-row gap-2 rounded-xl h-11 font-bold"
                  onClick={downloadImportTemplate}
                  data-testid="btn-download-template"
                >
                  <Download className="h-4 w-4" /> تحميل النموذج
                </Button>
                <Button
                  variant="outline"
                  className="flex-row gap-2 rounded-xl h-11 font-bold"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  data-testid="btn-import-csv"
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  استيراد CSV
                </Button>
                <Button
                  variant="outline"
                  className="flex-row gap-2 rounded-xl h-11 font-bold"
                  onClick={handleExportCSV}
                  disabled={!driverId || transactions.length === 0}
                  data-testid="btn-export-csv"
                >
                  <Download className="h-4 w-4" /> تصدير CSV
                </Button>
              </>
            )}
          </div>
        </div>

        {isAdmin && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-4">
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
                <div className="flex items-center gap-2 mr-auto">
                  <Label className="font-bold whitespace-nowrap">التاريخ:</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-44 bg-white"
                    data-testid="input-date-filter"
                  />
                  {selectedDate !== format(new Date(), 'yyyy-MM-dd') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                      data-testid="button-reset-date"
                    >
                      اليوم
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isAdmin && !driverId && (() => {
          const dateTx = allSystemTransactions.filter(t =>
            t.createdAt && format(new Date(t.createdAt), 'yyyy-MM-dd') === selectedDate
          );
          const driverMap = new Map<string, { name: string; cashSales: number; creditSales: number; totalAmount: number; totalQty: number; returnQty: number; expenses: number; customerCount: number }>();
          dateTx.forEach(t => {
            if (!driverMap.has(t.driverId)) {
              const d = drivers.find(dr => dr.id === t.driverId);
              driverMap.set(t.driverId, { name: d?.name || 'غير معروف', cashSales: 0, creditSales: 0, totalAmount: 0, totalQty: 0, returnQty: 0, expenses: 0, customerCount: 0 });
            }
            const entry = driverMap.get(t.driverId)!;
            const amount = parseFloat(t.totalAmount || "0");
            if (t.type === 'CASH_SALE') { entry.cashSales += amount; entry.totalQty += t.quantity; }
            else if (t.type === 'CREDIT_SALE') { entry.creditSales += amount; entry.totalQty += t.quantity; }
            else if (t.type === 'RETURN') { entry.returnQty += t.quantity; }
            else if ((t.type as string) === 'EXPENSE') { entry.expenses += amount; }
          });
          driverMap.forEach((entry, did) => {
            entry.totalAmount = entry.cashSales + entry.creditSales;
            const served = new Set(dateTx.filter(t => t.driverId === did && (t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE')).map(t => t.customerId).filter(Boolean));
            entry.customerCount = served.size;
          });
          const driverRows = Array.from(driverMap.entries()).sort((a, b) => b[1].totalAmount - a[1].totalAmount);

          if (driverRows.length === 0) {
            return (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg">لا توجد عمليات في هذا اليوم</p>
              </div>
            );
          }

          const totals = driverRows.reduce((acc, [, d]) => ({
            cashSales: acc.cashSales + d.cashSales,
            creditSales: acc.creditSales + d.creditSales,
            totalAmount: acc.totalAmount + d.totalAmount,
            totalQty: acc.totalQty + d.totalQty,
            returnQty: acc.returnQty + d.returnQty,
            expenses: acc.expenses + d.expenses,
            customerCount: acc.customerCount + d.customerCount,
          }), { cashSales: 0, creditSales: 0, totalAmount: 0, totalQty: 0, returnQty: 0, expenses: 0, customerCount: 0 });

          return (
            <Card className="border-slate-100">
              <CardHeader className="bg-gradient-to-l from-blue-50 to-indigo-50 rounded-t-lg">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  ملخص عمليات جميع المناديب - {format(new Date(selectedDate), 'EEEE dd/MM/yyyy', { locale: ar })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-right font-bold">المندوب</TableHead>
                        <TableHead className="text-right font-bold">الكمية المباعة</TableHead>
                        <TableHead className="text-right font-bold">النقدي</TableHead>
                        <TableHead className="text-right font-bold">الآجل</TableHead>
                        <TableHead className="text-right font-bold">الإجمالي</TableHead>
                        <TableHead className="text-right font-bold">المصروفات</TableHead>
                        <TableHead className="text-right font-bold">الصافي</TableHead>
                        <TableHead className="text-right font-bold">العملاء</TableHead>
                        <TableHead className="text-right font-bold">عرض</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driverRows.map(([did, d]) => (
                        <TableRow key={did} data-testid={`all-drivers-row-${did}`}>
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell className="text-blue-700 font-bold">{d.totalQty}</TableCell>
                          <TableCell className="text-emerald-600">{d.cashSales.toFixed(2)}</TableCell>
                          <TableCell className="text-yellow-600">{d.creditSales > 0 ? d.creditSales.toFixed(2) : '-'}</TableCell>
                          <TableCell className="text-blue-600 font-bold">{d.totalAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-red-600">{d.expenses > 0 ? d.expenses.toFixed(2) : '-'}</TableCell>
                          <TableCell className="text-teal-700 font-bold">{(d.cashSales - d.expenses).toFixed(2)}</TableCell>
                          <TableCell className="text-purple-600">{d.customerCount}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-indigo-600 hover:text-indigo-800"
                              onClick={() => setSelectedDriverId(did)}
                              data-testid={`btn-select-driver-${did}`}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-100 font-bold border-t-2">
                        <TableCell className="font-bold">الإجمالي</TableCell>
                        <TableCell className="text-blue-700 font-bold">{totals.totalQty}</TableCell>
                        <TableCell className="text-emerald-600">{totals.cashSales.toFixed(2)}</TableCell>
                        <TableCell className="text-yellow-600">{totals.creditSales > 0 ? totals.creditSales.toFixed(2) : '-'}</TableCell>
                        <TableCell className="text-blue-600 font-bold">{totals.totalAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-red-600">{totals.expenses > 0 ? totals.expenses.toFixed(2) : '-'}</TableCell>
                        <TableCell className="text-teal-700 font-bold">{(totals.cashSales - totals.expenses).toFixed(2)}</TableCell>
                        <TableCell className="text-purple-600">{totals.customerCount}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {(!isAdmin || driverId) && (<>
        {/* بطاقة الرصيد النقدي الكبيرة */}
        <Card className={`border shadow-sm mb-4 ${cumulativeBalance >= 0 ? 'border-blue-200 bg-blue-50/50' : 'border-red-200 bg-red-50/50'}`}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${cumulativeBalance >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}>
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className={`text-xs font-medium ${cumulativeBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>رصيد المندوب التراكمي</p>
                  <div className={`text-2xl font-bold ${cumulativeBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`} data-testid="text-cumulative-balance">
                    {cumulativeBalance.toFixed(2)} <span className="text-sm">ر.س</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex gap-4 text-xs">
                  <span className="text-gray-600">المبيعات: <strong className="text-gray-800">{allTotalSales.toFixed(2)}</strong></span>
                  <span className="text-emerald-600">المدفوع: <strong>-{allPaidToBakery.toFixed(2)}</strong></span>
                  <span className="text-yellow-600">الآجل: <strong>-{allCreditSales.toFixed(2)}</strong></span>
                </div>
                <Button 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  onClick={() => setIsDepositDialogOpen(true)}
                  data-testid="button-open-deposit-dialog"
                >
                  <Banknote className="h-4 w-4 ml-1" />
                  تسليم للمخبز
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* الصف الأول: إحصائيات المخزون والمبيعات */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <Card className="border-slate-100 bg-blue-50 hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-xl">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600">الخبز المستلم</p>
                  <p className="text-2xl font-bold text-blue-700" data-testid="text-loaded-bread">{totalLoadedBread}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 bg-orange-50 hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-xl">
                  <Banknote className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-600">المدفوع للمخبز</p>
                  <p className="text-2xl font-bold text-orange-700" data-testid="text-paid-bakery-kpi">{dailyPaidToBakery.toFixed(2)}</p>
                  <p className="text-xs text-orange-600/70">ر.س</p>
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

          <Card className="border-slate-100 bg-teal-50 hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-500 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-teal-600">متوسط سعر البيع</p>
                  <p className="text-2xl font-bold text-teal-700" data-testid="text-avg-sale-price">{avgSalePrice.toFixed(2)}</p>
                  <p className="text-xs text-teal-600/70">ر.س (بدون المغلف)</p>
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
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-600">تالف</p>
                  <p className="text-2xl font-bold text-red-700" data-testid="text-damaged-bread">{totalDamagedBread}</p>
                  {totalLoadedBread > 0 && <p className="text-xs text-red-500">({(totalDamagedBread / totalLoadedBread * 100).toFixed(1)}%)</p>}
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

          <Card className="border-slate-100 bg-amber-50 hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-600">المخزون الحالي</p>
                  <p className="text-xl font-bold text-amber-700" data-testid="text-current-inventory">{totalCurrentInventory}</p>
                  <p className="text-xs text-amber-600/70">{totalCurrentInventoryValue.toFixed(2)} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                تتبع المدفوعات اليومية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">إجمالي المبيعات</span>
                  <span className="text-lg font-bold text-blue-800" data-testid="text-daily-total-sales">{totalSoldValue.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-700">النقدي</span>
                  <span className="text-lg font-bold text-green-800" data-testid="text-daily-cash-sales">{dailyCashSales.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm font-medium text-yellow-700">الآجل (غير مدفوع)</span>
                  <span className="text-lg font-bold text-yellow-800" data-testid="text-daily-credit-sales">{dailyCreditSales.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                  <span className="text-sm font-medium text-emerald-700">المدفوع للمخبز</span>
                  <span className="text-lg font-bold text-emerald-800" data-testid="text-daily-paid-bakery">{dailyPaidToBakery.toFixed(2)} ر.س</span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-lg ${driverCashBalance >= 0 ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                  <span className={`text-sm font-medium ${driverCashBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>رصيد المندوب</span>
                  <span className={`text-lg font-bold ${driverCashBalance >= 0 ? 'text-green-800' : 'text-red-800'}`} data-testid="text-driver-balance-summary">
                    {driverCashBalance.toFixed(2)} ر.س
                  </span>
                </div>
              </div>
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
                    <TableHead className="text-right">سعر البيع</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logTransactions.map((tx) => {
                    const typeInfo = transactionTypeLabels[tx.type];
                    const isExpenseType = (tx.type as string) === 'EXPENSE';
                    const isDriverDebt = (tx.type as string) === 'DRIVER_DEBT';
                    const isBreadDebt = isDriverDebt && tx.quantity > 0;
                    const isExpense = isExpenseType || (isDriverDebt && !isBreadDebt);
                    const txDate = tx.createdAt ? format(new Date(tx.createdAt), 'yyyy-MM-dd') : null;
                    const isToday = txDate === selectedDate;

                    let paymentStatus: 'unpaid' | 'partial' | 'paid' | null = null;
                    if (tx.type === 'CREDIT_SALE' && tx.customerId) {
                      const matchingDebt = debts.find(d =>
                        d.customerId === tx.customerId &&
                        d.driverId === tx.driverId &&
                        parseFloat(d.amount) === parseFloat(tx.totalAmount || "0") &&
                        d.createdAt && tx.createdAt &&
                        Math.abs(new Date(d.createdAt).getTime() - new Date(tx.createdAt).getTime()) < 60000
                      );
                      if (matchingDebt) {
                        const paid = parseFloat(matchingDebt.paidAmount || "0");
                        const total = parseFloat(matchingDebt.amount);
                        if (matchingDebt.isPaid || paid >= total) paymentStatus = 'paid';
                        else if (paid > 0) paymentStatus = 'partial';
                        else paymentStatus = 'unpaid';
                      } else {
                        const anyDebt = debts.find(d => d.customerId === tx.customerId && d.driverId === tx.driverId && parseFloat(d.amount) === parseFloat(tx.totalAmount || "0"));
                        if (anyDebt) {
                          const paid = parseFloat(anyDebt.paidAmount || "0");
                          const total = parseFloat(anyDebt.amount);
                          if (anyDebt.isPaid || paid >= total) paymentStatus = 'paid';
                          else if (paid > 0) paymentStatus = 'partial';
                          else paymentStatus = 'unpaid';
                        } else {
                          paymentStatus = 'unpaid';
                        }
                      }
                    }

                    return (
                      <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={`${typeInfo?.color || 'bg-gray-500'} text-white gap-1`}>
                              {typeInfo?.icon}
                              {typeInfo?.label || tx.type}
                            </Badge>
                            {paymentStatus === 'paid' && (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1">
                                <CheckCircle className="h-3 w-3" />
                                مدفوع كامل
                              </Badge>
                            )}
                            {paymentStatus === 'partial' && (
                              <Badge className="bg-amber-100 text-amber-700 text-xs gap-1">
                                <DollarSign className="h-3 w-3" />
                                مدفوع جزئي
                              </Badge>
                            )}
                            {paymentStatus === 'unpaid' && (
                              <Badge className="bg-red-100 text-red-700 text-xs gap-1">
                                غير مدفوع
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{isExpense ? (tx.notes || '-') : isBreadDebt ? `${getProductName(tx.productId)} (${tx.notes || ''})` : getProductName(tx.productId)}</span>
                            {tx.receiptImage && (
                              <a href={tx.receiptImage} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                عرض الفاتورة
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{isExpense ? '-' : tx.quantity}</TableCell>
                        <TableCell>{isExpense ? '-' : (tx.unitPrice ? `${parseFloat(tx.unitPrice).toFixed(2)} ر.س` : "-")}</TableCell>
                        <TableCell>{tx.totalAmount ? `${parseFloat(tx.totalAmount).toFixed(2)} ر.س` : "-"}</TableCell>
                        <TableCell>{(isExpense || isDriverDebt) ? '-' : getCustomerName(tx.customerId)}</TableCell>
                        <TableCell>
                          {tx.createdAt ? format(new Date(tx.createdAt), "dd/MM/yyyy HH:mm", { locale: ar }) : "-"}
                        </TableCell>
                        <TableCell>
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
                            {isToday && (
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
                            )}
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
                  {Object.entries(transactionTypeLabels).filter(([key]) => key !== 'RETURN').map(([key, { label, icon }]) => (
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

                <div className="grid gap-2">
                  <Label>صورة الفاتورة (اختياري - حد أقصى 50 ميغا)</Label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 hover:bg-muted/50 transition-colors" data-testid="input-expense-receipt">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {expenseReceiptFile ? expenseReceiptFile.name : "اختر صورة الفاتورة..."}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast({ title: "حجم الملف يتجاوز 50 ميغابايت", variant: "destructive" });
                              return;
                            }
                            setExpenseReceiptFile(file);
                            if (file.type.startsWith("image/")) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setExpenseReceiptPreview(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            } else {
                              setExpenseReceiptPreview("");
                            }
                          }
                        }}
                      />
                    </label>
                    {expenseReceiptFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setExpenseReceiptFile(null); setExpenseReceiptPreview(""); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {expenseReceiptPreview && (
                    <img src={expenseReceiptPreview} alt="معاينة الفاتورة" className="mt-2 max-h-40 rounded-lg border object-contain" />
                  )}
                </div>

                {expenseAmount && (
                  <div className="p-3 rounded-lg bg-orange-50">
                    <p className="text-sm text-muted-foreground">
                      المبلغ:{" "}
                      <span className="font-bold text-orange-600">
                        {parseFloat(expenseAmount || "0").toFixed(2)} ر.س
                      </span>
                    </p>
                  </div>
                )}
              </>
            ) : (formData.type as string) === 'DRIVER_DEBT' ? (
              <>
                <div className="grid gap-2">
                  <Label>نوع المديونية *</Label>
                  <Select value={debtSubType} onValueChange={(v) => setDebtSubType(v as "cash" | "bread")}>
                    <SelectTrigger data-testid="select-debt-subtype">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">فرق نقدي (يُخصم من الرصيد)</SelectItem>
                      <SelectItem value="bread">فرق خبز (يُخصم من المخزون)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {debtSubType === 'bread' && (
                  <>
                    <div className="grid gap-2">
                      <Label>المنتج *</Label>
                      <Select
                        value={formData.productId}
                        onValueChange={(value) => setFormData({ ...formData, productId: value })}
                      >
                        <SelectTrigger data-testid="select-debt-product">
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
                        value={formData.quantity || 1}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                        data-testid="input-debt-quantity"
                      />
                    </div>
                  </>
                )}

                {debtSubType === 'cash' && (
                  <div className="grid gap-2">
                    <Label>المبلغ *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="أدخل مبلغ المديونية"
                      data-testid="input-debt-amount"
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>السبب / الوصف *</Label>
                  <Input
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    placeholder="مثال: فرق جرد، نقص بضاعة، سلفة..."
                    data-testid="input-debt-description"
                  />
                </div>

                {debtSubType === 'bread' && formData.productId && (
                  <div className="p-3 rounded-lg bg-rose-50">
                    <p className="text-sm text-muted-foreground">
                      المبلغ المحسوب:{" "}
                      <span className="font-bold text-rose-600">
                        {(parseFloat(products.find(p => p.id === formData.productId)?.price || "0") * (formData.quantity || 1)).toFixed(2)} ر.س
                      </span>
                      {" "}({formData.quantity || 1} × {products.find(p => p.id === formData.productId)?.price || "0"})
                    </p>
                  </div>
                )}

                {debtSubType === 'cash' && expenseAmount && (
                  <div className="p-3 rounded-lg bg-rose-50">
                    <p className="text-sm text-muted-foreground">
                      المبلغ:{" "}
                      <span className="font-bold text-rose-600">
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
                            ? driverCustomers.find(c => c.id === formData.customerId)?.name || "اختر العميل"
                            : "اختر العميل"}
                          <span className="mr-2 h-4 w-4 shrink-0 opacity-50">▼</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command filter={(value, search) => {
                          const customer = driverCustomers.find(c => c.id === value);
                          if (!customer) return 0;
                          const normalizedSearch = normalizeArabic(search);
                          const normalizedName = normalizeArabic(customer.name);
                          return normalizedName.includes(normalizedSearch) ? 1 : 0;
                        }}>
                          <CommandInput placeholder="ابحث عن العميل..." data-testid="input-search-customer" />
                          <CommandList>
                            <CommandEmpty>لا يوجد عميل بهذا الاسم</CommandEmpty>
                            <CommandGroup>
                              {driverCustomers.map((customer) => (
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

            {(formData.type as string) !== 'EXPENSE' && (formData.type as string) !== 'DRIVER_DEBT' && (
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

            {(formData.type as string) !== 'EXPENSE' && (formData.type as string) !== 'DRIVER_DEBT' && formData.productId && (
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
              disabled={createTransaction.isPending || isUploadingReceipt}
              data-testid="button-submit-transaction"
            >
              {(createTransaction.isPending || isUploadingReceipt) ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />{isUploadingReceipt ? "جاري رفع الصورة..." : "جاري الحفظ..."}</> : "حفظ العملية"}
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

              {(editingTransaction.type as string) !== 'EXPENSE' && (editingTransaction.type as string) !== 'DRIVER_DEBT' && (
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

              {(editingTransaction.type as string) !== 'EXPENSE' && (editingTransaction.type as string) !== 'DRIVER_DEBT' && (
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

              {(editingTransaction.type as string) !== 'EXPENSE' && (editingTransaction.type as string) !== 'DRIVER_DEBT' && (editingTransaction.type as string) !== 'RETURN' && (
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
                          ? driverCustomers.find(c => c.id === editForm.customerId)?.name || "اختر العميل"
                          : "اختر العميل"}
                        <span className="mr-2 h-4 w-4 shrink-0 opacity-50">▼</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command filter={(value, search) => {
                        const customer = driverCustomers.find(c => c.id === value);
                        if (!customer) return 0;
                        return normalizeArabic(customer.name).includes(normalizeArabic(search)) ? 1 : 0;
                      }}>
                        <CommandInput placeholder="ابحث عن العميل..." />
                        <CommandList>
                          <CommandEmpty>لا يوجد عميل بهذا الاسم</CommandEmpty>
                          <CommandGroup>
                            {driverCustomers.map((customer) => (
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

              {(editingTransaction.type as string) !== 'EXPENSE' && (editingTransaction.type as string) !== 'DRIVER_DEBT' && editForm.unitPrice && (
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
            <DialogTitle className="text-right">
              {loadMode === 'load' ? 'تحميل خبز للمندوب' : 'مرتجع خبز من المندوب'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>نوع العملية *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={loadMode === 'load' ? 'default' : 'outline'}
                  className={`flex-1 ${loadMode === 'load' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  onClick={() => setLoadMode('load')}
                  data-testid="btn-load-mode"
                >
                  <Truck className="h-4 w-4 ml-2" />
                  تحميل
                </Button>
                <Button
                  type="button"
                  variant={loadMode === 'return' ? 'default' : 'outline'}
                  className={`flex-1 ${loadMode === 'return' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                  onClick={() => setLoadMode('return')}
                  data-testid="btn-return-mode"
                >
                  <Undo2 className="h-4 w-4 ml-2" />
                  مرتجع
                </Button>
              </div>
            </div>
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
                      {loadMode === 'return' && (() => {
                        const inv = inventory.find(i => i.productId === product.id);
                        return inv ? ` (متوفر: ${inv.quantity})` : '';
                      })()}
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

            {loadMode === 'return' && loadProductId && (() => {
              const inv = inventory.find(i => i.productId === loadProductId);
              return (
                <p className="text-sm text-orange-600 font-medium">
                  الكمية المتوفرة لدى المندوب: {inv?.quantity || 0}
                </p>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsLoadDialogOpen(false); setLoadProductId(""); setLoadQuantity(""); setLoadMode("load"); }}>
              إلغاء
            </Button>
            <Button
              className={loadMode === 'return' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              onClick={() => {
                const qty = parseInt(loadQuantity);
                if (!loadProductId || !qty || qty <= 0) {
                  toast({ title: "يرجى اختيار المنتج وإدخال الكمية", variant: "destructive" });
                  return;
                }
                loadInventory.mutate({ productId: loadProductId, quantity: qty, mode: loadMode });
              }}
              disabled={loadInventory.isPending}
              data-testid="button-confirm-load"
            >
              {loadInventory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (loadMode === 'return' ? 'إرجاع' : 'تحميل')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!duplicateWarning} onOpenChange={(open) => { if (!open) setDuplicateWarning(null); }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              تحذير: عملية مكررة
            </DialogTitle>
          </DialogHeader>
          <p className="text-right text-sm leading-relaxed py-2">{duplicateWarning?.message}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDuplicateWarning(null)}>
              إلغاء
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => duplicateWarning?.onConfirm()}
              data-testid="button-confirm-duplicate"
            >
              متابعة على أي حال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
