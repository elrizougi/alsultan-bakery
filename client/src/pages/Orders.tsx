import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, Order } from "@/lib/store";
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
import { Plus, Search, Filter, MoreVertical, Trash2, Edit } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function OrdersPage() {
  const { orders, customers, products, addOrder, updateOrderStatus } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الطلبات</h1>
            <p className="text-sm text-muted-foreground">إدارة طلبات العملاء وحالات التوصيل.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto flex-row-reverse gap-2">
            <Plus className="h-4 w-4" /> إنشاء طلب جديد
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث..."
              className="pr-8 text-right"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Responsive view: Table on desktop, Cards on mobile */}
        <div className="md:hidden space-y-3">
           {filteredOrders.map((order) => {
              const customer = customers.find(c => c.id === order.customerId);
              return (
                <div key={order.id} className="bg-card border rounded-lg p-4 space-y-2">
                   <div className="flex justify-between items-start flex-row-reverse">
                      <div className="text-right">
                         <div className="font-bold">{customer?.name}</div>
                         <div className="text-xs font-mono text-muted-foreground">#{order.id}</div>
                      </div>
                      <StatusBadge status={order.status} className="text-[10px]" />
                   </div>
                   <div className="flex justify-between text-sm flex-row-reverse">
                      <div className="text-muted-foreground">الإجمالي: {order.totalAmount.toFixed(1)} ر.س</div>
                      <div className="text-muted-foreground">{order.date}</div>
                   </div>
                   {order.status === 'DRAFT' && (
                     <Button 
                       size="sm" 
                       variant="outline" 
                       className="w-full h-9 text-primary border-primary/20"
                       onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                     >
                       تأكيد الطلب
                     </Button>
                   )}
                </div>
              );
           })}
        </div>

        <div className="hidden md:block rounded-md border bg-card overflow-hidden">
          <Table className="text-right">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الطلب</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الأصناف</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const customer = customers.find(c => c.id === order.customerId);
                return (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium font-mono text-xs">{order.id}</TableCell>
                    <TableCell>{customer?.name}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>{order.items.reduce((acc, item) => acc + item.quantity, 0)} وحدة</TableCell>
                    <TableCell>{order.totalAmount.toFixed(2)} ر.س</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} className="text-[10px]" />
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-2">
                        {order.status === 'DRAFT' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-primary font-bold px-3 hover:bg-primary/5"
                            onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                          >
                            تأكيد
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-right">
                            <DropdownMenuItem className="flex items-center gap-2 justify-end font-medium">
                              تعديل الطلب
                              <Edit className="h-4 w-4" />
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2 justify-end font-medium text-destructive">
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
      <DialogContent dir="rtl" className="text-right max-w-[90vw] sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-right">إنشاء طلب جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="block text-right">العميل</Label>
            <Select>
              <SelectTrigger dir="rtl">
                <SelectValue placeholder="اختر العميل" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground text-right">
            سيتم إضافة طلب عينة تجريبي عند الضغط على "إنشاء".
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-start gap-2 pt-2">
            <Button variant="outline" type="button" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit" className="w-full sm:w-auto">إنشاء الطلب</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
