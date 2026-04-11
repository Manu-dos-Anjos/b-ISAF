"use client";

import Image from "next/image";
import {
  Search, SlidersHorizontal, Bell, Menu, X, BookOpen, Headphones, FileText, Trophy,
  Clock, Users, Loader2, Inbox, Megaphone // <-- Ícone Adicionado
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

// --- TIPOS E DADOS ---
type HeaderProps = {
  expanded: boolean;
  mobileOpen?: boolean;
  setMobileOpen?: (value: boolean) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  notificationCount?: number;
};
type NotificationItem = {
  id: number | string;
  type?: "quiz" | "class" | "invite" | "audio" | "slide" | "default";
  title: string;
  time?: string;
  read?: boolean;
  unread?: boolean;
};

// ================================================================
// INÍCIO DA ÁREA ALTERADA: Opções de Filtro
// ================================================================
const filterOptions = [
  { id: "disciplinas", label: "Disciplinas", icon: BookOpen, color: "text-blue-500", description: "Encontre por matéria" },
  { id: "slides", label: "Slides", icon: FileText, color: "text-emerald-500", description: "Apresentações de aulas" },
  { id: "audios", label: "Áudios", icon: Headphones, color: "text-purple-500", description: "Gravações e podcasts" },
  { id: "quizzes", label: "Quizzes", icon: Trophy, color: "text-amber-500", description: "Teste os seus conhecimentos" },
  { id: "comunicados", label: "Comunicados", icon: Megaphone, color: "text-cyan-500", description: "Avisos e novidades importantes" }, // <-- Adicionado
];
// ================================================================
// FIM DA ÁREA ALTERADA
// ================================================================


export default function Header({
  expanded, mobileOpen, setMobileOpen, searchQuery, onSearchChange, notificationCount = 0
}: HeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // --- LÓGICA DE NOTIFICAÇÕES (sem alterações) ---
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsLoadedOnce, setNotificationsLoadedOnce] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const isUnread = (notification: NotificationItem) => notification.unread ?? (notification.read !== undefined ? !notification.read : true);
  const dynamicNotificationCount = notificationsLoadedOnce && !notificationsError ? notifications.filter(isUnread).length : notificationCount;
  const hasNotifications = dynamicNotificationCount > 0;

  const getNotificationIcon = (type?: NotificationItem["type"]) => {
    switch (type) {
      case "quiz": return Trophy; case "class": return Clock;
      case "invite": return Users; default: return Bell;
    }
  };

  const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
    setNotificationsLoading(true); setNotificationsError(null);
    try {
      const response = await fetch("/api/notifications", { method: "GET", cache: "no-store", signal });
      if (!response.ok) throw new Error("Falha ao carregar notificações");
      const data = await response.json();
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setNotificationsLoadedOnce(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotificationsError("Não foi possível carregar as notificações.");
    } finally { setNotificationsLoading(false); }
  }, []);

  useEffect(() => {
    if (!notificationOpen) return;
    const controller = new AbortController();
    fetchNotifications(controller.signal);
    return () => controller.abort();
  }, [notificationOpen, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setNotificationOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderFilterContent = () => (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-300">Filtros Rápidos</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Seleciona o tipo de conteúdo</p>
        </div>
        <button onClick={() => setFilterOpen(false)} className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200" aria-label="Fechar filtros">
          <X size={18} />
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {filterOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button key={option.id} className="w-full rounded-2xl px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
              <div className="flex items-start gap-3">
                <Icon size={18} className={`mt-0.5 ${option.color}`} />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{option.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  const renderNotificationContent = () => (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/10">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Notificações</h3>
        {hasNotifications && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">{dynamicNotificationCount} novas</span>}
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {notificationsLoading && <div className="flex flex-col items-center justify-center p-10 text-center"><Loader2 className="mb-3 h-5 w-5 animate-spin text-blue-500" /><p className="text-sm font-medium text-slate-800 dark:text-slate-100">A carregar...</p></div>}
        {!notificationsLoading && notificationsError && <div className="p-10 text-center"><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{notificationsError}</p><button onClick={() => fetchNotifications()} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">Tentar novamente</button></div>}
        {!notificationsLoading && !notificationsError && notifications.length === 0 && <div className="p-10 text-center"><Inbox className="mx-auto mb-3 h-8 w-8 text-slate-400" /><p className="text-sm font-medium text-slate-800 dark:text-slate-100">Sem notificações</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Quando houver novidades, aparecerão aqui.</p></div>}
        {!notificationsLoading && !notificationsError && notifications.length > 0 && notifications.map((notif) => {
          const Icon = getNotificationIcon(notif.type);
          return (
            <div key={notif.id} className={`flex gap-4 border-b border-gray-100 px-5 py-4 last:border-none dark:border-white/10 ${isUnread(notif) ? "bg-blue-50/50 dark:bg-slate-800/60" : ""} hover:bg-slate-50 dark:hover:bg-slate-800`}>
              <div className="mt-0.5"><Icon size={20} className="text-slate-500 dark:text-slate-400" /></div>
              <div className="flex-1"><p className="text-sm font-medium leading-tight text-slate-800 dark:text-slate-100">{notif.title}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{notif.time ?? "Agora mesmo"}</p></div>
              {isUnread(notif) && <span className="mt-1 h-2.5 w-2.5 self-start rounded-full bg-blue-500" />}
            </div>
          );
        })}
      </div>
      {!notificationsLoading && !notificationsError && notifications.length > 0 && <button className="w-full px-5 py-3 text-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-700">Ver todas</button>}
    </>
  );

  return (
    <>
      
      <header
        className={`fixed top-0 z-40 h-16 transition-all duration-300
          bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl
          border-b border-gray-200 dark:border-white/10
          ${expanded ? "md:left-56" : "md:left-16"} right-0 left-0
        `}
      >
        <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between gap-4 px-4 md:px-6">
          
          <div className="flex flex-shrink-0 items-center gap-4">
            <button onClick={() => setMobileOpen?.(!mobileOpen)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden">
              <Menu size={24} className="text-slate-800 dark:text-slate-200" />
            </button>
            <div className="hidden items-center gap-3 md:flex">
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Biblioteca Virtual
              </span>
            </div>
          </div>

          <div className="flex-1 px-4 md:px-8">
            <div className="relative mx-auto max-w-xl" ref={filterRef}>
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Pesquisar disciplinas, temas..."
                className="h-10 w-full rounded-full border border-slate-200 bg-slate-50/50 py-2 pl-11 pr-12 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-800"
              />
              
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => { setFilterOpen(!filterOpen); setNotificationOpen(false); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                  aria-label="Filtros"
                >
                  <SlidersHorizontal size={16} className="text-slate-600 dark:text-slate-300" />
                </button>
              </div>

              {/* 
                ================================================================
                INÍCIO DA ÁREA ALTERADA: Posicionamento do Dropdown
                ================================================================
              */}
              <div className={`absolute top-full mt-2 origin-top-right transition-all left-0 right-0 md:left-auto md:right-0 md:w-80 ${filterOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-slate-900">{renderFilterContent()}</div>
              </div>
              {/* 
                ================================================================
                FIM DA ÁREA ALTERADA
                ================================================================
              */}
            </div>
          </div>

          <div className="relative flex-shrink-0" ref={notificationRef}>
            <button
              onClick={() => { setNotificationOpen(!notificationOpen); setFilterOpen(false); }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              aria-label="Notificações"
            >
              <Bell size={20} className="text-slate-600 dark:text-slate-300" />
              {hasNotifications && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white shadow-md">{dynamicNotificationCount > 9 ? "9+" : dynamicNotificationCount}</span>}
            </button>
            <div className={`absolute top-full right-0 mt-2 w-80 origin-top-right transition-all sm:w-96 ${notificationOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
              <div className="max-h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">{renderNotificationContent()}</div>
            </div>
          </div>
        </div>
      </header>

      <div onClick={() => { setFilterOpen(false); setNotificationOpen(false); }} className={`fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden ${(filterOpen || notificationOpen) ? "block" : "hidden"}`} />
    </>
  );
}