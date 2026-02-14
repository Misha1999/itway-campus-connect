
ALTER TABLE public.materials DROP CONSTRAINT materials_content_type_check;
ALTER TABLE public.materials ADD CONSTRAINT materials_content_type_check
  CHECK (content_type = ANY (ARRAY['text','file','video','link','homework','test','lesson']));
