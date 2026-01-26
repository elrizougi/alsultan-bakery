import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrders, useCustomers, useProducts } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Loader2
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();

  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  if (ordersLoading) {
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
      <div className="flex flex-col gap-10 animate-in fade-in duration-700" dir="rtl">
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="text-right">
            <h1 className="text-4xl font-black text-slate-800">التقارير والتحليلات</h1>
            <p className="text-slate-400 font-medium mt-1 text-lg">نظرة شاملة على أداء المبيعات والعمليات.</p>
          </div>
          <Button variant="outline" className="gap-2 rounded-xl h-12 border-slate-200">
            <Calendar className="h-5 w-5" />
            تحديد الفترة
          </Button>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <ReportCard 
            title="إجمالي المبيعات" 
            value={`${totalRevenue.toLocaleString()} ر.س`}
            change="+12.5%" 
            isPositive={true}
            icon={TrendingUp}
            color="emerald"
          />
          <ReportCard 
            title="متوسط قيمة الطلب" 
            value={`${avgOrderValue.toFixed(1)} ر.س`}
            change="+3.2%" 
            isPositive={true}
            icon={BarChart3}
            color="blue"
          />
          <ReportCard 
            title="العملاء النشطون" 
            value={customers.length.toString()}
            change="+5" 
            isPositive={true}
            icon={Users}
            color="indigo"
          />
          <ReportCard 
            title="إجمالي الطلبات" 
            value={orders.length.toString()}
            change="-2.1%" 
            isPositive={false}
            icon={ShoppingCart}
            color="amber"
          />
        </div>

        <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
          <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
              <CardTitle className="text-xl font-bold text-slate-800 text-right">أفضل المنتجات مبيعاً</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-bold px-8">المنتج</TableHead>
                    <TableHead className="text-right font-bold">الكمية المباعة</TableHead>
                    <TableHead className="text-right font-bold px-8">الإيرادات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 5).map((product, idx) => {
                    const soldQty = orders.reduce((acc, order) => {
                      const item = order.items?.find(i => i.productId === product.id);
                      return acc + (item?.quantity || 0);
                    }, 0);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-bold text-slate-700 px-8">{product.name}</TableCell>
                        <TableCell className="font-bold">{soldQty}</TableCell>
                        <TableCell className="font-black text-primary px-8">{(soldQty * parseFloat(product.price)).toFixed(0)} ر.س</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
              <CardTitle className="text-xl font-bold text-slate-800 text-right">أحدث الطلبات</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right font-bold px-8">العميل</TableHead>
                    <TableHead className="text-right font-bold">التاريخ</TableHead>
                    <TableHead className="text-right font-bold px-8">المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 5).map(order => {
                    const customer = customers.find(c => c.id === order.customerId);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-bold text-slate-700 px-8">{customer?.name || 'غير معروف'}</TableCell>
                        <TableCell className="text-slate-500">{order.date}</TableCell>
                        <TableCell className="font-black text-primary px-8">{parseFloat(order.totalAmount).toFixed(0)} ر.س</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function ReportCard({ 
  title, 
  value, 
  change, 
  isPositive, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string; 
  change: string; 
  isPositive: boolean;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'indigo' | 'amber';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <Card className="rounded-3xl border-0 shadow-sm hover:shadow-xl transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between flex-row-reverse mb-4">
          <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", colorClasses[color])}>
            <Icon className="h-6 w-6" />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-lg",
            isPositive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
          )}>
            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {change}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-black text-slate-800">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
