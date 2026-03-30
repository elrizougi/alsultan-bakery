import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore } from "@/lib/store";
import { useCustomers, useRoutes, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, useUsers, useProducts } from "@/hooks/useData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Phone, MapPin, ExternalLink, Loader2, Edit2, Trash2, Upload, Download, Search, DollarSign, GripVertical, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@/lib/api";

interface CustomerFormData {
  name: string;
  address: string;
  locationUrl: string;
  phone: string;
  routeId: string;
  driverId: string;
}

function SortableCustomerRow({ customer }: { customer: Customer }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: customer.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg mb-2 cursor-default select-none"
    >
      <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
        <GripVertical className="h-5 w-5" />
      </span>
      <span className="flex-1 font-medium text-right">{customer.name}</span>
      {customer.address && (
        <span className="text-sm text-muted-foreground">{customer.address}</span>
      )}
    </div>
  );
}

export default function CustomersPage() {
  const currentUser = useStore(state => state.user);
  const canExportCSV = currentUser?.role !== 'SUB_ADMIN';
  const { data: customers = [], isLoading } = useCustomers();
  const { data: routes = [] } = useRoutes();
  const { data: users = [] } = useUsers();
  const { data: products = [] } = useProducts();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [filterDriverId, setFilterDriverId] = useState<string>("");
  const [filterRouteId, setFilterRouteId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pricesCustomer, setPricesCustomer] = useState<Customer | null>(null);
  const [newPriceProductId, setNewPriceProductId] = useState<string>("");
  const [newPriceValue, setNewPriceValue] = useState<string>("");
  const [deleteStep, setDeleteStep] = useState<'idle' | 'loading' | 'warning'>('idle');
  const [relatedCounts, setRelatedCounts] = useState<{ transactions: number; debts: number; prices: number } | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>("");
  const [transferSearch, setTransferSearch] = useState<string>("");
  const [routeSearch, setRouteSearch] = useState<string>("");
  const [showRouteDropdown, setShowRouteDropdown] = useState(false);
  const routeDropdownRef = useRef<HTMLDivElement>(null);
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [reorderList, setReorderList] = useState<Customer[]>([]);
  const [isSavingReorder, setIsSavingReorder] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (routeDropdownRef.current && !routeDropdownRef.current.contains(e.target as Node)) {
        setShowRouteDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: customerPrices = [], refetch: refetchPrices } = useQuery({
    queryKey: ["customer-prices", pricesCustomer?.id],
    queryFn: async () => {
      if (!pricesCustomer) return [];
      const res = await fetch(`/api/customer-prices/${pricesCustomer.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!pricesCustomer,
  });
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    address: "",
    locationUrl: "",
    phone: "",
    routeId: "",
    driverId: "",
  });

  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);

  const dndSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleOpenReorder = (driverId: string) => {
    const driverCustomers = customers
      .filter(c => !c.isDirectSale && c.driverId === driverId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    setReorderList(driverCustomers);
    setIsReorderOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setReorderList(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveReorder = async () => {
    setIsSavingReorder(true);
    try {
      const orders = reorderList.map((c, idx) => ({ id: c.id, sortOrder: idx }));
      const res = await fetch("/api/customers/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
      });
      if (!res.ok) throw new Error("فشل الحفظ");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsReorderOpen(false);
      toast({ title: "تم حفظ الترتيب بنجاح" });
    } catch {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally {
      setIsSavingReorder(false);
    }
  };

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
  }).sort((a, b) => {
    if (filterDriverId && filterDriverId !== "all") {
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    }
    const aStartsWithNum = /^\d/.test(a.name);
    const bStartsWithNum = /^\d/.test(b.name);
    if (aStartsWithNum && !bStartsWithNum) return 1;
    if (!aStartsWithNum && bStartsWithNum) return -1;
    if (aStartsWithNum && bStartsWithNum) {
      return parseFloat(a.name) - parseFloat(b.name);
    }
    return a.name.localeCompare(b.name, 'ar');
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
    setRouteSearch("");
    setShowRouteDropdown(false);
    setShowForm(true);
  };

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer);
    const selectedRoute = routes.find(r => r.id === customer.routeId);
    setRouteSearch(selectedRoute?.name || "");
    setShowRouteDropdown(false);
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
    if (!formData.name) {
      toast({ title: "يرجى إدخال اسم العميل", variant: "destructive" });
      return;
    }

    try {
      const customerData: any = {
        name: formData.name,
        address: formData.address || "",
        locationUrl: formData.locationUrl || undefined,
        phone: formData.phone || "",
        routeId: formData.routeId || null,
        driverId: formData.driverId || null,
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

  const handleDeleteClick = async (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteStep('loading');
    setTransferTargetId("");
    setTransferSearch("");
    try {
      const res = await fetch(`/api/customers/${customer.id}/related-counts`);
      const counts = await res.json();
      setRelatedCounts(counts);
      if (counts.transactions === 0 && counts.debts === 0 && counts.prices === 0) {
        setDeleteStep('idle');
      } else {
        setDeleteStep('warning');
      }
    } catch {
      setRelatedCounts(null);
      setDeleteStep('idle');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    try {
      await deleteCustomer.mutateAsync(customerToDelete.id);
      toast({ title: "تم حذف العميل وجميع بياناته" });
      setCustomerToDelete(null);
      setDeleteStep('idle');
      setRelatedCounts(null);
    } catch (error) {
      toast({ title: "حدث خطأ في حذف العميل", variant: "destructive" });
    }
  };

  const handleTransferAndDelete = async () => {
    if (!customerToDelete || !transferTargetId) return;
    try {
      await fetch(`/api/customers/${customerToDelete.id}/transfer/${transferTargetId}`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "تم نقل العمليات وحذف العميل" });
      setCustomerToDelete(null);
      setDeleteStep('idle');
      setRelatedCounts(null);
      setTransferTargetId("");
      setTransferSearch("");
    } catch (error) {
      toast({ title: "حدث خطأ في نقل العمليات", variant: "destructive" });
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
          {filterDriverId && filterDriverId !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenReorder(filterDriverId)}
              data-testid="btn-reorder-customers"
              className="gap-1"
            >
              <ArrowUpDown className="h-4 w-4" /> ترتيب العملاء
            </Button>
          )}
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
                          onClick={() => setPricesCustomer(customer)}
                          title="أسعار خاصة"
                          data-testid={`button-prices-customer-${customer.id}`}
                        >
                          <DollarSign className="h-4 w-4 text-amber-600" />
                        </Button>
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
                          onClick={() => handleDeleteClick(customer)}
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
                  <Select onValueChange={(value) => setFormData({ ...formData, driverId: value === "none" ? "" : value })} value={formData.driverId || "none"}>
                    <SelectTrigger className="text-right" data-testid="select-customer-driver">
                      <SelectValue placeholder="اختر المندوب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— بدون مندوب —</SelectItem>
                      {drivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="route">خط التوزيع</Label>
                <div className="relative" ref={routeDropdownRef}>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن خط التوزيع..."
                      value={routeSearch}
                      onChange={(e) => { setRouteSearch(e.target.value); setShowRouteDropdown(true); }}
                      onFocus={() => setShowRouteDropdown(true)}
                      className="pr-9 text-right"
                      data-testid="input-route-search"
                    />
                  </div>
                  {formData.routeId && (
                    <div className="bg-green-50 border border-green-300 rounded p-1.5 mt-1 text-right text-sm text-green-800 flex items-center justify-between">
                      <span>تم اختيار: <strong>{routes.find(r => r.id === formData.routeId)?.name}</strong></span>
                      <button type="button" className="text-red-500 hover:text-red-700 text-xs px-1" onClick={() => { setFormData({ ...formData, routeId: "" }); setRouteSearch(""); }}>✕</button>
                    </div>
                  )}
                  {showRouteDropdown && (
                    <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto border rounded bg-white shadow-lg">
                      <div
                        onClick={() => { setFormData({ ...formData, routeId: "" }); setRouteSearch(""); setShowRouteDropdown(false); }}
                        className={`px-3 py-2 text-right cursor-pointer hover:bg-accent text-sm border-b ${!formData.routeId ? 'bg-primary/10 font-bold' : ''}`}
                      >
                        — بدون خط —
                      </div>
                      {routes
                        .filter(r => !routeSearch || r.name.includes(routeSearch))
                        .map(route => (
                          <div
                            key={route.id}
                            onClick={() => { setFormData({ ...formData, routeId: route.id }); setRouteSearch(route.name); setShowRouteDropdown(false); }}
                            className={`px-3 py-2 text-right cursor-pointer hover:bg-accent text-sm border-b last:border-b-0 ${formData.routeId === route.id ? 'bg-primary/10 font-bold' : ''}`}
                            data-testid={`route-option-${route.id}`}
                          >
                            {route.name}
                          </div>
                        ))
                      }
                      {routes.filter(r => !routeSearch || r.name.includes(routeSearch)).length === 0 && (
                        <div className="px-3 py-2 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input 
                  id="address" 
                  value={formData.address} 
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
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

        {/* Delete Confirmation Dialog - No related data */}
        <AlertDialog open={!!customerToDelete && deleteStep === 'idle'} onOpenChange={(open) => { if (!open) { setCustomerToDelete(null); setDeleteStep('idle'); } }}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">حذف العميل</AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                هل أنت متأكد من حذف العميل "{customerToDelete?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-row-reverse gap-2">
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-customer"
              >
                حذف
              </AlertDialogAction>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Warning Dialog - Has related data */}
        <Dialog open={!!customerToDelete && deleteStep === 'warning'} onOpenChange={(open) => { if (!open) { setCustomerToDelete(null); setDeleteStep('idle'); setRelatedCounts(null); setTransferTargetId(""); setTransferSearch(""); } }}>
          <DialogContent className="sm:max-w-[500px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right text-destructive">تحذير - حذف العميل "{customerToDelete?.name}"</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-right space-y-2">
                <p className="font-bold text-amber-800">هذا العميل مرتبط بالبيانات التالية:</p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                  {relatedCounts && relatedCounts.transactions > 0 && (
                    <li>{relatedCounts.transactions} عملية (بيع، إرجاع، إلخ)</li>
                  )}
                  {relatedCounts && relatedCounts.debts > 0 && (
                    <li>{relatedCounts.debts} سجل دين</li>
                  )}
                  {relatedCounts && relatedCounts.prices > 0 && (
                    <li>{relatedCounts.prices} سعر خاص</li>
                  )}
                </ul>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <p className="font-bold text-right">الخيار 1: نقل العمليات لعميل آخر ثم حذف</p>
                <div className="space-y-2">
                  <Label className="text-right block">ابحث واختر العميل المستلم</Label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="اكتب اسم العميل للبحث..."
                      value={transferSearch}
                      onChange={(e) => { setTransferSearch(e.target.value); setTransferTargetId(""); }}
                      className="pr-9 text-right"
                      data-testid="input-transfer-search"
                    />
                  </div>
                  {transferTargetId && (
                    <div className="bg-green-50 border border-green-300 rounded p-2 text-right text-sm text-green-800">
                      تم اختيار: <strong>{customers.find(c => c.id === transferTargetId)?.name}</strong>
                    </div>
                  )}
                  <div className="max-h-40 overflow-y-auto border rounded">
                    {customers
                      .filter(c => c.id !== customerToDelete?.id && (transferSearch === "" || c.name.includes(transferSearch)))
                      .map(c => (
                        <div
                          key={c.id}
                          onClick={() => { setTransferTargetId(c.id); setTransferSearch(c.name); }}
                          className={`px-3 py-2 text-right cursor-pointer hover:bg-accent text-sm border-b last:border-b-0 ${transferTargetId === c.id ? 'bg-primary/10 font-bold' : ''}`}
                          data-testid={`transfer-option-${c.id}`}
                        >
                          {c.name}
                        </div>
                      ))
                    }
                    {customers.filter(c => c.id !== customerToDelete?.id && (transferSearch === "" || c.name.includes(transferSearch))).length === 0 && (
                      <div className="px-3 py-2 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
                    )}
                  </div>
                  <Button
                    onClick={handleTransferAndDelete}
                    disabled={!transferTargetId}
                    className="w-full"
                    data-testid="button-transfer-and-delete"
                  >
                    نقل وحذف
                  </Button>
                </div>
              </div>

              <div className="border border-destructive rounded-lg p-4 space-y-3">
                <p className="font-bold text-right text-destructive">الخيار 2: حذف العميل مع جميع بياناته نهائياً</p>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  className="w-full"
                  data-testid="button-force-delete-customer"
                >
                  حذف الكل نهائياً
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCustomerToDelete(null); setDeleteStep('idle'); setRelatedCounts(null); setTransferTargetId(""); setTransferSearch(""); }}>
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!pricesCustomer} onOpenChange={(open) => { if (!open) { setPricesCustomer(null); setNewPriceProductId(""); setNewPriceValue(""); } }}>
          <DialogContent className="sm:max-w-[550px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">
                أسعار خاصة - {pricesCustomer?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">المنتج</Label>
                  <Select value={newPriceProductId} onValueChange={setNewPriceProductId}>
                    <SelectTrigger data-testid="select-price-product">
                      <SelectValue placeholder="اختر المنتج" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.price} ر.س)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">السعر</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={newPriceValue}
                    onChange={(e) => setNewPriceValue(e.target.value)}
                    placeholder="السعر"
                    data-testid="input-customer-price"
                  />
                </div>
                <Button
                  size="sm"
                  className="mb-0"
                  disabled={!newPriceProductId || !newPriceValue}
                  onClick={async () => {
                    if (!pricesCustomer || !newPriceProductId || !newPriceValue) return;
                    try {
                      const res = await fetch("/api/customer-prices", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ customerId: pricesCustomer.id, productId: newPriceProductId, price: newPriceValue }),
                      });
                      if (!res.ok) throw new Error("failed");
                      toast({ title: "تم حفظ السعر" });
                      setNewPriceProductId("");
                      setNewPriceValue("");
                      refetchPrices();
                      queryClient.invalidateQueries({ queryKey: ["customer-prices-all"] });
                    } catch {
                      toast({ title: "حدث خطأ", variant: "destructive" });
                    }
                  }}
                  data-testid="button-save-customer-price"
                >
                  حفظ
                </Button>
              </div>

              {customerPrices.length > 0 ? (
                <Table className="text-right">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">السعر الأصلي</TableHead>
                      <TableHead className="text-right">سعر العميل</TableHead>
                      <TableHead className="text-right">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerPrices.map((cp: any) => {
                      const product = products.find(p => p.id === cp.productId);
                      return (
                        <TableRow key={cp.id}>
                          <TableCell>{product?.name || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{product?.price || "-"} ر.س</TableCell>
                          <TableCell className="font-bold text-amber-700">{cp.price} ر.س</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/customer-prices/${cp.id}`, { method: "DELETE" });
                                  if (!res.ok) throw new Error("failed");
                                  toast({ title: "تم حذف السعر" });
                                  refetchPrices();
                                  queryClient.invalidateQueries({ queryKey: ["customer-prices-all"] });
                                } catch {
                                  toast({ title: "حدث خطأ", variant: "destructive" });
                                }
                              }}
                              data-testid={`button-delete-price-${cp.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد أسعار خاصة لهذا العميل</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      {/* Reorder Customers Dialog */}
      <Dialog open={isReorderOpen} onOpenChange={(open) => { if (!open) setIsReorderOpen(false); }}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              ترتيب عملاء المندوب
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-right">اسحب الصفوف لتغيير الترتيب ثم اضغط حفظ.</p>
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {reorderList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا يوجد عملاء لهذا المندوب</p>
            ) : (
              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={reorderList.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {reorderList.map((customer, idx) => (
                    <div key={customer.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 text-center">{idx + 1}</span>
                      <div className="flex-1">
                        <SortableCustomerRow customer={customer} />
                      </div>
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReorderOpen(false)} disabled={isSavingReorder}>إلغاء</Button>
            <Button onClick={handleSaveReorder} disabled={isSavingReorder || reorderList.length === 0}>
              {isSavingReorder ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ الترتيب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </AdminLayout>
  );
}
