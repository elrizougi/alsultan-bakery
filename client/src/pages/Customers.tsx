import { AdminLayout } from "@/components/layout/AdminLayout";
import { useCustomers, useRoutes, useCreateCustomer } from "@/hooks/useData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Phone, MapPin, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useCustomers();
  const { data: routes = [] } = useRoutes();
  const createCustomer = useCreateCustomer();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [routeId, setRouteId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !phone) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    try {
      await createCustomer.mutateAsync({
        name,
        address,
        locationUrl: locationUrl || undefined,
        phone,
        routeId: routeId || undefined,
      });
      toast({ title: "تم إضافة العميل بنجاح" });
      setOpen(false);
      // Reset form
      setName("");
      setAddress("");
      setLocationUrl("");
      setPhone("");
      setRouteId("");
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
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
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto flex flex-row-reverse gap-2">
                <UserPlus className="h-4 w-4" /> إضافة عميل جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right">إضافة عميل جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4 text-right">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم العميل / المحل</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route">خط التوزيع</Label>
                    <Select onValueChange={setRouteId} value={routeId}>
                      <SelectTrigger className="text-right">
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
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">رابط موقع Google Maps (اختياري)</Label>
                  <Input id="location" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} placeholder="https://maps.google.com/..." />
                </div>
                <DialogFooter className="flex flex-row-reverse gap-2 pt-4">
                  <Button type="submit" disabled={createCustomer.isPending}>
                    {createCustomer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ العميل"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const route = routes.find(r => r.id === customer.routeId);
                return (
                  <TableRow key={customer.id}>
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
                  </TableRow>
                );
              })}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    لا يوجد عملاء مسجلين
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
