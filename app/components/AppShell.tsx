"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/header/Header";
import Breadcrumbs from "@/app/components/header/Breadcrumbs";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-black dark:text-white transition-colors duration-300">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        expanded={expanded}
        setExpanded={setExpanded}
        pinned={pinned}
        setPinned={setPinned}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Desktop layout */}
      <div
        className={`hidden md:block transition-all duration-300 min-h-screen ${
          expanded ? "md:ml-56" : "md:ml-16"
        }`}
      >
        <Header expanded={expanded} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div className="pt-16">
          <Breadcrumbs />
          <main className="p-8 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">{children}</main>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex flex-col md:hidden h-screen">
        <Header expanded={false} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div className="pt-16 flex-1 overflow-y-auto">
          <Breadcrumbs />
          <main className="p-4 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">{children}</main>
        </div>
      </div>
    </div>
  );
}