"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Home,
  BookOpen,
  Bookmark,
  GraduationCap,
  ClipboardList,
  Pin,
  PinOff,
  ChevronRight,
  X,
  Calendar,
  Headphones,
} from "lucide-react";
import { useAudioPlayer } from "@/app/lib/context/AudioPlayerContext";

/* =========================================================
   NAVIGATION ITEMS
   ========================================================= */
const navItems = [
  { id: "home", label: "Início", icon: Home, path: "/" },
  { id: "eventos", label: "Eventos", icon: Calendar, path: "/eventos" },
  { id: "disciplines", label: "Disciplinas", icon: BookOpen, path: "/disciplinas" },
  { id: "saved", label: "Guardados", icon: Bookmark, path: "/guardados" },
  { id: "my-course", label: "Meu Curso", icon: GraduationCap, path: "/meu-curso" },
  { id: "assessments", label: "Avaliações", icon: ClipboardList, path: "/avaliacoes" },
];

type SidebarProps = {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  pinned: boolean;
  setPinned: (value: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (value: boolean) => void;
};

/* =========================================================
   SIDEBAR COMPONENT
   ========================================================= */
export default function Sidebar({
  expanded,
  setExpanded,
  pinned,
  setPinned,
  mobileOpen = false,
  setMobileOpen,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const handleMouseEnter = () => {
    if (!pinned) setExpanded(true);
  };
  const handleMouseLeave = () => {
    if (!pinned) setExpanded(false);
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Overlay para mobile */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen?.(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* ========= DESKTOP SIDEBAR ========= */}
      <aside
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 z-50 hidden h-full flex-col border-r border-gray-200 bg-white shadow-lg transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-gradient-to-b dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-2xl md:flex ${
          expanded ? "w-56" : "w-16"
        }`}
      >
        <div onMouseEnter={handleMouseEnter} className="flex min-h-0 flex-1 flex-col">
          {/* Logo e pin */}
          <div
  className={`flex min-h-[62px] items-center gap-3 border-b border-gray-200 px-3 py-4 dark:border-white/10 ${
    expanded ? "justify-between" : "justify-center"
  }`}
>
  <div className="flex items-center gap-4 overflow-hidden">
    <Image
      src="/logo_dark.svg"
      alt="b-ISAF Logo"
      width={38}
      height={38}
      className="h-8 w-8 flex-shrink-0"
    />
              {expanded && (
                <div className="overflow-hidden whitespace-nowrap">
                  <span className="text-lg font-bold tracking-wide text-black dark:text-white">
                    b-ISAF
                  </span>
                </div>
              )}
            </div>

            {expanded && (
              <button
                onClick={() => setPinned(!pinned)}
                className="flex-shrink-0 text-gray-400 transition-colors hover:text-black dark:text-white/40 dark:hover:text-white/80"
                title={pinned ? "Desafixar sidebar" : "Fixar sidebar"}
                aria-label={pinned ? "Desafixar sidebar" : "Fixar sidebar"}
              >
                {pinned ? <PinOff size={18} strokeWidth={2} /> : <Pin size={18} strokeWidth={2} />}
              </button>
            )}
          </div>

          {/* Navegação principal */}
          <nav className="flex flex-1 flex-col justify-center gap-2 overflow-hidden py-4">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;

              return (
                <div key={item.id} className="relative px-2">
                  {active && (
                    <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-black dark:bg-white" />
                  )}
                  <button
                    onClick={() => router.push(item.path)}
                    className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${
                      expanded ? "px-3 py-2.5" : "justify-center px-2 py-2.5"
                    } ${
                      active
                        ? expanded
                          ? "bg-gray-100 text-black dark:bg-white/15 dark:text-white"
                          : "bg-gray-100 text-black dark:bg-white/10 dark:text-white"
                        : "text-gray-600 hover:bg-gray-50 hover:text-black dark:text-white/60 dark:hover:bg-white/8 dark:hover:text-white"
                    }`}
                    title={!expanded ? item.label : undefined}
                  >
                    <Icon
                      size={20}
                      className={active ? "text-black dark:text-white" : "text-gray-600 dark:text-white/60"}
                    />
                    {expanded && (
                      <>
                        <span className={`flex-1 whitespace-nowrap text-left text-sm font-medium ${
                          active ? "text-black dark:text-white" : "text-gray-700 dark:text-white/70"
                        }`}>
                          {item.label}
                        </span>
                        {active && (
                          <ChevronRight size={14} className="flex-shrink-0 text-gray-500 dark:text-white/60" />
                        )}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Botão "Último áudio" (único elemento adicional) */}
        <div className="border-t border-gray-200 dark:border-white/10 p-2 flex justify-center">
          <LastAudioButton expanded={expanded} />
        </div>
      </aside>

      {/* ========= MOBILE SIDEBAR ========= */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-gray-200 bg-white shadow-lg transition-transform duration-300 ease-in-out dark:border-white/10 dark:bg-gradient-to-b dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-2xl md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-white/10">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.svg"
              alt="b-ISAF Logo"
              width={32}
              height={32}
              className="h-8 w-8 flex-shrink-0"
            />
            <span className="text-lg font-bold tracking-wide text-black dark:text-white">b-ISAF</span>
          </div>
          <button
            onClick={() => setMobileOpen?.(false)}
            className="text-gray-600 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white"
            title="Fechar menu"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto py-4">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative px-3">
                {active && (
                  <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-black dark:bg-white" />
                )}
                <button
                  onClick={() => { router.push(item.path); setMobileOpen?.(false); }}
                  className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 transition-all duration-200 ${
                    active
                      ? "bg-gray-100 text-black dark:bg-white/15 dark:text-white"
                      : "text-gray-700 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/8"
                  }`}
                >
                  <Icon size={20} className={active ? "text-black dark:text-white" : "text-gray-600 dark:text-white/60"} />
                  <span className="text-left font-medium">{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Mobile: botão "Último áudio" */}
        <div className="border-t border-gray-200 dark:border-white/10 p-3">
          <LastAudioButton expanded={true} />
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   BOTÃO "REPRODUZIR ÚLTIMO ÁUDIO"
   (agora com ícone Headphones)
   ========================================================= */
function LastAudioButton({ expanded }: { expanded: boolean }) {
  const audio = useAudioPlayer();
  const track = audio.track;
  const playLast = () => (audio as any).playLast?.();
  const [hasLast, setHasLast] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("b-isaf:lastTrack");
      setHasLast(!!saved);
    } catch {
      setHasLast(false);
    }
  }, [track]); // atualiza quando um novo áudio é guardado

  if (expanded) {
    return (
      <button
        onClick={playLast}
        disabled={!hasLast}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
          hasLast
            ? "bg-violet-600 text-white hover:bg-violet-700"
            : "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-slate-500 cursor-not-allowed"
        }`}
        title={hasLast ? "Reproduzir o último áudio ouvido" : "Nenhum áudio recente"}
      >
        <Headphones size={18} />
        Último áudio
      </button>
    );
  }

  // Versão colapsada
  return (
    <button
      onClick={playLast}
      disabled={!hasLast}
      className={`p-2 rounded-xl transition ${
        hasLast
          ? "bg-violet-600 text-white hover:bg-violet-700"
          : "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-slate-500 cursor-not-allowed"
      }`}
      title={hasLast ? "Reproduzir último áudio" : "Nenhum áudio recente"}
    >
      <Headphones size={18} />
    </button>
  );
}