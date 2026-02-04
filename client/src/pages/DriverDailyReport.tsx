import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOrders } from "@/hooks/useData";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function DriverDailyReportPage() {
  const currentUser = useStore(state => state.user);
  const driverId = currentUser?.id || "";

  const { data: orders = [] } = useOrders();
  const assignedOrders = orders.filter(o => o.customerId === driverId && o.status === 'ASSIGNED');

  const { data: transactions = [] } = useQuery({
    queryKey: ["driver-transactions", driverId],
    queryFn: () => api.getDriverTransactions(driverId),
    enabled: !!driverId,
  });

  const { data: cashDeposits = [] } = useQuery({
    queryKey: ["driver-cash-deposits", driverId],
    queryFn: () => api.getDriverCashDeposits(driverId),
    enabled: !!driverId,
  });

  const allDates = new Set<string>();
  transactions.forEach(t => {
    if (t.createdAt) allDates.add(format(new Date(t.createdAt), 'yyyy-MM-dd'));
  });
  assignedOrders.forEach(o => {
    if (o.date) allDates.add(o.date);
  });
  cashDeposits.forEach(d => {
    if (d.createdAt) allDates.add(format(new Date(d.createdAt), 'yyyy-MM-dd'));
  });

  const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold">التقرير اليومي</h1>
        </div>

        <Card className="border-slate-100">
          <CardHeader className="bg-gradient-to-l from-blue-50 to-indigo-50 rounded-t-lg">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              سجل العمليات اليومية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-right font-bold">التاريخ</TableHead>
                    <TableHead className="text-right font-bold">المستلم</TableHead>
                    <TableHead className="text-right font-bold">المرتجع</TableHead>
                    <TableHead className="text-right font-bold">خبز تالف</TableHead>
                    <TableHead className="text-right font-bold">توزيع مجاني</TableHead>
                    <TableHead className="text-right font-bold">عينات</TableHead>
                    <TableHead className="text-right font-bold">إجمالي المبيعات</TableHead>
                    <TableHead className="text-right font-bold">نقدي</TableHead>
                    <TableHead className="text-right font-bold">آجل</TableHead>
                    <TableHead className="text-right font-bold">الفروقات</TableHead>
                    <TableHead className="text-right font-bold">الموردة للمخبز</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        لا توجد بيانات للعرض
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedDates.map(date => {
                      const dayTransactions = transactions.filter(t => 
                        t.createdAt && format(new Date(t.createdAt), 'yyyy-MM-dd') === date
                      );
                      const dayOrders = assignedOrders.filter(o => 
                        o.date === date
                      );
                      const dayDeposits = cashDeposits.filter(d => 
                        d.createdAt && format(new Date(d.createdAt), 'yyyy-MM-dd') === date && d.status === 'CONFIRMED'
                      );

                      const received = dayOrders.reduce((sum, order) => 
                        sum + (order.items?.reduce((itemSum, item) => 
                          itemSum + (item.receivedQuantity ?? item.quantity), 0) || 0), 0);
                      
                      const returned = dayTransactions.filter(t => t.type === 'RETURN')
                        .reduce((sum, t) => sum + t.quantity, 0);
                      
                      const damaged = dayTransactions.filter(t => t.type === 'DAMAGED')
                        .reduce((sum, t) => sum + t.quantity, 0);
                      
                      const freeDistribution = dayTransactions.filter(t => t.type === 'FREE_DISTRIBUTION')
                        .reduce((sum, t) => sum + t.quantity, 0);
                      
                      const freeSamples = dayTransactions.filter(t => t.type === 'FREE_SAMPLE')
                        .reduce((sum, t) => sum + t.quantity, 0);
                      
                      const cashSales = dayTransactions.filter(t => t.type === 'CASH_SALE')
                        .reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);
                      
                      const creditSales = dayTransactions.filter(t => t.type === 'CREDIT_SALE')
                        .reduce((sum, t) => sum + parseFloat(t.totalAmount || "0"), 0);
                      
                      const totalSales = cashSales + creditSales;

                      const soldQty = dayTransactions.filter(t => t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE')
                        .reduce((sum, t) => sum + t.quantity, 0);
                      
                      const difference = received - soldQty - returned - damaged - freeDistribution - freeSamples;

                      const deposited = dayDeposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);

                      return (
                        <TableRow key={date} data-testid={`report-row-${date}`}>
                          <TableCell className="font-medium">
                            {format(new Date(date), 'EEEE dd/MM/yyyy', { locale: ar })}
                          </TableCell>
                          <TableCell className="text-green-600 font-bold">{received}</TableCell>
                          <TableCell className="text-orange-600">{returned}</TableCell>
                          <TableCell className="text-gray-600">{damaged}</TableCell>
                          <TableCell className="text-purple-600">{freeDistribution}</TableCell>
                          <TableCell className="text-pink-600">{freeSamples}</TableCell>
                          <TableCell className="text-blue-600 font-bold">{totalSales.toFixed(2)} ر.س</TableCell>
                          <TableCell className="text-emerald-600">{cashSales.toFixed(2)} ر.س</TableCell>
                          <TableCell className="text-amber-600">{creditSales.toFixed(2)} ر.س</TableCell>
                          <TableCell className={difference !== 0 ? "text-red-600 font-bold" : "text-slate-600"}>
                            {difference}
                          </TableCell>
                          <TableCell className="text-slate-700 font-medium">{deposited.toFixed(2)} ر.س</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
