import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import type { ScheduleEvent, Group, Room, Teacher } from "@/hooks/use-schedule";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

const eventTypeLabels: Record<EventType, string> = {
  lesson: "Урок",
  practice: "Практика",
  test: "Контрольна",
  project: "Проєкт",
  other: "Інше",
};

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ScheduleEvent | null;
  groups: Group[];
  rooms: Room[];
  teachers: Teacher[];
  onSave: (data: Omit<ScheduleEvent, "id" | "group_name" | "teacher_name" | "room_name">) => Promise<unknown>;
  onUpdate?: (id: string, data: Partial<ScheduleEvent>) => Promise<boolean>;
  initialDate?: Date;
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  groups,
  rooms,
  teachers,
  onSave,
  onUpdate,
  initialDate,
}: EventFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("lesson");
  const [groupId, setGroupId] = useState("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [onlineLink, setOnlineLink] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:30");

  const isEditing = !!event;

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setEventType(event.event_type);
      setGroupId(event.group_id);
      setTeacherId(event.teacher_id || "");
      setRoomId(event.room_id || "");
      setOnlineLink(event.online_link || "");
      const startDate = new Date(event.start_time);
      setSelectedDate(startDate);
      setStartTime(format(startDate, "HH:mm"));
      setEndTime(format(new Date(event.end_time), "HH:mm"));
    } else {
      setTitle("");
      setDescription("");
      setEventType("lesson");
      setGroupId(groups[0]?.id || "");
      setTeacherId("");
      setRoomId("");
      setOnlineLink("");
      setSelectedDate(initialDate || new Date());
      setStartTime("10:00");
      setEndTime("11:30");
    }
  }, [event, open, groups, initialDate]);

  const handleSubmit = async () => {
    if (!title.trim() || !groupId) {
      return;
    }

    setLoading(true);

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const startDateTime = new Date(`${dateStr}T${startTime}:00`);
    const endDateTime = new Date(`${dateStr}T${endTime}:00`);

    const eventData = {
      title: title.trim(),
      description: description.trim() || null,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      event_type: eventType,
      is_cancelled: event?.is_cancelled || false,
      cancelled_reason: event?.cancelled_reason || null,
      online_link: onlineLink.trim() || null,
      group_id: groupId,
      teacher_id: teacherId || null,
      room_id: roomId || null,
      lesson_id: event?.lesson_id || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Редагувати подію" : "Нова подія"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Назва *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введіть назву події"
            />
          </div>

          {/* Group */}
          <div className="space-y-2">
            <Label>Група *</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть групу" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label>Тип події</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(eventTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Дата</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd.MM.yyyy") : "Оберіть дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Початок</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Кінець</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Teacher */}
          <div className="space-y-2">
            <Label>Викладач</Label>
            <Select value={teacherId || "__none__"} onValueChange={(v) => setTeacherId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть викладача" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Без викладача</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.user_id}>
                    {teacher.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Room */}
          <div className="space-y-2">
            <Label>Аудиторія</Label>
            <Select value={roomId || "__online__"} onValueChange={(v) => setRoomId(v === "__online__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть аудиторію" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__online__">Онлайн</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name} {room.capacity && `(${room.capacity} місць)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Online Link */}
          <div className="space-y-2">
            <Label htmlFor="onlineLink">Посилання на онлайн-зустріч</Label>
            <Input
              id="onlineLink"
              value={onlineLink}
              onChange={(e) => setOnlineLink(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Опис</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Додатковий опис події"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !title.trim() || !groupId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Зберегти" : "Створити"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
