// app/components/Sidebar.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  BookOpen,
  Bookmark,
  GraduationCap,
  ClipboardList,
  X,
  Calendar,
  Headphones,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { useAudioPlayer } from "@/app/lib/context/AudioPlayerContext";
import { isValidPersisted } from "@/app/lib/audioPersistedSchema";
import { safeGet } from "@/app/lib/safeLocalStorage";

const FEEDBACK_URL = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim() ?? "";

const navItems = [
  { id: "home",        label: "Início",      icon: LayoutDashboard, path: "/"           },
  { id: "eventos",     label: "Eventos",     icon: Calendar,        path: "/eventos"    },
  { id: "disciplines", label: "Disciplinas", icon: BookOpen,        path: "/disciplinas"},
  { id: "saved",       label: "Guardados",   icon: Bookmark,        path: "/guardados"  },
  { id: "my-course",   label: "Meu Curso",   icon: GraduationCap,   path: "/meu-curso"  },
  { id: "assessments", label: "Avaliações",  icon: ClipboardList,   path: "/avaliacoes" },
];

type SidebarProps = {
  mobileOpen?: boolean;
  setMobileOpen?: (value: boolean) => void;
};

export default function Sidebar({ mobileOpen = false, setMobileOpen }: SidebarProps) {
  const router   = useRouter();
  const pathname = usePathname() ?? "/";

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const handleNavigate = (path: string, closeMobile = false) => {
    router.push(path);
    if (closeMobile) setMobileOpen?.(false);
  };

  return (
    <>
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen?.(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[65px] flex-col border-r border-slate-300 bg-slate-200 dark:border-white/8 dark:bg-[#13152A] md:flex">
        <div className="flex h-14 shrink-0 items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Image src="/logo_dark.svg" alt="b-ISAF" width={18} height={18} />
          </div>
        </div>

        <nav className="flex flex-1 flex-col items-center justify-center gap-0 py-1.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon   = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className="group flex w-full flex-col items-center justify-center py-[5px] outline-none"
              >
                <div className="relative flex w-full items-center justify-center">
                  <span
                    className={`
                      absolute left-0 w-[3px] rounded-r-full transition-all duration-200
                      ${active
                        ? "h-10 bg-violet-500 dark:bg-violet-400"
                        : "h-0 group-hover:h-5 group-hover:bg-slate-400/50 dark:group-hover:bg-white/25"}
                    `}
                  />
                  <span
                    className={`
                      flex h-10 w-10 items-center justify-center rounded-lg
                      transition-all duration-150
                      ${active
                        ? "bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"
                        : "text-slate-700 group-hover:bg-slate-300/70 group-hover:text-slate-900 dark:text-white/75 dark:group-hover:bg-white/10 dark:group-hover:text-white"}
                    `}
                  >
                    <Icon size={22} strokeWidth={active ? 2.3 : 2.1} />
                  </span>
                </div>
                <span
                  className={`
                    mt-[3px] w-full text-center text-[9px] font-semibold
                    leading-none tracking-wide transition-colors duration-150
                    ${active
                      ? "text-violet-600 dark:text-violet-300"
                      : "text-slate-600 group-hover:text-slate-900 dark:text-white/70 dark:group-hover:text-white"}
                  `}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 flex-col items-center border-t border-slate-300 py-2.5 dark:border-white/8">
          <FeedbackButton />
          <LastAudioButton />
        </div>
      </aside>

      {/* Mobile */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col
          bg-white shadow-2xl dark:bg-[#13152A]
          transition-transform duration-300 ease-in-out md:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-3.5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Image src="/logo_dark.svg" alt="b-ISAF" width={18} height={18} />
            </div>
            <span className="text-sm font-bold tracking-wide text-slate-900 dark:text-white">b-ISAF</span>
          </div>
          <button
            onClick={() => setMobileOpen?.(false)}
            aria-label="Fechar menu"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-[1.5px] overflow-y-auto px-1.5 py-2.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon   = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path, true)}
                aria-current={active ? "page" : undefined}
                className={`
                  group relative flex w-full items-center gap-2.5
                  rounded-lg px-2.5 py-2 text-left
                  transition-all duration-150
                  ${active
                    ? "bg-violet-100 text-slate-900 dark:bg-violet-500/15 dark:text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/6 dark:hover:text-white"}
                `}
              >
                <span
                  className={`
                    absolute left-0 top-1/2 -translate-y-1/2
                    w-[3px] rounded-r-full transition-all duration-200
                    ${active ? "h-6 bg-violet-500 dark:bg-violet-400" : "h-0"}
                  `}
                />
                <span
                  className={`
                    flex h-7 w-7 shrink-0 items-center justify-center rounded-md
                    transition-all duration-150
                    ${active
                      ? "bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"
                      : "text-slate-700 group-hover:text-slate-900 dark:text-white/70 dark:group-hover:text-white"}
                  `}
                >
                  <Icon size={17} strokeWidth={active ? 2.3 : 2.1} />
                </span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-2.5 dark:border-white/10">
          <FeedbackButton mobile />
          <LastAudioButton mobile />
        </div>
      </aside>
    </>
  );
}

function FeedbackButton({ mobile = false }: { mobile?: boolean }) {
  const unavailableTitle = "Configure NEXT_PUBLIC_FEEDBACK_URL para ativar";

  if (mobile) {
    return (
      <a
        href={FEEDBACK_URL || undefined}
        target={FEEDBACK_URL ? "_blank" : undefined}
        rel={FEEDBACK_URL ? "noreferrer" : undefined}
        aria-disabled={!FEEDBACK_URL}
        title={FEEDBACK_URL ? "Enviar feedback" : unavailableTitle}
        className={`mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
          FEEDBACK_URL
            ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
            : "cursor-not-allowed bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-white/30"
        }`}
      >
        <MessageSquare size={15} />
        Enviar feedback
      </a>
    );
  }

  return (
    <a
      href={FEEDBACK_URL || undefined}
      target={FEEDBACK_URL ? "_blank" : undefined}
      rel={FEEDBACK_URL ? "noreferrer" : undefined}
      aria-label="Enviar feedback"
      aria-disabled={!FEEDBACK_URL}
      title={FEEDBACK_URL ? "Enviar feedback" : unavailableTitle}
      className={`group flex w-full flex-col items-center justify-center py-[5px] outline-none ${
        FEEDBACK_URL
          ? "text-slate-700 hover:text-indigo-600 dark:text-white/75 dark:hover:text-indigo-300"
          : "cursor-not-allowed text-slate-600 dark:text-white/30"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 group-hover:bg-indigo-500/10">
        <MessageSquare size={18} />
      </span>
      <span className="mt-[3px] w-full text-center text-[9px] font-semibold leading-none tracking-wide">
        Feedback
      </span>
    </a>
  );
}

/* ================================================================
   LAST AUDIO BUTTON — totalmente funcional
================================================================ */
function LastAudioButton({ mobile = false }: { mobile?: boolean }) {
  const audio = useAudioPlayer();
  const [hasLast, setHasLast] = useState(false);
  const [lastTrack, setLastTrack] = useState<{
    id: string;
    title: string;
    url: string;
    discipline?: string;
    chapter?: string;
    topic?: string;
    coverUrl?: string;
  } | null>(null);
  const [lastPosition, setLastPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadLastTrack = useCallback(() => {
    try {
      const persisted = safeGet("b-isaf:audio:player:v2");
      if (!isValidPersisted(persisted) || !persisted.track) {
        setHasLast(false);
        setLastTrack(null);
        setLastPosition(0);
        return;
      }

      const track = persisted.track;
      setHasLast(true);
      setLastTrack(track);
      setLastPosition(persisted.time);
    } catch {
      setHasLast(false);
      setLastTrack(null);
      setLastPosition(0);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLastTrack();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "b-isaf:audio:player:v2") loadLastTrack();
    };
    window.addEventListener("storage", onStorage);

    const interval = setInterval(loadLastTrack, 5000);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, [loadLastTrack]);

  useEffect(() => {
    if (!audio.track) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasLast(true);
    setLastTrack(audio.track);
  }, [audio.track]);

  const playLast = async () => {
    if (!lastTrack || !hasLast) return;
    setIsLoading(true);
    try {
      await audio.play({
        ...lastTrack,
      }, { startAt: lastPosition });
    } catch (err) {
      console.error("Erro ao reproduzir último áudio:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /* Mobile */
  if (mobile) {
    return (
      <button
        onClick={() => void playLast()}
        disabled={!hasLast || isLoading}
        title={hasLast ? `Reproduzir: ${lastTrack?.title ?? "Último áudio"}` : "Nenhum áudio recente"}
        className={`
          flex w-full items-center justify-center gap-1.5
          rounded-lg px-3 py-2 text-xs font-medium
          transition-all duration-150
          ${hasLast
            ? "bg-violet-600 text-white hover:bg-violet-700 active:scale-95"
            : "cursor-not-allowed bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-white/30"}
        `}
      >
        {isLoading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Headphones size={15} />
        )}
        {isLoading ? "A carregar..." : "Último áudio"}
      </button>
    );
  }

  /* Desktop */
  return (
    <button
      onClick={() => void playLast()}
      disabled={!hasLast || isLoading}
      title={hasLast ? `Reproduzir: ${lastTrack?.title ?? "Último áudio"}` : "Nenhum áudio recente"}
      aria-label={hasLast ? "Reproduzir último áudio" : "Nenhum áudio recente"}
      className="group flex w-full flex-col items-center justify-center py-[5px] outline-none"
    >
      <span
        className={`
          flex h-8 w-8 items-center justify-center rounded-lg
          transition-all duration-150
          ${hasLast
            ? "bg-violet-500/15 text-violet-600 group-hover:bg-violet-500/25 group-hover:text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 dark:group-hover:bg-violet-500/35 dark:group-hover:text-violet-200"
            : "bg-slate-300/50 text-slate-600 dark:bg-white/5 dark:text-white/25"}
        `}
      >
        {isLoading ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <Headphones size={17} strokeWidth={2.1} />
        )}
      </span>
      <span
        className={`
          mt-[2.5px] text-[8.5px] font-medium leading-none tracking-wide
          transition-colors duration-150
          ${hasLast
            ? "text-slate-600 group-hover:text-slate-900 dark:text-white/50 dark:group-hover:text-white/85"
            : "text-slate-600 dark:text-white/20"}
        `}
      >
        Áudio
      </span>
    </button>
  );
}