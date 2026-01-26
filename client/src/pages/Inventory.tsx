import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useProducts, useUpdateProductStock, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/useData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, Plus, Edit2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/lib/api";

interface ProductFormData {
  name: string;
  sku: string;
  price: string;
  category: string;
  stock: number;
}

export default function InventoryPage() {
  const { data: products = [], isLoading } = useProducts();
  const updateStock = useUpdateProductStock();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  
  const [stockEditProduct, setStockEditProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState("");
  
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    price: "",
    category: "",
    stock: 0,
  });

  const lowStockItems = products.filter(item => item.stock < 50);

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stockEditProduct && newStock !== "") {
      try {
        await updateStock.mutateAsync({ id: stockEditProduct.id, stock: parseInt(newStock) });
        toast({ title: "تم تحديث المخزون" });
        setStockEditProduct(null);
        setNewStock("");
      } catch (error) {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    }
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      price: "",
      category: "",
      stock: 0,
    });
    setShowProductForm(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      price: product.price,
      category: product.category,
      stock: product.stock,
    });
    setShowProductForm(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          ...formData,
        });
        toast({ title: "تم تحديث المنتج بنجاح" });
      } else {
        await createProduct.mutateAsync(formData);
        toast({ title: "تم إضافة المنتج بنجاح" });
      }
      setShowProductForm(false);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async () => {
    if (productToDelete) {
      try {
        await deleteProduct.mutateAsync(productToDelete.id);
        toast({ title: "تم حذف المنتج" });
        setProductToDelete(null);
      } catch (error) {
        toast({ title: "حدث خطأ في حذف المنتج", variant: "destructive" });
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
          <Button className="flex items-center gap-2" variant="outline" onClick={openAddProduct} data-testid="button-add-product">
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
                <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
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
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditProduct(product)}
                        data-testid={`button-edit-product-${product.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStockEditProduct(product);
                          setNewStock(product.stock.toString());
                        }}
                        data-testid={`button-stock-product-${product.id}`}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setProductToDelete(product)}
                        data-testid={`button-delete-product-${product.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Stock Update Dialog */}
        <Dialog open={!!stockEditProduct} onOpenChange={(open) => !open && setStockEditProduct(null)}>
          <DialogContent dir="rtl" className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-right">تحديث المخزون</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateStock} className="space-y-4 py-4 text-right">
              <div className="space-y-2">
                <Label>المنتج</Label>
                <div className="p-3 bg-muted rounded-md font-bold">{stockEditProduct?.name}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">الكمية الجديدة</Label>
                <Input
                  id="stock"
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  min="0"
                  data-testid="input-stock"
                />
              </div>
              <DialogFooter className="flex flex-row-reverse gap-2 pt-4">
                <Button type="submit" disabled={updateStock.isPending} data-testid="button-save-stock">
                  {updateStock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setStockEditProduct(null)}>
                  إلغاء
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Product Add/Edit Dialog */}
        <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
          <DialogContent dir="rtl" className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-right">
                {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleProductSubmit} className="space-y-4 py-4 text-right">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم المنتج</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="input-product-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">رمز المنتج (SKU)</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                    data-testid="input-product-sku"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">السعر (ر.س)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    placeholder="0.00"
                    data-testid="input-product-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">الفئة</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    placeholder="مثال: خبز، معجنات"
                    data-testid="input-product-category"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="productStock">الكمية المتوفرة</Label>
                <Input
                  id="productStock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  required
                  data-testid="input-product-stock"
                />
              </div>
              <DialogFooter className="flex flex-row-reverse gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={createProduct.isPending || updateProduct.isPending}
                  data-testid="button-save-product"
                >
                  {(createProduct.isPending || updateProduct.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    editingProduct ? "حفظ التغييرات" : "إضافة المنتج"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowProductForm(false)}>
                  إلغاء
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">حذف المنتج</AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                هل أنت متأكد من حذف المنتج "{productToDelete?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-row-reverse gap-2">
              <AlertDialogAction 
                onClick={handleDeleteProduct}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                حذف
              </AlertDialogAction>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
