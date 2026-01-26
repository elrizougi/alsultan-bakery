import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, DispatchRun } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Truck, Calendar, MapPin, ChevronLeft, Plus } from "lucide-react";
import { Link } from "wouter";
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
  const { dispatchRuns, routes, orders, createDispatchRun } = useStore();
  const [open, setOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState("");

  const handleCreateRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) return;

    const route = routes.find(r => r.id === selectedRouteId);
    if (!route) return;

    // Get orders for this route that are confirmed but not assigned
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

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="text-right">
            <h1 className="text-3xl font-bold tracking-tight">رحلات التوزيع</h1>
            <p className="text-muted-foreground">إدارة خطوط التوصيل اليومية وكشوف التحميل.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إنشاء رحلة جديدة
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
                  <p className="text-[10px] text-muted-foreground">سيتم تلقائياً سحب جميع الطلبات المؤكدة والتابعة لهذا الخط.</p>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full">تأكيد وإنشاء الرحلة</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dispatchRuns.map((run) => {
            const route = routes.find(r => r.id === run.routeId);
            return (
              <Link 
                key={run.id} 
                href={`/dispatch/${run.id}`}
                className="block group"
              >
                <Card className="transition-all hover:shadow-md border-r-4 border-r-primary/0 hover:border-r-primary">
                  <CardHeader className="pb-3 text-right">
                    <div className="flex justify-between items-start flex-row-reverse">
                      <CardTitle className="text-lg font-bold flex items-center gap-2 flex-row-reverse">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                        {route?.name}
                      </CardTitle>
                      <StatusBadge status={run.status} className="text-[10px]" />
                    </div>
                  </CardHeader>
                  <CardContent className="text-right">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground flex-row-reverse">
                        <Calendar className="h-4 w-4" />
                        <span>{run.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground flex-row-reverse">
                        <MapPin className="h-4 w-4" />
                        <span>{run.orderIds.length} نقطة توصيل</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between flex-row-reverse">
                         <div className="text-xs font-medium bg-muted px-2 py-1 rounded">
                           السائق: {run.driverName}
                         </div>
                         <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {dispatchRuns.length === 0 && (
            <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              لا توجد رحلات توزيع حالياً. ابدأ بإنشاء رحلة جديدة.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
