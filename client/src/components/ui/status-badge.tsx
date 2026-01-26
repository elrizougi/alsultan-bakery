import { cn } from "@/lib/utils";
import { Status, RunStatus } from "@/lib/store";

interface StatusBadgeProps {
  status: Status | RunStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusLower = status.toLowerCase();
  
  const labelMap: Record<string, string> = {
    'draft': 'مسودة',
    'confirmed': 'مؤكد',
    'assigned': 'بانتظار التحميل',
    'loaded': 'تم التحميل',
    'out': 'جاري التوصيل',
    'delivered': 'مكتمل',
    'returned': 'مرتجع الميدان',
    'closed': 'مغلق',
    'canceled': 'ملغي'
  };

  return (
    <span className={cn(
      "inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold border-0",
      `bg-status-${statusLower}`,
      className
    )}>
      {labelMap[statusLower] || statusLower}
    </span>
  );
}
