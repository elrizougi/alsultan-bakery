import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileSpreadsheet, Loader2, Pencil, Save, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCustomers, useProducts, useUsers } from "@/hooks/useData";
import { useState, useRef, useCallback, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

interface AdjustmentRow {
  id: string;
  driverId: string;
  reportDate: string;
  customerId: string;
  whiteBread: number;
  brownBread: number;
  medium: number;
  superBread: number;
  wrapped: number;
  returned: number;
  paidAmount: string;
  totalAmount: string;
}

interface DirectSaleCustomer {
  id: string;
  name: string;
  isDirectSale: boolean;
}

interface ReportRow {
  id: string;
  name: string;
  whiteBread: number;
  brownBread: number;
  medium: number;
  superBread: number;
  wrapped: number;
  returned: number;
  damagedPercent: number;
  totalBread: number;
  whiteAmount: number;
  wrappedAmount: number;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  unitPrice: number;
  isDirectSale?: boolean;
}

interface EditRow {
  id: string;
  name: string;
  whiteBread: number;
  brownBread: number;
  medium: number;
  superBread: number;
  wrapped: number;
  returned: number;
  paidAmount: number;
  totalAmount: number;
  isDirectSale?: boolean;
}

export default function DailyWithdrawalReportPage() {
  const currentUser = useStore(state => state.user);
  const canExport = currentUser?.role !== 'SUB_ADMIN';
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDriverId, setSelectedDriverId] = useState<string>("all");
  const [editMode, setEditMode] = useState(false);
  const [editRows, setEditRows] = useState<EditRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: adjustments = [], refetch: refetchAdjustments } = useQuery<AdjustmentRow[]>({
    queryKey: ['report-adjustments', selectedDriverId, selectedDate],
    queryFn: async () => {
      if (selectedDriverId === 'all') return [];
      const res = await fetch(`/api/report-adjustments/${selectedDriverId}/${selectedDate}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: selectedDriverId !== 'all',
  });

  const { data: directSaleCustomer } = useQuery<DirectSaleCustomer | null>({
    queryKey: ['direct-sale-customer'],
    queryFn: async () => {
      const res = await fetch('/api/direct-sale-customer');
      if (!res.ok) return null;
      return res.json();
    },
  });

  // If the direct-sale customer was just created server-side and isn't in the customers list yet,
  // invalidate the customers cache so it gets picked up for correct sorting/labeling.
  useEffect(() => {
    if (directSaleCustomer && !customers.find(c => c.id === directSaleCustomer.id)) {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  }, [directSaleCustomer, customers, queryClient]);

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
  const hasAdjustments = adjustments.length > 0;

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

  // Compute report rows from transactions
  const txReportRows = isAllDrivers
    ? (() => {
        const driverIds = Array.from(new Set(salesAndReturns.map(t => t.driverId).filter(Boolean) as string[]));
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
        const customerIds = Array.from(new Set(salesAndReturns.map(t => t.customerId).filter(Boolean) as string[]));
        return customerIds.map(custId => {
          const custTxns = salesAndReturns.filter(t => t.customerId === custId);
          const customer = customers.find(c => c.id === custId);
          const row = computeRowFromTransactions(custTxns, (d: any) =>
            d.customerId === custId &&
            d.driverId === selectedDriverId &&
            d.createdAt && format(new Date(d.createdAt), 'yyyy-MM-dd') === selectedDate
          );
          return { id: custId!, name: customer?.name || '-', isDirectSale: customer?.isDirectSale ?? false, ...row };
        }).filter(r => r.totalBread > 0 || r.totalAmount > 0);
      })();

  // Compute rows from adjustments if available
  const adjReportRows = hasAdjustments && !isAllDrivers
    ? adjustments.map(adj => {
        const customer = customers.find(c => c.id === adj.customerId);
        const wb = adj.whiteBread || 0;
        const bb = adj.brownBread || 0;
        const med = adj.medium || 0;
        const sup = adj.superBread || 0;
        const wrp = adj.wrapped || 0;
        const ret = adj.returned || 0;
        const total = wb + bb + med + sup + wrp;
        const gross = total;
        const damagedPercent = gross > 0 ? (ret / gross) * 100 : 0;
        const totalAmount = parseFloat(adj.totalAmount || '0');
        const paidAmount = parseFloat(adj.paidAmount || '0');
        return {
          id: adj.customerId,
          name: customer?.name || (directSaleCustomer?.id === adj.customerId ? 'بيع مباشر' : '-'),
          isDirectSale: customer?.isDirectSale ?? (directSaleCustomer?.id === adj.customerId),
          whiteBread: wb,
          brownBread: bb,
          medium: med,
          superBread: sup,
          wrapped: wrp,
          returned: ret,
          damagedPercent,
          totalBread: total,
          whiteAmount: wb * whitePrice,
          wrappedAmount: wrp * wrappedPrice,
          totalAmount,
          paidAmount,
          remaining: totalAmount - paidAmount,
          unitPrice: whitePrice,
        };
      })
    : null;

  // Sort: "بيع مباشر" always last
  const sortRows = (rows: ReportRow[]) => [...rows].sort((a, b) => {
    if (a.isDirectSale && !b.isDirectSale) return 1;
    if (!a.isDirectSale && b.isDirectSale) return -1;
    return 0;
  });

  const reportRows: ReportRow[] = sortRows(adjReportRows || txReportRows);

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

  // -- Edit mode logic --
  const computeEditRowTotals = useCallback((row: EditRow): EditRow => {
    const totalAmount = row.whiteBread * whitePrice + row.wrapped * wrappedPrice +
      row.brownBread * (brownProduct ? parseFloat(brownProduct.price) : 0) +
      row.medium * (mediumProduct ? parseFloat(mediumProduct.price) : 0) +
      row.superBread * (superProduct ? parseFloat(superProduct.price) : 0);
    return { ...row, totalAmount };
  }, [whitePrice, wrappedPrice, brownProduct, mediumProduct, superProduct]);

  const enterEditMode = () => {
    const rows: EditRow[] = reportRows.map(r => ({
      id: r.id,
      name: r.name,
      whiteBread: r.whiteBread,
      brownBread: r.brownBread,
      medium: r.medium,
      superBread: r.superBread,
      wrapped: r.wrapped,
      returned: r.returned,
      paidAmount: r.paidAmount,
      totalAmount: r.totalAmount,
      isDirectSale: r.isDirectSale,
    }));
    // Always add "بيع مباشر" row if not already present.
    // Use real ID when available; fall back to '__direct_sale__' placeholder before first save.
    const dsId = directSaleCustomer?.id ?? '__direct_sale__';
    if (!rows.find(r => r.isDirectSale)) {
      rows.push({
        id: dsId,
        name: 'بيع مباشر',
        whiteBread: 0,
        brownBread: 0,
        medium: 0,
        superBread: 0,
        wrapped: 0,
        returned: 0,
        paidAmount: 0,
        totalAmount: 0,
        isDirectSale: true,
      });
    }
    setEditRows(rows);
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setEditRows([]);
  };

  const updateEditRow = (rowId: string, field: keyof EditRow, value: number) => {
    setEditRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const updated = { ...r, [field]: value };
      return computeEditRowTotals(updated);
    }));
  };

  const saveEdits = async () => {
    if (!selectedDriverId || selectedDriverId === 'all') return;
    setIsSaving(true);
    try {
      // Direct-sale quantities are always server-computed from field totals.
      // Capture paidAmount from any direct-sale row (provisional or real) and send separately.
      const dsEditRow = editRows.find(r => r.isDirectSale);
      const rows = editRows
        .filter(r => !r.isDirectSale) // exclude direct-sale; handled via directSalePaidAmount
        .filter(r => r.whiteBread > 0 || r.brownBread > 0 || r.medium > 0 || r.superBread > 0 || r.wrapped > 0 || r.returned > 0 || r.paidAmount > 0)
        .map(r => ({
          customerId: r.id,
          whiteBread: r.whiteBread,
          brownBread: r.brownBread,
          medium: r.medium,
          superBread: r.superBread,
          wrapped: r.wrapped,
          returned: r.returned,
          paidAmount: r.paidAmount.toString(),
          totalAmount: r.totalAmount.toString(),
        }));

      const body: Record<string, unknown> = {
        driverId: selectedDriverId,
        reportDate: selectedDate,
        rows,
        directSalePaidAmount: (dsEditRow?.paidAmount ?? 0).toFixed(2),
      };

      const res = await fetch('/api/report-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('فشل الحفظ');

      await refetchAdjustments();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['direct-sale-customer'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditMode(false);
      setEditRows([]);
      toast({ title: "تم الحفظ بنجاح", description: "تم حفظ التعديلات" });
    } catch (e) {
      toast({ title: "خطأ", description: "فشل حفظ التعديلات", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const resetAdjustments = async () => {
    if (!selectedDriverId || selectedDriverId === 'all') return;
    try {
      const res = await fetch(`/api/report-adjustments/${selectedDriverId}/${selectedDate}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('فشل الحذف');
      await refetchAdjustments();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['direct-sale-customer'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: "تم الإلغاء", description: "تم حذف التعديلات واستعادة البيانات الأصلية" });
    } catch (e) {
      toast({ title: "خطأ", description: "فشل إلغاء التعديلات", variant: "destructive" });
    }
  };

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

  // Compute edit totals
  const editTotals = editMode ? editRows.reduce((acc, r) => ({
    whiteBread: acc.whiteBread + r.whiteBread,
    brownBread: acc.brownBread + r.brownBread,
    medium: acc.medium + r.medium,
    superBread: acc.superBread + r.superBread,
    wrapped: acc.wrapped + r.wrapped,
    returned: acc.returned + r.returned,
    totalBread: acc.totalBread + r.whiteBread + r.brownBread + r.medium + r.superBread + r.wrapped,
    totalAmount: acc.totalAmount + r.totalAmount,
    paidAmount: acc.paidAmount + r.paidAmount,
    remaining: acc.remaining + (r.totalAmount - r.paidAmount),
  }), { whiteBread: 0, brownBread: 0, medium: 0, superBread: 0, wrapped: 0, returned: 0, totalBread: 0, totalAmount: 0, paidAmount: 0, remaining: 0 }) : null;

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
                  onChange={(e) => { setSelectedDate(e.target.value); setEditMode(false); setEditRows([]); }}
                  className="w-44"
                  data-testid="input-report-date"
                  disabled={editMode}
                />
              </div>
              <div className="grid gap-2">
                <Label>المندوب</Label>
                <Select value={selectedDriverId} onValueChange={(v) => { setSelectedDriverId(v); setEditMode(false); setEditRows([]); }} disabled={editMode}>
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
              <div className="flex gap-2 mr-auto flex-wrap">
                {!isAllDrivers && !editMode && (
                  <Button variant="outline" size="sm" onClick={enterEditMode} className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-50" data-testid="button-edit-report">
                    <Pencil className="h-4 w-4" />
                    تعديل
                  </Button>
                )}
                {!isAllDrivers && !editMode && hasAdjustments && (
                  <Button variant="outline" size="sm" onClick={resetAdjustments} className="gap-1 border-red-300 text-red-600 hover:bg-red-50" data-testid="button-reset-adjustments">
                    <Trash2 className="h-4 w-4" />
                    إلغاء التعديلات
                  </Button>
                )}
                {editMode && (
                  <>
                    <Button size="sm" onClick={saveEdits} disabled={isSaving} className="gap-1" data-testid="button-save-edits">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      حفظ
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelEditMode} className="gap-1" data-testid="button-cancel-edit">
                      <X className="h-4 w-4" />
                      إلغاء
                    </Button>
                  </>
                )}
                {!editMode && (
                  <>
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
                  </>
                )}
              </div>
            </div>
            {hasAdjustments && !editMode && (
              <div className="mt-3 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-3 py-1.5 inline-block">
                يعرض هذا التقرير البيانات المعدلة يدوياً
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div ref={tableRef} className="overflow-x-auto">
              {editMode ? (
                /* EDIT MODE TABLE */
                <Table className="text-sm" data-testid="table-withdrawal-report-edit">
                  <TableHeader>
                    <TableRow className="bg-blue-50">
                      <TableHead className="text-center font-bold border-l whitespace-nowrap" rowSpan={2}>م</TableHead>
                      <TableHead className="text-center font-bold border-l whitespace-nowrap" rowSpan={2}>اسم العميل</TableHead>
                      <TableHead className="text-center font-bold border-l" colSpan={6}>معدل سحب الخبز</TableHead>
                      <TableHead className="text-center font-bold" colSpan={6}>الحساب المالي</TableHead>
                    </TableRow>
                    <TableRow className="bg-blue-50">
                      <TableHead className="text-center font-bold border-l whitespace-nowrap">خبز ابيض</TableHead>
                      <TableHead className="text-center font-bold border-l whitespace-nowrap">خبز بر</TableHead>
                      <TableHead className="text-center font-bold border-l whitespace-nowrap">وسط</TableHead>
                      <TableHead className="text-center font-bold border-l whitespace-nowrap">شاورما</TableHead>
                      <TableHead className="text-center font-bold border-l whitespace-nowrap">مغلف</TableHead>
                      <TableHead className="text-center font-bold border-l whitespace-nowrap">الراجع</TableHead>
                      <TableHead className="text-center font-bold border-l whitespace-nowrap">اجمالي الخبز</TableHead>
                      <TableHead className="text-center font-bold border-l whitespace-nowrap">مبلغ ابيض</TableHead>
                      <TableHead className="text-center font-bold border-l whitespace-nowrap">مبلغ مغلف</TableHead>
                      <TableHead className="text-center font-bold border-l whitespace-nowrap">اجمالي المبلغ</TableHead>
                      <TableHead className="text-center font-bold border-l whitespace-nowrap">المبلغ المدفوع</TableHead>
                      <TableHead className="text-center font-bold whitespace-nowrap">الباقي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editRows.map((r, i) => {
                      const rowTotal = r.whiteBread + r.brownBread + r.medium + r.superBread + r.wrapped;
                      const whiteAmt = r.whiteBread * whitePrice;
                      const wrappedAmt = r.wrapped * wrappedPrice;
                      const remaining = r.totalAmount - r.paidAmount;
                      return (
                        <TableRow key={r.id} className={r.isDirectSale ? 'bg-amber-50' : ''} data-testid={`edit-row-${r.id}`}>
                          <TableCell className="text-center border-l font-medium text-xs">{i + 1}</TableCell>
                          <TableCell className="text-right border-l font-bold whitespace-nowrap text-xs">
                            {r.name}
                            {r.isDirectSale && <span className="mr-1 text-amber-600 text-[10px]">⭐</span>}
                          </TableCell>
                          {(['whiteBread', 'brownBread', 'medium', 'superBread', 'wrapped', 'returned'] as const).map(field => (
                            <TableCell key={field} className="text-center border-l p-1">
                              {r.isDirectSale ? (
                                <span className="text-xs text-gray-500 italic" data-testid={`edit-${field}-${r.id}`}>{r[field] || 0}</span>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  value={r[field] || ''}
                                  onChange={(e) => updateEditRow(r.id, field, parseInt(e.target.value) || 0)}
                                  className="w-14 h-7 text-center text-xs px-1"
                                  data-testid={`edit-${field}-${r.id}`}
                                />
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-center border-l font-bold text-xs">{rowTotal}</TableCell>
                          <TableCell className="text-center border-l text-xs text-gray-600">{fmt(whiteAmt)}</TableCell>
                          <TableCell className="text-center border-l text-xs text-gray-600">{fmt(wrappedAmt)}</TableCell>
                          <TableCell className="text-center border-l text-xs">{fmt(r.totalAmount)}</TableCell>
                          <TableCell className="text-center border-l p-1">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={r.paidAmount || ''}
                              onChange={(e) => updateEditRow(r.id, 'paidAmount', parseFloat(e.target.value) || 0)}
                              className="w-20 h-7 text-center text-xs px-1"
                              data-testid={`edit-paid-${r.id}`}
                            />
                          </TableCell>
                          <TableCell className={`text-center font-bold text-xs ${remaining > 0 ? 'text-red-600' : remaining < 0 ? 'text-green-600' : ''}`}>
                            {fmt(remaining)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {editTotals && (
                      <TableRow className="bg-blue-100 font-bold">
                        <TableCell className="text-center border-l"></TableCell>
                        <TableCell className="text-right border-l">المجموع</TableCell>
                        <TableCell className="text-center border-l">{editTotals.whiteBread}</TableCell>
                        <TableCell className="text-center border-l">{editTotals.brownBread}</TableCell>
                        <TableCell className="text-center border-l">{editTotals.medium}</TableCell>
                        <TableCell className="text-center border-l">{editTotals.superBread}</TableCell>
                        <TableCell className="text-center border-l">{editTotals.wrapped}</TableCell>
                        <TableCell className="text-center border-l">{editTotals.returned}</TableCell>
                        <TableCell className="text-center border-l">{editTotals.totalBread}</TableCell>
                        <TableCell className="text-center border-l">{fmt(editTotals.whiteBread * whitePrice)}</TableCell>
                        <TableCell className="text-center border-l">{fmt(editTotals.wrapped * wrappedPrice)}</TableCell>
                        <TableCell className="text-center border-l">{fmt(editTotals.totalAmount)}</TableCell>
                        <TableCell className="text-center border-l">{fmt(editTotals.paidAmount)}</TableCell>
                        <TableCell className="text-center">{fmt(editTotals.remaining)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                /* VIEW MODE TABLE */
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
                          <TableRow key={r.id} className={r.isDirectSale ? 'bg-amber-50' : ''} data-testid={`row-report-${r.id}`}>
                            <TableCell className="text-center border-l font-medium">{i + 1}</TableCell>
                            <TableCell className="text-right border-l font-bold whitespace-nowrap">
                              {r.name}
                              {r.isDirectSale && <span className="mr-1 text-amber-600 text-[10px]">⭐</span>}
                            </TableCell>
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
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
