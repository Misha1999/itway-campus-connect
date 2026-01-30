import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { Mail, Phone, Calendar, Building2, Users, GraduationCap, Clock, Copy, Check, Eye, EyeOff, Key } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

interface StudyInfo {
  programName: string | null;
  cohortName: string | null;
}

export function UserProfileDialog({
  open,
  onOpenChange,
  user,
}: UserProfileDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [studyInfo, setStudyInfo] = useState<StudyInfo>({ programName: null, cohortName: null });

  useEffect(() => {
    async function fetchStudyInfo() {
      if (!user?.study_program_id && !user?.enrollment_cohort_id) {
        setStudyInfo({ programName: null, cohortName: null });
        return;
      }

      let programName = null;
      let cohortName = null;

      if (user.study_program_id) {
        const { data: program } = await supabase
          .from("study_programs")
          .select("name")
          .eq("id", user.study_program_id)
          .single();
        programName = program?.name || null;
      }

      if (user.enrollment_cohort_id) {
        const { data: cohort } = await supabase
          .from("enrollment_cohorts")
          .select("name")
          .eq("id", user.enrollment_cohort_id)
          .single();
        cohortName = cohort?.name || null;
      }

      setStudyInfo({ programName, cohortName });
    }

    if (open && user) {
      fetchStudyInfo();
    }
  }, [open, user?.study_program_id, user?.enrollment_cohort_id]);

  if (!user) return null;

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const isStudent = user.roles.includes("student");
  const decodedPassword = user.generated_password_hash 
    ? atob(user.generated_password_hash) 
    : null;

  const copyToClipboard = async (text: string, type: 'login' | 'password') => {
    await navigator.clipboard.writeText(text);
    if (type === 'login') {
      setCopiedLogin(true);
      setTimeout(() => setCopiedLogin(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
    toast.success("Скопійовано в буфер обміну");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Student credentials */}
          {isStudent && user.generated_login && (
            <>
              <div className="space-y-3 p-4 rounded-lg bg-accent/50">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  Облікові дані
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Логін:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-background px-2 py-1 rounded">
                        {user.generated_login}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(user.generated_login!, 'login')}
                      >
                        {copiedLogin ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  {decodedPassword && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Пароль:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-background px-2 py-1 rounded">
                          {showPassword ? decodedPassword : "••••••••••"}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(decodedPassword, 'password')}
                        >
                          {copiedPassword ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Study info for students */}
          {isStudent && (studyInfo.programName || studyInfo.cohortName) && (
            <>
              <div className="space-y-3">
                {studyInfo.programName && (
                  <div className="flex items-center gap-3 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Програма: </span>
                      <span className="font-medium">{studyInfo.programName}</span>
                    </div>
                  </div>
                )}
                {studyInfo.cohortName && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Потік: </span>
                      <span className="font-medium">{studyInfo.cohortName}</span>
                    </div>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Contact info */}
          <div className="space-y-3">
            {user.email && !user.generated_login && (
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
