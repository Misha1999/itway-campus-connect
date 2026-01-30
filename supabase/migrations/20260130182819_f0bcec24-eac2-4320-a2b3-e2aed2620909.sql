-- Create study_programs table (Програми навчання)
CREATE TABLE public.study_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enrollment_cohorts table (Потоки набору)
CREATE TABLE public.enrollment_cohorts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add study_program_id and enrollment_cohort_id to groups table
ALTER TABLE public.groups 
ADD COLUMN study_program_id UUID REFERENCES public.study_programs(id) ON DELETE SET NULL,
ADD COLUMN enrollment_cohort_id UUID REFERENCES public.enrollment_cohorts(id) ON DELETE SET NULL;

-- Add student-specific fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN study_program_id UUID REFERENCES public.study_programs(id) ON DELETE SET NULL,
ADD COLUMN enrollment_cohort_id UUID REFERENCES public.enrollment_cohorts(id) ON DELETE SET NULL,
ADD COLUMN generated_login TEXT,
ADD COLUMN generated_password_hash TEXT;

-- Enable RLS on new tables
ALTER TABLE public.study_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_cohorts ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_programs
CREATE POLICY "Admins can manage study programs"
ON public.study_programs FOR ALL
USING (is_campus_admin(auth.uid(), campus_id));

CREATE POLICY "Authenticated users can view active programs"
ON public.study_programs FOR SELECT
USING (is_active = true OR is_admin_or_above(auth.uid()));

-- RLS policies for enrollment_cohorts
CREATE POLICY "Admins can manage enrollment cohorts"
ON public.enrollment_cohorts FOR ALL
USING (is_campus_admin(auth.uid(), campus_id));

CREATE POLICY "Authenticated users can view active cohorts"
ON public.enrollment_cohorts FOR SELECT
USING (is_active = true OR is_admin_or_above(auth.uid()));

-- Trigger for updated_at on study_programs
CREATE TRIGGER update_study_programs_updated_at
BEFORE UPDATE ON public.study_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();