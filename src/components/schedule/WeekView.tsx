import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { uk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MapPin, Video, Plus, GripVertical } from "lucide-react";
import type { ScheduleEvent } from "@/hooks/use-schedule";
import type { Database } from "@/integrations/supabase/types";
import type { TimeGridConfig } from "./TimeGridSettings";

type EventType = Database["public"]["Enums"]["event_type"];

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

const eventTypeColors: Record<EventType, string> = {
  lesson: "border-l-primary bg-primary/10",
  practice: "border-l-warning bg-warning/10",
  test: "border-l-destructive bg-destructive/10",
  project: "border-l-chart-4 bg-chart-4/10",
  other: "border-l-muted-foreground bg-muted/50",
};

const HOUR_HEIGHT = 60; // px per hour

interface WeekViewProps {
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onAddEvent: (date: Date) => void;
  selectedEventIds?: Set<string>;
  onToggleSelect?: (eventId: string) => void;
  onMoveEvent?: (eventId: string, newDate: Date, newStartTime?: string, newEndTime?: string) => Promise<void>;
  timeGridConfig: TimeGridConfig;
}

function minutesToStr(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function WeekView({
  events,
  onEventClick,
  onAddEvent,
  selectedEventIds,
  onToggleSelect,
  onMoveEvent,
  timeGridConfig,
}: WeekViewProps) {
  const { startHour, endHour, snapMinutes, fineSnapMinutes } = timeGridConfig;
  const totalHours = endHour - startHour;
  const gridStartMin = startHour * 60;
  const gridEndMin = endHour * 60;

  const [weekOffset, setWeekOffset] = useState(0);

  // In-day drag state
  const [inDayDragId, setInDayDragId] = useState<string | null>(null);
  const [inDayDragY, setInDayDragY] = useState<number | null>(null);
  const [inDayStartY, setInDayStartY] = useState<number | null>(null);
  const [inDayOriginalMin, setInDayOriginalMin] = useState<number | null>(null);
  const [inDaySnap, setInDaySnap] = useState(snapMinutes);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMoveTimeRef = useRef<number>(0);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    });
    return map;
  }, [events]);

  const hours = useMemo(() => {
    return Array.from({ length: totalHours }, (_, i) => startHour + i);
  }, [startHour, totalHours]);

  // Convert minutes from midnight to Y position
  const minToY = useCallback((min: number) => {
    return ((min - gridStartMin) / 60) * HOUR_HEIGHT;
  }, [gridStartMin]);

  // Convert Y to minutes
  const yToMin = useCallback((y: number) => {
    return gridStartMin + (y / HOUR_HEIGHT) * 60;
  }, [gridStartMin]);

  // Snap value
  const snapTo = useCallback((min: number, snap: number) => {
    return Math.round(min / snap) * snap;
  }, []);

  // Get event position and height
  const getEventStyle = useCallback((event: ScheduleEvent) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = end.getHours() * 60 + end.getMinutes();
    const top = minToY(Math.max(startMin, gridStartMin));
    const bottom = minToY(Math.min(endMin, gridEndMin));
    return { top, height: Math.max(bottom - top, 16) };
  }, [minToY, gridStartMin, gridEndMin]);

  // Cross-day drag (between columns)
  const handleCrossDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCrossDrop = async (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain");
    if (!eventId || !onMoveEvent) return;
    const event = events.find((ev) => ev.id === eventId);
    if (!event) return;
    const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000;
    const startTimeStr = minutesToStr(hour * 60);
    const endTimeStr = minutesToStr(hour * 60 + duration);
    await onMoveEvent(eventId, date, startTimeStr, endTimeStr);
  };

  // In-day drag handlers
  const startInDayDrag = useCallback((e: React.MouseEvent, event: ScheduleEvent, dateKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const col = columnRefs.current[dateKey];
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startMin = new Date(event.start_time).getHours() * 60 + new Date(event.start_time).getMinutes();

    setInDayDragId(event.id);
    setInDayStartY(y);
    setInDayDragY(y);
    setInDayOriginalMin(startMin);
    setInDaySnap(snapMinutes);

    // Start hold timer for fine snap
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      setInDaySnap(fineSnapMinutes);
    }, 2000);
    lastMoveTimeRef.current = Date.now();
  }, [snapMinutes, fineSnapMinutes]);

  useEffect(() => {
    if (!inDayDragId) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Reset hold timer on significant movement
      const now = Date.now();
      lastMoveTimeRef.current = now;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = setTimeout(() => {
        setInDaySnap(fineSnapMinutes);
      }, 2000);

      // Find column
      for (const [, col] of Object.entries(columnRefs.current)) {
        if (!col) continue;
        const rect = col.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          setInDayDragY(e.clientY - rect.top);
          break;
        }
      }
    };

    const handleMouseUp = async () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (inDayDragId && inDayDragY !== null && inDayStartY !== null && inDayOriginalMin !== null && onMoveEvent) {
        const deltaY = inDayDragY - inDayStartY;
        const deltaMin = (deltaY / HOUR_HEIGHT) * 60;
        const rawNewStart = inDayOriginalMin + deltaMin;
        const snappedStart = snapTo(Math.max(gridStartMin, Math.min(gridEndMin - 30, rawNewStart)), inDaySnap);
        
        const event = events.find((ev) => ev.id === inDayDragId);
        if (event) {
          const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000;
          const date = new Date(event.start_time);
          const startTimeStr = minutesToStr(snappedStart);
          const endTimeStr = minutesToStr(snappedStart + duration);
          await onMoveEvent(inDayDragId, date, startTimeStr, endTimeStr);
        }
      }
      setInDayDragId(null);
      setInDayDragY(null);
      setInDayStartY(null);
      setInDayOriginalMin(null);
      setInDaySnap(snapMinutes);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [inDayDragId, inDayDragY, inDayStartY, inDayOriginalMin, inDaySnap, events, onMoveEvent, snapTo, gridStartMin, gridEndMin, snapMinutes, fineSnapMinutes]);

  // Calculate in-day drag preview position
  const getInDayDragTop = useCallback((event: ScheduleEvent) => {
    if (inDayDragId !== event.id || inDayDragY === null || inDayStartY === null || inDayOriginalMin === null) return null;
    const deltaY = inDayDragY - inDayStartY;
    const deltaMin = (deltaY / HOUR_HEIGHT) * 60;
    const rawNewStart = inDayOriginalMin + deltaMin;
    const snappedStart = snapTo(Math.max(gridStartMin, Math.min(gridEndMin - 30, rawNewStart)), inDaySnap);
    return minToY(snappedStart);
  }, [inDayDragId, inDayDragY, inDayStartY, inDayOriginalMin, inDaySnap, snapTo, gridStartMin, gridEndMin, minToY]);

  const gridHeight = totalHours * HOUR_HEIGHT;

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

      {/* Time grid calendar */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Day headers */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b">
          <div className="p-2" /> {/* Time label column */}
          {weekDates.map((date, index) => {
            const isToday = isSameDay(date, today);
            return (
              <div
                key={format(date, "yyyy-MM-dd")}
                className={cn(
                  "text-center p-2 border-l",
                  isToday && "bg-primary/10"
                )}
              >
                <p className="text-xs font-medium text-muted-foreground">{weekDays[index]}</p>
                <p className={cn(
                  "text-lg font-semibold leading-tight",
                  isToday && "text-primary"
                )}>
                  {format(date, "d")}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time grid body */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] overflow-y-auto max-h-[calc(100vh-280px)]">
          {/* Time labels */}
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 flex items-start justify-end pr-2 -translate-y-2"
                style={{ top: (h - startHour) * HOUR_HEIGHT }}
              >
                <span className="text-xs text-muted-foreground font-mono">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date) => {
            const dateKey = format(date, "yyyy-MM-dd");
            const isToday = isSameDay(date, today);
            const dayEvents = eventsByDate[dateKey] || [];

            return (
              <div
                key={dateKey}
                ref={(el) => { columnRefs.current[dateKey] = el; }}
                className={cn(
                  "relative border-l",
                  isToday && "bg-primary/[0.03]"
                )}
                style={{ height: gridHeight }}
                onDragOver={(e) => e.preventDefault()}
              >
                {/* Hour lines and drop zones */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/40 group"
                    style={{ top: (h - startHour) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onDrop={(e) => handleCrossDrop(e, date, h)}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                  >
                    {/* Half-hour line */}
                    <div
                      className="absolute left-0 right-0 border-t border-border/20 border-dashed"
                      style={{ top: HOUR_HEIGHT / 2 }}
                    />
                    {/* Add button on hover */}
                    {onMoveEvent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0.5 top-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={() => {
                          const d = new Date(date);
                          d.setHours(h, 0, 0, 0);
                          onAddEvent(d);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}

                {/* Current time indicator */}
                {isToday && (() => {
                  const now = new Date();
                  const nowMin = now.getHours() * 60 + now.getMinutes();
                  if (nowMin < gridStartMin || nowMin > gridEndMin) return null;
                  return (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: minToY(nowMin) }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
                        <div className="flex-1 border-t border-destructive" />
                      </div>
                    </div>
                  );
                })()}

                {/* Events */}
                {dayEvents.map((event) => {
                  const style = getEventStyle(event);
                  const isOnline = !event.room_id && !event.classroom_id;
                  const isSelected = selectedEventIds?.has(event.id) || false;
                  const isDragging = inDayDragId === event.id;
                  const dragTop = getInDayDragTop(event);
                  const startTime = new Date(event.start_time);
                  const endTime = new Date(event.end_time);

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute left-1 right-1 rounded border-l-[3px] cursor-pointer transition-shadow overflow-hidden z-10",
                        eventTypeColors[event.event_type],
                        event.is_cancelled && "opacity-50",
                        isSelected && "ring-2 ring-primary",
                        isDragging && "shadow-lg z-30 opacity-80"
                      )}
                      style={{
                        top: isDragging && dragTop !== null ? dragTop : style.top,
                        height: style.height,
                      }}
                      draggable={!!onMoveEvent}
                      onDragStart={(e) => handleCrossDragStart(e, event.id)}
                      onClick={() => !isDragging && onEventClick(event)}
                    >
                      <div className="p-1 h-full flex flex-col">
                        <div className="flex items-start gap-0.5">
                          {onToggleSelect && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onToggleSelect(event.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 shrink-0 h-3 w-3"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-medium text-[11px] leading-tight truncate",
                              event.is_cancelled && "line-through"
                            )}>
                              {event.title}
                            </p>
                          </div>
                          {onMoveEvent && (
                            <div
                              className="shrink-0 cursor-grab active:cursor-grabbing p-0.5"
                              onMouseDown={(e) => startInDayDrag(e, event, dateKey)}
                            >
                              <GripVertical className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        {style.height > 30 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(startTime, "HH:mm")} – {format(endTime, "HH:mm")}
                          </p>
                        )}
                        {style.height > 45 && event.group_name && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {event.group_name}
                          </p>
                        )}
                        {style.height > 55 && event.teacher_name && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {event.teacher_name}
                          </p>
                        )}
                        {style.height > 65 && (
                          <div className="flex items-center gap-0.5 mt-auto">
                            {isOnline ? (
                              <Video className="h-2.5 w-2.5 text-muted-foreground" />
                            ) : (
                              <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                            )}
                            <span className="text-[9px] text-muted-foreground truncate">
                              {isOnline ? "Онлайн" : (event.classroom_name || event.room_name || "—")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* In-day drag snap indicator */}
                {inDayDragId && (() => {
                  const event = events.find((e) => e.id === inDayDragId);
                  if (!event) return null;
                  const dragTop2 = getInDayDragTop(event);
                  if (dragTop2 === null) return null;
                  const deltaY = (inDayDragY ?? 0) - (inDayStartY ?? 0);
                  const deltaMin = (deltaY / HOUR_HEIGHT) * 60;
                  const rawNewStart = (inDayOriginalMin ?? 0) + deltaMin;
                  const snappedStart = snapTo(Math.max(gridStartMin, Math.min(gridEndMin - 30, rawNewStart)), inDaySnap);
                  const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000;
                  const dateKey2 = format(new Date(event.start_time), "yyyy-MM-dd");
                  if (dateKey2 !== dateKey) return null;

                  return (
                    <div
                      className="absolute left-0 right-0 z-40 pointer-events-none"
                      style={{ top: dragTop2 - 14 }}
                    >
                      <div className="text-center">
                        <span className="bg-primary text-primary-foreground text-[10px] font-mono px-1.5 py-0.5 rounded-sm">
                          {minutesToStr(snappedStart)} – {minutesToStr(snappedStart + duration)} ({inDaySnap}хв)
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
