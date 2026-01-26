import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, Role as UserRole } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  Shield, 
  UserCircle, 
  Truck, 
  Store, 
  MoreVertical, 
  Trash2, 
  Edit,
  Lock
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UsersPermissionsPage() {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  
  // Mock users data
  const users = [
    { id: 1, name: "أحمد الإداري", username: "admin", role: "ADMIN", status: "نشط", lastLogin: "2024-05-20" },
    { id: 2, name: "خالد المندوب", username: "driver1", role: "DRIVER", status: "في رحلة", lastLogin: "2024-05-21" },
    { id: 3, name: "سامي المبيعات", username: "sales1", role: "SALES", status: "نشط", lastLogin: "2024-05-19" },
    { id: 4, name: "فهد المندوب", username: "driver2", role: "DRIVER", status: "متوقف", lastLogin: "2024-05-15" },
  ];

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'ADMIN':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-black border border-purple-100">
            <Shield className="h-3 w-3" /> إدارة عليا
          </div>
        );
      case 'DRIVER':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black border border-blue-100">
            <Truck className="h-3 w-3" /> مندوب توصيل
          </div>
        );
      case 'SALES':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-black border border-amber-100">
            <Store className="h-3 w-3" /> مبيعات
          </div>
        );
      default:
        return role;
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8" dir="rtl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-right">
            <h1 className="text-3xl font-black tracking-tight text-slate-800">الصلاحيات والمستخدمين</h1>
            <p className="text-slate-500 font-medium">إدارة أدوار الموظفين والوصول إلى النظام.</p>
          </div>
          <Button onClick={() => setIsAddUserOpen(true)} className="bg-primary hover:bg-primary/90 rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 font-black gap-2">
            <Plus className="h-5 w-5" /> إضافة مستخدم جديد
          </Button>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-2xl mb-6 h-14 w-full sm:w-auto">
            <TabsTrigger value="users" className="rounded-xl px-8 font-black data-[state=active]:bg-white data-[state=active]:shadow-sm h-12">
              الموظفين
            </TabsTrigger>
            <TabsTrigger value="roles" className="rounded-xl px-8 font-black data-[state=active]:bg-white data-[state=active]:shadow-sm h-12">
              قواعد الأدوار
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl px-8 font-black data-[state=active]:bg-white data-[state=active]:shadow-sm h-12">
              الأمان والتشفير
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 flex-row-reverse">
                  <div className="h-14 w-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500">
                    <Shield className="h-7 w-7" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-400">مدراء النظام</p>
                    <h3 className="text-2xl font-black text-slate-800">2</h3>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 flex-row-reverse">
                  <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                    <Truck className="h-7 w-7" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-400">المناديب</p>
                    <h3 className="text-2xl font-black text-slate-800">12</h3>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 flex-row-reverse">
                  <div className="h-14 w-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                    <Store className="h-7 w-7" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-400">فريق المبيعات</p>
                    <h3 className="text-2xl font-black text-slate-800">5</h3>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <Table className="text-right">
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100">
                    <TableHead className="text-right font-black text-slate-500 p-6">المستخدم</TableHead>
                    <TableHead className="text-right font-black text-slate-500">الدور الوظيفي</TableHead>
                    <TableHead className="text-right font-black text-slate-500">الحالة</TableHead>
                    <TableHead className="text-right font-black text-slate-500">آخر ظهور</TableHead>
                    <TableHead className="text-left font-black text-slate-500 p-6">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/30 border-slate-50 transition-colors">
                      <TableCell className="p-6">
                        <div className="flex items-center gap-3 flex-row-reverse">
                          <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black">
                            {user.name[0]}
                          </div>
                          <div className="text-right">
                            <p className="font-black text-slate-800 leading-none mb-1">{user.name}</p>
                            <p className="text-xs font-medium text-slate-400">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2 justify-end">
                            <span className="text-sm font-bold text-slate-600">{user.status}</span>
                            <div className={`h-2 w-2 rounded-full ${user.status === 'نشط' || user.status === 'في رحلة' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                         </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">{user.lastLogin}</TableCell>
                      <TableCell className="p-6 text-left">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100">
                                <MoreVertical className="h-5 w-5 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl shadow-2xl border-slate-100 min-w-[180px]">
                               <DropdownMenuItem className="flex items-center gap-3 justify-end p-3 font-bold text-slate-600 focus:text-primary">
                                  تعديل البيانات
                                  <Edit className="h-4 w-4" />
                               </DropdownMenuItem>
                               <DropdownMenuItem className="flex items-center gap-3 justify-end p-3 font-bold text-slate-600">
                                  تغيير كلمة المرور
                                  <Lock className="h-4 w-4" />
                               </DropdownMenuItem>
                               <DropdownMenuItem className="flex items-center gap-3 justify-end p-3 font-bold text-red-500 focus:text-red-600 focus:bg-red-50">
                                  تعطيل الحساب
                                  <Trash2 className="h-4 w-4" />
                               </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="roles">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center py-20">
               <Shield className="h-16 w-16 text-primary/20 mx-auto mb-4" />
               <h3 className="text-xl font-black text-slate-800 mb-2">إعدادات الأدوار المتقدمة</h3>
               <p className="text-slate-500 max-w-md mx-auto font-medium">
                 هذا القسم يتيح لك تحديد الصلاحيات الدقيقة لكل دور (إضافة، تعديل، حذف، عرض التقارير).
               </p>
            </div>
          </TabsContent>
        </Tabs>

        <AddUserDialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen} />
      </div>
    </AdminLayout>
  );
}

function AddUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md rounded-3xl shadow-2xl border-0 p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-800 text-right mb-6">إضافة موظف جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="font-bold text-slate-600 block text-right">الاسم الكامل</Label>
            <Input className="h-12 rounded-xl border-slate-200 text-right font-bold" placeholder="أدخل اسم الموظف" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-600 block text-right">اسم المستخدم</Label>
            <Input className="h-12 rounded-xl border-slate-200 text-right font-bold" placeholder="مثال: ahmed_24" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-600 block text-right">الدور الوظيفي</Label>
            <Select>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 font-bold" dir="rtl">
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent className="rounded-xl font-bold" dir="rtl">
                <SelectItem value="ADMIN">إدارة عليا</SelectItem>
                <SelectItem value="DRIVER">مندوب توصيل</SelectItem>
                <SelectItem value="SALES">مبيعات</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-600 block text-right">كلمة المرور المؤقتة</Label>
            <Input type="password" className="h-12 rounded-xl border-slate-200 text-right font-bold" placeholder="••••••••" />
          </div>
        </div>
        <DialogFooter className="mt-8 gap-3 flex flex-row-reverse sm:justify-start">
          <Button className="h-12 rounded-xl font-black px-8 bg-primary shadow-lg shadow-primary/20">حفظ المستخدم</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12 rounded-xl font-black px-8 border-slate-200">إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
