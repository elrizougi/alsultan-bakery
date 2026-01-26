import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, ReturnRecord, ReturnReason } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, AlertCircle, CheckCircle2, History, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ReturnsPage() {
  const { returns, products, customers, dispatchRuns, addReturn } = useStore();
  const [open, setOpen] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [runId, setRunId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState<ReturnReason>("GOOD");

  const totalReturnItems = returns.reduce((acc, ret) => acc + ret.items.length, 0);
  const damagedCount = returns.reduce((acc, ret) => 
    acc + ret.items.filter(i => i.reason === 'DAMAGED').length, 0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !runId || !productId) return;

    const newReturn: ReturnRecord = {
      id: Math.random().toString(36).substr(2, 9),
      customerId,
      runId,
      items: [
        {
          productId,
          quantity: parseInt(quantity),
          reason,
        }
      ]
    };

    addReturn(newReturn);
    setOpen(false);
    // Reset form
    setCustomerId("");
    setRunId("");
    setProductId("");
    setQuantity("1");
    setReason("GOOD");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة المرتجعات</h1>
            <p className="text-sm text-muted-foreground">تتبع المرتجعات من العملاء وأسبابها.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                إضافة مرتجع
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right">تسجيل مرتجع جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2 text-right">
                  <Label>العميل</Label>
                  <Select onValueChange={setCustomerId} value={customerId}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 text-right">
                  <Label>المنتج</Label>
                  <Select onValueChange={setProductId} value={productId}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر المنتج" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-right">
                    <Label>الكمية</Label>
                    <Input 
                      type="number" 
                      value={quantity} 
                      onChange={(e) => setQuantity(e.target.value)} 
                      min="1"
                    />
                  </div>
                  <div className="space-y-2 text-right">
                    <Label>الحالة</Label>
                    <Select onValueChange={(v) => setReason(v as ReturnReason)} value={reason}>
                      <SelectTrigger className="text-right">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GOOD">سليم</SelectItem>
                        <SelectItem value="DAMAGED">تالف</SelectItem>
                        <SelectItem value="EXPIRED">منتهي الصلاحية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Label>رقم الرحلة</Label>
                  <Select onValueChange={setRunId} value={runId}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر الرحلة" />
                    </SelectTrigger>
                    <SelectContent>
                      {dispatchRuns.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.id} - {r.driverName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit" className="w-full">حفظ المرتجع</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
