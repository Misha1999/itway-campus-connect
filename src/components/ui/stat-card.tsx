import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral" | "warning";
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral",
  icon: Icon,
  className 
}: StatCardProps) {
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-6 transition-shadow hover:shadow-sm",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold text-foreground">{value}</p>
          {change && (
            <p className={cn(
              "text-sm font-medium",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground",
              changeType === "warning" && "text-warning"
            )}>
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-lg bg-accent">
            <Icon className="h-5 w-5 text-accent-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
