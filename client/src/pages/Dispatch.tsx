import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, DispatchRun } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Truck, Calendar, MapPin, ChevronLeft, Plus, MoreVertical, Trash2, Edit, Phone, User2 } from "lucide-react";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export default function DispatchPage() {
  const { dispatchRuns, routes, orders, createDispatchRun, deleteDispatchRun, updateDispatchRun } = useStore();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<DispatchRun | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState("");

  const handleCreateRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) return;

    const route = routes.find(r => r.id === selectedRouteId);
    if (!route) return;

    const routeOrders = orders.filter(o => {
      const customer = useStore.getState().customers.find(c => c.id === o.customerId);
      return customer?.routeId === selectedRouteId && o.status === 'CONFIRMED';
    });

    const newRun: DispatchRun = {
      id: `run-${Math.random().toString(36).substr(2, 5)}`,
      routeId: selectedRouteId,
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'DRAFT',
      driverName: route.driverName,
      orderIds: routeOrders.map(o => o.id),
    };

    createDispatchRun(newRun);
    setOpen(false);
    setSelectedRouteId("");
  };

  const handleEditRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRun || !selectedRouteId) return;

    const route = routes.find(r => r.id === selectedRouteId);
    if (!route) return;

    updateDispatchRun(editingRun.id, {
      routeId: selectedRouteId,
      driverName: route.driverName,
    });
    setEditOpen(false);
    setEditingRun(null);
    setSelectedRouteId("");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-10" dir="rtl">
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="text-right">
            <h1 className="text-4xl font-black text-slate-800">الموردين</h1>
            <p className="text-slate-400 font-medium mt-1 text-lg">إدارة بيانات الموردين وسجل الطلبات.</p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-12 px-6 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  <Plus className="h-5 w-5" />
                  إضافة مورد جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-right">بدء رحلة توزيع جديدة</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRun} className="space-y-4 py-4">
                  <div className="space-y-2 text-right">
                    <Label>اختر خط التوزيع</Label>
                    <Select onValueChange={setSelectedRouteId} value={selectedRouteId}>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر الخط" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name} ({r.driverName})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full">تأكيد وإنشاء الرحلة</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {dispatchRuns.map((run) => {
            const route = routes.find(r => r.id === run.routeId);
            return (
              <Card key={run.id} className="rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all relative group overflow-hidden bg-white">
                <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-slate-100 hover:bg-slate-200">
                        <MoreVertical className="h-4 w-4 text-slate-600" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="flex items-center gap-2 justify-end font-bold"
                        onClick={() => {
                          setEditingRun(run);
                          setSelectedRouteId(run.routeId);
                          setEditOpen(true);
                        }}
                      >
                        تعديل
                        <Edit className="h-4 w-4" />
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="flex items-center gap-2 justify-end text-destructive font-bold"
                        onClick={() => deleteDispatchRun(run.id)}
                      >
                        حذف
                        <Trash2 className="h-4 w-4" />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <Link href={`/dispatch/${run.id}`} className="block h-full">
                  <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start flex-row-reverse">
                      <h3 className="text-2xl font-black text-slate-800">{route?.name}</h3>
                      <div className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-bold",
                        run.status === 'CLOSED' ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {run.status === 'CLOSED' ? 'غير نشط' : 'نشط'}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                       <div className="flex items-center gap-3 text-slate-400 justify-end flex-row-reverse text-sm font-medium">
                         <User2 className="h-4 w-4" />
                         <span>{run.driverName}</span>
                       </div>
                       <div className="flex items-center gap-3 text-slate-400 justify-end flex-row-reverse text-sm font-medium">
                         <Phone className="h-4 w-4" />
                         <span>0559876543</span>
                       </div>
                       <div className="flex items-center gap-3 text-slate-400 justify-end flex-row-reverse text-sm font-medium border-b pb-4">
                         <MapPin className="h-4 w-4" />
                         <span>contact@bakery.sa</span>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-300 text-right">أهم المنتجات:</p>
                      <div className="flex gap-2 justify-end flex-wrap">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-200/50">صامولي</span>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-200/50">كرواسون</span>
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-200/50">باجيت</span>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between flex-row-reverse border-t border-slate-50">
                       <div className="text-[10px] font-bold text-slate-300">أخر رحلة: {run.date}</div>
                       <div className="flex items-center gap-2 text-primary font-bold text-xs">
                          <span className="border-b-2 border-primary/20 group-hover:border-primary transition-all">السجل</span>
                          <FileText className="h-3 w-3" />
                       </div>
                    </div>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>

        {/* Recent Orders matching the table style in the image */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-800 text-right pr-2">سجل الطلبات الحديثة</h2>
          <Card className="rounded-2xl border-0 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-50/50 border-b">
                      <th className="px-8 py-4 text-[13px] font-bold text-slate-400">الحالة</th>
                      <th className="px-8 py-4 text-[13px] font-bold text-slate-400">القيمة</th>
                      <th className="px-8 py-4 text-[13px] font-bold text-slate-400">التاريخ</th>
                      <th className="px-8 py-4 text-[13px] font-bold text-slate-400">المورد</th>
                      <th className="px-8 py-4 text-[13px] font-bold text-slate-400">رقم الطلب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.slice(0, 4).map((order) => {
                      const customer = useStore.getState().customers.find(c => c.id === order.customerId);
                      return (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-8 py-5">
                            <StatusBadge status={order.status} className="rounded-lg shadow-sm" />
                          </td>
                          <td className="px-8 py-5 font-bold text-slate-700">
                            {order.totalAmount.toLocaleString()} ر.س
                          </td>
                          <td className="px-8 py-5 text-slate-500 font-medium">
                            {order.date}
                          </td>
                          <td className="px-8 py-5 font-bold text-slate-800">
                            {customer?.name}
                          </td>
                          <td className="px-8 py-5 text-slate-400 font-mono text-sm">
                            PO-{order.id.toUpperCase()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

import { FileText } from "lucide-react";
