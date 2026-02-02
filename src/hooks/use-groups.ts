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
  study_program_id: string | null;
  study_program_name?: string;
  enrollment_cohort_id: string | null;
  enrollment_cohort_name?: string;
}

export interface Campus {
  id: string;
  name: string;
  city: string;
  email_domain: string | null;
}

export interface Course {
  id: string;
  name: string;
  direction_id: string | null;
}

export interface StudyProgram {
  id: string;
  name: string;
  campus_id: string;
  is_active: boolean;
}

export interface EnrollmentCohort {
  id: string;
  name: string;
  campus_id: string;
  is_active: boolean;
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
  study_program_id: string;
  enrollment_cohort_id: string;
}

export function useGroups(campusIdFilter?: string) {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [enrollmentCohorts, setEnrollmentCohorts] = useState<EnrollmentCohort[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampuses = useCallback(async () => {
    const { data, error } = await supabase
      .from("campuses")
      .select("id, name, city, email_domain")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching campuses:", error);
      return;
    }
    setCampuses(data || []);
  }, []);

  const fetchStudyPrograms = useCallback(async () => {
    let query = supabase
      .from("study_programs")
      .select("id, name, campus_id, is_active")
      .order("name");

    if (campusIdFilter) {
      query = query.eq("campus_id", campusIdFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching study programs:", error);
      return;
    }
    setStudyPrograms(data || []);
  }, [campusIdFilter]);

  const fetchEnrollmentCohorts = useCallback(async () => {
    let query = supabase
      .from("enrollment_cohorts")
      .select("id, name, campus_id, is_active")
      .order("name");

    if (campusIdFilter) {
      query = query.eq("campus_id", campusIdFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching enrollment cohorts:", error);
      return;
    }
    setEnrollmentCohorts(data || []);
  }, [campusIdFilter]);

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

    let query = supabase
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
        study_program_id,
        enrollment_cohort_id,
        campuses:campus_id (name),
        courses:course_id (name),
        study_programs:study_program_id (name, is_active),
        enrollment_cohorts:enrollment_cohort_id (name, is_active)
      `)
      .order("name");

    if (campusIdFilter) {
      query = query.eq("campus_id", campusIdFilter);
    }

    const { data, error } = await query;

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

    const formattedGroups: GroupData[] = (data || []).map((g) => {
      const studyProgramData = g.study_programs as { name: string; is_active: boolean } | null;
      const enrollmentCohortData = g.enrollment_cohorts as { name: string; is_active: boolean } | null;
      
      return {
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
        study_program_id: g.study_program_id,
        study_program_name: studyProgramData ? (studyProgramData.name + (!studyProgramData.is_active ? " (архів)" : "")) : undefined,
        enrollment_cohort_id: g.enrollment_cohort_id,
        enrollment_cohort_name: enrollmentCohortData ? (enrollmentCohortData.name + (!enrollmentCohortData.is_active ? " (архів)" : "")) : undefined,
      };
    });

    setGroups(formattedGroups);
    setLoading(false);
  }, [campusIdFilter]);

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
        study_program_id: groupData.study_program_id,
        enrollment_cohort_id: groupData.enrollment_cohort_id,
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
    const updateData: Record<string, unknown> = {};
    
    if (groupData.name !== undefined) updateData.name = groupData.name;
    if (groupData.campus_id !== undefined) updateData.campus_id = groupData.campus_id;
    if (groupData.course_id !== undefined) updateData.course_id = groupData.course_id;
    if (groupData.format !== undefined) updateData.format = groupData.format;
    if (groupData.level !== undefined) updateData.level = groupData.level;
    if (groupData.age_range !== undefined) updateData.age_range = groupData.age_range;
    if (groupData.max_students !== undefined) updateData.max_students = groupData.max_students;
    if (groupData.start_date !== undefined) updateData.start_date = groupData.start_date;
    if (groupData.end_date !== undefined) updateData.end_date = groupData.end_date;
    if (groupData.study_program_id !== undefined) updateData.study_program_id = groupData.study_program_id;
    if (groupData.enrollment_cohort_id !== undefined) updateData.enrollment_cohort_id = groupData.enrollment_cohort_id;

    const { error } = await supabase
      .from("groups")
      .update(updateData)
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
    fetchStudyPrograms();
    fetchEnrollmentCohorts();
  }, [fetchGroups, fetchCampuses, fetchCourses, fetchStudyPrograms, fetchEnrollmentCohorts]);

  return {
    groups,
    campuses,
    courses,
    studyPrograms,
    enrollmentCohorts,
    loading,
    fetchGroups,
    createGroup,
    updateGroup,
    archiveGroup,
    restoreGroup,
  };
}
