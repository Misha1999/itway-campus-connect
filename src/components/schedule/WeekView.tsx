import { useState, useMemo, useRef, useCallback } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { uk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MapPin, Video, Plus, GripVertical } from "lucide-react";
import type { ScheduleEvent } from "@/hooks/use-schedule";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

const eventTypeColors: Record<EventType, string> = {
  lesson: "border-l-primary",
  practice: "border-l-warning",
  test: "border-l-destructive",
  project: "border-l-chart-4",
  other: "border-l-muted-foreground",
};

// Timeline constants
const TIMELINE_START_HOUR = 8;
const TIMELINE_END_HOUR = 21;
const TIMELINE_SLOT_HEIGHT = 28; // px per 30 min
const TIMELINE_SLOTS = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 2; // 30-min slots

interface WeekViewProps {
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onAddEvent: (date: Date) => void;
  selectedEventIds?: Set<string>;
  onToggleSelect?: (eventId: string) => void;
  onMoveEvent?: (eventId: string, newDate: Date, newStartTime?: string, newEndTime?: string) => Promise<void>;
}

export function WeekView({
  events,
  onEventClick,
  onAddEvent,
  selectedEventIds,
  onToggleSelect,
  onMoveEvent,
}: WeekViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dropTimeSlot, setDropTimeSlot] = useState<number | null>(null); // index of 30-min slot
  const timelineRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const weekDates = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const offsetWeekStart = addDays(weekStart, weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(offsetWeekStart, i));
  }, [weekOffset]);

  const today = new Date();

  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    events.forEach((event) => {
      const dateKey = format(new Date(event.start_time), "yyyy-MM-dd");
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    });
    return map;
  }, [events]);

  // Get dragged event duration in minutes
  const draggedEventDuration = useMemo(() => {
    if (!draggedEventId) return 90; // default 1.5h
    const event = events.find((e) => e.id === draggedEventId);
    if (!event) return 90;
    return (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000;
  }, [draggedEventId, events]);

  const slotToTime = useCallback((slotIndex: number) => {
    const totalMinutes = TIMELINE_START_HOUR * 60 + slotIndex * 30;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }, []);

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedEventId(eventId);
  };

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateKey);

    // Calculate time slot from mouse position relative to timeline
    const timelineEl = timelineRefs.current[dateKey];
    if (timelineEl) {
      const rect = timelineEl.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const slotIndex = Math.max(0, Math.min(TIMELINE_SLOTS - 1, Math.floor(y / TIMELINE_SLOT_HEIGHT)));
      setDropTimeSlot(slotIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if truly leaving the column
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setDragOverDate(null);
      setDropTimeSlot(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain");
    const currentSlot = dropTimeSlot;
    setDraggedEventId(null);
    setDragOverDate(null);
    setDropTimeSlot(null);

    if (eventId && onMoveEvent) {
      if (currentSlot !== null) {
        const startTimeStr = slotToTime(currentSlot);
        const totalStartMin = TIMELINE_START_HOUR * 60 + currentSlot * 30;
        const totalEndMin = totalStartMin + draggedEventDuration;
        const endH = Math.floor(totalEndMin / 60) % 24;
        const endM = totalEndMin % 60;
        const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
        await onMoveEvent(eventId, date, startTimeStr, endTimeStr);
      } else {
        await onMoveEvent(eventId, date);
      }
    }
  };

  const isDragging = draggedEventId !== null;

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => setWeekOffset(0)}>
            Сьогодні
          </Button>
        </div>
        <span className="text-lg font-medium">
          {format(weekDates[0], "LLLL yyyy", { locale: uk })}
        </span>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, index) => {
          const isToday = isSameDay(date, today);
          const dateKey = format(date, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dateKey] || [];
          const isDragTarget = dragOverDate === dateKey;

          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-[200px] transition-colors rounded-lg relative",
                isDragTarget && "ring-2 ring-primary/30"
              )}
              onDragOver={(e) => handleDragOver(e, dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
            >
              {/* Day header */}
              <div
                className={cn(
                  "text-center p-2 rounded-lg mb-2 cursor-pointer hover:bg-accent transition-colors",
                  isToday ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted"
                )}
                onClick={() => onAddEvent(date)}
              >
                <p className="text-xs font-medium">{weekDays[index]}</p>
                <p className="text-lg font-semibold">{format(date, "d")}</p>
              </div>

              {/* Timeline overlay during drag */}
              {isDragging && isDragTarget && (
                <div
                  ref={(el) => { timelineRefs.current[dateKey] = el; }}
                  className="absolute left-0 right-0 z-20 bg-background/95 border rounded-lg shadow-lg overflow-hidden"
                  style={{ top: 60 }}
                >
                  {Array.from({ length: TIMELINE_SLOTS }, (_, i) => {
                    const isHourMark = i % 2 === 0;
                    const isTarget = dropTimeSlot === i;
                    const durationSlots = Math.ceil(draggedEventDuration / 30);
                    const isInRange = dropTimeSlot !== null && i >= dropTimeSlot && i < dropTimeSlot + durationSlots;

                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center px-1 border-b border-border/30 transition-colors",
                          isHourMark ? "border-border/60" : "",
                          isInRange ? "bg-primary/20" : "hover:bg-accent/50",
                          isTarget && "bg-primary/30"
                        )}
                        style={{ height: TIMELINE_SLOT_HEIGHT }}
                      >
                        {isHourMark && (
                          <span className="text-[10px] text-muted-foreground font-mono w-full">
                            {slotToTime(i)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {/* Drop time indicator */}
                  {dropTimeSlot !== null && (
                    <div className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none"
                      style={{ top: dropTimeSlot * TIMELINE_SLOT_HEIGHT - 10 }}
                    >
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium shadow">
                        {slotToTime(dropTimeSlot)} – {(() => {
                          const endMin = TIMELINE_START_HOUR * 60 + dropTimeSlot * 30 + draggedEventDuration;
                          const h = Math.floor(endMin / 60) % 24;
                          const m = endMin % 60;
                          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Event cards */}
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const startTime = new Date(event.start_time);
                  const isOnline = !event.room_id && !event.classroom_id;
                  const isSelected = selectedEventIds?.has(event.id) || false;

                  return (
                    <Card
                      key={event.id}
                      draggable={!!onMoveEvent}
                      onDragStart={(e) => handleDragStart(e, event.id)}
                      className={cn(
                        "border-l-4 cursor-pointer hover:shadow-sm transition-shadow",
                        eventTypeColors[event.event_type],
                        event.is_cancelled && "opacity-50",
                        isSelected && "ring-2 ring-primary",
                        draggedEventId === event.id && "opacity-40"
                      )}
                    >
                      <CardContent className="p-2">
                        <div className="flex items-start gap-1">
                          {onToggleSelect && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onToggleSelect(event.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 shrink-0"
                            />
                          )}
                          <div
                            className="flex-1 min-w-0"
                            onClick={() => onEventClick(event)}
                          >
                            <p className={cn(
                              "font-medium text-sm truncate",
                              event.is_cancelled && "line-through"
                            )}>
                              {event.title}
                            </p>
                            {event.group_name && (
                              <p className="text-xs text-muted-foreground truncate">
                                {event.group_name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(startTime, "HH:mm")}
                            </p>
                            {event.teacher_name && (
                              <p className="text-xs text-muted-foreground truncate">
                                {event.teacher_name}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              {isOnline ? (
                                <Video className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground truncate">
                                {isOnline ? "Онлайн" : (event.classroom_name || event.room_name || "—")}
                              </span>
                            </div>
                          </div>
                          {onMoveEvent && (
                            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 cursor-grab mt-0.5" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {/* Always show add button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onAddEvent(date)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Додати
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
