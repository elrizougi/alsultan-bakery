import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, Product } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, Plus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function InventoryPage() {
  const { products, updateProductStock } = useStore();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState("");

  const lowStockItems = products.filter(item => item.stock < 50);

  const handleUpdateStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct && newStock !== "") {
      updateProductStock(editingProduct.id, parseInt(newStock));
      setEditingProduct(null);
      setNewStock("");
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة المخزون</h1>
            <p className="text-sm text-muted-foreground">تتبع مستويات المخزون والمنتجات المتوفرة.</p>
          </div>
          <Button className="flex items-center gap-2" variant="outline">
            <Plus className="h-4 w-4" />
            إضافة منتج جديد
          </Button>
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
                {products.reduce((acc, item) => acc + (item.stock * item.price), 0).toLocaleString()} ر.س
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
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.price.toFixed(2)} ر.س</TableCell>
                  <TableCell className="font-bold">{item.stock ?? 0}</TableCell>
                  <TableCell>
                    {(item.stock ?? 0) < 50 ? (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full font-medium">
                        منخفض
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        جيد
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dialog open={!!editingProduct && editingProduct.id === item.id} onOpenChange={(o) => !o && setEditingProduct(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingProduct(item);
                          setNewStock((item.stock ?? 0).toString());
                        }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]" dir="rtl">
                        <DialogHeader>
                          <DialogTitle className="text-right">تحديث المخزون - {item.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpdateStock} className="space-y-4 py-4">
                          <div className="space-y-2 text-right">
                            <Label>الكمية الجديدة في المستودع</Label>
                            <Input 
                              type="number" 
                              value={newStock} 
                              onChange={(e) => setNewStock(e.target.value)} 
                              required
                            />
                          </div>
                          <DialogFooter>
                            <Button type="submit" className="w-full">تحديث الكمية</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
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
