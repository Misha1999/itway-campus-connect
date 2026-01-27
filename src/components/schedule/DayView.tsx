import { useState, useMemo } from "react";
import { format, isSameDay, addDays } from "date-fns";
import { uk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clock, MapPin, Video, User, Plus } from "lucide-react";
import type { ScheduleEvent } from "@/hooks/use-schedule";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

const eventTypeLabels: Record<EventType, string> = {
  lesson: "Урок",
  practice: "Практика",
  test: "Контрольна",
  project: "Проєкт",
  other: "Інше",
};

const eventTypeColors: Record<EventType, string> = {
  lesson: "bg-primary",
  practice: "bg-warning",
  test: "bg-destructive",
  project: "bg-chart-4",
  other: "bg-muted-foreground",
};

interface DayViewProps {
  events: ScheduleEvent[];
  onEventClick: (event: ScheduleEvent) => void;
  onAddEvent: (date: Date) => void;
}

export function DayView({ events, onEventClick, onAddEvent }: DayViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dayEvents = useMemo(() => {
    return events
      .filter((event) => isSameDay(new Date(event.start_time), selectedDate))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [events, selectedDate]);

  const goToPrevDay = () => setSelectedDate((d) => addDays(d, -1));
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const goToToday = () => setSelectedDate(new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={goToToday}>
            Сьогодні
          </Button>
        </div>
        <span className="text-lg font-medium">
          {format(selectedDate, "EEEE, d MMMM yyyy", { locale: uk })}
        </span>
      </div>

      <div className="space-y-3">
        {dayEvents.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              На цей день немає запланованих подій
            </p>
            <Button onClick={() => onAddEvent(selectedDate)}>
              <Plus className="h-4 w-4 mr-2" />
              Створити подію
            </Button>
          </Card>
        ) : (
          dayEvents.map((event) => {
            const startTime = new Date(event.start_time);
            const endTime = new Date(event.end_time);
            const isOnline = !event.room_id;

            return (
              <Card
                key={event.id}
                onClick={() => onEventClick(event)}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-shadow",
                  event.is_cancelled && "opacity-60"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("w-1 h-full min-h-[60px] rounded-full", eventTypeColors[event.event_type])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className={cn(
                            "font-medium text-foreground truncate",
                            event.is_cancelled && "line-through"
                          )}>
                            {event.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">{event.group_name}</p>
                        </div>
                        <Badge variant={event.is_cancelled ? "destructive" : "outline"}>
                          {event.is_cancelled ? "Скасовано" : eventTypeLabels[event.event_type]}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isOnline ? (
                            <Video className="h-4 w-4" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                          <span>{isOnline ? "Онлайн" : event.room_name}</span>
                        </div>
                        {event.teacher_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{event.teacher_name}</span>
                          </div>
                        )}
                      </div>

                      {event.is_cancelled && event.cancelled_reason && (
                        <p className="text-sm text-destructive mt-2">
                          Причина: {event.cancelled_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {dayEvents.length > 0 && (
        <Button variant="outline" className="w-full" onClick={() => onAddEvent(selectedDate)}>
          <Plus className="h-4 w-4 mr-2" />
          Додати подію
        </Button>
      )}
    </div>
  );
}
