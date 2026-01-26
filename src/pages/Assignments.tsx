import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FileText, Clock, Users, ChevronRight, Calendar } from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  group: string;
  course: string;
  deadline: string;
  maxScore: number;
  status: string;
  submittedCount: number;
  totalCount: number;
  type: string;
}

// Demo data
const demoAssignments: Assignment[] = [
  { id: "1", title: "Проєкт: Калькулятор на Python", group: "PY-2024-A", course: "Python Advanced", deadline: "25.01.2025", maxScore: 100, status: "published", submittedCount: 8, totalCount: 12, type: "project" },
  { id: "2", title: "HTML/CSS Портфоліо", group: "WD-2024-B", course: "Web Design", deadline: "26.01.2025", maxScore: 50, status: "published", submittedCount: 5, totalCount: 10, type: "homework" },
  { id: "3", title: "Гра в Roblox Studio", group: "RB-2024-C", course: "Roblox Studio", deadline: "28.01.2025", maxScore: 100, status: "published", submittedCount: 3, totalCount: 8, type: "project" },
  { id: "4", title: "Тест: Основи Python", group: "PY-2024-A", course: "Python Advanced", deadline: "30.01.2025", maxScore: 12, status: "draft", submittedCount: 0, totalCount: 12, type: "test" },
  { id: "5", title: "Практика: Flexbox", group: "WD-2024-B", course: "Web Design", deadline: "27.01.2025", maxScore: 20, status: "graded", submittedCount: 10, totalCount: 10, type: "practice" },
];

const typeLabels: Record<string, string> = {
  homework: "ДЗ",
  project: "Проєкт",
  practice: "Практика",
  test: "Тест",
};

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const progress = (assignment.submittedCount / assignment.totalCount) * 100;
  const needsReview = assignment.submittedCount > 0 && assignment.status === "published";

  return (
    <Card className="hover:shadow-sm transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-accent">
            <FileText className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-foreground">{assignment.title}</h3>
                <p className="text-sm text-muted-foreground">{assignment.group} • {assignment.course}</p>
              </div>
              <StatusBadge status={assignment.status} />
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{assignment.deadline}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{assignment.submittedCount}/{assignment.totalCount} здано</span>
              </div>
              <Badge variant="outline">{typeLabels[assignment.type]}</Badge>
              {needsReview && (
                <Badge className="bg-warning/10 text-warning border-warning/30">
                  На перевірці: {assignment.submittedCount}
                </Badge>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filteredAssignments = demoAssignments.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.group.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === "all" || 
      (tab === "review" && a.submittedCount > 0 && a.status === "published") ||
      (tab === "draft" && a.status === "draft") ||
      (tab === "graded" && a.status === "graded");
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Домашні завдання" 
        description="Створення та перевірка завдань"
      >
        <Button onClick={() => navigate("/assignments/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Нове завдання
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">23</div>
            <p className="text-sm text-muted-foreground">На перевірці</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">5</div>
            <p className="text-sm text-muted-foreground">Прострочені</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">89%</div>
            <p className="text-sm text-muted-foreground">Здано вчасно</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold text-foreground">3</div>
            <p className="text-sm text-muted-foreground">Чернетки</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Пошук завдань..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Група" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі групи</SelectItem>
            <SelectItem value="py-2024-a">PY-2024-A</SelectItem>
            <SelectItem value="wd-2024-b">WD-2024-B</SelectItem>
            <SelectItem value="rb-2024-c">RB-2024-C</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Всі</TabsTrigger>
          <TabsTrigger value="review">На перевірці</TabsTrigger>
          <TabsTrigger value="draft">Чернетки</TabsTrigger>
          <TabsTrigger value="graded">Оцінено</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-6">
          {filteredAssignments.length > 0 ? (
            <div className="space-y-3">
              {filteredAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="Завдань не знайдено"
              description="Створіть нове завдання для ваших студентів"
              action={{
                label: "Створити завдання",
                onClick: () => navigate("/assignments/create"),
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
