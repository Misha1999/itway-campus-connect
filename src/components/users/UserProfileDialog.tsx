import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { Mail, Phone, Calendar, Building2, Users } from "lucide-react";
import type { UserWithRole } from "@/hooks/use-users";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleLabels: Record<AppRole, string> = {
  admin_network: "Адмін мережі",
  admin_campus: "Адмін закладу",
  teacher: "Викладач",
  student: "Студент",
  parent_viewer: "Батьки",
};

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
}

export function UserProfileDialog({
  open,
  onOpenChange,
  user,
}: UserProfileDialogProps) {
  if (!user) return null;

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Профіль користувача</DialogTitle>
          <DialogDescription>Детальна інформація про користувача</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Header with avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {user.full_name}
              </h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {user.roles.map((role) => (
                  <Badge key={role} variant="outline">
                    {roleLabels[role]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact info */}
          <div className="space-y-3">
            {user.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{user.phone}</span>
              </div>
            )}
            {user.birth_date && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(user.birth_date), "d MMMM yyyy", {
                    locale: uk,
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Campuses */}
          {user.campuses.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Заклади
                </div>
                <div className="flex flex-wrap gap-1">
                  {user.campuses.map((campus) => (
                    <Badge key={campus.id} variant="secondary">
                      {campus.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Groups */}
          {user.groups.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Групи
                </div>
                <div className="flex flex-wrap gap-1">
                  {user.groups.map((group) => (
                    <Badge key={group.id} variant="secondary">
                      {group.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Status & dates */}
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Статус</span>
            <StatusBadge status={user.status} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Створено</span>
            <span>
              {format(new Date(user.created_at), "d MMM yyyy", { locale: uk })}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
