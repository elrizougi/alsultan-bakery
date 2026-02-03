import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Loader2, FileEdit, Clock, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type OrderModification } from "@/lib/api";
import { useProducts, useUsers, useOrders } from "@/hooks/useData";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: "قيد الانتظار", color: "bg-amber-100 text-amber-700 border-amber-300", icon: <Clock className="h-3 w-3" /> },
  APPROVED: { label: "موافق عليه", color: "bg-green-100 text-green-700 border-green-300", icon: <CheckCircle className="h-3 w-3" /> },
  REJECTED: { label: "مرفوض", color: "bg-red-100 text-red-700 border-red-300", icon: <XCircle className="h-3 w-3" /> },
};

export default function OrderModificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedModification, setSelectedModification] = useState<OrderModification | null>(null);
  const [filter, setFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("all");

  const { data: products = [] } = useProducts();
  const { data: users = [] } = useUsers();
  const { data: orders = [] } = useOrders();

  const { data: modifications = [], isLoading } = useQuery({
    queryKey: ["order-modifications"],
    queryFn: api.getAllModifications,
  });

  const approveMutation = useMutation({
    mutationFn: api.approveOrderModification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-modifications"] });
      queryClient.invalidateQueries({ queryKey: ["driver-inventory"] });
      toast({ title: "تمت الموافقة على التعديل وتحديث مخزون السائق" });
      setSelectedModification(null);
    },
    onError: () => {
      toast({ title: "حدث خطأ في الموافقة على التعديل", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: api.rejectOrderModification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-modifications"] });
      toast({ title: "تم رفض طلب التعديل" });
      setSelectedModification(null);
    },
    onError: () => {
      toast({ title: "حدث خطأ في رفض التعديل", variant: "destructive" });
    },
  });

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || "منتج غير معروف";
  };

  const getDriverName = (driverId: string) => {
    return users.find(u => u.id === driverId)?.name || "سائق غير معروف";
  };

  const getOrderNumber = (orderId: string) => {
    return `#${orderId.slice(0, 8)}`;
  };

  const filteredModifications = filter === "all" 
    ? modifications 
    : modifications.filter(m => m.status === filter);

  const pendingCount = modifications.filter(m => m.status === "PENDING").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileEdit className="h-8 w-8 text-primary" />
              طلبات التعديل
            </h1>
            <p className="text-muted-foreground mt-1">
              مراجعة طلبات تعديل الطلبات من السائقين
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white px-3 py-1 text-lg">
              {pendingCount} طلب جديد
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            data-testid="filter-all"
          >
            الكل ({modifications.length})
          </Button>
          <Button
            variant={filter === "PENDING" ? "default" : "outline"}
            onClick={() => setFilter("PENDING")}
            className={filter === "PENDING" ? "" : "border-amber-500 text-amber-700"}
            data-testid="filter-pending"
          >
            قيد الانتظار ({pendingCount})
          </Button>
          <Button
            variant={filter === "APPROVED" ? "default" : "outline"}
            onClick={() => setFilter("APPROVED")}
            className={filter === "APPROVED" ? "" : "border-green-500 text-green-700"}
            data-testid="filter-approved"
          >
            موافق عليه ({modifications.filter(m => m.status === "APPROVED").length})
          </Button>
          <Button
            variant={filter === "REJECTED" ? "default" : "outline"}
            onClick={() => setFilter("REJECTED")}
            className={filter === "REJECTED" ? "" : "border-red-500 text-red-700"}
            data-testid="filter-rejected"
          >
            مرفوض ({modifications.filter(m => m.status === "REJECTED").length})
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredModifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد طلبات تعديل
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الطلب</TableHead>
                    <TableHead className="text-right">السائق</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الملاحظات</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModifications.map((mod) => (
                    <TableRow 
                      key={mod.id} 
                      className={mod.status === "PENDING" ? "bg-amber-50/50" : ""}
                      data-testid={`row-modification-${mod.id}`}
                    >
                      <TableCell className="font-mono">{getOrderNumber(mod.orderId)}</TableCell>
                      <TableCell>{getDriverName(mod.driverId)}</TableCell>
                      <TableCell>
                        {format(new Date(mod.createdAt), "dd/MM/yyyy HH:mm", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusLabels[mod.status].color}>
                          <span className="flex items-center gap-1">
                            {statusLabels[mod.status].icon}
                            {statusLabels[mod.status].label}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {mod.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedModification(mod)}
                          data-testid={`btn-view-modification-${mod.id}`}
                        >
                          عرض التفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedModification} onOpenChange={(open) => !open && setSelectedModification(null)}>
        <DialogContent className="sm:max-w-[600px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-primary" />
              تفاصيل طلب التعديل
            </DialogTitle>
          </DialogHeader>
          {selectedModification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">رقم الطلب:</span>
                  <span className="font-mono mr-2">{getOrderNumber(selectedModification.orderId)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">السائق:</span>
                  <span className="font-medium mr-2">{getDriverName(selectedModification.driverId)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">التاريخ:</span>
                  <span className="mr-2">
                    {format(new Date(selectedModification.createdAt), "dd/MM/yyyy HH:mm", { locale: ar })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">الحالة:</span>
                  <Badge variant="outline" className={`mr-2 ${statusLabels[selectedModification.status].color}`}>
                    {statusLabels[selectedModification.status].label}
                  </Badge>
                </div>
              </div>

              {selectedModification.notes && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-muted-foreground text-sm">ملاحظات السائق:</span>
                  <p className="mt-1">{selectedModification.notes}</p>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-center">الكمية الأصلية</TableHead>
                      <TableHead className="text-center">الكمية المطلوبة</TableHead>
                      <TableHead className="text-center">الفرق</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedModification.items?.map((item) => {
                      const diff = item.requestedQuantity - item.originalQuantity;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{getProductName(item.productId)}</TableCell>
                          <TableCell className="text-center">{item.originalQuantity}</TableCell>
                          <TableCell className="text-center font-bold">{item.requestedQuantity}</TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline" 
                              className={diff > 0 ? "bg-green-100 text-green-700" : diff < 0 ? "bg-red-100 text-red-700" : "bg-gray-100"}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedModification?.status === "PENDING" && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => rejectMutation.mutate(selectedModification.id)}
                  disabled={rejectMutation.isPending || approveMutation.isPending}
                  className="border-red-500 text-red-700 hover:bg-red-50"
                  data-testid="btn-reject-modification"
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 ml-1" />
                      رفض
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => approveMutation.mutate(selectedModification.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="btn-approve-modification"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 ml-1" />
                      موافقة
                    </>
                  )}
                </Button>
              </>
            )}
            {selectedModification?.status !== "PENDING" && (
              <Button variant="outline" onClick={() => setSelectedModification(null)}>
                إغلاق
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
