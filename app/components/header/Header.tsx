"use client";

import Image from "next/image";
import {
  Search,
  SlidersHorizontal,
  Bell,
  Menu,
  X,
  BookOpen,
  Headphones,
  FileText,
  Trophy,
  Clock,
  Users,
  Loader2,
  Inbox,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

type HeaderProps = {
  expanded: boolean;
  mobileOpen?: boolean;
  setMobileOpen?: (value: boolean) => void;

  searchQuery: string;
  onSearchChange: (value: string) => void;

  // continua como fallback/inicial
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

const filterOptions = [
  {
    id: "disciplinas",
    label: "Disciplinas",
    description: "Explorar conteúdos por disciplina",
    icon: BookOpen,
    color: "text-blue-500",
  },
  {
    id: "slides",
    label: "Slides",
    description: "Materiais em formato de apresentação",
    icon: FileText,
    color: "text-emerald-500",
  },
  {
    id: "audios",
    label: "Áudios",
    description: "Aulas e explicações em áudio",
    icon: Headphones,
    color: "text-purple-500",
  },
  {
    id: "quizzes",
    label: "Quizzes e Testes",
    description: "Exercícios de avaliação e revisão",
    icon: Trophy,
    color: "text-amber-500",
  },
];

export default function Header({
  expanded,
  mobileOpen,
  setMobileOpen,
  searchQuery,
  onSearchChange,
  notificationCount = 0,
}: HeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsLoadedOnce, setNotificationsLoadedOnce] = useState(false);

  const filterDesktopRef = useRef<HTMLDivElement>(null);
  const filterMobileRef = useRef<HTMLDivElement>(null);
  const notificationDesktopRef = useRef<HTMLDivElement>(null);
  const notificationMobileRef = useRef<HTMLDivElement>(null);

  const isUnread = (notification: NotificationItem) =>
    notification.unread ?? (notification.read !== undefined ? !notification.read : true);

  const dynamicNotificationCount =
    notificationsLoadedOnce && !notificationsError
      ? notifications.filter(isUnread).length
      : notificationCount;

  const hasNotifications = dynamicNotificationCount > 0;

  const getNotificationIcon = (type?: NotificationItem["type"]) => {
    switch (type) {
      case "quiz":
        return Trophy;
      case "class":
        return Clock;
      case "invite":
        return Users;
      case "audio":
        return Headphones;
      case "slide":
        return FileText;
      default:
        return Bell;
    }
  };

  const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const response = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error("Falha ao carregar notificações");
      }

      const data = await response.json();

      const parsedNotifications: NotificationItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data.notifications)
        ? data.notifications
        : [];

      setNotifications(parsedNotifications);
      setNotificationsLoadedOnce(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotificationsError("Não foi possível carregar as notificações.");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Buscar dados reais sempre que o dropdown abre
  useEffect(() => {
    if (!notificationOpen) return;

    const controller = new AbortController();
    fetchNotifications(controller.signal);

    return () => controller.abort();
  }, [notificationOpen, fetchNotifications]);

  // Fechar ao clicar fora (desktop + mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedInsideFilter = Boolean(
        filterDesktopRef.current?.contains(target) ||
          filterMobileRef.current?.contains(target)
      );

      const clickedInsideNotification = Boolean(
        notificationDesktopRef.current?.contains(target) ||
          notificationMobileRef.current?.contains(target)
      );

      if (!clickedInsideFilter) {
        setFilterOpen(false);
      }

      if (!clickedInsideNotification) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderFilterContent = () => (
    <>
      <div className="mb-4 flex items-center justify-between px-2">
        <div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-300">Filtros</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Seleciona o tipo de conteúdo
          </p>
        </div>

        <button
          onClick={() => setFilterOpen(false)}
          className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Fechar filtros"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-2">
        {filterOptions.map((option) => {
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              className="w-full rounded-2xl px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <div className="flex items-start gap-3">
                <Icon size={18} className={`mt-0.5 ${option.color}`} />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {option.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {option.description}
                  </p>
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

        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          {dynamicNotificationCount} {dynamicNotificationCount === 1 ? "nova" : "novas"}
        </span>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {notificationsLoading && (
          <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
            <Loader2 className="mb-3 h-5 w-5 animate-spin text-blue-500" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              A carregar notificações...
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              A obter dados reais da API.
            </p>
          </div>
        )}

        {!notificationsLoading && notificationsError && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {notificationsError}
            </p>

            <button
              onClick={() => fetchNotifications()}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!notificationsLoading && !notificationsError && notifications.length === 0 && (
          <div className="px-5 py-10 text-center">
            <Inbox className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Sem notificações
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Quando houver novidades, vão aparecer aqui.
            </p>
          </div>
        )}

        {!notificationsLoading &&
          !notificationsError &&
          notifications.length > 0 &&
          notifications.map((notif) => {
            const Icon = getNotificationIcon(notif.type);
            const unread = isUnread(notif);

            return (
              <div
                key={notif.id}
                className={`flex gap-4 border-b border-gray-100 px-5 py-4 last:border-none dark:border-white/10 ${
                  unread
                    ? "bg-blue-50/50 hover:bg-blue-50 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="mt-0.5">
                  <Icon size={20} className="text-slate-500 dark:text-slate-400" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium leading-tight text-slate-800 dark:text-slate-100">
                    {notif.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {notif.time ?? "Agora mesmo"}
                  </p>
                </div>

                {unread && (
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                )}
              </div>
            );
          })}
      </div>

      {!notificationsLoading && !notificationsError && notifications.length > 0 && (
        <button className="w-full px-5 py-3 text-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-700">
          Ver todas as notificações
        </button>
      )}
    </>
  );

  return (
    <>
      {/* ==================== DESKTOP HEADER ==================== */}
      <header
        className={`fixed top-0 z-40 hidden h-16 transition-all duration-300 md:block
          bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl
          border-b border-gray-200 dark:border-white/10 shadow-sm
          ${expanded ? "left-56 right-0" : "left-16 right-0"}
        `}
      >
        <div className="flex h-full items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col">
              <span className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Biblioteca Virtual
              </span>
            </div>
          </div>

          <div className="max-w-2xl flex-1">
            <div className="relative flex h-10 items-center rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
              <Search size={18} className="absolute left-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Pesquisar disciplinas, temas, áudios..."
                className="w-full bg-transparent py-2.5 pl-12 pr-14 text-sm text-slate-800 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-slate-500"
              />

              <button
                onClick={() => {
                  setFilterOpen(!filterOpen);
                  setNotificationOpen(false);
                }}
                className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                aria-label="Filtros"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setNotificationOpen(!notificationOpen);
                setFilterOpen(false);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 transition-colors hover:bg-slate-100 dark:border-white/10 dark:hover:bg-slate-800"
              aria-label="Notificações"
            >
              <Bell size={20} />
              {hasNotifications && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white shadow-md">
                  {dynamicNotificationCount > 99 ? "99+" : dynamicNotificationCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* DROPDOWN FILTRO DESKTOP */}
        {filterOpen && (
          <div
            ref={filterDesktopRef}
            className="absolute right-8 top-16 z-50 w-80 rounded-3xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-slate-900"
          >
            {renderFilterContent()}
          </div>
        )}

        {/* DROPDOWN NOTIFICAÇÕES DESKTOP */}
        {notificationOpen && (
          <div
            ref={notificationDesktopRef}
            className="absolute right-8 top-16 z-50 w-80 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"
          >
            {renderNotificationContent()}
          </div>
        )}
      </header>

      {/* ==================== MOBILE HEADER ==================== */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center gap-2 border-b border-gray-200 bg-white/95 px-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 md:hidden">
        <button
          onClick={() => setMobileOpen?.(!mobileOpen)}
          className="shrink-0 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu size={24} />
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <Image src="/logo.svg" alt="b-ISAF" width={28} height={28} className="h-7 w-7" />
          <span className="text-sm font-semibold">b-ISAF</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative flex h-10 items-center rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-slate-900">
            <Search size={18} className="absolute left-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar..."
              className="h-full w-full bg-transparent pl-12 pr-12 text-sm focus:outline-none"
            />
            <button
              onClick={() => {
                setFilterOpen(!filterOpen);
                setNotificationOpen(false);
              }}
              className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            setNotificationOpen(!notificationOpen);
            setFilterOpen(false);
          }}
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 dark:border-white/10"
        >
          <Bell size={20} />
          {hasNotifications && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {dynamicNotificationCount > 99 ? "99+" : dynamicNotificationCount}
            </span>
          )}
        </button>
      </header>

      {/* DROPDOWN FILTRO MOBILE */}
      {filterOpen && (
        <div className="fixed inset-x-3 top-16 z-50 md:hidden">
          <div
            ref={filterMobileRef}
            className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-slate-900"
          >
            {renderFilterContent()}
          </div>
        </div>
      )}

      {/* DROPDOWN NOTIFICAÇÕES MOBILE */}
      {notificationOpen && (
        <div className="fixed inset-x-3 top-16 z-50 md:hidden">
          <div
            ref={notificationMobileRef}
            className="max-h-[calc(100vh-5rem)] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"
          >
            {renderNotificationContent()}
          </div>
        </div>
      )}
    </>
  );
}