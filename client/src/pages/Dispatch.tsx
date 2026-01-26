import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, DispatchRun } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Truck, Calendar, MapPin, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function DispatchPage() {
  const { dispatchRuns, routes } = useStore();

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dispatch Runs</h1>
            <p className="text-muted-foreground">Manage daily delivery routes and load sheets.</p>
          </div>
          <Button>Create New Run</Button>
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
                <Card className="transition-all hover:shadow-md border-l-4 border-l-primary/0 hover:border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                        {route?.name}
                      </CardTitle>
                      <StatusBadge status={run.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{run.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{run.orderIds.length} Drops</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between">
                         <div className="text-xs font-medium bg-muted px-2 py-1 rounded">
                           Driver: {run.driverName}
                         </div>
                         <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
