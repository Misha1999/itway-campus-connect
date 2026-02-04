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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { 
  CalendarIcon, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Key, 
  Shield, 
  Loader2, 
  Plus, 
  X,
  User,
  Save
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStudyData } from "@/hooks/use-study-data";
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

export function UserProfileDialog({
  open,
  onOpenChange,
  user,
  onRolesUpdated,
}: UserProfileDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Editable fields
  const [fullName, setFullName] = useState("");
  const [phones, setPhones] = useState<string[]>([""]);
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [studyProgramId, setStudyProgramId] = useState("");
  const [enrollmentCohortId, setEnrollmentCohortId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  
  // Study info display
  const [studyInfo, setStudyInfo] = useState<{ programName: string | null; cohortName: string | null }>({ 
    programName: null, 
    cohortName: null 
  });
  
  // Roles management
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [rolesChanged, setRolesChanged] = useState(false);

  // Get campus ID from user's campuses
  const campusId = user?.campuses?.[0]?.id || "";
  const { studyPrograms, enrollmentCohorts } = useStudyData(campusId || undefined);

  const isStudent = user?.roles?.includes("student");

  // Filter study programs and cohorts by campus
  const filteredPrograms = studyPrograms.filter(p => !campusId || p.campus_id === campusId);
  const filteredCohorts = enrollmentCohorts.filter(c => !campusId || c.campus_id === campusId);

  // Fetch groups when study program and enrollment cohort are selected
  useEffect(() => {
    const fetchGroups = async () => {
      if (!studyProgramId || !enrollmentCohortId) {
        setGroups([]);
        return;
      }

      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .eq("study_program_id", studyProgramId)
        .eq("enrollment_cohort_id", enrollmentCohortId)
        .eq("is_active", true)
        .order("name");

      if (!error && data) {
        setGroups(data);
      } else {
        setGroups([]);
      }
    };

    fetchGroups();
  }, [studyProgramId, enrollmentCohortId]);

  // Populate form when user changes or dialog opens
  useEffect(() => {
    async function initializeForm() {
      if (!user) return;
      
      setFullName(user.full_name);
      // Parse phones - store as JSON array in phone field or use single phone
      const userPhones = user.phone ? [user.phone] : [""];
      setPhones(userPhones);
      setBirthDate(user.birth_date ? new Date(user.birth_date) : undefined);
      setStudyProgramId(user.study_program_id || "");
      setEnrollmentCohortId(user.enrollment_cohort_id || "");
      setGroupId(user.groups?.[0]?.id || "");
      setSelectedRoles([...user.roles]);
      setRolesChanged(false);
      setActiveTab("profile");
      setHasChanges(false);

      // Fetch notes
      const { data: profileData } = await supabase
        .from("profiles")
        .select("notes")
        .eq("id", user.id)
        .single();
      
      setNotes(profileData?.notes || "");

      // Fetch study info names
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
      initializeForm();
    }
  }, [open, user]);

  // Track changes
  useEffect(() => {
    if (!user) return;
    
    const phoneChanged = phones.filter(p => p.trim()).join(";") !== (user.phone || "");
    const changed = 
      fullName !== user.full_name ||
      phoneChanged ||
      (birthDate ? format(birthDate, "yyyy-MM-dd") : null) !== user.birth_date ||
      notes !== "" || // simplified check
      studyProgramId !== (user.study_program_id || "") ||
      enrollmentCohortId !== (user.enrollment_cohort_id || "") ||
      groupId !== (user.groups?.[0]?.id || "");
    
    setHasChanges(changed);
  }, [fullName, phones, birthDate, notes, studyProgramId, enrollmentCohortId, groupId, user]);

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
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.user_id);

      if (deleteError) throw deleteError;

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

  const handleSaveProfile = async () => {
    if (!user || !fullName) {
      toast.error("Введіть ПІБ");
      return;
    }

    setSaving(true);
    try {
      // Save phones as semicolon-separated string
      const phoneStr = phones.filter(p => p.trim()).join(";") || null;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phoneStr,
          birth_date: birthDate ? format(birthDate, "yyyy-MM-dd") : null,
          study_program_id: isStudent ? (studyProgramId || null) : null,
          enrollment_cohort_id: isStudent ? (enrollmentCohortId || null) : null,
          notes: notes || null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update group membership if changed for students
      if (isStudent) {
        const currentGroupId = user.groups?.[0]?.id;
        
        if (groupId !== currentGroupId) {
          if (currentGroupId) {
            await supabase
              .from("group_memberships")
              .update({ left_at: new Date().toISOString() })
              .eq("user_id", user.user_id)
              .eq("group_id", currentGroupId)
              .is("left_at", null);
          }

          if (groupId) {
            await supabase
              .from("group_memberships")
              .insert({
                user_id: user.user_id,
                group_id: groupId,
                role: "student",
              });
          }
        }
      }

      toast.success("Профіль оновлено");
      setHasChanges(false);
      onRolesUpdated?.();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Помилка оновлення профілю");
    } finally {
      setSaving(false);
    }
  };

  const addPhone = () => {
    setPhones([...phones, ""]);
  };

  const removePhone = (index: number) => {
    if (phones.length > 1) {
      setPhones(phones.filter((_, i) => i !== index));
    }
  };

  const updatePhone = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
  };

  if (!user) return null;

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Профіль користувача</DialogTitle>
          <DialogDescription>Перегляд та редагування даних</DialogDescription>
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
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-1" />
              Профіль
            </TabsTrigger>
            <TabsTrigger value="credentials">
              <Key className="h-4 w-4 mr-1" />
              Доступ
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Shield className="h-4 w-4 mr-1" />
              Ролі
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab - Editable */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fullName">ПІБ *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Прізвище Ім'я По батькові"
                />
              </div>

              {/* Phones */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Телефони</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addPhone}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Додати
                  </Button>
                </div>
                <div className="space-y-2">
                  {phones.map((phone, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => updatePhone(index, e.target.value)}
                        placeholder="+380501234567"
                      />
                      {phones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePhone(index)}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Birth Date */}
              <div className="space-y-2">
                <Label>Дата народження</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !birthDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {birthDate ? format(birthDate, "dd.MM.yyyy") : "Оберіть дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={birthDate}
                      onSelect={setBirthDate}
                      initialFocus
                      className="pointer-events-auto"
                      captionLayout="dropdown-buttons"
                      fromYear={1950}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Примітки</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Додаткова інформація"
                />
              </div>
            </div>

            {/* Student-specific fields */}
            {isStudent && (
              <>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Study Program */}
                  <div className="space-y-2">
                    <Label>Програма навчання</Label>
                    <Select 
                      value={studyProgramId || "__none__"} 
                      onValueChange={(v) => {
                        setStudyProgramId(v === "__none__" ? "" : v);
                        setGroupId("");
                      }}
                      disabled={!campusId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={campusId ? "Оберіть програму" : "Спочатку призначте заклад"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Без програми</SelectItem>
                        {filteredPrograms.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Enrollment Cohort */}
                  <div className="space-y-2">
                    <Label>Потік набору</Label>
                    <Select 
                      value={enrollmentCohortId || "__none__"} 
                      onValueChange={(v) => {
                        setEnrollmentCohortId(v === "__none__" ? "" : v);
                        setGroupId("");
                      }}
                      disabled={!campusId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={campusId ? "Оберіть потік" : "Спочатку призначте заклад"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Без потоку</SelectItem>
                        {filteredCohorts.map((cohort) => (
                          <SelectItem key={cohort.id} value={cohort.id}>
                            {cohort.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Group */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Група</Label>
                    <Select 
                      value={groupId || "__none__"} 
                      onValueChange={(v) => setGroupId(v === "__none__" ? "" : v)}
                      disabled={!studyProgramId || !enrollmentCohortId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !studyProgramId || !enrollmentCohortId 
                            ? "Спочатку оберіть програму і потік" 
                            : "Оберіть групу"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Без групи</SelectItem>
                        {groups.length === 0 ? (
                          <SelectItem value="__no_groups__" disabled>
                            Немає груп для обраних параметрів
                          </SelectItem>
                        ) : (
                          groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Campuses - Read only */}
            {user.campuses.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Заклади</Label>
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

            {/* Save button */}
            {hasChanges && (
              <Button 
                onClick={handleSaveProfile} 
                disabled={saving || !fullName}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Зберегти зміни
              </Button>
            )}
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
