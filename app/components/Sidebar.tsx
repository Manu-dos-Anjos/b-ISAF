"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Home,
  BookOpen,
  Bookmark,
  History,
  GraduationCap,
  ClipboardList,
  Pin,
  PinOff,
  ChevronRight,
  X,
} from "lucide-react";

const navItems = [
  { id: "home", label: "Início", icon: Home, path: "/" },
  { id: "disciplines", label: "Disciplinas", icon: BookOpen, path: "/disciplinas" },
  { id: "saved", label: "Guardados", icon: Bookmark, path: "/guardados" },
  { id: "history", label: "Histórico", icon: History, path: "/historico" },
  { id: "my-course", label: "Meu Curso", icon: GraduationCap, path: "/meu-curso" },
  { id: "assessments", label: "Avaliações", icon: ClipboardList, path: "/avaliacoes" },
];

type StatusTone = "success" | "warning" | "danger" | "neutral";

export type SidebarUser = {
  name: string;
  email?: string;
  avatarUrl?: string;
  academic?: {
    year?: string;
    semester?: string;
    course?: string;
    studentNumber?: string;
    institution?: string;
  };
  status?: {
    label: string;
    tone?: StatusTone;
    description?: string;
  };
};

type SidebarProps = {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  pinned: boolean;
  setPinned: (value: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (value: boolean) => void;
  user?: SidebarUser | null;
};

const statusStyles: Record<StatusTone, { badge: string; dot: string }> = {
  success: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  warning: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  danger: {
    badge: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    dot: "bg-red-500",
  },
  neutral: {
    badge: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

export default function Sidebar({
  expanded,
  setExpanded,
  pinned,
  setPinned,
  mobileOpen = false,
  setMobileOpen,
  user,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const [profileOpen, setProfileOpen] = useState(false);

  const profileDesktopRef = useRef<HTMLDivElement>(null);
  const profileMobileRef = useRef<HTMLDivElement>(null);

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

  const displayName = user?.name || "Estudante";
  const displayEmail = user?.email || "Email não disponível";

  const displayYear = user?.academic?.year || "Ano não definido";
  const displaySemester = user?.academic?.semester || "Semestre não definido";
  const displayCourse = user?.academic?.course || "Curso não definido";
  const displayStudentNumber = user?.academic?.studentNumber || "Nº não definido";
  const displayInstitution = user?.academic?.institution || "Instituição não definida";

  const profileStatus = user?.status || {
    label: "Perfil incompleto",
    tone: "warning" as StatusTone,
    description: "Completa os teus dados académicos para personalizar melhor a plataforma.",
  };

  const currentStatusStyle = statusStyles[profileStatus.tone || "neutral"];

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "E";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const userInitials = getInitials(displayName);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedDesktop = profileDesktopRef.current?.contains(target);
      const clickedMobile = profileMobileRef.current?.contains(target);

      if (!clickedDesktop && !clickedMobile) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
  }, [pathname, mobileOpen]);

  const renderProfilePanel = () => (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-slate-900">
      <div className="flex flex-col gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Estado do perfil
          </p>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-900 break-words dark:text-white">
            {displayName}
          </p>
          <p className="text-xs leading-5 text-slate-500 break-all dark:text-slate-400">
            {displayEmail}
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${currentStatusStyle.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${currentStatusStyle.dot}`} />
          {profileStatus.label}
        </span>
      </div>

      {profileStatus.description && (
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {profileStatus.description}
        </p>
      )}

      <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-white/10">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Ano
          </span>
          <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
            {displayYear}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-white/10">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Semestre
          </span>
          <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
            {displaySemester}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2 dark:border-white/10">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Curso
          </span>
          <span className="max-w-[160px] text-right text-xs font-medium leading-5 text-slate-800 dark:text-slate-100">
            {displayCourse}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-white/10">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Nº Estudante
          </span>
          <span className="text-xs font-medium text-slate-800 dark:text-slate-100">
            {displayStudentNumber}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Instituição
          </span>
          <span className="max-w-[160px] text-right text-xs font-medium leading-5 text-slate-800 dark:text-slate-100">
            {displayInstitution}
          </span>
        </div>
      </div>
    </div>
  );

  const renderAvatar = () => (
    <div className="relative h-8 w-8 flex-shrink-0">
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-white">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[11px] font-semibold">{userInitials}</span>
        )}
      </div>

      <span
        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${currentStatusStyle.dot}`}
      />
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen?.(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 z-50 hidden h-full flex-col border-r border-gray-200 bg-white shadow-lg transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-gradient-to-b dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-2xl md:flex ${
          expanded ? "w-56" : "w-16"
        }`}
      >
        {/* Logo */}
        <div
          className={`flex min-h-[64px] items-center gap-3 border-b border-gray-200 px-3 py-4 dark:border-white/10 ${
            expanded ? "justify-between" : "justify-center"
          }`}
        >
          <div className="flex items-center gap-4 overflow-hidden">
            <Image
              src="/logo.svg"
              alt="b-ISAF Logo"
              width={32}
              height={32}
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

        {/* Nav */}
        <nav className="flex flex-1 flex-col justify-center gap-2 overflow-hidden py-4">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <div key={item.id} className="relative px-2">
                {!expanded && active && (
                  <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-black dark:bg-white" />
                )}

                <button
                  onClick={() => router.push(item.path)}
                  className={`
                    w-full flex items-center gap-3 rounded-xl transition-all duration-200
                    ${expanded ? "px-3 py-2.5" : "justify-center px-2 py-2.5"}
                    ${
                      active
                        ? expanded
                          ? "bg-gray-100 text-black dark:bg-white/15 dark:text-white"
                          : "bg-gray-100 text-black dark:bg-white/10 dark:text-white"
                        : "text-gray-600 hover:bg-gray-50 hover:text-black dark:text-white/60 dark:hover:bg-white/8 dark:hover:text-white"
                    }
                  `}
                  title={!expanded ? item.label : undefined}
                >
                  <Icon
                    size={20}
                    className={active ? "text-black dark:text-white" : "text-gray-600 dark:text-white/60"}
                  />

                  {expanded && (
                    <>
                      <span
                        className={`flex-1 whitespace-nowrap text-left text-sm font-medium ${
                          active ? "text-black dark:text-white" : "text-gray-700 dark:text-white/70"
                        }`}
                      >
                        {item.label}
                      </span>

                      {active && (
                        <ChevronRight
                          size={14}
                          className="flex-shrink-0 text-gray-500 dark:text-white/60"
                        />
                      )}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* User footer desktop */}
        <div
          ref={profileDesktopRef}
          className={`relative border-t border-gray-200 p-3 dark:border-white/10 ${
            expanded ? "" : "flex justify-center"
          }`}
        >
          {profileOpen && (
            <div className="absolute left-full bottom-3 ml-3 z-[60] w-72">
              {renderProfilePanel()}
            </div>
          )}

          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className={`flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/8 ${
              !expanded ? "justify-center" : ""
            }`}
            title={!expanded ? "Ver estado do perfil" : undefined}
            aria-label="Ver estado do perfil"
          >
            {renderAvatar()}

            {expanded && (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-semibold text-black dark:text-white">
                  {displayName}
                </p>
                <p className="truncate text-[10px] text-gray-600 dark:text-white/40">
                  {displayYear} · {displaySemester}
                </p>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-gray-200 bg-white shadow-lg transition-transform duration-300 ease-in-out dark:border-white/10 dark:bg-gradient-to-b dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-2xl md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Logo */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-white/10">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.svg"
              alt="b-ISAF Logo"
              width={32}
              height={32}
              className="h-8 w-8 flex-shrink-0"
            />
            <span className="text-lg font-bold tracking-wide text-black dark:text-white">
              b-ISAF
            </span>
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

        {/* Mobile Nav */}
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto py-4">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  router.push(item.path);
                  setMobileOpen?.(false);
                }}
                className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 transition-all duration-200 ${
                  active
                    ? "bg-gray-100 text-black dark:bg-white/15 dark:text-white"
                    : "text-gray-700 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/8"
                }`}
              >
                <Icon
                  size={20}
                  className={active ? "text-black dark:text-white" : "text-gray-600 dark:text-white/60"}
                />
                <span className="text-left font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile User footer */}
        <div
          ref={profileMobileRef}
          className="relative border-t border-gray-200 p-4 dark:border-white/10"
        >
          {profileOpen && (
            <div className="absolute left-4 right-4 bottom-[4.75rem] z-[60]">
              {renderProfilePanel()}
            </div>
          )}

          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/8"
            aria-label="Ver estado do perfil"
          >
            {renderAvatar()}

            <div className="min-w-0 text-left">
              <p className="truncate text-xs font-semibold text-black dark:text-white">
                {displayName}
              </p>
              <p className="truncate text-[10px] text-gray-600 dark:text-white/40">
                {displayYear} · {displaySemester}
              </p>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}