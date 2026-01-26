import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Bell, Shield, Truck, Building2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="text-right">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الإعدادات</h1>
          <p className="text-sm text-muted-foreground">إدارة إعدادات النظام والتفضيلات العامة.</p>
        </div>

        <Tabs defaultValue="general" className="w-full" dir="rtl">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="general" className="gap-2"><Building2 className="h-4 w-4" /> عام</TabsTrigger>
            <TabsTrigger value="dispatch" className="gap-2"><Truck className="h-4 w-4" /> التوزيع</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> التنبيهات</TabsTrigger>
            <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> الأمان</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6 space-y-6">
            <Card>
              <CardHeader className="text-right">
                <CardTitle>معلومات المنشأة</CardTitle>
                <CardDescription>تظهر هذه البيانات في الفواتير وكشوف التحميل.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-right">اسم المخبز</Label>
                  <Input id="name" defaultValue="مخبز نجمة الصباح" className="text-right" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vat" className="text-right">الرقم الضريبي</Label>
                  <Input id="vat" defaultValue="300012345600003" className="text-right font-mono" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address" className="text-right">العنوان الرئيسي</Label>
                  <Input id="address" defaultValue="الرياض، حي الملقا" className="text-right" />
                </div>
                <Button className="w-fit">حفظ التغييرات</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dispatch" className="mt-6">
            <Card>
              <CardHeader className="text-right">
                <CardTitle>إعدادات التوزيع</CardTitle>
                <CardDescription>تخصيص قواعد رحلات التوصيل.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between flex-row-reverse">
                  <div className="space-y-0.5 text-right">
                    <Label>تلقائية كشوف التحميل</Label>
                    <p className="text-xs text-muted-foreground">إنشاء كشف التحميل تلقائياً عند اعتماد الرحلة.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between flex-row-reverse">
                  <div className="space-y-0.5 text-right">
                    <Label>إلزامية إثبات التوصيل</Label>
                    <p className="text-xs text-muted-foreground">تطلب من السائق التقاط صورة أو توقيع عند كل نقطة.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="grid gap-2">
                  <Label className="text-right">وقت إغلاق الرحلات التلقائي</Label>
                  <Input type="time" defaultValue="22:00" className="text-right" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
             <Card>
              <CardHeader className="text-right">
                <CardTitle>تفضيلات التنبيهات</CardTitle>
                <CardDescription>كيف ومتى ترغب في استلام التنبيهات.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between flex-row-reverse">
                  <div className="text-right">
                    <Label>تنبيهات انخفاض المخزون</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between flex-row-reverse">
                  <div className="text-right">
                    <Label>تنبيهات تأخر السائقين</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
