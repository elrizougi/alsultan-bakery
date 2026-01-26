import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useProducts, useUpdateProductStock } from "@/hooks/useData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, Plus, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/lib/api";

export default function InventoryPage() {
  const { data: products = [], isLoading } = useProducts();
  const updateStock = useUpdateProductStock();
  const { toast } = useToast();
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState("");

  const lowStockItems = products.filter(item => item.stock < 50);

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct && newStock !== "") {
      try {
        await updateStock.mutateAsync({ id: editingProduct.id, stock: parseInt(newStock) });
        toast({ title: "تم تحديث المخزون" });
        setEditingProduct(null);
        setNewStock("");
      } catch (error) {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    }
  };

  if (isLoading) {
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
                {products.reduce((acc, item) => acc + (item.stock * parseFloat(item.price)), 0).toLocaleString()} ر.س
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
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{parseFloat(product.price).toFixed(2)} ر.س</TableCell>
                  <TableCell className="font-bold">{product.stock}</TableCell>
                  <TableCell>
                    {product.stock < 50 ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                        منخفض
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        متوفر
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingProduct(product);
                        setNewStock(product.stock.toString());
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent dir="rtl" className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-right">تحديث المخزون</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateStock} className="space-y-4 py-4 text-right">
              <div className="space-y-2">
                <Label>المنتج</Label>
                <div className="p-3 bg-muted rounded-md font-bold">{editingProduct?.name}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">الكمية الجديدة</Label>
                <Input
                  id="stock"
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  min="0"
                />
              </div>
              <DialogFooter className="flex flex-row-reverse gap-2 pt-4">
                <Button type="submit" disabled={updateStock.isPending}>
                  {updateStock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>
                  إلغاء
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
