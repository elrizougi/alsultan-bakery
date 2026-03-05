import { cn } from "@/lib/utils";
import { Status } from "@/lib/store";

interface StatusBadgeProps {
  status: Status | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusLower = status.toLowerCase();
  
  const labelMap: Record<string, string> = {
    'draft': 'مسودة',
    'confirmed': 'تم التحميل',
    'assigned': 'في الطريق',
    'loaded': 'تم التحميل',
    'out': 'جاري التوصيل',
    'delivered': 'عاد للمخبز',
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
