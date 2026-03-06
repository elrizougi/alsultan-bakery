import { useState, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, BarChart3, Users, Package, DollarSign, Undo2, AlertTriangle, ShoppingCart, Eye, Download, Upload, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProducts, useCustomers, useUsers } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function DriverDailyReportPage() {
  const currentUser = useStore(state => state.user);
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUB_ADMIN';
  const canExportCSV = currentUser?.role !== 'SUB_ADMIN';
  const { data: users = [] } = useUsers();
  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const driverId = isAdmin ? (selectedDriverId === "all" ? "" : selectedDriverId) : (currentUser?.id || "");
  const [filterDate, setFilterDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detailDriverId, setDetailDriverId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["all-transactions"],
    queryFn: () => api.getAllTransactions(),
    enabled: isAdmin && !selectedDriverId,
  });

  const { data: driverTransactions = [] } = useQuery({
    queryKey: ["driver-transactions", driverId],
    queryFn: () => api.getDriverTransactions(driverId),
    enabled: !!driverId,
  });

  const transactions = driverId ? driverTransactions : allTransactions;

  const { data: cashDeposits = [] } = useQuery({
    queryKey: ["driver-cash-deposits", driverId],
    queryFn: () => api.getDriverCashDeposits(driverId),
    enabled: !!driverId,
  });

  const { data: driverDebts = [] } = useQuery({
    queryKey: ["driver-debts", detailDriverId || driverId],
    queryFn: () => api.getDriverCustomerDebts(detailDriverId || driverId),
    enabled: !!(detailDriverId || driverId),
  });

  const driverName = users.find(u => u.id === driverId)?.name || "";
  const driverCustomers = customers.filter(c => c.driverId === driverId);

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || "غير معروف";
  };

  const getDriverName = (dId: string) => {
    return users.find(u => u.id === dId)?.name || "غير معروف";
  };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return "عميل نقدي";
    return customers.find(c => c.id === customerId)?.name || "غير معروف";
  };

  const getDayDataForDriver = (txList: typeof transactions, date: string) => {
    const dayTx = txList.filter(t =>
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

    const driverDebtAmount = dayTx.filter(t => (t.type as string) === 'DRIVER_DEBT')
      .reduce((s, t) => s + parseFloat(t.totalAmount || "0"), 0);

    const servedCustomerIds = new Set(
      dayTx.filter(t => t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE')
        .map(t => t.customerId).filter(Boolean)
    );

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
      driverDebtAmount,
      servedCount: servedCustomerIds.size,
      dayTx,
    };
  };

  const getAllDriversDayRows = () => {
    const rows: { date: string; driverId: string; driverName: string; data: ReturnType<typeof getDayDataForDriver> }[] = [];
    const dateDriverMap = new Map<string, Set<string>>();

    allTransactions.forEach(t => {
      if (!t.createdAt) return;
      const date = format(new Date(t.createdAt), 'yyyy-MM-dd');
      if (!dateDriverMap.has(date)) dateDriverMap.set(date, new Set());
      dateDriverMap.get(date)!.add(t.driverId);
    });

    const sortedDates = Array.from(dateDriverMap.keys()).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach(date => {
      const driverIds = Array.from(dateDriverMap.get(date)!);
      driverIds.forEach(did => {
        const driverTx = allTransactions.filter(t => t.driverId === did);
        const data = getDayDataForDriver(driverTx, date);
        if (data.dayTx.length > 0) {
          rows.push({ date, driverId: did, driverName: getDriverName(did), data });
        }
      });
    });

    return rows;
  };

  const singleDriverDates = () => {
    const dates = new Set<string>();
    transactions.forEach(t => {
      if (t.createdAt) dates.add(format(new Date(t.createdAt), 'yyyy-MM-dd'));
    });
    cashDeposits.forEach(d => {
      if (d.createdAt) dates.add(format(new Date(d.createdAt), 'yyyy-MM-dd'));
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  };

  const getDetailedCustomerData = (txList: typeof transactions, date: string, debts: typeof driverDebts = []) => {
    const dayTx = txList.filter(t =>
      t.createdAt && format(new Date(t.createdAt), 'yyyy-MM-dd') === date
    );

    const customerMap = new Map<string, {
      name: string;
      items: { productName: string; qty: number; unitPrice: number; total: number; type: string; paymentStatus?: 'unpaid' | 'partial' | 'paid' }[];
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

      let paymentStatus: 'unpaid' | 'partial' | 'paid' | undefined;
      if (tx.type === 'CREDIT_SALE' && tx.customerId) {
        const matchingDebt = debts.find(d =>
          d.customerId === tx.customerId &&
          parseFloat(d.amount) === amount &&
          d.createdAt && tx.createdAt &&
          Math.abs(new Date(d.createdAt).getTime() - new Date(tx.createdAt).getTime()) < 60000
        ) || debts.find(d => d.customerId === tx.customerId && parseFloat(d.amount) === amount);
        if (matchingDebt) {
          const paid = parseFloat(matchingDebt.paidAmount || "0");
          const total = parseFloat(matchingDebt.amount);
          if (matchingDebt.isPaid || paid >= total) paymentStatus = 'paid';
          else if (paid > 0) paymentStatus = 'partial';
          else paymentStatus = 'unpaid';
        } else {
          paymentStatus = 'unpaid';
        }
      }

      if (tx.type === 'CASH_SALE') data.cashAmount += amount;
      else data.creditAmount += amount;
      data.items.push({
        productName: getProductName(tx.productId),
        qty: tx.quantity,
        unitPrice: parseFloat(tx.unitPrice || "0"),
        total: amount,
        type: tx.type === 'CASH_SALE' ? 'نقدي' : 'آجل',
        paymentStatus,
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

    return { customers: Array.from(customerMap.values()), returnData, damagedData, expenseData };
  };

  const productColumns = products.filter(p => {
    if (isAdmin && !driverId) {
      return allTransactions.some(t => t.productId === p.id && (t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE'));
    }
    return transactions.some(t => t.productId === p.id && (t.type === 'CASH_SALE' || t.type === 'CREDIT_SALE'));
  }).sort((a, b) => {
    if (a.name === 'مغلف') return 1;
    if (b.name === 'مغلف') return -1;
    return 0;
  });

  const exportToCSV = (
    rows: { date: string; driverId?: string; driverName?: string; data: ReturnType<typeof getDayDataForDriver> }[],
    showDriverColumn: boolean
  ) => {
    const headers = ['التاريخ'];
    if (showDriverColumn) headers.push('المندوب');
    productColumns.forEach(p => headers.push(p.name));
    headers.push('المجموع', 'المرتجع', 'التالف', 'النقدي', 'الآجل', 'الإجمالي', 'المصروفات', 'المديونية', 'الصافي', 'العملاء');

    const esc = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const csvRows = [headers.map(esc).join(',')];

    rows.forEach(row => {
      const d = row.data;
      const cols: string[] = [format(new Date(row.date), 'yyyy-MM-dd')];
      if (showDriverColumn) cols.push(esc(row.driverName || ''));
      productColumns.forEach(p => {
        const sold = d.soldByProduct.find(s => s.name === p.name);
        cols.push(sold ? String(sold.qty) : '0');
      });
      cols.push(
        String(d.totalSoldQty),
        String(d.returnedQty),
        String(d.damagedQty),
        d.cashAmount.toFixed(2),
        d.creditAmount.toFixed(2),
        d.totalSalesAmount.toFixed(2),
        d.expensesAmount.toFixed(2),
        d.driverDebtAmount.toFixed(2),
        (d.cashAmount - d.expensesAmount - d.driverDebtAmount).toFixed(2),
        String(d.servedCount)
      );
      csvRows.push(cols.join(','));
    });

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = showDriverColumn ? 'تقرير_جميع_المناديب' : `تقرير_${driverName}`;
    link.download = `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderSummaryTable = (
    rows: { date: string; driverId?: string; driverName?: string; data: ReturnType<typeof getDayDataForDriver> }[],
    showDriverColumn: boolean
  ) => {
    const colCount = 11 + productColumns.length + (showDriverColumn ? 1 : 0);

    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="text-right font-bold">التاريخ</TableHead>
            {showDriverColumn && <TableHead className="text-right font-bold">المندوب</TableHead>}
            {productColumns.map(p => (
              <TableHead key={p.id} className="text-right font-bold text-xs">{p.name}</TableHead>
            ))}
            <TableHead className="text-right font-bold">المجموع</TableHead>
            <TableHead className="text-right font-bold">المرتجع</TableHead>
            <TableHead className="text-right font-bold">التالف</TableHead>
            <TableHead className="text-right font-bold">النقدي</TableHead>
            <TableHead className="text-right font-bold">الآجل</TableHead>
            <TableHead className="text-right font-bold">الإجمالي</TableHead>
            <TableHead className="text-right font-bold">المصروفات</TableHead>
            <TableHead className="text-right font-bold">المديونية</TableHead>
            <TableHead className="text-right font-bold">الصافي</TableHead>
            <TableHead className="text-right font-bold">العملاء</TableHead>
            <TableHead className="text-right font-bold">تفاصيل</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount + 3} className="text-center py-8 text-muted-foreground">
                لا توجد بيانات للعرض
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, idx) => {
              const d = row.data;
              return (
                <TableRow key={`${row.date}-${row.driverId || idx}`} data-testid={`report-row-${row.date}-${row.driverId || idx}`}>
                  <TableCell className="font-medium whitespace-nowrap text-sm">
                    {format(new Date(row.date), 'EEEE dd/MM', { locale: ar })}
                  </TableCell>
                  {showDriverColumn && (
                    <TableCell className="font-medium text-sm whitespace-nowrap">{row.driverName}</TableCell>
                  )}
                  {productColumns.map(p => {
                    const sold = d.soldByProduct.find(s => s.name === p.name);
                    return (
                      <TableCell key={p.id} className="text-center text-sm">
                        {sold ? sold.qty : '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-blue-700 font-bold">{d.totalSoldQty}</TableCell>
                  <TableCell className="text-orange-600">{d.returnedQty || '-'}</TableCell>
                  <TableCell className="text-gray-600">{d.damagedQty || '-'}</TableCell>
                  <TableCell className="text-emerald-600 text-sm">{d.cashAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-yellow-600 text-sm">{d.creditAmount > 0 ? d.creditAmount.toFixed(2) : '-'}</TableCell>
                  <TableCell className="text-blue-600 font-bold text-sm">{d.totalSalesAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-red-600 text-sm">{d.expensesAmount > 0 ? d.expensesAmount.toFixed(2) : '-'}</TableCell>
                  <TableCell className="text-rose-600 text-sm">{d.driverDebtAmount > 0 ? d.driverDebtAmount.toFixed(2) : '-'}</TableCell>
                  <TableCell className="text-teal-700 font-bold text-sm">{(d.cashAmount - d.expensesAmount - d.driverDebtAmount).toFixed(2)}</TableCell>
                  <TableCell className="text-purple-600 font-medium">{d.servedCount}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 gap-1 px-2"
                      onClick={() => {
                        setDetailDate(row.date);
                        setDetailDriverId(row.driverId || driverId);
                      }}
                      data-testid={`btn-details-${row.date}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    );
  };

  const downloadImportTemplate = () => {
    const driverNames = drivers.map(d => d.name).join(' / ');
    const productNames = products.map(p => p.name).join(' / ');
    const customerNames = customers.slice(0, 3).map(c => c.name).join(' / ');
    const types = 'بيع نقدي / بيع آجل / مرتجع / توزيع مجاني / عينات / تالف / مصروفات';
    
    const headers = 'التاريخ,المندوب,النوع,المنتج,الكمية,سعر الوحدة,المبلغ,العميل,ملاحظات';
    const instructions = [
      `# التاريخ: بصيغة YYYY-MM-DD مثال: ${format(new Date(), 'yyyy-MM-dd')}`,
      `# المناديب المتاحون: ${driverNames}`,
      `# أنواع العمليات: ${types}`,
      `# المنتجات المتاحة: ${productNames}`,
      `# العملاء (أمثلة): ${customerNames || 'لا يوجد عملاء'}`,
      `# الكمية: عدد صحيح (للمصروفات اتركه 0)`,
      `# سعر الوحدة: سعر القطعة الواحدة`,
      `# المبلغ: يُحسب تلقائياً (الكمية × السعر) - للمصروفات ضع المبلغ هنا`,
      `# العميل: مطلوب للبيع الآجل والتالف - اختياري للبيع النقدي`,
      `# ملاحظات: اختيارية (مطلوبة للمصروفات لكتابة وصف المصروف)`,
    ];
    const example1 = `${format(new Date(), 'yyyy-MM-dd')},${drivers[0]?.name || 'اسم المندوب'},بيع نقدي,${products[0]?.name || 'اسم المنتج'},100,0.50,,${customers[0]?.name || ''},`;
    const example2 = `${format(new Date(), 'yyyy-MM-dd')},${drivers[0]?.name || 'اسم المندوب'},بيع آجل,${products[0]?.name || 'اسم المنتج'},50,0.50,,${customers[0]?.name || 'اسم العميل'},`;
    const example3 = `${format(new Date(), 'yyyy-MM-dd')},${drivers[0]?.name || 'اسم المندوب'},مرتجع,${products[0]?.name || 'اسم المنتج'},20,0,,,`;
    const example4 = `${format(new Date(), 'yyyy-MM-dd')},${drivers[0]?.name || 'اسم المندوب'},مصروفات,,0,0,50,,بنزين`;

    const csvContent = instructions.join('\n') + '\n' + headers + '\n' + example1 + '\n' + example2 + '\n' + example3 + '\n' + example4;
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `نموذج_استيراد_عمليات.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
      
      if (lines.length < 2) {
        toast({ title: "خطأ", description: "الملف فارغ أو لا يحتوي على بيانات", variant: "destructive" });
        return;
      }

      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim());
      
      const dateIdx = headers.indexOf('التاريخ');
      const driverIdx = headers.indexOf('المندوب');
      const typeIdx = headers.indexOf('النوع');
      const productIdx = headers.indexOf('المنتج');
      const qtyIdx = headers.indexOf('الكمية');
      const priceIdx = headers.indexOf('سعر الوحدة');
      const amountIdx = headers.indexOf('المبلغ');
      const customerIdx = headers.indexOf('العميل');
      const notesIdx = headers.indexOf('ملاحظات');

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.every(c => !c)) continue;
        rows.push({
          date: dateIdx >= 0 ? cols[dateIdx] : '',
          driverName: driverIdx >= 0 ? cols[driverIdx] : '',
          type: typeIdx >= 0 ? cols[typeIdx] : '',
          productName: productIdx >= 0 ? cols[productIdx] : '',
          quantity: qtyIdx >= 0 ? cols[qtyIdx] : '0',
          unitPrice: priceIdx >= 0 ? cols[priceIdx] : '0',
          totalAmount: amountIdx >= 0 ? cols[amountIdx] : '0',
          customerName: customerIdx >= 0 ? cols[customerIdx] : '',
          notes: notesIdx >= 0 ? cols[notesIdx] : '',
        });
      }

      if (rows.length === 0) {
        toast({ title: "خطأ", description: "لا توجد بيانات صالحة في الملف", variant: "destructive" });
        return;
      }

      const result = await api.bulkImportTransactions(rows);
      const errors = result.results?.filter((r: any) => r.status === 'error') || [];
      
      if (errors.length > 0) {
        const errorMessages = errors.slice(0, 5).map((e: any) => `سطر ${e.row}: ${e.error}`).join('\n');
        toast({
          title: result.message,
          description: errorMessages + (errors.length > 5 ? `\n... و ${errors.length - 5} أخطاء أخرى` : ''),
          variant: errors.length === rows.length ? "destructive" : "default",
        });
      } else {
        toast({ title: "تم بنجاح", description: result.message });
      }

      queryClient.invalidateQueries({ queryKey: ["all-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["driver-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["allCustomerDebts"] });
    } catch (error: any) {
      toast({ title: "خطأ في الاستيراد", description: error.message || "حدث خطأ أثناء استيراد البيانات", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const activeDetailDriverName = users.find(u => u.id === detailDriverId)?.name || driverName;
  const activeDetailTx = detailDriverId
    ? (driverId === detailDriverId ? transactions : allTransactions.filter(t => t.driverId === detailDriverId))
    : transactions;

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">التقرير اليومي</h1>
          </div>
        </div>

        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-4">
              {isAdmin && (
                <>
                  <Label className="font-bold text-lg whitespace-nowrap">اختر المندوب:</Label>
                  <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                    <SelectTrigger className="max-w-xs bg-white" data-testid="select-driver-report">
                      <SelectValue placeholder="جميع المناديب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المناديب</SelectItem>
                      {drivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDriverId && selectedDriverId !== "all" && (
                    <Button variant="outline" size="sm" onClick={() => setSelectedDriverId("")}>
                      عرض الكل
                    </Button>
                  )}
                </>
              )}
              <Label className="font-bold text-lg whitespace-nowrap">التاريخ:</Label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="max-w-[200px] bg-white"
                data-testid="input-filter-date"
              />
              {filterDate !== format(new Date(), 'yyyy-MM-dd') && (
                <Button variant="outline" size="sm" onClick={() => setFilterDate(format(new Date(), 'yyyy-MM-dd'))}>
                  اليوم
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {isAdmin && !driverId && (() => {
          const allRows = getAllDriversDayRows()
            .filter(r => r.date === filterDate)
            .map(r => ({
              date: r.date,
              driverId: r.driverId,
              driverName: r.driverName,
              data: r.data,
            }));
          return (
          <Card className="border-slate-100">
            <CardHeader className="bg-gradient-to-l from-blue-50 to-indigo-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  تقارير جميع المناديب
                </CardTitle>
                {canExportCSV && (
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                    data-testid="input-import-csv"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={downloadImportTemplate}
                    data-testid="btn-download-template"
                  >
                    <Download className="h-4 w-4" />
                    تحميل النموذج
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    data-testid="btn-import-csv"
                  >
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    استيراد CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => exportToCSV(allRows, true)}
                    disabled={allRows.length === 0}
                    data-testid="btn-export-all-drivers"
                  >
                    <Download className="h-4 w-4" />
                    تصدير CSV
                  </Button>
                </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {renderSummaryTable(
                  allRows,
                  true
                )}
              </div>
            </CardContent>
          </Card>
          );
        })()}

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
                      <p className="text-sm font-medium text-green-600">عملاء تم التوزيع لهم</p>
                      <p className="text-2xl font-bold text-green-700" data-testid="text-served-today">
                        {getDayDataForDriver(transactions, filterDate).servedCount}
                      </p>
                      <p className="text-xs text-green-600/70">
                        من أصل {driverCustomers.length} عميل
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {(() => {
              const singleRows = singleDriverDates()
                .filter(date => date === filterDate)
                .map(date => ({
                  date,
                  driverId,
                  driverName,
                  data: getDayDataForDriver(transactions, date),
                }));
              return (
                <Card className="border-slate-100">
                  <CardHeader className="bg-gradient-to-l from-blue-50 to-indigo-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6 text-blue-600" />
                        سجل العمليات اليومية - {driverName}
                      </CardTitle>
                      {canExportCSV && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => exportToCSV(singleRows, false)}
                        disabled={singleRows.length === 0}
                        data-testid="btn-export-driver"
                      >
                        <Download className="h-4 w-4" />
                        تصدير CSV
                      </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      {renderSummaryTable(singleRows, false)}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </>
        )}

        <Dialog open={!!detailDate} onOpenChange={(open) => { if (!open) { setDetailDate(null); setDetailDriverId(""); } }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
                تقرير مفصل - {activeDetailDriverName} - {detailDate ? format(new Date(detailDate), 'EEEE dd/MM/yyyy', { locale: ar }) : ''}
              </DialogTitle>
            </DialogHeader>

            {detailDate && (() => {
              const detail = getDetailedCustomerData(activeDetailTx, detailDate, driverDebts);
              const day = getDayDataForDriver(activeDetailTx, detailDate);

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
                        <p className="text-xs text-emerald-600 font-medium">الصافي بعد المصروفات</p>
                        <p className="text-xl font-bold text-emerald-700">{(day.totalSalesAmount - day.expensesAmount).toFixed(2)} ر.س</p>
                        <div className="flex justify-center gap-2 text-xs text-emerald-500 mt-1">
                          <span>نقدي: {day.cashAmount.toFixed(2)}</span>
                          <span>مصروفات: {day.expensesAmount.toFixed(2)}</span>
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
                                    <div className="flex flex-col gap-1">
                                      <Badge className={item.type === 'نقدي' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}>
                                        {item.type}
                                      </Badge>
                                      {item.paymentStatus === 'paid' && (
                                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">مدفوع كامل</Badge>
                                      )}
                                      {item.paymentStatus === 'partial' && (
                                        <Badge className="bg-amber-100 text-amber-700 text-xs">مدفوع جزئي</Badge>
                                      )}
                                      {item.paymentStatus === 'unpaid' && (
                                        <Badge className="bg-red-100 text-red-700 text-xs">غير مدفوع</Badge>
                                      )}
                                    </div>
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
