import { useState } from "react";
import { format, addDays } from "date-fns";
import { uk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Trash2,
  XCircle,
  RotateCcw,
  UserRoundCog,
  Building2,
  CalendarClock,
  Clock,
  Copy,
  Users,
  Tag,
  Link2,
  X,
  MoreHorizontal,
  CheckSquare,
  ChevronUp,
} from "lucide-react";
import type { ScheduleEvent, Group, Classroom, Teacher } from "@/hooks/use-schedule";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

const eventTypeLabels: Record<EventType, string> = {
  lesson: "Урок",
  practice: "Практика",
  test: "Тест",
  project: "Проєкт",
  other: "Інше",
};

interface BulkActionsBarProps {
  selectedIds: Set<string>;
  events: ScheduleEvent[];
  groups: Group[];
  classrooms: Classroom[];
  teachers: Teacher[];
  onClear: () => void;
  onSelectByFilter: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => Promise<boolean>;
  onBulkCancel: (ids: string[], reason: string) => Promise<boolean>;
  onBulkRestore: (ids: string[]) => Promise<boolean>;
  onBulkUpdateTeacher: (ids: string[], teacherId: string | null) => Promise<boolean>;
  onBulkUpdateClassroom: (ids: string[], classroomId: string | null) => Promise<boolean>;
  onBulkUpdateEventType: (ids: string[], eventType: EventType) => Promise<boolean>;
  onBulkUpdateOnlineLink: (ids: string[], link: string) => Promise<boolean>;
  onBulkShiftDays: (ids: string[], days: number) => Promise<boolean>;
  onBulkShiftTime: (ids: string[], minutes: number) => Promise<boolean>;
  onBulkDuplicate: (ids: string[], shiftDays: number) => Promise<boolean>;
  onBulkCopyToGroup: (ids: string[], groupId: string) => Promise<boolean>;
}

type ActionType =
  | "delete"
  | "cancel"
  | "restore"
  | "teacher"
  | "classroom"
  | "eventType"
  | "onlineLink"
  | "shiftDays"
  | "shiftTime"
  | "duplicate"
  | "copyToGroup"
  | null;

export function BulkActionsBar({
  selectedIds,
  events,
  groups,
  classrooms,
  teachers,
  onClear,
  onSelectByFilter,
  onBulkDelete,
  onBulkCancel,
  onBulkRestore,
  onBulkUpdateTeacher,
  onBulkUpdateClassroom,
  onBulkUpdateEventType,
  onBulkUpdateOnlineLink,
  onBulkShiftDays,
  onBulkShiftTime,
  onBulkDuplicate,
  onBulkCopyToGroup,
}: BulkActionsBarProps) {
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [processing, setProcessing] = useState(false);

  // Form states
  const [cancelReason, setCancelReason] = useState("Масове скасування");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [selectedEventType, setSelectedEventType] = useState<EventType>("lesson");
  const [onlineLink, setOnlineLink] = useState("");
  const [shiftDays, setShiftDays] = useState(7);
  const [shiftMinutes, setShiftMinutes] = useState(60);
  const [duplicateShiftDays, setDuplicateShiftDays] = useState(7);
  const [targetGroupId, setTargetGroupId] = useState("");

  const count = selectedIds.size;
  const ids = Array.from(selectedIds);

  if (count === 0) return null;

  const selectedEvents = events.filter((e) => selectedIds.has(e.id));
  const cancelledCount = selectedEvents.filter((e) => e.is_cancelled).length;

  // Smart selection helpers
  const uniqueGroups = [...new Map(events.map((e) => [e.group_id, e.group_name || e.group_id])).entries()];
  const uniqueTeachers = [...new Map(events.filter((e) => e.teacher_id).map((e) => [e.teacher_id!, e.teacher_name || e.teacher_id!])).entries()];
  const uniqueClassrooms = [...new Map(events.filter((e) => e.classroom_id).map((e) => [e.classroom_id!, e.classroom_name || e.classroom_id!])).entries()];
  const uniqueEventTypes = [...new Set(events.map((e) => e.event_type))];

  const selectByGroup = (groupId: string) => {
    onSelectByFilter(events.filter((e) => e.group_id === groupId).map((e) => e.id));
  };
  const selectByTeacher = (teacherId: string) => {
    onSelectByFilter(events.filter((e) => e.teacher_id === teacherId).map((e) => e.id));
  };
  const selectByClassroom = (classroomId: string) => {
    onSelectByFilter(events.filter((e) => e.classroom_id === classroomId).map((e) => e.id));
  };
  const selectByType = (type: EventType) => {
    onSelectByFilter(events.filter((e) => e.event_type === type).map((e) => e.id));
  };
  const selectCancelled = () => {
    onSelectByFilter(events.filter((e) => e.is_cancelled).map((e) => e.id));
  };
  const selectToday = () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    onSelectByFilter(events.filter((e) => e.start_time.startsWith(todayStr)).map((e) => e.id));
  };
  const selectAll = () => {
    onSelectByFilter(events.map((e) => e.id));
  };

  const handleAction = async () => {
    setProcessing(true);
    let ok = false;
    switch (activeAction) {
      case "delete":
        ok = await onBulkDelete(ids);
        break;
      case "cancel":
        ok = await onBulkCancel(ids, cancelReason);
        break;
      case "restore":
        ok = await onBulkRestore(ids);
        break;
      case "teacher":
        ok = await onBulkUpdateTeacher(ids, selectedTeacherId || null);
        break;
      case "classroom":
        ok = await onBulkUpdateClassroom(ids, selectedClassroomId || null);
        break;
      case "eventType":
        ok = await onBulkUpdateEventType(ids, selectedEventType);
        break;
      case "onlineLink":
        ok = await onBulkUpdateOnlineLink(ids, onlineLink);
        break;
      case "shiftDays":
        ok = await onBulkShiftDays(ids, shiftDays);
        break;
      case "shiftTime":
        ok = await onBulkShiftTime(ids, shiftMinutes);
        break;
      case "duplicate":
        ok = await onBulkDuplicate(ids, duplicateShiftDays);
        break;
      case "copyToGroup":
        ok = await onBulkCopyToGroup(ids, targetGroupId);
        break;
    }
    setProcessing(false);
    if (ok) {
      setActiveAction(null);
      onClear();
    }
  };

  const openAction = (action: ActionType) => {
    setActiveAction(action);
  };

  const closeAction = () => {
    setActiveAction(null);
    setProcessing(false);
  };

  // Confirmation-only actions (delete, cancel, restore)
  const isConfirmAction = activeAction === "delete" || activeAction === "cancel" || activeAction === "restore";

  return (
    <>
      {/* Floating bottom bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-2.5 shadow-xl">
          <Badge variant="secondary" className="font-mono text-xs px-2.5">
            {count}
          </Badge>
          <span className="text-sm font-medium text-muted-foreground mr-1">
            обрано
          </span>

          <Separator orientation="vertical" className="h-6" />

          {/* Primary actions */}
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => openAction("teacher")}>
            <UserRoundCog className="h-3.5 w-3.5" /> Викладач
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => openAction("classroom")}>
            <Building2 className="h-3.5 w-3.5" /> Аудиторія
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => openAction("shiftDays")}>
            <CalendarClock className="h-3.5 w-3.5" /> Зміщення
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => openAction("shiftTime")}>
            <Clock className="h-3.5 w-3.5" /> Час
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                <MoreHorizontal className="h-3.5 w-3.5" /> Ще
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => openAction("duplicate")}>
                <Copy className="h-4 w-4 mr-2" /> Дублювати на інший тиждень
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openAction("copyToGroup")}>
                <Users className="h-4 w-4 mr-2" /> Копіювати до іншої групи
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openAction("eventType")}>
                <Tag className="h-4 w-4 mr-2" /> Змінити тип подій
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openAction("onlineLink")}>
                <Link2 className="h-4 w-4 mr-2" /> Додати онлайн-посилання
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {cancelledCount > 0 && (
                <DropdownMenuItem onClick={() => openAction("restore")}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Відновити скасовані ({cancelledCount})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => openAction("cancel")}>
                <XCircle className="h-4 w-4 mr-2" /> Скасувати всі
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openAction("delete")}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Видалити всі
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                <CheckSquare className="h-3.5 w-3.5" /> Вибрати
                <ChevronUp className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-64 bg-popover">
              <DropdownMenuItem onClick={selectAll}>
                <CheckSquare className="h-4 w-4 mr-2" /> Всі видимі ({events.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={selectToday}>
                <CalendarClock className="h-4 w-4 mr-2" /> Сьогоднішні
              </DropdownMenuItem>
              <DropdownMenuItem onClick={selectCancelled}>
                <XCircle className="h-4 w-4 mr-2" /> Скасовані
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {uniqueGroups.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Users className="h-4 w-4 mr-2" /> За групою
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-popover max-h-64 overflow-y-auto">
                    {uniqueGroups.map(([id, name]) => (
                      <DropdownMenuItem key={id} onClick={() => selectByGroup(id)}>
                        {name} ({events.filter((e) => e.group_id === id).length})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {uniqueTeachers.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <UserRoundCog className="h-4 w-4 mr-2" /> За викладачем
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-popover max-h-64 overflow-y-auto">
                    {uniqueTeachers.map(([id, name]) => (
                      <DropdownMenuItem key={id} onClick={() => selectByTeacher(id)}>
                        {name} ({events.filter((e) => e.teacher_id === id).length})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {uniqueClassrooms.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Building2 className="h-4 w-4 mr-2" /> За аудиторією
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-popover max-h-64 overflow-y-auto">
                    {uniqueClassrooms.map(([id, name]) => (
                      <DropdownMenuItem key={id} onClick={() => selectByClassroom(id)}>
                        {name} ({events.filter((e) => e.classroom_id === id).length})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {uniqueEventTypes.length > 1 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Tag className="h-4 w-4 mr-2" /> За типом
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-popover">
                    {uniqueEventTypes.map((type) => (
                      <DropdownMenuItem key={type} onClick={() => selectByType(type)}>
                        {eventTypeLabels[type]} ({events.filter((e) => e.event_type === type).length})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Confirmation dialogs (delete / cancel / restore) */}
      <AlertDialog open={isConfirmAction} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activeAction === "delete" && "Видалити обрані події?"}
              {activeAction === "cancel" && "Скасувати обрані події?"}
              {activeAction === "restore" && "Відновити скасовані події?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {activeAction === "delete" && `${count} подій буде безповоротно видалено.`}
                  {activeAction === "cancel" && `${count} подій буде позначено як скасовані.`}
                  {activeAction === "restore" && `${cancelledCount} скасованих подій буде відновлено.`}
                </p>
                {activeAction === "cancel" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Причина скасування</Label>
                    <Input
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Вкажіть причину..."
                    />
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Назад</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={processing}
              className={activeAction === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {processing ? "Обробка..." : activeAction === "delete" ? "Видалити" : activeAction === "cancel" ? "Скасувати події" : "Відновити"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Replace Teacher */}
      <Dialog open={activeAction === "teacher"} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Замінити викладача</DialogTitle>
            <DialogDescription>Обрано {count} подій. Виберіть нового викладача.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Виберіть викладача" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.user_id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={processing}>Скасувати</Button>
            <Button onClick={handleAction} disabled={processing || !selectedTeacherId}>
              {processing ? "Обробка..." : "Замінити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Replace Classroom */}
      <Dialog open={activeAction === "classroom"} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Замінити аудиторію</DialogTitle>
            <DialogDescription>Обрано {count} подій. Виберіть нову аудиторію.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
              <SelectTrigger>
                <SelectValue placeholder="Виберіть аудиторію" />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.is_universal ? " ∞" : ""}{c.capacity ? ` (${c.capacity})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={processing}>Скасувати</Button>
            <Button onClick={handleAction} disabled={processing || !selectedClassroomId}>
              {processing ? "Обробка..." : "Замінити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Shift Days */}
      <Dialog open={activeAction === "shiftDays"} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Змістити розклад</DialogTitle>
            <DialogDescription>Обрано {count} подій. Вкажіть кількість днів для зміщення.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">Кількість днів (від'ємне = назад)</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShiftDays(shiftDays - 1)}>−</Button>
              <Input
                type="number"
                value={shiftDays}
                onChange={(e) => setShiftDays(parseInt(e.target.value) || 0)}
                className="w-24 text-center font-mono"
              />
              <Button variant="outline" size="sm" onClick={() => setShiftDays(shiftDays + 1)}>+</Button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[1, 7, 14, -1, -7].map((d) => (
                <Button key={d} variant="secondary" size="sm" className="text-xs" onClick={() => setShiftDays(d)}>
                  {d > 0 ? `+${d}` : d} дн.
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={processing}>Скасувати</Button>
            <Button onClick={handleAction} disabled={processing || shiftDays === 0}>
              {processing ? "Обробка..." : `Змістити на ${shiftDays} дн.`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Shift Time */}
      <Dialog open={activeAction === "shiftTime"} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Змістити час</DialogTitle>
            <DialogDescription>Обрано {count} подій. Вкажіть зміщення часу в хвилинах.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">Хвилини (від'ємне = раніше)</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShiftMinutes(shiftMinutes - 15)}>−15</Button>
              <Input
                type="number"
                value={shiftMinutes}
                onChange={(e) => setShiftMinutes(parseInt(e.target.value) || 0)}
                className="w-24 text-center font-mono"
              />
              <Button variant="outline" size="sm" onClick={() => setShiftMinutes(shiftMinutes + 15)}>+15</Button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[-60, -30, -15, 15, 30, 60].map((m) => (
                <Button key={m} variant="secondary" size="sm" className="text-xs" onClick={() => setShiftMinutes(m)}>
                  {m > 0 ? `+${m}` : m} хв
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={processing}>Скасувати</Button>
            <Button onClick={handleAction} disabled={processing || shiftMinutes === 0}>
              {processing ? "Обробка..." : `Змістити на ${shiftMinutes} хв`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Duplicate */}
      <Dialog open={activeAction === "duplicate"} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Дублювати на інший тиждень</DialogTitle>
            <DialogDescription>Обрано {count} подій. Вкажіть зміщення для копій.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">Зміщення в днях</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={duplicateShiftDays}
                onChange={(e) => setDuplicateShiftDays(parseInt(e.target.value) || 7)}
                className="w-24 text-center font-mono"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[7, 14, 21, 28].map((d) => (
                <Button key={d} variant="secondary" size="sm" className="text-xs" onClick={() => setDuplicateShiftDays(d)}>
                  +{d} дн. ({d / 7} тижд.)
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={processing}>Скасувати</Button>
            <Button onClick={handleAction} disabled={processing || duplicateShiftDays === 0}>
              {processing ? "Обробка..." : "Дублювати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Copy to Group */}
      <Dialog open={activeAction === "copyToGroup"} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Копіювати до іншої групи</DialogTitle>
            <DialogDescription>Обрано {count} подій. Виберіть цільову групу.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={targetGroupId} onValueChange={setTargetGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Виберіть групу" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={processing}>Скасувати</Button>
            <Button onClick={handleAction} disabled={processing || !targetGroupId}>
              {processing ? "Обробка..." : "Копіювати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Change Event Type */}
      <Dialog open={activeAction === "eventType"} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Змінити тип подій</DialogTitle>
            <DialogDescription>Обрано {count} подій.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={selectedEventType} onValueChange={(v) => setSelectedEventType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(eventTypeLabels) as [EventType, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={processing}>Скасувати</Button>
            <Button onClick={handleAction} disabled={processing}>
              {processing ? "Обробка..." : "Змінити тип"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Online Link */}
      <Dialog open={activeAction === "onlineLink"} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Додати онлайн-посилання</DialogTitle>
            <DialogDescription>Обрано {count} подій. Вставте посилання для всіх.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={onlineLink}
              onChange={(e) => setOnlineLink(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={processing}>Скасувати</Button>
            <Button onClick={handleAction} disabled={processing || !onlineLink.trim()}>
              {processing ? "Обробка..." : "Додати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
