import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { uk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { ScheduleEvent } from "@/hooks/use-schedule";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

const eventTypeDotColors: Record<EventType, string> = {
  lesson: "bg-primary",
  practice: "bg-warning",
  test: "bg-destructive",
  project: "bg-chart-4",
  other: "bg-muted-foreground",
};

interface MonthViewProps {
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onAddEvent: (date: Date) => void;
}

export function MonthView({ events, onEventClick, onAddEvent }: MonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

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

  const goToPrev = () => setCurrentMonth((m) => addMonths(m, -1));
  const goToNext = () => setCurrentMonth((m) => addMonths(m, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={goToToday}>
            Сьогодні
          </Button>
        </div>
        <span className="text-lg font-medium capitalize">
          {format(currentMonth, "LLLL yyyy", { locale: uk })}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg overflow-hidden -mt-4">
        {calendarDays.map((date) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dateKey] || [];
          const inMonth = isSameMonth(date, currentMonth);
          const today = isToday(date);
          const maxVisible = 3;

          return (
            <div
              key={dateKey}
              className={cn(
                "bg-card min-h-[100px] p-1 cursor-pointer hover:bg-accent/30 transition-colors",
                !inMonth && "bg-muted/30"
              )}
              onClick={() => onAddEvent(date)}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    today && "bg-primary text-primary-foreground",
                    !inMonth && "text-muted-foreground"
                  )}
                >
                  {format(date, "d")}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, maxVisible).map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80",
                      event.is_cancelled
                        ? "bg-muted text-muted-foreground line-through"
                        : "bg-primary/10 text-foreground"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    title={`${event.title} — ${event.group_name || ""} ${event.teacher_name || ""}`}
                  >
                    <span className="font-medium">
                      {format(new Date(event.start_time), "HH:mm")}
                    </span>{" "}
                    {event.group_name || event.title}
                  </div>
                ))}
                {dayEvents.length > maxVisible && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayEvents.length - maxVisible} ще
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
