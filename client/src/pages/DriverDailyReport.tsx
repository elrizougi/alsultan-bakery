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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, BarChart3, Users, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOrders, useProducts, useCustomers } from "@/hooks/useData";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function DriverDailyReportPage() {
  const currentUser = useStore(state => state.user);
  const driverId = currentUser?.id || "";
  const [isDetailedReportOpen, setIsDetailedReportOpen] = useState(false);

  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
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

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "منتج غير معروف";
  };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return "عميل نقدي";
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "عميل غير معروف";
  };

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

  const customerSalesData = () => {
    const customerMap = new Map<string, { 
      name: string; 
      totalQty: number; 
      totalAmount: number; 
      cashAmount: number;
      creditAmount: number;
      transactions: { productName: string; qty: number; price: number; type: string }[] 
    }>();

    transactions.forEach(tx => {
      if (tx.type === 'CASH_SALE' || tx.type === 'CREDIT_SALE') {
        const customerId = tx.customerId || 'cash_customer';
        const customerName = getCustomerName(tx.customerId);
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            name: customerName,
            totalQty: 0,
            totalAmount: 0,
            cashAmount: 0,
            creditAmount: 0,
            transactions: []
          });
        }
        
        const data = customerMap.get(customerId)!;
        const amount = parseFloat(tx.totalAmount || "0");
        data.totalQty += tx.quantity;
        data.totalAmount += amount;
        if (tx.type === 'CASH_SALE') {
          data.cashAmount += amount;
        } else {
          data.creditAmount += amount;
        }
        data.transactions.push({
          productName: getProductName(tx.productId),
          qty: tx.quantity,
          price: parseFloat(tx.unitPrice || "0"),
          type: tx.type === 'CASH_SALE' ? 'نقدي' : 'آجل'
        });
      }
    });

    return Array.from(customerMap.values());
  };

  const productMovementData = () => {
    const productMap = new Map<string, {
      name: string;
      received: number;
      sold: number;
      returned: number;
      damaged: number;
      free: number;
      difference: number;
    }>();

    assignedOrders.forEach(order => {
      order.items?.forEach(item => {
        const productId = item.productId;
        const productName = getProductName(productId);
        
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            name: productName,
            received: 0,
            sold: 0,
            returned: 0,
            damaged: 0,
            free: 0,
            difference: 0
          });
        }
        
        const data = productMap.get(productId)!;
        data.received += item.receivedQuantity ?? item.quantity;
      });
    });

    transactions.forEach(tx => {
      const productId = tx.productId;
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          name: getProductName(productId),
          received: 0,
          sold: 0,
          returned: 0,
          damaged: 0,
          free: 0,
          difference: 0
        });
      }
      
      const data = productMap.get(productId)!;
      
      if (tx.type === 'CASH_SALE' || tx.type === 'CREDIT_SALE') {
        data.sold += tx.quantity;
      } else if (tx.type === 'RETURN') {
        data.returned += tx.quantity;
      } else if (tx.type === 'DAMAGED') {
        data.damaged += tx.quantity;
      } else if (tx.type === 'FREE_DISTRIBUTION' || tx.type === 'FREE_SAMPLE') {
        data.free += tx.quantity;
      }
    });

    productMap.forEach(data => {
      data.difference = data.received - data.sold - data.returned - data.damaged - data.free;
    });

    return Array.from(productMap.values());
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">التقرير اليومي</h1>
          </div>
          <Button 
            onClick={() => setIsDetailedReportOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            data-testid="btn-detailed-report"
          >
            <BarChart3 className="h-5 w-5" />
            تقرير مفصل
          </Button>
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

        <Dialog open={isDetailedReportOpen} onOpenChange={setIsDetailedReportOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
                تقرير مفصل لحركة الخبز
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <Card className="border-green-100">
                <CardHeader className="bg-green-50 py-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    حركة المنتجات والفروقات
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-right font-bold">المنتج</TableHead>
                        <TableHead className="text-right font-bold">المستلم</TableHead>
                        <TableHead className="text-right font-bold">المباع</TableHead>
                        <TableHead className="text-right font-bold">المرتجع</TableHead>
                        <TableHead className="text-right font-bold">تالف</TableHead>
                        <TableHead className="text-right font-bold">مجاني</TableHead>
                        <TableHead className="text-right font-bold">الفرق</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productMovementData().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            لا توجد بيانات
                          </TableCell>
                        </TableRow>
                      ) : (
                        productMovementData().map((product, idx) => (
                          <TableRow key={idx} data-testid={`product-movement-${idx}`}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-green-600 font-bold">{product.received}</TableCell>
                            <TableCell className="text-blue-600">{product.sold}</TableCell>
                            <TableCell className="text-orange-600">{product.returned}</TableCell>
                            <TableCell className="text-gray-600">{product.damaged}</TableCell>
                            <TableCell className="text-purple-600">{product.free}</TableCell>
                            <TableCell className={product.difference !== 0 ? "text-red-600 font-bold" : "text-slate-600"}>
                              {product.difference}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-blue-100">
                <CardHeader className="bg-blue-50 py-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    مبيعات العملاء وأسعار البيع
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-right font-bold">العميل</TableHead>
                        <TableHead className="text-right font-bold">إجمالي الكمية</TableHead>
                        <TableHead className="text-right font-bold">نقدي</TableHead>
                        <TableHead className="text-right font-bold">آجل</TableHead>
                        <TableHead className="text-right font-bold">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerSalesData().length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                            لا توجد مبيعات
                          </TableCell>
                        </TableRow>
                      ) : (
                        customerSalesData().map((customer, idx) => (
                          <TableRow key={idx} data-testid={`customer-sales-${idx}`}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell className="text-slate-600">{customer.totalQty}</TableCell>
                            <TableCell className="text-emerald-600">{customer.cashAmount.toFixed(2)} ر.س</TableCell>
                            <TableCell className="text-amber-600">{customer.creditAmount.toFixed(2)} ر.س</TableCell>
                            <TableCell className="text-blue-600 font-bold">{customer.totalAmount.toFixed(2)} ر.س</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-indigo-100">
                <CardHeader className="bg-indigo-50 py-3">
                  <CardTitle className="text-lg font-bold">تفاصيل المبيعات حسب المنتج والعميل</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="text-right font-bold">العميل</TableHead>
                        <TableHead className="text-right font-bold">المنتج</TableHead>
                        <TableHead className="text-right font-bold">الكمية</TableHead>
                        <TableHead className="text-right font-bold">سعر الوحدة</TableHead>
                        <TableHead className="text-right font-bold">نوع البيع</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerSalesData().flatMap((customer, customerIdx) => 
                        customer.transactions.map((tx, txIdx) => (
                          <TableRow key={`${customerIdx}-${txIdx}`} data-testid={`sale-detail-${customerIdx}-${txIdx}`}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{tx.productName}</TableCell>
                            <TableCell>{tx.qty}</TableCell>
                            <TableCell>{tx.price.toFixed(2)} ر.س</TableCell>
                            <TableCell>
                              <span className={tx.type === 'نقدي' ? 'text-emerald-600' : 'text-amber-600'}>
                                {tx.type}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {customerSalesData().flatMap(c => c.transactions).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                            لا توجد مبيعات
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
