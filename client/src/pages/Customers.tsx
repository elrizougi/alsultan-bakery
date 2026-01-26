import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, Customer } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Phone, MapPin, ExternalLink, Plus } from "lucide-react";
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

export default function CustomersPage() {
  const { customers, routes, addCustomer } = useStore();
  const [open, setOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [routeId, setRouteId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !routeId) return;

    const newCustomer: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      address,
      locationUrl,
      phone,
      routeId,
    };

    addCustomer(newCustomer);
    setOpen(false);
    // Reset form
    setName("");
    setAddress("");
    setLocationUrl("");
    setPhone("");
    setRouteId("");
  };

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
                        {routes.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">العنوان الوصفي</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="مثال: شارع الملك خالد، بجوار البنك" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">رابط الموقع (Google Maps)</Label>
                  <Input id="location" value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} placeholder="https://maps.google.com/..." />
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit" className="w-full">حفظ العميل</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <Table className="text-right">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اسم العميل</TableHead>
                <TableHead className="text-right">العنوان والموقع</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">خط التوزيع</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const route = routes.find(r => r.id === customer.routeId);
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-1 flex-row-reverse">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{customer.address}</span>
                        </div>
                        {customer.locationUrl && (
                          <a 
                            href={customer.locationUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary flex items-center gap-1 hover:underline flex-row-reverse"
                          >
                            <ExternalLink className="h-2 w-2" />
                            رابط الخريطة
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-row-reverse font-mono text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-1 rounded-full">
                        {route?.name || customer.routeId}
                      </span>
                    </TableCell>
                    <TableCell className="text-left">
                      <Button variant="ghost" size="sm">تعديل</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
