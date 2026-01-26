import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useReturns, useProducts, useCustomers, useDispatchRuns, useCreateReturn } from "@/hooks/useData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, AlertCircle, CheckCircle2, History, Plus, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import type { ReturnReason } from "@/lib/api";

const reasonLabels: Record<ReturnReason, string> = {
  GOOD: "مرتجع سليم",
  DAMAGED: "تالف",
  EXPIRED: "منتهي الصلاحية",
};

export default function ReturnsPage() {
  const { data: returns = [], isLoading } = useReturns();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: dispatchRuns = [] } = useDispatchRuns();
  const createReturn = useCreateReturn();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState("");
  const [runId, setRunId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState<ReturnReason>("GOOD");

  const totalReturnItems = returns.reduce((acc, ret) => acc + (ret.items?.length || 0), 0);
  const damagedCount = returns.reduce((acc, ret) => 
    acc + (ret.items?.filter(i => i.reason === 'DAMAGED').length || 0), 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !runId || !productId) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }

    try {
      await createReturn.mutateAsync({
        customerId,
        runId,
        items: [
          {
            productId,
            quantity: parseInt(quantity),
            reason,
          }
        ]
      });
      toast({ title: "تم تسجيل المرتجع بنجاح" });
      setOpen(false);
      // Reset form
      setCustomerId("");
      setRunId("");
      setProductId("");
      setQuantity("1");
      setReason("GOOD");
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة المرتجعات</h1>
            <p className="text-sm text-muted-foreground">تتبع وإدارة المنتجات المرتجعة من الرحلات.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                تسجيل مرتجع
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right">تسجيل مرتجع جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4 text-right">
                <div className="space-y-2">
                  <Label>الرحلة</Label>
                  <Select onValueChange={setRunId} value={runId}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر الرحلة" />
                    </SelectTrigger>
                    <SelectContent>
                      {dispatchRuns.map(run => (
                        <SelectItem key={run.id} value={run.id}>
                          {run.date} - {run.driverName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>العميل</Label>
                  <Select onValueChange={setCustomerId} value={customerId}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المنتج</Label>
                    <Select onValueChange={setProductId} value={productId}>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الكمية</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={quantity} 
                      onChange={(e) => setQuantity(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>سبب الإرجاع</Label>
                  <Select onValueChange={(val) => setReason(val as ReturnReason)} value={reason}>
                    <SelectTrigger className="text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOD">مرتجع سليم</SelectItem>
                      <SelectItem value="DAMAGED">تالف</SelectItem>
                      <SelectItem value="EXPIRED">منتهي الصلاحية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="flex flex-row-reverse gap-2 pt-4">
                  <Button type="submit" disabled={createReturn.isPending}>
                    {createReturn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تسجيل المرتجع"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
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
          <Card className={damagedCount > 0 ? "border-amber-500/50" : ""}>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مرتجعات تالفة</CardTitle>
              <AlertCircle className={damagedCount > 0 ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-muted-foreground"} />
            </CardHeader>
            <CardContent className="text-right">
              <div className={damagedCount > 0 ? "text-2xl font-bold text-amber-500" : "text-2xl font-bold"}>
                {damagedCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">مرتجعات سليمة</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {returns.reduce((acc, ret) => 
                  acc + (ret.items?.filter(i => i.reason === 'GOOD').length || 0), 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <Table className="text-right">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الرحلة</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">المنتج</TableHead>
                <TableHead className="text-right">الكمية</TableHead>
                <TableHead className="text-right">السبب</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.flatMap(ret => 
                (ret.items || []).map((item, idx) => {
                  const customer = customers.find(c => c.id === ret.customerId);
                  const run = dispatchRuns.find(r => r.id === ret.runId);
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <TableRow key={`${ret.id}-${idx}`}>
                      <TableCell className="font-mono text-xs">{run?.date || ret.runId}</TableCell>
                      <TableCell className="font-medium">{customer?.name}</TableCell>
                      <TableCell>{product?.name}</TableCell>
                      <TableCell className="font-bold">{item.quantity}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          item.reason === 'GOOD' ? 'bg-green-50 text-green-700' :
                          item.reason === 'DAMAGED' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {reasonLabels[item.reason]}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {returns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    لا توجد مرتجعات مسجلة
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
