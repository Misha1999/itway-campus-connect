import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StudyProgram {
  id: string;
  name: string;
  description: string | null;
  campus_id: string;
  is_active: boolean;
}

export interface EnrollmentCohort {
  id: string;
  name: string;
  start_date: string | null;
  campus_id: string;
  is_active: boolean;
}

export function useStudyData(campusId?: string) {
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [enrollmentCohorts, setEnrollmentCohorts] = useState<EnrollmentCohort[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch study programs
    let programsQuery = supabase
      .from("study_programs")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (campusId) {
      programsQuery = programsQuery.eq("campus_id", campusId);
    }

    const { data: programs } = await programsQuery;
    setStudyPrograms((programs as StudyProgram[]) || []);

    // Fetch enrollment cohorts
    let cohortsQuery = supabase
      .from("enrollment_cohorts")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (campusId) {
      cohortsQuery = cohortsQuery.eq("campus_id", campusId);
    }

    const { data: cohorts } = await cohortsQuery;
    setEnrollmentCohorts((cohorts as EnrollmentCohort[]) || []);

    setLoading(false);
  }, [campusId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    studyPrograms,
    enrollmentCohorts,
    loading,
    refetch: fetchData,
  };
}
