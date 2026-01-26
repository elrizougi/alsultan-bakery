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
import { Package, AlertTriangle, TrendingUp } from "lucide-react";

export default function InventoryPage() {
  const { products } = useStore();

  // محاكاة بيانات المخزون بما أن المتجر يحتوي فقط على أسعار ومنتجات
  const inventoryData = products.map(p => ({
    ...p,
    stock: Math.floor(Math.random() * 200) + 20, // كمية عشوائية للعرض
    minStock: 50,
  }));

  const lowStockItems = inventoryData.filter(item => item.stock < item.minStock);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="text-right">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة المخزون</h1>
          <p className="text-sm text-muted-foreground">تتبع مستويات المخزون والمنتجات المتوفرة.</p>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الأصناف</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card className={lowStockItems.length > 0 ? "border-destructive/50" : ""}>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">أصناف منخفضة المخزون</CardTitle>
              <AlertTriangle className={lowStockItems.length > 0 ? "h-4 w-4 text-destructive" : "h-4 w-4 text-muted-foreground"} />
            </CardHeader>
            <CardContent className="text-right">
              <div className={lowStockItems.length > 0 ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"}>
                {lowStockItems.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">قيمة المخزون التقريبية</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold">
                {inventoryData.reduce((acc, item) => acc + (item.stock * item.price), 0).toLocaleString()} ر.س
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <Table className="text-right">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المنتج</TableHead>
                <TableHead className="text-right">SKU</TableHead>
                <TableHead className="text-right">الفئة</TableHead>
                <TableHead className="text-right">السعر</TableHead>
                <TableHead className="text-right">المخزون الحالي</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.price.toFixed(2)} ر.س</TableCell>
                  <TableCell className="font-bold">{item.stock}</TableCell>
                  <TableCell>
                    {item.stock < item.minStock ? (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full font-medium">
                        منخفض
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        جيد
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
