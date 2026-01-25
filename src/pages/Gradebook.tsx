import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Save, ChevronLeft, ChevronRight } from "lucide-react";

interface Student {
  id: string;
  name: string;
}

interface LessonDate {
  id: string;
  date: string;
  title: string;
}

interface AttendanceRecord {
  studentId: string;
  lessonId: string;
  status: "present" | "absent" | "late" | "excused" | null;
}

interface GradeRecord {
  studentId: string;
  lessonId: string;
  grade: number | null;
  hwStatus: "submitted" | "pending" | "late" | "not_submitted" | null;
}

// Demo data
const demoStudents: Student[] = [
  { id: "1", name: "Олександр Коваль" },
  { id: "2", name: "Марія Шевченко" },
  { id: "3", name: "Іван Бондаренко" },
  { id: "4", name: "Анна Петренко" },
  { id: "5", name: "Дмитро Сидоренко" },
  { id: "6", name: "Софія Мельник" },
];

const demoLessons: LessonDate[] = [
  { id: "1", date: "18.01", title: "Змінні та типи" },
  { id: "2", date: "25.01", title: "Умови if-else" },
  { id: "3", date: "01.02", title: "Цикли" },
  { id: "4", date: "08.02", title: "Функції" },
];

const attendanceStatuses = {
  present: { label: "П", class: "bg-success/10 text-success border-success/30" },
  absent: { label: "Н", class: "bg-destructive/10 text-destructive border-destructive/30" },
  late: { label: "З", class: "bg-warning/10 text-warning border-warning/30" },
  excused: { label: "В", class: "bg-muted text-muted-foreground border-muted" },
};

const hwStatuses = {
  submitted: { label: "✓", class: "text-success" },
  pending: { label: "⏳", class: "text-warning" },
  late: { label: "!", class: "text-destructive" },
  not_submitted: { label: "—", class: "text-muted-foreground" },
};

function GradebookTable() {
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord["status"]>>({
    "1-1": "present", "1-2": "present", "1-3": "absent", "1-4": "present",
    "2-1": "present", "2-2": "late", "2-3": "present", "2-4": "present",
    "3-1": "present", "3-2": "present", "3-3": "present", "3-4": "excused",
    "4-1": "absent", "4-2": "present", "4-3": "present", "4-4": "present",
    "5-1": "present", "5-2": "present", "5-3": "late", "5-4": "present",
    "6-1": "present", "6-2": "present", "6-3": "present", "6-4": "present",
  });

  const [grades, setGrades] = useState<Record<string, number | null>>({
    "1-1": 10, "1-2": 11, "1-3": null, "1-4": 9,
    "2-1": 8, "2-2": 9, "2-3": 10, "2-4": null,
    "3-1": 12, "3-2": 11, "3-3": 10, "3-4": null,
    "4-1": null, "4-2": 7, "4-3": 8, "4-4": 9,
    "5-1": 9, "5-2": 10, "5-3": 8, "5-4": null,
    "6-1": 11, "6-2": 12, "6-3": 11, "6-4": 10,
  });

  const [hwStatus] = useState<Record<string, string>>({
    "1-1": "submitted", "1-2": "submitted", "1-3": "not_submitted", "1-4": "pending",
    "2-1": "submitted", "2-2": "late", "2-3": "submitted", "2-4": "pending",
    "3-1": "submitted", "3-2": "submitted", "3-3": "submitted", "3-4": "pending",
    "4-1": "not_submitted", "4-2": "submitted", "4-3": "submitted", "4-4": "pending",
    "5-1": "submitted", "5-2": "submitted", "5-3": "late", "5-4": "pending",
    "6-1": "submitted", "6-2": "submitted", "6-3": "submitted", "6-4": "pending",
  });

  const cycleAttendance = (key: string) => {
    const order: AttendanceRecord["status"][] = ["present", "absent", "late", "excused", null];
    const current = attendance[key] || null;
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    setAttendance({ ...attendance, [key]: order[nextIndex] });
  };

  const calculateAverage = (studentId: string) => {
    const studentGrades = demoLessons
      .map((lesson) => grades[`${studentId}-${lesson.id}`])
      .filter((g): g is number => g !== null);
    if (studentGrades.length === 0) return "—";
    return (studentGrades.reduce((a, b) => a + b, 0) / studentGrades.length).toFixed(1);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-3 font-medium text-muted-foreground border-b sticky left-0 bg-muted/50 min-w-[180px]">
              Студент
            </th>
            {demoLessons.map((lesson) => (
              <th key={lesson.id} className="text-center p-3 font-medium text-muted-foreground border-b min-w-[80px]">
                <div className="text-xs">{lesson.date}</div>
                <div className="text-xs font-normal truncate max-w-[80px]" title={lesson.title}>
                  {lesson.title}
                </div>
              </th>
            ))}
            <th className="text-center p-3 font-medium text-muted-foreground border-b min-w-[60px]">
              Сер.
            </th>
          </tr>
        </thead>
        <tbody>
          {demoStudents.map((student) => (
            <tr key={student.id} className="hover:bg-muted/30">
              <td className="p-3 border-b sticky left-0 bg-background">
                <span className="font-medium text-foreground">{student.name}</span>
              </td>
              {demoLessons.map((lesson) => {
                const key = `${student.id}-${lesson.id}`;
                const att = attendance[key];
                const grade = grades[key];
                const hw = hwStatus[key] as keyof typeof hwStatuses;

                return (
                  <td key={lesson.id} className="p-2 border-b text-center">
                    <div className="flex flex-col items-center gap-1">
                      {/* Attendance */}
                      <button
                        onClick={() => cycleAttendance(key)}
                        className={cn(
                          "w-7 h-7 rounded border text-xs font-medium transition-colors",
                          att ? attendanceStatuses[att].class : "bg-background border-border text-muted-foreground"
                        )}
                      >
                        {att ? attendanceStatuses[att].label : "?"}
                      </button>
                      {/* Grade */}
                      <input
                        type="text"
                        value={grade ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = parseInt(val);
                          setGrades({
                            ...grades,
                            [key]: val === "" ? null : isNaN(num) ? grades[key] : Math.min(12, Math.max(1, num))
                          });
                        }}
                        className="w-10 h-6 text-center text-sm border rounded bg-background focus:ring-1 focus:ring-primary outline-none"
                        placeholder="—"
                      />
                      {/* HW Status */}
                      {hw && (
                        <span className={cn("text-xs", hwStatuses[hw].class)}>
                          ДЗ {hwStatuses[hw].label}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
              <td className="p-3 border-b text-center font-medium text-foreground">
                {calculateAverage(student.id)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GradebookPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Журнал" 
        description="Оцінки та відвідуваність"
      >
        <Select defaultValue="py-2024-a">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Група" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="py-2024-a">PY-2024-A</SelectItem>
            <SelectItem value="wd-2024-b">WD-2024-B</SelectItem>
            <SelectItem value="rb-2024-c">RB-2024-C</SelectItem>
          </SelectContent>
        </Select>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Зберегти
        </Button>
      </PageHeader>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground">Відвідуваність:</span>
            {Object.entries(attendanceStatuses).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1">
                <span className={cn("w-5 h-5 rounded flex items-center justify-center text-xs font-medium", value.class)}>
                  {value.label}
                </span>
                <span className="text-muted-foreground">
                  {key === "present" ? "Присутній" : key === "absent" ? "Відсутній" : key === "late" ? "Запізнився" : "Поважна"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gradebook table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg font-medium">Python Advanced — PY-2024-A</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Січень 2025</span>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <GradebookTable />
        </CardContent>
      </Card>
    </div>
  );
}
