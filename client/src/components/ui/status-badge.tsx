import { cn } from "@/lib/utils";
import { Status, RunStatus } from "@/lib/store";

interface StatusBadgeProps {
  status: Status | RunStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusLower = status.toLowerCase();
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent capitalize",
      `bg-status-${statusLower}`,
      className
    )}>
      {statusLower}
    </span>
  );
}
