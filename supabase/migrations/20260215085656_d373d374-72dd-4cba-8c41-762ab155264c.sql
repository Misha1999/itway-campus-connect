
-- Add campus_ids array and cover_image_url to courses
ALTER TABLE public.courses ADD COLUMN campus_ids uuid[] DEFAULT '{}';
ALTER TABLE public.courses ADD COLUMN cover_image_url text;

-- Create storage bucket for course assets (images)
INSERT INTO storage.buckets (id, name, public) VALUES ('course-assets', 'course-assets', true);

-- Create storage bucket for materials (file uploads in block editor)
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true);

-- Storage policies for course-assets bucket
CREATE POLICY "Anyone can view course assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-assets');

CREATE POLICY "Admins and teachers can upload course assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-assets' 
  AND (
    public.is_admin_or_above(auth.uid()) 
    OR public.has_role(auth.uid(), 'teacher')
  )
);

CREATE POLICY "Admins and teachers can update course assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-assets' 
  AND (
    public.is_admin_or_above(auth.uid()) 
    OR public.has_role(auth.uid(), 'teacher')
  )
);

CREATE POLICY "Admins and teachers can delete course assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-assets' 
  AND (
    public.is_admin_or_above(auth.uid()) 
    OR public.has_role(auth.uid(), 'teacher')
  )
);

-- Storage policies for materials bucket
CREATE POLICY "Anyone can view materials files"
ON storage.objects FOR SELECT
USING (bucket_id = 'materials');

CREATE POLICY "Admins and teachers can upload materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'materials' 
  AND (
    public.is_admin_or_above(auth.uid()) 
    OR public.has_role(auth.uid(), 'teacher')
  )
);

CREATE POLICY "Admins and teachers can update materials files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'materials' 
  AND (
    public.is_admin_or_above(auth.uid()) 
    OR public.has_role(auth.uid(), 'teacher')
  )
);

CREATE POLICY "Admins and teachers can delete materials files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'materials' 
  AND (
    public.is_admin_or_above(auth.uid()) 
    OR public.has_role(auth.uid(), 'teacher')
  )
);
