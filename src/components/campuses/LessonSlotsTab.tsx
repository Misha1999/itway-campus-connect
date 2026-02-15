import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Archive,
  Trash2,
  Clock,
  ChevronRight,
} from "lucide-react";
import {
  type LessonSlot,
  type LessonSlotFormData,
  getDayName,
  formatTime,
  formatEndTime,
} from "@/hooks/use-lesson-slots";
import { LessonSlotDialog } from "./LessonSlotDialog";

interface StudyProgram {
  id: string;
  name: string;
  is_active: boolean;
}

interface SlotGroup {
  name: string;
  type: "global" | "individual";
  programName?: string;
  slots: LessonSlot[];
}

interface LessonSlotsTabProps {
  slots: LessonSlot[];
  loading: boolean;
  programs: StudyProgram[];
  onSave: (data: LessonSlotFormData) => Promise<boolean>;
  onSaveBatch: (items: LessonSlotFormData[]) => Promise<boolean>;
  onUpdate: (id: string, data: any) => Promise<boolean>;
  onToggleActive: (id: string, isActive: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function LessonSlotsTab({
  slots,
  loading,
  programs,
  onSave,
  onSaveBatch,
  onUpdate,
  onToggleActive,
  onDelete,
}: LessonSlotsTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<LessonSlot | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const handleEdit = (slot: LessonSlot) => {
    setEditingSlot(slot);
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditingSlot(null);
    setShowDialog(true);
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const groups = useMemo<SlotGroup[]>(() => {
    const map = new Map<string, SlotGroup>();
    for (const slot of slots) {
      const key = `${slot.name || "—"}__${slot.is_global ? "g" : slot.study_program_id || "i"}`;
      if (!map.has(key)) {
        map.set(key, {
          name: slot.name || "Без назви",
          type: slot.is_global ? "global" : "individual",
          programName: slot.program_name,
          slots: [],
        });
      }
      map.get(key)!.slots.push(slot);
    }
    return Array.from(map.values());
  }, [slots]);

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
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Новий слот
        </Button>
      </div>

      {groups.length > 0 ? (
        <div className="space-y-2">
          {groups.map((group) => {
            const key = `${group.name}__${group.type === "global" ? "g" : group.programName || "i"}`;
            const isOpen = openGroups.has(key);
            const activeCount = group.slots.filter((s) => s.is_active).length;
            const days = [...new Set(group.slots.map((s) => s.day_of_week))].sort();

            return (
              <Collapsible key={key} open={isOpen} onOpenChange={() => toggleGroup(key)}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left">
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{group.name}</span>
                        {group.type === "global" ? (
                          <Badge variant="secondary" className="text-xs">Глобальний</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {group.programName || "Індивідуальний"}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {days.map((d) => getDayName(d)).join(", ")} · {group.slots.length} урок(ів) · {activeCount} активних
                      </div>
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="ml-7 mt-1 space-y-1">
                    {group.slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center gap-3 p-2.5 rounded-md border border-border/50 bg-background text-sm"
                      >
                        <span className="text-muted-foreground w-24 shrink-0">
                          {getDayName(slot.day_of_week)}
                        </span>
                        <div className="flex items-center gap-1.5 text-foreground w-40 shrink-0">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatTime(slot.start_time)} – {formatEndTime(slot.start_time, slot.duration_minutes)}
                          <span className="text-muted-foreground text-xs">({slot.duration_minutes} хв)</span>
                        </div>
                        <div className="flex-1" />
                        <StatusBadge status={slot.is_active ? "active" : "archived"} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(slot)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Редагувати
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onToggleActive(slot.id, !slot.is_active)}>
                              <Archive className="h-4 w-4 mr-2" />
                              {slot.is_active ? "Деактивувати" : "Активувати"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => onDelete(slot.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Видалити
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Clock}
          title="Слотів ще немає"
          description="Створіть часові слоти для уроків цього закладу"
          action={{
            label: "Створити слот",
            onClick: handleNew,
          }}
        />
      )}

      <LessonSlotDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        slot={editingSlot}
        programs={programs}
        onSave={onSave}
        onSaveBatch={onSaveBatch}
        onUpdate={onUpdate}
      />
    </div>
  );
}
