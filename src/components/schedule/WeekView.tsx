import { useState, useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { uk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MapPin, Video, Plus } from "lucide-react";
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
}

export function WeekView({ events, onEventClick, onAddEvent }: WeekViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);

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
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(event);
    });

    // Sort events by start time
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    });

    return map;
  }, [events]);

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

          return (
            <div key={dateKey} className="min-h-[200px]">
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
                  const isOnline = !event.room_id;

                  return (
                    <Card
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={cn(
                        "border-l-4 cursor-pointer hover:shadow-sm transition-shadow",
                        eventTypeColors[event.event_type],
                        event.is_cancelled && "opacity-50"
                      )}
                    >
                      <CardContent className="p-2">
                        <p className={cn(
                          "font-medium text-sm truncate",
                          event.is_cancelled && "line-through"
                        )}>
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(startTime, "HH:mm")}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {isOnline ? (
                            <Video className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground truncate">
                            {isOnline ? "Онлайн" : event.room_name}
                          </span>
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
