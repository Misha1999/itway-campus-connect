import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isBefore,
} from "date-fns";
import { uk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  User,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import type { ScheduleEvent } from "@/hooks/use-schedule";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

const eventTypeConfig: Record<EventType, { label: string; bg: string; border: string; text: string; dot: string }> = {
  lesson: {
    label: "Урок",
    bg: "bg-primary/8",
    border: "border-l-primary",
    text: "text-primary",
    dot: "bg-primary",
  },
  practice: {
    label: "Практика",
    bg: "bg-warning/8",
    border: "border-l-warning",
    text: "text-warning",
    dot: "bg-warning",
  },
  test: {
    label: "Контрольна",
    bg: "bg-destructive/8",
    border: "border-l-destructive",
    text: "text-destructive",
    dot: "bg-destructive",
  },
  project: {
    label: "Проєкт",
    bg: "bg-chart-4/8",
    border: "border-l-[hsl(var(--chart-4))]",
    text: "text-[hsl(var(--chart-4))]",
    dot: "bg-[hsl(var(--chart-4))]",
  },
  other: {
    label: "Інше",
    bg: "bg-muted",
    border: "border-l-muted-foreground",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

interface StudentScheduleViewProps {
  events: ScheduleEvent[];
  onEventClick?: (event: ScheduleEvent) => void;
}

export function StudentScheduleView({ events, onEventClick }: StudentScheduleViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  const goToPrevWeek = () => setCurrentWeekStart((d) => addWeeks(d, -1));
  const goToNextWeek = () => setCurrentWeekStart((d) => addWeeks(d, 1));
  const goToCurrentWeek = () =>
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const day of weekDays) {
      const key = format(day, "yyyy-MM-dd");
      const dayEvents = events
        .filter((e) => isSameDay(new Date(e.start_time), day))
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
      map.set(key, dayEvents);
    }
    return map;
  }, [events, currentWeekStart]);

  const isCurrentWeek = isSameDay(
    currentWeekStart,
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={goToPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentWeek && (
            <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
              Цей тиждень
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>
            {format(currentWeekStart, "d MMM", { locale: uk })} –{" "}
            {format(weekEnd, "d MMM yyyy", { locale: uk })}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(eventTypeConfig).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={cn("h-2 w-2 rounded-full", cfg.dot)} />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) || [];
          const today = isToday(day);
          const past = isBefore(day, new Date()) && !today;

          return (
            <div
              key={key}
              className={cn(
                "rounded-xl border p-3 min-h-[140px] transition-all",
                today
                  ? "border-primary/40 bg-primary/[0.03] ring-1 ring-primary/20"
                  : "border-border bg-card",
                past && "opacity-60"
              )}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-xs font-medium uppercase tracking-wide",
                      today ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {format(day, "EEE", { locale: uk })}
                  </span>
                </div>
                <span
                  className={cn(
                    "flex items-center justify-center text-sm font-semibold rounded-full h-7 w-7",
                    today
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-2">
                {dayEvents.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/50 text-center py-4">
                    Вільний день
                  </p>
                ) : (
                  dayEvents.map((event) => (
                    <StudentEventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick?.(event)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudentEventCard({
  event,
  onClick,
}: {
  event: ScheduleEvent;
  onClick: () => void;
}) {
  const cfg = eventTypeConfig[event.event_type];
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const isOnline = !event.room_id && !event.classroom_id;
  const locationLabel = isOnline
    ? "Онлайн"
    : event.classroom_name || event.room_name || "—";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border-l-[3px] p-2.5 transition-all",
        "hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]",
        cfg.bg,
        cfg.border,
        event.is_cancelled && "opacity-50 line-through"
      )}
    >
      {/* Time */}
      <div className="flex items-center gap-1 mb-1">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] font-medium text-muted-foreground">
          {format(start, "HH:mm")} – {format(end, "HH:mm")}
        </span>
      </div>

      {/* Title */}
      <p className="text-xs font-semibold text-foreground leading-tight mb-1 line-clamp-2">
        {event.title}
      </p>

      {/* Group */}
      {event.group_name && (
        <p className="text-[10px] text-muted-foreground mb-1.5 truncate">
          {event.group_name}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Location */}
        <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          {isOnline ? (
            <Video className="h-3 w-3" />
          ) : (
            <MapPin className="h-3 w-3" />
          )}
          <span className="truncate max-w-[60px]">{locationLabel}</span>
        </div>

        {/* Teacher */}
        {event.teacher_name && (
          <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[60px]">
              {event.teacher_name.split(" ").slice(0, 2).join(" ")}
            </span>
          </div>
        )}

        {/* Type badge */}
        <Badge
          variant="outline"
          className={cn("text-[9px] px-1 py-0 h-4 border-none font-medium", cfg.text)}
        >
          {cfg.label}
        </Badge>
      </div>

      {/* Online link */}
      {isOnline && event.online_link && !event.is_cancelled && (
        <a
          href={event.online_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Приєднатися
        </a>
      )}

      {/* Cancelled */}
      {event.is_cancelled && (
        <Badge variant="destructive" className="mt-1 text-[9px] h-4">
          Скасовано
        </Badge>
      )}
    </button>
  );
}
