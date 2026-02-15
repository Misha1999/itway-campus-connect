import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { uk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MapPin, Video, Plus } from "lucide-react";
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
const HOLD_DELAY = 2000; // ms before fine snap activates

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
  const [dragState, setDragState] = useState<{
    eventId: string;
    dateKey: string;
    startY: number;
    currentY: number;
    originalMin: number;
    currentSnap: number;
    isFineMode: boolean;
  } | null>(null);
  
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMoveTimeRef = useRef<number>(0);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

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

  // Calculate snapped start for drag preview
  const getDragSnappedStart = useCallback(() => {
    if (!dragState) return null;
    const deltaY = dragState.currentY - dragState.startY;
    const deltaMin = (deltaY / HOUR_HEIGHT) * 60;
    const rawNewStart = dragState.originalMin + deltaMin;
    return snapTo(Math.max(gridStartMin, Math.min(gridEndMin - 30, rawNewStart)), dragState.currentSnap);
  }, [dragState, snapTo, gridStartMin, gridEndMin]);

  // Cross-day drag (between columns via HTML5 drag)
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

  // In-day drag: mousedown on entire card
  const startInDayDrag = useCallback((e: React.MouseEvent, event: ScheduleEvent, dateKey: string) => {
    if (!onMoveEvent) return;
    // Store initial position to detect drag vs click
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;

    const col = columnRefs.current[dateKey];
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startMin = new Date(event.start_time).getHours() * 60 + new Date(event.start_time).getMinutes();

    // We'll set drag state on first significant move
    const pendingDrag = {
      eventId: event.id,
      dateKey,
      startY: y,
      currentY: y,
      originalMin: startMin,
      currentSnap: snapMinutes,
      isFineMode: false,
    };

    const handleMouseMove = (me: MouseEvent) => {
      const dx = me.clientX - (dragStartPosRef.current?.x ?? 0);
      const dy = me.clientY - (dragStartPosRef.current?.y ?? 0);
      
      // Require 4px movement to start drag
      if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) < 4) return;
      
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setDragState(pendingDrag);
        
        // Start hold timer for fine snap
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          setDragState(prev => prev ? { ...prev, currentSnap: fineSnapMinutes, isFineMode: true } : null);
        }, HOLD_DELAY);
        lastMoveTimeRef.current = Date.now();
      }

      // Reset hold timer on movement
      const now = Date.now();
      if (now - lastMoveTimeRef.current > 50) {
        lastMoveTimeRef.current = now;
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          setDragState(prev => prev ? { ...prev, currentSnap: fineSnapMinutes, isFineMode: true } : null);
        }, HOLD_DELAY);
        // Reset to coarse snap when moving
        setDragState(prev => prev ? { ...prev, currentSnap: snapMinutes, isFineMode: false } : null);
      }

      // Find which column cursor is in
      for (const [, col2] of Object.entries(columnRefs.current)) {
        if (!col2) continue;
        const r = col2.getBoundingClientRect();
        if (me.clientX >= r.left && me.clientX <= r.right) {
          const newY = me.clientY - r.top;
          setDragState(prev => prev ? { ...prev, currentY: newY } : null);
          break;
        }
      }
    };

    const handleMouseUp = async () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

      if (isDraggingRef.current && onMoveEvent) {
        // Apply the drag
        setDragState(prev => {
          if (!prev) return null;
          const deltaY = prev.currentY - prev.startY;
          const deltaMin = (deltaY / HOUR_HEIGHT) * 60;
          const rawNewStart = prev.originalMin + deltaMin;
          const snappedStart = snapTo(Math.max(gridStartMin, Math.min(gridEndMin - 30, rawNewStart)), prev.currentSnap);
          
          const ev = events.find(e => e.id === prev.eventId);
          if (ev) {
            const duration = (new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 60000;
            const date = new Date(ev.start_time);
            const startTimeStr = minutesToStr(snappedStart);
            const endTimeStr = minutesToStr(snappedStart + duration);
            onMoveEvent(prev.eventId, date, startTimeStr, endTimeStr);
          }
          return null;
        });
      }
      
      isDraggingRef.current = false;
      dragStartPosRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [snapMinutes, fineSnapMinutes, onMoveEvent, events, snapTo, gridStartMin, gridEndMin]);

  // Generate snap line markers for drag overlay
  const dragSnapMarkers = useMemo(() => {
    if (!dragState) return [];
    const snap = dragState.currentSnap;
    const markers: { min: number; label: string; type: "hour" | "half" | "fine" }[] = [];
    
    // Always show hour lines
    for (let m = gridStartMin; m <= gridEndMin; m += 60) {
      markers.push({ min: m, label: minutesToStr(m), type: "hour" });
    }
    // Show half-hour if snap <= 30
    if (snap <= 30) {
      for (let m = gridStartMin + 30; m < gridEndMin; m += 60) {
        markers.push({ min: m, label: minutesToStr(m), type: "half" });
      }
    }
    // Show fine lines
    if (snap < 30) {
      for (let m = gridStartMin; m < gridEndMin; m += snap) {
        if (m % 30 !== 0) {
          markers.push({ min: m, label: "", type: "fine" });
        }
      }
    }
    return markers;
  }, [dragState, gridStartMin, gridEndMin]);

  const gridHeight = totalHours * HOUR_HEIGHT;
  const snappedStart = getDragSnappedStart();

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
          <div className="p-2" />
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
            const isDragColumn = dragState?.dateKey === dateKey;

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

                {/* Drag snap overlay lines */}
                {isDragColumn && dragState && (
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    {dragSnapMarkers.map((marker) => {
                      const y = minToY(marker.min);
                      return (
                        <div
                          key={`${marker.type}-${marker.min}`}
                          className="absolute left-0 right-0"
                          style={{ top: y }}
                        >
                          <div className={cn(
                            "border-t transition-colors duration-150",
                            marker.type === "hour" && "border-primary/30",
                            marker.type === "half" && "border-primary/20 border-dashed",
                            marker.type === "fine" && "border-primary/10 border-dotted",
                          )} />
                          {marker.type === "half" && (
                            <span className="absolute left-1 -top-2.5 text-[9px] text-primary/40 font-mono">
                              {marker.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

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
                  const isDragging = dragState?.eventId === event.id;
                  const startTime = new Date(event.start_time);
                  const endTime = new Date(event.end_time);
                  const duration = (endTime.getTime() - startTime.getTime()) / 60000;

                  // Calculate drag preview position
                  let eventTop = style.top;
                  if (isDragging && snappedStart !== null) {
                    eventTop = minToY(snappedStart);
                  }

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute left-1 right-1 rounded border-l-[3px] transition-shadow overflow-hidden z-10 select-none",
                        eventTypeColors[event.event_type],
                        event.is_cancelled && "opacity-50",
                        isSelected && "ring-2 ring-primary",
                        isDragging && "shadow-lg z-30 opacity-80 ring-2 ring-primary/50",
                        onMoveEvent && "cursor-grab active:cursor-grabbing",
                        !onMoveEvent && "cursor-pointer"
                      )}
                      style={{
                        top: eventTop,
                        height: style.height,
                      }}
                      draggable={!!onMoveEvent}
                      onDragStart={(e) => handleCrossDragStart(e, event.id)}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        // Don't start drag from checkbox
                        if ((e.target as HTMLElement).closest('[role="checkbox"]')) return;
                        if (onMoveEvent) {
                          startInDayDrag(e, event, dateKey);
                        }
                      }}
                      onClick={(e) => {
                        // Only fire click if we didn't drag
                        if (!isDraggingRef.current) {
                          onEventClick(event);
                        }
                      }}
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

                      {/* Drag time indicator */}
                      {isDragging && snappedStart !== null && (
                        <div className="absolute -top-5 left-0 right-0 z-40 pointer-events-none">
                          <div className="text-center">
                            <span className="bg-primary text-primary-foreground text-[10px] font-mono px-1.5 py-0.5 rounded-sm shadow-md">
                              {minutesToStr(snappedStart)} – {minutesToStr(snappedStart + duration)}
                              {dragState.isFineMode && (
                                <span className="ml-1 opacity-70">⚡{dragState.currentSnap}хв</span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
