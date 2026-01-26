import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, DispatchRun, Order, Product, Status } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, Package, Truck, CheckCircle, AlertTriangle, Printer, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RunDetailsPage() {
  const [, params] = useRoute("/dispatch/:id");
  const runId = params?.id;
  
  const { dispatchRuns, orders, products, customers, routes, updateRunStatus, updateOrderStatus, addReturn, returns } = useStore();
  const run = dispatchRuns.find(r => r.id === runId);
  
  if (!run) return <AdminLayout><div>Run not found</div></AdminLayout>;
  
  const route = routes.find(r => r.id === run.routeId);
  const runOrders = orders.filter(o => run.orderIds.includes(o.id));
  const runReturns = returns.filter(r => r.runId === run.id);

  // --- Load Sheet Calculation ---
  const loadSheet = useMemo(() => {
    const totals: Record<string, number> = {};
    runOrders.forEach(order => {
      // Only include orders that are supposed to be on the truck (e.g., not canceled)
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

  // --- Variance Calculation ---
  const varianceData = useMemo(() => {
    return loadSheet.map(({ product, quantity: loadedQty }) => {
      if (!product) return null;
      
      // Calculate what was actually delivered (based on Delivered orders)
      const deliveredQty = runOrders
        .filter(o => o.status === 'DELIVERED' || o.status === 'CLOSED')
        .reduce((acc, order) => {
          const item = order.items.find(i => i.productId === product.id);
          return acc + (item ? item.quantity : 0);
        }, 0);

      // Calculate returns
      const returnedQty = runReturns.reduce((acc, ret) => {
         const item = ret.items.find(i => i.productId === product.id);
         return acc + (item ? item.quantity : 0);
      }, 0);

      const variance = loadedQty - deliveredQty - returnedQty;

      return {
        product,
        loadedQty,
        deliveredQty,
        returnedQty,
        variance
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [loadSheet, runOrders, runReturns]);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dispatch">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                 <h1 className="text-2xl font-bold tracking-tight">{route?.name} Run</h1>
                 <StatusBadge status={run.status} />
              </div>
              <p className="text-muted-foreground">{run.date} • Driver: {run.driverName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {run.status === 'LOADED' && (
              <Button onClick={() => updateRunStatus(run.id, 'OUT')}>
                Mark Out for Delivery
              </Button>
            )}
            {run.status === 'OUT' && (
              <Button onClick={() => updateRunStatus(run.id, 'RETURNED')}>
                Vehicle Returned
              </Button>
            )}
             {run.status === 'RETURNED' && (
              <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => updateRunStatus(run.id, 'CLOSED')}>
                Finalize & Close Run
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="load">Load Sheet</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="returns">Returns</TabsTrigger>
            <TabsTrigger value="close">Reconciliation</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Stops</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{runOrders.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadSheet.reduce((acc, item) => acc + item.quantity, 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round((runOrders.filter(o => o.status === 'DELIVERED' || o.status === 'CLOSED').length / runOrders.length) * 100)}%
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
               <CardHeader>
                 <CardTitle>Stop List</CardTitle>
               </CardHeader>
               <CardContent>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Seq</TableHead>
                       <TableHead>Customer</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead>Items</TableHead>
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
                             <div className="text-xs text-muted-foreground">{customer?.address}</div>
                           </TableCell>
                           <TableCell><StatusBadge status={order.status} /></TableCell>
                           <TableCell>{order.items.reduce((a, b) => a + b.quantity, 0)}</TableCell>
                         </TableRow>
                       )
                     })}
                   </TableBody>
                 </Table>
               </CardContent>
            </Card>
          </TabsContent>

          {/* Load Sheet Tab */}
          <TabsContent value="load">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Load Sheet</CardTitle>
                  <CardDescription>Total inventory required for this run.</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Printer className="mr-2 h-4 w-4" /> Print Sheet
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Quantity Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadSheet.map((item) => (
                      <TableRow key={item.product.id}>
                        <TableCell className="font-mono">{item.product.sku}</TableCell>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell className="text-right font-bold text-lg">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
             <div className="grid gap-4">
                {runOrders.map(order => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <Card key={order.id}>
                      <CardContent className="p-6 flex items-center justify-between">
                         <div>
                            <div className="font-bold text-lg">{customer?.name}</div>
                            <div className="text-sm text-muted-foreground mb-2">Order #{order.id}</div>
                            <div className="flex gap-2">
                               {order.items.map(item => {
                                 const p = products.find(p => p.id === item.productId);
                                 return (
                                   <span key={item.productId} className="text-xs bg-muted px-2 py-1 rounded">
                                     {item.quantity}x {p?.name}
                                   </span>
                                 )
                               })}
                            </div>
                         </div>
                         <div className="flex gap-2 items-center">
                            <StatusBadge status={order.status} />
                            {order.status === 'ASSIGNED' && (
                              <Button size="sm" onClick={() => updateOrderStatus(order.id, 'DELIVERED')}>
                                Mark Delivered
                              </Button>
                            )}
                         </div>
                      </CardContent>
                    </Card>
                  )
                })}
             </div>
          </TabsContent>

          {/* Returns Tab */}
          <TabsContent value="returns">
             <div className="flex justify-end mb-4">
               <ReturnDialog runId={run.id} orders={runOrders} />
             </div>
             <Card>
               <CardHeader>
                 <CardTitle>Returns Log</CardTitle>
               </CardHeader>
               <CardContent>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Customer</TableHead>
                       <TableHead>Product</TableHead>
                       <TableHead>Qty</TableHead>
                       <TableHead>Reason</TableHead>
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
                             <TableCell>{item.quantity}</TableCell>
                             <TableCell><span className="text-xs font-mono uppercase bg-muted px-1 rounded">{item.reason}</span></TableCell>
                           </TableRow>
                         );
                       });
                     })}
                     {runReturns.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No returns logged yet.</TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </CardContent>
             </Card>
          </TabsContent>

          {/* Close/Reconciliation Tab */}
          <TabsContent value="close">
            <Card>
              <CardHeader>
                <CardTitle>Run Reconciliation</CardTitle>
                <CardDescription>
                   Verify inventory. Variance = Loaded - Delivered - Returned.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Product</TableHead>
                       <TableHead className="text-right">Loaded</TableHead>
                       <TableHead className="text-right">Delivered</TableHead>
                       <TableHead className="text-right">Returned</TableHead>
                       <TableHead className="text-right">Variance</TableHead>
                       <TableHead className="text-right">Status</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {varianceData.map((row) => (
                       <TableRow key={row.product.id}>
                         <TableCell className="font-medium">{row.product.name}</TableCell>
                         <TableCell className="text-right">{row.loadedQty}</TableCell>
                         <TableCell className="text-right text-muted-foreground">{row.deliveredQty}</TableCell>
                         <TableCell className="text-right text-muted-foreground">{row.returnedQty}</TableCell>
                         <TableCell className={cn(
                           "text-right font-bold",
                           row.variance === 0 ? "text-green-600" : "text-red-600"
                         )}>
                           {row.variance > 0 ? `+${row.variance}` : row.variance}
                         </TableCell>
                         <TableCell className="text-right">
                           {row.variance === 0 
                             ? <CheckCircle className="h-4 w-4 text-green-500 ml-auto" /> 
                             : <AlertTriangle className="h-4 w-4 text-red-500 ml-auto" />
                           }
                         </TableCell>
                       </TableRow>
                     ))}
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
  };

  // Unique customers in this run
  const uniqueCustomerIds = Array.from(new Set(orders.map(o => o.customerId)));
  const relevantCustomers = customers.filter(c => uniqueCustomerIds.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><RotateCcw className="mr-2 h-4 w-4" /> Log Return</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Return Item</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Customer</Label>
            <Select onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent>
                {relevantCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Product</Label>
            <Select onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Product" />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
               <Label>Quantity</Label>
               <Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
               <Label>Reason</Label>
               <Select onValueChange={setReason} defaultValue="GOOD">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOOD">Good (Unsold)</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSubmit}>Save Return</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
