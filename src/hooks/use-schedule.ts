import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  event_type: EventType;
  is_cancelled: boolean;
  cancelled_reason: string | null;
  online_link: string | null;
  group_id: string;
  group_name?: string;
  teacher_id: string | null;
  teacher_name?: string;
  room_id: string | null;
  room_name?: string;
  lesson_id: string | null;
}

export interface Group {
  id: string;
  name: string;
  campus_id: string;
}

export interface Room {
  id: string;
  name: string;
  campus_id: string;
  capacity: number | null;
}

export interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
}

export function useSchedule(selectedGroupId?: string) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, campus_id")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching groups:", error);
      return;
    }
    setGroups(data || []);
  }, []);

  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, campus_id, capacity")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching rooms:", error);
      return;
    }
    setRooms(data || []);
  }, []);

  const fetchTeachers = useCallback(async () => {
    // Get users with teacher role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "teacher");

    if (roleError) {
      console.error("Error fetching teacher roles:", roleError);
      return;
    }

    if (!roleData || roleData.length === 0) {
      setTeachers([]);
      return;
    }

    const teacherUserIds = roleData.map((r) => r.user_id);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, user_id, full_name")
      .in("user_id", teacherUserIds)
      .eq("status", "active");

    if (profileError) {
      console.error("Error fetching teacher profiles:", profileError);
      return;
    }

    setTeachers(profileData || []);
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    
    let query = supabase
      .from("schedule_events")
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        event_type,
        is_cancelled,
        cancelled_reason,
        online_link,
        group_id,
        teacher_id,
        room_id,
        lesson_id,
        groups:group_id (name),
        rooms:room_id (name)
      `)
      .order("start_time", { ascending: true });

    if (selectedGroupId && selectedGroupId !== "all") {
      query = query.eq("group_id", selectedGroupId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching events:", error);
      toast.error("Помилка завантаження розкладу");
      setLoading(false);
      return;
    }

    // Get teacher names separately
    const teacherIds = [...new Set((data || []).map((e) => e.teacher_id).filter(Boolean))];
    let teacherMap: Record<string, string> = {};

    if (teacherIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", teacherIds);

      if (profileData) {
        teacherMap = profileData.reduce((acc, p) => {
          acc[p.user_id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    const formattedEvents: ScheduleEvent[] = (data || []).map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      start_time: e.start_time,
      end_time: e.end_time,
      event_type: e.event_type,
      is_cancelled: e.is_cancelled,
      cancelled_reason: e.cancelled_reason,
      online_link: e.online_link,
      group_id: e.group_id,
      group_name: (e.groups as { name: string } | null)?.name,
      teacher_id: e.teacher_id,
      teacher_name: e.teacher_id ? teacherMap[e.teacher_id] : undefined,
      room_id: e.room_id,
      room_name: (e.rooms as { name: string } | null)?.name,
      lesson_id: e.lesson_id,
    }));

    setEvents(formattedEvents);
    setLoading(false);
  }, [selectedGroupId]);

  const createEvent = async (eventData: Omit<ScheduleEvent, "id" | "group_name" | "teacher_name" | "room_name">) => {
    const { data, error } = await supabase
      .from("schedule_events")
      .insert({
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        event_type: eventData.event_type,
        is_cancelled: eventData.is_cancelled,
        cancelled_reason: eventData.cancelled_reason,
        online_link: eventData.online_link,
        group_id: eventData.group_id,
        teacher_id: eventData.teacher_id,
        room_id: eventData.room_id,
        lesson_id: eventData.lesson_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      toast.error("Помилка створення події");
      return null;
    }

    toast.success("Подію створено");
    await fetchEvents();
    return data;
  };

  const updateEvent = async (id: string, eventData: Partial<ScheduleEvent>) => {
    const { error } = await supabase
      .from("schedule_events")
      .update({
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        event_type: eventData.event_type,
        is_cancelled: eventData.is_cancelled,
        cancelled_reason: eventData.cancelled_reason,
        online_link: eventData.online_link,
        group_id: eventData.group_id,
        teacher_id: eventData.teacher_id,
        room_id: eventData.room_id,
        lesson_id: eventData.lesson_id,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating event:", error);
      toast.error("Помилка оновлення події");
      return false;
    }

    toast.success("Подію оновлено");
    await fetchEvents();
    return true;
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting event:", error);
      toast.error("Помилка видалення події");
      return false;
    }

    toast.success("Подію видалено");
    await fetchEvents();
    return true;
  };

  const cancelEvent = async (id: string, reason: string) => {
    const { error } = await supabase
      .from("schedule_events")
      .update({
        is_cancelled: true,
        cancelled_reason: reason,
      })
      .eq("id", id);

    if (error) {
      console.error("Error cancelling event:", error);
      toast.error("Помилка скасування події");
      return false;
    }

    toast.success("Подію скасовано");
    await fetchEvents();
    return true;
  };

  const restoreEvent = async (id: string) => {
    const { error } = await supabase
      .from("schedule_events")
      .update({
        is_cancelled: false,
        cancelled_reason: null,
      })
      .eq("id", id);

    if (error) {
      console.error("Error restoring event:", error);
      toast.error("Помилка відновлення події");
      return false;
    }

    toast.success("Подію відновлено");
    await fetchEvents();
    return true;
  };

  useEffect(() => {
    fetchGroups();
    fetchRooms();
    fetchTeachers();
  }, [fetchGroups, fetchRooms, fetchTeachers]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    groups,
    rooms,
    teachers,
    loading,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    cancelEvent,
    restoreEvent,
  };
}
