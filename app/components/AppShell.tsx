// app/components/AppShell.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header, { type UserProfile } from "@/app/components/header/Header";
import Breadcrumbs from "@/app/components/header/Breadcrumbs";
import AcademicPeriodPrompt from "@/app/components/AcademicPeriodPrompt";
import FloatingSupportPrompt from "@/app/components/FloatingSupportPrompt";
import { UserProvider, useUser } from "@/app/lib/context/UserContext";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import {
  flushAllPendingSubmissions,
  hasPendingSubmissions,
} from "@/app/lib/quizPendingSync";

function toHeaderUser(
  user: ReturnType<typeof useUser>["user"]
): UserProfile | null {
  if (!user) return null;
  const yearNum = parseInt(user.academic.year.replace(/\D/g, ""), 10) || 1;
  const semNum =
    (parseInt(user.academic.semester.replace(/\D/g, ""), 10) || 1) as 1 | 2;
  return {
    id: user.academic.studentNumber ?? "",
    fullName: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: "student",
    course: user.academic.course,
    academicYear: yearNum,
    semester: semNum,
    studentNumber: user.academic.studentNumber,
    bio: null,
  };
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { user, profile, course, updateProfile, logout } = useUser();
  const { supabase } = useSupabase();

  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const headerUser = useMemo(() => toHeaderUser(user), [user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ── Reenvio de resultados de quiz pendentes (offline → online) ── */
  useEffect(() => {
    if (!user) return; // só faz sentido com sessão autenticada

    void flushAllPendingSubmissions(supabase);

    const onOnline = () => void flushAllPendingSubmissions(supabase);
    window.addEventListener("online", onOnline);

    // rede-flapping / mobile: 'online' nem sempre dispara de forma fiável,
    // por isso há também uma verificação periódica leve
    const interval = setInterval(() => {
      if (hasPendingSubmissions()) void flushAllPendingSubmissions(supabase);
    }, 60_000);

    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, [supabase, user]);

  const handleAvatarUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "avatar");
    formData.append("disciplineId", profile?.id ?? "profile");

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const uploadData = await uploadResponse.json().catch(() => ({}));

    if (!uploadResponse.ok || typeof uploadData.publicUrl !== "string") {
      throw new Error(uploadData.error ?? "Falha ao fazer upload da imagem");
    }

    await updateProfile({ avatar_url: uploadData.publicUrl });
    return uploadData.publicUrl;
  };

  return (
    /* fundo geral da app */
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-[#050816] dark:text-white">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <Header
        expanded={false}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        user={headerUser}
        onProfileSave={async (payload) => {
          await updateProfile({
            full_name: payload.fullName,
            ...(payload.bio !== undefined && { bio: payload.bio ?? undefined }),
          });
        }}
        onAvatarUpload={handleAvatarUpload}
        onLogout={logout}
      />

      {/*
        ── Breadcrumbs FORA do <main> ──
        É `fixed top-14` (ver Breadcrumbs.tsx), por isso não rola com a
        página e cola exatamente ao header (h-14 = 56px) em mobile e desktop.
      */}
      <Breadcrumbs />

      <AcademicPeriodPrompt
        profile={profile}
        maxYear={course?.duration_years ?? 4}
        updateProfile={updateProfile}
      />

      <FloatingSupportPrompt />

      {/*
        ── Padding-top compensa header + breadcrumb (ambos fixos) ──
        header h-14 (56px) + breadcrumb h-10 (40px) = 96px = pt-24
        (igual em mobile e desktop, porque o header é h-14 em todos)
        — md:pl-[65px] → afasta o conteúdo da sidebar (w-[65px])
      */}
      <main
        className={`
          pt-24 md:pl-[65px]
          ${mounted ? "transition-all duration-300" : ""}
        `}
      >
        <div className="px-4 py-6 lg:px-6">{children}</div>
      </main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <ShellInner>{children}</ShellInner>
    </UserProvider>
  );
}