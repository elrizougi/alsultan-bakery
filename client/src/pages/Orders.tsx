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
import { Plus, Search, Filter } from "lucide-react";
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
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="text-right">
            <h1 className="text-3xl font-bold tracking-tight">الطلبات</h1>
            <p className="text-muted-foreground">إدارة طلبات العملاء وحالات التوصيل.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="flex-row-reverse gap-2">
            <Plus className="h-4 w-4" /> إنشاء طلب جديد
          </Button>
        </div>

        <div className="flex items-center gap-4 flex-row-reverse">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن الطلبات..."
              className="pr-8 text-right"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
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
                      {order.status === 'DRAFT' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-primary"
                          onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                        >
                          تأكيد
                        </Button>
                      )}
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
      <DialogContent dir="rtl" className="text-right">
        <DialogHeader>
          <DialogTitle className="text-right">إنشاء طلب جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="p-4 bg-muted rounded-md text-sm text-muted-foreground text-right">
            ملاحظة: هذا النموذج لغرض العرض. سيتم إضافة طلب عينة عند الضغط على "إنشاء".
          </div>
          <div className="flex justify-start gap-2 flex-row-reverse">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>إلغاء</Button>
            <Button type="submit">إنشاء الطلب</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
