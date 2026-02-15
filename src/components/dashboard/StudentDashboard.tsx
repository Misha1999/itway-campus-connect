import { useState, useEffect } from "react";
import { format, isToday, isTomorrow, addDays, endOfWeek, differenceInMinutes, isPast } from "date-fns";
import { uk } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  Trophy,
  BarChart3,
  Sparkles,
  Timer,
} from "lucide-react";
import { Link } from "react-router-dom";

// ── Types ──────────────────────────────────────────────────

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

interface RecentGrade {
  id: string;
  score: number;
  max_score: number;
  work_type: string;
  comment: string | null;
  created_at: string;
}

// ── Config ─────────────────────────────────────────────────

const eventTypeConfig: Record<string, { label: string; dot: string; bg: string; border: string }> = {
  lesson: { label: "Урок", dot: "bg-primary", bg: "bg-primary/8", border: "border-l-primary" },
  practice: { label: "Практика", dot: "bg-warning", bg: "bg-warning/8", border: "border-l-warning" },
  test: { label: "Контрольна", dot: "bg-destructive", bg: "bg-destructive/8", border: "border-l-destructive" },
  project: { label: "Проєкт", dot: "bg-[hsl(var(--chart-4))]", bg: "bg-chart-4/8", border: "border-l-[hsl(var(--chart-4))]" },
  other: { label: "Інше", dot: "bg-muted-foreground", bg: "bg-muted", border: "border-l-muted-foreground" },
};

const levels = [
  { level: 1, name: "Новачок", minCoins: 0, icon: "🌱" },
  { level: 2, name: "Учень", minCoins: 100, icon: "📚" },
  { level: 3, name: "Практик", minCoins: 300, icon: "⚡" },
  { level: 4, name: "Знавець", minCoins: 600, icon: "🎯" },
  { level: 5, name: "Майстер", minCoins: 1000, icon: "🏆" },
  { level: 6, name: "Експерт", minCoins: 1500, icon: "💎" },
  { level: 7, name: "Легенда", minCoins: 2500, icon: "👑" },
];

function getLevel(coins: number) {
  let current = levels[0];
  for (const l of levels) {
    if (coins >= l.minCoins) current = l;
    else break;
  }
  const nextIdx = levels.findIndex((l) => l.level === current.level) + 1;
  const next = nextIdx < levels.length ? levels[nextIdx] : null;
  const progressToNext = next
    ? Math.round(((coins - current.minCoins) / (next.minCoins - current.minCoins)) * 100)
    : 100;
  return { current, next, progressToNext };
}

// ── Main Component ─────────────────────────────────────────

export function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<StudentEvent[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [recentGrades, setRecentGrades] = useState<RecentGrade[]>([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [userName, setUserName] = useState("");
  const [attendancePercent, setAttendancePercent] = useState(0);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Parallel fetches
    const [profileRes, balanceRes, membershipsRes, gradesRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("user_id", user.id).single(),
      supabase.rpc("get_coin_balance", { _student_id: user.id }),
      supabase.from("group_memberships").select("group_id").eq("user_id", user.id).is("left_at", null),
      supabase.from("grades").select("id, score, max_score, work_type, comment, created_at")
        .eq("student_id", user.id).order("created_at", { ascending: false }).limit(3),
    ]);

    if (profileRes.data) setUserName(profileRes.data.full_name);
    setCoinBalance(typeof balanceRes.data === "number" ? balanceRes.data : 0);
    if (gradesRes.data) setRecentGrades(gradesRes.data);

    const groupIds = (membershipsRes.data || []).map((m) => m.group_id);

    if (groupIds.length > 0) {
      const now = new Date().toISOString();
      const weekEnd = endOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }).toISOString();

      // Events + assignments + attendance in parallel
      const [eventsRes, assignRes, attendRes, totalEventsRes] = await Promise.all([
        supabase.from("schedule_events")
          .select("id, title, start_time, end_time, event_type, is_cancelled, online_link, room_id, classroom_id, groups:group_id (name), classrooms:classroom_id (name), rooms:room_id (name), teacher_id")
          .in("group_id", groupIds).gte("start_time", now).lte("start_time", weekEnd)
          .eq("is_cancelled", false).order("start_time", { ascending: true }).limit(20),
        supabase.from("assignments")
          .select("id, title, deadline, group_id, groups:group_id (name)")
          .in("group_id", groupIds).eq("status", "published").gte("deadline", now)
          .order("deadline", { ascending: true }).limit(5),
        supabase.from("attendance_records").select("status").eq("student_id", user.id)
          .in("status", ["present", "late"]),
        supabase.from("attendance_records").select("id").eq("student_id", user.id),
      ]);

      // Attendance percent
      const total = totalEventsRes.data?.length || 0;
      const present = attendRes.data?.length || 0;
      setAttendancePercent(total > 0 ? Math.round((present / total) * 100) : 0);

      // Process events
      if (eventsRes.data) {
        const teacherIds = [...new Set(eventsRes.data.map((e: any) => e.teacher_id).filter(Boolean))];
        let teacherMap: Record<string, string> = {};
        if (teacherIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds);
          if (profiles) teacherMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name]));
        }
        setEvents(eventsRes.data.map((e: any) => ({
          id: e.id, title: e.title, start_time: e.start_time, end_time: e.end_time,
          event_type: e.event_type, is_cancelled: e.is_cancelled, online_link: e.online_link,
          group_name: e.groups?.name, teacher_name: e.teacher_id ? teacherMap[e.teacher_id] : undefined,
          classroom_name: e.classrooms?.name, room_name: e.rooms?.name,
          room_id: e.room_id, classroom_id: e.classroom_id,
        })));
      }

      // Process assignments with submission check
      if (assignRes.data) {
        const items: StudentAssignment[] = [];
        for (const a of assignRes.data as any[]) {
          const { data: sub } = await supabase
            .from("submissions").select("status").eq("assignment_id", a.id).eq("student_id", user.id).maybeSingle();
          items.push({ id: a.id, title: a.title, deadline: a.deadline, group_name: a.groups?.name || "", status: sub?.status || "not_started" });
        }
        setAssignments(items);
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
  const { current: currentLevel, next: nextLevel, progressToNext } = getLevel(coinBalance);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
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
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-success/10">
              <BarChart3 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{attendancePercent}%</p>
              <p className="text-xs text-muted-foreground">Відвідуваність</p>
            </div>
          </CardContent>
        </Card>
        <Card>
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
        {/* Left column — schedule */}
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
                {todayEvents.map((event) => <EventRow key={event.id} event={event} />)}
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
                {tomorrowEvents.map((event) => <EventRow key={event.id} event={event} />)}
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
                {laterEvents.map((event) => <EventRow key={event.id} event={event} showDate />)}
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

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Assignments */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Домашні завдання</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/assignments">Усі</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Немає активних завдань 🎉</p>
              ) : (
                assignments.map((a) => <AssignmentRow key={a.id} assignment={a} />)
              )}
            </CardContent>
          </Card>

          {/* Recent grades */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Останні оцінки</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/grades">Усі</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentGrades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Оцінок поки немає</p>
              ) : (
                recentGrades.map((g) => {
                  const percent = Math.round((g.score / g.max_score) * 100);
                  const color = percent >= 75 ? "text-success" : percent >= 50 ? "text-warning" : "text-destructive";
                  return (
                    <div key={g.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted">
                        <span className={cn("text-sm font-bold", color)}>{g.score}/{g.max_score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground capitalize">{g.work_type}</p>
                        {g.comment && <p className="text-xs text-muted-foreground line-clamp-1">{g.comment}</p>}
                      </div>
                      <span className={cn("text-sm font-bold", color)}>{percent}%</span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Level card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-xl">
                  {currentLevel.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Рівень {currentLevel.level}</span>
                    <Badge variant="secondary" className="text-xs">{currentLevel.name}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{coinBalance} монет</p>
                </div>
              </div>
              {nextLevel && (
                <>
                  <Progress value={progressToNext} className="h-2 mb-1.5" />
                  <p className="text-[11px] text-muted-foreground">
                    До «{nextLevel.name}» — ще {nextLevel.minCoins - coinBalance} монет
                  </p>
                </>
              )}
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/coins">Монети</Link>
                </Button>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/achievements">Досягнення</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function EventRow({ event, showDate = false }: { event: StudentEvent; showDate?: boolean }) {
  const cfg = eventTypeConfig[event.event_type] || eventTypeConfig.other;
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  const isOnline = !event.room_id && !event.classroom_id;

  // Status indicator
  const now = new Date();
  const minutesUntil = differenceInMinutes(start, now);
  const isNow = now >= start && now <= end;
  const isSoon = minutesUntil > 0 && minutesUntil <= 30;

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border-l-[3px] p-3 transition-colors hover:bg-muted/50",
      cfg.bg, cfg.border
    )}>
      <div className="flex flex-col items-center min-w-[48px]">
        {showDate && (
          <span className="text-[10px] font-medium text-muted-foreground uppercase">
            {format(start, "EEE", { locale: uk })}
          </span>
        )}
        <span className="text-sm font-semibold text-foreground">{format(start, "HH:mm")}</span>
        <span className="text-[10px] text-muted-foreground">{format(end, "HH:mm")}</span>
      </div>

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

      <div className="flex items-center gap-2">
        {isNow && (
          <Badge className="text-[10px] h-5 bg-success/10 text-success border-success/30">Зараз</Badge>
        )}
        {isSoon && !isNow && (
          <Badge variant="outline" className="text-[10px] h-5">
            <Timer className="h-3 w-3 mr-0.5" />
            {minutesUntil} хв
          </Badge>
        )}
        <Badge variant="outline" className={cn("text-[10px] h-5 border-none", cfg.dot.replace("bg-", "text-"))}>
          {cfg.label}
        </Badge>
        {isOnline && event.online_link && (
          <a href={event.online_link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function AssignmentRow({ assignment }: { assignment: StudentAssignment }) {
  const deadline = new Date(assignment.deadline);
  const isUrgent = isToday(deadline) || isTomorrow(deadline);
  const statusLabel: Record<string, string> = {
    not_started: "Не розпочато", in_progress: "У процесі", submitted: "Здано",
    reviewing: "На перевірці", accepted: "Зараховано", revision_needed: "Доопрацювати",
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 transition-colors",
      isUrgent && assignment.status !== "submitted" && assignment.status !== "accepted"
        ? "border-warning/40 bg-warning/5" : "border-border"
    )}>
      <p className="text-sm font-medium text-foreground line-clamp-1">{assignment.title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{assignment.group_name}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-muted-foreground">
          {format(deadline, "d MMM, HH:mm", { locale: uk })}
        </span>
        <Badge
          variant={assignment.status === "accepted" ? "default" : assignment.status === "submitted" || assignment.status === "reviewing" ? "secondary" : "outline"}
          className="text-[10px] h-5"
        >
          {statusLabel[assignment.status] || assignment.status}
        </Badge>
      </div>
    </div>
  );
}
