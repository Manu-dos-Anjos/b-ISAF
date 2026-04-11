"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Home, BookOpen, Bookmark, GraduationCap, ClipboardList,
  Pin, PinOff, ChevronRight, X, Edit3, Save, XCircle, Loader2, ChevronDown,
  Calendar // <-- ÍCONE ADICIONADO
} from "lucide-react";

// Constantes com as opções para os dropdowns
const yearOptions = ["1º Ano", "2º Ano", "3º Ano", "4º Ano"];
const semesterOptions = ["1º Semestre", "2º Semestre"];
const courseOptions = [
  "Informática de Gestão Financeira",
  "Contabilidade e Finanças",
  "Gestão Bancária e Seguros",
];

// ================================================================
// INÍCIO DA ÁREA ALTERADA: Itens de navegação
// ================================================================
const navItems = [
    { id: "home", label: "Início", icon: Home, path: "/" },
    { id: "eventos", label: "Eventos", icon: Calendar, path: "/eventos" }, // ADICIONADO
    { id: "disciplines", label: "Disciplinas", icon: BookOpen, path: "/disciplinas" },
    { id: "saved", label: "Guardados", icon: Bookmark, path: "/guardados" },
    // { id: "history", label: "Histórico", icon: History, path: "/historico" }, // REMOVIDO
    { id: "my-course", label: "Meu Curso", icon: GraduationCap, path: "/meu-curso" },
    { id: "assessments", label: "Avaliações", icon: ClipboardList, path: "/avaliacoes" },
];
// ================================================================
// FIM DA ÁREA ALTERADA
// ================================================================

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
  onUpdateUser?: (updates: Partial<SidebarUser["academic"]>) => Promise<void>;
};

const statusStyles: Record<StatusTone, { badge: string; dot: string }> = {
  success: { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", dot: "bg-emerald-500" },
  warning: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", dot: "bg-amber-500" },
  danger: { badge: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300", dot: "bg-red-500" },
  neutral: { badge: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300", dot: "bg-slate-400" },
};

export default function Sidebar({
  expanded, setExpanded, pinned, setPinned, mobileOpen = false,
  setMobileOpen, user, onUpdateUser,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";

  const [profileOpen, setProfileOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editYear, setEditYear] = useState("");
  const [editSemester, setEditSemester] = useState("");
  const [editCourse, setEditCourse] = useState("");

  const profileDesktopRef = useRef<HTMLDivElement>(null);
  const profileMobileRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => { if (!pinned) setExpanded(true); };
  const handleMouseLeave = () => { if (!pinned) setExpanded(false); };
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
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };
  const userInitials = getInitials(displayName);

  const handleStartEdit = () => {
    setEditYear(user?.academic?.year || "");
    setEditSemester(user?.academic?.semester || "");
    setEditCourse(user?.academic?.course || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!onUpdateUser) return;
    setIsSaving(true);
    try {
      const updates: Partial<SidebarUser["academic"]> = {
        year: editYear,
        semester: editSemester,
        course: editCourse,
      };
      await onUpdateUser(updates);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!profileDesktopRef.current?.contains(target) && !profileMobileRef.current?.contains(target)) {
        setProfileOpen(false);
        if (isEditing) handleCancelEdit();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  useEffect(() => {
    setProfileOpen(false);
    if (isEditing) handleCancelEdit();
  }, [pathname, mobileOpen]);

  const renderProfilePanel = () => (
    <div className="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-slate-900">
      
      <div className="absolute -top-10 left-1/2 -translate-x-1/2">
        <div className="relative h-20 w-20">
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={displayName}
              width={80}
              height={80}
              className="rounded-full object-cover border-4 border-white dark:border-slate-900"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-400 to-indigo-600 text-white dark:border-slate-900">
              <span className="text-2xl font-semibold">{userInitials}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col gap-2 pt-10 text-center">
        <p className="text-sm font-semibold leading-5 text-slate-900 dark:text-white">
          {displayName}
        </p>
        <p className="break-all text-xs leading-5 text-slate-500 dark:text-slate-400">
          {displayEmail}
        </p>

        {!isEditing && (
          <div className="mt-1 flex justify-center">
            <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${currentStatusStyle.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${currentStatusStyle.dot}`} />
              {profileStatus.label}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
        <div className="grid grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-3">
          
          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Ano</span>
          {isEditing ? (
            <div className="relative w-full">
              <select
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
                className="w-full appearance-none rounded-md border border-slate-300 bg-white px-2 py-1 pr-8 text-right text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/20 dark:bg-slate-800 dark:text-slate-100"
              >
                {yearOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          ) : ( <span className="text-right text-xs font-medium text-slate-800 dark:text-slate-100">{displayYear}</span> )}

          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Semestre</span>
          {isEditing ? (
            <div className="relative w-full">
              <select
                value={editSemester}
                onChange={(e) => setEditSemester(e.target.value)}
                className="w-full appearance-none rounded-md border border-slate-300 bg-white px-2 py-1 pr-8 text-right text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/20 dark:bg-slate-800 dark:text-slate-100"
              >
                {semesterOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          ) : ( <span className="text-right text-xs font-medium text-slate-800 dark:text-slate-100">{displaySemester}</span> )}

          <span className="self-start pt-0.5 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Curso</span>
          {isEditing ? (
            <div className="relative w-full">
              <select
                value={editCourse}
                onChange={(e) => setEditCourse(e.target.value)}
                className="w-full appearance-none rounded-md border border-slate-300 bg-white px-2 py-1 pr-8 text-right text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/20 dark:bg-slate-800 dark:text-slate-100"
              >
                {courseOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          ) : ( <span className="truncate text-right text-xs font-medium leading-5 text-slate-800 dark:text-slate-100">{displayCourse}</span> )}
          
          <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Nº Estudante</span>
          <span className="text-right text-xs font-medium text-slate-800 dark:text-slate-100">{displayStudentNumber}</span>
          
          <span className="self-start pt-0.5 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Instituição</span>
          <span className="text-right text-xs font-medium leading-5 text-slate-800 dark:text-slate-100">{displayInstitution}</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {isEditing ? (
          <>
            <button onClick={handleCancelEdit} disabled={isSaving} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"> <XCircle size={14} /> Cancelar </button>
            <button onClick={handleSaveEdit} disabled={isSaving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"> {isSaving ? (<><Loader2 size={14} className="animate-spin" /> A guardar...</>) : (<><Save size={14} /> Guardar</>)} </button>
          </>
        ) : (
          <button onClick={handleStartEdit} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all hover:from-blue-700 hover:to-indigo-700"> <Edit3 size={14} /> Atualizar dados </button>
        )}
      </div>
    </div>
  );

  const renderAvatar = () => (
    <div className="relative h-8 w-8 flex-shrink-0">
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-white">
        {user?.avatarUrl ? (
          <Image src={user.avatarUrl} alt={displayName} width={32} height={32} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[11px] font-semibold">{userInitials}</span>
        )}
      </div>
      <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${currentStatusStyle.dot}`} />
    </div>
  );

  return (
    <>
      {mobileOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen?.(false)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] md:hidden" />}
      <aside onMouseLeave={handleMouseLeave} className={`fixed top-0 left-0 z-50 hidden h-full flex-col border-r border-gray-200 bg-white shadow-lg transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-gradient-to-b dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-2xl md:flex ${expanded ? "w-56" : "w-16"}`}>
        <div onMouseEnter={handleMouseEnter} className="flex min-h-0 flex-1 flex-col">
          <div className={`flex min-h-[64px] items-center gap-3 border-b border-gray-200 px-3 py-4 dark:border-white/10 ${expanded ? "justify-between" : "justify-center"}`}>
            <div className="flex items-center gap-4 overflow-hidden">
              <Image src="/logo.svg" alt="b-ISAF Logo" width={32} height={32} className="h-8 w-8 flex-shrink-0" />
              {expanded && <div className="overflow-hidden whitespace-nowrap"><span className="text-lg font-bold tracking-wide text-black dark:text-white">b-ISAF</span></div>}
            </div>
            {expanded && <button onClick={() => setPinned(!pinned)} className="flex-shrink-0 text-gray-400 transition-colors hover:text-black dark:text-white/40 dark:hover:text-white/80" title={pinned ? "Desafixar sidebar" : "Fixar sidebar"} aria-label={pinned ? "Desafixar sidebar" : "Fixar sidebar"}>{pinned ? <PinOff size={18} strokeWidth={2} /> : <Pin size={18} strokeWidth={2} />}</button>}
          </div>
          <nav className="flex flex-1 flex-col justify-center gap-2 overflow-hidden py-4">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <div key={item.id} className="relative px-2">
                  {active && <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-black dark:bg-white" />}
                  <button onClick={() => router.push(item.path)} className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${expanded ? "px-3 py-2.5" : "justify-center px-2 py-2.5"} ${active ? expanded ? "bg-gray-100 text-black dark:bg-white/15 dark:text-white" : "bg-gray-100 text-black dark:bg-white/10 dark:text-white" : "text-gray-600 hover:bg-gray-50 hover:text-black dark:text-white/60 dark:hover:bg-white/8 dark:hover:text-white"}`} title={!expanded ? item.label : undefined}>
                    <Icon size={20} className={active ? "text-black dark:text-white" : "text-gray-600 dark:text-white/60"} />
                    {expanded && (<><span className={`flex-1 whitespace-nowrap text-left text-sm font-medium ${active ? "text-black dark:text-white" : "text-gray-700 dark:text-white/70"}`}>{item.label}</span>{active && <ChevronRight size={14} className="flex-shrink-0 text-gray-500 dark:text-white/60" />}</>)}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>
        <div ref={profileDesktopRef} className={`relative border-t border-gray-200 p-3 dark:border-white/10 ${expanded ? "" : "flex justify-center"}`}>
          {profileOpen && <div className="absolute left-full bottom-1 z-[60] ml-1.5 w-72">{renderProfilePanel()}</div>}
          <button type="button" onClick={() => setProfileOpen((prev) => !prev)} className={`flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/8 ${!expanded ? "justify-center" : ""}`} title={!expanded ? "Ver estado do perfil" : undefined} aria-label="Ver estado do perfil">
            {renderAvatar()}
            {expanded && (<div className="min-w-0 flex-1 text-left"><p className="truncate text-xs font-semibold text-black dark:text-white">{displayName}</p><p className="truncate text-[10px] text-gray-600 dark:text-white/40">{displayYear} · {displaySemester}</p></div>)}
          </button>
        </div>
      </aside>
      <aside className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-gray-200 bg-white shadow-lg transition-transform duration-300 ease-in-out dark:border-white/10 dark:bg-gradient-to-b dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-2xl md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-white/10">
          <div className="flex items-center gap-4"><Image src="/logo.svg" alt="b-ISAF Logo" width={32} height={32} className="h-8 w-8 flex-shrink-0" /><span className="text-lg font-bold tracking-wide text-black dark:text-white">b-ISAF</span></div>
          <button onClick={() => setMobileOpen?.(false)} className="text-gray-600 transition-colors hover:text-black dark:text-white/60 dark:hover:text-white" title="Fechar menu" aria-label="Fechar menu"><X size={20} /></button>
        </div>
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto py-4">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative px-3">
                {active && <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-black dark:bg-white" />}
                <button onClick={() => { router.push(item.path); setMobileOpen?.(false); }} className={`flex w-full items-center gap-4 rounded-lg px-4 py-3 transition-all duration-200 ${active ? "bg-gray-100 text-black dark:bg-white/15 dark:text-white" : "text-gray-700 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/8"}`}>
                  <Icon size={20} className={active ? "text-black dark:text-white" : "text-gray-600 dark:text-white/60"} />
                  <span className="text-left font-medium">{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
        <div ref={profileMobileRef} className="relative border-t border-gray-200 dark:border-white/10">
          {profileOpen && <div className="absolute bottom-full left-0 right-0 z-10 mb-2 px-3">{renderProfilePanel()}</div>}
          <div className="p-4">
            <button type="button" onClick={() => setProfileOpen((prev) => !prev)} className="flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/8" aria-label="Ver estado do perfil">
              {renderAvatar()}
              <div className="min-w-0 flex-1 text-left"><p className="truncate text-xs font-semibold text-black dark:text-white">{displayName}</p><p className="truncate text-[10px] text-gray-600 dark:text-white/40">{displayYear} · {displaySemester}</p></div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}