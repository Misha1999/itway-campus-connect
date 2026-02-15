
-- 1. Add is_universal flag to classrooms
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS is_universal BOOLEAN NOT NULL DEFAULT false;

-- 2. Add classroom_id to schedule_events (keeping room_id for backward compat)
ALTER TABLE public.schedule_events ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL;

-- 3. Create index for faster conflict queries
CREATE INDEX IF NOT EXISTS idx_schedule_events_start_time ON public.schedule_events(start_time);
CREATE INDEX IF NOT EXISTS idx_schedule_events_end_time ON public.schedule_events(end_time);
CREATE INDEX IF NOT EXISTS idx_schedule_events_teacher_id ON public.schedule_events(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_group_id ON public.schedule_events(group_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_classroom_id ON public.schedule_events(classroom_id);

-- 4. Conflict check function (returns conflicts as JSON array)
CREATE OR REPLACE FUNCTION public.check_schedule_conflicts(
  _event_id UUID,
  _start_time TIMESTAMPTZ,
  _end_time TIMESTAMPTZ,
  _teacher_id UUID,
  _group_id UUID,
  _classroom_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflicts JSONB := '[]'::jsonb;
  conflict_record RECORD;
BEGIN
  -- Teacher conflict
  IF _teacher_id IS NOT NULL THEN
    FOR conflict_record IN
      SELECT se.id, se.title, se.start_time, se.end_time, 'teacher' as conflict_type
      FROM schedule_events se
      WHERE se.teacher_id = _teacher_id
        AND se.is_cancelled = false
        AND (_event_id IS NULL OR se.id != _event_id)
        AND se.start_time < _end_time
        AND se.end_time > _start_time
    LOOP
      conflicts := conflicts || jsonb_build_object(
        'type', 'teacher',
        'event_id', conflict_record.id,
        'title', conflict_record.title,
        'start_time', conflict_record.start_time,
        'end_time', conflict_record.end_time
      );
    END LOOP;
  END IF;

  -- Group conflict
  IF _group_id IS NOT NULL THEN
    FOR conflict_record IN
      SELECT se.id, se.title, se.start_time, se.end_time, 'group' as conflict_type
      FROM schedule_events se
      WHERE se.group_id = _group_id
        AND se.is_cancelled = false
        AND (_event_id IS NULL OR se.id != _event_id)
        AND se.start_time < _end_time
        AND se.end_time > _start_time
    LOOP
      conflicts := conflicts || jsonb_build_object(
        'type', 'group',
        'event_id', conflict_record.id,
        'title', conflict_record.title,
        'start_time', conflict_record.start_time,
        'end_time', conflict_record.end_time
      );
    END LOOP;
  END IF;

  -- Classroom conflict (skip if universal)
  IF _classroom_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM classrooms WHERE id = _classroom_id AND is_universal = true
    ) THEN
      FOR conflict_record IN
        SELECT se.id, se.title, se.start_time, se.end_time, 'classroom' as conflict_type
        FROM schedule_events se
        WHERE se.classroom_id = _classroom_id
          AND se.is_cancelled = false
          AND (_event_id IS NULL OR se.id != _event_id)
          AND se.start_time < _end_time
          AND se.end_time > _start_time
      LOOP
        conflicts := conflicts || jsonb_build_object(
          'type', 'classroom',
          'event_id', conflict_record.id,
          'title', conflict_record.title,
          'start_time', conflict_record.start_time,
          'end_time', conflict_record.end_time
        );
      END LOOP;
    END IF;
  END IF;

  RETURN conflicts;
END;
$$;

-- 5. Function to get available classrooms for a time slot
CREATE OR REPLACE FUNCTION public.get_available_classrooms(
  _campus_id UUID,
  _start_time TIMESTAMPTZ,
  _end_time TIMESTAMPTZ,
  _exclude_event_id UUID DEFAULT NULL
)
RETURNS SETOF classrooms
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.*
  FROM classrooms c
  WHERE c.campus_id = _campus_id
    AND c.is_active = true
    AND (
      c.is_universal = true
      OR NOT EXISTS (
        SELECT 1
        FROM schedule_events se
        WHERE se.classroom_id = c.id
          AND se.is_cancelled = false
          AND (_exclude_event_id IS NULL OR se.id != _exclude_event_id)
          AND se.start_time < _end_time
          AND se.end_time > _start_time
      )
    )
  ORDER BY c.is_universal DESC, c.name;
$$;
