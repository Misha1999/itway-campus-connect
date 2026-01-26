-- =============================================
-- ITway LMS Database Schema
-- Multi-tenant with RBAC
-- =============================================

-- 1. ENUM TYPES
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin_network', 'admin_campus', 'teacher', 'student', 'parent_viewer');
CREATE TYPE public.user_status AS ENUM ('active', 'archived', 'pending');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE public.assignment_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.submission_status AS ENUM ('not_started', 'in_progress', 'submitted', 'reviewing', 'revision_needed', 'accepted');
CREATE TYPE public.work_type AS ENUM ('homework', 'practice', 'project', 'test', 'activity');
CREATE TYPE public.content_type AS ENUM ('file', 'video', 'link', 'document', 'template', 'test');
CREATE TYPE public.event_type AS ENUM ('lesson', 'practice', 'test', 'project', 'other');
CREATE TYPE public.group_format AS ENUM ('online', 'offline', 'hybrid');

-- 2. USER ROLES TABLE (separate from profiles as per security requirements)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. SECURITY DEFINER FUNCTIONS (to avoid RLS recursion)
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_network(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin_network')
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_above(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin_network', 'admin_campus')
  )
$$;

-- 4. CAMPUSES TABLE
-- =============================================
CREATE TABLE public.campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Kyiv',
  logo_url TEXT,
  accent_color TEXT DEFAULT '#3B82F6',
  work_schedule JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;

-- 5. PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  avatar_url TEXT,
  notes TEXT,
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. CAMPUS MEMBERSHIPS (links users to campuses with roles)
-- =============================================
CREATE TABLE public.campus_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, campus_id)
);

ALTER TABLE public.campus_memberships ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is admin of a specific campus
CREATE OR REPLACE FUNCTION public.is_campus_admin(_user_id UUID, _campus_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campus_memberships
    WHERE user_id = _user_id 
      AND campus_id = _campus_id 
      AND role = 'admin_campus'
  ) OR public.is_admin_network(_user_id)
$$;

-- Helper function: Check if user has any access to a campus
CREATE OR REPLACE FUNCTION public.has_campus_access(_user_id UUID, _campus_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campus_memberships
    WHERE user_id = _user_id AND campus_id = _campus_id
  ) OR public.is_admin_network(_user_id)
$$;

-- 7. ROOMS TABLE
-- =============================================
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 8. DIRECTIONS TABLE
-- =============================================
CREATE TABLE public.directions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.directions ENABLE ROW LEVEL SECURITY;

-- 9. COURSES TABLE
-- =============================================
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction_id UUID REFERENCES public.directions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT,
  duration_hours INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 10. GROUPS TABLE
-- =============================================
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id UUID REFERENCES public.campuses(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  age_range TEXT,
  level TEXT,
  format group_format NOT NULL DEFAULT 'offline',
  max_students INTEGER,
  start_date DATE,
  end_date DATE,
  schedule_template JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 11. GROUP MEMBERSHIPS (teachers and students in groups)
-- =============================================
CREATE TABLE public.group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL CHECK (role IN ('teacher', 'student')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE (user_id, group_id)
);

ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is teacher of a group
CREATE OR REPLACE FUNCTION public.is_teacher_of_group(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE user_id = _user_id 
      AND group_id = _group_id 
      AND role = 'teacher'
      AND left_at IS NULL
  )
$$;

-- Helper function: Check if user is student in a group
CREATE OR REPLACE FUNCTION public.is_student_in_group(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE user_id = _user_id 
      AND group_id = _group_id 
      AND role = 'student'
      AND left_at IS NULL
  )
$$;

-- Helper function: Check if user has access to a group
CREATE OR REPLACE FUNCTION public.has_group_access(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE user_id = _user_id 
      AND group_id = _group_id
      AND left_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.campus_memberships cm ON cm.campus_id = g.campus_id
    WHERE g.id = _group_id 
      AND cm.user_id = _user_id 
      AND cm.role IN ('admin_campus')
  ) OR public.is_admin_network(_user_id)
$$;

-- 12. MODULES TABLE
-- =============================================
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- 13. LESSONS TABLE
-- =============================================
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- 14. SCHEDULE EVENTS TABLE
-- =============================================
CREATE TABLE public.schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type event_type NOT NULL DEFAULT 'lesson',
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  online_link TEXT,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

-- 15. ASSIGNMENTS TABLE
-- =============================================
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  deadline TIMESTAMPTZ NOT NULL,
  max_score INTEGER DEFAULT 100,
  work_type work_type NOT NULL DEFAULT 'homework',
  status assignment_status NOT NULL DEFAULT 'draft',
  allow_resubmission BOOLEAN NOT NULL DEFAULT true,
  visible_from TIMESTAMPTZ,
  file_urls TEXT[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- 16. SUBMISSIONS TABLE
-- =============================================
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  file_urls TEXT[],
  links TEXT[],
  status submission_status NOT NULL DEFAULT 'not_started',
  score INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 17. GRADES TABLE
-- =============================================
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  schedule_event_id UUID REFERENCES public.schedule_events(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  work_type work_type NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL DEFAULT 100,
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  comment TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- 18. ATTENDANCE RECORDS TABLE
-- =============================================
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  schedule_event_id UUID REFERENCES public.schedule_events(id) ON DELETE CASCADE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, schedule_event_id)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 19. CONTENT LIBRARY TABLE
-- =============================================
CREATE TABLE public.content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_type content_type NOT NULL DEFAULT 'file',
  file_url TEXT,
  external_url TEXT,
  direction_id UUID REFERENCES public.directions(id) ON DELETE SET NULL,
  level TEXT,
  tags TEXT[],
  is_public BOOLEAN NOT NULL DEFAULT false,
  campus_ids UUID[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

-- 20. BADGES TABLE
-- =============================================
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  points_value INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- 21. BADGE AWARDS TABLE
-- =============================================
CREATE TABLE public.badge_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  UNIQUE (badge_id, student_id)
);

ALTER TABLE public.badge_awards ENABLE ROW LEVEL SECURITY;

-- 22. COINS LEDGER TABLE
-- =============================================
CREATE TABLE public.coins_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT,
  source_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coins_ledger ENABLE ROW LEVEL SECURITY;

-- 23. NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 24. AUDIT LOGS TABLE
-- =============================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 25. PARENT-STUDENT LINKS TABLE
-- =============================================
CREATE TABLE public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is parent of student
CREATE OR REPLACE FUNCTION public.is_parent_of_student(_parent_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_id = _parent_id AND student_id = _student_id
  )
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- USER ROLES POLICIES
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin_network(auth.uid()));

-- CAMPUSES POLICIES
CREATE POLICY "Anyone authenticated can view active campuses" ON public.campuses
  FOR SELECT TO authenticated USING (is_active = true OR public.is_admin_network(auth.uid()));

CREATE POLICY "Network admins can manage campuses" ON public.campuses
  FOR ALL USING (public.is_admin_network(auth.uid()));

CREATE POLICY "Campus admins can update own campus" ON public.campuses
  FOR UPDATE USING (public.is_campus_admin(auth.uid(), id));

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- CAMPUS MEMBERSHIPS POLICIES
CREATE POLICY "Users can view own memberships" ON public.campus_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Campus admins can view campus members" ON public.campus_memberships
  FOR SELECT USING (public.is_campus_admin(auth.uid(), campus_id));

CREATE POLICY "Network admins can manage memberships" ON public.campus_memberships
  FOR ALL USING (public.is_admin_network(auth.uid()));

CREATE POLICY "Campus admins can manage own campus memberships" ON public.campus_memberships
  FOR ALL USING (public.is_campus_admin(auth.uid(), campus_id));

-- ROOMS POLICIES
CREATE POLICY "Users with campus access can view rooms" ON public.rooms
  FOR SELECT USING (public.has_campus_access(auth.uid(), campus_id));

CREATE POLICY "Campus admins can manage rooms" ON public.rooms
  FOR ALL USING (public.is_campus_admin(auth.uid(), campus_id));

-- DIRECTIONS POLICIES
CREATE POLICY "Authenticated users can view directions" ON public.directions
  FOR SELECT TO authenticated USING (is_active = true OR public.is_admin_network(auth.uid()));

CREATE POLICY "Network admins can manage directions" ON public.directions
  FOR ALL USING (public.is_admin_network(auth.uid()));

-- COURSES POLICIES
CREATE POLICY "Authenticated users can view courses" ON public.courses
  FOR SELECT TO authenticated USING (is_active = true OR public.is_admin_or_above(auth.uid()));

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (public.is_admin_or_above(auth.uid()));

-- GROUPS POLICIES
CREATE POLICY "Users with group access can view groups" ON public.groups
  FOR SELECT USING (public.has_group_access(auth.uid(), id) OR public.has_campus_access(auth.uid(), campus_id));

CREATE POLICY "Campus admins can manage groups" ON public.groups
  FOR ALL USING (public.is_campus_admin(auth.uid(), campus_id));

CREATE POLICY "Teachers can update their groups" ON public.groups
  FOR UPDATE USING (public.is_teacher_of_group(auth.uid(), id));

-- GROUP MEMBERSHIPS POLICIES
CREATE POLICY "Users can view own group memberships" ON public.group_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Group members can view group memberships" ON public.group_memberships
  FOR SELECT USING (public.has_group_access(auth.uid(), group_id));

CREATE POLICY "Teachers can manage group memberships" ON public.group_memberships
  FOR ALL USING (public.is_teacher_of_group(auth.uid(), group_id));

CREATE POLICY "Campus admins can manage group memberships" ON public.group_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_memberships.group_id
        AND public.is_campus_admin(auth.uid(), g.campus_id)
    )
  );

-- MODULES POLICIES
CREATE POLICY "Authenticated users can view modules" ON public.modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage modules" ON public.modules
  FOR ALL USING (public.is_admin_or_above(auth.uid()));

-- LESSONS POLICIES
CREATE POLICY "Authenticated users can view lessons" ON public.lessons
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage lessons" ON public.lessons
  FOR ALL USING (public.is_admin_or_above(auth.uid()));

-- SCHEDULE EVENTS POLICIES
CREATE POLICY "Users can view group schedule" ON public.schedule_events
  FOR SELECT USING (public.has_group_access(auth.uid(), group_id));

CREATE POLICY "Teachers can manage group schedule" ON public.schedule_events
  FOR ALL USING (public.is_teacher_of_group(auth.uid(), group_id));

CREATE POLICY "Campus admins can manage schedule" ON public.schedule_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = schedule_events.group_id
        AND public.is_campus_admin(auth.uid(), g.campus_id)
    )
  );

-- ASSIGNMENTS POLICIES
CREATE POLICY "Users can view group assignments" ON public.assignments
  FOR SELECT USING (
    public.has_group_access(auth.uid(), group_id)
    AND (status = 'published' OR public.is_teacher_of_group(auth.uid(), group_id) OR public.is_admin_or_above(auth.uid()))
  );

CREATE POLICY "Teachers can manage group assignments" ON public.assignments
  FOR ALL USING (public.is_teacher_of_group(auth.uid(), group_id));

CREATE POLICY "Admins can manage assignments" ON public.assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = assignments.group_id
        AND public.is_campus_admin(auth.uid(), g.campus_id)
    )
  );

-- SUBMISSIONS POLICIES
CREATE POLICY "Students can view own submissions" ON public.submissions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create own submissions" ON public.submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own submissions" ON public.submissions
  FOR UPDATE USING (student_id = auth.uid() AND status IN ('not_started', 'in_progress', 'revision_needed'));

CREATE POLICY "Teachers can view group submissions" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = submissions.assignment_id
        AND public.is_teacher_of_group(auth.uid(), a.group_id)
    )
  );

CREATE POLICY "Teachers can update submissions" ON public.submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = submissions.assignment_id
        AND public.is_teacher_of_group(auth.uid(), a.group_id)
    )
  );

-- GRADES POLICIES
CREATE POLICY "Students can view own grades" ON public.grades
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Parents can view linked student grades" ON public.grades
  FOR SELECT USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE POLICY "Teachers can view group grades" ON public.grades
  FOR SELECT USING (public.has_group_access(auth.uid(), group_id));

CREATE POLICY "Teachers can manage group grades" ON public.grades
  FOR ALL USING (public.is_teacher_of_group(auth.uid(), group_id));

CREATE POLICY "Admins can manage grades" ON public.grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = grades.group_id
        AND public.is_campus_admin(auth.uid(), g.campus_id)
    )
  );

-- ATTENDANCE RECORDS POLICIES
CREATE POLICY "Students can view own attendance" ON public.attendance_records
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Parents can view linked student attendance" ON public.attendance_records
  FOR SELECT USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE POLICY "Teachers can view group attendance" ON public.attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schedule_events se
      JOIN public.groups g ON g.id = se.group_id
      WHERE se.id = attendance_records.schedule_event_id
        AND public.has_group_access(auth.uid(), g.id)
    )
  );

CREATE POLICY "Teachers can manage attendance" ON public.attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.schedule_events se
      WHERE se.id = attendance_records.schedule_event_id
        AND public.is_teacher_of_group(auth.uid(), se.group_id)
    )
  );

-- CONTENT LIBRARY POLICIES
CREATE POLICY "Public content is viewable by all" ON public.content_library
  FOR SELECT TO authenticated USING (is_public = true);

CREATE POLICY "Admins can view all content" ON public.content_library
  FOR SELECT USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "Admins can manage content" ON public.content_library
  FOR ALL USING (public.is_admin_or_above(auth.uid()));

CREATE POLICY "Teachers can create content" ON public.content_library
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update own content" ON public.content_library
  FOR UPDATE USING (created_by = auth.uid());

-- BADGES POLICIES
CREATE POLICY "Authenticated users can view badges" ON public.badges
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage badges" ON public.badges
  FOR ALL USING (public.is_admin_or_above(auth.uid()));

-- BADGE AWARDS POLICIES
CREATE POLICY "Students can view own badge awards" ON public.badge_awards
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Parents can view linked student awards" ON public.badge_awards
  FOR SELECT USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE POLICY "Teachers can manage badge awards" ON public.badge_awards
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.is_admin_or_above(auth.uid()));

-- COINS LEDGER POLICIES
CREATE POLICY "Students can view own coin history" ON public.coins_ledger
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Parents can view linked student coins" ON public.coins_ledger
  FOR SELECT USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE POLICY "Teachers can manage coins" ON public.coins_ledger
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.is_admin_or_above(auth.uid()));

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- AUDIT LOGS POLICIES
CREATE POLICY "Network admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin_network(auth.uid()));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- PARENT STUDENT LINKS POLICIES
CREATE POLICY "Parents can view own links" ON public.parent_student_links
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Students can view links to self" ON public.parent_student_links
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Admins can manage parent links" ON public.parent_student_links
  FOR ALL USING (public.is_admin_or_above(auth.uid()));

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_campuses_updated_at BEFORE UPDATE ON public.campuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_events_updated_at BEFORE UPDATE ON public.schedule_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_library_updated_at BEFORE UPDATE ON public.content_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER FOR AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FUNCTION TO GET STUDENT COIN BALANCE
-- =============================================
CREATE OR REPLACE FUNCTION public.get_coin_balance(_student_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.coins_ledger
  WHERE student_id = _student_id
$$;