import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, BarChart3, Users, Package, DollarSign, Undo2, AlertTriangle, ShoppingCart, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProducts, useCustomers, useUsers } from "@/hooks/useData";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function DriverDailyReportPage() {
  const currentUser = useStore(state => state.user);
  const isAdmin = currentUser?.role === 'ADMIN';
  const { data: users = [] } = useUsers();
  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const driverId = isAdmin ? selectedDriverId : (currentUser?.id || "");
  const [detailDate, setDetailDate] = useState<string | null>(null);

  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();

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

  const driverName = users.find(u => u.id === driverId)?.name || "";
  const driverCustomers = customers.filter(c => c.driverId === driverId);

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || "غير معروف";
  };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return "عميل نقدي";
    return customers.find(c => c.id === customerId)?.name || "غير معروف";
  };

  const allDates = new Set<string>();
  transactions.forEach(t => {
    if (t.createdAt) allDates.add(format(new Date(t.createdAt), 'yyyy-MM-dd'));
  });
  cashDeposits.forEach(d => {
    if (d.createdAt) allDates.add(format(new Date(d.createdAt), 'yyyy-MM-dd'));
  });
  const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));

  const getDayData = (date: string) => {
    const dayTx = transactions.filter(t =>
      t.createdAt && format(new Date(t.createdAt), 'yyyy-MM-dd') === date
    );

    const soldByProduct = new Map<string, { name: string; qty: number; amount: number }>();
    dayTx.filter(t => t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE').forEach(t => {
      const existing = soldByProduct.get(t.productId) || { name: getProductName(t.productId), qty: 0, amount: 0 };
      existing.qty += t.quantity;
      existing.amount += parseFloat(t.totalAmount || "0");
      soldByProduct.set(t.productId, existing);
    });

    const totalSoldQty = dayTx.filter(t => t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE')
      .reduce((s, t) => s + t.quantity, 0);

    const returnedQty = dayTx.filter(t => t.type === 'RETURN').reduce((s, t) => s + t.quantity, 0);
    const damagedQty = dayTx.filter(t => t.type === 'DAMAGED').reduce((s, t) => s + t.quantity, 0);
    const freeQty = dayTx.filter(t => t.type === 'FREE_DISTRIBUTION' || t.type === 'FREE_SAMPLE')
      .reduce((s, t) => s + t.quantity, 0);

    const totalBread = totalSoldQty + returnedQty + damagedQty + freeQty;

    const cashAmount = dayTx.filter(t => t.type === 'CASH_SALE')
      .reduce((s, t) => s + parseFloat(t.totalAmount || "0"), 0);
    const creditAmount = dayTx.filter(t => t.type === 'CREDIT_SALE')
      .reduce((s, t) => s + parseFloat(t.totalAmount || "0"), 0);
    const totalSalesAmount = cashAmount + creditAmount;

    const expensesAmount = dayTx.filter(t => (t.type as string) === 'EXPENSE')
      .reduce((s, t) => s + parseFloat(t.totalAmount || "0"), 0);

    const servedCustomerIds = new Set(
      dayTx.filter(t => t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE')
        .map(t => t.customerId).filter(Boolean)
    );

    const dayDeposits = cashDeposits.filter(d =>
      d.createdAt && format(new Date(d.createdAt), 'yyyy-MM-dd') === date && d.status === 'CONFIRMED'
    );
    const deposited = dayDeposits.reduce((s, d) => s + parseFloat(d.amount), 0);

    return {
      soldByProduct: Array.from(soldByProduct.values()),
      totalSoldQty,
      returnedQty,
      damagedQty,
      freeQty,
      totalBread,
      cashAmount,
      creditAmount,
      totalSalesAmount,
      expensesAmount,
      servedCustomerIds,
      servedCount: servedCustomerIds.size,
      deposited,
      dayTx,
    };
  };

  const getDetailedCustomerData = (date: string) => {
    const dayTx = transactions.filter(t =>
      t.createdAt && format(new Date(t.createdAt), 'yyyy-MM-dd') === date
    );

    const customerMap = new Map<string, {
      name: string;
      items: { productName: string; qty: number; unitPrice: number; total: number; type: string }[];
      totalQty: number;
      cashAmount: number;
      creditAmount: number;
      totalAmount: number;
    }>();

    dayTx.filter(t => t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE').forEach(tx => {
      const cid = tx.customerId || 'cash';
      if (!customerMap.has(cid)) {
        customerMap.set(cid, {
          name: getCustomerName(tx.customerId),
          items: [],
          totalQty: 0,
          cashAmount: 0,
          creditAmount: 0,
          totalAmount: 0,
        });
      }
      const data = customerMap.get(cid)!;
      const amount = parseFloat(tx.totalAmount || "0");
      data.totalQty += tx.quantity;
      data.totalAmount += amount;
      if (tx.type === 'CASH_SALE') data.cashAmount += amount;
      else data.creditAmount += amount;
      data.items.push({
        productName: getProductName(tx.productId),
        qty: tx.quantity,
        unitPrice: parseFloat(tx.unitPrice || "0"),
        total: amount,
        type: tx.type === 'CASH_SALE' ? 'نقدي' : 'آجل',
      });
    });

    const returnData = dayTx.filter(t => t.type === 'RETURN').map(t => ({
      productName: getProductName(t.productId),
      qty: t.quantity,
    }));

    const damagedData = dayTx.filter(t => t.type === 'DAMAGED').map(t => ({
      productName: getProductName(t.productId),
      qty: t.quantity,
      customerName: getCustomerName(t.customerId),
    }));

    const expenseData = dayTx.filter(t => (t.type as string) === 'EXPENSE').map(t => ({
      description: t.notes || '-',
      amount: parseFloat(t.totalAmount || "0"),
    }));

    return {
      customers: Array.from(customerMap.values()),
      returnData,
      damagedData,
      expenseData,
    };
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">التقرير اليومي</h1>
          </div>
        </div>

        {isAdmin && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <Label className="font-bold text-lg whitespace-nowrap">اختر المندوب:</Label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger className="max-w-xs bg-white" data-testid="select-driver-report">
                    <SelectValue placeholder="اختر المندوب لعرض تقريره" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {isAdmin && !driverId && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg">يرجى اختيار المندوب أولاً لعرض التقرير اليومي</p>
          </div>
        )}

        {(!isAdmin || driverId) && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500 rounded-xl">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-600">عملاء المندوب {driverName}</p>
                      <p className="text-2xl font-bold text-blue-700" data-testid="text-total-driver-customers">{driverCustomers.length}</p>
                      <p className="text-xs text-blue-600/70">إجمالي العملاء المسجلين</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500 rounded-xl">
                      <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-600">عملاء تم التوزيع لهم اليوم</p>
                      <p className="text-2xl font-bold text-green-700" data-testid="text-served-today">
                        {sortedDates.length > 0 ? getDayData(sortedDates[0]).servedCount : 0}
                      </p>
                      <p className="text-xs text-green-600/70">
                        من أصل {driverCustomers.length} عميل
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-100">
              <CardHeader className="bg-gradient-to-l from-blue-50 to-indigo-50 rounded-t-lg">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  سجل العمليات اليومية - {driverName}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-right font-bold">التاريخ</TableHead>
                        <TableHead className="text-right font-bold">مجموع الخبز</TableHead>
                        <TableHead className="text-right font-bold">المباع</TableHead>
                        <TableHead className="text-right font-bold">المرتجع</TableHead>
                        <TableHead className="text-right font-bold">التالف</TableHead>
                        <TableHead className="text-right font-bold">النقدي</TableHead>
                        <TableHead className="text-right font-bold">الآجل</TableHead>
                        <TableHead className="text-right font-bold">الإجمالي</TableHead>
                        <TableHead className="text-right font-bold">المصروفات</TableHead>
                        <TableHead className="text-right font-bold">عملاء اليوم</TableHead>
                        <TableHead className="text-right font-bold">تفاصيل</TableHead>
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
                          const day = getDayData(date);
                          return (
                            <TableRow key={date} data-testid={`report-row-${date}`}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {format(new Date(date), 'EEEE dd/MM/yyyy', { locale: ar })}
                              </TableCell>
                              <TableCell className="text-blue-700 font-bold">{day.totalBread}</TableCell>
                              <TableCell className="text-green-600 font-bold">
                                {day.totalSoldQty}
                                {day.soldByProduct.length > 1 && (
                                  <div className="text-xs text-green-500 mt-1">
                                    {day.soldByProduct.map((p, i) => (
                                      <span key={i} className="block">{p.name}: {p.qty}</span>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-orange-600">{day.returnedQty}</TableCell>
                              <TableCell className="text-gray-600">{day.damagedQty}</TableCell>
                              <TableCell className="text-emerald-600">{day.cashAmount.toFixed(2)} ر.س</TableCell>
                              <TableCell className="text-amber-600">{day.creditAmount.toFixed(2)} ر.س</TableCell>
                              <TableCell className="text-blue-600 font-bold">{day.totalSalesAmount.toFixed(2)} ر.س</TableCell>
                              <TableCell className="text-red-600">{day.expensesAmount > 0 ? `${day.expensesAmount.toFixed(2)} ر.س` : '-'}</TableCell>
                              <TableCell className="text-purple-600 font-medium">{day.servedCount}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 gap-1"
                                  onClick={() => setDetailDate(date)}
                                  data-testid={`btn-details-${date}`}
                                >
                                  <Eye className="h-4 w-4" />
                                  تفاصيل
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={!!detailDate} onOpenChange={(open) => !open && setDetailDate(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
                تقرير مفصل - {driverName} - {detailDate ? format(new Date(detailDate), 'EEEE dd/MM/yyyy', { locale: ar }) : ''}
              </DialogTitle>
            </DialogHeader>

            {detailDate && (() => {
              const detail = getDetailedCustomerData(detailDate);
              const day = getDayData(detailDate);

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-blue-600 font-medium">مجموع الخبز</p>
                        <p className="text-2xl font-bold text-blue-700">{day.totalBread}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-green-600 font-medium">المباع</p>
                        <p className="text-2xl font-bold text-green-700">{day.totalSoldQty}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-orange-600 font-medium">مرتجع + تالف</p>
                        <p className="text-2xl font-bold text-orange-700">{day.returnedQty + day.damagedQty}</p>
                        <div className="flex justify-center gap-2 text-xs text-orange-500 mt-1">
                          <span>مرتجع: {day.returnedQty}</span>
                          <span>تالف: {day.damagedQty}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-200">
                      <CardContent className="pt-4 pb-4 text-center">
                        <p className="text-xs text-emerald-600 font-medium">إجمالي المبيعات</p>
                        <p className="text-xl font-bold text-emerald-700">{day.totalSalesAmount.toFixed(2)} ر.س</p>
                        <div className="flex justify-center gap-2 text-xs text-emerald-500 mt-1">
                          <span>نقدي: {day.cashAmount.toFixed(2)}</span>
                          <span>آجل: {day.creditAmount.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {day.soldByProduct.length > 0 && (
                    <Card className="border-green-100">
                      <CardHeader className="bg-green-50 py-3">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <Package className="h-5 w-5 text-green-600" />
                          المبيعات حسب نوع الخبز
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-right font-bold">المنتج</TableHead>
                              <TableHead className="text-right font-bold">الكمية</TableHead>
                              <TableHead className="text-right font-bold">المبلغ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {day.soldByProduct.map((p, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell>{p.qty}</TableCell>
                                <TableCell>{p.amount.toFixed(2)} ر.س</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-slate-50 font-bold">
                              <TableCell>الإجمالي</TableCell>
                              <TableCell>{day.totalSoldQty}</TableCell>
                              <TableCell>{day.totalSalesAmount.toFixed(2)} ر.س</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-blue-100">
                    <CardHeader className="bg-blue-50 py-3">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        مبيعات العملاء ({detail.customers.length} عميل)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-right font-bold">العميل</TableHead>
                            <TableHead className="text-right font-bold">المنتج</TableHead>
                            <TableHead className="text-right font-bold">الكمية</TableHead>
                            <TableHead className="text-right font-bold">سعر الوحدة</TableHead>
                            <TableHead className="text-right font-bold">المبلغ</TableHead>
                            <TableHead className="text-right font-bold">نوع البيع</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.customers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">لا توجد مبيعات</TableCell>
                            </TableRow>
                          ) : (
                            detail.customers.flatMap((cust, ci) =>
                              cust.items.map((item, ii) => (
                                <TableRow key={`${ci}-${ii}`} data-testid={`detail-sale-${ci}-${ii}`}>
                                  {ii === 0 ? (
                                    <TableCell rowSpan={cust.items.length} className="font-medium border-l align-top">
                                      {cust.name}
                                      <div className="text-xs text-slate-400 mt-1">
                                        إجمالي: {cust.totalAmount.toFixed(2)} ر.س
                                      </div>
                                    </TableCell>
                                  ) : null}
                                  <TableCell>{item.productName}</TableCell>
                                  <TableCell>{item.qty}</TableCell>
                                  <TableCell>{item.unitPrice.toFixed(2)} ر.س</TableCell>
                                  <TableCell>{item.total.toFixed(2)} ر.س</TableCell>
                                  <TableCell>
                                    <Badge className={item.type === 'نقدي' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}>
                                      {item.type}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))
                            )
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {detail.returnData.length > 0 && (
                    <Card className="border-orange-100">
                      <CardHeader className="bg-orange-50 py-3">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <Undo2 className="h-5 w-5 text-orange-600" />
                          المرتجعات
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-right font-bold">المنتج</TableHead>
                              <TableHead className="text-right font-bold">الكمية</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detail.returnData.map((r, i) => (
                              <TableRow key={i}>
                                <TableCell>{r.productName}</TableCell>
                                <TableCell className="text-orange-600 font-bold">{r.qty}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {detail.damagedData.length > 0 && (
                    <Card className="border-gray-200">
                      <CardHeader className="bg-gray-50 py-3">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-gray-600" />
                          الخبز التالف
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-right font-bold">المنتج</TableHead>
                              <TableHead className="text-right font-bold">الكمية</TableHead>
                              <TableHead className="text-right font-bold">العميل</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detail.damagedData.map((d, i) => (
                              <TableRow key={i}>
                                <TableCell>{d.productName}</TableCell>
                                <TableCell className="text-gray-600 font-bold">{d.qty}</TableCell>
                                <TableCell>{d.customerName}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {detail.expenseData.length > 0 && (
                    <Card className="border-red-100">
                      <CardHeader className="bg-red-50 py-3">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-red-600" />
                          المصروفات
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-right font-bold">البند</TableHead>
                              <TableHead className="text-right font-bold">المبلغ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detail.expenseData.map((e, i) => (
                              <TableRow key={i}>
                                <TableCell>{e.description}</TableCell>
                                <TableCell className="text-red-600 font-bold">{e.amount.toFixed(2)} ر.س</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-red-50 font-bold">
                              <TableCell>الإجمالي</TableCell>
                              <TableCell className="text-red-700">{day.expensesAmount.toFixed(2)} ر.س</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
