import { useState, useEffect, useMemo } from "react";
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
import { Loader2, AlertTriangle } from "lucide-react";
import type { Campus, Course, CreateGroupData, StudyProgram, EnrollmentCohort } from "@/hooks/use-groups";
import type { Database } from "@/integrations/supabase/types";

type GroupFormat = Database["public"]["Enums"]["group_format"];

const formatLabels: Record<GroupFormat, string> = {
  online: "Онлайн",
  offline: "Офлайн",
  hybrid: "Гібрид",
};

interface AddGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campuses: Campus[];
  courses: Course[];
  studyPrograms: StudyProgram[];
  enrollmentCohorts: EnrollmentCohort[];
  onSave: (data: CreateGroupData) => Promise<unknown>;
}

export function AddGroupDialog({
  open,
  onOpenChange,
  campuses,
  courses,
  studyPrograms,
  enrollmentCohorts,
  onSave,
}: AddGroupDialogProps) {
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

  // Filter programs and cohorts by selected campus
  const filteredPrograms = useMemo(() => 
    studyPrograms.filter(p => p.campus_id === campusId && p.is_active),
    [studyPrograms, campusId]
  );

  const filteredCohorts = useMemo(() => 
    enrollmentCohorts.filter(c => c.campus_id === campusId && c.is_active),
    [enrollmentCohorts, campusId]
  );

  // Validation
  const isValid = name.trim() && campusId && studyProgramId && enrollmentCohortId;
  const hasNoPrograms = campusId && filteredPrograms.length === 0;
  const hasNoCohorts = campusId && filteredCohorts.length === 0;

  useEffect(() => {
    if (open) {
      setName("");
      setCampusId(campuses[0]?.id || "");
      setCourseId("__none__");
      setFormat("offline");
      setLevel("");
      setAgeRange("");
      setMaxStudents("");
      setStartDate("");
      setEndDate("");
      setStudyProgramId("");
      setEnrollmentCohortId("");
    }
  }, [open, campuses]);

  // Reset program/cohort when campus changes
  useEffect(() => {
    setStudyProgramId("");
    setEnrollmentCohortId("");
  }, [campusId]);

  const handleSubmit = async () => {
    if (!isValid) {
      return;
    }

    setLoading(true);

    try {
      await onSave({
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
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Нова група</DialogTitle>
          <DialogDescription>Заповніть обов'язкові поля для створення групи</DialogDescription>
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
            {hasNoPrograms ? (
              <div className="flex items-center gap-2 text-sm text-destructive p-2 rounded bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <span>Для цього закладу немає програм навчання. Створіть їх у налаштуваннях закладу.</span>
              </div>
            ) : (
              <Select value={studyProgramId} onValueChange={setStudyProgramId} disabled={!campusId}>
                <SelectTrigger className={!studyProgramId && campusId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Оберіть програму" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPrograms.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Enrollment Cohort - REQUIRED */}
          <div className="space-y-2">
            <Label>Потік набору *</Label>
            {hasNoCohorts ? (
              <div className="flex items-center gap-2 text-sm text-destructive p-2 rounded bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <span>Для цього закладу немає потоків. Створіть їх у налаштуваннях закладу.</span>
              </div>
            ) : (
              <Select value={enrollmentCohortId} onValueChange={setEnrollmentCohortId} disabled={!campusId}>
                <SelectTrigger className={!enrollmentCohortId && campusId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Оберіть потік" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Назва групи *</Label>
            <Input
              id="name"
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
            <Label htmlFor="level">Рівень</Label>
            <Input
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="Початковий / Середній / Просунутий"
            />
          </div>

          {/* Age Range */}
          <div className="space-y-2">
            <Label htmlFor="ageRange">Вікова група</Label>
            <Input
              id="ageRange"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              placeholder="10-14 років"
            />
          </div>

          {/* Max Students */}
          <div className="space-y-2">
            <Label htmlFor="maxStudents">Макс. студентів</Label>
            <Input
              id="maxStudents"
              type="number"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              placeholder="12"
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Дата початку</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Дата завершення</Label>
              <Input
                id="endDate"
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
            Створити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
