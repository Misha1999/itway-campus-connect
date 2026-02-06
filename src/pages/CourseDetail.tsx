import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, Save, Settings, BookOpen, Layers, 
  GraduationCap, Loader2 
} from "lucide-react";
import { useCourses, type Course, type Lesson } from "@/hooks/use-courses";
import { CourseContentEditor } from "@/components/courses/CourseContentEditor";
import { toast } from "sonner";

const LEVELS = [
  { value: 'beginner', label: 'Початковий' },
  { value: 'intermediate', label: 'Середній' },
  { value: 'advanced', label: 'Просунутий' },
];

export default function CourseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { 
    fetchCourseWithContent, 
    updateCourse,
    createModule,
    updateModule,
    deleteModule,
    createLesson,
    updateLesson,
    deleteLesson,
  } = useCourses();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const loadCourse = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await fetchCourseWithContent(id);
    if (data) {
      setCourse(data);
      setName(data.name);
      setDescription(data.description || "");
      setLevel(data.level || "");
    }
    setLoading(false);
  }, [id, fetchCourseWithContent]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const handleSaveSettings = async () => {
    if (!id || !name.trim()) return;
    
    setSaving(true);
    const success = await updateCourse(id, {
      name: name.trim(),
      description: description.trim() || null,
      level: level || null,
    });
    
    if (success) {
      setHasChanges(false);
      await loadCourse();
    }
    setSaving(false);
  };

  const handleCreateModule = async (moduleName: string, moduleDescription?: string) => {
    if (!id) return;
    await createModule({
      course_id: id,
      name: moduleName,
      description: moduleDescription,
    });
  };

  const handleUpdateModule = async (moduleId: string, moduleName: string) => {
    await updateModule(moduleId, { name: moduleName });
  };

  const handleDeleteModule = async (moduleId: string) => {
    await deleteModule(moduleId);
  };

  const handleCreateLesson = async (moduleId: string, lessonName: string, lessonType?: string) => {
    await createLesson({
      module_id: moduleId,
      name: lessonName,
    });
  };

  const handleUpdateLesson = async (lessonId: string, lessonName: string) => {
    await updateLesson(lessonId, { name: lessonName });
  };

  const handleDeleteLesson = async (lessonId: string) => {
    await deleteLesson(lessonId);
  };

  const handleOpenLesson = (lesson: Lesson) => {
    // Navigate to material editor for this lesson
    // For now, just show a toast
    toast.info(`Відкрити урок: ${lesson.name}`);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Завантаження..." description="">
          <Skeleton className="h-10 w-24" />
        </PageHeader>
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <PageHeader title="Курс не знайдено" description="">
          <Button variant="ghost" onClick={() => navigate('/library')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </PageHeader>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <PageHeader
        title={course.name}
        description="Редагування змісту курсу"
      >
        <Button variant="ghost" onClick={() => navigate('/library')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{course.modules?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Тем</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">
                {course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">Уроків</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">
                {course.level === 'beginner' ? 'Початковий' : 
                 course.level === 'intermediate' ? 'Середній' : 
                 course.level === 'advanced' ? 'Просунутий' : '—'}
              </div>
              <p className="text-xs text-muted-foreground">Рівень</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${course.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">
                {course.is_active ? 'Активний' : 'Неактивний'}
              </div>
              <p className="text-xs text-muted-foreground">Статус</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Зміст
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Налаштування
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6">
          <CourseContentEditor
            course={course}
            onCreateModule={handleCreateModule}
            onUpdateModule={handleUpdateModule}
            onDeleteModule={handleDeleteModule}
            onCreateLesson={handleCreateLesson}
            onUpdateLesson={handleUpdateLesson}
            onDeleteLesson={handleDeleteLesson}
            onOpenLesson={handleOpenLesson}
            onRefresh={loadCourse}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Налаштування курсу</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Назва курсу *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
                  placeholder="Назва курсу"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Опис</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setHasChanges(true); }}
                  placeholder="Опис курсу"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Рівень</Label>
                <Select value={level} onValueChange={(v) => { setLevel(v); setHasChanges(true); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть рівень" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={!hasChanges || !name.trim() || saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Зберегти
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
