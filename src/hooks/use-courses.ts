import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for lessons (activity types)
export type LessonType = 'lesson' | 'homework' | 'test' | 'project';

export interface Lesson {
  id: string;
  module_id: string;
  name: string;
  description: string | null;
  order_index: number;
  duration_minutes: number | null;
  lesson_type?: LessonType; // Extended for activity types
  material_id?: string | null; // Link to material
}

export interface CourseModule {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  order_index: number;
  lessons?: Lesson[];
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  direction_id: string | null;
  direction_name?: string;
  duration_hours: number | null;
  level: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  modules?: CourseModule[];
  modules_count?: number;
  lessons_count?: number;
}

export interface CreateCourseData {
  name: string;
  description?: string | null;
  direction_id?: string | null;
  duration_hours?: number | null;
  level?: string | null;
}

export interface CreateModuleData {
  course_id: string;
  name: string;
  description?: string | null;
  order_index?: number;
}

export interface CreateLessonData {
  module_id: string;
  name: string;
  description?: string | null;
  order_index?: number;
  duration_minutes?: number | null;
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("courses")
      .select(`
        *,
        directions:direction_id (name)
      `)
      .order("name");

    if (error) {
      console.error("Error fetching courses:", error);
      toast.error("Помилка завантаження курсів");
      setLoading(false);
      return;
    }

    // Fetch modules count for each course
    const courseIds = (data || []).map(c => c.id);
    let modulesCountMap: Record<string, number> = {};
    let lessonsCountMap: Record<string, number> = {};

    if (courseIds.length > 0) {
      const { data: modulesData } = await supabase
        .from("modules")
        .select("id, course_id")
        .in("course_id", courseIds);

      if (modulesData) {
        modulesCountMap = modulesData.reduce((acc, m) => {
          acc[m.course_id] = (acc[m.course_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Fetch lessons count
        const moduleIds = modulesData.map(m => m.id);
        if (moduleIds.length > 0) {
          const { data: lessonsData } = await supabase
            .from("lessons")
            .select("id, module_id")
            .in("module_id", moduleIds);

          if (lessonsData) {
            // Map lessons to courses via modules
            const moduleToCoursMap = modulesData.reduce((acc, m) => {
              acc[m.id] = m.course_id;
              return acc;
            }, {} as Record<string, string>);

            lessonsCountMap = lessonsData.reduce((acc, l) => {
              const courseId = moduleToCoursMap[l.module_id];
              if (courseId) {
                acc[courseId] = (acc[courseId] || 0) + 1;
              }
              return acc;
            }, {} as Record<string, number>);
          }
        }
      }
    }

    const formattedCourses: Course[] = (data || []).map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      direction_id: c.direction_id,
      direction_name: (c.directions as { name: string } | null)?.name,
      duration_hours: c.duration_hours,
      level: c.level,
      is_active: c.is_active,
      created_at: c.created_at,
      updated_at: c.updated_at,
      modules_count: modulesCountMap[c.id] || 0,
      lessons_count: lessonsCountMap[c.id] || 0,
    }));

    setCourses(formattedCourses);
    setLoading(false);
  }, []);

  const fetchCourseWithContent = useCallback(async (courseId: string): Promise<Course | null> => {
    const { data: courseData, error } = await supabase
      .from("courses")
      .select(`
        *,
        directions:direction_id (name)
      `)
      .eq("id", courseId)
      .single();

    if (error) {
      console.error("Error fetching course:", error);
      return null;
    }

    // Fetch modules
    const { data: modulesData } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index");

    // Fetch lessons for all modules
    const moduleIds = (modulesData || []).map(m => m.id);
    let lessonsMap: Record<string, Lesson[]> = {};

    if (moduleIds.length > 0) {
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .in("module_id", moduleIds)
        .order("order_index");

      if (lessonsData) {
        lessonsMap = lessonsData.reduce((acc, l) => {
          if (!acc[l.module_id]) {
            acc[l.module_id] = [];
          }
          acc[l.module_id].push({
            id: l.id,
            module_id: l.module_id,
            name: l.name,
            description: l.description,
            order_index: l.order_index,
            duration_minutes: l.duration_minutes,
            lesson_type: (l as any).lesson_type || 'lesson',
            material_id: (l as any).material_id || null,
          });
          return acc;
        }, {} as Record<string, Lesson[]>);
      }
    }

    const modules: CourseModule[] = (modulesData || []).map(m => ({
      id: m.id,
      course_id: m.course_id,
      name: m.name,
      description: m.description,
      order_index: m.order_index,
      lessons: lessonsMap[m.id] || [],
    }));

    return {
      id: courseData.id,
      name: courseData.name,
      description: courseData.description,
      direction_id: courseData.direction_id,
      direction_name: (courseData.directions as { name: string } | null)?.name,
      duration_hours: courseData.duration_hours,
      level: courseData.level,
      is_active: courseData.is_active,
      created_at: courseData.created_at,
      updated_at: courseData.updated_at,
      modules,
    };
  }, []);

  const createCourse = async (courseData: CreateCourseData) => {
    const { data, error } = await supabase
      .from("courses")
      .insert({
        name: courseData.name,
        description: courseData.description || null,
        direction_id: courseData.direction_id || null,
        duration_hours: courseData.duration_hours || null,
        level: courseData.level || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating course:", error);
      toast.error("Помилка створення курсу");
      return null;
    }

    toast.success("Курс створено");
    await fetchCourses();
    return data;
  };

  const updateCourse = async (id: string, courseData: Partial<CreateCourseData>) => {
    const { error } = await supabase
      .from("courses")
      .update({
        ...courseData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating course:", error);
      toast.error("Помилка оновлення курсу");
      return false;
    }

    toast.success("Курс оновлено");
    await fetchCourses();
    return true;
  };

  const deleteCourse = async (id: string) => {
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting course:", error);
      toast.error("Помилка видалення курсу");
      return false;
    }

    toast.success("Курс видалено");
    await fetchCourses();
    return true;
  };

  // Module operations
  const createModule = async (moduleData: CreateModuleData) => {
    // Get current max order_index
    const { data: existingModules } = await supabase
      .from("modules")
      .select("order_index")
      .eq("course_id", moduleData.course_id)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrderIndex = existingModules && existingModules.length > 0 
      ? existingModules[0].order_index + 1 
      : 0;

    const { data, error } = await supabase
      .from("modules")
      .insert({
        course_id: moduleData.course_id,
        name: moduleData.name,
        description: moduleData.description || null,
        order_index: moduleData.order_index ?? nextOrderIndex,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating module:", error);
      toast.error("Помилка створення теми");
      return null;
    }

    toast.success("Тему створено");
    return data;
  };

  const updateModule = async (id: string, moduleData: Partial<CreateModuleData>) => {
    const { error } = await supabase
      .from("modules")
      .update(moduleData)
      .eq("id", id);

    if (error) {
      console.error("Error updating module:", error);
      toast.error("Помилка оновлення теми");
      return false;
    }

    toast.success("Тему оновлено");
    return true;
  };

  const deleteModule = async (id: string) => {
    const { error } = await supabase
      .from("modules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting module:", error);
      toast.error("Помилка видалення теми");
      return false;
    }

    toast.success("Тему видалено");
    return true;
  };

  // Lesson operations
  const createLesson = async (lessonData: CreateLessonData) => {
    // Get current max order_index
    const { data: existingLessons } = await supabase
      .from("lessons")
      .select("order_index")
      .eq("module_id", lessonData.module_id)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrderIndex = existingLessons && existingLessons.length > 0 
      ? existingLessons[0].order_index + 1 
      : 0;

    const { data, error } = await supabase
      .from("lessons")
      .insert({
        module_id: lessonData.module_id,
        name: lessonData.name,
        description: lessonData.description || null,
        order_index: lessonData.order_index ?? nextOrderIndex,
        duration_minutes: lessonData.duration_minutes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating lesson:", error);
      toast.error("Помилка створення уроку");
      return null;
    }

    toast.success("Урок створено");
    return data;
  };

  const updateLesson = async (id: string, lessonData: Partial<CreateLessonData>) => {
    const { error } = await supabase
      .from("lessons")
      .update(lessonData)
      .eq("id", id);

    if (error) {
      console.error("Error updating lesson:", error);
      toast.error("Помилка оновлення уроку");
      return false;
    }

    toast.success("Урок оновлено");
    return true;
  };

  const deleteLesson = async (id: string) => {
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Помилка видалення уроку");
      return false;
    }

    toast.success("Урок видалено");
    return true;
  };

  // Reorder modules
  const reorderModules = async (courseId: string, moduleIds: string[]) => {
    const updates = moduleIds.map((id, index) => ({
      id,
      order_index: index,
    }));

    for (const update of updates) {
      await supabase
        .from("modules")
        .update({ order_index: update.order_index })
        .eq("id", update.id);
    }
  };

  // Reorder lessons
  const reorderLessons = async (moduleId: string, lessonIds: string[]) => {
    const updates = lessonIds.map((id, index) => ({
      id,
      order_index: index,
    }));

    for (const update of updates) {
      await supabase
        .from("lessons")
        .update({ order_index: update.order_index })
        .eq("id", update.id);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    loading,
    fetchCourses,
    fetchCourseWithContent,
    createCourse,
    updateCourse,
    deleteCourse,
    createModule,
    updateModule,
    deleteModule,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderModules,
    reorderLessons,
  };
}
