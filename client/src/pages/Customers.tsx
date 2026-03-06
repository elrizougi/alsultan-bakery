import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore } from "@/lib/store";
import { useCustomers, useRoutes, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, useUsers } from "@/hooks/useData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Phone, MapPin, ExternalLink, Loader2, Edit2, Trash2, Upload, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import type { Customer } from "@/lib/api";

interface CustomerFormData {
  name: string;
  address: string;
  locationUrl: string;
  phone: string;
  routeId: string;
  driverId: string;
}

export default function CustomersPage() {
  const currentUser = useStore(state => state.user);
  const canExportCSV = currentUser?.role !== 'SUB_ADMIN';
  const { data: customers = [], isLoading } = useCustomers();
  const { data: routes = [] } = useRoutes();
  const { data: users = [] } = useUsers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const { toast } = useToast();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [filterDriverId, setFilterDriverId] = useState<string>("");
  const [filterRouteId, setFilterRouteId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    address: "",
    locationUrl: "",
    phone: "",
    routeId: "",
    driverId: "",
  });

  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);

  const normalizeArabic = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[إأآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ى/g, 'ي');
  };
  
  const filteredCustomers = customers.filter(c => {
    const matchesDriver = !filterDriverId || filterDriverId === "all" || c.driverId === filterDriverId;
    const matchesRoute = !filterRouteId || filterRouteId === "all" || c.routeId === filterRouteId;
    const normalizedQuery = normalizeArabic(searchQuery);
    const matchesSearch = !searchQuery || 
      normalizeArabic(c.name).includes(normalizedQuery) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.address && normalizeArabic(c.address).includes(normalizedQuery));
    return matchesDriver && matchesRoute && matchesSearch;
  });

  const downloadTemplate = () => {
    const routeNames = routes.map(r => r.name).join(" / ");
    const driverNames = drivers.map(d => d.name).join(" / ");
    const csvLines = [
      "الاسم,العنوان,رقم الجوال,خط التوزيع,المندوب,رابط الموقع",
      `محمد أحمد,حي الملك فهد - شارع العليا,0501234567,${routes[0]?.name || "اسم الخط"},${drivers[0]?.name || "اسم المندوب"},https://maps.google.com/...`,
      "",
      `# خطوط التوزيع المتاحة: ${routeNames}`,
      `# المناديب المتاحين: ${driverNames}`,
    ];
    const csvContent = csvLines.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "customers_template.csv";
    link.click();
  };

  const parseCSVLine = (line: string, separator: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      let text = await file.text();
      text = text.replace(/^\uFEFF/, '');
      
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ title: "الملف فارغ أو لا يحتوي على بيانات", variant: "destructive" });
        return;
      }

      const separator = lines[0].includes(';') ? ';' : (lines[0].includes('\t') ? '\t' : ',');
      
      const headers = parseCSVLine(lines[0], separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const nameIdx = headers.findIndex(h => h === "name" || h === "اسم" || h === "الاسم" || h === "اسم العميل");
      const addressIdx = headers.findIndex(h => h === "address" || h === "عنوان" || h === "العنوان");
      const phoneIdx = headers.findIndex(h => h === "phone" || h === "جوال" || h === "هاتف" || h === "رقم" || h === "رقم الجوال" || h === "الهاتف" || h === "الجوال");
      const locationIdx = headers.findIndex(h => h === "locationurl" || h === "location" || h === "رابط" || h === "موقع" || h === "رابط الموقع");
      const routeIdx = headers.findIndex(h => h === "route" || h === "خط" || h === "الخط" || h === "خط التوزيع");
      const driverIdx = headers.findIndex(h => h === "driver" || h === "مندوب" || h === "المندوب");

      if (nameIdx === -1) {
        toast({ title: "يجب أن يحتوي الملف على عمود الاسم (name أو اسم)", variant: "destructive" });
        return;
      }

      const normalizeForMatch = (s: string) => normalizeArabic(s.trim().replace(/['"]/g, ''));

      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].startsWith('#')) continue;
        const values = parseCSVLine(lines[i], separator);
        const name = values[nameIdx]?.replace(/['"]/g, '');
        const address = addressIdx !== -1 ? values[addressIdx]?.replace(/['"]/g, '') : "";
        const phone = phoneIdx !== -1 ? values[phoneIdx]?.replace(/['"]/g, '') : "";
        const locationUrl = locationIdx !== -1 ? values[locationIdx]?.replace(/['"]/g, '') : "";
        const routeName = routeIdx !== -1 ? values[routeIdx]?.replace(/['"]/g, '').trim() : "";
        const driverName = driverIdx !== -1 ? values[driverIdx]?.replace(/['"]/g, '').trim() : "";

        if (!name) {
          errorCount++;
          continue;
        }

        const matchedRoute = routeName ? routes.find(r => normalizeForMatch(r.name) === normalizeForMatch(routeName)) : undefined;
        const matchedDriver = driverName ? drivers.find(d => normalizeForMatch(d.name) === normalizeForMatch(driverName)) : undefined;

        try {
          await createCustomer.mutateAsync({
            name,
            address: address || "",
            phone,
            locationUrl: locationUrl || "",
            routeId: matchedRoute?.id || (undefined as any),
            driverId: matchedDriver?.id || (undefined as any),
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      toast({ 
        title: `تم استيراد ${successCount} عميل بنجاح${errorCount > 0 ? ` (${errorCount} أخطاء)` : ""}` 
      });
    } catch (error) {
      toast({ title: "حدث خطأ في قراءة الملف", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExportCSV = () => {
    const headers = ["اسم العميل", "رقم الهاتف", "العنوان", "المندوب", "خط التوزيع", "رابط الموقع"];
    const esc = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;

    const rows = filteredCustomers.map(customer => {
      const driver = drivers.find(d => d.id === customer.driverId);
      const route = routes.find(r => r.id === customer.routeId);
      return [
        esc(customer.name),
        esc(customer.phone || "-"),
        esc(customer.address || "-"),
        esc(driver?.name || "-"),
        esc(route?.name || "-"),
        esc(customer.locationUrl || "-"),
      ].join(',');
    });

    const csvContent = "\uFEFF" + [headers.map(esc).join(','), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `قائمة_العملاء_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openAddForm = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      address: "",
      locationUrl: "",
      phone: "",
      routeId: "",
      driverId: "",
    });
    setShowForm(true);
  };

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      address: customer.address,
      locationUrl: customer.locationUrl || "",
      phone: customer.phone,
      routeId: customer.routeId || "",
      driverId: customer.driverId || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.phone) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    try {
      const customerData = {
        name: formData.name,
        address: formData.address,
        locationUrl: formData.locationUrl || undefined,
        phone: formData.phone,
        routeId: formData.routeId || undefined,
        driverId: formData.driverId || undefined,
      };

      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, ...customerData });
        toast({ title: "تم تحديث العميل بنجاح" });
      } else {
        await createCustomer.mutateAsync(customerData);
        toast({ title: "تم إضافة العميل بنجاح" });
      }
      setShowForm(false);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (customerToDelete) {
      try {
        await deleteCustomer.mutateAsync(customerToDelete.id);
        toast({ title: "تم حذف العميل" });
        setCustomerToDelete(null);
      } catch (error) {
        toast({ title: "حدث خطأ في حذف العميل", variant: "destructive" });
      }
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة العملاء</h1>
            <p className="text-sm text-muted-foreground">عرض وإدارة قاعدة بيانات العملاء ومواقعهم.</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button className="flex flex-row-reverse gap-2" onClick={openAddForm} data-testid="button-add-customer">
              <UserPlus className="h-4 w-4" /> إضافة عميل
            </Button>
            {canExportCSV && (<>
            <Button 
              variant="outline" 
              className="flex flex-row-reverse gap-2" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              data-testid="button-import-customers"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              استيراد CSV
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-row-reverse gap-2" 
              onClick={handleExportCSV}
              data-testid="button-export-customers"
            >
              <Download className="h-4 w-4" /> تحميل البيانات
            </Button>
            <Button 
              variant="ghost" 
              className="flex flex-row-reverse gap-2" 
              onClick={downloadTemplate}
              data-testid="button-download-template"
            >
              <Download className="h-4 w-4" /> تحميل النموذج
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            </>)}
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold">{customers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">خطوط التوزيع النشطة</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold">{routes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المناديب النشطين</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-2xl font-bold">{drivers.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-lg border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو رقم الجوال أو العنوان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
              data-testid="input-search-customers"
            />
          </div>
          <Label className="font-medium whitespace-nowrap">خط التوزيع:</Label>
          <Select value={filterRouteId} onValueChange={setFilterRouteId}>
            <SelectTrigger className="w-52" data-testid="select-filter-route">
              <SelectValue placeholder="جميع الخطوط" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الخطوط</SelectItem>
              {routes.map((route) => (
                <SelectItem key={route.id} value={route.id}>
                  {route.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="font-medium whitespace-nowrap">المندوب:</Label>
          <Select value={filterDriverId} onValueChange={setFilterDriverId}>
            <SelectTrigger className="w-52" data-testid="select-filter-driver">
              <SelectValue placeholder="جميع المناديب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المناديب</SelectItem>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {((filterDriverId && filterDriverId !== "all") || (filterRouteId && filterRouteId !== "all")) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterDriverId(""); setFilterRouteId(""); }}>
              إزالة الفلتر
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            ({filteredCustomers.length} عميل)
          </span>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <Table className="text-right">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم العميل</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">المندوب</TableHead>
                <TableHead className="text-right">خط التوزيع</TableHead>
                <TableHead className="text-right">الموقع</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const route = routes.find(r => r.id === customer.routeId);
                const driver = drivers.find(d => d.id === customer.driverId);
                return (
                  <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>{customer.address}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        {driver?.name || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        {route?.name || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {customer.locationUrl ? (
                        <a
                          href={customer.locationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                        >
                          <ExternalLink className="h-3 w-3" />
                          خريطة
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(customer)}
                          data-testid={`button-edit-customer-${customer.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setCustomerToDelete(customer)}
                          data-testid={`button-delete-customer-${customer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    {filterDriverId ? 'لا يوجد عملاء لهذا المندوب' : 'لا يوجد عملاء مسجلين'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add/Edit Customer Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-[500px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">
                {editingCustomer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4 text-right">
              <div className="space-y-2">
                <Label htmlFor="name">اسم العميل / المحل</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  data-testid="input-customer-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                    data-testid="input-customer-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver">المندوب المسؤول</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, driverId: value })} value={formData.driverId}>
                    <SelectTrigger className="text-right" data-testid="select-customer-driver">
                      <SelectValue placeholder="اختر المندوب" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="route">خط التوزيع</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, routeId: value })} value={formData.routeId}>
                    <SelectTrigger className="text-right" data-testid="select-customer-route">
                      <SelectValue placeholder="اختر الخط" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map(route => (
                        <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input 
                  id="address" 
                  value={formData.address} 
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                  required 
                  data-testid="input-customer-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">رابط موقع Google Maps (اختياري)</Label>
                <Input 
                  id="location" 
                  value={formData.locationUrl} 
                  onChange={(e) => setFormData({ ...formData, locationUrl: e.target.value })} 
                  placeholder="https://maps.google.com/..." 
                  data-testid="input-customer-location"
                />
              </div>
              <DialogFooter className="flex flex-row-reverse gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={createCustomer.isPending || updateCustomer.isPending}
                  data-testid="button-save-customer"
                >
                  {(createCustomer.isPending || updateCustomer.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    editingCustomer ? "حفظ التغييرات" : "حفظ العميل"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">حذف العميل</AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                هل أنت متأكد من حذف العميل "{customerToDelete?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-row-reverse gap-2">
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-customer"
              >
                حذف
              </AlertDialogAction>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
