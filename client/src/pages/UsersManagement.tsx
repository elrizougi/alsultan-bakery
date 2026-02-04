import { useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useUsers, useCreateUser, useUpdateUser, useChangePassword, useToggleUserActive, useDeleteUser } from "@/hooks/useData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Shield, Edit2, Trash2, Loader2, Key, Power, PowerOff, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { User, Role } from "@/lib/api";
import { MoreVertical } from "lucide-react";

const roleLabels: Record<Role, string> = {
  ADMIN: "مدير النظام",
  DRIVER: "مندوب توزيع",
  SALES: "موظف مبيعات",
};

const roleColors: Record<Role, string> = {
  ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
  DRIVER: "bg-blue-50 text-blue-700 border-blue-200",
  SALES: "bg-green-50 text-green-700 border-green-200",
};

export default function UsersManagementPage() {
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const changePassword = useChangePassword();
  const toggleActive = useToggleUserActive();
  const deleteUser = useDeleteUser();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  
  // Create form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("SALES");
  
  // Edit form
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("SALES");
  
  // Password form
  const [newUserPassword, setNewUserPassword] = useState("");
  
  // CSV Import
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csvContent = "username,password,name,role\nاسم_المستخدم,كلمة_المرور,الاسم_الكامل,الدور\nuser1,pass123,محمد أحمد,SALES\ndriver1,pass456,خالد السائق,DRIVER";
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "employees_template.csv";
    link.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ title: "الملف فارغ أو لا يحتوي على بيانات", variant: "destructive" });
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const usernameIdx = headers.findIndex(h => h === "username" || h === "مستخدم" || h === "اسم_المستخدم");
      const passwordIdx = headers.findIndex(h => h === "password" || h === "كلمة_المرور" || h === "باسورد");
      const nameIdx = headers.findIndex(h => h === "name" || h === "اسم" || h === "الاسم");
      const roleIdx = headers.findIndex(h => h === "role" || h === "دور" || h === "الدور");

      if (usernameIdx === -1 || passwordIdx === -1 || nameIdx === -1) {
        toast({ title: "يجب أن يحتوي الملف على أعمدة: username, password, name", variant: "destructive" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const username = values[usernameIdx];
        const password = values[passwordIdx];
        const name = values[nameIdx];
        const roleValue = roleIdx !== -1 ? values[roleIdx]?.toUpperCase() : "SALES";
        const role: Role = (roleValue === "ADMIN" || roleValue === "DRIVER" || roleValue === "SALES") ? roleValue : "SALES";

        if (!username || !password || !name || password.length < 6) {
          errorCount++;
          continue;
        }

        try {
          await createUser.mutateAsync({ username, password, name, role });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      toast({ 
        title: `تم استيراد ${successCount} موظف بنجاح${errorCount > 0 ? ` (${errorCount} أخطاء)` : ""}` 
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newName) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    try {
      await createUser.mutateAsync({ username: newUsername, password: newPassword, name: newName, role: newRole });
      toast({ title: "تم إضافة المستخدم بنجاح" });
      setIsCreateOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      setNewRole("SALES");
    } catch (error: any) {
      toast({ title: error?.message || "حدث خطأ - قد يكون اسم المستخدم موجود مسبقاً", variant: "destructive" });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName) return;
    try {
      await updateUser.mutateAsync({ id: editingUser.id, name: editName, role: editRole });
      toast({ title: "تم تحديث بيانات المستخدم" });
      setEditingUser(null);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser || !newUserPassword) return;
    if (newUserPassword.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    try {
      await changePassword.mutateAsync({ id: passwordUser.id, password: newUserPassword });
      toast({ title: "تم تغيير كلمة المرور بنجاح" });
      setPasswordUser(null);
      setNewUserPassword("");
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const newStatus = !user.isActive;
      await toggleActive.mutateAsync({ id: user.id, isActive: newStatus });
      toast({ title: newStatus ? "تم تفعيل الحساب" : "تم تعطيل الحساب" });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
    try {
      await deleteUser.mutateAsync(id);
      toast({ title: "تم حذف المستخدم" });
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
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

  const activeUsers = users.filter(u => u.isActive !== false);
  const inactiveUsers = users.filter(u => u.isActive === false);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800">إدارة الموظفين والصلاحيات</h1>
            <p className="text-sm text-muted-foreground">إضافة وتعديل الموظفين وإدارة صلاحياتهم.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-primary rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20">
              <UserPlus className="h-4 w-4" /> إضافة موظف
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 rounded-xl h-11" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              استيراد CSV
            </Button>
            <Button 
              variant="ghost" 
              className="gap-2 rounded-xl h-11" 
              onClick={downloadTemplate}
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
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الموظفين</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-3xl font-black text-slate-800">{users.length}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">حسابات نشطة</CardTitle>
              <Power className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-3xl font-black text-green-600">{activeUsers.length}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">حسابات معطلة</CardTitle>
              <PowerOff className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-3xl font-black text-red-500">{inactiveUsers.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
          <Table className="text-right">
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-right font-bold text-slate-500">الاسم</TableHead>
                <TableHead className="text-right font-bold text-slate-500">اسم المستخدم</TableHead>
                <TableHead className="text-right font-bold text-slate-500">الصلاحية</TableHead>
                <TableHead className="text-right font-bold text-slate-500">الحالة</TableHead>
                <TableHead className="text-left font-bold text-slate-500">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className={`hover:bg-slate-50/50 ${user.isActive === false ? 'opacity-50' : ''}`}>
                  <TableCell className="font-bold text-slate-700">{user.name}</TableCell>
                  <TableCell className="font-mono text-sm text-slate-500">{user.username}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold border ${roleColors[user.role]}`}>
                      <Shield className="h-3 w-3" />
                      {roleLabels[user.role]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.isActive !== false ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                        معطل
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl min-w-[160px]">
                        <DropdownMenuItem 
                          className="flex items-center gap-2 justify-end font-bold text-slate-600 p-3"
                          onClick={() => openEdit(user)}
                        >
                          تعديل البيانات
                          <Edit2 className="h-4 w-4" />
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2 justify-end font-bold text-slate-600 p-3"
                          onClick={() => setPasswordUser(user)}
                        >
                          تغيير كلمة المرور
                          <Key className="h-4 w-4" />
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className={`flex items-center gap-2 justify-end font-bold p-3 ${user.isActive !== false ? 'text-amber-600' : 'text-green-600'}`}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive !== false ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                          {user.isActive !== false ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2 justify-end font-bold text-red-500 p-3"
                          onClick={() => handleDelete(user.id)}
                        >
                          حذف المستخدم
                          <Trash2 className="h-4 w-4" />
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    لا يوجد موظفين
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent dir="rtl" className="sm:max-w-[450px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-right text-xl font-black">إضافة موظف جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4 text-right">
              <div className="space-y-2">
                <Label className="font-bold">الاسم الكامل</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">اسم المستخدم</Label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="مثال: ahmed123"
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">كلمة المرور</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">الصلاحية</Label>
                <Select value={newRole} onValueChange={(val) => setNewRole(val as Role)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">مدير النظام</SelectItem>
                    <SelectItem value="DRIVER">سائق توصيل</SelectItem>
                    <SelectItem value="SALES">موظف مبيعات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="flex flex-row-reverse gap-3 pt-4">
                <Button type="submit" className="h-11 rounded-xl font-bold" disabled={createUser.isPending}>
                  {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إضافة"}
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setIsCreateOpen(false)}>إلغاء</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent dir="rtl" className="sm:max-w-[450px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-right text-xl font-black">تعديل بيانات الموظف</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4 py-4 text-right">
              <div className="space-y-2">
                <Label className="font-bold">الاسم الكامل</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">الصلاحية</Label>
                <Select value={editRole} onValueChange={(val) => setEditRole(val as Role)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">مدير النظام</SelectItem>
                    <SelectItem value="DRIVER">سائق توصيل</SelectItem>
                    <SelectItem value="SALES">موظف مبيعات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="flex flex-row-reverse gap-3 pt-4">
                <Button type="submit" className="h-11 rounded-xl font-bold" disabled={updateUser.isPending}>
                  {updateUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التعديلات"}
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setEditingUser(null)}>إلغاء</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={!!passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)}>
          <DialogContent dir="rtl" className="sm:max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-right text-xl font-black">تغيير كلمة المرور</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleChangePassword} className="space-y-4 py-4 text-right">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">المستخدم: <span className="font-bold text-slate-700">{passwordUser?.name}</span></p>
              </div>
              <div className="space-y-2">
                <Label className="font-bold">كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <DialogFooter className="flex flex-row-reverse gap-3 pt-4">
                <Button type="submit" className="h-11 rounded-xl font-bold" disabled={changePassword.isPending}>
                  {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تغيير كلمة المرور"}
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setPasswordUser(null)}>إلغاء</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
