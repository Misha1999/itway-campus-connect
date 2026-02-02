import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Loader2, AlertTriangle } from "lucide-react";
import type { GroupData, Campus, Course, CreateGroupData, StudyProgram, EnrollmentCohort } from "@/hooks/use-groups";
import type { Database } from "@/integrations/supabase/types";

type GroupFormat = Database["public"]["Enums"]["group_format"];

const formatLabels: Record<GroupFormat, string> = {
  online: "Онлайн",
  offline: "Офлайн",
  hybrid: "Гібрид",
};

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupData | null;
  campuses: Campus[];
  courses: Course[];
  studyPrograms: StudyProgram[];
  enrollmentCohorts: EnrollmentCohort[];
  onSave: (id: string, data: Partial<CreateGroupData>) => Promise<boolean>;
}

export function EditGroupDialog({
  open,
  onOpenChange,
  group,
  campuses,
  courses,
  studyPrograms,
  enrollmentCohorts,
  onSave,
}: EditGroupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [campusId, setCampusId] = useState("");
  const [courseId, setCourseId] = useState<string>("__none__");
  const [format, setFormat] = useState<GroupFormat>("offline");
  const [level, setLevel] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [maxStudents, setMaxStudents] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [studyProgramId, setStudyProgramId] = useState("");
  const [enrollmentCohortId, setEnrollmentCohortId] = useState("");
  
  // Track if critical fields changed (for confirmation dialog)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<CreateGroupData> | null>(null);

  // Filter programs and cohorts by selected campus
  const filteredPrograms = useMemo(() => 
    studyPrograms.filter(p => p.campus_id === campusId),
    [studyPrograms, campusId]
  );

  const filteredCohorts = useMemo(() => 
    enrollmentCohorts.filter(c => c.campus_id === campusId),
    [enrollmentCohorts, campusId]
  );

  // Check if program/cohort is archived
  const programIsArchived = useMemo(() => {
    if (!studyProgramId) return false;
    const program = studyPrograms.find(p => p.id === studyProgramId);
    return program ? !program.is_active : false;
  }, [studyProgramId, studyPrograms]);

  const cohortIsArchived = useMemo(() => {
    if (!enrollmentCohortId) return false;
    const cohort = enrollmentCohorts.find(c => c.id === enrollmentCohortId);
    return cohort ? !cohort.is_active : false;
  }, [enrollmentCohortId, enrollmentCohorts]);

  // Validation
  const isValid = name.trim() && campusId && studyProgramId && enrollmentCohortId && !programIsArchived && !cohortIsArchived;

  useEffect(() => {
    if (open && group) {
      setName(group.name);
      setCampusId(group.campus_id);
      setCourseId(group.course_id || "__none__");
      setFormat(group.format);
      setLevel(group.level || "");
      setAgeRange(group.age_range || "");
      setMaxStudents(group.max_students?.toString() || "");
      setStartDate(group.start_date || "");
      setEndDate(group.end_date || "");
      setStudyProgramId(group.study_program_id || "");
      setEnrollmentCohortId(group.enrollment_cohort_id || "");
    }
  }, [open, group]);

  const handleSubmit = async () => {
    if (!group || !isValid) return;

    const changes: Partial<CreateGroupData> = {
      name: name.trim(),
      campus_id: campusId,
      course_id: courseId === "__none__" ? null : courseId,
      format,
      level: level.trim() || null,
      age_range: ageRange.trim() || null,
      max_students: maxStudents ? parseInt(maxStudents, 10) : null,
      start_date: startDate || null,
      end_date: endDate || null,
      study_program_id: studyProgramId,
      enrollment_cohort_id: enrollmentCohortId,
    };

    // Check if critical fields changed for active groups
    const criticalFieldsChanged = group.is_active && (
      group.study_program_id !== studyProgramId || 
      group.enrollment_cohort_id !== enrollmentCohortId
    );

    if (criticalFieldsChanged) {
      setPendingChanges(changes);
      setShowConfirmDialog(true);
      return;
    }

    await saveChanges(changes);
  };

  const saveChanges = async (changes: Partial<CreateGroupData>) => {
    if (!group) return;

    setLoading(true);
    try {
      const success = await onSave(group.id, changes);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    if (pendingChanges) {
      await saveChanges(pendingChanges);
    }
    setShowConfirmDialog(false);
    setPendingChanges(null);
  };

  if (!group) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редагування групи</DialogTitle>
            <DialogDescription>Змініть параметри групи "{group.name}"</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Campus */}
            <div className="space-y-2">
              <Label>Кампус *</Label>
              <Select value={campusId} onValueChange={setCampusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть кампус" />
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name} ({campus.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Study Program - REQUIRED */}
            <div className="space-y-2">
              <Label>Програма навчання *</Label>
              {programIsArchived && (
                <div className="flex items-center gap-2 text-sm text-destructive p-2 rounded bg-destructive/10 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Поточна програма архівована. Оберіть нову програму.</span>
                </div>
              )}
              <Select value={studyProgramId} onValueChange={setStudyProgramId} disabled={!campusId}>
                <SelectTrigger className={programIsArchived || (!studyProgramId && campusId) ? "border-destructive" : ""}>
                  <SelectValue placeholder="Оберіть програму" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPrograms.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name} {!program.is_active && "(архів)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Enrollment Cohort - REQUIRED */}
            <div className="space-y-2">
              <Label>Потік набору *</Label>
              {cohortIsArchived && (
                <div className="flex items-center gap-2 text-sm text-destructive p-2 rounded bg-destructive/10 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Поточний потік архівований. Оберіть новий потік.</span>
                </div>
              )}
              <Select value={enrollmentCohortId} onValueChange={setEnrollmentCohortId} disabled={!campusId}>
                <SelectTrigger className={cohortIsArchived || (!enrollmentCohortId && campusId) ? "border-destructive" : ""}>
                  <SelectValue placeholder="Оберіть потік" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.name} {!cohort.is_active && "(архів)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Назва групи *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="PY-2024-A"
              />
            </div>

            {/* Course */}
            <div className="space-y-2">
              <Label>Курс</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть курс" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Без курсу</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label>Формат</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as GroupFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(formatLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label htmlFor="edit-level">Рівень</Label>
              <Input
                id="edit-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="Початковий / Середній / Просунутий"
              />
            </div>

            {/* Age Range */}
            <div className="space-y-2">
              <Label htmlFor="edit-ageRange">Вікова група</Label>
              <Input
                id="edit-ageRange"
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                placeholder="10-14 років"
              />
            </div>

            {/* Max Students */}
            <div className="space-y-2">
              <Label htmlFor="edit-maxStudents">Макс. студентів</Label>
              <Input
                id="edit-maxStudents"
                type="number"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
                placeholder="12"
              />
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Дата початку</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">Дата завершення</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !isValid}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for critical changes */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Підтвердження зміни</AlertDialogTitle>
            <AlertDialogDescription>
              Ви змінюєте програму навчання або потік для активної групи. 
              Це може вплинути на звіти та фільтрацію. Продовжити?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingChanges(null)}>
              Скасувати
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Підтвердити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
