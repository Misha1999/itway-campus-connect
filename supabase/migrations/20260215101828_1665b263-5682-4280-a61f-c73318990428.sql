
-- Create classrooms table
CREATE TABLE public.classrooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campus_id UUID NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Campus admins can manage classrooms"
  ON public.classrooms FOR ALL
  USING (is_campus_admin(auth.uid(), campus_id));

CREATE POLICY "Users with campus access can view classrooms"
  ON public.classrooms FOR SELECT
  USING (has_campus_access(auth.uid(), campus_id));

-- Trigger for updated_at
CREATE TRIGGER update_classrooms_updated_at
  BEFORE UPDATE ON public.classrooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
