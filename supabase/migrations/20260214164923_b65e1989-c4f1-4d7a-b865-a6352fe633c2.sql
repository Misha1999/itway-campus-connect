
-- Add separate material_id fields for each activity type
ALTER TABLE public.lessons
ADD COLUMN homework_material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
ADD COLUMN test_material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
ADD COLUMN project_material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL;

-- Indexes for faster lookups
CREATE INDEX idx_lessons_homework_material_id ON public.lessons(homework_material_id);
CREATE INDEX idx_lessons_test_material_id ON public.lessons(test_material_id);
CREATE INDEX idx_lessons_project_material_id ON public.lessons(project_material_id);

COMMENT ON COLUMN public.lessons.homework_material_id IS 'Material content for homework activity';
COMMENT ON COLUMN public.lessons.test_material_id IS 'Material content for test activity';
COMMENT ON COLUMN public.lessons.project_material_id IS 'Material content for project activity';
