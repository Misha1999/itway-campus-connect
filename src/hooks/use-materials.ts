import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MaterialContentType = 'text' | 'file' | 'video' | 'link' | 'homework' | 'test';
export type MaterialStatus = 'draft' | 'published' | 'archived';
export type AccessType = 'campus' | 'study_program' | 'enrollment_cohort' | 'group' | 'user';

export interface Material {
  id: string;
  campus_id: string | null;
  campus_name?: string;
  title: string;
  description: string | null;
  content_type: MaterialContentType;
  content_text: string | null;
  file_url: string | null;
  external_url: string | null;
  tags: string[];
  status: MaterialStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  access_rules?: MaterialAccessRule[];
}

export interface MaterialAccessRule {
  id: string;
  material_id: string;
  access_type: AccessType;
  target_id: string;
  target_name?: string;
  visible_from: string | null;
  visible_until: string | null;
}

export interface MaterialModule {
  id: string;
  campus_id: string | null;
  name: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
}

export interface CreateMaterialData {
  campus_id: string;
  title: string;
  description?: string | null;
  content_type: MaterialContentType;
  content_text?: string | null;
  file_url?: string | null;
  external_url?: string | null;
  tags?: string[];
  status?: MaterialStatus;
}

export interface CreateAccessRuleData {
  material_id: string;
  access_type: AccessType;
  target_id: string;
  visible_from?: string | null;
  visible_until?: string | null;
}

export function useMaterials(campusId?: string) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [modules, setModules] = useState<MaterialModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("materials")
      .select(`
        *,
        campuses:campus_id (name)
      `)
      .order("created_at", { ascending: false });

    if (campusId) {
      query = query.eq("campus_id", campusId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching materials:", error);
      toast.error("Помилка завантаження матеріалів");
      setLoading(false);
      return;
    }

    // Fetch access rules for all materials
    const materialIds = (data || []).map(m => m.id);
    let accessRulesMap: Record<string, MaterialAccessRule[]> = {};

    if (materialIds.length > 0) {
      const { data: accessData } = await supabase
        .from("material_access_rules")
        .select("*")
        .in("material_id", materialIds);

      if (accessData) {
        accessRulesMap = accessData.reduce((acc, rule) => {
          if (!acc[rule.material_id]) {
            acc[rule.material_id] = [];
          }
          acc[rule.material_id].push({
            id: rule.id,
            material_id: rule.material_id,
            access_type: rule.access_type as AccessType,
            target_id: rule.target_id,
            visible_from: rule.visible_from,
            visible_until: rule.visible_until,
          });
          return acc;
        }, {} as Record<string, MaterialAccessRule[]>);
      }
    }

    const formattedMaterials: Material[] = (data || []).map(m => ({
      id: m.id,
      campus_id: m.campus_id,
      campus_name: (m.campuses as { name: string } | null)?.name,
      title: m.title,
      description: m.description,
      content_type: m.content_type as MaterialContentType,
      content_text: m.content_text,
      file_url: m.file_url,
      external_url: m.external_url,
      tags: m.tags || [],
      status: m.status as MaterialStatus,
      created_by: m.created_by,
      created_at: m.created_at,
      updated_at: m.updated_at,
      access_rules: accessRulesMap[m.id] || [],
    }));

    setMaterials(formattedMaterials);
    setLoading(false);
  }, [campusId]);

  const fetchModules = useCallback(async () => {
    let query = supabase
      .from("material_modules")
      .select("*")
      .order("order_index");

    if (campusId) {
      query = query.eq("campus_id", campusId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching modules:", error);
      return;
    }

    setModules((data || []) as MaterialModule[]);
  }, [campusId]);

  const createMaterial = async (materialData: CreateMaterialData) => {
    const { data, error } = await supabase
      .from("materials")
      .insert({
        campus_id: materialData.campus_id,
        title: materialData.title,
        description: materialData.description || null,
        content_type: materialData.content_type,
        content_text: materialData.content_text || null,
        file_url: materialData.file_url || null,
        external_url: materialData.external_url || null,
        tags: materialData.tags || [],
        status: materialData.status || 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating material:", error);
      toast.error("Помилка створення матеріалу");
      return null;
    }

    toast.success("Матеріал створено");
    await fetchMaterials();
    return data;
  };

  const updateMaterial = async (id: string, materialData: Partial<CreateMaterialData>) => {
    const { error } = await supabase
      .from("materials")
      .update(materialData)
      .eq("id", id);

    if (error) {
      console.error("Error updating material:", error);
      toast.error("Помилка оновлення матеріалу");
      return false;
    }

    toast.success("Матеріал оновлено");
    await fetchMaterials();
    return true;
  };

  const deleteMaterial = async (id: string) => {
    const { error } = await supabase
      .from("materials")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting material:", error);
      toast.error("Помилка видалення матеріалу");
      return false;
    }

    toast.success("Матеріал видалено");
    await fetchMaterials();
    return true;
  };

  const addAccessRule = async (ruleData: CreateAccessRuleData) => {
    const { error } = await supabase
      .from("material_access_rules")
      .insert({
        material_id: ruleData.material_id,
        access_type: ruleData.access_type,
        target_id: ruleData.target_id,
        visible_from: ruleData.visible_from || null,
        visible_until: ruleData.visible_until || null,
      });

    if (error) {
      console.error("Error adding access rule:", error);
      toast.error("Помилка додавання правила доступу");
      return false;
    }

    toast.success("Правило доступу додано");
    await fetchMaterials();
    return true;
  };

  const removeAccessRule = async (ruleId: string) => {
    const { error } = await supabase
      .from("material_access_rules")
      .delete()
      .eq("id", ruleId);

    if (error) {
      console.error("Error removing access rule:", error);
      toast.error("Помилка видалення правила доступу");
      return false;
    }

    toast.success("Правило доступу видалено");
    await fetchMaterials();
    return true;
  };

  const createModule = async (name: string, campusId: string, description?: string) => {
    const { error } = await supabase
      .from("material_modules")
      .insert({
        name,
        campus_id: campusId,
        description: description || null,
        order_index: modules.length,
      });

    if (error) {
      console.error("Error creating module:", error);
      toast.error("Помилка створення модуля");
      return false;
    }

    toast.success("Модуль створено");
    await fetchModules();
    return true;
  };

  useEffect(() => {
    fetchMaterials();
    fetchModules();
  }, [fetchMaterials, fetchModules]);

  return {
    materials,
    modules,
    loading,
    fetchMaterials,
    fetchModules,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    addAccessRule,
    removeAccessRule,
    createModule,
  };
}
