import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type GroupFormat = Database["public"]["Enums"]["group_format"];

export interface GroupData {
  id: string;
  name: string;
  campus_id: string;
  campus_name?: string;
  course_id: string | null;
  course_name?: string;
  format: GroupFormat;
  is_active: boolean;
  level: string | null;
  age_range: string | null;
  max_students: number | null;
  start_date: string | null;
  end_date: string | null;
  schedule_template: unknown;
  student_count: number;
  teacher_name?: string;
  created_at: string;
}

export interface Campus {
  id: string;
  name: string;
  city: string;
}

export interface Course {
  id: string;
  name: string;
  direction_id: string | null;
}

export interface CreateGroupData {
  name: string;
  campus_id: string;
  course_id?: string | null;
  format: GroupFormat;
  level?: string | null;
  age_range?: string | null;
  max_students?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}

export function useGroups() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampuses = useCallback(async () => {
    const { data, error } = await supabase
      .from("campuses")
      .select("id, name, city")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching campuses:", error);
      return;
    }
    setCampuses(data || []);
  }, []);

  const fetchCourses = useCallback(async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, name, direction_id")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching courses:", error);
      return;
    }
    setCourses(data || []);
  }, []);

  const fetchGroups = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("groups")
      .select(`
        id,
        name,
        campus_id,
        course_id,
        format,
        is_active,
        level,
        age_range,
        max_students,
        start_date,
        end_date,
        schedule_template,
        created_at,
        campuses:campus_id (name),
        courses:course_id (name)
      `)
      .order("name");

    if (error) {
      console.error("Error fetching groups:", error);
      toast.error("Помилка завантаження груп");
      setLoading(false);
      return;
    }

    // Get student counts for each group
    const groupIds = (data || []).map((g) => g.id);
    let studentCounts: Record<string, number> = {};
    let teacherNames: Record<string, string> = {};

    if (groupIds.length > 0) {
      // Get student counts
      const { data: membershipData } = await supabase
        .from("group_memberships")
        .select("group_id, role")
        .in("group_id", groupIds)
        .is("left_at", null);

      if (membershipData) {
        studentCounts = membershipData.reduce((acc, m) => {
          if (m.role === "student") {
            acc[m.group_id] = (acc[m.group_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
      }

      // Get teacher for each group
      const { data: teacherMembershipData } = await supabase
        .from("group_memberships")
        .select("group_id, user_id")
        .in("group_id", groupIds)
        .eq("role", "teacher")
        .is("left_at", null);

      if (teacherMembershipData && teacherMembershipData.length > 0) {
        const teacherUserIds = [...new Set(teacherMembershipData.map((m) => m.user_id))];
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", teacherUserIds);

        if (profileData) {
          const profileMap = profileData.reduce((acc, p) => {
            acc[p.user_id] = p.full_name;
            return acc;
          }, {} as Record<string, string>);

          teacherMembershipData.forEach((m) => {
            if (profileMap[m.user_id]) {
              teacherNames[m.group_id] = profileMap[m.user_id];
            }
          });
        }
      }
    }

    const formattedGroups: GroupData[] = (data || []).map((g) => ({
      id: g.id,
      name: g.name,
      campus_id: g.campus_id,
      campus_name: (g.campuses as { name: string } | null)?.name,
      course_id: g.course_id,
      course_name: (g.courses as { name: string } | null)?.name,
      format: g.format,
      is_active: g.is_active,
      level: g.level,
      age_range: g.age_range,
      max_students: g.max_students,
      start_date: g.start_date,
      end_date: g.end_date,
      schedule_template: g.schedule_template,
      student_count: studentCounts[g.id] || 0,
      teacher_name: teacherNames[g.id],
      created_at: g.created_at,
    }));

    setGroups(formattedGroups);
    setLoading(false);
  }, []);

  const createGroup = async (groupData: CreateGroupData) => {
    const { data, error } = await supabase
      .from("groups")
      .insert({
        name: groupData.name,
        campus_id: groupData.campus_id,
        course_id: groupData.course_id || null,
        format: groupData.format,
        level: groupData.level || null,
        age_range: groupData.age_range || null,
        max_students: groupData.max_students || null,
        start_date: groupData.start_date || null,
        end_date: groupData.end_date || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating group:", error);
      toast.error("Помилка створення групи");
      return null;
    }

    toast.success("Групу створено");
    await fetchGroups();
    return data;
  };

  const updateGroup = async (id: string, groupData: Partial<CreateGroupData>) => {
    const { error } = await supabase
      .from("groups")
      .update({
        name: groupData.name,
        campus_id: groupData.campus_id,
        course_id: groupData.course_id,
        format: groupData.format,
        level: groupData.level,
        age_range: groupData.age_range,
        max_students: groupData.max_students,
        start_date: groupData.start_date,
        end_date: groupData.end_date,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating group:", error);
      toast.error("Помилка оновлення групи");
      return false;
    }

    toast.success("Групу оновлено");
    await fetchGroups();
    return true;
  };

  const archiveGroup = async (id: string) => {
    const { error } = await supabase
      .from("groups")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("Error archiving group:", error);
      toast.error("Помилка архівування групи");
      return false;
    }

    toast.success("Групу архівовано");
    await fetchGroups();
    return true;
  };

  const restoreGroup = async (id: string) => {
    const { error } = await supabase
      .from("groups")
      .update({ is_active: true })
      .eq("id", id);

    if (error) {
      console.error("Error restoring group:", error);
      toast.error("Помилка відновлення групи");
      return false;
    }

    toast.success("Групу відновлено");
    await fetchGroups();
    return true;
  };

  useEffect(() => {
    fetchGroups();
    fetchCampuses();
    fetchCourses();
  }, [fetchGroups, fetchCampuses, fetchCourses]);

  return {
    groups,
    campuses,
    courses,
    loading,
    fetchGroups,
    createGroup,
    updateGroup,
    archiveGroup,
    restoreGroup,
  };
}
