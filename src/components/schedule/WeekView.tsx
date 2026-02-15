import { useState, useMemo, useCallback, useRef } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { uk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MapPin, Video, Plus, Clock, ArrowRight } from "lucide-react";
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

// Pending move for confirmation dialog
interface PendingMove {
  event: ScheduleEvent;
  newStartStr: string;
  newEndStr: string;
  newDate: Date;
  oldStartStr: string;
  oldEndStr: string;
  oldDateStr: string;
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

  // Drag state — unified for both in-day and cross-day
  const [dragState, setDragState] = useState<{
    eventId: string;
    originDateKey: string;
    currentDateKey: string;
    startY: number;
    currentY: number;
    originalMin: number;
    durationMin: number;
    currentSnap: number;
    isFineMode: boolean;
  } | null>(null);

  // Confirmation dialog
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMoveTimeRef = useRef<number>(0);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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

  const yToMin = useCallback((y: number) => {
    return gridStartMin + (y / HOUR_HEIGHT) * 60;
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

  // Find dateKey from mouse X position
  const findDateKeyAtX = useCallback((clientX: number): string | null => {
    for (const [key, col] of Object.entries(columnRefs.current)) {
      if (!col) continue;
      const r = col.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return key;
    }
    return null;
  }, []);

  // Unified mouse-based drag (no HTML5 drag API)
  const startDrag = useCallback((e: React.MouseEvent, event: ScheduleEvent, dateKey: string) => {
    if (!onMoveEvent || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[role="checkbox"]')) return;
    
    e.preventDefault();
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
      originDateKey: dateKey,
      currentDateKey: dateKey,
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

      if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) < 5) return;

      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setDragState(pendingDrag);
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          setDragState(prev => prev ? { ...prev, currentSnap: fineSnapMinutes, isFineMode: true } : null);
        }, HOLD_DELAY);
        lastMoveTimeRef.current = Date.now();
      }

      // Reset hold timer on significant movement
      const now = Date.now();
      if (now - lastMoveTimeRef.current > 50) {
        lastMoveTimeRef.current = now;
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          setDragState(prev => prev ? { ...prev, currentSnap: fineSnapMinutes, isFineMode: true } : null);
        }, HOLD_DELAY);
        setDragState(prev => prev ? { ...prev, currentSnap: snapMinutes, isFineMode: false } : null);
      }

      // Find which column cursor is over
      const newDateKey = findDateKeyAtX(me.clientX);
      
      // Calculate Y relative to current column
      for (const [key, col2] of Object.entries(columnRefs.current)) {
        if (!col2) continue;
        const r = col2.getBoundingClientRect();
        if (me.clientX >= r.left && me.clientX <= r.right) {
          const newY = me.clientY - r.top;
          setDragState(prev => prev ? { 
            ...prev, 
            currentY: newY,
            currentDateKey: key,
          } : null);
          break;
        }
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);

      if (isDraggingRef.current) {
        // Get final state and show confirmation
        setDragState(prev => {
          if (!prev) return null;
          const deltaY = prev.currentY - prev.startY;
          const deltaMin = (deltaY / HOUR_HEIGHT) * 60;
          const rawNewStart = prev.originalMin + deltaMin;
          const snappedNewStart = snapTo(Math.max(gridStartMin, Math.min(gridEndMin - 30, rawNewStart)), prev.currentSnap);

          const ev = events.find(e => e.id === prev.eventId);
          if (ev) {
            const oldStart = new Date(ev.start_time);
            const oldEnd = new Date(ev.end_time);
            const oldStartStr = format(oldStart, "HH:mm");
            const oldEndStr = format(oldEnd, "HH:mm");
            const oldDateStr = format(oldStart, "EEE, d MMM", { locale: uk });

            // Find the new date from currentDateKey
            const newDate = weekDates.find(d => format(d, "yyyy-MM-dd") === prev.currentDateKey) || oldStart;
            
            const newStartStr = minutesToStr(snappedNewStart);
            const newEndStr = minutesToStr(snappedNewStart + prev.durationMin);

            // Check if anything actually changed
            const sameDay = prev.originDateKey === prev.currentDateKey;
            const sameTime = newStartStr === oldStartStr;
            
            if (sameDay && sameTime) {
              // No change, just cancel
              return null;
            }

            setPendingMove({
              event: ev,
              newStartStr,
              newEndStr,
              newDate,
              oldStartStr,
              oldEndStr,
              oldDateStr,
            });
          }
          return null;
        });
      }

      isDraggingRef.current = false;
      dragStartPosRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [snapMinutes, fineSnapMinutes, onMoveEvent, events, snapTo, gridStartMin, gridEndMin, findDateKeyAtX, weekDates]);

  // Confirm the move
  const confirmMove = useCallback(async () => {
    if (!pendingMove || !onMoveEvent) return;
    await onMoveEvent(
      pendingMove.event.id,
      pendingMove.newDate,
      pendingMove.newStartStr,
      pendingMove.newEndStr
    );
    setPendingMove(null);
  }, [pendingMove, onMoveEvent]);

  // Snap markers during drag
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
        <div
          ref={scrollContainerRef}
          className="grid grid-cols-[52px_repeat(7,1fr)] overflow-y-auto max-h-[calc(100vh-300px)]"
        >
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
            const isDropTargetColumn = dragState && dragState.currentDateKey === dateKey;
            const isOriginColumn = dragState && dragState.originDateKey === dateKey;
            const isCrossDayTarget = isDropTargetColumn && !isOriginColumn;

            return (
              <div
                key={dateKey}
                ref={(el) => { columnRefs.current[dateKey] = el; }}
                className={cn(
                  "relative border-l border-border/50",
                  isToday && "bg-primary/[0.02]",
                  isCrossDayTarget && "bg-primary/[0.05]"
                )}
                style={{ height: gridHeight }}
              >
                {/* Hour rows */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/30 group"
                    style={{ top: (h - startHour) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  >
                    {/* Half-hour line */}
                    <div
                      className="absolute left-0 right-0 border-t border-border/15"
                      style={{ top: HOUR_HEIGHT / 2 }}
                    />

                    {/* Add button on hover (only when not dragging) */}
                    {onMoveEvent && !dragState && (
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
                ))}

                {/* Drag snap overlay + ghost for target column */}
                {isDropTargetColumn && dragState && (
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

                    {/* Drop ghost preview */}
                    {snappedStart !== null && (
                      <div
                        className="absolute left-0.5 right-0.5 rounded-lg border-2 border-dashed border-primary/50 bg-primary/10 transition-all duration-75 pointer-events-none"
                        style={{
                          top: minToY(snappedStart),
                          height: Math.max(20, minToY(snappedStart + dragState.durationMin) - minToY(snappedStart)),
                        }}
                      >
                        <div className="flex items-center justify-center h-full gap-1">
                          <Clock className="h-3 w-3 text-primary/50" />
                          <span className="text-[10px] font-mono font-semibold text-primary/60">
                            {minutesToStr(snappedStart)} – {minutesToStr(snappedStart + dragState.durationMin)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Cross-day column highlight header */}
                {isCrossDayTarget && (
                  <div className="absolute top-0 left-0 right-0 h-6 bg-primary/15 flex items-center justify-center z-30 pointer-events-none">
                    <span className="text-[9px] font-semibold text-primary">
                      {format(date, "EEE, d MMM", { locale: uk })}
                    </span>
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

                  // If this event is being dragged and cursor is on a different column, 
                  // hide the original and show ghost on target column
                  const isOnDifferentColumn = isDragging && dragState?.currentDateKey !== dateKey;

                  let eventTop = style.top;
                  if (isDragging && snappedStart !== null && dragState?.currentDateKey === dateKey) {
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
                        isDragging && !isOnDifferentColumn && "shadow-xl z-30 scale-[1.02] ring-2 ring-primary/40",
                        isOnDifferentColumn && "opacity-30 scale-95",
                        onMoveEvent && "cursor-grab active:cursor-grabbing",
                        !onMoveEvent && "cursor-pointer",
                        !isDragging && "hover:shadow-md hover:z-20"
                      )}
                      style={{ top: eventTop, height: style.height }}
                      onMouseDown={(e) => startDrag(e, event, dateKey)}
                      onClick={() => {
                        if (!isDraggingRef.current) onEventClick(event);
                      }}
                    >
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
                      {isDragging && snappedStart !== null && !isOnDifferentColumn && (
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

      {/* Move confirmation dialog */}
      <AlertDialog open={!!pendingMove} onOpenChange={(open) => { if (!open) setPendingMove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Перемістити подію?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  <span className="font-semibold text-foreground">{pendingMove?.event.title}</span>
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <div className="rounded-md bg-muted px-2.5 py-1.5 font-mono text-xs">
                    <div className="text-muted-foreground text-[10px] mb-0.5">Було</div>
                    <div>{pendingMove?.oldDateStr}</div>
                    <div className="font-semibold">{pendingMove?.oldStartStr} – {pendingMove?.oldEndStr}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1.5 font-mono text-xs">
                    <div className="text-primary text-[10px] mb-0.5">Стане</div>
                    <div>{pendingMove && format(pendingMove.newDate, "EEE, d MMM", { locale: uk })}</div>
                    <div className="font-semibold text-primary">{pendingMove?.newStartStr} – {pendingMove?.newEndStr}</div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMove}>
              Підтвердити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
