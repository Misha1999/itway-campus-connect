-- Drop the problematic recursive SELECT policy and recreate without recursion
DROP POLICY IF EXISTS "Users can view published materials with access" ON public.materials;

-- Recreate SELECT policy without infinite recursion
-- Split into simpler policies
CREATE POLICY "Users can view own materials"
ON public.materials
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Admins can view all materials"
ON public.materials
FOR SELECT
USING (is_admin_or_above(auth.uid()));

CREATE POLICY "Users can view published materials by campus"
ON public.materials
FOR SELECT
USING (
  status = 'published' AND (
    EXISTS (
      SELECT 1 FROM material_access_rules mar
      WHERE mar.material_id = materials.id
      AND mar.access_type = 'campus'
      AND has_campus_access(auth.uid(), mar.target_id)
    )
    OR EXISTS (
      SELECT 1 FROM material_access_rules mar
      WHERE mar.material_id = materials.id
      AND mar.access_type = 'group'
      AND has_group_access(auth.uid(), mar.target_id)
    )
    OR EXISTS (
      SELECT 1 FROM material_access_rules mar
      WHERE mar.material_id = materials.id
      AND mar.access_type = 'user'
      AND mar.target_id = auth.uid()
    )
  )
);

-- Add a simple INSERT policy for teachers (the missing piece)
-- Teachers/admins can insert materials without campus_id
DROP POLICY IF EXISTS "Teachers can manage materials" ON public.materials;
CREATE POLICY "Teachers can manage materials"
ON public.materials
FOR ALL
USING (
  has_role(auth.uid(), 'teacher'::app_role) OR is_admin_or_above(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) OR is_admin_or_above(auth.uid())
);