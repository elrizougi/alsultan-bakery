import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, Product, Order } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, CheckCircle, AlertTriangle, Printer, RotateCcw, MapPin, Phone, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RunDetailsPage() {
  const [, params] = useRoute("/dispatch/:id");
  const runId = params?.id;
  
  const { dispatchRuns, orders, products, customers, routes, updateRunStatus, updateOrderStatus, addReturn, returns } = useStore();
  const run = dispatchRuns.find(r => r.id === runId);
  
  if (!run) return <AdminLayout><div>لم يتم العثور على الرحلة</div></AdminLayout>;
  
  const route = routes.find(r => r.id === run.routeId);
  const runOrders = orders.filter(o => run.orderIds.includes(o.id));
  const runReturns = returns.filter(r => r.runId === run.id);

  const loadSheet = useMemo(() => {
    const totals: Record<string, number> = {};
    runOrders.forEach(order => {
      if (order.status !== 'CANCELED') {
        order.items.forEach(item => {
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
          const item = order.items.find(i => i.productId === product.id);
          return acc + (item ? item.quantity : 0);
        }, 0);

      const returnedQty = runReturns.reduce((acc, ret) => {
         const item = ret.items.find(i => i.productId === product.id);
         return acc + (item ? item.quantity : 0);
      }, 0);

      const variance = loadedQty - deliveredQty - returnedQty;

      return { product, loadedQty, deliveredQty, returnedQty, variance };
    });
  }, [loadSheet, runOrders, runReturns]);

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
                 <h1 className="text-2xl font-bold tracking-tight">تفاصيل رحلة {route?.name}</h1>
                 <StatusBadge status={run.status} className="text-[10px]" />
              </div>
              <p className="text-muted-foreground">{run.date} • السائق: {run.driverName}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-row-reverse">
            {run.status === 'DRAFT' && (
              <Button onClick={() => updateRunStatus(run.id, 'LOADED')}>تأكيد كشف التحميل</Button>
            )}
            {run.status === 'LOADED' && (
              <Button onClick={() => updateRunStatus(run.id, 'OUT')}>خروج للتوصيل</Button>
            )}
            {run.status === 'OUT' && (
              <Button onClick={() => updateRunStatus(run.id, 'RETURNED')}>تمت العودة للمستودع</Button>
            )}
             {run.status === 'RETURNED' && (
              <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => updateRunStatus(run.id, 'CLOSED')}>
                إغلاق الرحلة نهائياً
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4" dir="rtl">
          <TabsList className="flex justify-start overflow-x-auto">
            <TabsTrigger value="overview">العملاء</TabsTrigger>
            <TabsTrigger value="load">كشف التحميل</TabsTrigger>
            <TabsTrigger value="deliveries">إثبات التوصيل</TabsTrigger>
            <TabsTrigger value="returns">المرتجعات</TabsTrigger>
            <TabsTrigger value="close">التسوية الجردية</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 text-right">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">عدد التوقفات</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{runOrders.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">إجمالي الكميات</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{loadSheet.reduce((acc, item) => acc + item.quantity, 0)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">نسبة الإنجاز</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {runOrders.length > 0 ? Math.round((runOrders.filter(o => o.status === 'DELIVERED' || o.status === 'CLOSED').length / runOrders.length) * 100) : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
               <CardHeader><CardTitle>قائمة العملاء في هذه الرحلة</CardTitle></CardHeader>
               <CardContent>
                 <Table className="text-right">
                   <TableHeader>
                     <TableRow>
                       <TableHead className="text-right">#</TableHead>
                       <TableHead className="text-right">العميل</TableHead>
                       <TableHead className="text-right">العنوان / الموقع</TableHead>
                       <TableHead className="text-right">الحالة</TableHead>
                       <TableHead className="text-right">الأصناف</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {runOrders.map((order, idx) => {
                       const customer = customers.find(c => c.id === order.customerId);
                       return (
                         <TableRow key={order.id}>
                           <TableCell>{idx + 1}</TableCell>
                           <TableCell>
                             <div className="font-medium">{customer?.name}</div>
                             <div className="text-xs text-muted-foreground flex items-center gap-1 flex-row-reverse">
                               <Phone className="h-3 w-3" /> {customer?.phone}
                             </div>
                           </TableCell>
                           <TableCell>
                             <div className="flex flex-col items-end gap-1 text-xs">
                               <div className="flex items-center gap-1 flex-row-reverse">
                                 <MapPin className="h-3 w-3" /> {customer?.address}
                               </div>
                               {customer?.locationUrl && (
                                 <a href={customer.locationUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 flex-row-reverse text-[10px]">
                                   <ExternalLink className="h-2 w-2" /> رابط الخريطة
                                 </a>
                               )}
                             </div>
                           </TableCell>
                           <TableCell><StatusBadge status={order.status} className="text-[10px]" /></TableCell>
                           <TableCell>{order.items.reduce((a, b) => a + b.quantity, 0)}</TableCell>
                         </TableRow>
                       )
                     })}
                   </TableBody>
                 </Table>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="load">
            <Card>
              <CardHeader className="flex flex-row-reverse items-center justify-between">
                <div className="text-right">
                  <CardTitle>كشف تحميل المركبة</CardTitle>
                  <CardDescription>البضائع المطلوبة للتحميل من المستودع.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2"><Printer className="h-4 w-4" /> طباعة الكشف</Button>
              </CardHeader>
              <CardContent>
                <Table className="text-right text-lg">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-left">الكمية الإجمالية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadSheet.map((item) => (
                      <TableRow key={item.product.id}>
                        <TableCell>
                           <div className="font-bold">{item.product.name}</div>
                           <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                        </TableCell>
                        <TableCell className="text-left font-bold text-2xl text-primary">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliveries">
             <div className="grid gap-4">
                <div className="text-right mb-2">
                   <h3 className="font-bold">سجل التوصيل الميداني</h3>
                   <p className="text-sm text-muted-foreground">قم بتأكيد التوصيل لكل عميل عند الوصول.</p>
                </div>
                {runOrders.map(order => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <Card key={order.id} className={cn(order.status === 'DELIVERED' ? "bg-green-50/50" : "")}>
                      <CardContent className="p-4 flex items-center justify-between flex-row-reverse gap-4">
                         <div className="text-right flex-1">
                            <div className="font-bold text-lg">{customer?.name}</div>
                            <div className="text-xs text-muted-foreground mb-2">{customer?.address}</div>
                            <div className="flex gap-1 flex-wrap flex-row-reverse">
                               {order.items.map(item => {
                                 const p = products.find(p => p.id === item.productId);
                                 return (
                                   <span key={item.productId} className="text-[10px] bg-muted px-2 py-0.5 rounded border">
                                     {item.quantity}x {p?.name}
                                   </span>
                                 )
                               })}
                            </div>
                         </div>
                         <div className="flex flex-col gap-2 items-center">
                            <StatusBadge status={order.status} className="text-[10px]" />
                            {order.status === 'ASSIGNED' && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9" onClick={() => updateOrderStatus(order.id, 'DELIVERED')}>
                                <CheckCircle className="h-4 w-4 ml-2" />
                                إثبات توصيل
                              </Button>
                            )}
                         </div>
                      </CardContent>
                    </Card>
                  )
                })}
             </div>
          </TabsContent>

          <TabsContent value="returns">
             <div className="flex justify-start mb-4">
               <ReturnDialog runId={run.id} orders={runOrders} />
             </div>
             <Card>
               <CardHeader className="text-right"><CardTitle>المرتجعات المسجلة في هذه الرحلة</CardTitle></CardHeader>
               <CardContent>
                 <Table className="text-right">
                   <TableHeader>
                     <TableRow>
                       <TableHead className="text-right">العميل</TableHead>
                       <TableHead className="text-right">المنتج</TableHead>
                       <TableHead className="text-right">الكمية</TableHead>
                       <TableHead className="text-right">السبب</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {runReturns.map((ret) => {
                       const customer = customers.find(c => c.id === ret.customerId);
                       return ret.items.map((item, idx) => {
                         const product = products.find(p => p.id === item.productId);
                         return (
                           <TableRow key={`${ret.id}-${idx}`}>
                             <TableCell>{customer?.name}</TableCell>
                             <TableCell>{product?.name}</TableCell>
                             <TableCell className="font-bold">{item.quantity}</TableCell>
                             <TableCell>
                               <span className={cn(
                                 "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                 item.reason === 'GOOD' ? "bg-green-100 text-green-700" :
                                 item.reason === 'DAMAGED' ? "bg-red-100 text-red-700" :
                                 "bg-orange-100 text-orange-700"
                               )}>
                                 {item.reason === 'GOOD' ? 'سليم' : item.reason === 'DAMAGED' ? 'تالف' : 'منتهي'}
                               </span>
                             </TableCell>
                           </TableRow>
                         );
                       });
                     })}
                     {runReturns.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">لا توجد مرتجعات مسجلة</TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="close">
            <Card>
              <CardHeader className="text-right">
                <CardTitle>التسوية الختامية للرحلة</CardTitle>
                <CardDescription>مقارنة الكميات المحملة مع ما تم توزيعه ومرتجعه.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="text-right">
                   <TableHeader>
                     <TableRow>
                       <TableHead className="text-right">المنتج</TableHead>
                       <TableHead className="text-left">محمل</TableHead>
                       <TableHead className="text-left">مباع</TableHead>
                       <TableHead className="text-left">مرتجع</TableHead>
                       <TableHead className="text-left">الفرق</TableHead>
                       <TableHead className="text-left">التحقق</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {varianceData.map((row) => (
                       <TableRow key={row.product.id}>
                         <TableCell className="font-medium">{row.product.name}</TableCell>
                         <TableCell className="text-left">{row.loadedQty}</TableCell>
                         <TableCell className="text-left text-muted-foreground">{row.deliveredQty}</TableCell>
                         <TableCell className="text-left text-muted-foreground">{row.returnedQty}</TableCell>
                         <TableCell className={cn(
                           "text-left font-bold",
                           row.variance === 0 ? "text-green-600" : "text-red-600"
                         )}>
                           {row.variance > 0 ? `+${row.variance}` : row.variance}
                         </TableCell>
                         <TableCell className="text-left">
                           {row.variance === 0 
                             ? <CheckCircle className="h-4 w-4 text-green-500 mr-auto" /> 
                             : <AlertTriangle className="h-4 w-4 text-red-500 mr-auto" />
                           }
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                </Table>
                
                {run.status === 'RETURNED' && (
                  <div className="mt-6 p-4 bg-primary/5 border rounded-lg text-right">
                     <h4 className="font-bold mb-2">تأكيد الإغلاق</h4>
                     <p className="text-sm text-muted-foreground mb-4">عند إغلاق الرحلة، سيتم ترحيل الفروقات للمستودع وإغلاق كافة الفواتير المرتبطة نهائياً.</p>
                     <Button className="w-full bg-primary" onClick={() => updateRunStatus(run.id, 'CLOSED')}>
                        إغلاق الرحلة وترحيل البيانات
                     </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function ReturnDialog({ runId, orders }: { runId: string, orders: Order[] }) {
  const { customers, products, addReturn } = useStore();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState<string>("GOOD");

  const handleSubmit = () => {
    if (!customerId || !productId) return;
    addReturn({
      id: Math.random().toString(),
      runId,
      customerId,
      items: [{ productId, quantity: Number(qty), reason: reason as any }]
    });
    setOpen(false);
    // Reset fields
    setCustomerId("");
    setProductId("");
    setQty(1);
    setReason("GOOD");
  };

  const uniqueCustomerIds = Array.from(new Set(orders.map(o => o.customerId)));
  const relevantCustomers = customers.filter(c => uniqueCustomerIds.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 h-10"><RotateCcw className="h-4 w-4" /> تسجيل مرتجع ميداني</Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="text-right">
        <DialogHeader><DialogTitle className="text-right">تسجيل مرتجع من عميل</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2 text-right">
            <Label>العميل</Label>
            <Select onValueChange={setCustomerId} value={customerId}>
              <SelectTrigger dir="rtl"><SelectValue placeholder="اختر العميل" /></SelectTrigger>
              <SelectContent dir="rtl">
                {relevantCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 text-right">
            <Label>المنتج</Label>
            <Select onValueChange={setProductId} value={productId}>
              <SelectTrigger dir="rtl"><SelectValue placeholder="اختر المنتج" /></SelectTrigger>
              <SelectContent dir="rtl">
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2 text-right">
               <Label>الكمية</Label>
               <Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="text-right" min="1" />
            </div>
            <div className="grid gap-2 text-right">
               <Label>الحالة</Label>
               <Select onValueChange={setReason} value={reason}>
                <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="GOOD">سليم (مرتجع مبيعات)</SelectItem>
                  <SelectItem value="DAMAGED">تالف</SelectItem>
                  <SelectItem value="EXPIRED">منتهي الصلاحية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="mt-2" onClick={handleSubmit}>حفظ وتسجيل المرتجع</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
