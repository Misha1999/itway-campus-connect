import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/use-user-role";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import {
  Users,
  GraduationCap,
  Calendar,
  ClipboardList,
  FileText,
  TrendingUp,
  Clock,
  Plus,
} from "lucide-react";

// Demo data for admin dashboard
const stats = [
  { title: "Всього студентів", value: 156, change: "+12 цього місяця", changeType: "positive" as const, icon: Users },
  { title: "Активних груп", value: 24, change: "8 закладів", changeType: "neutral" as const, icon: GraduationCap },
  { title: "Занять сьогодні", value: 18, change: "3 онлайн", changeType: "neutral" as const, icon: Calendar },
  { title: "ДЗ на перевірці", value: 23, change: "5 термінових", changeType: "warning" as const, icon: FileText },
];

const recentActivities = [
  { id: 1, user: "Олександр Коваль", action: "здав домашнє завдання", target: "Python Basics #3", time: "5 хв тому" },
  { id: 2, user: "Марія Петренко", action: "оцінила роботу", target: "Web Design проєкт", time: "15 хв тому" },
  { id: 3, user: "Іван Сидоренко", action: "долучився до групи", target: "Roblox Junior", time: "1 год тому" },
  { id: 4, user: "Анна Бондаренко", action: "створила урок", target: "3D Modeling Intro", time: "2 год тому" },
];

const upcomingClasses = [
  { id: 1, name: "Python Advanced", group: "PY-2024-A", time: "14:00", room: "Ауд. 3", format: "offline" as const },
  { id: 2, name: "Web Design Basics", group: "WD-2024-B", time: "15:30", room: "Online", format: "online" as const },
  { id: 3, name: "Roblox Studio", group: "RB-2024-C", time: "16:00", room: "Ауд. 1", format: "offline" as const },
];

const pendingAssignments = [
  { id: 1, title: "Проєкт: Калькулятор", group: "PY-2024-A", submitted: 8, total: 12, deadline: "Сьогодні" },
  { id: 2, title: "HTML/CSS Портфоліо", group: "WD-2024-B", submitted: 5, total: 10, deadline: "Завтра" },
  { id: 3, title: "Гра в Roblox", group: "RB-2024-C", submitted: 3, total: 8, deadline: "Через 2 дні" },
];

export default function DashboardPage() {
  const { isStudent, isAdminOrAbove, isTeacher, loading } = useUserRole();

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Student dashboard
  if (isStudent && !isAdminOrAbove && !isTeacher) {
    return <StudentDashboard />;
  }

  // Admin/Teacher dashboard
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Дашборд" 
        description="Огляд активності ITway LMS"
      >
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Швидка дія
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Найближчі заняття</CardTitle>
            <Button variant="ghost" size="sm">
              Переглянути всі
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingClasses.map((cls) => (
              <div key={cls.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{cls.name}</p>
                  <p className="text-sm text-muted-foreground">{cls.group} • {cls.room}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium text-foreground">{cls.time}</span>
                  <StatusBadge status={cls.format} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending Assignments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">ДЗ на перевірці</CardTitle>
            <Button variant="ghost" size="sm">
              Переглянути всі
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingAssignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10">
                  <ClipboardList className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{assignment.title}</p>
                  <p className="text-sm text-muted-foreground">{assignment.group}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-medium text-foreground">
                    {assignment.submitted}/{assignment.total}
                  </span>
                  <span className="text-xs text-muted-foreground">{assignment.deadline}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Остання активність</CardTitle>
          <Button variant="ghost" size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Аналітика
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                    {activity.user.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">{activity.user}</span>
                    {" "}
                    <span className="text-muted-foreground">{activity.action}</span>
                    {" "}
                    <span className="font-medium text-foreground">{activity.target}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
