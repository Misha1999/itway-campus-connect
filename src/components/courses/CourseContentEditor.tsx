import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Trash2,
  GripVertical,
  BookOpen,
  FileCheck,
  ClipboardList,
  FolderKanban,
  X,
  Check,
} from "lucide-react";
import type { Course, CourseModule, Lesson } from "@/hooks/use-courses";

const LESSON_TYPES = [
  { value: 'lesson', label: 'Заняття', icon: BookOpen, color: 'bg-primary/10 text-primary' },
  { value: 'homework', label: 'Домашнє завдання', icon: FileCheck, color: 'bg-amber-500/10 text-amber-600' },
  { value: 'test', label: 'Тест', icon: ClipboardList, color: 'bg-destructive/10 text-destructive' },
  { value: 'project', label: 'Проект', icon: FolderKanban, color: 'bg-emerald-500/10 text-emerald-600' },
] as const;

interface CourseContentEditorProps {
  course: Course;
  onCreateModule: (name: string, description?: string) => Promise<void>;
  onUpdateModule: (moduleId: string, name: string) => Promise<void>;
  onDeleteModule: (moduleId: string) => Promise<void>;
  onCreateLesson: (moduleId: string, name: string, type?: string) => Promise<void>;
  onUpdateLesson: (lessonId: string, name: string) => Promise<void>;
  onDeleteLesson: (lessonId: string) => Promise<void>;
  onOpenLesson?: (lesson: Lesson) => void;
  onRefresh: () => Promise<void>;
}

export function CourseContentEditor({
  course,
  onCreateModule,
  onUpdateModule,
  onDeleteModule,
  onCreateLesson,
  onUpdateLesson,
  onDeleteLesson,
  onOpenLesson,
  onRefresh,
}: CourseContentEditorProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [newModuleName, setNewModuleName] = useState("");
  const [newLessonName, setNewLessonName] = useState("");
  const [addingToModule, setAddingToModule] = useState<string | null>(null);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'module' | 'lesson'; id: string; name: string } | null>(null);

  // Expand all modules on load
  useEffect(() => {
    if (course.modules) {
      setExpandedModules(new Set(course.modules.map(m => m.id)));
    }
  }, [course.modules]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleAddModule = async () => {
    if (!newModuleName.trim()) return;
    await onCreateModule(newModuleName.trim());
    setNewModuleName("");
    setIsAddingModule(false);
    await onRefresh();
  };

  const handleAddLesson = async (moduleId: string, type: string = 'lesson') => {
    if (!newLessonName.trim()) return;
    await onCreateLesson(moduleId, newLessonName.trim(), type);
    setNewLessonName("");
    setAddingToModule(null);
    await onRefresh();
  };

  const handleSaveModuleEdit = async (moduleId: string) => {
    if (!editValue.trim()) return;
    await onUpdateModule(moduleId, editValue.trim());
    setEditingModule(null);
    setEditValue("");
    await onRefresh();
  };

  const handleSaveLessonEdit = async (lessonId: string) => {
    if (!editValue.trim()) return;
    await onUpdateLesson(lessonId, editValue.trim());
    setEditingLesson(null);
    setEditValue("");
    await onRefresh();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'module') {
      await onDeleteModule(deleteConfirm.id);
    } else {
      await onDeleteLesson(deleteConfirm.id);
    }
    setDeleteConfirm(null);
    await onRefresh();
  };

  const getLessonTypeInfo = (lesson: Lesson) => {
    const lt = (lesson as any).lesson_type || 'lesson';
    return LESSON_TYPES.find(t => t.value === lt) || LESSON_TYPES[0];
  };

  const modules = course.modules || [];

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {modules.length}/{modules.length} тем • {modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0)} уроків
        </p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsAddingModule(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Додати тему
        </Button>
      </div>

      {/* Add module input */}
      {isAddingModule && (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Назва теми..."
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}
                autoFocus
              />
              <Button size="sm" onClick={handleAddModule}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAddingModule(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modules list */}
      <div className="space-y-3">
        {modules.map((module, moduleIndex) => (
          <Card key={module.id} className="overflow-hidden">
            <Collapsible
              open={expandedModules.has(module.id)}
              onOpenChange={() => toggleModule(module.id)}
            >
              <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4 cursor-grab" />
                    <span className="font-medium text-foreground">{moduleIndex + 1}</span>
                  </div>
                  
                  {editingModule === module.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveModuleEdit(module.id);
                          if (e.key === 'Escape') setEditingModule(null);
                        }}
                        autoFocus
                        className="h-8"
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveModuleEdit(module.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingModule(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="flex-1 text-base font-medium">
                        {module.name}
                      </CardTitle>
                      
                      <Badge variant="secondary" className="text-xs">
                        {module.lessons?.length || 0} уроків
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingModule(module.id);
                            setEditValue(module.name);
                          }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Перейменувати
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteConfirm({ type: 'module', id: module.id, name: module.name })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Видалити
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {expandedModules.has(module.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </>
                  )}
                </div>
              </CardHeader>
              
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  <div className="pl-8 space-y-2">
                    {/* Lessons */}
                    {module.lessons?.map((lesson, lessonIndex) => {
                      const typeInfo = getLessonTypeInfo(lesson);
                      const TypeIcon = typeInfo.icon;
                      
                      return (
                        <div 
                          key={lesson.id}
                          className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 group cursor-pointer border border-transparent hover:border-border transition-colors"
                          onClick={() => onOpenLesson?.(lesson)}
                        >
                          <span className="text-sm text-muted-foreground w-12 shrink-0">
                            {moduleIndex + 1}.{lessonIndex + 1}
                          </span>
                          
                          {editingLesson === lesson.id ? (
                            <div className="flex-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveLessonEdit(lesson.id);
                                  if (e.key === 'Escape') setEditingLesson(null);
                                }}
                                autoFocus
                                className="h-8"
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleSaveLessonEdit(lesson.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingLesson(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-sm block">{lesson.name}</span>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${lesson.material_id ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                                    <BookOpen className="h-3 w-3" />
                                    Заняття
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                    <FileCheck className="h-3 w-3" />
                                    Завдання
                                  </span>
                                </div>
                              </div>
                              
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingLesson(lesson.id);
                                    setEditValue(lesson.name);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => setDeleteConfirm({ type: 'lesson', id: lesson.id, name: lesson.name })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Add lesson input */}
                    {addingToModule === module.id ? (
                      <div className="flex gap-2 pt-2">
                        <Input
                          placeholder="Назва уроку..."
                          value={newLessonName}
                          onChange={(e) => setNewLessonName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddLesson(module.id)}
                          autoFocus
                          className="h-8"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" disabled={!newLessonName.trim()}>
                              <Check className="h-4 w-4 mr-1" />
                              Додати
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {LESSON_TYPES.map((type) => (
                              <DropdownMenuItem 
                                key={type.value}
                                onClick={() => handleAddLesson(module.id, type.value)}
                              >
                                <type.icon className="h-4 w-4 mr-2" />
                                {type.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="sm" variant="ghost" onClick={() => setAddingToModule(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-muted-foreground hover:text-foreground mt-2"
                        onClick={() => setAddingToModule(module.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Додати урок
                      </Button>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {modules.length === 0 && !isAddingModule && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Зміст курсу порожній</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Додайте теми та уроки для побудови структури курсу
            </p>
            <Button onClick={() => setIsAddingModule(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Додати першу тему
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Видалити {deleteConfirm?.type === 'module' ? 'тему' : 'урок'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'module' 
                ? `Тема "${deleteConfirm?.name}" та всі її уроки будуть видалені назавжди.`
                : `Урок "${deleteConfirm?.name}" буде видалено назавжди.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
