-- ============================================
-- MATERIALS SYSTEM: New structure for content management
-- ============================================

-- Materials table (individual content items)
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid REFERENCES public.campuses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content_type text NOT NULL DEFAULT 'file' CHECK (content_type IN ('text', 'file', 'video', 'link', 'homework', 'test')),
  content_text text, -- for text type
  file_url text, -- for file type
  external_url text, -- for video/link type
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Material modules (folders/sections for organizing materials)
CREATE TABLE public.material_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid REFERENCES public.campuses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Junction table: materials belong to modules
CREATE TABLE public.material_module_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.material_modules(id) ON DELETE CASCADE NOT NULL,
  material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  UNIQUE(module_id, material_id)
);

-- Material access rules (who can see what)
CREATE TABLE public.material_access_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
  access_type text NOT NULL CHECK (access_type IN ('campus', 'study_program', 'enrollment_cohort', 'group', 'user')),
  target_id uuid NOT NULL, -- ID of campus/program/cohort/group/user
  visible_from timestamptz,
  visible_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS on all new tables
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_module_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_access_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for materials
CREATE POLICY "Admins can manage materials" ON public.materials
  FOR ALL USING (is_campus_admin(auth.uid(), campus_id));

CREATE POLICY "Teachers can manage materials" ON public.materials
  FOR ALL USING (
    has_role(auth.uid(), 'teacher') AND 
    has_campus_access(auth.uid(), campus_id)
  );

CREATE POLICY "Users can view published materials with access" ON public.materials
  FOR SELECT USING (
    status = 'published' AND (
      -- Direct campus access
      EXISTS (
        SELECT 1 FROM public.material_access_rules mar
        WHERE mar.material_id = materials.id
          AND mar.access_type = 'campus'
          AND has_campus_access(auth.uid(), mar.target_id)
      )
      -- Or group access
      OR EXISTS (
        SELECT 1 FROM public.material_access_rules mar
        WHERE mar.material_id = materials.id
          AND mar.access_type = 'group'
          AND has_group_access(auth.uid(), mar.target_id)
      )
      -- Or program access
      OR EXISTS (
        SELECT 1 FROM public.material_access_rules mar
        JOIN public.profiles p ON p.study_program_id = mar.target_id
        WHERE mar.material_id = materials.id
          AND mar.access_type = 'study_program'
          AND p.user_id = auth.uid()
      )
      -- Or cohort access
      OR EXISTS (
        SELECT 1 FROM public.material_access_rules mar
        JOIN public.profiles p ON p.enrollment_cohort_id = mar.target_id
        WHERE mar.material_id = materials.id
          AND mar.access_type = 'enrollment_cohort'
          AND p.user_id = auth.uid()
      )
      -- Or direct user access
      OR EXISTS (
        SELECT 1 FROM public.material_access_rules mar
        WHERE mar.material_id = materials.id
          AND mar.access_type = 'user'
          AND mar.target_id = auth.uid()
      )
      -- Or creator/admin
      OR created_by = auth.uid()
      OR is_admin_or_above(auth.uid())
    )
  );

-- RLS for material modules
CREATE POLICY "Admins can manage modules" ON public.material_modules
  FOR ALL USING (is_campus_admin(auth.uid(), campus_id));

CREATE POLICY "Teachers can manage modules" ON public.material_modules
  FOR ALL USING (
    has_role(auth.uid(), 'teacher') AND 
    has_campus_access(auth.uid(), campus_id)
  );

CREATE POLICY "Users can view active modules" ON public.material_modules
  FOR SELECT USING (
    is_active AND has_campus_access(auth.uid(), campus_id)
  );

-- RLS for module items
CREATE POLICY "Admins can manage module items" ON public.material_module_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.material_modules mm
      WHERE mm.id = material_module_items.module_id
        AND is_campus_admin(auth.uid(), mm.campus_id)
    )
  );

CREATE POLICY "Teachers can manage module items" ON public.material_module_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.material_modules mm
      WHERE mm.id = material_module_items.module_id
        AND has_role(auth.uid(), 'teacher')
        AND has_campus_access(auth.uid(), mm.campus_id)
    )
  );

CREATE POLICY "Users can view module items" ON public.material_module_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.material_modules mm
      WHERE mm.id = material_module_items.module_id
        AND has_campus_access(auth.uid(), mm.campus_id)
    )
  );

-- RLS for access rules
CREATE POLICY "Admins can manage access rules" ON public.material_access_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.materials m
      WHERE m.id = material_access_rules.material_id
        AND is_campus_admin(auth.uid(), m.campus_id)
    )
  );

CREATE POLICY "Teachers can manage access rules" ON public.material_access_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.materials m
      WHERE m.id = material_access_rules.material_id
        AND has_role(auth.uid(), 'teacher')
        AND has_campus_access(auth.uid(), m.campus_id)
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- AUDIT LOG: Add trigger for tracking group changes
-- ============================================

-- Function to log group changes
CREATE OR REPLACE FUNCTION public.log_group_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Only log if study_program_id or enrollment_cohort_id changed
    IF OLD.study_program_id IS DISTINCT FROM NEW.study_program_id 
       OR OLD.enrollment_cohort_id IS DISTINCT FROM NEW.enrollment_cohort_id THEN
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
      VALUES (
        auth.uid(),
        'update',
        'group',
        NEW.id,
        jsonb_build_object(
          'study_program_id', OLD.study_program_id,
          'enrollment_cohort_id', OLD.enrollment_cohort_id
        ),
        jsonb_build_object(
          'study_program_id', NEW.study_program_id,
          'enrollment_cohort_id', NEW.enrollment_cohort_id
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to groups table
CREATE TRIGGER log_group_changes_trigger
  AFTER UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.log_group_changes();

-- ============================================
-- INDEX: Improve query performance
-- ============================================
CREATE INDEX idx_materials_campus_status ON public.materials(campus_id, status);
CREATE INDEX idx_materials_created_by ON public.materials(created_by);
CREATE INDEX idx_material_access_rules_material ON public.material_access_rules(material_id);
CREATE INDEX idx_material_access_rules_target ON public.material_access_rules(access_type, target_id);
CREATE INDEX idx_groups_program_cohort ON public.groups(study_program_id, enrollment_cohort_id);