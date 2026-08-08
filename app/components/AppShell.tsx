"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header, { type UserProfile } from "@/app/components/header/Header";
import Breadcrumbs from "@/app/components/header/Breadcrumbs";
import { UserProvider, useUser } from "@/app/lib/context/UserContext";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

function toHeaderUser(
  user: ReturnType<typeof useUser>["user"]
): UserProfile | null {
  if (!user) return null;
  const yearNum = parseInt(user.academic.year.replace(/\D/g, ""), 10) || 1;
  const semNum = (parseInt(user.academic.semester.replace(/\D/g, ""), 10) || 1) as 1 | 2;
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
  const { user, updateProfile, logout } = useUser();
  const { supabase } = useSupabase();

  const [mounted, setMounted]       = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const headerUser = useMemo(() => toHeaderUser(user), [user]);

  useEffect(() => { setMounted(true); }, []);

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
        — md:pl-[72px] → afasta o conteúdo da sidebar (72 px = largura exata)
        — pt-16        → afasta o conteúdo do header  (64 px = h-16)
      */}
      <main
        className={`
          pt-16 md:pl-[72px]
          ${mounted ? "transition-all duration-300" : ""}
        `}
      >
        <Breadcrumbs />
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