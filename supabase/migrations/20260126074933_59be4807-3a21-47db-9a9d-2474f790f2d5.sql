-- Create storage bucket for assignment files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignments', 
  'assignments', 
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'text/plain', 'video/mp4', 'video/webm']
);

-- Storage policies for assignments bucket
CREATE POLICY "Teachers and admins can upload assignment files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assignments' 
  AND (public.has_role(auth.uid(), 'teacher') OR public.is_admin_or_above(auth.uid()))
);

CREATE POLICY "Users with group access can view assignment files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'assignments');

CREATE POLICY "Teachers and admins can update assignment files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assignments' 
  AND (public.has_role(auth.uid(), 'teacher') OR public.is_admin_or_above(auth.uid()))
);

CREATE POLICY "Teachers and admins can delete assignment files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assignments' 
  AND (public.has_role(auth.uid(), 'teacher') OR public.is_admin_or_above(auth.uid()))
);