// ITway LMS Types

export type UserRole = 'admin_network' | 'admin_campus' | 'teacher' | 'student' | 'parent_viewer';

export type UserStatus = 'active' | 'archived' | 'pending';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type AssignmentStatus = 'draft' | 'published' | 'submitted' | 'reviewing' | 'revision_needed' | 'graded';

export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'reviewing' | 'revision_needed' | 'accepted';

export type GradeScale = '1-12' | '0-100' | 'pass-fail' | 'custom';

export type WorkType = 'homework' | 'practice' | 'project' | 'test' | 'activity';

export type ContentType = 'file' | 'video' | 'link' | 'document' | 'template' | 'test';

export type EventType = 'lesson' | 'practice' | 'test' | 'project' | 'other';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  birth_date?: string;
  status: UserStatus;
  avatar_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Campus {
  id: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  logo_url?: string;
  accent_color?: string;
  work_schedule?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Direction {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
}

export interface Course {
  id: string;
  direction_id: string;
  name: string;
  description?: string;
  level?: string;
  duration_hours?: number;
  is_active: boolean;
}

export interface Group {
  id: string;
  campus_id: string;
  course_id: string;
  name: string;
  age_range?: string;
  level?: string;
  format: 'online' | 'offline' | 'hybrid';
  max_students?: number;
  start_date?: string;
  end_date?: string;
  schedule_template?: Record<string, unknown>;
  is_active: boolean;
}

export interface Module {
  id: string;
  course_id: string;
  name: string;
  description?: string;
  order_index: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  name: string;
  description?: string;
  order_index: number;
  duration_minutes?: number;
}

export interface ScheduleEvent {
  id: string;
  group_id: string;
  lesson_id?: string;
  room_id?: string;
  teacher_id?: string;
  event_type: EventType;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  online_link?: string;
  is_cancelled: boolean;
  cancelled_reason?: string;
}

export interface Assignment {
  id: string;
  group_id: string;
  lesson_id?: string;
  title: string;
  description?: string;
  instructions?: string;
  deadline: string;
  max_score?: number;
  work_type: WorkType;
  status: AssignmentStatus;
  allow_resubmission: boolean;
  visible_from?: string;
  created_by: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content?: string;
  file_urls?: string[];
  links?: string[];
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  submitted_at?: string;
  graded_at?: string;
  graded_by?: string;
}

export interface Grade {
  id: string;
  student_id: string;
  group_id: string;
  schedule_event_id?: string;
  assignment_id?: string;
  work_type: WorkType;
  score: number;
  max_score: number;
  weight: number;
  comment?: string;
  created_by: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  schedule_event_id: string;
  status: AttendanceStatus;
  notes?: string;
  marked_by: string;
  marked_at: string;
}

export interface CoinTransaction {
  id: string;
  student_id: string;
  amount: number;
  reason: string;
  source_type?: string;
  source_id?: string;
  created_by: string;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  points_value?: number;
  is_active: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  content_type: ContentType;
  file_url?: string;
  external_url?: string;
  direction_id?: string;
  level?: string;
  tags?: string[];
  is_public: boolean;
  campus_ids?: string[];
  created_by: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}
