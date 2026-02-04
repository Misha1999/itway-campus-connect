import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStudyData } from "@/hooks/use-study-data";
import type { UserWithRole } from "@/hooks/use-users";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [studyProgramId, setStudyProgramId] = useState("");
  const [enrollmentCohortId, setEnrollmentCohortId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [notes, setNotes] = useState("");

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

  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone || "");
      setPhoneSecondary(""); // Secondary phone - we need to add this field to DB if needed
      setBirthDate(user.birth_date ? new Date(user.birth_date) : undefined);
      setStudyProgramId(user.study_program_id || "");
      setEnrollmentCohortId(user.enrollment_cohort_id || "");
      setGroupId(user.groups?.[0]?.id || "");
      setNotes("");
    }
  }, [user]);

  // Fetch notes from profile
  useEffect(() => {
    const fetchNotes = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("notes")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setNotes(data.notes || "");
      }
    };

    if (open && user) {
      fetchNotes();
    }
  }, [open, user]);

  const handleSubmit = async () => {
    if (!user || !fullName) return;

    setLoading(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
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
          // Remove from old group if exists
          if (currentGroupId) {
            await supabase
              .from("group_memberships")
              .update({ left_at: new Date().toISOString() })
              .eq("user_id", user.user_id)
              .eq("group_id", currentGroupId)
              .is("left_at", null);
          }

          // Add to new group if selected
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
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Помилка оновлення профілю");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редагувати профіль</DialogTitle>
          <DialogDescription>Змініть дані користувача</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">ПІБ *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Прізвище Ім'я По батькові"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+380501234567"
            />
          </div>

          {/* Secondary Phone */}
          <div className="space-y-2">
            <Label htmlFor="phoneSecondary">Додатковий телефон</Label>
            <Input
              id="phoneSecondary"
              type="tel"
              value={phoneSecondary}
              onChange={(e) => setPhoneSecondary(e.target.value)}
              placeholder="+380501234567"
            />
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

          {/* Student-specific fields */}
          {isStudent && (
            <>
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
              <div className="space-y-2">
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
            </>
          )}

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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !fullName}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
