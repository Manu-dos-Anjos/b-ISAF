"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/header/Header";
import Breadcrumbs from "@/app/components/header/Breadcrumbs";
import { UserContext, AppUser } from "@/app/lib/context/UserContext";

type Props = {
  children: React.ReactNode;
  initialPinned: boolean;      // vem do SSR via cookie
  hasPinnedCookie: boolean;    // indica se já existia cookie (para migração do localStorage)
};

const LS_KEY = "sidebarPinned"; // mantém o teu localStorage atual

function setPinnedCookie(value: boolean) {
  // 180 dias
  const maxAge = 60 * 60 * 24 * 180;
  document.cookie = `sidebarPinned=${value ? "1" : "0"}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export default function AppShell({ children, initialPinned, hasPinnedCookie }: Props) {
  // mounted: usado para evitar transições no primeiro paint (extra “polimento”)
  const [mounted, setMounted] = useState(false);

  // pinned inicial vem do servidor (cookie) => SSR já nasce certo, sem salto
  const [pinned, setPinned] = useState<boolean>(initialPinned);

  // hover expand
  const [expanded, setExpanded] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // user (igual ao teu)
  const [user, setUser] = useState<AppUser | null>({
    name: "Manuel dos Anjos",
    email: "250438@isaf.co.ao",
    avatarUrl: undefined,
    academic: {
      year: "1º Ano",
      semester: "1º Semestre",
      course: "Informática de Gestão Financeira",
      studentNumber: "250438",
      institution: "Instituto Superior de Administração e Finanças",
    },
    status: { label: "Perfil Completo", tone: "success" },
  });

  const handleUpdateUser = async (
    updates: Partial<AppUser["academic"]>
  ): Promise<void> => {
    setUser((prev) =>
      prev ? { ...prev, academic: { ...prev.academic, ...updates } } : null
    );
  };

  // Mount
  useEffect(() => {
    setMounted(true);

    /**
     * Migração (apenas para quem ainda não tem cookie):
     * - Se não existe cookie, tentamos recuperar do localStorage.
     * - Isto pode causar 1 mudança só na primeira vez após deploy.
     * - Depois de setar cookie, nunca mais pisca.
     */
    if (!hasPinnedCookie) {
      try {
        const saved = localStorage.getItem(LS_KEY);
        if (saved != null) {
          const parsed = JSON.parse(saved);
          if (typeof parsed === "boolean") {
            setPinned(parsed);
            // também escreve cookie já
            setPinnedCookie(parsed);
          }
        } else {
          // sem localStorage, garante cookie default
          setPinnedCookie(initialPinned);
        }
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist pinned em localStorage + cookie (sem depender de window checks)
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(pinned));
    } catch {
      // ignore
    }
    try {
      setPinnedCookie(pinned);
    } catch {
      // ignore
    }
  }, [pinned, mounted]);

  // se estiver pinned, não faz sentido manter expanded por hover
  useEffect(() => {
    if (pinned) setExpanded(false);
  }, [pinned]);

  // estado visual real
  const isSidebarExpanded = pinned ? true : expanded;

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar
          user={user}
          onUpdateUser={handleUpdateUser}
          expanded={isSidebarExpanded}
          setExpanded={setExpanded}
          pinned={pinned}
          setPinned={setPinned}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <Header
          expanded={isSidebarExpanded}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main
          className={`
            pt-16
            ${mounted ? "transition-all duration-300" : ""}
            ${isSidebarExpanded ? "md:pl-56" : "md:pl-16"}
          `}
        >
          <Breadcrumbs />
          <div className="px-4 py-6 md:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </UserContext.Provider>
  );
}