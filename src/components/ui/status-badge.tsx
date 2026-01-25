import { cn } from "@/lib/utils";
import { Badge } from "./badge";

type StatusVariant = "default" | "success" | "warning" | "destructive" | "secondary";

interface StatusConfig {
  label: string;
  variant: StatusVariant;
}

const statusConfigs: Record<string, StatusConfig> = {
  // User statuses
  active: { label: "Активний", variant: "success" },
  archived: { label: "Архів", variant: "secondary" },
  pending: { label: "Очікує", variant: "warning" },
  
  // Attendance statuses
  present: { label: "Присутній", variant: "success" },
  absent: { label: "Відсутній", variant: "destructive" },
  late: { label: "Запізнився", variant: "warning" },
  excused: { label: "Поважна", variant: "secondary" },
  
  // Assignment statuses
  draft: { label: "Чернетка", variant: "secondary" },
  published: { label: "Опубліковано", variant: "default" },
  submitted: { label: "Здано", variant: "success" },
  reviewing: { label: "На перевірці", variant: "warning" },
  revision_needed: { label: "Переробити", variant: "destructive" },
  graded: { label: "Оцінено", variant: "success" },
  accepted: { label: "Зараховано", variant: "success" },
  not_started: { label: "Не розпочато", variant: "secondary" },
  in_progress: { label: "В процесі", variant: "warning" },
  
  // Group format
  online: { label: "Онлайн", variant: "default" },
  offline: { label: "Офлайн", variant: "secondary" },
  hybrid: { label: "Гібрид", variant: "warning" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfigs[status] || { label: status, variant: "default" as const };

  const variantClasses: Record<StatusVariant, string> = {
    default: "bg-primary/10 text-primary hover:bg-primary/20",
    success: "bg-success/10 text-success hover:bg-success/20",
    warning: "bg-warning/10 text-warning hover:bg-warning/20",
    destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    secondary: "bg-muted text-muted-foreground hover:bg-muted",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "border-0 font-medium",
        variantClasses[config.variant],
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
