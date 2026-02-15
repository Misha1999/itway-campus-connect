import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Classroom {
  id: string;
  campus_id: string;
  name: string;
  capacity: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassroomFormData {
  name: string;
  capacity: number | null;
  notes: string | null;
  is_active: boolean;
}

export function useClassrooms(campusId: string) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClassrooms = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("classrooms")
      .select("*")
      .eq("campus_id", campusId)
      .order("name");

    if (error) {
      console.error("Error fetching classrooms:", error);
      toast.error("Помилка завантаження аудиторій");
    }
    setClassrooms((data as Classroom[]) || []);
    setLoading(false);
  }, [campusId]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const createClassroom = async (data: ClassroomFormData) => {
    const { error } = await supabase.from("classrooms").insert({
      campus_id: campusId,
      name: data.name,
      capacity: data.capacity,
      notes: data.notes,
      is_active: data.is_active,
    });

    if (error) {
      toast.error("Помилка створення аудиторії");
      return false;
    }
    toast.success("Аудиторію створено");
    await fetchClassrooms();
    return true;
  };

  const updateClassroom = async (id: string, data: ClassroomFormData) => {
    const { error } = await supabase
      .from("classrooms")
      .update({
        name: data.name,
        capacity: data.capacity,
        notes: data.notes,
        is_active: data.is_active,
      })
      .eq("id", id);

    if (error) {
      toast.error("Помилка оновлення аудиторії");
      return false;
    }
    toast.success("Аудиторію оновлено");
    await fetchClassrooms();
    return true;
  };

  const deleteClassroom = async (id: string) => {
    const { error } = await supabase.from("classrooms").delete().eq("id", id);
    if (error) {
      toast.error("Помилка видалення аудиторії");
      return false;
    }
    toast.success("Аудиторію видалено");
    await fetchClassrooms();
    return true;
  };

  return { classrooms, loading, createClassroom, updateClassroom, deleteClassroom };
}
