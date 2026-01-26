import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { DollarSign, Package, Truck, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { orders, dispatchRuns, customers } = useStore();

  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysOrders = orders.filter(o => o.date === today);
  const activeRuns = dispatchRuns.filter(r => r.status !== 'CLOSED');
  
  const totalRevenue = todaysOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of today's bakery operations.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders (Today)</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaysOrders.length}</div>
              <p className="text-xs text-muted-foreground">
                {todaysOrders.filter(o => o.status === 'CONFIRMED').length} confirmed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Runs</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeRuns.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeRuns.filter(r => r.status === 'OUT').length} out for delivery
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from yesterday
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attention Needed</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {todaysOrders.filter(o => o.status === 'DRAFT').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Draft orders requiring confirmation
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.slice(0, 5).map(order => {
                  const customer = customers.find(c => c.id === order.customerId);
                  return (
                    <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <div className="font-medium">{customer?.name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{order.items.length} items • {order.date}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-medium">${order.totalAmount.toFixed(2)}</div>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Dispatch Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 {dispatchRuns.map(run => (
                   <div key={run.id} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{run.routeId.toUpperCase()}</div>
                          <div className="text-xs text-muted-foreground">{run.driverName}</div>
                        </div>
                     </div>
                     <StatusBadge status={run.status} />
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
