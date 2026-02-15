import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BookOpen,
  CheckCircle,
  Clock,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";

interface CourseProgress {
  courseId: string;
  courseName: string;
  groupName: string;
  totalLessons: number;
  completedEvents: number;
  attendancePercent: number;
}

export default function StudentProgressPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [stats, setStats] = useState({ totalEvents: 0, attended: 0, groups: 0 });

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Get student's groups
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id, groups:group_id (name, course_id, courses:course_id (name))")
      .eq("user_id", user.id)
      .is("left_at", null);

    if (!memberships || memberships.length === 0) {
      setLoading(false);
      return;
    }

    const groupIds = memberships.map((m) => m.group_id);

    // Get all events for these groups
    const { data: events } = await supabase
      .from("schedule_events")
      .select("id, group_id")
      .in("group_id", groupIds)
      .eq("is_cancelled", false)
      .lte("start_time", new Date().toISOString());

    // Get attendance records
    const { data: attendance } = await supabase
      .from("attendance_records")
      .select("schedule_event_id, status")
      .eq("student_id", user.id);

    const attendanceMap = new Map(
      (attendance || []).map((a) => [a.schedule_event_id, a.status])
    );

    const totalEvents = events?.length || 0;
    const attended = (attendance || []).filter((a) => a.status === "present" || a.status === "late").length;

    setStats({ totalEvents, attended, groups: groupIds.length });

    // Build course progress
    const courseProgressMap = new Map<string, CourseProgress>();
    for (const m of memberships as any[]) {
      const group = m.groups;
      if (!group) continue;
      const courseId = group.course_id || m.group_id;
      const courseName = group.courses?.name || group.name;

      const groupEvents = (events || []).filter((e) => e.group_id === m.group_id);
      const groupAttended = groupEvents.filter(
        (e) => attendanceMap.get(e.id) === "present" || attendanceMap.get(e.id) === "late"
      ).length;

      courseProgressMap.set(courseId + m.group_id, {
        courseId,
        courseName,
        groupName: group.name,
        totalLessons: groupEvents.length,
        completedEvents: groupAttended,
        attendancePercent: groupEvents.length > 0 ? Math.round((groupAttended / groupEvents.length) * 100) : 0,
      });
    }

    setCourses(Array.from(courseProgressMap.values()));
    setLoading(false);
  };

  const overallAttendance = stats.totalEvents > 0
    ? Math.round((stats.attended / stats.totalEvents) * 100)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Мій прогрес" description="Відвідуваність та прогрес по курсах" />

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overallAttendance}%</p>
              <p className="text-xs text-muted-foreground">Відвідуваність</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.attended}</p>
              <p className="text-xs text-muted-foreground">Занять відвідано</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-chart-4/10">
              <BookOpen className="h-5 w-5 text-[hsl(var(--chart-4))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.groups}</p>
              <p className="text-xs text-muted-foreground">Активних курсів</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall attendance bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Загальна відвідуваність</span>
            <span className="text-sm text-muted-foreground">{stats.attended} з {stats.totalEvents} занять</span>
          </div>
          <Progress value={overallAttendance} className="h-2.5" />
        </CardContent>
      </Card>

      {/* Course progress cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Курси</h2>
        {courses.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Поки немає даних"
            description="Прогрес з'явиться після початку занять"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <Card key={course.courseId + course.groupName}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{course.courseName}</h3>
                      <p className="text-sm text-muted-foreground">{course.groupName}</p>
                    </div>
                    <Badge variant={course.attendancePercent >= 80 ? "default" : "outline"}>
                      {course.attendancePercent}%
                    </Badge>
                  </div>
                  <Progress value={course.attendancePercent} className="h-2 mb-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {course.completedEvents} з {course.totalLessons} занять
                    </span>
                    {course.attendancePercent >= 90 && (
                      <span className="flex items-center gap-1 text-success">
                        <Zap className="h-3 w-3" />
                        Відмінно!
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
