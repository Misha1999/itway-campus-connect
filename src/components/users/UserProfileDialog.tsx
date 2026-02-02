import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { Mail, Phone, Calendar, Building2, Users, GraduationCap, Clock, Copy, Check, Eye, EyeOff, Key, Shield, Loader2 } from "lucide-react";
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

const allRoles: AppRole[] = ["admin_network", "admin_campus", "teacher", "student", "parent_viewer"];

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onRolesUpdated?: () => void;
}

interface StudyInfo {
  programName: string | null;
  cohortName: string | null;
}

export function UserProfileDialog({
  open,
  onOpenChange,
  user,
  onRolesUpdated,
}: UserProfileDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [studyInfo, setStudyInfo] = useState<StudyInfo>({ programName: null, cohortName: null });
  const [activeTab, setActiveTab] = useState("profile");
  
  // Roles management
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [rolesChanged, setRolesChanged] = useState(false);

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
      setSelectedRoles([...user.roles]);
      setRolesChanged(false);
      setActiveTab("profile");
    }
  }, [open, user]);

  useEffect(() => {
    if (user) {
      const hasChanged = 
        selectedRoles.length !== user.roles.length ||
        selectedRoles.some(r => !user.roles.includes(r)) ||
        user.roles.some(r => !selectedRoles.includes(r));
      setRolesChanged(hasChanged);
    }
  }, [selectedRoles, user]);

  const handleRoleToggle = (role: AppRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSaveRoles = async () => {
    if (!user || selectedRoles.length === 0) {
      toast.error("Користувач повинен мати хоча б одну роль");
      return;
    }

    setSavingRoles(true);
    try {
      // Delete existing roles
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.user_id);

      if (deleteError) throw deleteError;

      // Insert new roles
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert(
          selectedRoles.map(role => ({
            user_id: user.user_id,
            role,
          }))
        );

      if (insertError) throw insertError;

      toast.success("Ролі оновлено");
      onRolesUpdated?.();
      setRolesChanged(false);
    } catch (error) {
      console.error("Error updating roles:", error);
      toast.error("Помилка оновлення ролей");
    } finally {
      setSavingRoles(false);
    }
  };

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Профіль користувача</DialogTitle>
          <DialogDescription>Детальна інформація та налаштування</DialogDescription>
        </DialogHeader>

        {/* Header with avatar */}
        <div className="flex items-center gap-4 py-2">
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Профіль</TabsTrigger>
            <TabsTrigger value="credentials">
              <Key className="h-4 w-4 mr-1" />
              Доступ
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Shield className="h-4 w-4 mr-1" />
              Ролі
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            {/* Study info for students */}
            {isStudent && (studyInfo.programName || studyInfo.cohortName) && (
              <>
                <div className="space-y-3 p-3 rounded-lg bg-accent/50">
                  <div className="text-sm font-medium">Навчання</div>
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
              </>
            )}

            {/* Contact info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email || user.generated_login || "—"}</span>
              </div>
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
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Login */}
              <div className="space-y-2">
                <Label>Логін (Email)</Label>
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <code className="text-sm">
                    {user.generated_login || user.email || "—"}
                  </code>
                  {(user.generated_login || user.email) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(user.generated_login || user.email, 'login')}
                    >
                      {copiedLogin ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Password (only for students with generated password) */}
              {decodedPassword && (
                <div className="space-y-2">
                  <Label>Тимчасовий пароль</Label>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <code className="text-sm">
                      {showPassword ? decodedPassword : "••••••••••"}
                    </code>
                    <div className="flex gap-1">
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
                  <p className="text-xs text-muted-foreground">
                    Цей пароль згенеровано при створенні акаунту. Рекомендуємо змінити його.
                  </p>
                </div>
              )}

              <Separator />

              <p className="text-sm text-muted-foreground">
                Для зміни email або пароля використовуйте кнопку "Змінити облікові дані" в меню користувача.
              </p>
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4 mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Користувач може мати кілька ролей одночасно. Оберіть необхідні ролі.
              </p>

              <div className="space-y-3">
                {allRoles.map((role) => (
                  <div key={role} className="flex items-center space-x-3">
                    <Checkbox
                      id={`role-${role}`}
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={() => handleRoleToggle(role)}
                    />
                    <Label 
                      htmlFor={`role-${role}`} 
                      className="flex-1 cursor-pointer"
                    >
                      <span className="font-medium">{roleLabels[role]}</span>
                    </Label>
                  </div>
                ))}
              </div>

              {selectedRoles.length === 0 && (
                <p className="text-sm text-destructive">
                  Користувач повинен мати хоча б одну роль
                </p>
              )}

              {rolesChanged && (
                <Button 
                  onClick={handleSaveRoles} 
                  disabled={savingRoles || selectedRoles.length === 0}
                  className="w-full"
                >
                  {savingRoles && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Зберегти ролі
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
