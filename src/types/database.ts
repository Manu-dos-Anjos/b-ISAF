// src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:                string
          full_name:         string
          email:             string
          student_number:    string | null
          avatar_url:        string | null
          bio:               string | null
          role:              "student" | "professor" | "admin" | "superadmin"
          course_id:         string | null
          current_year:      number
          current_semester:  number
          is_active:         boolean
          created_at:        string
          updated_at:        string
          schedule_reset_at: string | null
        }
        Insert: {
          id:                 string
          full_name:          string
          email:              string
          student_number?:    string | null
          avatar_url?:        string | null
          bio?:               string | null
          role?:              "student" | "professor" | "admin" | "superadmin"
          course_id?:         string | null
          current_year?:      number
          current_semester?:  number
          is_active?:         boolean
          created_at?:        string
          updated_at?:        string
          schedule_reset_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
      }

      courses: {
        Row: {
          id:             string
          name:           string
          code:           string
          description:    string | null
          duration_years: number
          is_active:      boolean
          created_at:     string
        }
        Insert: {
          id?:             string
          name:            string
          code:            string
          description?:    string | null
          duration_years?: number
          is_active?:      boolean
          created_at?:     string
        }
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>
      }

      discipline_courses: {
        Row: {
          id:             string
          discipline_id:  string
          course_id:      string
          year:           number
          semester:       number
          professor_name: string | null
          created_at:     string
        }
        Insert: {
          id?:             string
          discipline_id:   string
          course_id:       string
          year:            number
          semester:        number
          professor_name?: string | null
          created_at?:     string
        }
        Update: Partial<Database["public"]["Tables"]["discipline_courses"]["Insert"]>
      }

      disciplines: {
        Row: {
          id:              string
          course_id:       string
          name:            string
          code:            string | null
          year:            number
          semester:        number
          cover_image_url: string | null
          intro_video_url: string | null
          professor_name:  string | null
          is_active:       boolean
          created_at:      string
        }
        Insert: {
          id?:              string
          course_id:        string
          name:             string
          code?:            string | null
          year:             number
          semester:         number
          cover_image_url?: string | null
          intro_video_url?: string | null
          professor_name?:  string | null
          is_active?:       boolean
          created_at?:      string
        }
        Update: Partial<Database["public"]["Tables"]["disciplines"]["Insert"]>
      }

      chapters: {
        Row: {
          id:            string
          discipline_id: string
          title:         string
          order_index:   number
          status:        "Concluído" | "Não concluído"
          is_active:     boolean
          created_at:    string
        }
        Insert: {
          id?:           string
          discipline_id: string
          title:         string
          order_index?:  number
          status?:       "Concluído" | "Não concluído"
          is_active?:    boolean
          created_at?:   string
        }
        Update: Partial<Database["public"]["Tables"]["chapters"]["Insert"]>
      }

      topics: {
        Row: {
          id:          string
          chapter_id:  string
          title:       string
          order_index: number
          is_active:   boolean
          created_at:  string
        }
        Insert: {
          id?:          string
          chapter_id:   string
          title:        string
          order_index?: number
          is_active?:   boolean
          created_at?:  string
        }
        Update: Partial<Database["public"]["Tables"]["topics"]["Insert"]>
      }

      contents: {
        Row: {
          id:                 string
          topic_id:           string
          chapter_id:         string | null
          type:               "audio" | "slide" | "quiz"
          title:              string
          file_url:           string | null
          file_key:           string | null
          time_limit_seconds: number | null
          order_index:        number
          is_active:          boolean
          created_at:         string
        }
        Insert: {
          id?:                 string
          topic_id:            string
          chapter_id?:         string | null
          type:                "audio" | "slide" | "quiz"
          title:               string
          file_url?:           string | null
          file_key?:           string | null
          time_limit_seconds?: number | null
          order_index?:        number
          is_active?:          boolean
          created_at?:         string
        }
        Update: Partial<Database["public"]["Tables"]["contents"]["Insert"]>
      }

      student_progress: {
        Row: {
          id:                    string
          student_id:            string
          content_id:            string
          progress_percent:      number
          last_position_seconds: number
          completed:             boolean
          completed_at:          string | null
          started_at:            string
          updated_at:            string
        }
        Insert: {
          id?:                    string
          student_id:             string
          content_id:             string
          progress_percent?:      number
          last_position_seconds?: number
          completed?:             boolean
          completed_at?:          string | null
          started_at?:            string
          updated_at?:            string
        }
        Update: Partial<Database["public"]["Tables"]["student_progress"]["Insert"]>
      }

      student_extra_disciplines: {
        Row: {
          id:            string
          student_id:    string
          discipline_id: string
          added_at:      string
        }
        Insert: {
          id?:           string
          student_id:    string
          discipline_id: string
          added_at?:     string
        }
        Update: Partial<Database["public"]["Tables"]["student_extra_disciplines"]["Insert"]>
      }

      schedule_slots: {
        Row: {
          id:              string
          student_id:      string
          course_id:       string
          year:            number
          semester:        number
          day:             string
          start_time:      string
          end_time:        string
          discipline:      string
          discipline_slug: string | null
          room:            string | null
          professor:       string | null
          type:            string
          created_at:      string
          updated_at:      string
        }
        Insert: {
          id?:              string
          student_id:       string
          course_id:        string
          year:             number
          semester:         number
          day:              string
          start_time:       string
          end_time:         string
          discipline:       string
          discipline_slug?: string | null
          room?:            string | null
          professor?:       string | null
          type:             string
          created_at?:      string
          updated_at?:      string
        }
        Update: Partial<Database["public"]["Tables"]["schedule_slots"]["Insert"]>
      }

      // ── QUIZ QUESTIONS ─────────────────────────────────────────
      quiz_questions: {
        Row: {
          id:            string
          content_id:    string
          question_text: string
          order_index:   number
          created_at:    string
        }
        Insert: {
          id?:            string
          content_id:     string
          question_text:  string
          order_index?:   number
          created_at?:    string
        }
        Update: Partial<Database["public"]["Tables"]["quiz_questions"]["Insert"]>
      }

      // ── QUIZ ANSWERS ───────────────────────────────────────────
      quiz_answers: {
        Row: {
          id:          string
          question_id: string
          answer_text: string
          is_correct:  boolean
          order_index: number
        }
        Insert: {
          id?:          string
          question_id:  string
          answer_text:  string
          is_correct?:  boolean
          order_index?: number
        }
        Update: Partial<Database["public"]["Tables"]["quiz_answers"]["Insert"]>
      }

      // ── QUIZ RESULTS ───────────────────────────────────────────
      quiz_results: {
        Row: {
          id:                 string
          student_id:         string
          content_id:         string
          score:              number
          total_questions:    number
          correct_answers:    number
          time_spent_seconds: number | null
          attempted_at:       string
        }
        Insert: {
          id?:                 string
          student_id:          string
          content_id:          string
          score?:              number
          total_questions:     number
          correct_answers:     number
          time_spent_seconds?: number | null
          attempted_at?:       string
        }
        Update: Partial<Database["public"]["Tables"]["quiz_results"]["Insert"]>
      }

      // ── QUIZ RESULTS DETAILS ───────────────────────────────────
      quiz_results_details: {
        Row: {
          id:                 string
          result_id:          string
          question_id:        string
          selected_answer_id: string | null
          is_correct:         boolean
          time_spent_seconds: number | null
        }
        Insert: {
          id?:                 string
          result_id:           string
          question_id:         string
          selected_answer_id?: string | null
          is_correct?:         boolean
          time_spent_seconds?: number | null
        }
        Update: Partial<Database["public"]["Tables"]["quiz_results_details"]["Insert"]>
      }

      // ── QUIZ SESSIONS ──────────────────────────────────────────
      quiz_sessions: {
        Row: {
          id:                     string
          student_id:             string
          content_id:             string
          current_question_index: number
          time_remaining_seconds: number | null
          answers:                Record<string, string>
          started_at:             string
          updated_at:             string
        }
        Insert: {
          id?:                     string
          student_id:              string
          content_id:              string
          current_question_index?: number
          time_remaining_seconds?: number | null
          answers?:                Record<string, string>
          started_at?:             string
          updated_at?:             string
        }
        Update: Partial<Database["public"]["Tables"]["quiz_sessions"]["Insert"]>
      }
    }

    Views:     Record<string, never>
    Functions: Record<string, never>
    Enums:     Record<string, never>
  }
}

/* ================================================================
   ALIASES DIRECTOS — tabelas base
   ================================================================ */
export type Profile         = Database["public"]["Tables"]["profiles"]["Row"]
export type Course          = Database["public"]["Tables"]["courses"]["Row"]
export type Discipline      = Database["public"]["Tables"]["disciplines"]["Row"]
export type Chapter         = Database["public"]["Tables"]["chapters"]["Row"]
export type Topic           = Database["public"]["Tables"]["topics"]["Row"]
export type Content         = Database["public"]["Tables"]["contents"]["Row"]
export type StudentProgress = Database["public"]["Tables"]["student_progress"]["Row"]
export type ExtraDiscipline = Database["public"]["Tables"]["student_extra_disciplines"]["Row"]
export type ScheduleSlot    = Database["public"]["Tables"]["schedule_slots"]["Row"]

// Quiz
export type QuizQuestion      = Database["public"]["Tables"]["quiz_questions"]["Row"]
export type QuizAnswer        = Database["public"]["Tables"]["quiz_answers"]["Row"]
export type QuizResult        = Database["public"]["Tables"]["quiz_results"]["Row"]
export type QuizResultDetail  = Database["public"]["Tables"]["quiz_results_details"]["Row"]
export type QuizSession       = Database["public"]["Tables"]["quiz_sessions"]["Row"]

// Insert helpers
export type QuizResultInsert       = Database["public"]["Tables"]["quiz_results"]["Insert"]
export type QuizResultDetailInsert = Database["public"]["Tables"]["quiz_results_details"]["Insert"]
export type QuizSessionInsert      = Database["public"]["Tables"]["quiz_sessions"]["Insert"]

// Update helpers
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]

/* ================================================================
   TIPOS COMPOSTOS (joins)
   ================================================================ */

export type ContentWithProgress = Content & {
  student_progress?: Pick<StudentProgress, "progress_percent" | "completed"> | null
}

export type TopicWithContents = Topic & {
  contents: ContentWithProgress[]
}

export type ChapterWithTopics = Chapter & {
  topics: TopicWithContents[]
}

export type DisciplineWithChapters = Discipline & {
  chapters:  ChapterWithTopics[]
  progress?: number // calculado no cliente
}

export type ProfileWithCourse = Profile & {
  courses: Course | null
}

export type QuizQuestionWithAnswers = QuizQuestion & {
  quiz_answers: QuizAnswer[]
}