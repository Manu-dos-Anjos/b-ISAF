"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/header/Header";
import Breadcrumbs from "@/app/components/header/Breadcrumbs";

export default function AppShell({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Sidebar
        expanded={expanded}
        setExpanded={setExpanded}
        pinned={pinned}
        setPinned={setPinned}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <Header
        expanded={expanded}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div
        className={`transition-all duration-300 ${
          expanded ? "md:ml-56" : "md:ml-16"
        }`}
      >
        {/* espaço por causa do header fixo */}
        <div className="pt-16">
          <Breadcrumbs />

          <main className="px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}