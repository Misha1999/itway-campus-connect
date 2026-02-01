export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          allow_resubmission: boolean
          created_at: string
          created_by: string | null
          deadline: string
          description: string | null
          file_urls: string[] | null
          group_id: string
          id: string
          instructions: string | null
          lesson_id: string | null
          max_score: number | null
          status: Database["public"]["Enums"]["assignment_status"]
          title: string
          updated_at: string
          visible_from: string | null
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          allow_resubmission?: boolean
          created_at?: string
          created_by?: string | null
          deadline: string
          description?: string | null
          file_urls?: string[] | null
          group_id: string
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          max_score?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          title: string
          updated_at?: string
          visible_from?: string | null
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          allow_resubmission?: boolean
          created_at?: string
          created_by?: string | null
          deadline?: string
          description?: string | null
          file_urls?: string[] | null
          group_id?: string
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          max_score?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          title?: string
          updated_at?: string
          visible_from?: string | null
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: [
          {
            foreignKeyName: "assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          id: string
          marked_at: string
          marked_by: string | null
          notes: string | null
          schedule_event_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          id?: string
          marked_at?: string
          marked_by?: string | null
          notes?: string | null
          schedule_event_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          id?: string
          marked_at?: string
          marked_by?: string | null
          notes?: string | null
          schedule_event_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_schedule_event_id_fkey"
            columns: ["schedule_event_id"]
            isOneToOne: false
            referencedRelation: "schedule_events"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      badge_awards: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          id: string
          reason: string | null
          student_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          id?: string
          reason?: string | null
          student_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          id?: string
          reason?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_awards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          points_value: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          points_value?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points_value?: number | null
        }
        Relationships: []
      }
      campus_memberships: {
        Row: {
          campus_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          campus_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          campus_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_memberships_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          accent_color: string | null
          address: string | null
          city: string
          created_at: string
          email: string | null
          email_domain: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          timezone: string
          updated_at: string
          work_schedule: Json | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          city: string
          created_at?: string
          email?: string | null
          email_domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          timezone?: string
          updated_at?: string
          work_schedule?: Json | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          city?: string
          created_at?: string
          email?: string | null
          email_domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
          work_schedule?: Json | null
        }
        Relationships: []
      }
      coins_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          reason: string
          source_id: string | null
          source_type: string | null
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          source_id?: string | null
          source_type?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          source_id?: string | null
          source_type?: string | null
          student_id?: string
        }
        Relationships: []
      }
      content_library: {
        Row: {
          campus_ids: string[] | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          created_by: string | null
          description: string | null
          direction_id: string | null
          external_url: string | null
          file_url: string | null
          id: string
          is_public: boolean
          level: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          campus_ids?: string[] | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction_id?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_public?: boolean
          level?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          campus_ids?: string[] | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction_id?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_public?: boolean
          level?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_library_direction_id_fkey"
            columns: ["direction_id"]
            isOneToOne: false
            referencedRelation: "directions"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          direction_id: string | null
          duration_hours: number | null
          id: string
          is_active: boolean
          level: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          direction_id?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean
          level?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          direction_id?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean
          level?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_direction_id_fkey"
            columns: ["direction_id"]
            isOneToOne: false
            referencedRelation: "directions"
            referencedColumns: ["id"]
          },
        ]
      }
      directions: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      enrollment_cohorts: {
        Row: {
          campus_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          start_date: string | null
        }
        Insert: {
          campus_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
        }
        Update: {
          campus_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_cohorts_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          assignment_id: string | null
          comment: string | null
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          max_score: number
          schedule_event_id: string | null
          score: number
          student_id: string
          weight: number
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          assignment_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          max_score?: number
          schedule_event_id?: string | null
          score: number
          student_id: string
          weight?: number
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          assignment_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          max_score?: number
          schedule_event_id?: string | null
          score?: number
          student_id?: string
          weight?: number
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: [
          {
            foreignKeyName: "grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_schedule_event_id_fkey"
            columns: ["schedule_event_id"]
            isOneToOne: false
            referencedRelation: "schedule_events"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          enrolled_at: string
          group_id: string
          id: string
          left_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          enrolled_at?: string
          group_id: string
          id?: string
          left_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          enrolled_at?: string
          group_id?: string
          id?: string
          left_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          age_range: string | null
          campus_id: string
          course_id: string | null
          created_at: string
          end_date: string | null
          enrollment_cohort_id: string | null
          format: Database["public"]["Enums"]["group_format"]
          id: string
          is_active: boolean
          level: string | null
          max_students: number | null
          name: string
          schedule_template: Json | null
          start_date: string | null
          study_program_id: string | null
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          campus_id: string
          course_id?: string | null
          created_at?: string
          end_date?: string | null
          enrollment_cohort_id?: string | null
          format?: Database["public"]["Enums"]["group_format"]
          id?: string
          is_active?: boolean
          level?: string | null
          max_students?: number | null
          name: string
          schedule_template?: Json | null
          start_date?: string | null
          study_program_id?: string | null
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          campus_id?: string
          course_id?: string | null
          created_at?: string
          end_date?: string | null
          enrollment_cohort_id?: string | null
          format?: Database["public"]["Enums"]["group_format"]
          id?: string
          is_active?: boolean
          level?: string | null
          max_students?: number | null
          name?: string
          schedule_template?: Json | null
          start_date?: string | null
          study_program_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_enrollment_cohort_id_fkey"
            columns: ["enrollment_cohort_id"]
            isOneToOne: false
            referencedRelation: "enrollment_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_study_program_id_fkey"
            columns: ["study_program_id"]
            isOneToOne: false
            referencedRelation: "study_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          module_id: string
          name: string
          order_index: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id: string
          name: string
          order_index?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_student_links: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          enrollment_cohort_id: string | null
          full_name: string
          generated_login: string | null
          generated_password_hash: string | null
          id: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          study_program_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          enrollment_cohort_id?: string | null
          full_name: string
          generated_login?: string | null
          generated_password_hash?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          study_program_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          enrollment_cohort_id?: string | null
          full_name?: string
          generated_login?: string | null
          generated_password_hash?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          study_program_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_enrollment_cohort_id_fkey"
            columns: ["enrollment_cohort_id"]
            isOneToOne: false
            referencedRelation: "enrollment_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_study_program_id_fkey"
            columns: ["study_program_id"]
            isOneToOne: false
            referencedRelation: "study_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          campus_id: string
          capacity: number | null
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          campus_id: string
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          campus_id?: string
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          cancelled_reason: string | null
          created_at: string
          description: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["event_type"]
          group_id: string
          id: string
          is_cancelled: boolean
          lesson_id: string | null
          online_link: string | null
          room_id: string | null
          start_time: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cancelled_reason?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          event_type?: Database["public"]["Enums"]["event_type"]
          group_id: string
          id?: string
          is_cancelled?: boolean
          lesson_id?: string | null
          online_link?: string | null
          room_id?: string | null
          start_time: string
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cancelled_reason?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          group_id?: string
          id?: string
          is_cancelled?: boolean
          lesson_id?: string | null
          online_link?: string | null
          room_id?: string | null
          start_time?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      study_programs: {
        Row: {
          campus_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          campus_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          campus_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_programs_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_id: string
          content: string | null
          created_at: string
          feedback: string | null
          file_urls: string[] | null
          graded_at: string | null
          graded_by: string | null
          id: string
          links: string[] | null
          score: number | null
          status: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_urls?: string[] | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          links?: string[] | null
          score?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_urls?: string[] | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          links?: string[] | null
          score?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_coin_balance: { Args: { _student_id: string }; Returns: number }
      has_campus_access: {
        Args: { _campus_id: string; _user_id: string }
        Returns: boolean
      }
      has_group_access: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_network: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_above: { Args: { _user_id: string }; Returns: boolean }
      is_campus_admin: {
        Args: { _campus_id: string; _user_id: string }
        Returns: boolean
      }
      is_parent_of_student: {
        Args: { _parent_id: string; _student_id: string }
        Returns: boolean
      }
      is_student_in_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_teacher_of_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin_network"
        | "admin_campus"
        | "teacher"
        | "student"
        | "parent_viewer"
      assignment_status: "draft" | "published" | "archived"
      attendance_status: "present" | "absent" | "late" | "excused"
      content_type: "file" | "video" | "link" | "document" | "template" | "test"
      event_type: "lesson" | "practice" | "test" | "project" | "other"
      group_format: "online" | "offline" | "hybrid"
      submission_status:
        | "not_started"
        | "in_progress"
        | "submitted"
        | "reviewing"
        | "revision_needed"
        | "accepted"
      user_status: "active" | "archived" | "pending"
      work_type: "homework" | "practice" | "project" | "test" | "activity"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin_network",
        "admin_campus",
        "teacher",
        "student",
        "parent_viewer",
      ],
      assignment_status: ["draft", "published", "archived"],
      attendance_status: ["present", "absent", "late", "excused"],
      content_type: ["file", "video", "link", "document", "template", "test"],
      event_type: ["lesson", "practice", "test", "project", "other"],
      group_format: ["online", "offline", "hybrid"],
      submission_status: [
        "not_started",
        "in_progress",
        "submitted",
        "reviewing",
        "revision_needed",
        "accepted",
      ],
      user_status: ["active", "archived", "pending"],
      work_type: ["homework", "practice", "project", "test", "activity"],
    },
  },
} as const
