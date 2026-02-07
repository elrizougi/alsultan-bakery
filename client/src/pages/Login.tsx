import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const login = useStore((state) => state.login);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const user = await api.login(username, password);
      login(user);
      setLocation("/");
    } catch (error) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: "اسم المستخدم أو كلمة المرور غير صحيحة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl border-0 rounded-3xl overflow-hidden">
        <CardHeader className="text-center space-y-4 pb-2 pt-10">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Package className="h-9 w-9 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-black text-slate-800">تسجيل الدخول</CardTitle>
            <CardDescription className="text-slate-500 font-medium mt-2">نظام إدارة المخبوزات المتكامل</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3 text-right">
              <Label htmlFor="username" className="font-bold text-slate-600">اسم المستخدم</Label>
              <Input 
                id="username" 
                placeholder="أدخل اسم المستخدم" 
                className="text-right h-12 rounded-xl border-slate-200 font-bold"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-3 text-right">
              <Label htmlFor="password" className="font-bold text-slate-600">كلمة المرور</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="text-right h-12 rounded-xl border-slate-200 font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-14 text-lg rounded-2xl font-black bg-primary shadow-lg shadow-primary/20" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "دخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
