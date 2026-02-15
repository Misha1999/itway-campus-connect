import { useState, useEffect, useMemo } from "react";
import { format, isToday, isTomorrow, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays } from "date-fns";
import { uk } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  ExternalLink,
  FileText,
  Coins,
  BookOpen,
  ChevronRight,
  Star,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";

interface StudentEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  event_type: string;
  is_cancelled: boolean;
  online_link: string | null;
  group_name?: string;
  teacher_name?: string;
  classroom_name?: string;
  room_name?: string;
  room_id: string | null;
  classroom_id: string | null;
}

interface StudentAssignment {
  id: string;
  title: string;
  deadline: string;
  group_name: string;
  status: string;
}

const eventTypeConfig: Record<string, { label: string; dot: string; bg: string; border: string }> = {
  lesson: { label: "Урок", dot: "bg-primary", bg: "bg-primary/8", border: "border-l-primary" },
  practice: { label: "Практика", dot: "bg-warning", bg: "bg-warning/8", border: "border-l-warning" },
  test: { label: "Контрольна", dot: "bg-destructive", bg: "bg-destructive/8", border: "border-l-destructive" },
  project: { label: "Проєкт", dot: "bg-[hsl(var(--chart-4))]", bg: "bg-chart-4/8", border: "border-l-[hsl(var(--chart-4))]" },
  other: { label: "Інше", dot: "bg-muted-foreground", bg: "bg-muted", border: "border-l-muted-foreground" },
};

export function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<StudentEvent[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();
    if (profile) setUserName(profile.full_name);

    // Fetch coin balance
    const { data: balance } = await supabase.rpc("get_coin_balance", { _student_id: user.id });
    setCoinBalance(typeof balance === "number" ? balance : 0);

    // Fetch student's groups
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", user.id)
      .is("left_at", null);

    const groupIds = (memberships || []).map((m) => m.group_id);

    if (groupIds.length > 0) {
      // Fetch upcoming events
      const now = new Date().toISOString();
      const weekEnd = endOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }).toISOString();

      const { data: eventsData } = await supabase
        .from("schedule_events")
        .select(`
          id, title, start_time, end_time, event_type, is_cancelled, online_link,
          room_id, classroom_id,
          groups:group_id (name),
          classrooms:classroom_id (name),
          rooms:room_id (name),
          teacher_id
        `)
        .in("group_id", groupIds)
        .gte("start_time", now)
        .lte("start_time", weekEnd)
        .eq("is_cancelled", false)
        .order("start_time", { ascending: true })
        .limit(20);

      if (eventsData) {
        const teacherIds = [...new Set(eventsData.map((e: any) => e.teacher_id).filter(Boolean))];
        let teacherMap: Record<string, string> = {};
        if (teacherIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", teacherIds);
          if (profiles) {
            teacherMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name]));
          }
        }

        setEvents(eventsData.map((e: any) => ({
          id: e.id,
          title: e.title,
          start_time: e.start_time,
          end_time: e.end_time,
          event_type: e.event_type,
          is_cancelled: e.is_cancelled,
          online_link: e.online_link,
          group_name: e.groups?.name,
          teacher_name: e.teacher_id ? teacherMap[e.teacher_id] : undefined,
          classroom_name: e.classrooms?.name,
          room_name: e.rooms?.name,
          room_id: e.room_id,
          classroom_id: e.classroom_id,
        })));
      }

      // Fetch pending assignments
      const { data: assignData } = await supabase
        .from("assignments")
        .select("id, title, deadline, group_id, groups:group_id (name)")
        .in("group_id", groupIds)
        .eq("status", "published")
        .gte("deadline", now)
        .order("deadline", { ascending: true })
        .limit(5);

      if (assignData) {
        // Check submission status for each
        const assignmentItems: StudentAssignment[] = [];
        for (const a of assignData as any[]) {
          const { data: sub } = await supabase
            .from("submissions")
            .select("status")
            .eq("assignment_id", a.id)
            .eq("student_id", user.id)
            .maybeSingle();

          assignmentItems.push({
            id: a.id,
            title: a.title,
            deadline: a.deadline,
            group_name: a.groups?.name || "",
            status: sub?.status || "not_started",
          });
        }
        setAssignments(assignmentItems);
      }
    }

    setLoading(false);
  };

  const todayEvents = events.filter((e) => isToday(new Date(e.start_time)));
  const tomorrowEvents = events.filter((e) => isTomorrow(new Date(e.start_time)));
  const laterEvents = events.filter((e) => !isToday(new Date(e.start_time)) && !isTomorrow(new Date(e.start_time)));

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Доброго ранку";
    if (hour < 18) return "Доброго дня";
    return "Доброго вечора";
  })();

  const firstName = userName.split(" ")[0] || "Студенте";

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-60 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {greeting}, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {todayEvents.length > 0
                ? `Сьогодні у тебе ${todayEvents.length} ${todayEvents.length === 1 ? "заняття" : "занять"}`
                : "Сьогодні у тебе немає занять — відпочивай!"}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {format(new Date(), "EEEE, d MMMM", { locale: uk })}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todayEvents.length}</p>
              <p className="text-xs text-muted-foreground">Занять сьогодні</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-warning/10">
              <FileText className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {assignments.filter((a) => a.status === "not_started" || a.status === "in_progress").length}
              </p>
              <p className="text-xs text-muted-foreground">Завдань до здачі</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-chart-4/10">
              <Coins className="h-5 w-5 text-[hsl(var(--chart-4))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{coinBalance}</p>
              <p className="text-xs text-muted-foreground">Монет</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Today's schedule — takes more space */}
        <div className="lg:col-span-3 space-y-4">
          {/* Today */}
          {todayEvents.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Сьогодні
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayEvents.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tomorrow */}
          {tomorrowEvents.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-muted-foreground">Завтра</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tomorrowEvents.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Later */}
          {laterEvents.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-muted-foreground">Найближчі дні</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {laterEvents.map((event) => (
                  <EventRow key={event.id} event={event} showDate />
                ))}
              </CardContent>
            </Card>
          )}

          {events.length === 0 && (
            <Card className="p-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Немає запланованих занять на цьому тижні</p>
            </Card>
          )}

          <Button variant="outline" className="w-full" asChild>
            <Link to="/schedule">
              Повний розклад
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        {/* Right sidebar — assignments */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Домашні завдання</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/assignments">Усі</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Немає активних завдань 🎉
                </p>
              ) : (
                assignments.map((a) => {
                  const deadline = new Date(a.deadline);
                  const isUrgent = isToday(deadline) || isTomorrow(deadline);
                  const statusLabel: Record<string, string> = {
                    not_started: "Не розпочато",
                    in_progress: "У процесі",
                    submitted: "Здано",
                    reviewing: "На перевірці",
                    accepted: "Зараховано",
                    revision_needed: "Доопрацювати",
                  };

                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        isUrgent && a.status !== "submitted" && a.status !== "accepted"
                          ? "border-warning/40 bg-warning/5"
                          : "border-border"
                      )}
                    >
                      <p className="text-sm font-medium text-foreground line-clamp-1">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.group_name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-muted-foreground">
                          {format(deadline, "d MMM, HH:mm", { locale: uk })}
                        </span>
                        <Badge
                          variant={a.status === "accepted" ? "default" : a.status === "submitted" || a.status === "reviewing" ? "secondary" : "outline"}
                          className="text-[10px] h-5"
                        >
                          {statusLabel[a.status] || a.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Coins card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-chart-4/10">
                  <Trophy className="h-6 w-6 text-[hsl(var(--chart-4))]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Твій баланс</p>
                  <p className="text-xl font-bold text-foreground">{coinBalance} монет</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                <Link to="/coins">Історія монет</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EventRow({ event, showDate = false }: { event: StudentEvent; showDate?: boolean }) {
  const cfg = eventTypeConfig[event.event_type] || eventTypeConfig.other;
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const isOnline = !event.room_id && !event.classroom_id;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border-l-[3px] p-3 transition-colors hover:bg-muted/50",
        cfg.bg,
        cfg.border
      )}
    >
      {/* Time */}
      <div className="flex flex-col items-center min-w-[48px]">
        {showDate && (
          <span className="text-[10px] font-medium text-muted-foreground uppercase">
            {format(start, "EEE", { locale: uk })}
          </span>
        )}
        <span className="text-sm font-semibold text-foreground">{format(start, "HH:mm")}</span>
        <span className="text-[10px] text-muted-foreground">{format(end, "HH:mm")}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {event.group_name && <span>{event.group_name}</span>}
          <span className="flex items-center gap-0.5">
            {isOnline ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            {isOnline ? "Онлайн" : (event.classroom_name || event.room_name || "—")}
          </span>
          {event.teacher_name && (
            <span className="hidden sm:flex items-center gap-0.5">
              <User className="h-3 w-3" />
              {event.teacher_name.split(" ").slice(0, 2).join(" ")}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn("text-[10px] h-5 border-none", cfg.dot.replace("bg-", "text-"))}>
          {cfg.label}
        </Badge>
        {isOnline && event.online_link && (
          <a
            href={event.online_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
