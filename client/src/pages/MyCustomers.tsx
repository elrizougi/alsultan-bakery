import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ExternalLink, Loader2, Phone, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProducts, useCustomers } from "@/hooks/useData";

export default function MyCustomersPage() {
  const currentUser = useStore(state => state.user);
  const driverId = currentUser?.id || "";

  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: products = [] } = useProducts();

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["driver-transactions", driverId],
    queryFn: () => api.getDriverTransactions(driverId),
    enabled: !!driverId,
  });

  const { data: debts = [] } = useQuery({
    queryKey: ["driver-debts", driverId],
    queryFn: () => api.getDriverCustomerDebts(driverId),
    enabled: !!driverId,
  });

  const myCustomers = customers.filter(c => c.driverId === driverId);

  const getProductName = (productId: string | undefined) => {
    if (!productId) return "-";
    const product = products.find(p => p.id === productId);
    return product?.name || "-";
  };

  const getCustomerStats = (customerId: string) => {
    const customerTransactions = transactions.filter(t => t.customerId === customerId);
    
    const cashSales = customerTransactions.filter(t => t.type === 'CASH_SALE');
    const creditSales = customerTransactions.filter(t => t.type === 'CREDIT_SALE');
    const returns = customerTransactions.filter(t => t.type === 'RETURN' || t.type === 'DAMAGED');

    const totalSoldQty = [...cashSales, ...creditSales].reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalSoldAmount = [...cashSales, ...creditSales].reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
    const cashAmount = cashSales.reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
    const creditAmount = creditSales.reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
    const returnQty = returns.reduce((sum, t) => sum + (t.quantity || 0), 0);

    const soldProducts = [...cashSales, ...creditSales].reduce((acc, t) => {
      const productName = getProductName(t.productId);
      if (!acc[productName]) acc[productName] = 0;
      acc[productName] += t.quantity || 0;
      return acc;
    }, {} as Record<string, number>);

    const customerDebt = debts
      .filter(d => d.customerId === customerId)
      .reduce((sum, d) => sum + parseFloat(d.amount || '0') - parseFloat(d.paidAmount || '0'), 0);

    return {
      totalSoldQty,
      totalSoldAmount,
      cashAmount,
      creditAmount,
      returnQty,
      soldProducts,
      customerDebt,
      hasCashSales: cashSales.length > 0,
      hasCreditSales: creditSales.length > 0,
    };
  };

  if (customersLoading || transactionsLoading) {
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">عملائي</h1>
            <p className="text-sm text-muted-foreground">قائمة العملاء المسجلين لك مع تفاصيل المبيعات</p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-bold text-primary">{myCustomers.length} عميل</span>
          </div>
        </div>

        <Card className="border-slate-100">
          <CardContent className="p-0">
            {myCustomers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>لا يوجد عملاء مسجلين لك</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-right font-bold">اسم العميل</TableHead>
                      <TableHead className="text-right font-bold">رقم الجوال</TableHead>
                      <TableHead className="text-right font-bold">الموقع</TableHead>
                      <TableHead className="text-right font-bold">الخبز المباع</TableHead>
                      <TableHead className="text-right font-bold">السعر</TableHead>
                      <TableHead className="text-right font-bold">المرتجع</TableHead>
                      <TableHead className="text-right font-bold">نوع الخبز</TableHead>
                      <TableHead className="text-right font-bold">المبلغ المتحصل</TableHead>
                      <TableHead className="text-right font-bold">الدين</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myCustomers.map((customer) => {
                      const stats = getCustomerStats(customer.id);
                      const soldProductsText = Object.entries(stats.soldProducts)
                        .map(([name, qty]) => `${name}: ${qty}`)
                        .join(', ') || '-';
                      
                      return (
                        <TableRow key={customer.id} data-testid={`row-my-customer-${customer.id}`} className="hover:bg-slate-50">
                          <TableCell className="font-bold text-slate-800">{customer.name}</TableCell>
                          <TableCell>
                            {customer.phone && customer.phone !== '0' ? (
                              <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {customer.locationUrl ? (
                              <a
                                href={customer.locationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                <MapPin className="h-3 w-3" />
                                خريطة
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="font-bold text-green-600">{stats.totalSoldQty}</span>
                              {soldProductsText !== '-' && (
                                <div className="text-xs text-slate-500 mt-1">{soldProductsText}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold">{stats.totalSoldAmount.toFixed(2)} ر.س</TableCell>
                          <TableCell>
                            {stats.returnQty > 0 ? (
                              <span className="text-red-600 font-bold">{stats.returnQty}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {Object.keys(stats.soldProducts).length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {Object.keys(stats.soldProducts).map((productName, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                    {productName}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-green-600">{stats.cashAmount.toFixed(2)} ر.س</TableCell>
                          <TableCell>
                            {stats.customerDebt > 0 ? (
                              <span className="font-bold text-red-600">{stats.customerDebt.toFixed(2)} ر.س</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
