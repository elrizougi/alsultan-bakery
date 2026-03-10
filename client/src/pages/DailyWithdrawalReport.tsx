import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileSpreadsheet, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCustomers, useProducts, useUsers } from "@/hooks/useData";
import { useState, useRef } from "react";
import { useStore } from "@/lib/store";

export default function DailyWithdrawalReportPage() {
  const currentUser = useStore(state => state.user);
  const canExport = currentUser?.role !== 'SUB_ADMIN';
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDriverId, setSelectedDriverId] = useState<string>("all");
  const tableRef = useRef<HTMLDivElement>(null);

  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: users = [] } = useUsers();
  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: api.getAllTransactions,
  });

  const { data: allDebts = [] } = useQuery({
    queryKey: ['allCustomerDebts'],
    queryFn: api.getAllCustomerDebts,
  });

  const { data: allCustomerPrices = [] } = useQuery({
    queryKey: ['customer-prices-all'],
    queryFn: async () => {
      const res = await fetch('/api/customer-prices/all');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const productMap: Record<string, { name: string; price: number }> = {};
  products.forEach(p => {
    productMap[p.id] = { name: p.name, price: parseFloat(p.price || '0') };
  });

  const findProductByName = (keyword: string) => products.find(p => p.name.includes(keyword));
  const whiteProduct = findProductByName('ابيض');
  const brownProduct = findProductByName('بر');
  const mediumProduct = findProductByName('وسط');
  const superProduct = products.find(p => p.name.includes('شاورما') || p.name.includes('سوبر'));
  const wrappedProduct = findProductByName('مغلف');

  const whitePrice = whiteProduct ? parseFloat(whiteProduct.price) : 0;
  const wrappedPrice = wrappedProduct ? parseFloat(wrappedProduct.price) : 0;

  const isAllDrivers = selectedDriverId === 'all';

  const dayTransactions = transactions.filter(t => {
    if (!t.createdAt) return false;
    const txDate = format(new Date(t.createdAt), 'yyyy-MM-dd');
    if (txDate !== selectedDate) return false;
    if (!isAllDrivers && t.driverId !== selectedDriverId) return false;
    return true;
  });

  const salesAndReturns = dayTransactions.filter(t =>
    ['CASH_SALE', 'CREDIT_SALE', 'DAMAGED', 'FREE_DISTRIBUTION', 'FREE_SAMPLE'].includes(t.type as string)
  );

  const saleTypes = ['CASH_SALE', 'CREDIT_SALE', 'FREE_DISTRIBUTION', 'FREE_SAMPLE'];

  const computeRowFromTransactions = (txns: any[], debtsFilter: (d: any) => boolean) => {
    const getQty = (productId: string | undefined, types: string[]) => {
      if (!productId) return 0;
      return txns
        .filter(t => t.productId === productId && types.includes(t.type as string))
        .reduce((sum, t) => sum + (t.quantity || 0), 0);
    };

    const whiteBread = getQty(whiteProduct?.id, saleTypes);
    const brownBread = getQty(brownProduct?.id, saleTypes);
    const medium = getQty(mediumProduct?.id, saleTypes);
    const superBread = getQty(superProduct?.id, saleTypes);
    const wrapped = getQty(wrappedProduct?.id, saleTypes);

    const returned = txns
      .filter(t => t.type === 'DAMAGED')
      .reduce((sum, t) => sum + (t.quantity || 0), 0);

    const totalBread = whiteBread + brownBread + medium + superBread + wrapped;
    const grossBread = whiteBread + brownBread + medium + superBread + wrapped;
    const damagedPercent = grossBread > 0 ? (returned / grossBread) * 100 : 0;

    const whiteAmount = txns
      .filter(t => t.productId === whiteProduct?.id && saleTypes.includes(t.type as string))
      .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);

    const wrappedAmount = txns
      .filter(t => t.productId === wrappedProduct?.id && saleTypes.includes(t.type as string))
      .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);

    const totalAmount = txns
      .filter(t => saleTypes.includes(t.type as string))
      .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);

    const cashPaid = txns
      .filter(t => t.type === 'CASH_SALE')
      .reduce((sum, t) => sum + parseFloat(t.totalAmount || '0'), 0);

    const filteredDebts = allDebts.filter(debtsFilter);
    const debtPaidToday = filteredDebts
      .filter((d: any) => d.isPaid)
      .reduce((sum: number, d: any) => sum + parseFloat(d.paidAmount || '0'), 0);
    const partialPaidToday = filteredDebts
      .filter((d: any) => !d.isPaid && parseFloat(d.paidAmount || '0') > 0)
      .reduce((sum: number, d: any) => sum + parseFloat(d.paidAmount || '0'), 0);

    const paidAmount = cashPaid + debtPaidToday + partialPaidToday;
    const remaining = totalAmount - paidAmount;

    const whiteSaleTxn = txns.find(t => t.productId === whiteProduct?.id && saleTypes.includes(t.type as string));
    const unitPrice = whiteSaleTxn ? parseFloat(whiteSaleTxn.unitPrice || '0') : 0;

    return { whiteBread, brownBread, medium, superBread, wrapped, returned, damagedPercent, totalBread, whiteAmount, wrappedAmount, totalAmount, paidAmount, remaining, unitPrice };
  };

  const reportRows = isAllDrivers
    ? (() => {
        const driverIds = [...new Set(salesAndReturns.map(t => t.driverId).filter(Boolean))];
        return driverIds.map(drvId => {
          const driverTxns = salesAndReturns.filter(t => t.driverId === drvId);
          const driver = drivers.find(d => d.id === drvId);
          const row = computeRowFromTransactions(driverTxns, (d: any) =>
            d.driverId === drvId &&
            d.createdAt && format(new Date(d.createdAt), 'yyyy-MM-dd') === selectedDate
          );
          return { id: drvId!, name: driver?.name || '-', ...row };
        }).filter(r => r.totalBread > 0 || r.totalAmount > 0);
      })()
    : (() => {
        const customerIds = [...new Set(salesAndReturns.map(t => t.customerId).filter(Boolean))];
        return customerIds.map(custId => {
          const custTxns = salesAndReturns.filter(t => t.customerId === custId);
          const customer = customers.find(c => c.id === custId);
          const row = computeRowFromTransactions(custTxns, (d: any) =>
            d.customerId === custId &&
            d.driverId === selectedDriverId &&
            d.createdAt && format(new Date(d.createdAt), 'yyyy-MM-dd') === selectedDate
          );
          return { id: custId!, name: customer?.name || '-', ...row };
        }).filter(r => r.totalBread > 0 || r.totalAmount > 0);
      })();

  const totals = reportRows.reduce((acc, r) => ({
    whiteBread: acc.whiteBread + r.whiteBread,
    brownBread: acc.brownBread + r.brownBread,
    medium: acc.medium + r.medium,
    superBread: acc.superBread + r.superBread,
    wrapped: acc.wrapped + r.wrapped,
    returned: acc.returned + r.returned,
    totalBread: acc.totalBread + r.totalBread,
    whiteAmount: acc.whiteAmount + r.whiteAmount,
    wrappedAmount: acc.wrappedAmount + r.wrappedAmount,
    totalAmount: acc.totalAmount + r.totalAmount,
    paidAmount: acc.paidAmount + r.paidAmount,
    remaining: acc.remaining + r.remaining,
  }), {
    whiteBread: 0, brownBread: 0, medium: 0, superBread: 0, wrapped: 0,
    returned: 0, totalBread: 0, whiteAmount: 0, wrappedAmount: 0,
    totalAmount: 0, paidAmount: 0, remaining: 0,
  });

  const fmt = (n: number) => n === 0 ? '0' : n % 1 === 0 ? n.toString() : n.toFixed(2);

  const handlePrint = () => {
    const printContent = tableRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const driverName = selectedDriverId === 'all' ? 'جميع المندوبين' : (drivers.find(d => d.id === selectedDriverId)?.name || '');
    printWindow.document.write(`
      <html dir="rtl"><head><title>تقرير سحب الخبز اليومي</title>
      <style>
        body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; padding: 20px; }
        h1 { text-align: center; font-size: 20px; margin-bottom: 5px; }
        .info { text-align: center; margin-bottom: 15px; font-size: 14px; color: #555; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #333; padding: 4px 6px; text-align: center; }
        th { background-color: #f0f0f0; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #f5f5f5; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style></head><body>
      <h1>تقرير سحب الخبز اليومي</h1>
      <div class="info">${format(new Date(selectedDate), 'EEEE dd/MM/yyyy', { locale: ar })} ${driverName ? '- ' + driverName : ''}</div>
      ${printContent.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportExcel = () => {
    const driverName = selectedDriverId === 'all' ? 'جميع المندوبين' : (drivers.find(d => d.id === selectedDriverId)?.name || '');
    const nameLabel = isAllDrivers ? 'المندوب' : 'اسم العميل';
    const headers = ['م', nameLabel, 'خبز ابيض', 'خبز بر', 'وسط', 'شاورما', 'مغلف', 'الراجع', 'نسبة التالف %', 'اجمالي الخبز', 'السعر', 'مبلغ ابيض', 'مبلغ مغلف', 'اجمالي المبلغ', 'المبلغ المدفوع', 'الباقي'];
    let csv = '\uFEFF';
    csv += `تقرير سحب الخبز اليومي - ${selectedDate} ${driverName ? '- ' + driverName : ''}\n\n`;
    csv += headers.join(',') + '\n';
    reportRows.forEach((r, i) => {
      csv += [i + 1, r.name, r.whiteBread, r.brownBread, r.medium, r.superBread, r.wrapped, r.returned, r.damagedPercent > 0 ? r.damagedPercent.toFixed(1) : '', r.totalBread, r.unitPrice ? fmt(r.unitPrice) : '', fmt(r.whiteAmount), fmt(r.wrappedAmount), fmt(r.totalAmount), fmt(r.paidAmount), fmt(r.remaining)].join(',') + '\n';
    });
    const totalGross = totals.whiteBread + totals.brownBread + totals.medium + totals.superBread + totals.wrapped;
    const totalDmgPct = totalGross > 0 ? ((totals.returned / totalGross) * 100).toFixed(1) : '';
    csv += ['', 'المجموع', totals.whiteBread, totals.brownBread, totals.medium, totals.superBread, totals.wrapped, totals.returned, totalDmgPct, totals.totalBread, '', fmt(totals.whiteAmount), fmt(totals.wrappedAmount), fmt(totals.totalAmount), fmt(totals.paidAmount), fmt(totals.remaining)].join(',') + '\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_سحب_الخبز_${selectedDate}.csv`;
    link.click();
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
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold">تقرير سحب الخبز اليومي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="grid gap-2">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-44"
                  data-testid="input-report-date"
                />
              </div>
              <div className="grid gap-2">
                <Label>المندوب</Label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger className="w-48" data-testid="select-report-driver">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المندوبين</SelectItem>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mr-auto">
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1" data-testid="button-print">
                  <Printer className="h-4 w-4" />
                  طباعة
                </Button>
                {canExport && (
                  <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1" data-testid="button-export-excel">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div ref={tableRef} className="overflow-x-auto">
              <Table className="text-sm" data-testid="table-withdrawal-report">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-center font-bold border-l whitespace-nowrap" rowSpan={2}>م</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap" rowSpan={2}>{isAllDrivers ? 'المندوب' : 'اسم العميل'}</TableHead>
                    <TableHead className="text-center font-bold border-l" colSpan={7}>معدل سحب الخبز</TableHead>
                    <TableHead className="text-center font-bold" colSpan={6}>الحساب المالي</TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">خبز ابيض</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">خبز بر</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">وسط</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">شاورما</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">مغلف</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">الراجع</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">اجمالي الخبز</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">السعر</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">مبلغ ابيض</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">مبلغ مغلف</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">اجمالي المبلغ</TableHead>
                    <TableHead className="text-center font-bold border-l whitespace-nowrap">المبلغ المدفوع</TableHead>
                    <TableHead className="text-center font-bold whitespace-nowrap">الباقي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                        لا توجد عمليات مسجلة لهذا اليوم
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {reportRows.map((r, i) => (
                        <TableRow key={r.id} data-testid={`row-report-${r.id}`}>
                          <TableCell className="text-center border-l font-medium">{i + 1}</TableCell>
                          <TableCell className="text-right border-l font-bold whitespace-nowrap">{r.name}</TableCell>
                          <TableCell className="text-center border-l">{r.whiteBread || ''}</TableCell>
                          <TableCell className="text-center border-l">{r.brownBread || ''}</TableCell>
                          <TableCell className="text-center border-l">{r.medium || ''}</TableCell>
                          <TableCell className="text-center border-l">{r.superBread || ''}</TableCell>
                          <TableCell className="text-center border-l">{r.wrapped || ''}</TableCell>
                          <TableCell className="text-center border-l">
                            <div>{r.returned || ''}</div>
                            {r.damagedPercent > 0 && <div className="text-[7px] leading-tight text-red-500">{r.damagedPercent.toFixed(1)}%</div>}
                          </TableCell>
                          <TableCell className="text-center border-l font-bold">{r.totalBread}</TableCell>
                          <TableCell className="text-center border-l">{r.unitPrice ? fmt(r.unitPrice) : ''}</TableCell>
                          <TableCell className="text-center border-l">{r.whiteAmount ? fmt(r.whiteAmount) : ''}</TableCell>
                          <TableCell className="text-center border-l">{r.wrappedAmount ? fmt(r.wrappedAmount) : ''}</TableCell>
                          <TableCell className="text-center border-l font-bold">{fmt(r.totalAmount)}</TableCell>
                          <TableCell className="text-center border-l">{fmt(r.paidAmount)}</TableCell>
                          <TableCell className="text-center font-bold">{fmt(r.remaining)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-100 font-bold" data-testid="row-report-totals">
                        <TableCell className="text-center border-l"></TableCell>
                        <TableCell className="text-right border-l">المجموع</TableCell>
                        <TableCell className="text-center border-l">{totals.whiteBread}</TableCell>
                        <TableCell className="text-center border-l">{totals.brownBread}</TableCell>
                        <TableCell className="text-center border-l">{totals.medium}</TableCell>
                        <TableCell className="text-center border-l">{totals.superBread}</TableCell>
                        <TableCell className="text-center border-l">{totals.wrapped}</TableCell>
                        <TableCell className="text-center border-l">
                          <div>{totals.returned}</div>
                          {(() => { const g = totals.whiteBread + totals.brownBread + totals.medium + totals.superBread + totals.wrapped; return g > 0 ? <div className="text-[7px] leading-tight text-red-500">{((totals.returned / g) * 100).toFixed(1)}%</div> : null; })()}
                        </TableCell>
                        <TableCell className="text-center border-l">{totals.totalBread}</TableCell>
                        <TableCell className="text-center border-l"></TableCell>
                        <TableCell className="text-center border-l">{fmt(totals.whiteAmount)}</TableCell>
                        <TableCell className="text-center border-l">{fmt(totals.wrappedAmount)}</TableCell>
                        <TableCell className="text-center border-l">{fmt(totals.totalAmount)}</TableCell>
                        <TableCell className="text-center border-l">{fmt(totals.paidAmount)}</TableCell>
                        <TableCell className="text-center">{fmt(totals.remaining)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
