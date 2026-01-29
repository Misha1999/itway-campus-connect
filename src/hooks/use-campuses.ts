import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CampusWithStats {
  id: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  studentsCount: number;
  teachersCount: number;
  groupsCount: number;
}

export function useCampuses() {
  const [campuses, setCampuses] = useState<CampusWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampuses = useCallback(async () => {
    setLoading(true);

    // Fetch campuses
    const { data: campusesData, error: campusesError } = await supabase
      .from("campuses")
      .select("*")
      .order("name");

    if (campusesError) {
      console.error("Error fetching campuses:", campusesError);
      setLoading(false);
      return;
    }

    if (!campusesData || campusesData.length === 0) {
      setCampuses([]);
      setLoading(false);
      return;
    }

    const campusIds = campusesData.map((c) => c.id);

    // Fetch groups count per campus
    const { data: groupsData } = await supabase
      .from("groups")
      .select("id, campus_id, is_active")
      .in("campus_id", campusIds)
      .eq("is_active", true);

    // Fetch campus memberships to count students and teachers
    const { data: membershipsData } = await supabase
      .from("campus_memberships")
      .select("campus_id, role")
      .in("campus_id", campusIds);

    // Build stats
    const campusesWithStats: CampusWithStats[] = campusesData.map((campus) => {
      const groups = (groupsData || []).filter((g) => g.campus_id === campus.id);
      const memberships = (membershipsData || []).filter((m) => m.campus_id === campus.id);
      
      const studentsCount = memberships.filter((m) => m.role === "student").length;
      const teachersCount = memberships.filter((m) => m.role === "teacher").length;

      return {
        id: campus.id,
        name: campus.name,
        city: campus.city,
        address: campus.address,
        phone: campus.phone,
        email: campus.email,
        is_active: campus.is_active,
        created_at: campus.created_at,
        studentsCount,
        teachersCount,
        groupsCount: groups.length,
      };
    });

    setCampuses(campusesWithStats);
    setLoading(false);
  }, []);

  const createCampus = async (data: {
    name: string;
    city: string;
    address?: string;
    phone?: string;
    email?: string;
  }) => {
    const { error } = await supabase.from("campuses").insert({
      name: data.name,
      city: data.city,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
    });

    if (error) {
      console.error("Error creating campus:", error);
      toast.error("Помилка створення закладу");
      return false;
    }

    toast.success(`Заклад "${data.name}" створено`);
    await fetchCampuses();
    return true;
  };

  const toggleCampusStatus = async (campusId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("campuses")
      .update({ is_active: isActive })
      .eq("id", campusId);

    if (error) {
      console.error("Error updating campus status:", error);
      toast.error("Помилка оновлення статусу");
      return false;
    }

    toast.success(isActive ? "Заклад активовано" : "Заклад архівовано");
    await fetchCampuses();
    return true;
  };

  useEffect(() => {
    fetchCampuses();
  }, [fetchCampuses]);

  return {
    campuses,
    loading,
    refetch: fetchCampuses,
    createCampus,
    toggleCampusStatus,
  };
}
