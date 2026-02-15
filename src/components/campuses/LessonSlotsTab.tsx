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
import { toast } from "sonner";

interface StudyProgram {
  id: string;
  name: string;
  is_active: boolean;
}

/** Name-level group */
interface NameGroup {
  name: string;
  type: "global" | "individual";
  programName?: string;
  dayGroups: DayGroup[];
  allSlots: LessonSlot[];
}

/** Day sub-group within a name group */
interface DayGroup {
  day: number;
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
  const [openNames, setOpenNames] = useState<Set<string>>(new Set());
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());

  const handleEdit = (slot: LessonSlot) => {
    setEditingSlot(slot);
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditingSlot(null);
    setShowDialog(true);
  };

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  // Bulk actions
  const handleBulkToggle = async (slotIds: string[], activate: boolean) => {
    let ok = 0;
    for (const id of slotIds) {
      const success = await onToggleActive(id, activate);
      if (success) ok++;
    }
    if (ok > 0) toast.success(`${activate ? "Активовано" : "Деактивовано"} ${ok} слот(ів)`);
  };

  const handleBulkDelete = async (slotIds: string[]) => {
    let ok = 0;
    for (const id of slotIds) {
      const success = await onDelete(id);
      if (success) ok++;
    }
    if (ok > 0) toast.success(`Видалено ${ok} слот(ів)`);
  };

  const nameGroups = useMemo<NameGroup[]>(() => {
    const map = new Map<string, { name: string; type: "global" | "individual"; programName?: string; slots: LessonSlot[] }>();
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

    return Array.from(map.values()).map((g) => {
      const dayMap = new Map<number, LessonSlot[]>();
      for (const s of g.slots) {
        if (!dayMap.has(s.day_of_week)) dayMap.set(s.day_of_week, []);
        dayMap.get(s.day_of_week)!.push(s);
      }
      const dayGroups: DayGroup[] = Array.from(dayMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([day, dSlots]) => ({ day, slots: dSlots }));

      return { ...g, dayGroups, allSlots: g.slots };
    });
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

      {nameGroups.length > 0 ? (
        <div className="space-y-2">
          {nameGroups.map((ng) => {
            const nameKey = `${ng.name}__${ng.type === "global" ? "g" : ng.programName || "i"}`;
            const isNameOpen = openNames.has(nameKey);
            const activeCount = ng.allSlots.filter((s) => s.is_active).length;
            const allIds = ng.allSlots.map((s) => s.id);

            return (
              <Collapsible key={nameKey} open={isNameOpen} onOpenChange={() => toggle(openNames, nameKey, setOpenNames)}>
                {/* Name-level header */}
                <div className="flex items-center gap-1">
                  <CollapsibleTrigger asChild>
                    <button className="flex-1 flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left">
                      <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isNameOpen ? "rotate-90" : ""}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">{ng.name}</span>
                          {ng.type === "global" ? (
                            <Badge variant="secondary" className="text-xs">Глобальний</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">{ng.programName || "Індивідуальний"}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {ng.dayGroups.map((dg) => getDayName(dg.day)).join(", ")} · {ng.allSlots.length} слот(ів) · {activeCount} активних
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  {/* Bulk actions for the name group */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleBulkToggle(allIds, true)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Активувати всі
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkToggle(allIds, false)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Деактивувати всі
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleBulkDelete(allIds)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Видалити всі ({allIds.length})
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CollapsibleContent>
                  <div className="ml-4 mt-1 space-y-1">
                    {ng.dayGroups.map((dg) => {
                      const dayKey = `${nameKey}__d${dg.day}`;
                      const isDayOpen = openDays.has(dayKey);
                      const dayIds = dg.slots.map((s) => s.id);

                      return (
                        <Collapsible key={dayKey} open={isDayOpen} onOpenChange={() => toggle(openDays, dayKey, setOpenDays)}>
                          <div className="flex items-center gap-1">
                            <CollapsibleTrigger asChild>
                              <button className="flex-1 flex items-center gap-2 p-2 rounded-md border border-border/50 bg-background hover:bg-accent/30 transition-colors text-left text-sm">
                                <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isDayOpen ? "rotate-90" : ""}`} />
                                <span className="font-medium text-foreground">{getDayName(dg.day)}</span>
                                <span className="text-muted-foreground">({dg.slots.length} урок(ів))</span>
                              </button>
                            </CollapsibleTrigger>
                            {/* Bulk actions per day */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleBulkToggle(dayIds, true)}>
                                  Активувати день
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBulkToggle(dayIds, false)}>
                                  Деактивувати день
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleBulkDelete(dayIds)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Видалити день ({dayIds.length})
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <CollapsibleContent>
                            <div className="ml-6 mt-1 space-y-1">
                              {dg.slots.map((slot) => (
                                <div
                                  key={slot.id}
                                  className="flex items-center gap-3 p-2 rounded-md border border-border/30 bg-background text-sm"
                                >
                                  <div className="flex items-center gap-1.5 text-foreground shrink-0">
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
                                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(slot.id)}>
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
          action={{ label: "Створити слот", onClick: handleNew }}
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
