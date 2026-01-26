import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, Order, OrderItem } from "@/lib/store";
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
import { Plus, Search, Filter, MoreVertical, Trash2, Edit, X, Save } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function OrdersPage() {
  const { orders, customers, products, addOrder, updateOrderStatus } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter(order => {
    const customer = customers.find(c => c.id === order.customerId);
    const matchesSearch = customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 font-black">طلبات الخبز</h1>
            <p className="text-sm text-muted-foreground">إدارة طلبات المخابز وحالات التوصيل الميداني.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto flex-row gap-2 bg-primary hover:bg-primary/90 rounded-xl h-11 px-6 shadow-lg shadow-primary/20 font-bold">
            <Plus className="h-4 w-4" /> إنشاء طلب جديد
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="البحث عن طلب أو عميل..."
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
                <TableHead className="text-right font-bold text-slate-500">العميل</TableHead>
                <TableHead className="text-right font-bold text-slate-500">التاريخ</TableHead>
                <TableHead className="text-right font-bold text-slate-500">الأصناف</TableHead>
                <TableHead className="text-right font-bold text-slate-500">الإجمالي</TableHead>
                <TableHead className="text-right font-bold text-slate-500">الحالة</TableHead>
                <TableHead className="text-left font-bold text-slate-500">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const customer = customers.find(c => c.id === order.customerId);
                return (
                  <TableRow key={order.id} className="hover:bg-slate-50/50 border-slate-50">
                    <TableCell className="font-bold text-slate-400 font-mono text-xs">#{order.id}</TableCell>
                    <TableCell className="font-bold text-slate-700">{customer?.name}</TableCell>
                    <TableCell className="text-slate-500">{order.date}</TableCell>
                    <TableCell className="text-slate-500">{order.items.reduce((acc, item) => acc + item.quantity, 0)} وحدة</TableCell>
                    <TableCell className="font-black text-slate-800">{order.totalAmount.toFixed(2)} ر.س</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} className="shadow-sm" />
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-2">
                        {order.status === 'DRAFT' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-primary font-bold px-3 hover:bg-primary/5 rounded-lg"
                            onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                          >
                            تأكيد
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-lg">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-right min-w-[140px] rounded-xl shadow-xl">
                            <DropdownMenuItem 
                              className="flex items-center gap-2 justify-end font-bold text-slate-600 focus:text-primary focus:bg-primary/5 p-3"
                              onClick={() => setEditingOrder(order)}
                            >
                              تعديل الطلب
                              <Edit className="h-4 w-4" />
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2 justify-end font-bold text-red-500 focus:text-red-600 focus:bg-red-50 p-3">
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
            </TableBody>
          </Table>
        </div>

        <CreateOrderDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        {editingOrder && <EditOrderDialog order={editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)} />}
      </div>
    </AdminLayout>
  );
}

function CreateOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { customers, products, addOrder } = useStore();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const randomCustomer = customers[0];
    const newOrder: Order = {
      id: `o${Math.floor(Math.random() * 1000)}`,
      customerId: randomCustomer.id,
      date: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      items: [{ productId: products[0].id, quantity: 10 }],
      totalAmount: products[0].price * 10
    };
    addOrder(newOrder);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="text-right max-w-[90vw] sm:max-w-md rounded-2xl shadow-2xl border-0">
        <DialogHeader>
          <DialogTitle className="text-right text-2xl font-black text-slate-800 mb-2">إنشاء طلب جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          <div className="space-y-3">
            <Label className="block text-right font-bold text-slate-600">اختيار العميل</Label>
            <Select>
              <SelectTrigger dir="rtl" className="h-12 rounded-xl border-slate-200">
                <SelectValue placeholder="اختر العميل" />
              </SelectTrigger>
              <SelectContent dir="rtl" className="rounded-xl shadow-xl">
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-4 bg-primary/5 rounded-2xl text-xs text-primary font-bold text-right border border-primary/10">
            سيتم إضافة طلب عينة تجريبي بشكل تلقائي عند إنشاء الطلب لتسهيل التجربة في النسخة الحالية.
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-start gap-3 pt-2">
            <Button variant="outline" type="button" className="w-full sm:w-auto h-12 rounded-xl font-bold border-slate-200" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" className="w-full sm:w-auto h-12 rounded-xl font-bold bg-primary shadow-lg shadow-primary/20">تأكيد الطلب</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditOrderDialog({ order, onOpenChange }: { order: Order; onOpenChange: (open: boolean) => void }) {
  const { customers, products } = useStore();
  const [selectedCustomerId, setSelectedCustomerId] = useState(order.customerId);
  const [items, setItems] = useState<OrderItem[]>(order.items);

  const addItem = () => {
    setItems([...items, { productId: products[0].id, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<OrderItem>) => {
    setItems(items.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenChange(false);
  };

  const totalAmount = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="text-right max-w-[90vw] sm:max-w-xl rounded-3xl shadow-2xl border-0 p-0 overflow-hidden">
        <div className="p-8 space-y-8">
          <DialogHeader>
            <div className="flex items-center justify-between flex-row-reverse mb-2">
              <DialogTitle className="text-3xl font-black text-slate-800">تعديل الطلب</DialogTitle>
              <div className="bg-slate-100 px-4 py-1 rounded-full text-xs font-black text-slate-400">#{order.id}</div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="block text-right font-bold text-slate-600">العميل</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger dir="rtl" className="h-12 rounded-2xl border-slate-200 shadow-sm font-bold text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="rounded-2xl shadow-2xl border-slate-100">
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id} className="p-3 font-bold">{c.name}</SelectItem>
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
                    {items.map((item, idx) => {
                      return (
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
                      );
                    })}
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
                  <Button type="submit" className="h-14 px-10 rounded-2xl font-black bg-primary shadow-xl shadow-primary/20 gap-2">
                    <Save className="h-5 w-5" />
                    حفظ التعديلات
                  </Button>
               </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
