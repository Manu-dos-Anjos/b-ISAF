// app/components/home/AppShell.tsx (VERSÃO CORRIGIDA E FINAL)

"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/header/Header";
import Breadcrumbs from "@/app/components/header/Breadcrumbs";
import { UserContext, AppUser } from "@/app/lib/context/UserContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [pinned, setPinned] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem("sidebarPinned");
      return savedState !== null ? JSON.parse(savedState) : true;
    }
    return true;
  });

  const [expanded, setExpanded] = useState(false); // Estado de HOVER
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    localStorage.setItem("sidebarPinned", JSON.stringify(pinned));
  }, [pinned]);

  // Esta é a variável que controla o estado visual REAL da sidebar
  const isSidebarExpanded = pinned || expanded;

  // ... (o seu código de 'user' e 'handleUpdateUser' continua aqui, sem alterações)
  const [user, setUser] = useState<AppUser | null>({
    name: "Manuel dos Anjos",
    email: "250438@isaf.co.ao",
    avatarUrl: undefined,
    academic: { year: "1º Ano", semester: "1º Semestre", course: "Informática de Gestão Financeira", studentNumber: "250438", institution: "Instituto Superior de Administração e Finanças" },
    status: { label: "Perfil Completo", tone: "success" },
  });
  const handleUpdateUser = async (updates: Partial<AppUser["academic"]>): Promise<void> => {
    setUser((prev) => prev ? { ...prev, academic: { ...prev.academic, ...updates } } : null);
  };

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar
          user={user}
          onUpdateUser={handleUpdateUser}
          expanded={isSidebarExpanded} // Passamos o estado visual combinado
          setExpanded={setExpanded}     // Passamos o set do HOVER
          pinned={pinned}
          setPinned={setPinned}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <Header
          expanded={isSidebarExpanded} // Passamos o mesmo estado visual combinado
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main
          className={`transition-all duration-300 pt-16 ${
            isSidebarExpanded ? "md:pl-56" : "md:pl-16"
          }`}
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