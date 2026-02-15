import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { format, addDays, eachDayOfInterval, getDay, isValid } from "date-fns";
import { uk } from "date-fns/locale";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ScheduleEvent, Group, Classroom, Teacher, ScheduleConflict, Campus } from "@/hooks/use-schedule";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

const eventTypeLabels: Record<EventType, string> = {
  lesson: "Урок",
  practice: "Практика",
  test: "Контрольна",
  project: "Проєкт",
  other: "Інше",
};

const conflictTypeLabels: Record<string, string> = {
  teacher: "Викладач",
  group: "Група",
  classroom: "Аудиторія",
};

const DAY_LABELS = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 0, label: "Нд" },
];

interface StudyProgram {
  id: string;
  name: string;
  campus_id: string;
}

interface LessonSlot {
  id: string;
  campus_id: string;
  study_program_id: string | null;
  name: string | null;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  is_global: boolean;
}

interface CourseLesson {
  id: string;
  name: string;
  module_name: string;
  course_name: string;
  course_id: string;
  order_index: number;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ScheduleEvent | null;
  groups: Group[];
  classrooms: Classroom[];
  teachers: Teacher[];
  campuses: Campus[];
  onSave: (data: Omit<ScheduleEvent, "id" | "group_name" | "teacher_name" | "room_name" | "classroom_name">) => Promise<unknown>;
  onSaveBatch?: (items: Omit<ScheduleEvent, "id" | "group_name" | "teacher_name" | "room_name" | "classroom_name">[]) => Promise<unknown>;
  onUpdate?: (id: string, data: Partial<ScheduleEvent>) => Promise<boolean>;
  onCheckConflicts?: (
    eventId: string | null,
    startTime: string,
    endTime: string,
    teacherId: string | null,
    groupId: string | null,
    classroomId: string | null
  ) => Promise<ScheduleConflict[]>;
  initialDate?: Date;
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  groups,
  classrooms,
  teachers,
  campuses,
  onSave,
  onSaveBatch,
  onUpdate,
  onCheckConflicts,
  initialDate,
}: EventFormDialogProps) {
  const [loading, setLoading] = useState(false);

  // Core fields
  const [campusId, setCampusId] = useState("");
  const [studyProgramId, setStudyProgramId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [eventType, setEventType] = useState<EventType>("lesson");
  const [teacherId, setTeacherId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [onlineLink, setOnlineLink] = useState("");
  const [description, setDescription] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [useCustomTitle, setUseCustomTitle] = useState(false);

  // Lesson from course
  const [lessonId, setLessonId] = useState("");

  // Date selection
  const [isDateRange, setIsDateRange] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [excludeDates, setExcludeDates] = useState<Date[]>([]);
  const [excludeDateInput, setExcludeDateInput] = useState<Date | undefined>(undefined);

  // Time selection
  const [useUniversalTime, setUseUniversalTime] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:30");

  // Data from DB
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [lessonSlots, setLessonSlots] = useState<LessonSlot[]>([]);
  const [courseLessons, setCourseLessons] = useState<CourseLesson[]>([]);

  // Conflicts
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isEditing = !!event;

  // Fetch study programs
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("study_programs")
        .select("id, name, campus_id")
        .eq("is_active", true)
        .order("name");
      setStudyPrograms((data as StudyProgram[]) || []);
    })();
  }, [open]);

  // Fetch lesson slots when campus changes
  useEffect(() => {
    if (!campusId || !open) { setLessonSlots([]); return; }
    (async () => {
      const { data } = await supabase
        .from("lesson_slots")
        .select("id, campus_id, study_program_id, name, day_of_week, start_time, duration_minutes, is_global")
        .eq("campus_id", campusId)
        .eq("is_active", true)
        .order("start_time");
      setLessonSlots((data as LessonSlot[]) || []);
    })();
  }, [campusId, open]);

  // Fetch course lessons when group changes (group → course → modules → lessons)
  useEffect(() => {
    if (!groupId || !open) { setCourseLessons([]); return; }
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    // Get course_id from group - need to query
    (async () => {
      const { data: groupData } = await supabase
        .from("groups")
        .select("course_id")
        .eq("id", groupId)
        .single();
      if (!groupData?.course_id) { setCourseLessons([]); return; }
      const { data } = await supabase
        .from("lessons")
        .select("id, name, order_index, modules:module_id(name, course_id, courses:course_id(name))")
        .eq("modules.course_id", groupData.course_id)
        .order("order_index");
      // Flatten
      const lessons: CourseLesson[] = (data || [])
        .filter((l: any) => l.modules)
        .map((l: any) => ({
          id: l.id,
          name: l.name,
          module_name: l.modules?.name || "",
          course_name: l.modules?.courses?.name || "",
          course_id: l.modules?.course_id || "",
          order_index: l.order_index,
        }));
      setCourseLessons(lessons);
    })();
  }, [groupId, groups, open]);

  // Filtered data
  const filteredPrograms = campusId
    ? studyPrograms.filter(p => p.campus_id === campusId)
    : studyPrograms;

  const filteredGroups = useMemo(() => {
    let filtered = groups;
    if (campusId) filtered = filtered.filter(g => g.campus_id === campusId);
    // further filter by study_program if we can get group.study_program_id
    return filtered;
  }, [groups, campusId]);

  const filteredClassrooms = campusId
    ? classrooms.filter(c => c.campus_id === campusId)
    : classrooms;

  // Slots filtered by day of week of selected date and optionally by study program
  const filteredSlots = useMemo(() => {
    if (!campusId) return [];
    const dayOfWeek = getDay(dateFrom); // JS: 0=Sun, 1=Mon...
    // Convert JS day to our slot day_of_week (0=Mon...6=Sun)
    const slotDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return lessonSlots.filter(s => {
      if (s.day_of_week !== slotDay) return false;
      if (s.is_global) return true;
      if (studyProgramId && s.study_program_id === studyProgramId) return true;
      return false;
    });
  }, [lessonSlots, dateFrom, campusId, studyProgramId]);

  // When slot selected, set time
  useEffect(() => {
    if (!selectedSlotId || useUniversalTime) return;
    const slot = lessonSlots.find(s => s.id === selectedSlotId);
    if (!slot) return;
    const st = slot.start_time.slice(0, 5);
    setStartTime(st);
    // Calculate end
    const [h, m] = st.split(":").map(Number);
    const totalMin = h * 60 + m + slot.duration_minutes;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    setEndTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
  }, [selectedSlotId, useUniversalTime, lessonSlots]);

  // Auto-generated title
  const autoTitle = useMemo(() => {
    const parts: string[] = [];
    if (studyProgramId) {
      const prog = studyPrograms.find(p => p.id === studyProgramId);
      if (prog) parts.push(prog.name);
    }
    const group = groups.find(g => g.id === groupId);
    if (group) parts.push(group.name);
    if (lessonId) {
      const lesson = courseLessons.find(l => l.id === lessonId);
      if (lesson) parts.push(lesson.name);
    }
    if (startTime) parts.push(startTime);
    return parts.join(" – ") || "Нова подія";
  }, [studyProgramId, studyPrograms, groupId, groups, lessonId, courseLessons, startTime]);

  const effectiveTitle = useCustomTitle && customTitle.trim() ? customTitle.trim() : autoTitle;

  // Init from event (editing)
  useEffect(() => {
    if (!open) return;
    if (event) {
      const group = groups.find(g => g.id === event.group_id);
      setCampusId(group?.campus_id || "");
      setGroupId(event.group_id);
      setTeacherId(event.teacher_id || "");
      setClassroomId(event.classroom_id || "");
      setOnlineLink(event.online_link || "");
      setDescription(event.description || "");
      setEventType(event.event_type);
      setLessonId(event.lesson_id || "");
      setCustomTitle(event.title);
      setUseCustomTitle(true);
      const startDate = new Date(event.start_time);
      setDateFrom(startDate);
      setStartTime(format(startDate, "HH:mm"));
      setEndTime(format(new Date(event.end_time), "HH:mm"));
      setIsDateRange(false);
      setUseUniversalTime(true);
    } else {
      setCampusId(campuses[0]?.id || "");
      setStudyProgramId("");
      setGroupId("");
      setTeacherId("");
      setClassroomId("");
      setOnlineLink("");
      setDescription("");
      setEventType("lesson");
      setLessonId("");
      setCustomTitle("");
      setUseCustomTitle(false);
      setDateFrom(initialDate || new Date());
      setDateTo(undefined);
      setIsDateRange(false);
      setRepeatDays([]);
      setExcludeDates([]);
      setUseUniversalTime(false);
      setSelectedSlotId("");
      setStartTime("10:00");
      setEndTime("11:30");
    }
    setConflicts([]);
    setForceOverride(false);
  }, [event, open, groups, campuses, initialDate]);

  // Conflict check (only for single date mode or editing)
  const runConflictCheck = useCallback(() => {
    if (!onCheckConflicts || !groupId || !startTime || !endTime || isDateRange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const dateStr = format(dateFrom, "yyyy-MM-dd");
      const st = new Date(`${dateStr}T${startTime}:00`).toISOString();
      const et = new Date(`${dateStr}T${endTime}:00`).toISOString();
      setCheckingConflicts(true);
      const result = await onCheckConflicts(
        event?.id || null, st, et,
        teacherId || null, groupId || null, classroomId || null
      );
      setConflicts(result);
      setForceOverride(false);
      setCheckingConflicts(false);
    }, 500);
  }, [onCheckConflicts, dateFrom, startTime, endTime, teacherId, groupId, classroomId, event, isDateRange]);

  useEffect(() => {
    if (open && !isDateRange) runConflictCheck();
  }, [dateFrom, startTime, endTime, teacherId, groupId, classroomId, open, isDateRange]);

  // Calculate generated dates for range
  const generatedDates = useMemo(() => {
    if (!isDateRange || !dateTo || repeatDays.length === 0) return [];
    try {
      const allDays = eachDayOfInterval({ start: dateFrom, end: dateTo });
      return allDays.filter(d => {
        const jsDay = getDay(d); // 0=Sun
        if (!repeatDays.includes(jsDay)) return false;
        if (excludeDates.some(ed => format(ed, "yyyy-MM-dd") === format(d, "yyyy-MM-dd"))) return false;
        return true;
      });
    } catch {
      return [];
    }
  }, [isDateRange, dateFrom, dateTo, repeatDays, excludeDates]);

  const handleToggleRepeatDay = (day: number) => {
    setRepeatDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleAddExcludeDate = () => {
    if (excludeDateInput && !excludeDates.some(d => format(d, "yyyy-MM-dd") === format(excludeDateInput, "yyyy-MM-dd"))) {
      setExcludeDates(prev => [...prev, excludeDateInput]);
      setExcludeDateInput(undefined);
    }
  };

  const handleRemoveExcludeDate = (date: Date) => {
    setExcludeDates(prev => prev.filter(d => format(d, "yyyy-MM-dd") !== format(date, "yyyy-MM-dd")));
  };

  const handleSubmit = async () => {
    if (!groupId || !startTime || !endTime) return;
    
    const title = effectiveTitle;

    if (isDateRange && generatedDates.length > 0 && onSaveBatch) {
      if (conflicts.length > 0 && !forceOverride) {
        setForceOverride(true);
        return;
      }
      setLoading(true);
      const items = generatedDates.map(date => {
        const dateStr = format(date, "yyyy-MM-dd");
        return {
          title,
          description: description.trim() || null,
          start_time: new Date(`${dateStr}T${startTime}:00`).toISOString(),
          end_time: new Date(`${dateStr}T${endTime}:00`).toISOString(),
          event_type: eventType,
          is_cancelled: false,
          cancelled_reason: null,
          online_link: onlineLink.trim() || null,
          group_id: groupId,
          teacher_id: teacherId || null,
          room_id: null,
          classroom_id: classroomId || null,
          lesson_id: lessonId || null,
        };
      });
      try {
        await onSaveBatch(items as any);
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Single event
    if (conflicts.length > 0 && !forceOverride) {
      setForceOverride(true);
      return;
    }

    setLoading(true);
    const dateStr = format(dateFrom, "yyyy-MM-dd");
    const eventData: any = {
      title,
      description: description.trim() || null,
      start_time: new Date(`${dateStr}T${startTime}:00`).toISOString(),
      end_time: new Date(`${dateStr}T${endTime}:00`).toISOString(),
      event_type: eventType,
      is_cancelled: event?.is_cancelled || false,
      cancelled_reason: event?.cancelled_reason || null,
      online_link: onlineLink.trim() || null,
      group_id: groupId,
      teacher_id: teacherId || null,
      room_id: null,
      classroom_id: classroomId || null,
      lesson_id: lessonId || null,
    };

    try {
      if (isEditing && onUpdate) {
        await onUpdate(event.id, eventData);
      } else {
        await onSave(eventData);
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const hasConflicts = conflicts.length > 0;
  const canSubmit = groupId && startTime && endTime && (
    isDateRange ? generatedDates.length > 0 : true
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Редагувати подію" : "Нова подія"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-5 py-4">
            {/* Conflict warnings */}
            {hasConflicts && !isDateRange && (
              <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/10 space-y-2">
                <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Виявлено конфлікти ({conflicts.length})
                </div>
                {conflicts.map((c, i) => (
                  <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {conflictTypeLabels[c.type] || c.type}
                    </Badge>
                    <span className="truncate">
                      {c.title} ({format(new Date(c.start_time), "HH:mm")}–{format(new Date(c.end_time), "HH:mm")})
                    </span>
                  </div>
                ))}
                {forceOverride && (
                  <p className="text-xs text-destructive font-medium">
                    Натисніть ще раз щоб зберегти попри конфлікти
                  </p>
                )}
              </div>
            )}

            {!hasConflicts && !checkingConflicts && groupId && !isDateRange && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Конфліктів не знайдено
              </div>
            )}

            {/* Auto title preview */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">Назва події</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="custom-title" className="text-xs text-muted-foreground cursor-pointer">Власна назва</Label>
                  <Switch id="custom-title" checked={useCustomTitle} onCheckedChange={setUseCustomTitle} />
                </div>
              </div>
              {useCustomTitle ? (
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Введіть власну назву"
                  className="mt-1"
                />
              ) : (
                <p className="text-sm font-medium">{autoTitle}</p>
              )}
            </div>

            <Separator />

            {/* === SECTION: Campus & Program === */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Філія *</Label>
                <Select value={campusId} onValueChange={(v) => { setCampusId(v); setStudyProgramId(""); setGroupId(""); setSelectedSlotId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Оберіть філію" /></SelectTrigger>
                  <SelectContent>
                    {campuses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.city})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Програма навчання</Label>
                <Select value={studyProgramId || "__none__"} onValueChange={(v) => setStudyProgramId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Оберіть програму" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Всі програми</SelectItem>
                    {filteredPrograms.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* === SECTION: Group & Teacher === */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Група *</Label>
                <Select value={groupId} onValueChange={(v) => { setGroupId(v); setLessonId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Оберіть групу" /></SelectTrigger>
                  <SelectContent>
                    {filteredGroups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Викладач *</Label>
                <Select value={teacherId || "__none__"} onValueChange={(v) => setTeacherId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Оберіть викладача" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Без викладача</SelectItem>
                    {teachers.map(t => (
                      <SelectItem key={t.id} value={t.user_id}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* === SECTION: Lesson from course === */}
            {courseLessons.length > 0 && (
              <div className="space-y-2">
                <Label>Урок з навчального плану</Label>
                <Select value={lessonId || "__none__"} onValueChange={(v) => setLessonId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Оберіть урок" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Без прив'язки до уроку</SelectItem>
                    {courseLessons.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.course_name} → {l.module_name} → {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Event Type */}
            <div className="space-y-2">
              <Label>Тип події</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* === SECTION: Date === */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Дата</Label>
                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="date-range" className="text-sm text-muted-foreground cursor-pointer">Діапазон дат</Label>
                    <Switch id="date-range" checked={isDateRange} onCheckedChange={setIsDateRange} />
                  </div>
                )}
              </div>

              <div className={cn("grid gap-4", isDateRange ? "grid-cols-2" : "grid-cols-1")}>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{isDateRange ? "Дата з" : "Дата"}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "dd.MM.yyyy") : "Оберіть дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                {isDateRange && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Дата по</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "dd.MM.yyyy") : "Оберіть дату"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={(d) => d && setDateTo(d)}
                          disabled={(d) => d < dateFrom}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Repeat days */}
              {isDateRange && dateTo && (
                <div className="space-y-3">
                  <Label className="text-sm">Повторювати у дні:</Label>
                  <div className="flex gap-2 flex-wrap">
                    {DAY_LABELS.map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={repeatDays.includes(value) ? "default" : "outline"}
                        size="sm"
                        className="w-10 h-10"
                        onClick={() => handleToggleRepeatDay(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>

                  {/* Exclude dates */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Пропустити конкретні дати</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {excludeDateInput ? format(excludeDateInput, "dd.MM") : "Дата"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={excludeDateInput} onSelect={setExcludeDateInput} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddExcludeDate} disabled={!excludeDateInput}>
                        Додати
                      </Button>
                    </div>
                    {excludeDates.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {excludeDates.map((d, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            {format(d, "dd.MM.yyyy")}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveExcludeDate(d)} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Generated dates preview */}
                  {generatedDates.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Буде створено <span className="font-semibold text-foreground">{generatedDates.length}</span> подій
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* === SECTION: Time === */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Час</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="universal-time" className="text-sm text-muted-foreground cursor-pointer">Універсальний час</Label>
                  <Switch id="universal-time" checked={useUniversalTime} onCheckedChange={(v) => { setUseUniversalTime(v); if (v) setSelectedSlotId(""); }} />
                </div>
              </div>

              {!useUniversalTime ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Оберіть слот</Label>
                  {filteredSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Немає доступних слотів для обраного дня</p>
                  ) : (
                    <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                      <SelectTrigger><SelectValue placeholder="Оберіть часовий слот" /></SelectTrigger>
                      <SelectContent>
                        {filteredSlots.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.start_time.slice(0, 5)} ({s.duration_minutes} хв)
                            {s.name ? ` · ${s.name}` : ""}
                            {!s.is_global ? " · індивід." : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedSlotId && (
                    <div className="text-sm text-muted-foreground">
                      Час: <span className="font-medium text-foreground">{startTime} – {endTime}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-xs text-muted-foreground">Початок</Label>
                    <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-xs text-muted-foreground">Кінець</Label>
                    <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* === SECTION: Classroom === */}
            <div className="space-y-2">
              <Label>Аудиторія *</Label>
              <Select value={classroomId || "__none__"} onValueChange={(v) => setClassroomId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Оберіть аудиторію" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Без аудиторії</SelectItem>
                  {filteredClassrooms.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.is_universal ? " (універсальна)" : ""}
                      {c.capacity ? ` · ${c.capacity} місць` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Online Link */}
            <div className="space-y-2">
              <Label htmlFor="onlineLink">Посилання на онлайн-зустріч</Label>
              <Input id="onlineLink" value={onlineLink} onChange={(e) => setOnlineLink(e.target.value)} placeholder="https://meet.google.com/..." />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Опис</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Додатковий опис" rows={2} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            variant={forceOverride ? "destructive" : "default"}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {checkingConflicts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {forceOverride
              ? "Зберегти попри конфлікти"
              : isDateRange && generatedDates.length > 1
                ? `Створити ${generatedDates.length} подій`
                : isEditing ? "Зберегти" : "Створити"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
