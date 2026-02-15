import { useState, useEffect } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, TrendingUp, Award, BookOpen } from "lucide-react";

interface Grade {
  id: string;
  score: number;
  max_score: number;
  work_type: string;
  comment: string | null;
  created_at: string;
  group_name?: string;
}

const workTypeLabels: Record<string, string> = {
  homework: "Домашнє завдання",
  practice: "Практика",
  project: "Проєкт",
  test: "Контрольна",
  activity: "Активність",
};

const workTypeColors: Record<string, string> = {
  homework: "bg-primary/10 text-primary",
  practice: "bg-warning/10 text-warning",
  project: "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]",
  test: "bg-destructive/10 text-destructive",
  activity: "bg-success/10 text-success",
};

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("grades")
      .select("id, score, max_score, work_type, comment, created_at, group_id, groups:group_id (name)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setGrades(data.map((g: any) => ({
        ...g,
        group_name: g.groups?.name,
      })));
    }
    setLoading(false);
  };

  const filteredGrades = filter === "all"
    ? grades
    : grades.filter((g) => g.work_type === filter);

  const averagePercent = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + (g.score / g.max_score) * 100, 0) / grades.length)
    : 0;

  const bestScore = grades.length > 0
    ? Math.max(...grades.map((g) => Math.round((g.score / g.max_score) * 100)))
    : 0;

  const totalGrades = grades.length;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Мої оцінки" description="Перегляд усіх оцінок та прогресу" />

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{averagePercent}%</p>
              <p className="text-xs text-muted-foreground">Середній бал</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-success/10">
              <Award className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{bestScore}%</p>
              <p className="text-xs text-muted-foreground">Найкращий результат</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-chart-4/10">
              <BookOpen className="h-5 w-5 text-[hsl(var(--chart-4))]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalGrades}</p>
              <p className="text-xs text-muted-foreground">Всього оцінок</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Загальний прогрес</span>
            <span className="text-sm text-muted-foreground">{averagePercent}%</span>
          </div>
          <Progress value={averagePercent} className="h-2.5" />
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Тип роботи" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі типи</SelectItem>
            {Object.entries(workTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grades list */}
      {filteredGrades.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Оцінок поки немає"
          description="Тут з'являтимуться твої оцінки за виконані роботи"
        />
      ) : (
        <div className="space-y-3">
          {filteredGrades.map((grade) => {
            const percent = Math.round((grade.score / grade.max_score) * 100);
            const isGood = percent >= 75;
            const isMedium = percent >= 50 && percent < 75;

            return (
              <Card key={grade.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted">
                      <span className={`text-lg font-bold ${isGood ? "text-success" : isMedium ? "text-warning" : "text-destructive"}`}>
                        {grade.score}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={workTypeColors[grade.work_type] || ""}>
                          {workTypeLabels[grade.work_type] || grade.work_type}
                        </Badge>
                        {grade.group_name && (
                          <span className="text-xs text-muted-foreground">{grade.group_name}</span>
                        )}
                      </div>
                      {grade.comment && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{grade.comment}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isGood ? "text-success" : isMedium ? "text-warning" : "text-destructive"}`}>
                        {percent}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(grade.created_at), "d MMM", { locale: uk })}
                      </p>
                    </div>
                  </div>
                  <Progress value={percent} className="h-1.5 mt-3" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
