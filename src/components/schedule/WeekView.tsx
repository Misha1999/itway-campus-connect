import { useState, useMemo } from "react";
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

interface WeekViewProps {
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onAddEvent: (date: Date) => void;
  selectedEventIds?: Set<string>;
  onToggleSelect?: (eventId: string) => void;
  onMoveEvent?: (eventId: string, newDate: Date) => Promise<void>;
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

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData("text/plain", eventId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedEventId(eventId);
  };

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateKey);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain");
    setDraggedEventId(null);
    setDragOverDate(null);
    if (eventId && onMoveEvent) {
      await onMoveEvent(eventId, date);
    }
  };

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
                "min-h-[200px] transition-colors rounded-lg",
                isDragTarget && "bg-primary/10 ring-2 ring-primary/30"
              )}
              onDragOver={(e) => handleDragOver(e, dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
            >
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
                {dayEvents.length === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => onAddEvent(date)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Додати
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
