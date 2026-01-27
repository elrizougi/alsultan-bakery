import { AdminLayout } from "@/components/layout/AdminLayout";
import { useCustomers, useRoutes, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/useData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Phone, MapPin, ExternalLink, Loader2, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
}

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useCustomers();
  const { data: routes = [] } = useRoutes();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const { toast } = useToast();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    address: "",
    locationUrl: "",
    phone: "",
    routeId: "",
  });

  const openAddForm = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      address: "",
      locationUrl: "",
      phone: "",
      routeId: "",
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
          
          <Button className="w-full sm:w-auto flex flex-row-reverse gap-2" onClick={openAddForm} data-testid="button-add-customer">
            <UserPlus className="h-4 w-4" /> إضافة عميل جديد
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <Table className="text-right">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم العميل</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">خط التوزيع</TableHead>
                <TableHead className="text-right">الموقع</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const route = routes.find(r => r.id === customer.routeId);
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
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    لا يوجد عملاء مسجلين
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
