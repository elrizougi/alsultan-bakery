import { useState } from "react";
import { useStore, Role } from "@/lib/store";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useStore((state) => state.login);
  const [, setLocation] = useLocation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple mock logic
    let role: Role = 'ADMIN';
    if (username.toLowerCase().includes('driver')) role = 'DRIVER';
    if (username.toLowerCase().includes('sales')) role = 'SALES';
    
    login(username, role);
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-2">
            <Package className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
          <CardDescription>نظام إدارة المخبوزات المتكامل</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2 text-right">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input 
                id="username" 
                placeholder="أدخل اسم المستخدم" 
                className="text-right"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <p className="text-[10px] text-muted-foreground">استخدم 'admin' للمدير، 'driver' للسائق</p>
            </div>
            <div className="space-y-2 text-right">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="text-right"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-11 text-lg">
              دخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
