import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LessonSlot {
  id: string;
  campus_id: string;
  study_program_id: string | null;
  name: string | null;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  is_global: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  program_name?: string;
}

export interface LessonSlotFormData {
  name: string;
  is_global: boolean;
  study_program_id: string | null;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  is_active: boolean;
}

const DAY_NAMES = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];

export function getDayName(day: number) {
  return DAY_NAMES[day] || "";
}

export function formatTime(time: string) {
  return time.slice(0, 5);
}

export function formatEndTime(startTime: string, durationMinutes: number) {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export function useLessonSlots(campusId: string) {
  const [slots, setSlots] = useState<LessonSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lesson_slots")
      .select("*, study_programs:study_program_id(name)")
      .eq("campus_id", campusId)
      .order("day_of_week")
      .order("start_time");

    if (error) {
      console.error("Error fetching slots:", error);
      toast.error("Помилка завантаження слотів");
      setLoading(false);
      return;
    }

    const formatted: LessonSlot[] = (data || []).map((s: any) => ({
      id: s.id,
      campus_id: s.campus_id,
      study_program_id: s.study_program_id,
      name: s.name,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      duration_minutes: s.duration_minutes,
      is_global: s.is_global,
      is_active: s.is_active,
      created_at: s.created_at,
      updated_at: s.updated_at,
      program_name: s.study_programs?.name || undefined,
    }));

    setSlots(formatted);
    setLoading(false);
  }, [campusId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const createSlot = async (data: LessonSlotFormData) => {
    const { error } = await supabase.from("lesson_slots").insert({
      campus_id: campusId,
      name: data.name || null,
      is_global: data.is_global,
      study_program_id: data.is_global ? null : data.study_program_id,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      duration_minutes: data.duration_minutes,
      is_active: data.is_active,
    });

    if (error) {
      console.error("Error creating slot:", error);
      const msg = error.message.includes("перетинається")
        ? error.message
        : "Помилка створення слота";
      toast.error(msg);
      return false;
    }

    toast.success("Слот створено");
    await fetchSlots();
    return true;
  };

  const updateSlot = async (id: string, data: LessonSlotFormData) => {
    const { error } = await supabase
      .from("lesson_slots")
      .update({
        name: data.name || null,
        is_global: data.is_global,
        study_program_id: data.is_global ? null : data.study_program_id,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        duration_minutes: data.duration_minutes,
        is_active: data.is_active,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating slot:", error);
      const msg = error.message.includes("перетинається")
        ? error.message
        : "Помилка оновлення слота";
      toast.error(msg);
      return false;
    }

    toast.success("Слот оновлено");
    await fetchSlots();
    return true;
  };

  const toggleSlotActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("lesson_slots")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      toast.error("Помилка оновлення");
      return false;
    }

    toast.success(isActive ? "Слот активовано" : "Слот деактивовано");
    await fetchSlots();
    return true;
  };

  const deleteSlot = async (id: string) => {
    const { error } = await supabase.from("lesson_slots").delete().eq("id", id);

    if (error) {
      toast.error("Помилка видалення слота");
      return false;
    }

    toast.success("Слот видалено");
    await fetchSlots();
    return true;
  };

  return { slots, loading, createSlot, updateSlot, toggleSlotActive, deleteSlot, fetchSlots };
}
