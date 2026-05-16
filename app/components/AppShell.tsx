"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header, { type UserProfile } from "@/app/components/header/Header";
import Breadcrumbs from "@/app/components/header/Breadcrumbs";
import { UserContext, type AppUser } from "@/app/lib/context/UserContext";

/* ================================================================
   DADOS MOCK DO UTILIZADOR
   Fase 2: substituir por dados reais do Supabase Auth + profiles.
   Manter aqui para não depender de exports do UserContext.
   ================================================================ */
const MOCK_USER: AppUser = {
  name:      "Manuel dos Anjos",
  email:     "250438@isaf.co.ao",
  avatarUrl: undefined,
  academic: {
    year:          "1º Ano",
    semester:      "1º Semestre",
    course:        "Informática de Gestão Financeira",
    studentNumber: "250438",
    institution:   "Instituto Superior de Administração e Finanças",
  },
  status: { label: "Perfil Completo", tone: "success" },
};

/* ================================================================
   HELPER: AppUser → UserProfile (formato que o Header espera)
   Fase 2: remover quando o Header ler directamente do Supabase.
   ================================================================ */
function toHeaderUser(user: AppUser | null): UserProfile | null {
  if (!user) return null;

  const yearNum  = parseInt(user.academic.year.replace(/\D/g, ""), 10) || 1;
  const semNum   = (parseInt(user.academic.semester.replace(/\D/g, ""), 10) || 1) as 1 | 2;

  return {
    id:            user.academic.studentNumber,
    fullName:      user.name,
    email:         user.email,
    avatarUrl:     user.avatarUrl ?? null,
    role:          "student",
    course:        user.academic.course,
    academicYear:  yearNum,
    semester:      semNum,
    studentNumber: user.academic.studentNumber,
    bio:           null,
  };
}

/* ================================================================
   APPSHELL
   ================================================================ */

const LS_KEY = "b-isaf:sidebarExpanded";

type Props = { children: React.ReactNode };

export default function AppShell({ children }: Props) {
  const [mounted,     setMounted]     = useState(false);
  const [expanded,    setExpanded]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [user, setUser] = useState<AppUser | null>(MOCK_USER);

  const headerUser = useMemo(() => toHeaderUser(user), [user]);

  // Carregar estado da sidebar do localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === "boolean") setExpanded(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persistir estado da sidebar
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(expanded));
    } catch {
      // ignore
    }
  }, [expanded, mounted]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
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
          // Fase 2: onProfileSave / onAvatarUpload / onLogout → ligar ao Supabase
        />

        <main
          className={`
            pt-16
            ${mounted ? "transition-all duration-300" : ""}
            ${expanded ? "md:pl-56" : "md:pl-16"}
          `}
        >
          <Breadcrumbs />
          <div className="px-4 py-6 md:px-4 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </UserContext.Provider>
  );
}
