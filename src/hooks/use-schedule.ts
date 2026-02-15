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
  classroom_id: string | null;
  classroom_name?: string;
  lesson_id: string | null;
}

export interface Group {
  id: string;
  name: string;
  campus_id: string;
  study_program_id: string | null;
  enrollment_cohort_id: string | null;
}

export interface Room {
  id: string;
  name: string;
  campus_id: string;
  capacity: number | null;
}

export interface Classroom {
  id: string;
  name: string;
  campus_id: string;
  capacity: number | null;
  is_universal: boolean;
  is_active: boolean;
}

export interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
}

export interface Campus {
  id: string;
  name: string;
  city: string;
}

export interface ScheduleConflict {
  type: "teacher" | "group" | "classroom";
  event_id: string;
  title: string;
  start_time: string;
  end_time: string;
}

export function useSchedule(selectedGroupId?: string) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampuses = useCallback(async () => {
    const { data, error } = await supabase
      .from("campuses")
      .select("id, name, city")
      .eq("is_active", true)
      .order("name");
    if (!error) setCampuses(data || []);
  }, []);

  const fetchGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, campus_id, study_program_id, enrollment_cohort_id")
      .eq("is_active", true)
      .order("name");
    if (!error) setGroups((data as Group[]) || []);
  }, []);

  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, campus_id, capacity")
      .eq("is_active", true)
      .order("name");
    if (!error) setRooms(data || []);
  }, []);

  const fetchClassrooms = useCallback(async () => {
    const { data, error } = await supabase
      .from("classrooms")
      .select("id, name, campus_id, capacity, is_universal, is_active")
      .eq("is_active", true)
      .order("name");
    if (!error) setClassrooms((data as Classroom[]) || []);
  }, []);

  const fetchTeachers = useCallback(async () => {
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "teacher");
    if (roleError || !roleData?.length) {
      setTeachers([]);
      return;
    }
    const teacherUserIds = roleData.map((r) => r.user_id);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, user_id, full_name")
      .in("user_id", teacherUserIds)
      .eq("status", "active");
    setTeachers(profileData || []);
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("schedule_events")
      .select(`
        id, title, description, start_time, end_time, event_type,
        is_cancelled, cancelled_reason, online_link,
        group_id, teacher_id, room_id, classroom_id, lesson_id,
        groups:group_id (name),
        rooms:room_id (name),
        classrooms:classroom_id (name)
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

    // Get teacher names
    const teacherIds = [...new Set((data || []).map((e: any) => e.teacher_id).filter(Boolean))];
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

    const formattedEvents: ScheduleEvent[] = (data || []).map((e: any) => ({
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
      group_name: e.groups?.name,
      teacher_id: e.teacher_id,
      teacher_name: e.teacher_id ? teacherMap[e.teacher_id] : undefined,
      room_id: e.room_id,
      room_name: e.rooms?.name,
      classroom_id: e.classroom_id,
      classroom_name: e.classrooms?.name,
      lesson_id: e.lesson_id,
    }));

    setEvents(formattedEvents);
    setLoading(false);
  }, [selectedGroupId]);

  const checkConflicts = async (
    eventId: string | null,
    startTime: string,
    endTime: string,
    teacherId: string | null,
    groupId: string | null,
    classroomId: string | null
  ): Promise<ScheduleConflict[]> => {
    const { data, error } = await supabase.rpc(
      "check_schedule_conflicts" as any,
      {
        _event_id: eventId,
        _start_time: startTime,
        _end_time: endTime,
        _teacher_id: teacherId,
        _group_id: groupId,
        _classroom_id: classroomId,
      }
    );
    if (error) {
      console.error("Error checking conflicts:", error);
      return [];
    }
    return (data as unknown as ScheduleConflict[]) || [];
  };

  const createEvent = async (
    eventData: Omit<ScheduleEvent, "id" | "group_name" | "teacher_name" | "room_name" | "classroom_name">
  ) => {
    const insertData: any = {
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
      classroom_id: eventData.classroom_id,
      lesson_id: eventData.lesson_id,
    };

    const { data, error } = await supabase
      .from("schedule_events")
      .insert(insertData)
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

  const createEventsBatch = async (
    items: Omit<ScheduleEvent, "id" | "group_name" | "teacher_name" | "room_name" | "classroom_name">[]
  ) => {
    const rows = items.map((eventData) => ({
      title: eventData.title,
      description: eventData.description,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      event_type: eventData.event_type,
      is_cancelled: eventData.is_cancelled || false,
      cancelled_reason: eventData.cancelled_reason || null,
      online_link: eventData.online_link,
      group_id: eventData.group_id,
      teacher_id: eventData.teacher_id,
      room_id: eventData.room_id,
      classroom_id: eventData.classroom_id,
      lesson_id: eventData.lesson_id,
    }));

    const { error } = await supabase
      .from("schedule_events")
      .insert(rows);

    if (error) {
      console.error("Error batch creating events:", error);
      toast.error("Помилка створення подій");
      return null;
    }
    toast.success(`Створено ${items.length} подій`);
    await fetchEvents();
    return true;
  };

  const updateEvent = async (id: string, eventData: Partial<ScheduleEvent>) => {
    const updateData: any = {};
    if (eventData.title !== undefined) updateData.title = eventData.title;
    if (eventData.description !== undefined) updateData.description = eventData.description;
    if (eventData.start_time !== undefined) updateData.start_time = eventData.start_time;
    if (eventData.end_time !== undefined) updateData.end_time = eventData.end_time;
    if (eventData.event_type !== undefined) updateData.event_type = eventData.event_type;
    if (eventData.is_cancelled !== undefined) updateData.is_cancelled = eventData.is_cancelled;
    if (eventData.cancelled_reason !== undefined) updateData.cancelled_reason = eventData.cancelled_reason;
    if (eventData.online_link !== undefined) updateData.online_link = eventData.online_link;
    if (eventData.group_id !== undefined) updateData.group_id = eventData.group_id;
    if (eventData.teacher_id !== undefined) updateData.teacher_id = eventData.teacher_id;
    if (eventData.room_id !== undefined) updateData.room_id = eventData.room_id;
    if (eventData.classroom_id !== undefined) updateData.classroom_id = eventData.classroom_id;
    if (eventData.lesson_id !== undefined) updateData.lesson_id = eventData.lesson_id;

    const { error } = await supabase
      .from("schedule_events")
      .update(updateData)
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
    const { error } = await supabase.from("schedule_events").delete().eq("id", id);
    if (error) {
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
      .update({ is_cancelled: true, cancelled_reason: reason })
      .eq("id", id);
    if (error) {
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
      .update({ is_cancelled: false, cancelled_reason: null })
      .eq("id", id);
    if (error) {
      toast.error("Помилка відновлення події");
      return false;
    }
    toast.success("Подію відновлено");
    await fetchEvents();
    return true;
  };

  // === BULK OPERATIONS ===

  const bulkDelete = async (ids: string[]) => {
    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .in("id", ids);
    if (error) {
      toast.error("Помилка масового видалення");
      return false;
    }
    toast.success(`Видалено ${ids.length} подій`);
    await fetchEvents();
    return true;
  };

  const bulkCancel = async (ids: string[], reason: string) => {
    const { error } = await supabase
      .from("schedule_events")
      .update({ is_cancelled: true, cancelled_reason: reason })
      .in("id", ids);
    if (error) {
      toast.error("Помилка масового скасування");
      return false;
    }
    toast.success(`Скасовано ${ids.length} подій`);
    await fetchEvents();
    return true;
  };

  const bulkRestore = async (ids: string[]) => {
    const { error } = await supabase
      .from("schedule_events")
      .update({ is_cancelled: false, cancelled_reason: null })
      .in("id", ids);
    if (error) {
      toast.error("Помилка масового відновлення");
      return false;
    }
    toast.success(`Відновлено ${ids.length} подій`);
    await fetchEvents();
    return true;
  };

  const bulkUpdateTeacher = async (ids: string[], teacherId: string | null) => {
    const { error } = await supabase
      .from("schedule_events")
      .update({ teacher_id: teacherId })
      .in("id", ids);
    if (error) {
      toast.error("Помилка заміни викладача");
      return false;
    }
    toast.success(`Оновлено викладача для ${ids.length} подій`);
    await fetchEvents();
    return true;
  };

  const bulkUpdateClassroom = async (ids: string[], classroomId: string | null) => {
    const { error } = await supabase
      .from("schedule_events")
      .update({ classroom_id: classroomId })
      .in("id", ids);
    if (error) {
      toast.error("Помилка заміни аудиторії");
      return false;
    }
    toast.success(`Оновлено аудиторію для ${ids.length} подій`);
    await fetchEvents();
    return true;
  };

  const bulkUpdateEventType = async (ids: string[], eventType: EventType) => {
    const { error } = await supabase
      .from("schedule_events")
      .update({ event_type: eventType })
      .in("id", ids);
    if (error) {
      toast.error("Помилка зміни типу");
      return false;
    }
    toast.success(`Оновлено тип для ${ids.length} подій`);
    await fetchEvents();
    return true;
  };

  const bulkUpdateOnlineLink = async (ids: string[], onlineLink: string) => {
    const { error } = await supabase
      .from("schedule_events")
      .update({ online_link: onlineLink })
      .in("id", ids);
    if (error) {
      toast.error("Помилка додавання посилання");
      return false;
    }
    toast.success(`Додано посилання для ${ids.length} подій`);
    await fetchEvents();
    return true;
  };

  const bulkShiftDays = async (ids: string[], shiftDays: number) => {
    // Fetch events to shift
    const { data: eventsToShift, error: fetchErr } = await supabase
      .from("schedule_events")
      .select("id, start_time, end_time")
      .in("id", ids);
    if (fetchErr || !eventsToShift) {
      toast.error("Помилка зміщення розкладу");
      return false;
    }
    const shiftMs = shiftDays * 24 * 60 * 60 * 1000;
    for (const ev of eventsToShift) {
      const newStart = new Date(new Date(ev.start_time).getTime() + shiftMs).toISOString();
      const newEnd = new Date(new Date(ev.end_time).getTime() + shiftMs).toISOString();
      await supabase.from("schedule_events").update({ start_time: newStart, end_time: newEnd }).eq("id", ev.id);
    }
    toast.success(`Зміщено ${ids.length} подій на ${shiftDays} дн.`);
    await fetchEvents();
    return true;
  };

  const bulkShiftTime = async (ids: string[], shiftMinutes: number) => {
    const { data: eventsToShift, error: fetchErr } = await supabase
      .from("schedule_events")
      .select("id, start_time, end_time")
      .in("id", ids);
    if (fetchErr || !eventsToShift) {
      toast.error("Помилка зміщення часу");
      return false;
    }
    const shiftMs = shiftMinutes * 60 * 1000;
    for (const ev of eventsToShift) {
      const newStart = new Date(new Date(ev.start_time).getTime() + shiftMs).toISOString();
      const newEnd = new Date(new Date(ev.end_time).getTime() + shiftMs).toISOString();
      await supabase.from("schedule_events").update({ start_time: newStart, end_time: newEnd }).eq("id", ev.id);
    }
    toast.success(`Зміщено час ${ids.length} подій на ${shiftMinutes} хв`);
    await fetchEvents();
    return true;
  };

  const bulkDuplicateShifted = async (ids: string[], shiftDays: number) => {
    const { data: eventsToClone, error: fetchErr } = await supabase
      .from("schedule_events")
      .select("*")
      .in("id", ids);
    if (fetchErr || !eventsToClone) {
      toast.error("Помилка дублювання");
      return false;
    }
    const shiftMs = shiftDays * 24 * 60 * 60 * 1000;
    const rows = eventsToClone.map((ev: any) => ({
      title: ev.title,
      description: ev.description,
      start_time: new Date(new Date(ev.start_time).getTime() + shiftMs).toISOString(),
      end_time: new Date(new Date(ev.end_time).getTime() + shiftMs).toISOString(),
      event_type: ev.event_type,
      is_cancelled: false,
      cancelled_reason: null,
      online_link: ev.online_link,
      group_id: ev.group_id,
      teacher_id: ev.teacher_id,
      room_id: ev.room_id,
      classroom_id: ev.classroom_id,
      lesson_id: ev.lesson_id,
    }));
    const { error } = await supabase.from("schedule_events").insert(rows);
    if (error) {
      toast.error("Помилка дублювання подій");
      return false;
    }
    toast.success(`Продубльовано ${ids.length} подій`);
    await fetchEvents();
    return true;
  };

  const bulkCopyToGroup = async (ids: string[], targetGroupId: string) => {
    const { data: eventsToClone, error: fetchErr } = await supabase
      .from("schedule_events")
      .select("*")
      .in("id", ids);
    if (fetchErr || !eventsToClone) {
      toast.error("Помилка копіювання");
      return false;
    }
    const rows = eventsToClone.map((ev: any) => ({
      title: ev.title,
      description: ev.description,
      start_time: ev.start_time,
      end_time: ev.end_time,
      event_type: ev.event_type,
      is_cancelled: false,
      cancelled_reason: null,
      online_link: ev.online_link,
      group_id: targetGroupId,
      teacher_id: ev.teacher_id,
      room_id: ev.room_id,
      classroom_id: ev.classroom_id,
      lesson_id: ev.lesson_id,
    }));
    const { error } = await supabase.from("schedule_events").insert(rows);
    if (error) {
      toast.error("Помилка копіювання розкладу");
      return false;
    }
    toast.success(`Скопійовано ${ids.length} подій до іншої групи`);
    await fetchEvents();
    return true;
  };

  useEffect(() => {
    fetchCampuses();
    fetchGroups();
    fetchRooms();
    fetchClassrooms();
    fetchTeachers();
  }, [fetchCampuses, fetchGroups, fetchRooms, fetchClassrooms, fetchTeachers]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    groups,
    rooms,
    classrooms,
    teachers,
    campuses,
    loading,
    fetchEvents,
    createEvent,
    createEventsBatch,
    updateEvent,
    deleteEvent,
    cancelEvent,
    restoreEvent,
    checkConflicts,
    bulkDelete,
    bulkCancel,
    bulkRestore,
    bulkUpdateTeacher,
    bulkUpdateClassroom,
    bulkUpdateEventType,
    bulkUpdateOnlineLink,
    bulkShiftDays,
    bulkShiftTime,
    bulkDuplicateShifted,
    bulkCopyToGroup,
  };
}
