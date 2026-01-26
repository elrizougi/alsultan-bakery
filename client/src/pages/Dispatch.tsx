import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useDispatchRuns, useRoutes, useOrders, useCustomers, useCreateDispatchRun, useDeleteDispatchRun, useUpdateDispatchRun } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Truck, Calendar, MapPin, ChevronLeft, Plus, MoreVertical, Trash2, Edit, Phone, User2, Package, FileText, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
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
import { useToast } from "@/hooks/use-toast";
import type { DispatchRun } from "@/lib/api";

export default function DispatchPage() {
  const { data: dispatchRuns = [], isLoading } = useDispatchRuns();
  const { data: routes = [] } = useRoutes();
  const { data: orders = [] } = useOrders();
  const { data: customers = [] } = useCustomers();
  const createRun = useCreateDispatchRun();
  const deleteRun = useDeleteDispatchRun();
  const updateRun = useUpdateDispatchRun();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<DispatchRun | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState("");

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) return;

    const route = routes.find(r => r.id === selectedRouteId);
    if (!route) return;

    // Get orders for this route that are confirmed but not assigned
    const routeOrders = orders.filter(o => {
      const customer = customers.find(c => c.id === o.customerId);
      return customer?.routeId === selectedRouteId && o.status === 'CONFIRMED';
    });

    try {
      await createRun.mutateAsync({
        routeId: selectedRouteId,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'DRAFT',
        driverName: route.driverName,
        orderIds: routeOrders.map(o => o.id),
      });
      toast({ title: "تم إنشاء الرحلة بنجاح" });
      setOpen(false);
      setSelectedRouteId("");
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDeleteRun = async (id: string) => {
    try {
      await deleteRun.mutateAsync(id);
      toast({ title: "تم حذف الرحلة" });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleEditRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRun || !selectedRouteId) return;

    const route = routes.find(r => r.id === selectedRouteId);
    if (!route) return;

    try {
      await updateRun.mutateAsync({
        id: editingRun.id,
        routeId: selectedRouteId,
        driverName: route.driverName,
      });
      toast({ title: "تم تحديث الرحلة" });
      setEditOpen(false);
      setEditingRun(null);
      setSelectedRouteId("");
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
      <div className="flex flex-col gap-10" dir="rtl">
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="text-right">
            <h1 className="text-4xl font-black text-slate-800">رحلات التوزيع</h1>
            <p className="text-slate-400 font-medium mt-1 text-lg">إدارة رحلات التوصيل اليومية.</p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-12 px-6 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  <Plus className="h-5 w-5" />
                  إنشاء رحلة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="sm:max-w-[450px] rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-right text-2xl font-black">إنشاء رحلة توزيع</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRun} className="space-y-6 py-4 text-right">
                  <div className="space-y-3">
                    <Label className="font-bold">خط التوزيع</Label>
                    <Select onValueChange={setSelectedRouteId} value={selectedRouteId}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="اختر خط التوزيع" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.map(route => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.name} - {route.driverName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter className="flex flex-row-reverse gap-3 pt-4">
                    <Button type="submit" className="h-12 rounded-xl font-bold" disabled={createRun.isPending}>
                      {createRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء الرحلة"}
                    </Button>
                    <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => setOpen(false)}>إلغاء</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {dispatchRuns.map((run) => {
            const route = routes.find(r => r.id === run.routeId);
            return (
              <Card key={run.id} className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden group">
                <CardHeader className="p-6 pb-4 flex flex-row-reverse items-start justify-between">
                  <div className="flex items-center gap-3 flex-row-reverse">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-right">
                      <CardTitle className="text-lg font-black text-slate-800">{route?.name || run.routeId}</CardTitle>
                      <p className="text-sm text-slate-400 font-medium">{run.driverName}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-5 w-5 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
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
                        className="flex items-center gap-2 justify-end font-bold text-red-500"
                        onClick={() => handleDeleteRun(run.id)}
                      >
                        حذف
                        <Trash2 className="h-4 w-4" />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="flex items-center justify-between flex-row-reverse">
                    <div className="flex items-center gap-2 text-slate-500 text-sm flex-row-reverse">
                      <Calendar className="h-4 w-4" />
                      {run.date}
                    </div>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="flex items-center justify-between flex-row-reverse pt-2">
                    <div className="flex items-center gap-2 text-slate-600 flex-row-reverse">
                      <Package className="h-4 w-4" />
                      <span className="font-bold">{run.orderIds?.length || 0} طلبات</span>
                    </div>
                    <Link href={`/dispatch/${run.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1 text-primary font-bold rounded-xl hover:bg-primary/5">
                        عرض التفاصيل
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {dispatchRuns.length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-400">
              <Truck className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">لا توجد رحلات توزيع حتى الآن</p>
              <p className="text-sm">أنشئ رحلة جديدة لبدء التوزيع</p>
            </div>
          )}
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent dir="rtl" className="sm:max-w-[450px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-right text-2xl font-black">تعديل الرحلة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditRun} className="space-y-6 py-4 text-right">
              <div className="space-y-3">
                <Label className="font-bold">خط التوزيع</Label>
                <Select onValueChange={setSelectedRouteId} value={selectedRouteId}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="اختر خط التوزيع" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map(route => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.name} - {route.driverName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="flex flex-row-reverse gap-3 pt-4">
                <Button type="submit" className="h-12 rounded-xl font-bold" disabled={updateRun.isPending}>
                  {updateRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التعديلات"}
                </Button>
                <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => setEditOpen(false)}>إلغاء</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
