import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Loader2, Phone, MapPin, Download, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProducts, useCustomers, useUsers } from "@/hooks/useData";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export default function MyCustomersPage() {
  const currentUser = useStore(state => state.user);
  const isAdmin = currentUser?.role === 'ADMIN';
  const { data: allUsers = [] } = useUsers();
  const driversList = allUsers.filter(u => u.role === 'DRIVER' && u.isActive !== false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const driverId = isAdmin ? selectedDriverId : (currentUser?.id || "");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const filteredTransactions = transactions.filter(t => {
    if (!t.createdAt) return false;
    
    if (!dateFrom && !dateTo) return true;
    
    const txDate = new Date(t.createdAt);
    
    if (dateFrom && dateTo) {
      return isWithinInterval(txDate, {
        start: startOfDay(parseISO(dateFrom)),
        end: endOfDay(parseISO(dateTo))
      });
    }
    
    if (dateFrom) {
      return txDate >= startOfDay(parseISO(dateFrom));
    }
    
    if (dateTo) {
      return txDate <= endOfDay(parseISO(dateTo));
    }
    
    return true;
  });

  const getCustomerStats = (customerId: string) => {
    const customerTransactions = filteredTransactions.filter(t => t.customerId === customerId);
    
    const cashSales = customerTransactions.filter(t => t.type === 'CASH_SALE');
    const creditSales = customerTransactions.filter(t => t.type === 'CREDIT_SALE');
    const returns = customerTransactions.filter(t => t.type === 'RETURN' || t.type === 'DAMAGED');

    const totalSoldQty = [...cashSales, ...creditSales].reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalSoldAmount = [...cashSales, ...creditSales].reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
    const cashAmount = cashSales.reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);
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
      returnQty,
      soldProducts,
      customerDebt,
    };
  };

  const handleExportCSV = () => {
    const headers = ["اسم العميل", "رقم الجوال", "رابط الموقع", "الخبز المباع", "نوع الخبز", "السعر", "المرتجع", "المبلغ المتحصل", "الدين"];
    
    const rows = myCustomers.map(customer => {
      const stats = getCustomerStats(customer.id);
      const breadTypes = Object.keys(stats.soldProducts).join(" / ") || "-";
      
      return [
        customer.name,
        customer.phone || "-",
        customer.locationUrl || "-",
        stats.totalSoldQty.toString(),
        breadTypes,
        stats.totalSoldAmount.toFixed(2),
        stats.returnQty.toString(),
        stats.cashAmount.toFixed(2),
        stats.customerDebt.toFixed(2)
      ];
    });

    const csvContent = "\uFEFF" + [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const dateStr = dateFrom && dateTo ? `_${dateFrom}_${dateTo}` : "";
    link.download = `عملائي${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
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
            <p className="text-sm text-muted-foreground">قائمة العملاء المسجلين مع تفاصيل المبيعات</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-bold text-primary">{myCustomers.length} عميل</span>
            </div>
            <Button onClick={handleExportCSV} variant="outline" className="gap-2" data-testid="button-export-csv" disabled={isAdmin && !driverId}>
              <Download className="h-4 w-4" />
              تحميل CSV
            </Button>
          </div>
        </div>

        {isAdmin && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <Label className="font-bold text-lg whitespace-nowrap">اختر المندوب:</Label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger className="max-w-xs bg-white" data-testid="select-driver-customers">
                    <SelectValue placeholder="اختر المندوب لعرض عملائه" />
                  </SelectTrigger>
                  <SelectContent>
                    {driversList.map(driver => (
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
            <p className="text-lg">يرجى اختيار المندوب أولاً لعرض عملائه</p>
          </div>
        )}

        {(!isAdmin || driverId) && (
        <>
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-500" />
                <span className="font-medium text-slate-700">فلتر التاريخ:</span>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">من</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                  data-testid="input-date-from"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">إلى</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                  data-testid="input-date-to"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filter">
                  مسح الفلتر
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

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
                            <span className="font-bold text-green-600">{stats.totalSoldQty}</span>
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
        </>
        )}
      </div>
    </AdminLayout>
  );
}
