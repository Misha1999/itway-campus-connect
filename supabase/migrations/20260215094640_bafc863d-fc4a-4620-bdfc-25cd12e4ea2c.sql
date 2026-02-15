
-- Create lesson_slots table
CREATE TABLE public.lesson_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campus_id uuid NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
  study_program_id uuid REFERENCES public.study_programs(id) ON DELETE CASCADE,
  name text,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon, 6=Sun
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  is_global boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX idx_lesson_slots_campus ON public.lesson_slots(campus_id);
CREATE INDEX idx_lesson_slots_program ON public.lesson_slots(study_program_id) WHERE study_program_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.lesson_slots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Campus admins can manage lesson slots"
  ON public.lesson_slots FOR ALL
  USING (is_campus_admin(auth.uid(), campus_id));

CREATE POLICY "Users with campus access can view slots"
  ON public.lesson_slots FOR SELECT
  USING (has_campus_access(auth.uid(), campus_id));

-- Trigger for updated_at
CREATE TRIGGER update_lesson_slots_updated_at
  BEFORE UPDATE ON public.lesson_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger: prevent time overlaps within same campus/day/program scope
CREATE OR REPLACE FUNCTION public.validate_lesson_slot_overlap()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  new_end_time time;
  conflict_count integer;
BEGIN
  new_end_time := NEW.start_time + (NEW.duration_minutes || ' minutes')::interval;

  SELECT COUNT(*) INTO conflict_count
  FROM public.lesson_slots ls
  WHERE ls.campus_id = NEW.campus_id
    AND ls.day_of_week = NEW.day_of_week
    AND ls.is_active = true
    AND ls.id IS DISTINCT FROM NEW.id
    AND ls.is_global = NEW.is_global
    AND (
      (NEW.is_global = true AND ls.is_global = true)
      OR (NEW.is_global = false AND ls.study_program_id = NEW.study_program_id)
    )
    AND ls.start_time < new_end_time
    AND (ls.start_time + (ls.duration_minutes || ' minutes')::interval) > NEW.start_time;

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Слот перетинається з іншим слотом у цей день';
  END IF;

  -- Ensure consistency: global slots have no program, individual slots must have one
  IF NEW.is_global = true THEN
    NEW.study_program_id := NULL;
  ELSIF NEW.study_program_id IS NULL THEN
    RAISE EXCEPTION 'Індивідуальний слот повинен мати прив''язку до програми навчання';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_lesson_slot_overlap_trigger
  BEFORE INSERT OR UPDATE ON public.lesson_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lesson_slot_overlap();
