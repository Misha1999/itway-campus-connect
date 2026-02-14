
-- Create a security definer function to check material access without triggering RLS
CREATE OR REPLACE FUNCTION public.user_can_access_material(_user_id uuid, _material_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM material_access_rules mar
    WHERE mar.material_id = _material_id
    AND (
      (mar.access_type = 'campus' AND has_campus_access(_user_id, mar.target_id))
      OR (mar.access_type = 'group' AND has_group_access(_user_id, mar.target_id))
      OR (mar.access_type = 'user' AND mar.target_id = _user_id)
    )
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view published materials by campus" ON public.materials;

-- Recreate using the security definer function
CREATE POLICY "Users can view published materials by campus"
ON public.materials
FOR SELECT
USING (
  status = 'published' AND user_can_access_material(auth.uid(), id)
);
