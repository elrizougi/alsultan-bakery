import { useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { useCustomers, useUsers, useRoutes, useProducts } from "@/hooks/useData";
import { useQuery } from "@tanstack/react-query";

const MIN_ROWS = 25;

export default function RepPrintSheetPage() {
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: customers = [] } = useCustomers();
  const { data: users = [], isLoading } = useUsers();
  const { data: routes = [] } = useRoutes();
  const { data: products = [] } = useProducts();

  const { data: allCustomerPrices = [] } = useQuery({
    queryKey: ['customer-prices-all'],
    queryFn: async () => {
      const res = await fetch('/api/customer-prices/all');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const whiteProduct = products.find(p => p.name.includes('ابيض'));

  const getCustomerPrice = (customerId: string) => {
    if (!whiteProduct) return '0.8';
    const cp = allCustomerPrices.find((p: any) => p.customerId === customerId && p.productId === whiteProduct.id);
    return cp ? cp.price : '0.8';
  };

  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const driverCustomers = selectedDriverId
    ? customers.filter(c => c.driverId === selectedDriverId)
    : [];

  const driverRoute = selectedDriverId
    ? routes.find(r => {
        const customerWithRoute = driverCustomers.find(c => c.routeId);
        return customerWithRoute && r.id === customerWithRoute.routeId;
      })
    : null;

  const rightTableRows = Math.max(MIN_ROWS, driverCustomers.length);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>ورقة المندوب - ${selectedDriver?.name || ''}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; direction: rtl; }
          @page { size: A4 portrait; margin: 10mm; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          ${printStyles}
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
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
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">ورقة المندوب للطباعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 flex-wrap">
              <div className="w-64">
                <label className="block text-sm font-bold mb-1">اختر المندوب</label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId} data-testid="select-driver">
                  <SelectTrigger data-testid="select-driver-trigger">
                    <SelectValue placeholder="اختر المندوب..." />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id} data-testid={`select-driver-${d.id}`}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!selectedDriverId}
                className="gap-1"
                data-testid="button-print-sheet"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedDriverId && (
          <div className="border rounded-lg bg-white overflow-auto">
            <style dangerouslySetInnerHTML={{ __html: printStyles }} />
            <div ref={printRef}>
              <div className="print-sheet">
                {/* Header */}
                <div className="sheet-header">
                  <div className="header-row">
                    <span className="header-label">التاريخ /&emsp;&emsp;/&emsp;&emsp;/ 2026</span>
                    <span className="header-center">المندوب / <strong>{selectedDriver?.name || '________'}</strong></span>
                    <span className="header-label">&nbsp;</span>
                  </div>
                  <div className="header-row">
                    <div className="qty-boxes">
                      <div className="qty-box"><span className="qty-label">الكمية الصباحية</span><span className="qty-value">&nbsp;</span></div>
                      <div className="qty-box"><span className="qty-label">الكمية المسائية</span><span className="qty-value">&nbsp;</span></div>
                    </div>
                    <span>&nbsp;</span>
                    <span className="header-label">خط السير / <strong>{driverRoute?.name || '________'}</strong></span>
                  </div>
                </div>

                {/* Main Body - Two side-by-side tables */}
                <div className="tables-container">
                  {/* Right Table */}
                  <table className="sheet-table right-table">
                    <thead>
                      <tr>
                        <th className="col-name">اسـم العميل</th>
                        <th className="col-num">المباع</th>
                        <th className="col-num">السعر</th>
                        <th className="col-num">المبلغ</th>
                        <th className="col-num">راجع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: rightTableRows }).map((_, i) => {
                        const customer = driverCustomers[i];
                        return (
                          <tr key={i}>
                            <td className="col-name">{customer?.name || ''}</td>
                            <td className="col-num">&nbsp;</td>
                            <td className="col-num">{customer ? getCustomerPrice(customer.id) : ''}</td>
                            <td className="col-num">&nbsp;</td>
                            <td className="col-num">&nbsp;</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Left Table */}
                  <table className="sheet-table left-table">
                    <thead>
                      <tr>
                        <th className="col-num">المباع</th>
                        <th className="col-num">السعر</th>
                        <th className="col-num">المبلغ</th>
                        <th className="col-num">راجع</th>
                        <th className="col-notes">ملاحظـــــــات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: rightTableRows }).map((_, i) => (
                        <tr key={i}>
                          <td className="col-num">&nbsp;</td>
                          <td className="col-num">&nbsp;</td>
                          <td className="col-num">&nbsp;</td>
                          <td className="col-num">&nbsp;</td>
                          <td className="col-notes">&nbsp;</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Section */}
                <div className="bottom-section">
                  {/* Right bottom - bread types */}
                  <table className="bottom-table bread-table">
                    <tbody>
                      <tr>
                        <td className="bread-label">ابيض</td>
                        <td className="bread-label">بر</td>
                        <td className="bread-label">راجع</td>
                      </tr>
                      <tr>
                        <td className="bread-value">&nbsp;</td>
                        <td className="bread-value">&nbsp;</td>
                        <td className="bread-value">&nbsp;</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Left bottom - summary */}
                  <table className="bottom-table summary-table">
                    <tbody>
                      <tr><td className="summary-label">المبلغ الكلي</td><td className="summary-value">&nbsp;</td></tr>
                      <tr><td className="summary-label">المبلغ المدفوع</td><td className="summary-value">&nbsp;</td></tr>
                      <tr><td className="summary-label">المنصرفات</td><td className="summary-value">&nbsp;</td></tr>
                      <tr><td className="summary-label">المتبقي</td><td className="summary-value">&nbsp;</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const printStyles = `
  .print-sheet {
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
    padding: 8mm;
    font-family: 'Cairo', sans-serif;
    font-size: 11px;
    direction: rtl;
    color: #000;
  }

  .sheet-header {
    margin-bottom: 6px;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-size: 14px;
    font-weight: bold;
  }

  .header-center {
    font-size: 16px;
    font-weight: bold;
  }

  .header-label {
    font-size: 13px;
    font-weight: bold;
  }

  .qty-boxes {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .qty-box {
    display: flex;
    align-items: center;
    border: 1.5px solid #000;
    font-size: 11px;
    font-weight: bold;
  }

  .qty-label {
    padding: 2px 8px;
    border-left: 1.5px solid #000;
    white-space: nowrap;
  }

  .qty-value {
    padding: 2px 20px;
    min-width: 60px;
  }

  .tables-container {
    display: flex;
    gap: 0;
    width: 100%;
  }

  .sheet-table {
    border-collapse: collapse;
    border: 1.5px solid #000;
  }

  .right-table {
    width: 55%;
  }

  .left-table {
    width: 45%;
    border-right: none;
  }

  .sheet-table th,
  .sheet-table td {
    border: 1px solid #000;
    padding: 1px 4px;
    text-align: center;
    height: 22px;
    font-size: 11px;
    vertical-align: middle;
  }

  .sheet-table th {
    font-weight: bold;
    font-size: 11px;
    background: #fff;
    border-bottom: 1.5px solid #000;
  }

  .col-name {
    text-align: right !important;
    padding-right: 6px !important;
    min-width: 140px;
    white-space: nowrap;
    font-weight: bold;
  }

  .col-num {
    width: 50px;
    min-width: 45px;
  }

  .col-notes {
    text-align: right !important;
    padding-right: 6px !important;
    min-width: 100px;
  }

  .bottom-section {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    gap: 40px;
  }

  .bottom-table {
    border-collapse: collapse;
  }

  .bread-table td {
    border: 1.5px solid #000;
    padding: 4px 16px;
    text-align: center;
    font-weight: bold;
    font-size: 12px;
    min-width: 60px;
  }

  .bread-value {
    height: 28px;
  }

  .summary-table td {
    border: 1.5px solid #000;
    padding: 2px 12px;
    font-size: 12px;
    font-weight: bold;
  }

  .summary-label {
    text-align: right;
  }

  .summary-value {
    min-width: 80px;
  }
`;
