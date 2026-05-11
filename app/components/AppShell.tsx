"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/header/Header";
import Breadcrumbs from "@/app/components/header/Breadcrumbs";
import { UserContext, AppUser } from "@/app/lib/context/UserContext";

type Props = {
  children: React.ReactNode;
};

const LS_KEY = "b-isaf:sidebarExpanded";

export default function AppShell({ children }: Props) {
  const [mounted, setMounted] = useState(false);

  // Estado único: expanded (true = aberta, false = fechada)
  const [expanded, setExpanded] = useState<boolean>(false);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // User state
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

  // Mount + carregar estado do localStorage
  useEffect(() => {
    setMounted(true);

    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === "boolean") {
          setExpanded(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Persistir estado no localStorage
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
        />

        <main
          className={`
            pt-16
            ${mounted ? "transition-all duration-300" : ""}
            ${expanded ? "md:pl-56" : "md:pl-16"}
          `}
        >
          <Breadcrumbs />
          <div className="px-4 py-6 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </UserContext.Provider>
  );
}