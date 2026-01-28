import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type UserStatus = Database["public"]["Enums"]["user_status"];

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  status: UserStatus;
  created_at: string;
  roles: AppRole[];
  campuses: { id: string; name: string }[];
  groups: { id: string; name: string }[];
}

export interface Campus {
  id: string;
  name: string;
  city: string;
}

export function useUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
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

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      setLoading(false);
      return;
    }

    if (!profiles || profiles.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const userIds = profiles.map((p) => p.user_id);

    // Fetch roles for all users
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    // Fetch campus memberships
    const { data: campusMemberships } = await supabase
      .from("campus_memberships")
      .select("user_id, campus_id, campuses:campus_id(id, name)")
      .in("user_id", userIds);

    // Fetch group memberships
    const { data: groupMemberships } = await supabase
      .from("group_memberships")
      .select("user_id, group_id, groups:group_id(id, name)")
      .in("user_id", userIds)
      .is("left_at", null);

    // Fetch emails from auth (requires checking via edge function or stored in profiles)
    // For now, we'll use a placeholder - in production you'd want to store email in profiles
    // or fetch from auth via service role

    // Build user objects
    const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
      const userRoles = (rolesData || [])
        .filter((r) => r.user_id === profile.user_id)
        .map((r) => r.role);

      const userCampuses = (campusMemberships || [])
        .filter((cm) => cm.user_id === profile.user_id)
        .map((cm) => cm.campuses as unknown as { id: string; name: string })
        .filter(Boolean);

      const userGroups = (groupMemberships || [])
        .filter((gm) => gm.user_id === profile.user_id)
        .map((gm) => gm.groups as unknown as { id: string; name: string })
        .filter(Boolean);

      return {
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: "", // Will be populated if we add email to profiles or fetch from auth
        phone: profile.phone,
        birth_date: profile.birth_date,
        avatar_url: profile.avatar_url,
        status: profile.status,
        created_at: profile.created_at,
        roles: userRoles,
        campuses: userCampuses,
        groups: userGroups,
      };
    });

    setUsers(usersWithRoles);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCampuses();
    fetchUsers();
  }, [fetchCampuses, fetchUsers]);

  return {
    users,
    campuses,
    loading,
    refetch: fetchUsers,
  };
}
