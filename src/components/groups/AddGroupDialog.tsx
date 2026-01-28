import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2 } from "lucide-react";
import type { Campus, Course, CreateGroupData } from "@/hooks/use-groups";
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
  onSave: (data: CreateGroupData) => Promise<unknown>;
}

export function AddGroupDialog({
  open,
  onOpenChange,
  campuses,
  courses,
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
    }
  }, [open, campuses]);

  const handleSubmit = async () => {
    if (!name.trim() || !campusId) {
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
        </DialogHeader>

        <div className="space-y-4 py-4">
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
          <Button onClick={handleSubmit} disabled={loading || !name.trim() || !campusId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Створити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
