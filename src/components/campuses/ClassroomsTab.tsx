import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  DoorOpen,
  Users,
} from "lucide-react";
import type { Classroom, ClassroomFormData } from "@/hooks/use-classrooms";

interface ClassroomsTabProps {
  classrooms: Classroom[];
  loading: boolean;
  onCreate: (data: ClassroomFormData) => Promise<boolean>;
  onUpdate: (id: string, data: ClassroomFormData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function ClassroomsTab({
  classrooms,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: ClassroomsTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClassroomFormData>({
    name: "",
    capacity: null,
    notes: null,
    is_active: true,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", capacity: null, notes: null, is_active: true });
    setShowDialog(true);
  };

  const openEdit = (c: Classroom) => {
    setEditing(c);
    setForm({
      name: c.name,
      capacity: c.capacity,
      notes: c.notes,
      is_active: c.is_active,
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const success = editing
      ? await onUpdate(editing.id, form)
      : await onCreate(form);
    setSaving(false);
    if (success) setShowDialog(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40 ml-auto" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Нова аудиторія
        </Button>
      </div>

      {classrooms.length > 0 ? (
        <div className="space-y-2">
          {classrooms.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <DoorOpen className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{c.name}</span>
                {c.notes && (
                  <p className="text-xs text-muted-foreground truncate">
                    {c.notes}
                  </p>
                )}
              </div>
              {c.capacity != null && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                  <Users className="h-3.5 w-3.5" />
                  {c.capacity}
                </div>
              )}
              <StatusBadge status={c.is_active ? "active" : "archived"} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Редагувати
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(c.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Видалити
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={DoorOpen}
          title="Аудиторій ще немає"
          description="Додайте аудиторії для цього закладу"
          action={{ label: "Додати аудиторію", onClick: openNew }}
        />
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Редагувати аудиторію" : "Нова аудиторія"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Назва *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="напр. Аудиторія 101"
              />
            </div>
            <div className="space-y-2">
              <Label>Кількість робочих місць</Label>
              <Input
                type="number"
                min={1}
                value={form.capacity ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    capacity: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="напр. 20"
              />
            </div>
            <div className="space-y-2">
              <Label>Примітка</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm({ ...form, notes: e.target.value || null })
                }
                placeholder="Обладнання, тип тощо"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Активна</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Скасувати
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !form.name.trim()}
            >
              {saving ? "Збереження..." : editing ? "Зберегти" : "Створити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
