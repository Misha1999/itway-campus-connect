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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import type { LessonSlot, LessonSlotFormData } from "@/hooks/use-lesson-slots";
import { getDayName } from "@/hooks/use-lesson-slots";

interface StudyProgram {
  id: string;
  name: string;
  is_active: boolean;
}

interface LessonEntry {
  id: string;
  name: string;
  start_time: string;
  duration_minutes: number;
}

interface LessonSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: LessonSlot | null;
  programs: StudyProgram[];
  onSave: (data: LessonSlotFormData) => Promise<boolean>;
  onUpdate: (id: string, data: LessonSlotFormData) => Promise<boolean>;
}

const DURATION_PRESETS = [45, 60, 80, 90, 120];

function createEntry(): LessonEntry {
  return {
    id: crypto.randomUUID(),
    name: "",
    start_time: "09:00",
    duration_minutes: 80,
  };
}

export function LessonSlotDialog({
  open,
  onOpenChange,
  slot,
  programs,
  onSave,
  onUpdate,
}: LessonSlotDialogProps) {
  const [saving, setSaving] = useState(false);
  const [isGlobal, setIsGlobal] = useState(true);
  const [studyProgramId, setStudyProgramId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [lessons, setLessons] = useState<LessonEntry[]>([createEntry()]);

  // Edit mode: single slot
  const isEdit = !!slot;

  useEffect(() => {
    if (slot) {
      setIsGlobal(slot.is_global);
      setStudyProgramId(slot.study_program_id);
      setIsActive(slot.is_active);
      setSelectedDays([slot.day_of_week]);
      setLessons([
        {
          id: "edit",
          name: slot.name || "",
          start_time: slot.start_time.slice(0, 5),
          duration_minutes: slot.duration_minutes,
        },
      ]);
    } else {
      setIsGlobal(true);
      setStudyProgramId(null);
      setIsActive(true);
      setSelectedDays([]);
      setLessons([createEntry()]);
    }
  }, [slot, open]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const addLesson = () => {
    const last = lessons[lessons.length - 1];
    const [h, m] = last.start_time.split(":").map(Number);
    const totalMin = h * 60 + m + last.duration_minutes + 10;
    const newH = Math.floor(totalMin / 60) % 24;
    const newM = totalMin % 60;
    setLessons([
      ...lessons,
      {
        id: crypto.randomUUID(),
        name: "",
        start_time: `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`,
        duration_minutes: last.duration_minutes,
      },
    ]);
  };

  const removeLesson = (id: string) => {
    if (lessons.length > 1) {
      setLessons(lessons.filter((l) => l.id !== id));
    }
  };

  const updateLesson = (id: string, field: keyof LessonEntry, value: string | number) => {
    setLessons(lessons.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleSubmit = async () => {
    setSaving(true);

    if (isEdit && slot) {
      const lesson = lessons[0];
      const success = await onUpdate(slot.id, {
        name: lesson.name,
        is_global: isGlobal,
        study_program_id: isGlobal ? null : studyProgramId,
        day_of_week: selectedDays[0],
        start_time: lesson.start_time,
        duration_minutes: lesson.duration_minutes,
        is_active: isActive,
      });
      setSaving(false);
      if (success) onOpenChange(false);
      return;
    }

    // Create mode: for each day × each lesson
    let allSuccess = true;
    for (const day of selectedDays) {
      for (const lesson of lessons) {
        const success = await onSave({
          name: lesson.name,
          is_global: isGlobal,
          study_program_id: isGlobal ? null : studyProgramId,
          day_of_week: day,
          start_time: lesson.start_time,
          duration_minutes: lesson.duration_minutes,
          is_active: isActive,
        });
        if (!success) allSuccess = false;
      }
    }

    setSaving(false);
    if (allSuccess) onOpenChange(false);
  };

  const canSubmit =
    selectedDays.length > 0 &&
    lessons.length > 0 &&
    lessons.every((l) => l.start_time && l.duration_minutes > 0) &&
    (isGlobal || !!studyProgramId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редагувати слот" : "Нові слоти"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Slot type */}
          <div className="space-y-2">
            <Label>Тип слоту</Label>
            <Select
              value={isGlobal ? "global" : "individual"}
              onValueChange={(v) => {
                setIsGlobal(v === "global");
                if (v === "global") setStudyProgramId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Глобальний</SelectItem>
                <SelectItem value="individual">Індивідуальний</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isGlobal && (
            <div className="space-y-2">
              <Label>Програма навчання *</Label>
              <Select
                value={studyProgramId || ""}
                onValueChange={(v) => setStudyProgramId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть програму" />
                </SelectTrigger>
                <SelectContent>
                  {programs
                    .filter((p) => p.is_active)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Days selection */}
          <div className="space-y-2">
            <Label>Дні тижня *</Label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 7 }, (_, i) => (
                <label
                  key={i}
                  className="flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <Checkbox
                    checked={selectedDays.includes(i)}
                    onCheckedChange={() => toggleDay(i)}
                    disabled={isEdit && selectedDays.length === 1 && selectedDays[0] !== i}
                  />
                  <span className="text-sm">{getDayName(i)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Lessons list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Уроки</Label>
              {!isEdit && (
                <Button type="button" variant="outline" size="sm" onClick={addLesson}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Додати урок
                </Button>
              )}
            </div>

            {lessons.map((lesson, idx) => (
              <div
                key={lesson.id}
                className="border border-border rounded-lg p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Урок {idx + 1}
                  </span>
                  {lessons.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeLesson(lesson.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Назва (необов'язково)</Label>
                  <Input
                    value={lesson.name}
                    onChange={(e) => updateLesson(lesson.id, "name", e.target.value)}
                    placeholder="напр. 1-й урок"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Час початку *</Label>
                    <Input
                      type="time"
                      value={lesson.start_time}
                      onChange={(e) =>
                        updateLesson(lesson.id, "start_time", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Тривалість (хв) *</Label>
                    <DurationInput
                      value={lesson.duration_minutes}
                      onChange={(v) => updateLesson(lesson.id, "duration_minutes", v)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <Label>Активний</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving
              ? "Збереження..."
              : isEdit
              ? "Зберегти"
              : `Створити (${selectedDays.length * lessons.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Duration input: select from presets or type custom value */
function DurationInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const isPreset = DURATION_PRESETS.includes(value);
  const [customMode, setCustomMode] = useState(!isPreset);

  useEffect(() => {
    setCustomMode(!DURATION_PRESETS.includes(value));
  }, [value]);

  if (customMode) {
    return (
      <div className="flex gap-1.5">
        <Input
          type="number"
          min={10}
          max={300}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs shrink-0"
          onClick={() => {
            setCustomMode(false);
            if (!DURATION_PRESETS.includes(value)) onChange(80);
          }}
        >
          Список
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <Select
        value={String(value)}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger className="flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DURATION_PRESETS.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {d} хв
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs shrink-0"
        onClick={() => setCustomMode(true)}
      >
        Інше
      </Button>
    </div>
  );
}
