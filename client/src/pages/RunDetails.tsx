import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useDispatchRuns, useOrders, useProducts, useCustomers, useRoutes, useReturns, useUpdateDispatchRun, useUpdateOrder, useCreateReturn } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, CheckCircle, AlertTriangle, Printer, RotateCcw, MapPin, Phone, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Product, Order, ReturnReason, RunStatus, Status } from "@/lib/api";

export default function RunDetailsPage() {
  const [, params] = useRoute("/dispatch/:id");
  const runId = params?.id;
  
  const { data: dispatchRuns = [], isLoading: runsLoading } = useDispatchRuns();
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: routes = [] } = useRoutes();
  const { data: returns = [] } = useReturns();
  const updateRun = useUpdateDispatchRun();
  const updateOrder = useUpdateOrder();
  const createReturn = useCreateReturn();
  const { toast } = useToast();

  const run = dispatchRuns.find(r => r.id === runId);
  
  if (runsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }
  
  if (!run) return <AdminLayout><div className="text-center py-16">لم يتم العثور على الرحلة</div></AdminLayout>;
  
  const route = routes.find(r => r.id === run.routeId);
  const runOrders = orders.filter(o => run.orderIds?.includes(o.id));
  const runReturns = returns.filter(r => r.runId === run.id);

  const loadSheet = useMemo(() => {
    const totals: Record<string, number> = {};
    runOrders.forEach(order => {
      if (order.status !== 'CANCELED') {
        order.items?.forEach(item => {
          totals[item.productId] = (totals[item.productId] || 0) + item.quantity;
        });
      }
    });
    return Object.entries(totals).map(([productId, quantity]) => ({
      product: products.find(p => p.id === productId),
      quantity
    })).filter((item): item is { product: Product; quantity: number } => !!item.product);
  }, [runOrders, products]);

  const varianceData = useMemo(() => {
    return loadSheet.map(({ product, quantity: loadedQty }) => {
      const deliveredQty = runOrders
        .filter(o => o.status === 'DELIVERED' || o.status === 'CLOSED')
        .reduce((acc, order) => {
          const item = order.items?.find(i => i.productId === product.id);
          return acc + (item ? item.quantity : 0);
        }, 0);

      const returnedQty = runReturns.reduce((acc, ret) => {
         const item = ret.items?.find(i => i.productId === product.id);
         return acc + (item ? item.quantity : 0);
      }, 0);

      const variance = loadedQty - deliveredQty - returnedQty;

      return { product, loadedQty, deliveredQty, returnedQty, variance };
    });
  }, [loadSheet, runOrders, runReturns]);

  const handleUpdateRunStatus = async (status: RunStatus) => {
    try {
      await updateRun.mutateAsync({ id: run.id, status });
      toast({ title: "تم تحديث حالة الرحلة" });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Status) => {
    try {
      await updateOrder.mutateAsync({ id: orderId, status });
      toast({ title: "تم تحديث حالة الطلب" });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="flex items-center gap-4 flex-row-reverse">
            <Link href="/dispatch">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4 transform rotate-180" />
              </Button>
            </Link>
            <div className="text-right">
              <div className="flex items-center gap-3 flex-row-reverse">
                 <h1 className="text-2xl font-bold tracking-tight">تفاصيل رحلة {route?.name || run.routeId}</h1>
                 <StatusBadge status={run.status} className="text-[10px]" />
              </div>
              <p className="text-muted-foreground">{run.date} • السائق: {run.driverName}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-row-reverse">
            {run.status === 'DRAFT' && (
              <Button onClick={() => handleUpdateRunStatus('LOADED')} disabled={updateRun.isPending}>
                {updateRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد كشف التحميل"}
              </Button>
            )}
            {run.status === 'LOADED' && (
              <Button onClick={() => handleUpdateRunStatus('OUT')} disabled={updateRun.isPending}>
                {updateRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "خروج للتوصيل"}
              </Button>
            )}
            {run.status === 'OUT' && (
              <Button onClick={() => handleUpdateRunStatus('RETURNED')} disabled={updateRun.isPending}>
                {updateRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تمت العودة للمستودع"}
              </Button>
            )}
             {run.status === 'RETURNED' && (
              <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateRunStatus('CLOSED')} disabled={updateRun.isPending}>
                {updateRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إغلاق الرحلة نهائياً"}
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-xl">
            <TabsTrigger value="orders" className="rounded-lg">الطلبات ({runOrders.length})</TabsTrigger>
            <TabsTrigger value="loadsheet" className="rounded-lg">كشف التحميل</TabsTrigger>
            <TabsTrigger value="returns" className="rounded-lg">المرتجعات ({runReturns.length})</TabsTrigger>
            <TabsTrigger value="variance" className="rounded-lg">التسوية الجردية</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="px-6">
                <CardTitle className="text-right">طلبات الرحلة</CardTitle>
                <CardDescription className="text-right">قائمة الطلبات المخصصة لهذه الرحلة</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right px-6">العميل</TableHead>
                      <TableHead className="text-right">العنوان</TableHead>
                      <TableHead className="text-right">الهاتف</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right px-6">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runOrders.map(order => {
                      const customer = customers.find(c => c.id === order.customerId);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-bold px-6">{customer?.name}</TableCell>
                          <TableCell className="text-slate-500">{customer?.address}</TableCell>
                          <TableCell>
                            {customer?.phone && (
                              <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-primary hover:underline flex-row-reverse">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </a>
                            )}
                          </TableCell>
                          <TableCell className="font-black">{parseFloat(order.totalAmount).toFixed(2)} ر.س</TableCell>
                          <TableCell><StatusBadge status={order.status} /></TableCell>
                          <TableCell className="px-6">
                            <div className="flex gap-2 flex-row-reverse">
                              {order.status === 'ASSIGNED' && (
                                <Button size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')} disabled={updateOrder.isPending}>
                                  <CheckCircle className="h-4 w-4 ml-1" /> تم التسليم
                                </Button>
                              )}
                              {customer?.locationUrl && (
                                <a href={customer.locationUrl} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline">
                                    <MapPin className="h-4 w-4 ml-1" /> الموقع
                                  </Button>
                                </a>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {runOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          لا توجد طلبات في هذه الرحلة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loadsheet" className="mt-6">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="px-6 flex flex-row-reverse items-center justify-between">
                <div className="text-right">
                  <CardTitle>كشف التحميل</CardTitle>
                  <CardDescription>ملخص الكميات المطلوب تحميلها للرحلة</CardDescription>
                </div>
                <Button variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" /> طباعة
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right px-6">المنتج</TableHead>
                      <TableHead className="text-right">SKU</TableHead>
                      <TableHead className="text-right px-6">الكمية المطلوبة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadSheet.map(({ product, quantity }) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-bold px-6">{product.name}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{product.sku}</TableCell>
                        <TableCell className="font-black text-2xl text-primary px-6">{quantity}</TableCell>
                      </TableRow>
                    ))}
                    {loadSheet.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                          لا توجد منتجات للتحميل
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returns" className="mt-6">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="px-6 flex flex-row-reverse items-center justify-between">
                <div className="text-right">
                  <CardTitle>المرتجعات</CardTitle>
                  <CardDescription>المنتجات المرتجعة من هذه الرحلة</CardDescription>
                </div>
                <ReturnDialog runId={run.id} customers={customers} products={products} onSubmit={async (data) => {
                  try {
                    await createReturn.mutateAsync(data);
                    toast({ title: "تم تسجيل المرتجع" });
                  } catch (error) {
                    toast({ title: "حدث خطأ", variant: "destructive" });
                  }
                }} isPending={createReturn.isPending} />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right px-6">العميل</TableHead>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right px-6">السبب</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runReturns.flatMap(ret => 
                      (ret.items || []).map((item, idx) => {
                        const customer = customers.find(c => c.id === ret.customerId);
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <TableRow key={`${ret.id}-${idx}`}>
                            <TableCell className="font-bold px-6">{customer?.name}</TableCell>
                            <TableCell>{product?.name}</TableCell>
                            <TableCell className="font-bold">{item.quantity}</TableCell>
                            <TableCell className="px-6">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                                item.reason === 'GOOD' ? 'bg-green-50 text-green-700' :
                                item.reason === 'DAMAGED' ? 'bg-amber-50 text-amber-700' :
                                'bg-red-50 text-red-700'
                              )}>
                                {item.reason === 'GOOD' ? 'سليم' : item.reason === 'DAMAGED' ? 'تالف' : 'منتهي'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                    {runReturns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                          لا توجد مرتجعات مسجلة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variance" className="mt-6">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="px-6">
                <CardTitle className="text-right">التسوية الجردية</CardTitle>
                <CardDescription className="text-right">مقارنة بين الكميات المحملة والمسلمة والمرتجعة</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right px-6">المنتج</TableHead>
                      <TableHead className="text-right">محمّل</TableHead>
                      <TableHead className="text-right">مُسلّم</TableHead>
                      <TableHead className="text-right">مرتجع</TableHead>
                      <TableHead className="text-right px-6">الفرق</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varianceData.map(({ product, loadedQty, deliveredQty, returnedQty, variance }) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-bold px-6">{product.name}</TableCell>
                        <TableCell className="font-bold">{loadedQty}</TableCell>
                        <TableCell className="font-bold text-green-600">{deliveredQty}</TableCell>
                        <TableCell className="font-bold text-amber-600">{returnedQty}</TableCell>
                        <TableCell className="px-6">
                          <span className={cn(
                            "inline-flex items-center gap-1 font-black",
                            variance === 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {variance === 0 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                            {variance}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {varianceData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                          لا توجد بيانات للتسوية
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function ReturnDialog({ 
  runId, 
  customers, 
  products, 
  onSubmit, 
  isPending 
}: { 
  runId: string; 
  customers: any[]; 
  products: any[]; 
  onSubmit: (data: { runId: string; customerId: string; items: { productId: string; quantity: number; reason: ReturnReason }[] }) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState<ReturnReason>("GOOD");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !productId) return;
    onSubmit({
      runId,
      customerId,
      items: [{ productId, quantity: parseInt(quantity), reason }]
    });
    setOpen(false);
    setCustomerId("");
    setProductId("");
    setQuantity("1");
    setReason("GOOD");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <RotateCcw className="h-4 w-4" /> تسجيل مرتجع
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-right">تسجيل مرتجع</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4 text-right">
          <div className="space-y-2">
            <Label>العميل</Label>
            <Select onValueChange={setCustomerId} value={customerId}>
              <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المنتج</Label>
              <Select onValueChange={setProductId} value={productId}>
                <SelectTrigger><SelectValue placeholder="اختر المنتج" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الكمية</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>السبب</Label>
            <Select onValueChange={(val) => setReason(val as ReturnReason)} value={reason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GOOD">سليم</SelectItem>
                <SelectItem value="DAMAGED">تالف</SelectItem>
                <SelectItem value="EXPIRED">منتهي الصلاحية</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex flex-row-reverse gap-2 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تسجيل"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
