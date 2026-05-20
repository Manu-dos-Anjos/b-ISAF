// app/lib/context/UserContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import type { Profile, Course, ProfileUpdate } from "@/src/types/database";

/* ================================================================
   TIPO LEGADO — compatibilidade com componentes existentes
   ================================================================ */
export type AcademicInfo = {
  year:          string;
  semester:      string;
  course:        string;
  studentNumber: string | null;
  institution:   string;
};

export type AppUser = {
  name:      string;
  email:     string;
  avatarUrl: string | null;
  academic:  AcademicInfo;
  status: {
    label: string;
    tone:  "success" | "warning" | "error" | "info";
  };
};

/* ================================================================
   TIPO DO CONTEXTO
   ================================================================ */
type UserContextType = {
  user:           AppUser | null;
  setUser:        (user: AppUser | null) => void;
  profile:        Profile | null;
  course:         Course  | null;
  isLoading:      boolean;
  error:          string  | null;
  updateProfile:  (data: ProfileUpdate) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout:         () => Promise<void>;
};

/* ================================================================
   HELPER: Profile + Course → AppUser
   ================================================================ */
function toAppUser(profile: Profile, course: Course | null): AppUser {
  return {
    name:      profile.full_name,
    email:     profile.email,
    avatarUrl: profile.avatar_url,
    academic: {
      year:          `${profile.current_year}º Ano`,
      semester:      `${profile.current_semester}º Semestre`,
      course:        course?.name ?? "",
      studentNumber: profile.student_number,
      institution:   "Instituto Superior de Administração e Finanças",
    },
    status: { label: "Perfil Completo", tone: "success" },
  };
}

/* ================================================================
   CONTEXTO
   ================================================================ */
const UserContext = createContext<UserContextType | null>(null);

/* ================================================================
   PROVIDER
   ================================================================ */
export function UserProvider({ children }: { children: ReactNode }) {
  const { supabase, user: authUser } = useSupabase();

  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [course,    setCourse]    = useState<Course  | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string  | null>(null);

  /* ── Carregar perfil do Supabase ── */
  const loadProfile = useCallback(async () => {
    if (!authUser) {
      setProfile(null);
      setCourse(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .select("*, courses(*)")
        .eq("id", authUser.id)
        .single();

      if (err) throw err;

      if (data) {
        const { courses, ...profileData } = data as Profile & { courses: Course | null };
        setProfile(profileData);
        setCourse(courses);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar perfil");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, authUser]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  /* ── Actualizar perfil ── */
  const updateProfile = useCallback(async (data: ProfileUpdate) => {
    if (!authUser) throw new Error("Não autenticado");
    const { error: err } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", authUser.id);
    if (err) throw err;
    setProfile((prev) => (prev ? { ...prev, ...data } : null));
  }, [supabase, authUser]);

  /* ── Logout ── */
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setCourse(null);
  }, [supabase]);

  /* ── Compatibilidade legada ── */
  const legacyUser = useMemo<AppUser | null>(
    () => (profile ? toAppUser(profile, course) : null),
    [profile, course]
  );

  const setUser = useCallback((u: AppUser | null) => {
    if (!u) return;
    setProfile((prev) =>
      prev ? { ...prev, full_name: u.name, avatar_url: u.avatarUrl } : null
    );
  }, []);

  return (
    <UserContext.Provider value={{
      user: legacyUser, setUser,
      profile, course, isLoading, error,
      updateProfile, refreshProfile: loadProfile, logout,
    }}>
      {children}
    </UserContext.Provider>
  );
}

/* ================================================================
   HOOKS
   ================================================================ */
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser() deve ser usado dentro de <UserProvider>");
  return ctx;
}

export function useProfile() {
  const { profile, course, isLoading, error, updateProfile, refreshProfile } = useUser();
  return { profile, course, isLoading, error, updateProfile, refreshProfile };
}