import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export default function ReportsPage() {
  const { orders, customers, products } = useStore();

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

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
              <Table className="text-right">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right px-8">المنتج</TableHead>
                    <TableHead className="text-right px-8">الكمية</TableHead>
                    <TableHead className="text-right px-8">الإيراد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.slice(0, 5).map(p => (
                    <TableRow key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4 font-bold text-slate-700">{p.name}</td>
                      <td className="px-8 py-4 text-slate-500 font-medium">120</td>
                      <td className="px-8 py-4 font-bold text-primary">{(120 * p.price).toLocaleString()} ر.س</td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
              <CardTitle className="text-xl font-bold text-slate-800 text-right">تحليل المبيعات الأسبوعي</CardTitle>
            </CardHeader>
            <CardContent className="p-8 h-[300px] flex items-center justify-center border-dashed border-2 border-slate-100 m-8 rounded-2xl">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium font-cairo">سيتم عرض الرسم البياني هنا</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function ReportCard({ title, value, change, isPositive, icon: Icon, color }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <Card className="rounded-3xl border-0 shadow-sm p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between flex-row-reverse mb-4">
        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner", colors[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold",
          isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {change}
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-slate-400 mb-1">{title}</p>
        <h3 className="text-2xl font-black text-slate-800">{value}</h3>
      </div>
    </Card>
  );
}

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
