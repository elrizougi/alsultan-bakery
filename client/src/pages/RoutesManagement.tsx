import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute, useUsers } from "@/hooks/useData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Plus, Edit2, Trash2, Loader2, User2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import type { Route } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function RoutesManagementPage() {
  const { data: routes = [], isLoading } = useRoutes();
  const { data: users = [] } = useUsers();
  const createRoute = useCreateRoute();
  const updateRoute = useUpdateRoute();
  const deleteRoute = useDeleteRoute();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  
  const [newName, setNewName] = useState("");
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverOpen, setNewDriverOpen] = useState(false);
  
  const [editName, setEditName] = useState("");
  const [editDriverName, setEditDriverName] = useState("");
  const [editDriverOpen, setEditDriverOpen] = useState(false);

  const drivers = users.filter(u => u.role === 'DRIVER' && u.isActive !== false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newDriverName) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    try {
      await createRoute.mutateAsync({ name: newName, driverName: newDriverName });
      toast({ title: "تم إضافة خط التوزيع بنجاح" });
      setIsCreateOpen(false);
      setNewName("");
      setNewDriverName("");
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute || !editName || !editDriverName) return;
    try {
      await updateRoute.mutateAsync({ id: editingRoute.id, name: editName, driverName: editDriverName });
      toast({ title: "تم تحديث خط التوزيع" });
      setEditingRoute(null);
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف خط التوزيع؟")) return;
    try {
      await deleteRoute.mutateAsync(id);
      toast({ title: "تم حذف خط التوزيع" });
    } catch (error) {
      toast({ title: "حدث خطأ - قد يكون هناك عملاء مرتبطين بهذا الخط", variant: "destructive" });
    }
  };

  const openEdit = (route: Route) => {
    setEditingRoute(route);
    setEditName(route.name);
    setEditDriverName(route.driverName);
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
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800">إدارة خطوط التوزيع</h1>
            <p className="text-sm text-muted-foreground">إضافة وتعديل وحذف خطوط التوزيع والمناديب.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto gap-2 bg-primary rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20" data-testid="button-add-route">
            <Plus className="h-4 w-4" /> إضافة خط جديد
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الخطوط</CardTitle>
              <MapPin className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-3xl font-black text-slate-800">{routes.length}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row-reverse items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المناديب المعينين</CardTitle>
              <User2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="text-right">
              <div className="text-3xl font-black text-slate-800">{new Set(routes.map(r => r.driverName)).size}</div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
          <Table className="text-right">
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-right font-bold text-slate-500">اسم الخط</TableHead>
                <TableHead className="text-right font-bold text-slate-500">المندوب المسؤول</TableHead>
                <TableHead className="text-left font-bold text-slate-500">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id} className="hover:bg-slate-50/50" data-testid={`row-route-${route.id}`}>
                  <TableCell className="font-bold text-slate-700">{route.name}</TableCell>
                  <TableCell className="text-slate-600">{route.driverName}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        onClick={() => openEdit(route)}
                        data-testid={`button-edit-route-${route.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                        onClick={() => handleDelete(route.id)}
                        data-testid={`button-delete-route-${route.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {routes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                    لا توجد خطوط توزيع
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
              <DialogTitle className="text-right text-xl font-black">إضافة خط توزيع جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4 text-right">
              <div className="space-y-2">
                <Label className="font-bold">اسم خط التوزيع</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: المنطقة الشرقية"
                  className="h-11 rounded-xl"
                  required
                  data-testid="input-route-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">المندوب المسؤول</Label>
                <Popover open={newDriverOpen} onOpenChange={setNewDriverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={newDriverOpen}
                      className="w-full h-11 rounded-xl justify-between text-right"
                      data-testid="select-route-driver"
                    >
                      {newDriverName || "اختر مندوب أو اكتب اسم جديد..."}
                      <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command dir="rtl">
                      <CommandInput 
                        placeholder="ابحث أو اكتب اسم جديد..." 
                        value={newDriverName}
                        onValueChange={setNewDriverName}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2 text-sm text-muted-foreground">
                            {newDriverName ? (
                              <Button 
                                type="button"
                                variant="ghost" 
                                className="w-full justify-start"
                                onClick={() => {
                                  setNewDriverOpen(false);
                                }}
                              >
                                <Check className="ml-2 h-4 w-4" />
                                استخدام "{newDriverName}"
                              </Button>
                            ) : (
                              "لا يوجد مناديب. اكتب اسم جديد..."
                            )}
                          </div>
                        </CommandEmpty>
                        <CommandGroup heading="الموظفين (المناديب)">
                          {drivers.map((driver) => (
                            <CommandItem
                              key={driver.id}
                              value={driver.name}
                              onSelect={(currentValue) => {
                                setNewDriverName(currentValue);
                                setNewDriverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  newDriverName === driver.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {driver.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">يمكنك اختيار مندوب من القائمة أو كتابة اسم شخص غير موظف</p>
              </div>
              <DialogFooter className="flex flex-row-reverse gap-3 pt-4">
                <Button type="submit" className="h-11 rounded-xl font-bold" disabled={createRoute.isPending} data-testid="button-save-route">
                  {createRoute.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إضافة"}
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setIsCreateOpen(false)}>إلغاء</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingRoute} onOpenChange={(open) => !open && setEditingRoute(null)}>
          <DialogContent dir="rtl" className="sm:max-w-[450px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-right text-xl font-black">تعديل خط التوزيع</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4 py-4 text-right">
              <div className="space-y-2">
                <Label className="font-bold">اسم خط التوزيع</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-11 rounded-xl"
                  required
                  data-testid="input-edit-route-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">المندوب المسؤول</Label>
                <Popover open={editDriverOpen} onOpenChange={setEditDriverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={editDriverOpen}
                      className="w-full h-11 rounded-xl justify-between text-right"
                      data-testid="select-edit-route-driver"
                    >
                      {editDriverName || "اختر مندوب أو اكتب اسم جديد..."}
                      <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command dir="rtl">
                      <CommandInput 
                        placeholder="ابحث أو اكتب اسم جديد..." 
                        value={editDriverName}
                        onValueChange={setEditDriverName}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2 text-sm text-muted-foreground">
                            {editDriverName ? (
                              <Button 
                                type="button"
                                variant="ghost" 
                                className="w-full justify-start"
                                onClick={() => {
                                  setEditDriverOpen(false);
                                }}
                              >
                                <Check className="ml-2 h-4 w-4" />
                                استخدام "{editDriverName}"
                              </Button>
                            ) : (
                              "لا يوجد مناديب. اكتب اسم جديد..."
                            )}
                          </div>
                        </CommandEmpty>
                        <CommandGroup heading="الموظفين (المناديب)">
                          {drivers.map((driver) => (
                            <CommandItem
                              key={driver.id}
                              value={driver.name}
                              onSelect={(currentValue) => {
                                setEditDriverName(currentValue);
                                setEditDriverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  editDriverName === driver.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {driver.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">يمكنك اختيار مندوب من القائمة أو كتابة اسم شخص غير موظف</p>
              </div>
              <DialogFooter className="flex flex-row-reverse gap-3 pt-4">
                <Button type="submit" className="h-11 rounded-xl font-bold" disabled={updateRoute.isPending} data-testid="button-update-route">
                  {updateRoute.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التعديلات"}
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setEditingRoute(null)}>إلغاء</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
