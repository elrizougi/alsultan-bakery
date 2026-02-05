import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrders, useUsers, useProducts, useCreateOrder, useUpdateOrder, useDeleteOrder } from "@/hooks/useData";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Search, Filter, MoreVertical, Trash2, Edit, Save, Loader2, CheckCircle, Package, Truck, RotateCcw, Lock, AlertTriangle } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Order, OrderItem, Status } from "@/lib/api";

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useOrders();
  const { data: users = [] } = useUsers();
  const { data: products = [] } = useProducts();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const { toast } = useToast();
  const currentUser = useStore(state => state.user);

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const [adminConfirmingOrder, setAdminConfirmingOrder] = useState<Order | null>(null);
  const [closingOrder, setClosingOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter(order => {
    // السائقون يرون الطلبات المرتبطة بهم مباشرة
    if (currentUser?.role === 'DRIVER') {
      if (order.customerId !== currentUser.id) {
        return false;
      }
    }
    const employee = users.find(u => u.id === order.customerId);
    const matchesSearch = employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleUpdateStatus = async (id: string, status: Status) => {
    try {
      await updateOrder.mutateAsync({ id, status });
      toast({ title: "تم تحديث حالة الطلب" });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOrder.mutateAsync(id);
      toast({ title: "تم حذف الطلب" });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  if (isLoading) {
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 font-black">طلبات الخبز</h1>
            <p className="text-sm text-muted-foreground">إدارة طلبات المخابز وحالات التوصيل الميداني.</p>
          </div>
          {currentUser?.role !== 'DRIVER' && (
            <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto flex-row gap-2 bg-primary hover:bg-primary/90 rounded-xl h-11 px-6 shadow-lg shadow-primary/20 font-bold">
              <Plus className="h-4 w-4" /> إنشاء طلب جديد
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="البحث عن طلب أو موظف..."
              className="pr-10 text-right h-11 rounded-xl border-slate-200 focus:ring-primary shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200">
            <Filter className="h-4 w-4 text-slate-500" />
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
          <Table className="text-right">
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-right font-bold text-slate-500">رقم الطلب</TableHead>
                <TableHead className="text-right font-bold text-slate-500">الموظف</TableHead>
                <TableHead className="text-right font-bold text-slate-500">التاريخ</TableHead>
                <TableHead className="text-right font-bold text-slate-500">الأصناف</TableHead>
                <TableHead className="text-right font-bold text-slate-500">الإجمالي</TableHead>
                <TableHead className="text-right font-bold text-slate-500">الحالة</TableHead>
                <TableHead className="text-left font-bold text-slate-500">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const employee = users.find(u => u.id === order.customerId);
                const orderedTotal = order.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
                const receivedTotal = order.items?.reduce((acc, item) => acc + (item.receivedQuantity ?? item.quantity), 0) || 0;
                const hasReceivedDiff = order.items?.some(item => item.receivedQuantity !== undefined && item.receivedQuantity !== item.quantity);
                return (
                  <TableRow key={order.id} className="hover:bg-slate-50/50 border-slate-50">
                    <TableCell className="font-bold text-slate-400 font-mono text-xs">#{order.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-bold text-slate-700">{employee?.name}</TableCell>
                    <TableCell className="text-slate-500">{order.date}</TableCell>
                    <TableCell className="text-slate-500">
                      {currentUser?.role !== 'DRIVER' && hasReceivedDiff ? (
                        <span className="flex flex-col">
                          <span>{orderedTotal} وحدة</span>
                          <span className="text-xs text-amber-600">مستلم: {receivedTotal}</span>
                        </span>
                      ) : (
                        <span>{orderedTotal} وحدة</span>
                      )}
                    </TableCell>
                    <TableCell className="font-black text-slate-800">{parseFloat(order.totalAmount).toFixed(2)} ر.س</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} className="shadow-sm" />
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-2">
                        {order.status === 'DRAFT' && currentUser?.role !== 'DRIVER' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-primary font-bold px-3 hover:bg-primary/5 rounded-lg"
                            onClick={() => setAdminConfirmingOrder(order)}
                          >
                            تأكيد وتسليم
                          </Button>
                        )}
                        {order.status === 'CONFIRMED' && currentUser?.role === 'DRIVER' && (
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="h-8 font-bold px-4 rounded-lg gap-2 bg-primary hover:bg-primary/90"
                            onClick={() => setConfirmingOrder(order)}
                          >
                            <CheckCircle className="h-4 w-4" />
                            تأكيد الاستلام
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-lg">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-right min-w-[180px] rounded-xl shadow-xl">
                            {currentUser?.role !== 'DRIVER' && order.status === 'CONFIRMED' && (
                              <>
                                <DropdownMenuItem 
                                  className="flex items-center gap-2 justify-end font-bold text-blue-600 focus:text-blue-700 focus:bg-blue-50 p-3"
                                  onClick={() => handleUpdateStatus(order.id, 'ASSIGNED')}
                                >
                                  مغادرة السائق
                                  <Truck className="h-4 w-4" />
                                </DropdownMenuItem>
                                <div className="h-px bg-slate-100 my-1" />
                              </>
                            )}
                            {currentUser?.role !== 'DRIVER' && order.status === 'ASSIGNED' && (
                              <>
                                <DropdownMenuItem 
                                  className="flex items-center gap-2 justify-end font-bold text-orange-600 focus:text-orange-700 focus:bg-orange-50 p-3"
                                  onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                                >
                                  العودة للمخبز
                                  <RotateCcw className="h-4 w-4" />
                                </DropdownMenuItem>
                                <div className="h-px bg-slate-100 my-1" />
                              </>
                            )}
                            {currentUser?.role !== 'DRIVER' && order.status === 'DELIVERED' && (
                              <>
                                <DropdownMenuItem 
                                  className="flex items-center gap-2 justify-end font-bold text-green-600 focus:text-green-700 focus:bg-green-50 p-3"
                                  onClick={() => setClosingOrder(order)}
                                >
                                  إغلاق الرحلة
                                  <Lock className="h-4 w-4" />
                                </DropdownMenuItem>
                                <div className="h-px bg-slate-100 my-1" />
                              </>
                            )}
                            <DropdownMenuItem 
                              className="flex items-center gap-2 justify-end font-bold text-slate-600 focus:text-primary focus:bg-primary/5 p-3"
                              onClick={() => setEditingOrder(order)}
                            >
                              تعديل الطلب
                              <Edit className="h-4 w-4" />
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 justify-end font-bold text-red-500 focus:text-red-600 focus:bg-red-50 p-3"
                              onClick={() => handleDelete(order.id)}
                            >
                              حذف الطلب
                              <Trash2 className="h-4 w-4" />
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    لا توجد طلبات حتى الآن
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <CreateOrderDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        {editingOrder && <EditOrderDialog order={editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)} />}
        {confirmingOrder && <ConfirmReceiptDialog order={confirmingOrder} onOpenChange={(open) => !open && setConfirmingOrder(null)} />}
        {adminConfirmingOrder && <AdminConfirmDialog order={adminConfirmingOrder} onOpenChange={(open) => !open && setAdminConfirmingOrder(null)} />}
        {closingOrder && <CloseOrderDialog order={closingOrder} onOpenChange={(open) => !open && setClosingOrder(null)} />}
      </div>
    </AdminLayout>
  );
}

function CreateOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: users = [] } = useUsers();
  const { data: products = [] } = useProducts();
  const createOrder = useCreateOrder();
  const { toast } = useToast();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([]);
  
  const addItem = () => {
    if (products.length > 0) {
      setItems([...items, { productId: products[0].id, quantity: 1 }]);
    }
  };

  const updateItem = (index: number, updates: Partial<{ productId: string; quantity: number }>) => {
    setItems(items.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (parseFloat(product?.price || '0') * item.quantity);
  }, 0);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || items.length === 0) {
      toast({ title: "يرجى اختيار الموظف وإضافة أصناف", variant: "destructive" });
      return;
    }
    
    try {
      await createOrder.mutateAsync({
        customerId: selectedEmployeeId,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'DRAFT',
        totalAmount: totalAmount.toFixed(2),
        items,
      });
      toast({ title: "تم إنشاء الطلب بنجاح" });
      onOpenChange(false);
      setSelectedEmployeeId("");
      setItems([]);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="text-right max-w-[90vw] sm:max-w-md rounded-2xl shadow-2xl border-0">
        <DialogHeader>
          <DialogTitle className="text-right text-2xl font-black text-slate-800 mb-2">إنشاء طلب جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          <div className="space-y-3">
            <Label className="block text-right font-bold text-slate-600">اختيار الموظف</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger dir="rtl" className="h-12 rounded-xl border-slate-200">
                <SelectValue placeholder="اختر الموظف" />
              </SelectTrigger>
              <SelectContent dir="rtl" className="rounded-xl shadow-xl">
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="rounded-lg">
                <Plus className="h-4 w-4 mr-1" /> إضافة صنف
              </Button>
              <Label className="font-bold text-slate-600">الأصناف</Label>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-400">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Input 
                  type="number" 
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                  className="w-20 text-center"
                />
                <Select value={item.productId} onValueChange={(val) => updateItem(idx, { productId: val })}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl font-bold text-primary text-right">
            الإجمالي: {totalAmount.toFixed(2)} ر.س
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-start gap-3 pt-2">
            <Button variant="outline" type="button" className="w-full sm:w-auto h-12 rounded-xl font-bold border-slate-200" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" className="w-full sm:w-auto h-12 rounded-xl font-bold bg-primary shadow-lg shadow-primary/20" disabled={createOrder.isPending}>
              {createOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد الطلب"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditOrderDialog({ order, onOpenChange }: { order: Order; onOpenChange: (open: boolean) => void }) {
  const { data: users = [] } = useUsers();
  const { data: products = [] } = useProducts();
  const updateOrder = useUpdateOrder();
  const { toast } = useToast();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(order.customerId);
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>(
    order.items?.map(i => ({ productId: i.productId, quantity: i.quantity })) || []
  );

  const addItem = () => {
    if (products.length > 0) {
      setItems([...items, { productId: products[0].id, quantity: 1 }]);
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<{ productId: string; quantity: number }>) => {
    setItems(items.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const totalAmount = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (parseFloat(product?.price || '0') * item.quantity);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateOrder.mutateAsync({
        id: order.id,
        customerId: selectedEmployeeId,
        totalAmount: totalAmount.toFixed(2),
        items,
      });
      toast({ title: "تم تحديث الطلب بنجاح" });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="text-right max-w-[90vw] sm:max-w-xl rounded-3xl shadow-2xl border-0 p-0 overflow-hidden">
        <div className="p-8 space-y-8">
          <DialogHeader>
            <div className="flex items-center justify-between flex-row-reverse mb-2">
              <DialogTitle className="text-3xl font-black text-slate-800">تعديل الطلب</DialogTitle>
              <div className="bg-slate-100 px-4 py-1 rounded-full text-xs font-black text-slate-400">#{order.id.slice(0, 8)}</div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="block text-right font-bold text-slate-600">الموظف</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger dir="rtl" className="h-12 rounded-2xl border-slate-200 shadow-sm font-bold text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="rounded-2xl shadow-2xl border-slate-100">
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id} className="p-3 font-bold">{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="block text-right font-bold text-slate-600">تاريخ الطلب</Label>
                <Input type="date" defaultValue={order.date} className="h-12 rounded-2xl border-slate-200 shadow-sm font-bold text-slate-700 text-right" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between flex-row-reverse">
                <Label className="block text-right font-black text-slate-800 text-lg">أصناف الطلب</Label>
                <Button type="button" onClick={addItem} variant="outline" size="sm" className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/5 gap-2">
                  <Plus className="h-4 w-4" /> إضافة صنف
                </Button>
              </div>
              
              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/30">
                <Table className="text-right">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-right font-bold text-slate-400">المنتج</TableHead>
                      <TableHead className="text-right font-bold text-slate-400">الكمية</TableHead>
                      <TableHead className="text-right font-bold text-slate-400 w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx} className="border-slate-50">
                        <TableCell>
                          <Select 
                            value={item.productId} 
                            onValueChange={(val) => updateItem(idx, { productId: val })}
                          >
                            <SelectTrigger className="border-0 bg-transparent font-bold h-10 px-0 shadow-none focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                            className="w-20 border-slate-200 rounded-xl h-9 text-center font-black" 
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            type="button"
                            onClick={() => removeItem(idx)}
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-between bg-primary/5 p-6 rounded-[2rem] border border-primary/10 flex-row-reverse">
               <div className="text-right">
                  <p className="text-xs font-black text-primary/60 mb-1">إجمالي الفاتورة</p>
                  <h4 className="text-3xl font-black text-primary">{totalAmount.toFixed(2)} ر.س</h4>
               </div>
               <div className="flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-14 px-8 rounded-2xl font-black text-slate-400 hover:bg-slate-100">إلغاء</Button>
                  <Button type="submit" className="h-14 px-10 rounded-2xl font-black bg-primary shadow-xl shadow-primary/20 gap-2" disabled={updateOrder.isPending}>
                    {updateOrder.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> حفظ التعديلات</>}
                  </Button>
               </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmReceiptDialog({ order, onOpenChange }: { order: Order; onOpenChange: (open: boolean) => void }) {
  const { data: products = [] } = useProducts();
  const { data: users = [] } = useUsers();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [receivedItems, setReceivedItems] = useState<{ id: string; receivedQuantity: number }[]>(
    order.items?.map(item => ({ id: item.id!, receivedQuantity: item.quantity })) || []
  );

  const confirmMutation = useMutation({
    mutationFn: () => api.confirmOrderReceipt(order.id, receivedItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "تم تأكيد استلام الطلب بنجاح" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "حدث خطأ أثناء تأكيد الاستلام", variant: "destructive" });
    },
  });

  const updateReceivedQuantity = (itemId: string, quantity: number) => {
    setReceivedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, receivedQuantity: quantity } : item
    ));
  };

  const employee = users.find(u => u.id === order.customerId);
  const totalOriginal = order.items?.reduce((acc, item) => {
    const product = products.find(p => p.id === item.productId);
    return acc + (parseFloat(product?.price || '0') * item.quantity);
  }, 0) || 0;

  const totalReceived = order.items?.reduce((acc, item) => {
    const product = products.find(p => p.id === item.productId);
    const received = receivedItems.find(r => r.id === item.id!)?.receivedQuantity || 0;
    return acc + (parseFloat(product?.price || '0') * received);
  }, 0) || 0;

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl bg-white" dir="rtl">
        <div className="flex flex-col">
          <DialogHeader className="px-6 py-6 bg-gradient-to-l from-primary to-primary/90">
            <DialogTitle className="text-2xl font-black text-white text-right flex items-center gap-3">
              <CheckCircle className="h-7 w-7" />
              تأكيد استلام الطلب
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">رقم الطلب:</span>
                <span className="font-mono text-sm text-slate-700">#{order.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-slate-500 font-bold">الموظف:</span>
                <span className="font-bold text-slate-700">{employee?.name}</span>
              </div>
            </div>

            <div>
              <h4 className="font-black text-slate-700 mb-3">الأصناف المستلمة</h4>
              <Table className="text-right">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-right font-bold">الصنف</TableHead>
                    <TableHead className="text-center font-bold">المطلوب</TableHead>
                    <TableHead className="text-center font-bold">المستلم</TableHead>
                    <TableHead className="text-center font-bold">الفرق</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map(item => {
                    const product = products.find(p => p.id === item.productId);
                    const received = receivedItems.find(r => r.id === item.id!)?.receivedQuantity || 0;
                    const diff = item.quantity - received;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-bold text-slate-700">{product?.name}</TableCell>
                        <TableCell className="text-center text-slate-500">{item.quantity}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={0}
                            max={item.quantity}
                            value={received}
                            onChange={(e) => updateReceivedQuantity(item.id!, parseInt(e.target.value) || 0)}
                            className="w-20 mx-auto border-slate-200 rounded-xl h-9 text-center font-black"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {diff > 0 ? (
                            <span className="text-red-500 font-bold">-{diff}</span>
                          ) : diff < 0 ? (
                            <span className="text-green-500 font-bold">+{Math.abs(diff)}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500">المبلغ المطلوب</p>
                <p className="text-lg font-black text-slate-600">{totalOriginal.toFixed(2)} ر.س</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-primary/60">المبلغ المستلم</p>
                <p className="text-2xl font-black text-primary">{totalReceived.toFixed(2)} ر.س</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-12 px-6 rounded-xl font-bold text-slate-400">
                إلغاء
              </Button>
              <Button 
                onClick={() => confirmMutation.mutate()}
                className="h-12 px-8 rounded-xl font-black bg-primary shadow-lg shadow-primary/20 gap-2"
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    تأكيد الاستلام
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminConfirmDialog({ order, onOpenChange }: { order: Order; onOpenChange: (open: boolean) => void }) {
  const { data: products = [] } = useProducts();
  const updateOrder = useUpdateOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [deliveredItems, setDeliveredItems] = useState<{ id: string; deliveredQuantity: number }[]>(
    order.items?.map(item => ({
      id: item.id!,
      deliveredQuantity: item.quantity
    })) || []
  );

  // التحقق من توفر المخزون
  const checkInventoryAvailability = () => {
    const insufficientItems: string[] = [];
    
    for (const deliveredItem of deliveredItems) {
      const orderItem = order.items?.find(item => item.id === deliveredItem.id);
      if (!orderItem) continue;
      
      const product = products.find(p => p.id === orderItem.productId);
      if (!product) continue;
      
      if (deliveredItem.deliveredQuantity > product.stock) {
        insufficientItems.push(`${product.name} (المطلوب: ${deliveredItem.deliveredQuantity}، المتاح: ${product.stock})`);
      }
    }
    
    return insufficientItems;
  };

  const confirmMutation = useMutation({
    mutationFn: async () => {
      // التحقق من المخزون قبل التأكيد
      const insufficientItems = checkInventoryAvailability();
      if (insufficientItems.length > 0) {
        throw new Error(`المخزون غير كافٍ للأصناف التالية:\n${insufficientItems.join('\n')}`);
      }
      
      // أولاً: تحديث حالة الطلب إلى مؤكد
      await updateOrder.mutateAsync({ id: order.id, status: 'CONFIRMED' as any });
      // ثانياً: تأكيد الاستلام مع الكميات المسلمة
      const receivedItems = deliveredItems.map(item => ({
        id: item.id,
        receivedQuantity: item.deliveredQuantity
      }));
      await api.confirmOrderReceipt(order.id, receivedItems);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["driver-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "تم تأكيد الطلب وتسليم الكميات للسائق" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "حدث خطأ أثناء التأكيد", variant: "destructive" });
    },
  });

  const updateDeliveredQuantity = (itemId: string, quantity: number) => {
    setDeliveredItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, deliveredQuantity: quantity } : item
    ));
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || "غير معروف";
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            تأكيد الطلب وتحديد الكميات
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-sm text-muted-foreground mb-2">رقم الطلب: #{order.id.slice(0, 8)}</p>
            <p className="text-sm text-muted-foreground">حدد الكميات التي سيتم تسليمها للسائق</p>
          </div>

          <div className="space-y-3">
            {order.items?.map((item, index) => {
              const deliveredItem = deliveredItems.find(d => d.id === item.id);
              const product = products.find(p => p.id === item.productId);
              const availableStock = product?.stock || 0;
              const isInsufficient = (deliveredItem?.deliveredQuantity || 0) > availableStock;
              return (
                <div key={item.id} className={`bg-white border rounded-xl p-4 ${isInsufficient ? 'border-red-300 bg-red-50' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">{getProductName(item.productId)}</span>
                    <div className="flex gap-3 text-sm">
                      <span className="text-muted-foreground">المطلوب: {item.quantity}</span>
                      <span className={availableStock < item.quantity ? 'text-red-600 font-bold' : 'text-green-600'}>
                        المتاح: {availableStock}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-sm">الكمية المسلمة:</Label>
                    <Input
                      type="number"
                      min="0"
                      max={availableStock}
                      value={deliveredItem?.deliveredQuantity || 0}
                      onChange={(e) => updateDeliveredQuantity(item.id!, parseInt(e.target.value) || 0)}
                      className={`w-24 ${isInsufficient ? 'border-red-500' : ''}`}
                    />
                    {isInsufficient && (
                      <span className="text-xs text-red-600 font-bold">المخزون غير كافٍ!</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
          >
            {confirmMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري التأكيد...
              </>
            ) : (
              "تأكيد وتسليم"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseOrderDialog({ order, onOpenChange }: { order: Order; onOpenChange: (open: boolean) => void }) {
  const { data: products = [] } = useProducts();
  const { data: returns = [] } = useQuery({
    queryKey: ["returns", order.id],
    queryFn: () => api.getReturns()
  });
  const updateOrder = useUpdateOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [returnItems, setReturnItems] = useState<{ productId: string; goodQty: number; damagedQty: number }[]>(
    order.items?.map(item => ({
      productId: item.productId,
      goodQty: 0,
      damagedQty: 0
    })) || []
  );
  const [hasConfirmedReturns, setHasConfirmedReturns] = useState(false);

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || "غير معروف";
  };

  const totalReturns = returnItems.reduce((sum, item) => sum + item.goodQty + item.damagedQty, 0);
  const hasAnyReturns = totalReturns > 0;

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (hasAnyReturns && !hasConfirmedReturns) {
        throw new Error("يجب تأكيد استلام المرتجعات قبل إغلاق الرحلة");
      }
      
      // تسجيل المرتجعات إذا وجدت
      const goodItems = returnItems
        .filter(item => item.goodQty > 0)
        .map(item => ({
          productId: item.productId,
          quantity: item.goodQty,
          reason: 'GOOD' as const
        }));
      
      const damagedItems = returnItems
        .filter(item => item.damagedQty > 0)
        .map(item => ({
          productId: item.productId,
          quantity: item.damagedQty,
          reason: 'DAMAGED' as const
        }));
      
      const allReturnItems = [...goodItems, ...damagedItems];
      
      if (allReturnItems.length > 0) {
        await api.createReturn({
          orderId: order.id,
          customerId: order.customerId,
          items: allReturnItems
        });
      }
      
      // إغلاق الطلب
      await updateOrder.mutateAsync({ id: order.id, status: 'CLOSED' as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "تم إغلاق الرحلة بنجاح" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message || "حدث خطأ", variant: "destructive" });
    },
  });

  const updateReturnQuantity = (productId: string, type: 'goodQty' | 'damagedQty', value: number) => {
    setReturnItems(prev => prev.map(item => 
      item.productId === productId ? { ...item, [type]: value } : item
    ));
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-green-600" />
            إغلاق الرحلة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800">تأكيد المرتجعات</p>
                <p className="text-sm text-amber-700">يجب إدخال كميات الخبز المرتجع (سليم أو تالف) قبل إغلاق الرحلة</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {order.items?.map((item) => {
              const returnItem = returnItems.find(r => r.productId === item.productId);
              return (
                <div key={item.productId} className="bg-white border rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold">{getProductName(item.productId)}</span>
                    <span className="text-sm text-muted-foreground">الكمية المسلمة: {item.receivedQuantity || item.quantity}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-green-700">مرتجع سليم:</Label>
                      <Input
                        type="number"
                        min="0"
                        value={returnItem?.goodQty || 0}
                        onChange={(e) => updateReturnQuantity(item.productId, 'goodQty', parseInt(e.target.value) || 0)}
                        className="mt-1 border-green-300 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-red-700">مرتجع تالف:</Label>
                      <Input
                        type="number"
                        min="0"
                        value={returnItem?.damagedQty || 0}
                        onChange={(e) => updateReturnQuantity(item.productId, 'damagedQty', parseInt(e.target.value) || 0)}
                        className="mt-1 border-red-300 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasAnyReturns && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="confirmReturns"
                checked={hasConfirmedReturns}
                onChange={(e) => setHasConfirmedReturns(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <Label htmlFor="confirmReturns" className="text-sm cursor-pointer">
                أؤكد استلام المرتجعات (إجمالي: {totalReturns} قطعة)
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending || (hasAnyReturns && !hasConfirmedReturns)}
            className="bg-green-600 hover:bg-green-700"
          >
            {closeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري الإغلاق...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 ml-2" />
                إغلاق الرحلة
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
