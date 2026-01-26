import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Truck, Calendar, MapPin, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export default function DispatchPage() {
  const { dispatchRuns, routes } = useStore();

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6" dir="rtl">
        <div className="flex items-center justify-between flex-row-reverse">
          <div className="text-right">
            <h1 className="text-3xl font-bold tracking-tight">رحلات التوزيع</h1>
            <p className="text-muted-foreground">إدارة خطوط التوصيل اليومية وكشوف التحميل.</p>
          </div>
          <Button className="gap-2">إنشاء رحلة جديدة</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {dispatchRuns.map((run) => {
            const route = routes.find(r => r.id === run.routeId);
            return (
              <Link 
                key={run.id} 
                href={`/dispatch/${run.id}`}
                className="block group"
              >
                <Card className="transition-all hover:shadow-md border-r-4 border-r-primary/0 hover:border-r-primary">
                  <CardHeader className="pb-3 text-right">
                    <div className="flex justify-between items-start flex-row-reverse">
                      <CardTitle className="text-lg font-bold flex items-center gap-2 flex-row-reverse">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                        {route?.name}
                      </CardTitle>
                      <StatusBadge status={run.status} className="text-[10px]" />
                    </div>
                  </CardHeader>
                  <CardContent className="text-right">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground flex-row-reverse">
                        <Calendar className="h-4 w-4" />
                        <span>{run.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground flex-row-reverse">
                        <MapPin className="h-4 w-4" />
                        <span>{run.orderIds.length} نقطة توصيل</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between flex-row-reverse">
                         <div className="text-xs font-medium bg-muted px-2 py-1 rounded">
                           السائق: {run.driverName}
                         </div>
                         <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
