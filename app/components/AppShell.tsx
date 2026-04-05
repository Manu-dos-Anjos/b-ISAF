"use client";

import { useState } from "react";
import Sidebar, { SidebarUser } from "@/app/components/Sidebar";
import Header from "@/app/components/header/Header";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock atual — mais tarde podes substituir por dados reais do login/Firebase
  const user: SidebarUser = {
    name: "Manuel dos Anjos",
    email: "250438@isaf.co.ao",
    academic: {
      year: "1º Ano",
      semester: "2º Semestre",
      course: "Informática de Gestão Financeira",
      studentNumber: "250438",
      institution: "Instituto Superior de Administração e Finanças",
    },
    status: {
      label: "Perfil completo",
      tone: "success",
      description: "Os teus dados académicos estão atualizados.",
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Sidebar
        expanded={expanded}
        setExpanded={setExpanded}
        pinned={pinned}
        setPinned={setPinned}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        user={user}
      />

      <Header
        expanded={expanded}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        notificationCount={3}
      />

      <main
        className={`min-h-screen transition-all duration-300 ${
          expanded ? "md:ml-56" : "md:ml-16"
        }`}
      >
        {children}
      </main>
    </div>
  );
}