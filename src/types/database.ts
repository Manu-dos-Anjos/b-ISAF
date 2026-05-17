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
          id:               string
          full_name:        string
          email:            string
          student_number:   string | null
          avatar_url:       string | null
          role:             "student" | "professor" | "admin" | "superadmin"
          course_id:        string | null
          current_year:     number
          current_semester: number
          is_active:        boolean
          created_at:       string
          updated_at:       string
        }
        Insert: {
          id:               string
          full_name:        string
          email:            string
          student_number?:  string | null
          avatar_url?:      string | null
          role?:            "student" | "professor" | "admin" | "superadmin"
          course_id?:       string | null
          current_year?:    number
          current_semester?: number
          is_active?:       boolean
          created_at?:      string
          updated_at?:      string
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
          id?:            string
          name:           string
          code:           string
          description?:   string | null
          duration_years?: number
          is_active?:     boolean
          created_at?:    string
        }
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>
      }
    }
    Views:     Record<string, never>
    Functions: Record<string, never>
    Enums:     Record<string, never>
  }
}

/* ================================================================
   ALIASES DIRECTOS
   ================================================================ */

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Course  = Database["public"]["Tables"]["courses"]["Row"]

export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"]
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]

/* ================================================================
   TIPOS COMPOSTOS (para joins)
   ================================================================ */

export type ProfileWithCourse = Profile & {
  courses: Course | null
}
