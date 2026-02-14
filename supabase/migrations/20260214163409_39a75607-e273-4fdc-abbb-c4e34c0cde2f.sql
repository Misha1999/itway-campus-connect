
ALTER TABLE public.lessons 
ADD COLUMN material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL;

ALTER TABLE public.lessons 
ADD COLUMN lesson_type text NOT NULL DEFAULT 'lesson';

CREATE INDEX idx_lessons_material_id ON public.lessons(material_id);

COMMENT ON COLUMN public.lessons.material_id IS 'Link to material content for this lesson';
COMMENT ON COLUMN public.lessons.lesson_type IS 'Type of lesson activity: lesson, homework, test, project';
