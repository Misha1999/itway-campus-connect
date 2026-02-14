import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  FileCheck,
  ClipboardList,
  FolderKanban,
  Plus,
  ExternalLink,
  Pencil,
  FileText,
} from "lucide-react";

interface LessonData {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  duration_minutes: number | null;
  lesson_type: string;
  material_id: string | null;
  module_id: string;
}

interface ModuleData {
  id: string;
  name: string;
  course_id: string;
}

interface CourseData {
  id: string;
  name: string;
}

const ACTIVITY_SECTIONS = [
  {
    key: "lesson",
    label: "Заняття",
    description: "Матеріал уроку для проведення заняття",
    icon: BookOpen,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "homework",
    label: "Домашнє завдання",
    description: "Завдання для самостійної роботи студентів",
    icon: FileCheck,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  {
    key: "test",
    label: "Тест",
    description: "Тестування знань по темі уроку",
    icon: ClipboardList,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    key: "project",
    label: "Проєкт",
    description: "Довгострокове практичне завдання",
    icon: FolderKanban,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
  },
] as const;

export default function LessonDetailPage() {
  const navigate = useNavigate();
  const { courseId, lessonId } = useParams();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [module, setModule] = useState<ModuleData | null>(null);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [material, setMaterial] = useState<{ id: string; title: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!lessonId || !courseId) return;
    setLoading(true);

    // Fetch lesson
    const { data: lessonData, error: lessonError } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lessonData) {
      toast.error("Урок не знайдено");
      setLoading(false);
      return;
    }

    setLesson(lessonData as LessonData);

    // Fetch module and course in parallel
    const [moduleRes, courseRes] = await Promise.all([
      supabase.from("modules").select("id, name, course_id").eq("id", lessonData.module_id).single(),
      supabase.from("courses").select("id, name").eq("id", courseId).single(),
    ]);

    if (moduleRes.data) setModule(moduleRes.data);
    if (courseRes.data) setCourse(courseRes.data);

    // Fetch linked material if exists
    if (lessonData.material_id) {
      const { data: matData } = await supabase
        .from("materials")
        .select("id, title, status")
        .eq("id", lessonData.material_id)
        .single();
      if (matData) setMaterial(matData);
    }

    setLoading(false);
  }, [lessonId, courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateMaterial = async (activityType: string) => {
    if (!lesson) return;

    // Create a new material linked to this lesson
    const { data: newMaterial, error } = await supabase
      .from("materials")
      .insert({
        title: `${lesson.name} — ${ACTIVITY_SECTIONS.find(s => s.key === activityType)?.label || activityType}`,
        content_type: "lesson",
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      toast.error("Помилка створення матеріалу");
      return;
    }

    // Link material to lesson
    await supabase
      .from("lessons")
      .update({ material_id: newMaterial.id })
      .eq("id", lesson.id);

    // Navigate to material editor
    navigate(`/library/${newMaterial.id}/edit`);
  };

  const handleOpenMaterial = () => {
    if (material) {
      navigate(`/library/${material.id}/edit`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Завантаження..." description="" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="space-y-6">
        <PageHeader title="Урок не знайдено" description="">
          <Button variant="ghost" onClick={() => navigate(`/library/courses/${courseId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад до курсу
          </Button>
        </PageHeader>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <PageHeader
        title={lesson.name}
        description={
          course && module
            ? `${course.name} → ${module.name}`
            : ""
        }
      >
        <Button variant="ghost" onClick={() => navigate(`/library/courses/${courseId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад до курсу
        </Button>
      </PageHeader>

      {/* Activity sections */}
      <div className="space-y-4">
        {ACTIVITY_SECTIONS.map((section) => {
          const Icon = section.icon;
          const hasMaterial = section.key === "lesson" && material;

          return (
            <Card key={section.key} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${section.bgColor}`}>
                      <Icon className={`h-5 w-5 ${section.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{section.label}</CardTitle>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  {hasMaterial && (
                    <Badge variant="secondary" className="text-xs">
                      {material.status === "published" ? "Опубліковано" : "Чернетка"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                {section.key === "lesson" && material ? (
                  /* Material is linked */
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{material.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Блочний матеріал • {material.status === "published" ? "Опубліковано" : "Чернетка"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleOpenMaterial}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Редагувати
                    </Button>
                  </div>
                ) : section.key === "lesson" ? (
                  /* No material yet for lesson */
                  <div className="flex flex-col items-center py-6 text-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Матеріал заняття ще не створено
                    </p>
                    <Button size="sm" onClick={() => handleCreateMaterial("lesson")}>
                      <Plus className="h-4 w-4 mr-1" />
                      Створити матеріал
                    </Button>
                  </div>
                ) : section.key === "homework" ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <FileCheck className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Домашнє завдання ще не додано
                    </p>
                    <Button size="sm" onClick={() => handleCreateMaterial("homework")}>
                      <Plus className="h-4 w-4 mr-1" />
                      Створити завдання
                    </Button>
                  </div>
                ) : section.key === "test" ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Тест ще не створено
                    </p>
                    <Button size="sm" onClick={() => handleCreateMaterial("test")}>
                      <Plus className="h-4 w-4 mr-1" />
                      Створити тест
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center">
                    <FolderKanban className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Проєкт ще не створено
                    </p>
                    <Button size="sm" onClick={() => handleCreateMaterial("project")}>
                      <Plus className="h-4 w-4 mr-1" />
                      Створити проєкт
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
