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
import type { LessonSlot, LessonSlotFormData } from "@/hooks/use-lesson-slots";
import { getDayName } from "@/hooks/use-lesson-slots";

interface StudyProgram {
  id: string;
  name: string;
  is_active: boolean;
}

interface LessonSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: LessonSlot | null;
  programs: StudyProgram[];
  onSave: (data: LessonSlotFormData) => Promise<boolean>;
  onUpdate: (id: string, data: LessonSlotFormData) => Promise<boolean>;
}

const DURATION_OPTIONS = [45, 60, 80, 90, 120];

export function LessonSlotDialog({
  open,
  onOpenChange,
  slot,
  programs,
  onSave,
  onUpdate,
}: LessonSlotDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LessonSlotFormData>({
    name: "",
    is_global: true,
    study_program_id: null,
    day_of_week: 0,
    start_time: "09:00",
    duration_minutes: 80,
    is_active: true,
  });

  useEffect(() => {
    if (slot) {
      setForm({
        name: slot.name || "",
        is_global: slot.is_global,
        study_program_id: slot.study_program_id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time.slice(0, 5),
        duration_minutes: slot.duration_minutes,
        is_active: slot.is_active,
      });
    } else {
      setForm({
        name: "",
        is_global: true,
        study_program_id: null,
        day_of_week: 0,
        start_time: "09:00",
        duration_minutes: 80,
        is_active: true,
      });
    }
  }, [slot, open]);

  const handleSubmit = async () => {
    setSaving(true);
    const success = slot
      ? await onUpdate(slot.id, form)
      : await onSave(form);
    setSaving(false);
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {slot ? "Редагувати слот" : "Новий слот"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Назва (необов'язково)</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="напр. 1-й урок"
            />
          </div>

          <div className="space-y-2">
            <Label>Тип слоту</Label>
            <Select
              value={form.is_global ? "global" : "individual"}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  is_global: v === "global",
                  study_program_id: v === "global" ? null : form.study_program_id,
                })
              }
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

          {!form.is_global && (
            <div className="space-y-2">
              <Label>Програма навчання *</Label>
              <Select
                value={form.study_program_id || ""}
                onValueChange={(v) => setForm({ ...form, study_program_id: v })}
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

          <div className="space-y-2">
            <Label>День тижня *</Label>
            <Select
              value={String(form.day_of_week)}
              onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 7 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {getDayName(i)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Час початку *</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Тривалість (хв) *</Label>
              <Select
                value={String(form.duration_minutes)}
                onValueChange={(v) => setForm({ ...form, duration_minutes: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} хв
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Активний</Label>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={saving || (!form.is_global && !form.study_program_id)}>
            {saving ? "Збереження..." : slot ? "Зберегти" : "Створити"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
