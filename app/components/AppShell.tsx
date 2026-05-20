// app/components/AppShell.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header, { type UserProfile } from "@/app/components/header/Header";
import Breadcrumbs from "@/app/components/header/Breadcrumbs";
import { UserProvider, useUser } from "@/app/lib/context/UserContext";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

const LS_KEY = "b-isaf:sidebarExpanded";

/* ================================================================
   HELPER: AppUser → UserProfile (formato do Header)
   ================================================================ */
function toHeaderUser(
  user: ReturnType<typeof useUser>["user"]
): UserProfile | null {
  if (!user) return null;
  const yearNum = parseInt(user.academic.year.replace(/\D/g, ""), 10) || 1;
  const semNum  = (parseInt(user.academic.semester.replace(/\D/g, ""), 10) || 1) as 1 | 2;
  return {
    id:            user.academic.studentNumber ?? "",
    fullName:      user.name,
    email:         user.email,
    avatarUrl:     user.avatarUrl,
    role:          "student",
    course:        user.academic.course,
    academicYear:  yearNum,
    semester:      semNum,
    studentNumber: user.academic.studentNumber,
    bio:           null,
  };
}

/* ================================================================
   SHELL INTERIOR — lê UserContext e SupabaseContext
   ================================================================ */
function ShellInner({ children }: { children: React.ReactNode }) {
  const { user, updateProfile, logout } = useUser();
  const { supabase }                    = useSupabase();

  const [mounted,     setMounted]     = useState(false);
  const [expanded,    setExpanded]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const headerUser = useMemo(() => toHeaderUser(user), [user]);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === "boolean") setExpanded(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(expanded)); }
    catch { /* ignore */ }
  }, [expanded, mounted]);

  /* ── Upload de avatar para Supabase Storage ── */
  const handleAvatarUpload = async (file: File): Promise<string> => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error("Não autenticado");

    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `avatars/${authUser.id}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("user-assets")
      .upload(path, file, { upsert: true });

    if (uploadErr) throw uploadErr;

    const { data } = supabase.storage.from("user-assets").getPublicUrl(path);

    await updateProfile({ avatar_url: data.publicUrl });
    return data.publicUrl;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        expanded={expanded}
        setExpanded={setExpanded}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <Header
        expanded={expanded}
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

      <main className={`pt-16 ${mounted ? "transition-all duration-300" : ""} ${expanded ? "md:pl-56" : "md:pl-16"}`}>
        <Breadcrumbs />
        <div className="px-4 py-6 md:px-4 lg:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}

/* ================================================================
   APPSHELL — envolve com UserProvider
   ================================================================ */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <ShellInner>{children}</ShellInner>
    </UserProvider>
  );
}