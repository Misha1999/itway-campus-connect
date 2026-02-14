import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  FileCheck,
  ClipboardList,
  FolderKanban,
  Plus,
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
  homework_material_id: string | null;
  test_material_id: string | null;
  project_material_id: string | null;
  module_id: string;
}

interface MaterialInfo {
  id: string;
  title: string;
  status: string;
}

const ACTIVITY_SECTIONS = [
  {
    key: "lesson",
    materialField: "material_id" as const,
    label: "Заняття",
    description: "Матеріал уроку для проведення заняття",
    icon: BookOpen,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "homework",
    materialField: "homework_material_id" as const,
    label: "Домашнє завдання",
    description: "Завдання для самостійної роботи студентів",
    icon: FileCheck,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
  {
    key: "test",
    materialField: "test_material_id" as const,
    label: "Тест",
    description: "Тестування знань по темі уроку",
    icon: ClipboardList,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    key: "project",
    materialField: "project_material_id" as const,
    label: "Проєкт",
    description: "Довгострокове практичне завдання",
    icon: FolderKanban,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
  },
] as const;

type MaterialFieldKey = typeof ACTIVITY_SECTIONS[number]['materialField'];

export default function LessonDetailPage() {
  const navigate = useNavigate();
  const { courseId, lessonId } = useParams();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [breadcrumb, setBreadcrumb] = useState("");
  const [materials, setMaterials] = useState<Record<string, MaterialInfo>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!lessonId || !courseId) return;
    setLoading(true);

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

    const ld = lessonData as any;
    const lessonObj: LessonData = {
      id: ld.id,
      name: ld.name,
      description: ld.description,
      order_index: ld.order_index,
      duration_minutes: ld.duration_minutes,
      lesson_type: ld.lesson_type || "lesson",
      material_id: ld.material_id || null,
      homework_material_id: ld.homework_material_id || null,
      test_material_id: ld.test_material_id || null,
      project_material_id: ld.project_material_id || null,
      module_id: ld.module_id,
    };
    setLesson(lessonObj);

    // Fetch breadcrumb
    const [moduleRes, courseRes] = await Promise.all([
      supabase.from("modules").select("name").eq("id", ld.module_id).single(),
      supabase.from("courses").select("name").eq("id", courseId).single(),
    ]);
    if (courseRes.data && moduleRes.data) {
      setBreadcrumb(`${courseRes.data.name} → ${moduleRes.data.name}`);
    }

    // Fetch all linked materials
    const materialIds = [
      ld.material_id,
      ld.homework_material_id,
      ld.test_material_id,
      ld.project_material_id,
    ].filter(Boolean) as string[];

    if (materialIds.length > 0) {
      const { data: matData } = await supabase
        .from("materials")
        .select("id, title, status")
        .in("id", materialIds);
      if (matData) {
        const map: Record<string, MaterialInfo> = {};
        matData.forEach((m) => { map[m.id] = m; });
        setMaterials(map);
      }
    }

    setLoading(false);
  }, [lessonId, courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateMaterial = async (section: typeof ACTIVITY_SECTIONS[number]) => {
    if (!lesson) return;

    const { data: newMaterial, error } = await supabase
      .from("materials")
      .insert({
        title: `${lesson.name} — ${section.label}`,
        content_type: "lesson",
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      toast.error("Помилка створення матеріалу");
      return;
    }

    // Link material to the correct field
    const { error: updateError } = await supabase
      .from("lessons")
      .update({ [section.materialField]: newMaterial.id })
      .eq("id", lesson.id);

    if (updateError) {
      toast.error("Помилка прив'язки матеріалу");
      return;
    }

    navigate(`/library/${newMaterial.id}/edit`);
  };

  const handleOpenMaterial = (materialId: string) => {
    navigate(`/library/${materialId}/edit`);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Завантаження..." description="" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
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
      <PageHeader title={lesson.name} description={breadcrumb}>
        <Button variant="ghost" onClick={() => navigate(`/library/courses/${courseId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад до курсу
        </Button>
      </PageHeader>

      <div className="space-y-4">
        {ACTIVITY_SECTIONS.map((section) => {
          const Icon = section.icon;
          const materialId = lesson[section.materialField];
          const mat = materialId ? materials[materialId] : null;

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
                  {mat && (
                    <Badge variant="secondary" className="text-xs">
                      {mat.status === "published" ? "Опубліковано" : "Чернетка"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                {mat ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{mat.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Блочний матеріал • {mat.status === "published" ? "Опубліковано" : "Чернетка"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpenMaterial(mat.id)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Редагувати
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-center">
                    <Icon className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {section.label} ще не створено
                    </p>
                    <Button size="sm" onClick={() => handleCreateMaterial(section)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Створити {section.label.toLowerCase()}
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
