import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { uk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MapPin, Video, Plus, GripVertical, Clock } from "lucide-react";
import type { ScheduleEvent } from "@/hooks/use-schedule";
import type { Database } from "@/integrations/supabase/types";
import type { TimeGridConfig } from "./TimeGridSettings";

type EventType = Database["public"]["Enums"]["event_type"];

const weekDaysShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

const eventTypeStyles: Record<EventType, { border: string; bg: string; accent: string }> = {
  lesson: { border: "border-l-primary", bg: "bg-primary/8 hover:bg-primary/12", accent: "text-primary" },
  practice: { border: "border-l-warning", bg: "bg-warning/8 hover:bg-warning/12", accent: "text-warning" },
  test: { border: "border-l-destructive", bg: "bg-destructive/8 hover:bg-destructive/12", accent: "text-destructive" },
  project: { border: "border-l-chart-4", bg: "bg-chart-4/8 hover:bg-chart-4/12", accent: "text-chart-4" },
  other: { border: "border-l-muted-foreground", bg: "bg-muted/30 hover:bg-muted/50", accent: "text-muted-foreground" },
};

const HOUR_HEIGHT = 64;
const HOLD_DELAY = 2000;

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
    durationMin: number;
    currentSnap: number;
    isFineMode: boolean;
  } | null>(null);

  // Cross-day drop indicator
  const [crossDayDrop, setCrossDayDrop] = useState<{
    dateKey: string;
    hour: number;
    eventId: string;
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

  const minToY = useCallback((min: number) => {
    return ((min - gridStartMin) / 60) * HOUR_HEIGHT;
  }, [gridStartMin]);

  const snapTo = useCallback((min: number, snap: number) => {
    return Math.round(min / snap) * snap;
  }, []);

  const getEventStyle = useCallback((event: ScheduleEvent) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = end.getHours() * 60 + end.getMinutes();
    const top = minToY(Math.max(startMin, gridStartMin));
    const bottom = minToY(Math.min(endMin, gridEndMin));
    return { top, height: Math.max(bottom - top, 20) };
  }, [minToY, gridStartMin, gridEndMin]);

  // Drag snapped position
  const getDragSnappedStart = useCallback(() => {
    if (!dragState) return null;
    const deltaY = dragState.currentY - dragState.startY;
    const deltaMin = (deltaY / HOUR_HEIGHT) * 60;
    const rawNewStart = dragState.originalMin + deltaMin;
    return snapTo(Math.max(gridStartMin, Math.min(gridEndMin - 30, rawNewStart)), dragState.currentSnap);
  }, [dragState, snapTo, gridStartMin, gridEndMin]);

  // Cross-day drag handlers
  const handleCrossDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
    // Create a minimal drag image
    const ghost = document.createElement("div");
    ghost.className = "bg-primary text-primary-foreground text-xs rounded px-2 py-1 font-medium shadow-lg";
    ghost.textContent = events.find(ev => ev.id === eventId)?.title || "Подія";
    ghost.style.position = "fixed";
    ghost.style.top = "-100px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 40, 16);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  };

  const handleCrossDragOver = (e: React.DragEvent, dateKey: string, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const eventId = e.dataTransfer.types.includes("text/plain") ? "pending" : "";
    setCrossDayDrop({ dateKey, hour, eventId });
  };

  const handleCrossDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !e.currentTarget.contains(related)) {
      setCrossDayDrop(null);
    }
  };

  const handleCrossDrop = async (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    setCrossDayDrop(null);
    const eventId = e.dataTransfer.getData("text/plain");
    if (!eventId || !onMoveEvent) return;
    const event = events.find((ev) => ev.id === eventId);
    if (!event) return;
    const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000;
    const startTimeStr = minutesToStr(hour * 60);
    const endTimeStr = minutesToStr(hour * 60 + duration);
    await onMoveEvent(eventId, date, startTimeStr, endTimeStr);
  };

  // In-day drag
  const startInDayDrag = useCallback((e: React.MouseEvent, event: ScheduleEvent, dateKey: string) => {
    if (!onMoveEvent) return;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;

    const col = columnRefs.current[dateKey];
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startMin = new Date(event.start_time).getHours() * 60 + new Date(event.start_time).getMinutes();
    const endMin = new Date(event.end_time).getHours() * 60 + new Date(event.end_time).getMinutes();

    const pendingDrag = {
      eventId: event.id,
      dateKey,
      startY: y,
      currentY: y,
      originalMin: startMin,
      durationMin: endMin - startMin,
      currentSnap: snapMinutes,
      isFineMode: false,
    };

    const handleMouseMove = (me: MouseEvent) => {
      const dx = me.clientX - (dragStartPosRef.current?.x ?? 0);
      const dy = me.clientY - (dragStartPosRef.current?.y ?? 0);

      if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) < 4) return;

      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setDragState(pendingDrag);
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          setDragState(prev => prev ? { ...prev, currentSnap: fineSnapMinutes, isFineMode: true } : null);
        }, HOLD_DELAY);
        lastMoveTimeRef.current = Date.now();
      }

      const now = Date.now();
      if (now - lastMoveTimeRef.current > 50) {
        lastMoveTimeRef.current = now;
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          setDragState(prev => prev ? { ...prev, currentSnap: fineSnapMinutes, isFineMode: true } : null);
        }, HOLD_DELAY);
        setDragState(prev => prev ? { ...prev, currentSnap: snapMinutes, isFineMode: false } : null);
      }

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
        setDragState(prev => {
          if (!prev) return null;
          const deltaY = prev.currentY - prev.startY;
          const deltaMin = (deltaY / HOUR_HEIGHT) * 60;
          const rawNewStart = prev.originalMin + deltaMin;
          const snappedStart = snapTo(Math.max(gridStartMin, Math.min(gridEndMin - 30, rawNewStart)), prev.currentSnap);

          const ev = events.find(e => e.id === prev.eventId);
          if (ev) {
            const startTimeStr = minutesToStr(snappedStart);
            const endTimeStr = minutesToStr(snappedStart + prev.durationMin);
            onMoveEvent(prev.eventId, new Date(ev.start_time), startTimeStr, endTimeStr);
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

  // Snap markers during in-day drag
  const dragSnapMarkers = useMemo(() => {
    if (!dragState) return [];
    const snap = dragState.currentSnap;
    const markers: { min: number; label: string; type: "hour" | "half" | "fine" }[] = [];
    for (let m = gridStartMin; m <= gridEndMin; m += 60) {
      markers.push({ min: m, label: minutesToStr(m), type: "hour" });
    }
    if (snap <= 30) {
      for (let m = gridStartMin + 30; m < gridEndMin; m += 60) {
        markers.push({ min: m, label: minutesToStr(m), type: "half" });
      }
    }
    if (snap < 30) {
      for (let m = gridStartMin; m < gridEndMin; m += snap) {
        if (m % 30 !== 0) markers.push({ min: m, label: "", type: "fine" });
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
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(weekOffset - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(weekOffset + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setWeekOffset(0)}>
            Сьогодні
          </Button>
        </div>
        <span className="text-sm font-semibold text-foreground/80 tracking-wide uppercase">
          {format(weekDates[0], "LLLL yyyy", { locale: uk })}
        </span>
      </div>

      {/* Time grid */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        {/* Day headers */}
        <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b bg-muted/30">
          <div className="p-2" />
          {weekDates.map((date, index) => {
            const isToday = isSameDay(date, today);
            return (
              <div
                key={format(date, "yyyy-MM-dd")}
                className={cn(
                  "text-center py-2.5 px-1 border-l border-border/50 transition-colors",
                  isToday && "bg-primary/8"
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {weekDaysShort[index]}
                </p>
                <p className={cn(
                  "text-base font-bold leading-tight mt-0.5",
                  isToday ? "text-primary" : "text-foreground/70"
                )}>
                  {format(date, "d")}
                </p>
              </div>
            );
          })}
        </div>

        {/* Grid body */}
        <div className="grid grid-cols-[52px_repeat(7,1fr)] overflow-y-auto max-h-[calc(100vh-300px)]">
          {/* Time labels column */}
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 flex items-start justify-end pr-1.5"
                style={{ top: (h - startHour) * HOUR_HEIGHT - 7 }}
              >
                <span className="text-[10px] text-muted-foreground/70 font-mono font-medium tabular-nums">
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
            const isCrossDropTarget = crossDayDrop?.dateKey === dateKey;

            return (
              <div
                key={dateKey}
                ref={(el) => { columnRefs.current[dateKey] = el; }}
                className={cn(
                  "relative border-l border-border/50",
                  isToday && "bg-primary/[0.02]"
                )}
                style={{ height: gridHeight }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleCrossDragLeave}
              >
                {/* Hour rows */}
                {hours.map((h) => {
                  const isCrossDropHere = isCrossDropTarget && crossDayDrop?.hour === h;
                  return (
                    <div
                      key={h}
                      className={cn(
                        "absolute left-0 right-0 border-t border-border/30 group transition-colors",
                        isCrossDropHere && "bg-primary/10"
                      )}
                      style={{ top: (h - startHour) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      onDrop={(e) => handleCrossDrop(e, date, h)}
                      onDragOver={(e) => handleCrossDragOver(e, dateKey, h)}
                    >
                      {/* Half-hour line */}
                      <div
                        className="absolute left-0 right-0 border-t border-border/15"
                        style={{ top: HOUR_HEIGHT / 2 }}
                      />

                      {/* Cross-day drop insertion marker */}
                      {isCrossDropHere && (
                        <div className="absolute inset-x-1 top-1 bottom-1 rounded-md border-2 border-dashed border-primary/50 bg-primary/5 flex items-center justify-center z-20 pointer-events-none animate-scale-in">
                          <span className="text-[10px] font-semibold text-primary/70 font-mono">
                            {String(h).padStart(2, "0")}:00
                          </span>
                        </div>
                      )}

                      {/* Add button */}
                      {onMoveEvent && !isCrossDropHere && (
                        <button
                          className="absolute inset-x-0.5 top-0.5 bottom-0.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center bg-primary/[0.04] hover:bg-primary/[0.08] z-[5]"
                          onClick={() => {
                            const d = new Date(date);
                            d.setHours(h, 0, 0, 0);
                            onAddEvent(d);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 text-primary/40" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Drag snap overlay */}
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
                            "border-t",
                            marker.type === "hour" && "border-primary/25",
                            marker.type === "half" && "border-primary/15 border-dashed",
                            marker.type === "fine" && "border-primary/10 border-dotted",
                          )} />
                          {marker.type === "half" && (
                            <span className="absolute left-0.5 -top-2 text-[8px] text-primary/30 font-mono">
                              {marker.label}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Drop target ghost */}
                    {snappedStart !== null && (
                      <div
                        className="absolute left-0.5 right-0.5 rounded-md border-2 border-primary/40 bg-primary/8 transition-all duration-75 pointer-events-none"
                        style={{
                          top: minToY(snappedStart),
                          height: Math.max(20, minToY(snappedStart + dragState.durationMin) - minToY(snappedStart)),
                        }}
                      >
                        <div className="flex items-center justify-center h-full">
                          <span className="text-[10px] font-mono font-semibold text-primary/60">
                            {minutesToStr(snappedStart)} – {minutesToStr(snappedStart + dragState.durationMin)}
                          </span>
                        </div>
                      </div>
                    )}
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
                        <div className="w-2 h-2 rounded-full bg-destructive -ml-1 shadow-sm" />
                        <div className="flex-1 border-t-2 border-destructive/70" />
                      </div>
                    </div>
                  );
                })()}

                {/* Events */}
                {dayEvents.map((event) => {
                  const style = getEventStyle(event);
                  const typeStyle = eventTypeStyles[event.event_type];
                  const isOnline = !event.room_id && !event.classroom_id;
                  const isSelected = selectedEventIds?.has(event.id) || false;
                  const isDragging = dragState?.eventId === event.id;
                  const startTime = new Date(event.start_time);
                  const endTime = new Date(event.end_time);
                  const duration = (endTime.getTime() - startTime.getTime()) / 60000;

                  let eventTop = style.top;
                  if (isDragging && snappedStart !== null) {
                    eventTop = minToY(snappedStart);
                  }

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute left-1 right-1 rounded-lg border-l-[3px] transition-all duration-100 overflow-hidden z-10 select-none group/card",
                        typeStyle.border,
                        typeStyle.bg,
                        event.is_cancelled && "opacity-40 saturate-50",
                        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                        isDragging && "shadow-xl z-30 scale-[1.02] ring-2 ring-primary/40 opacity-90",
                        onMoveEvent && "cursor-grab active:cursor-grabbing",
                        !onMoveEvent && "cursor-pointer",
                        !isDragging && "hover:shadow-md hover:z-20"
                      )}
                      style={{ top: eventTop, height: style.height }}
                      draggable={!!onMoveEvent}
                      onDragStart={(e) => handleCrossDragStart(e, event.id)}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        if ((e.target as HTMLElement).closest('[role="checkbox"]')) return;
                        if (onMoveEvent) startInDayDrag(e, event, dateKey);
                      }}
                      onClick={() => {
                        if (!isDraggingRef.current) onEventClick(event);
                      }}
                    >
                      {/* Drag grip indicator */}
                      {onMoveEvent && (
                        <div className="absolute top-0 left-0 right-0 h-3 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none">
                          <div className="flex gap-[2px]">
                            <div className="w-[3px] h-[3px] rounded-full bg-foreground/20" />
                            <div className="w-[3px] h-[3px] rounded-full bg-foreground/20" />
                            <div className="w-[3px] h-[3px] rounded-full bg-foreground/20" />
                          </div>
                        </div>
                      )}

                      <div className="px-1.5 py-1 h-full flex flex-col">
                        <div className="flex items-start gap-1">
                          {onToggleSelect && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onToggleSelect(event.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 shrink-0 h-3 w-3"
                            />
                          )}
                          <p className={cn(
                            "font-semibold text-[11px] leading-tight truncate text-foreground/90",
                            event.is_cancelled && "line-through"
                          )}>
                            {event.title}
                          </p>
                        </div>
                        {style.height > 28 && (
                          <p className={cn("text-[10px] mt-0.5 font-mono", typeStyle.accent, "opacity-70")}>
                            {format(startTime, "HH:mm")} – {format(endTime, "HH:mm")}
                          </p>
                        )}
                        {style.height > 44 && event.group_name && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {event.group_name}
                          </p>
                        )}
                        {style.height > 56 && event.teacher_name && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {event.teacher_name}
                          </p>
                        )}
                        {style.height > 68 && (
                          <div className="flex items-center gap-1 mt-auto">
                            {isOnline ? (
                              <Video className="h-2.5 w-2.5 text-muted-foreground/60" />
                            ) : (
                              <MapPin className="h-2.5 w-2.5 text-muted-foreground/60" />
                            )}
                            <span className="text-[9px] text-muted-foreground/60 truncate">
                              {isOnline ? "Онлайн" : (event.classroom_name || event.room_name || "—")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Floating drag time badge */}
                      {isDragging && snappedStart !== null && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                          <div className="bg-primary text-primary-foreground text-[10px] font-mono font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap flex items-center gap-1.5">
                            <Clock className="h-3 w-3 opacity-70" />
                            {minutesToStr(snappedStart)} – {minutesToStr(snappedStart + duration)}
                            {dragState?.isFineMode && (
                              <span className="text-[8px] opacity-60 ml-0.5">⚡{dragState.currentSnap}хв</span>
                            )}
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
