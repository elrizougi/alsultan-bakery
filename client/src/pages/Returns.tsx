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
import { RotateCcw, AlertCircle, CheckCircle2, History } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

export default function ReturnsPage() {
  const { returns, products, customers } = useStore();

  const totalReturnItems = returns.reduce((acc, ret) => acc + ret.items.length, 0);
  const damagedCount = returns.reduce((acc, ret) => 
    acc + ret.items.filter(i => i.reason === 'DAMAGED').length, 0
  );

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="text-right">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة المرتجعات</h1>
          <p className="text-sm text-muted-foreground">تتبع المرتجعات من العملاء وأسبابها.</p>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المرتجعات</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold">{totalReturnItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">أصناف تالفة</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold text-destructive">{damagedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">تمت المعالجة</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold text-green-600">{returns.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="text-right">
            <CardTitle className="text-lg flex items-center gap-2 flex-row-reverse">
              <History className="h-5 w-5" />
              سجل المرتجعات الأخير
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="text-right">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">رقم الرحلة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => {
                  const customer = customers.find(c => c.id === ret.customerId);
                  return ret.items.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId);
                    const reasonMap: Record<string, string> = {
                      'GOOD': 'سليم',
                      'DAMAGED': 'تالف',
                      'EXPIRED': 'منتهي'
                    };
                    return (
                      <TableRow key={`${ret.id}-${idx}`}>
                        <TableCell className="font-medium">{customer?.name}</TableCell>
                        <TableCell>{product?.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            item.reason === 'DAMAGED' ? 'bg-red-100 text-red-700' : 
                            item.reason === 'EXPIRED' ? 'bg-orange-100 text-orange-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            {reasonMap[item.reason]}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {ret.runId}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })}
                {returns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      لا يوجد مرتجعات مسجلة حالياً
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
