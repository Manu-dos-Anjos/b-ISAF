// app/components/DisciplineClient.tsx
"use client";

import { useAudioPlayer } from "@/app/lib/context/AudioPlayerContext";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import {
  ChevronRight,
  Headphones,
  FileText,
  Trophy,
  PlayCircle,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  Send,
  GripVertical,
  Expand,
  Shrink,
  ChevronDown,
  ChevronUp,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Loader2,
  Play,
  Settings,
  Monitor,
  Smartphone,
  Layers,
  Bookmark,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import SlideViewer from "@/app/components/slides/SlideViewer";
import QuizHost from "@/app/components/quiz/QuizHost";
import { useLocalStorageState } from "@/app/lib/hooks/useLocalStorageState";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { saveItem, removeSavedItem } from "@/app/actions/saved";
import type { Discipline, Chapter, Topic, TopicContent } from "@/app/lib/mockData";

/* ================================================================
   TIPOS
================================================================ */

type DisciplineWithVideo = Discipline & { introVideoUrl?: string };
type Props = { discipline: DisciplineWithVideo };
type MobileView = "chapters" | "topics";
type TutorMessage = { role: "user" | "assistant"; text: string };
type TutorContext = { discipline: string; chapter: string; topic: string };
type TutorDragState = { offsetX: number; offsetY: number };

type ContentPanelContext = {
  discipline: string;
  chapter: string;
  topic: string;
  content: TopicContent;
};

type FloatingContentPanel = {
  id: string;
  context: ContentPanelContext;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  zoom?: number;
};

type FloatingContentDragState = {
  panelId: string;
  offsetX: number;
  offsetY: number;
};

type ActiveQuiz = {
  contentId: string;
  title: string;
  disciplineName: string;
  chapterTitle: string;
  timeLimitSecs: number | null;
};

/* ================================================================
   HELPERS VISUAIS
================================================================ */

function getContentIcon(type: TopicContent["type"]) {
  switch (type) {
    case "audio": return Headphones;
    case "slide": return FileText;
    case "quiz":  return Trophy;
    default:      return PlayCircle;
  }
}

function getContentButtonClass(type: TopicContent["type"]) {
  switch (type) {
    case "audio":
      return "border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20 dark:hover:border-blue-500/50 dark:hover:text-blue-200";
    case "slide":
      return "border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20 dark:hover:border-indigo-500/50 dark:hover:text-indigo-200";
    default:
      return "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:border-white/20";
  }
}

function getContentPanelTheme(type: TopicContent["type"]) {
  switch (type) {
    case "audio":
      return {
        borderClass: "border-blue-200 dark:border-blue-500/20",
        iconClass: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
      };
    case "slide":
      return {
        borderClass: "border-indigo-200 dark:border-indigo-500/20",
        iconClass: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
      };
    default:
      return {
        borderClass: "border-slate-200 dark:border-white/10",
        iconClass: "bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-400",
      };
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getChapterContentCount(chapter: Chapter) {
  return (
    (chapter.topics ?? []).reduce(
      (sum, topic) => sum + (topic.contents?.length ?? 0),
      0
    ) + (chapter.quiz ? 1 : 0)
  );
}

function getChapterQuizzes(chapter: Chapter) {
  // novo modelo: quiz directamente no capítulo
  if (chapter.quiz) return [chapter.quiz];

  // fallback para mock/legado: quizzes ainda dentro dos tópicos
  const seen = new Set<string>();
  return (chapter.topics ?? [])
    .flatMap((t) => t.contents ?? [])
    .filter((c) => {
      if (c.type !== "quiz" || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
}
/* ================================================================
   CONSTANTES
================================================================ */

const VIDEO_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_PANEL_W = 544;
const DEFAULT_PANEL_H = 420;
const MOBILE_PANEL_W = 0.94;
const MOBILE_PANEL_H = 0.82;
const CONTROLS_HIDE_DELAY = 3000;
const CONTENT_ORDER: Record<string, number> = { audio: 0, slide: 1, quiz: 2 };
const PANEL_HEADER_H = "h-[72px]";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

const ACTION_BTN =
  "inline-flex h-9 flex-1 min-w-0 shrink-0 items-center justify-center gap-2 rounded-xl shadow-sm transition-all duration-200 sm:h-auto sm:w-auto sm:flex-none sm:rounded-2xl sm:px-4 sm:py-2.5";

const ACTION_LABEL =
  "hidden text-[11px] font-semibold uppercase tracking-wide sm:inline";

const SCROLLBAR_CLASS = [
  "scrollbar-thin",
  "scrollbar-track-transparent",
  "scrollbar-thumb-slate-300/60",
  "hover:scrollbar-thumb-slate-400/80",
  "[&::-webkit-scrollbar]:w-1.5",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-slate-300/60",
  "hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/80",
  "dark:scrollbar-thumb-slate-700/40",
  "dark:hover:scrollbar-thumb-slate-600/60",
  "dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/40",
  "dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/60",
].join(" ");

/* ================================================================
   BODY SCROLL LOCK
================================================================ */
function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const html = document.documentElement;
    const body = document.body;

    const prev = {
      htmlOverflowY: html.style.overflowY,
      htmlScrollbarGutter: (html.style as any).scrollbarGutter,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    };

    html.style.overflowY = "scroll";
    (html.style as any).scrollbarGutter = "stable";

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflowY = prev.htmlOverflowY;
      (html.style as any).scrollbarGutter = prev.htmlScrollbarGutter;
      body.style.overflow = prev.bodyOverflow;
      body.style.overscrollBehavior = prev.bodyOverscroll;
    };
  }, [active]);
}

/* ================================================================
   ZOOM CONTROLS
================================================================ */
function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white px-0.5 dark:border-white/10 dark:bg-white/5">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= ZOOM_MIN}
        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        title="Reduzir zoom"
      >
        <ZoomOut size={13} />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="min-w-[36px] px-1 text-center text-[10px] font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        title="Repor zoom (100%)"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= ZOOM_MAX}
        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        title="Ampliar zoom"
      >
        <ZoomIn size={13} />
      </button>
    </div>
  );
}

/* ================================================================
   MOBILE SLIDE SHEET
================================================================ */
function MobileSlideSheet({
  panel,
  index,
  theme,
  isFullscreen,
  onToggleFullscreen,
  onClose,
  panelRef,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  isSaved,
  isSaving,
  onToggleSave,
}: {
  panel: FloatingContentPanel;
  index: number;
  theme: { borderClass: string; iconClass: string };
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
  panelRef: (el: HTMLDivElement | null) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  isSaved: boolean;
  isSaving: boolean;
  onToggleSave: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragZoneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = dragZoneRef.current;
    if (!el) return;
    const stopTouch = (e: TouchEvent) => { e.stopPropagation(); };
    const stopWheel = (e: WheelEvent) => { e.stopPropagation(); };
    el.addEventListener("touchstart", stopTouch, { passive: false });
    el.addEventListener("touchmove", stopTouch, { passive: false });
    el.addEventListener("touchend", stopTouch, { passive: false });
    el.addEventListener("wheel", stopWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", stopTouch);
      el.removeEventListener("touchmove", stopTouch);
      el.removeEventListener("touchend", stopTouch);
      el.removeEventListener("wheel", stopWheel);
    };
  }, []);

  return (
    <div
      ref={(el) => { sheetRef.current = el; panelRef(el); }}
      data-panel-id={panel.id}
      style={isFullscreen ? { zIndex: 60 + index } : { height: "88dvh", zIndex: 60 + index }}
      className={
        isFullscreen
          ? "fixed inset-0 flex flex-col overflow-hidden bg-white dark:bg-slate-950/95"
          : "fixed bottom-0 left-0 right-0 flex flex-col overflow-hidden rounded-t-3xl border-t border-x border-slate-200 bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.15)] dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
      }
    >
      <div ref={dragZoneRef}>
        <div className="flex shrink-0 justify-center py-2.5">
          <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>

        <div
          className={`shrink-0 flex items-center justify-between gap-2 border-b bg-slate-50 px-4 py-2.5 dark:bg-black/30 ${theme.borderClass}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 ${theme.iconClass}`}
            >
              <FileText size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                {panel.context.content.title}
              </h3>
              <p className="truncate text-[10px] text-slate-500 mt-0.5">
                {panel.context.chapter}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ZoomControls zoom={zoom} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onReset={onZoomReset} />
            <button
              type="button"
              onClick={onToggleSave}
              disabled={isSaving}
              title={isSaved ? "Remover dos guardados" : "Guardar para mais tarde"}
              className={`rounded-xl p-2 transition disabled:opacity-50 ${
                isSaved
                  ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/15"
                  : "text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-amber-400"
              }`}
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
              )}
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              title={isFullscreen ? "Sair do ecrã inteiro" : "Ecrã inteiro"}
            >
              {isFullscreen ? <Shrink size={14} /> : <Expand size={14} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
              title="Fechar"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-slate-100 dark:bg-black/80">
        <SlideViewer url={panel.context.content.url ?? ""} title={panel.context.content.title} zoom={zoom} />
      </div>
    </div>
  );
}

/* ================================================================
   COMPONENTE PRINCIPAL
================================================================ */

export default function DisciplineClient({ discipline }: Props) {
  const chapters = discipline.chapters ?? [];
  const hasCover = !!discipline.coverUrl;
  const { supabase } = useSupabase();

  const heroTitleClass = hasCover ? "text-white" : "text-slate-900 dark:text-white";
  const heroLabelClass = hasCover ? "text-indigo-400" : "text-indigo-600 dark:text-indigo-400";
  const heroPillClass = hasCover
    ? "border-white/10 bg-white/5 text-slate-300"
    : "border-slate-300 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300";

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const isTouchDevice =
        typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
      const isNarrow = window.innerWidth < 768;
      setIsMobile(isNarrow || isTouchDevice);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  const [activeChapterId, setActiveChapterId] = useLocalStorageState<string>(
    `dc-activeChapter-${discipline.id}`, chapters[0]?.id ?? ""
  );
  const [mobileView, setMobileView] = useLocalStorageState<MobileView>(
    `dc-mobileView-${discipline.id}`, "chapters"
  );
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);

  const chaptersPanelRef = useRef<HTMLElement | null>(null);
  const topicsPanelRef = useRef<HTMLElement | null>(null);
  const scrollKey = `dc-scrollY-${discipline.id}`;

  useEffect(() => {
    const saved = sessionStorage.getItem(scrollKey);
    if (!saved) return;
    const y = parseInt(saved, 10);
    if (isNaN(y)) return;
    const id = requestAnimationFrame(() => { requestAnimationFrame(() => { window.scrollTo({ top: y }); }); });
    return () => cancelAnimationFrame(id);
  }, [scrollKey]);

  useEffect(() => {
    let ticking = false;
    const save = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sessionStorage.setItem(scrollKey, String(Math.round(window.scrollY)));
        ticking = false;
      });
    };
    const saveOnUnload = () => {
      sessionStorage.setItem(scrollKey, String(Math.round(window.scrollY)));
    };
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("beforeunload", saveOnUnload);
    return () => {
      window.removeEventListener("scroll", save);
      window.removeEventListener("beforeunload", saveOnUnload);
      saveOnUnload();
    };
  }, [scrollKey]);

  useEffect(() => {
    const panels = [chaptersPanelRef.current, topicsPanelRef.current].filter(Boolean) as HTMLElement[];
    const cleanups = panels.map((el) => {
      let lastScrollTop = el.scrollTop;
      const handler = () => {
        const delta = el.scrollTop - lastScrollTop;
        lastScrollTop = el.scrollTop;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
        const atTop = el.scrollTop <= 0;
        if (atBottom && delta > 0) window.scrollBy({ top: 120, behavior: "smooth" });
        if (atTop && delta < 0) window.scrollBy({ top: -120, behavior: "smooth" });
      };
      el.addEventListener("scroll", handler, { passive: true });
      return () => el.removeEventListener("scroll", handler);
    });
    return () => cleanups.forEach((fn) => fn());
  }, []);

  /* ── Vídeo ── */
  const videoModalRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsHideTimerRef = useRef<number | null>(null);

  const [isVideoLandscape, setIsVideoLandscape] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [lastVideoVolume, setLastVideoVolume] = useState(1);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [videoBuffered, setVideoBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);

  /* ── Tutor IA ── */
  const [isTutorOpen, setIsTutorOpen] = useLocalStorageState<boolean>(`dc-tutorOpen-${discipline.id}`, false);
  const [isTutorMinimized, setIsTutorMinimized] = useLocalStorageState<boolean>(`dc-tutorMinimized-${discipline.id}`, false);
  const [isTutorFullscreen, setIsTutorFullscreen] = useLocalStorageState<boolean>(`dc-tutorFullscreen-${discipline.id}`, false);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorMessages, setTutorMessages] = useLocalStorageState<TutorMessage[]>(`dc-tutorMessages-${discipline.id}`, [
    { role: "assistant", text: "Olá! Sou o Tutor IA. Pergunta-me sobre este tema e eu ajudo-te com base no conteúdo da disciplina." },
  ]);
  const [tutorContext, setTutorContext] = useLocalStorageState<TutorContext | null>(`dc-tutorContext-${discipline.id}`, null);
  const [tutorPosition, setTutorPosition] = useLocalStorageState(`dc-tutorPosition-${discipline.id}`, { x: 0, y: 0 });
  const [tutorSize, setTutorSize] = useLocalStorageState(`dc-tutorSize-${discipline.id}`, { width: 420, height: 580 });
  const [hasTutorPosition, setHasTutorPosition] = useLocalStorageState<boolean>(`dc-hasTutorPos-${discipline.id}`, false);
  const [isDraggingTutor, setIsDraggingTutor] = useState(false);
  const [isResizingTutor, setIsResizingTutor] = useState(false);
  const [tutorSheetHeight, setTutorSheetHeight] = useLocalStorageState<number>(`dc-tutorSheetH-${discipline.id}`, 62);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  const sheetDragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const tutorPanelRef = useRef<HTMLDivElement | null>(null);
  const tutorDragRef = useRef<TutorDragState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const audioPlayer = useAudioPlayer();

  const [contentPanels, setContentPanels] = useState<FloatingContentPanel[]>([]);
  const [isDraggingContent, setIsDraggingContent] = useState(false);

  const [browserFullscreenPanelId, setBrowserFullscreenPanelId] = useState<string | null>(null);
  const [appFullscreenPanelId, setAppFullscreenPanelId] = useState<string | null>(null);

  const contentDragRef = useRef<FloatingContentDragState | null>(null);
  const contentPanelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [savedContentIds, setSavedContentIds] = useState<Set<string>>(new Set());
  const [savingContentId, setSavingContentId] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => {
      const el = (document.fullscreenElement || (document as any).webkitFullscreenElement) as HTMLElement | null;
      setBrowserFullscreenPanelId(el?.dataset?.panelId ?? null);
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;

  useEffect(() => {
    let cancelled = false;
    const loadSaved = async () => {
      const { data: { user } } = await supabaseRef.current.auth.getUser();
      if (!user || cancelled) return;
      const { data, error } = await (supabaseRef.current as any)
        .from("saved_items")
        .select("content_id")
        .eq("student_id", user.id);
      if (!error && data && !cancelled) {
        setSavedContentIds(new Set((data as { content_id: string }[]).map((item) => item.content_id)));
      }
    };
    void loadSaved();
    return () => { cancelled = true; };
  }, []);

  const toggleSaved = async (contentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSavingContentId(contentId);
    try {
      if (savedContentIds.has(contentId)) {
        const { data: saved } = await (supabase as any)
          .from("saved_items")
          .select("id")
          .eq("student_id", user.id)
          .eq("content_id", contentId)
          .maybeSingle();
        if (saved?.id) await removeSavedItem(saved.id);
        setSavedContentIds((prev) => { const next = new Set(prev); next.delete(contentId); return next; });
      } else {
        await saveItem(user.id, contentId);
        setSavedContentIds((prev) => new Set(prev).add(contentId));
      }
    } finally {
      setSavingContentId(null);
    }
  };

  const toggleBrowserFullscreen = (panelId: string) => {
    const el = contentPanelRefs.current[panelId];
    if (!el) return;

    const currentFsEl = (document.fullscreenElement || (document as any).webkitFullscreenElement) as HTMLElement | null;

    if (currentFsEl === el) {
      const exit = (document.exitFullscreen || (document as any).webkitExitFullscreen)?.bind(document);
      exit?.()?.catch?.(() => {});
      return;
    }

    const request = (el.requestFullscreen || (el as any).webkitRequestFullscreen)?.bind(el);

    if (!request) {
      setAppFullscreenPanelId((prev) => (prev === panelId ? null : panelId));
      return;
    }

    if (currentFsEl) {
      const exit = (document.exitFullscreen || (document as any).webkitExitFullscreen)?.bind(document);
      exit?.();
    }

    try {
      const result = request();
      if (result && typeof (result as Promise<void>).catch === "function") {
        (result as Promise<void>).catch((err: unknown) => {
          console.error("Fullscreen error:", err);
          setAppFullscreenPanelId((prev) => (prev === panelId ? null : panelId));
        });
      }
    } catch (err) {
      console.error("Fullscreen error (sync):", err);
      setAppFullscreenPanelId((prev) => (prev === panelId ? null : panelId));
    }
  };

  /* ── Vídeo helpers ── */
  const closeVideo = () => {
    videoRef.current?.pause();
    setIsVideoLandscape(false);
    setIsVideoOpen(false);
    setShowSpeedMenu(false);
    setShowControls(true);
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
  };
  const toggleVideoPlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    try { v.paused ? await v.play() : v.pause(); } catch {}
  };
  const seekVideo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    const c = clamp(t, 0, videoDuration || 0);
    v.currentTime = c;
    setVideoCurrentTime(c);
  };
  const skipVideo = (delta: number) => seekVideo(videoCurrentTime + delta);
  const toggleVideoMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (videoMuted || v.volume === 0) {
      const restore = lastVideoVolume || 0.7;
      v.muted = false;
      v.volume = restore;
      setVideoMuted(false);
      setVideoVolume(restore);
    } else {
      setLastVideoVolume(v.volume || 1);
      v.volume = 0;
      v.muted = true;
      setVideoMuted(true);
      setVideoVolume(0);
    }
  };
  const handleVolumeChange = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    const vol = clamp(val, 0, 1);
    v.volume = vol;
    v.muted = vol === 0;
    setVideoVolume(vol);
    setVideoMuted(vol === 0);
    if (vol > 0) setLastVideoVolume(vol);
  };
  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekVideo(clamp((e.clientX - rect.left) / rect.width, 0, 1) * (videoDuration || 0));
  };
  const setVideoSpeedFn = (speed: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    setVideoSpeed(speed);
    setShowSpeedMenu(false);
  };
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsHideTimerRef.current) window.clearTimeout(controlsHideTimerRef.current);
    if (videoPlaying) controlsHideTimerRef.current = window.setTimeout(() => setShowControls(false), CONTROLS_HIDE_DELAY);
  };
  const toggleControls = () => {
    setShowControls((p) => !p);
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (videoPlaying) resetControlsTimer();
    else {
      setShowControls(true);
      if (controlsHideTimerRef.current) {
        window.clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
    }
  }, [videoPlaying]); // eslint-disable-line

  useEffect(() => () => {
    if (controlsHideTimerRef.current) window.clearTimeout(controlsHideTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isVideoOpen) return;
    setVideoReady(false); setVideoPlaying(false); setVideoCurrentTime(0);
    setVideoDuration(0); setVideoMuted(false); setVideoVolume(1);
    setVideoSpeed(1); setShowSpeedMenu(false); setShowControls(true);
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => { setVideoDuration(Number.isFinite(v.duration) ? v.duration : 0); setVideoReady(true); v.playbackRate = 1; };
    const onTime = () => { setVideoCurrentTime(v.currentTime || 0); if (v.buffered.length > 0) setVideoBuffered((v.buffered.end(v.buffered.length - 1) / (v.duration || 1)) * 100); };
    const onPlay = () => setVideoPlaying(true);
    const onPause = () => setVideoPlaying(false);
    const onVol = () => { setVideoVolume(v.volume); setVideoMuted(v.muted || v.volume === 0); if (v.volume > 0) setLastVideoVolume(v.volume); };
    const onEnded = () => { setVideoPlaying(false); setVideoCurrentTime(v.duration || 0); };
    const onReady = () => setVideoReady(true);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    v.addEventListener("ended", onEnded);
    v.addEventListener("canplay", onReady);
    v.addEventListener("error", onReady);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("canplay", onReady);
      v.removeEventListener("error", onReady);
    };
  }, [isVideoOpen]);

  useEffect(() => {
    if (isTutorOpen && !isTutorMinimized) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isTutorOpen, isTutorMinimized, tutorMessages]);

  useEffect(() => {
    if (!isTutorOpen || hasTutorPosition || isMobile) return;
    const t = window.setTimeout(() => {
      setTutorPosition({ x: Math.max(16, window.innerWidth - tutorSize.width - 16), y: Math.max(16, window.innerHeight - (isTutorMinimized ? 60 : tutorSize.height) - 16) });
      setHasTutorPosition(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, [isTutorOpen, hasTutorPosition, isMobile, tutorSize, isTutorMinimized]); // eslint-disable-line

  useEffect(() => {
    if (isMobile || !isTutorOpen || isTutorFullscreen || isTutorMinimized) return;
    const obs = new ResizeObserver((entries) => {
      if (isResizingTutor) return;
      for (const e of entries) {
        const { width: w, height: h } = e.contentRect;
        if (w > 0 && h > 0 && (Math.abs(Math.round(w) - tutorSize.width) > 5 || Math.abs(Math.round(h) - tutorSize.height) > 5)) {
          setTutorSize({ width: Math.round(w), height: Math.round(h) });
        }
      }
    });
    if (tutorPanelRef.current) obs.observe(tutorPanelRef.current);
    return () => obs.disconnect();
  }, [isMobile, isTutorOpen, isTutorFullscreen, isTutorMinimized, isResizingTutor, tutorSize]); // eslint-disable-line

  /* ── Drag: tutor ── */
  useEffect(() => {
    if (!isDraggingTutor) return;
    const onMove = (e: PointerEvent) => {
      if (!tutorDragRef.current || !tutorPanelRef.current) return;
      const rect = tutorPanelRef.current.getBoundingClientRect();
      setTutorPosition({
        x: clamp(e.clientX - tutorDragRef.current.offsetX, 16, Math.max(16, window.innerWidth - rect.width - 16)),
        y: clamp(e.clientY - tutorDragRef.current.offsetY, 16, Math.max(16, window.innerHeight - rect.height - 16)),
      });
    };
    const onUp = () => { setIsDraggingTutor(false); tutorDragRef.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDraggingTutor]);

  /* ── Drag: bottom sheet ── */
  useEffect(() => {
    if (!isDraggingSheet) return;
    const onMove = (e: PointerEvent) => {
      if (!sheetDragRef.current) return;
      const dy = sheetDragRef.current.startY - e.clientY;
      setTutorSheetHeight(clamp(sheetDragRef.current.startHeight + dy / (window.innerHeight / 100), 28, 92));
    };
    const onUp = () => { setIsDraggingSheet(false); sheetDragRef.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDraggingSheet]);

  /* ── Drag: painéis de conteúdo ── */
  useEffect(() => {
    if (!isDraggingContent) return;
    const onMove = (e: PointerEvent) => {
      if (!contentDragRef.current) return;
      const { panelId, offsetX, offsetY } = contentDragRef.current;
      const el = contentPanelRefs.current[panelId];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setContentPanels((prev) =>
        prev.map((p) =>
          p.id === panelId
            ? { ...p, position: { x: clamp(e.clientX - offsetX, 8, Math.max(8, window.innerWidth - rect.width - 8)), y: clamp(e.clientY - offsetY, 8, Math.max(8, window.innerHeight - rect.height - 8)) } }
            : p
        )
      );
    };
    const onUp = () => { setIsDraggingContent(false); contentDragRef.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDraggingContent]);

  const isMobileSlideSheetOpen = isMobile && contentPanels.length > 0;
  const isMobileTutorSheetOpen = isMobile && isTutorOpen;

  const activeChapter = chapters.find((ch) => ch.id === activeChapterId) ?? chapters[0] ?? null;

 const stats = useMemo(
  () => ({
    totalChapters: chapters.length,
    totalTopics: chapters.reduce((a, ch) => a + (ch.topics?.length ?? 0), 0),
    totalContents: chapters.reduce((a, ch) => a + getChapterContentCount(ch), 0),
  }),
  [chapters]
);

  const shouldRotateVideo = isMobile && isVideoLandscape;

  const openTutor = (topicTitle: string) => {
    setTutorContext({ discipline: discipline.title, chapter: activeChapter?.title ?? "", topic: topicTitle });
    setTutorMessages([{ role: "assistant", text: `Olá! Vamos falar sobre "${topicTitle}". Escreve a tua dúvida.` }]);
    setTutorInput("");
    setIsTutorOpen(true);
    setIsTutorMinimized(false);
    setHasTutorPosition(false);
  };

  const handleSendMessage = () => {
    const text = tutorInput.trim();
    if (!text) return;
    setTutorMessages((prev) => [...prev, { role: "user", text }]);
    setTutorInput("");
    setTimeout(() => {
      setTutorMessages((prev) => [...prev, { role: "assistant", text: `Recebi a tua pergunta sobre "${tutorContext?.topic ?? "este tema"}". Em breve isto vai ser ligado à IA real.` }]);
    }, 700);
  };

  const focusContentPanel = (id: string) => {
    setContentPanels((prev) => {
      const found = prev.find((p) => p.id === id);
      if (!found) return prev;
      return [...prev.filter((p) => p.id !== id), found];
    });
  };

  const applyTutorPreset = (width: number, height: number) => {
    setIsResizingTutor(true);
    setTutorSize({ width, height });
    setTutorPosition((prev) => ({
      x: clamp(prev.x, 16, Math.max(16, window.innerWidth - width - 16)),
      y: clamp(prev.y, 16, Math.max(16, window.innerHeight - height - 16)),
    }));
    setTimeout(() => setIsResizingTutor(false), 100);
  };

  const adjustPanelZoom = (panelId: string, delta: number) => {
    setContentPanels((prev) =>
      prev.map((p) =>
        p.id === panelId
          ? { ...p, zoom: clamp(Math.round(((p.zoom ?? 1) + delta) * 100) / 100, ZOOM_MIN, ZOOM_MAX) }
          : p
      )
    );
  };

  const resetPanelZoom = (panelId: string) => {
    setContentPanels((prev) => prev.map((p) => (p.id === panelId ? { ...p, zoom: 1 } : p)));
  };

  const closeContentPanel = (panelId: string) => {
    const currentFsEl = (document.fullscreenElement || (document as any).webkitFullscreenElement) as HTMLElement | null;

    const cleanup = () => {
      setAppFullscreenPanelId((prev) => (prev === panelId ? null : prev));
      setContentPanels((p) => p.filter((x) => x.id !== panelId));
      delete contentPanelRefs.current[panelId];
    };

    if (currentFsEl && contentPanelRefs.current[panelId] === currentFsEl) {
      const exit = (document.exitFullscreen || (document as any).webkitExitFullscreen)?.bind(document);
      const result = exit?.();
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).finally(cleanup);
        return;
      }
    }
    cleanup();
  };

  const openQuiz = (content: TopicContent, chapterTitle: string) => {
  setActiveQuiz({
    contentId: content.id,
    title: content.title,
    disciplineName: discipline.title,
    chapterTitle,
    timeLimitSecs: content.timeLimitSeconds ?? null,
  });
};

  const openContent = (content: TopicContent, topicTitle: string) => {
    if (content.type === "audio") {
      if (!content.url) { alert("Este áudio ainda não tem URL configurada."); return; }
      void audioPlayer.play({
        id: content.id,
        title: content.title,
        url: content.url,
        discipline: discipline.title,
        chapter: activeChapter?.title ?? "",
        topic: topicTitle,
        coverUrl: discipline.coverUrl,
      });
      return;
    }

    if (content.type === "quiz") {
      openQuiz(content, activeChapter?.title ?? "");
      return;
    }

    const panelId = [discipline.id, activeChapter?.id ?? "ch", topicTitle, content.id].join("-");
    setContentPanels((prev) => {
      const exists = prev.find((p) => p.id === panelId);
      if (exists) return [...prev.filter((p) => p.id !== panelId), exists];
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = vw < 768 ? Math.min(vw * MOBILE_PANEL_W, vw - 16) : DEFAULT_PANEL_W;
      const h = vw < 768 ? Math.min(vh * MOBILE_PANEL_H, vh - 24) : DEFAULT_PANEL_H;
      const off = prev.length * 24;
      return [...prev, {
        id: panelId,
        context: { discipline: discipline.title, chapter: activeChapter?.title ?? "", topic: topicTitle, content },
        position: { x: clamp(16 + off, 8, Math.max(8, vw - w - 8)), y: clamp(16 + off, 8, Math.max(8, vh - h - 8)) },
        size: { width: w, height: h },
        zoom: 1,
      }];
    });
  };

  /* ================================================================
     SUB-RENDERS
  ================================================================ */

  const renderSaveIconBtn = (contentId: string) => {
    const isSaved = savedContentIds.has(contentId);
    const isSaving = savingContentId === contentId;
    return (
      <button
        type="button"
        onClick={() => void toggleSaved(contentId)}
        disabled={isSaving}
        title={isSaved ? "Remover dos guardados" : "Guardar para mais tarde"}
        className={`rounded-xl p-2 transition disabled:opacity-50 ${
          isSaved
            ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/15"
            : "text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-amber-400"
        }`}
      >
        {isSaving ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
        )}
      </button>
    );
  };

  // Quiz removido dos tópicos — acedido exclusivamente pelo botão no cabeçalho do capítulo
  const renderContentBtn = (content: TopicContent, topicTitle: string) => {
    if (content.type !== "audio" && content.type !== "slide") return null;

    const Icon = getContentIcon(content.type);
    const cls = getContentButtonClass(content.type);
    const label = content.type === "audio" ? "Áudio" : "Slide";

    return (
      <button
        key={content.id}
        type="button"
        onClick={() => openContent(content, topicTitle)}
        title={`${label}: ${content.title}`}
        className={`${ACTION_BTN} ${cls}`}
      >
        <Icon size={16} />
        <span className={ACTION_LABEL}>{label}</span>
      </button>
    );
  };

  const renderTopicActions = (topic: Topic) => {
    const contents = [...(topic.contents ?? [])]
      .filter((c) => c.type === "audio" || c.type === "slide")
      .sort((a, b) => (CONTENT_ORDER[a.type] ?? 99) - (CONTENT_ORDER[b.type] ?? 99));

    return (
      <div className="grid w-full grid-flow-col auto-cols-fr items-stretch gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:ml-auto sm:justify-end">
        {contents.map((c) => renderContentBtn(c, topic.title))}
        <button
          type="button"
          onClick={() => openTutor(topic.title)}
          title="Tutor IA"
          className={`${ACTION_BTN} border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-400 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25 dark:hover:border-violet-400/60 dark:hover:text-white`}
        >
          <Sparkles size={16} />
          <span className={ACTION_LABEL}>Tutor IA</span>
        </button>
      </div>
    );
  };

  // Botão de quiz do capítulo — discreto, usado no cabeçalho da coluna de temas
const renderChapterQuizButton = (chapter: Chapter, size: "sm" | "xs" = "sm") => {
  const quizzes = getChapterQuizzes(chapter);
  if (quizzes.length === 0) return null;
  const mainQuiz = quizzes[0];

  if (size === "xs") {
    return (
      <button
        type="button"
        onClick={() => openQuiz(mainQuiz, chapter.title)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
      >
        <Trophy size={12} />
        Quiz
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openQuiz(mainQuiz, chapter.title)}
      className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 dark:hover:border-emerald-500/30"
    >
      <Trophy size={13} />
      Questionário
    </button>
  );
};

  const renderChapterCard = (chapter: Chapter, isActive: boolean) => {
    const topicsCount = chapter.topics?.length ?? 0;
    const progress = chapter.status === "Concluído" ? 100 : 35;

    return (
      <div key={chapter.id}>
        <button
          onClick={() => { setActiveChapterId(chapter.id); setMobileView("topics"); }}
          className={`w-full rounded-2xl border p-3.5 text-left transition-all duration-200 ${
            isActive
              ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-300 shadow-lg shadow-indigo-100/50 dark:border-indigo-500/40 dark:bg-indigo-950/40 dark:ring-indigo-500/20 dark:shadow-lg dark:shadow-indigo-900/20"
              : "border-slate-300 bg-white hover:bg-slate-100 hover:border-slate-400 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] dark:hover:border-white/20"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-sm font-semibold leading-snug ${isActive ? "text-indigo-900 dark:text-white" : "text-slate-900 dark:text-slate-200"}`}>
                {chapter.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">{chapter.status} · {topicsCount} temas</p>
            </div>
            <ChevronRight size={16} className={`mt-0.5 shrink-0 transition-transform ${isActive ? "rotate-90 text-indigo-500 dark:text-indigo-400" : "text-slate-400 dark:text-slate-600"}`} />
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </button>
      </div>
    );
  };

  const renderTutorBody = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={`flex-1 space-y-4 overflow-y-auto px-4 py-5 ${SCROLLBAR_CLASS}`}>
        {tutorMessages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "rounded-br-none bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg"
                : "rounded-bl-none border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/5 dark:bg-white/5 dark:text-slate-200"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="shrink-0 border-t border-slate-200 p-4 dark:border-white/10">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-300 dark:border-white/10 dark:bg-white/5 dark:focus-within:border-violet-500/50 dark:focus-within:ring-violet-500/30">
          <input
            value={tutorInput}
            onChange={(e) => setTutorInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
            placeholder="Escreve a tua pergunta…"
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md transition hover:bg-violet-500 active:scale-95"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderTutorHeader = (draggable: boolean) => (
    <div className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-black/20">
      <div
        className={`flex min-w-0 flex-1 select-none items-start gap-3 ${draggable && !isTutorFullscreen ? "cursor-move" : "cursor-default"}`}
        onPointerDown={draggable && !isTutorFullscreen ? (e) => {
          if (e.button !== 0 || !tutorPanelRef.current) return;
          const rect = tutorPanelRef.current.getBoundingClientRect();
          tutorDragRef.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
          setIsDraggingTutor(true);
        } : undefined}
      >
        <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tutor IA</h3>
            {draggable && !isTutorFullscreen && !isTutorMinimized && (
              <GripVertical size={13} className="hidden text-slate-400 dark:text-slate-600 sm:block" />
            )}
          </div>
          {!isTutorMinimized && (
            <p className="text-xs font-medium text-violet-600 dark:text-violet-400/70">Assistente da disciplina</p>
          )}
          {tutorContext && !isTutorFullscreen && !isTutorMinimized && (
            <div className="mt-3 space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-[11px] dark:border-white/5 dark:bg-white/[0.03]">
              <p className="truncate text-slate-600"><span className="text-slate-500">Capítulo:</span> {tutorContext.chapter}</p>
              <p className="truncate font-semibold text-slate-900 dark:text-slate-300"><span className="font-normal text-slate-500">Tema:</span> {tutorContext.topic}</p>
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1">
        {!isMobile && !isTutorMinimized && (
          <button
            type="button"
            onClick={() => { setIsTutorFullscreen((p) => !p); if (isTutorMinimized) setIsTutorMinimized(false); }}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {isTutorFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
        {!isMobile && (
          <button
            type="button"
            onClick={() => { setIsTutorMinimized((p) => !p); if (isTutorFullscreen) setIsTutorFullscreen(false); }}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {isTutorMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsTutorOpen(false)}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );

  /* ── Empty state ── */
  if (chapters.length === 0) {
    return (
      <div className="space-y-6">
        <section
          className={`relative overflow-hidden rounded-2xl border p-5 shadow-lg sm:p-6 ${
            hasCover
              ? "border-white/10 shadow-slate-300/40 dark:shadow-none"
              : "border-slate-300 shadow-slate-300/40 dark:border-white/10 dark:shadow-none"
          }`}
        >
          <div
            className={
              hasCover
                ? "absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-slate-950/80 to-slate-950"
                : "absolute inset-0 bg-gradient-to-br from-indigo-100 via-white to-slate-100 dark:from-indigo-950/60 dark:via-slate-950/80 dark:to-slate-950"
            }
          />
          {hasCover && (
            <div className="absolute inset-0 opacity-20 mix-blend-overlay">
              <Image src={discipline.coverUrl!} alt="" fill className="object-cover" />
            </div>
          )}
          <div className="relative z-10">
            <p className={`text-xs font-semibold uppercase tracking-widest ${heroLabelClass}`}>{discipline.year} · {discipline.semester}</p>
            <h1 className={`mt-2 text-3xl font-bold tracking-tight ${heroTitleClass}`}>{discipline.title}</h1>
          </div>
        </section>
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <Layers size={36} className="text-slate-400 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-300">Nenhum capítulo disponível</p>
          <p className="text-xs text-slate-600">Os planos de estudo serão carregados do Supabase em breve.</p>
        </div>
      </div>
    );
  }

  /* ================================================================
     RENDER PRINCIPAL
  ================================================================ */
  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <section
        className={`relative overflow-hidden rounded-2xl border p-5 shadow-lg sm:p-6 md:p-8 ${
          hasCover
            ? "border-white/10 shadow-slate-300/40 dark:shadow-none"
            : "border-slate-300 shadow-slate-300/40 dark:border-white/10 dark:shadow-none"
        }`}
      >
        <div
          className={
            hasCover
              ? "absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-slate-950/80 to-slate-950"
              : "absolute inset-0 bg-gradient-to-br from-indigo-100 via-white to-slate-100 dark:from-indigo-950/60 dark:via-slate-950/80 dark:to-slate-950"
          }
        />
        {hasCover && (
          <>
            <div className="absolute inset-0 opacity-20 mix-blend-overlay">
              <Image src={discipline.coverUrl!} alt="" fill className="object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
          </>
        )}
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3.5">
            <p className={`text-xs font-semibold uppercase tracking-widest ${heroLabelClass}`}>{discipline.year} · {discipline.semester}</p>
            <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl ${heroTitleClass}`}>{discipline.title}</h1>
            <div className="flex flex-wrap gap-2">
              {[`${stats.totalChapters} capítulos`, `${stats.totalTopics} temas`, `${stats.totalContents} conteúdos`].map((label) => (
                <span key={label} className={`rounded-lg border px-3 py-1 text-xs font-medium backdrop-blur-sm ${heroPillClass}`}>{label}</span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setIsVideoLandscape(false); setVideoReady(false); setVideoPlaying(false); setVideoCurrentTime(0); setIsVideoOpen(true); }}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-500 active:scale-95"
          >
            <PlayCircle size={18} /> Reproduzir vídeo
          </button>
        </div>
      </section>

      {/* ── Mobile ── */}
      <section className="lg:hidden">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none">
          <div className="border-b border-slate-200 p-3 dark:border-white/10">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
              {(["chapters", "topics"] as MobileView[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setMobileView(view)}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                    mobileView === view
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {view === "chapters" ? "Capítulos" : "Temas"}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3">
            {mobileView === "chapters" ? (
              <div className="space-y-2.5">
                {chapters.map((c) => renderChapterCard(c, c.id === activeChapter?.id))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Header mobile com nome do capítulo + botão quiz + nav */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
                      {activeChapter?.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {activeChapter?.status} · {activeChapter?.topics?.length ?? 0} temas
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {activeChapter && renderChapterQuizButton(activeChapter, "xs")}
                  </div>
                </div>

                {/* Tópicos */}
                <div className="space-y-2.5">
                  {activeChapter?.topics?.map((topic, index) => (
                    <article key={topic.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-white/5 dark:bg-white/[0.02]">
                      <div className="mb-3 flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
                          {index + 1}
                        </span>
                        <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                          {topic.title}
                        </h3>
                      </div>
                      {renderTopicActions(topic)}
                    </article>
                  ))}
                  {(!activeChapter?.topics || activeChapter.topics.length === 0) && (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-white/10">
                      Este capítulo ainda não tem temas.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Desktop ── */}
      <section className="hidden overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-lg shadow-slate-300/50 dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none lg:grid lg:h-[42rem] lg:grid-cols-[320px_1fr]">

        {/* Coluna esquerda: índice de capítulos */}
        <aside
          ref={chaptersPanelRef}
          className={`h-full overflow-y-auto border-r border-slate-300 bg-slate-100 dark:border-white/10 dark:bg-black/20 ${SCROLLBAR_CLASS}`}
        >
          <div className={`sticky top-0 z-10 ${PANEL_HEADER_H} flex items-center border-b border-slate-300 bg-white/95 px-5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/90`}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Índice</h2>
          </div>
          <div className="space-y-2 p-3">
            {chapters.map((c) => renderChapterCard(c, c.id === activeChapter?.id))}
          </div>
        </aside>

        {/* Coluna direita: temas do capítulo activo */}
        <main
          ref={topicsPanelRef}
          className={`h-full overflow-y-auto ${SCROLLBAR_CLASS}`}
        >
          {/* Cabeçalho sticky com nome do capítulo + progresso + botão de questionário */}
          <div className={`sticky top-0 z-10 ${PANEL_HEADER_H} flex items-center justify-between gap-4 border-b border-slate-300 bg-white/95 px-6 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/90`}>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                {activeChapter?.title}
              </h2>
              {activeChapter && (
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {activeChapter.status} · {activeChapter.topics?.length ?? 0} temas
                </p>
              )}
            </div>
            {activeChapter && renderChapterQuizButton(activeChapter, "sm")}
          </div>

          {/* Lista de tópicos */}
          <div className="space-y-2.5 p-5">
            {activeChapter?.topics?.map((topic, index) => (
              <article
                key={topic.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:shadow-md dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none dark:hover:border-white/10 dark:hover:bg-white/[0.04] md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-[11px] font-bold text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {index + 1}
                  </span>
                  <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-200">
                    {topic.title}
                  </h3>
                </div>
                {renderTopicActions(topic)}
              </article>
            ))}
          </div>
        </main>
      </section>

      {/* ── Painéis flutuantes (slides) ── */}
      {contentPanels.map((panel, index) => {
        const theme = getContentPanelTheme(panel.context.content.type);
        const isPanelFullscreen = browserFullscreenPanelId === panel.id || appFullscreenPanelId === panel.id;
        const pw = panel.size?.width ?? DEFAULT_PANEL_W;
        const ph = panel.size?.height ?? DEFAULT_PANEL_H;
        const zoom = panel.zoom ?? 1;

        if (isMobile) {
          return (
            <div key={panel.id}>
              {!isPanelFullscreen && (
                <div
                  className="fixed inset-0 z-[59] bg-black/60 backdrop-blur-sm"
                  onClick={() => closeContentPanel(panel.id)}
                />
              )}
              <MobileSlideSheet
                panel={panel}
                index={index}
                theme={theme}
                isFullscreen={isPanelFullscreen}
                onToggleFullscreen={() => toggleBrowserFullscreen(panel.id)}
                onClose={() => closeContentPanel(panel.id)}
                panelRef={(el) => { contentPanelRefs.current[panel.id] = el; }}
                zoom={zoom}
                onZoomIn={() => adjustPanelZoom(panel.id, ZOOM_STEP)}
                onZoomOut={() => adjustPanelZoom(panel.id, -ZOOM_STEP)}
                onZoomReset={() => resetPanelZoom(panel.id)}
                isSaved={savedContentIds.has(panel.context.content.id)}
                isSaving={savingContentId === panel.context.content.id}
                onToggleSave={() => void toggleSaved(panel.context.content.id)}
              />
            </div>
          );
        }

        const baseStyle: React.CSSProperties = isPanelFullscreen
          ? { left: 0, top: 0, right: 0, bottom: 0, width: undefined, height: undefined }
          : { left: `${panel.position.x}px`, top: `${panel.position.y}px`, width: `${pw}px`, height: `${ph}px` };

        return (
          <div
            key={panel.id}
            data-panel-id={panel.id}
            ref={(el) => { contentPanelRefs.current[panel.id] = el; }}
            style={{ ...baseStyle, zIndex: 59 + index }}
            className={`fixed flex flex-col overflow-hidden backdrop-blur-2xl ${
              isPanelFullscreen
                ? "rounded-none border-0 bg-white dark:bg-slate-950/90"
                : "rounded-3xl border border-slate-200 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.15)] min-w-[20rem] min-h-[16rem] max-w-[96vw] max-h-[90dvh] resize dark:border-white/10 dark:bg-slate-950/90 dark:shadow-[0_30px_100px_rgba(0,0,0,0.65)]"
            }`}
          >
            <div
              className={`shrink-0 flex items-center justify-between gap-2 border-b bg-slate-50 px-3 py-2.5 md:px-4 dark:bg-black/30 ${theme.borderClass}`}
              style={{ touchAction: "none" }}
            >
              <div
                className={`flex min-w-0 flex-1 select-none items-center gap-2.5 ${isPanelFullscreen ? "cursor-default" : "cursor-move"}`}
                onPointerDown={(e) => {
                  if (isPanelFullscreen || e.button !== 0) return;
                  const el = contentPanelRefs.current[panel.id];
                  if (!el) return;
                  focusContentPanel(panel.id);
                  const rect = el.getBoundingClientRect();
                  contentDragRef.current = { panelId: panel.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
                  setIsDraggingContent(true);
                }}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 ${theme.iconClass}`}>
                  <FileText size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {panel.context.content.title}
                  </h3>
                  {!isPanelFullscreen && (
                    <p className="truncate text-[10px] text-slate-500 mt-0.5">{panel.context.chapter}</p>
                  )}
                </div>
                {!isPanelFullscreen && (
                  <GripVertical size={13} className="hidden shrink-0 text-slate-400 dark:text-slate-600 sm:block" />
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <ZoomControls
                  zoom={zoom}
                  onZoomIn={() => adjustPanelZoom(panel.id, ZOOM_STEP)}
                  onZoomOut={() => adjustPanelZoom(panel.id, -ZOOM_STEP)}
                  onReset={() => resetPanelZoom(panel.id)}
                />
                <div className="flex items-center gap-0.5">
                  {renderSaveIconBtn(panel.context.content.id)}
                  <button
                    type="button"
                    onClick={() => toggleBrowserFullscreen(panel.id)}
                    className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                    title={isPanelFullscreen ? "Sair do ecrã inteiro" : "Ecrã inteiro"}
                  >
                    {isPanelFullscreen ? <Shrink size={14} /> : <Expand size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => closeContentPanel(panel.id)}
                    className="rounded-xl p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                    title="Fechar"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
            <div className="relative min-h-0 flex-1 bg-slate-100 dark:bg-black/80">
              <SlideViewer url={panel.context.content.url ?? ""} title={panel.context.content.title} zoom={zoom} />
            </div>
          </div>
        );
      })}

      {/* ── Tutor IA ── */}
      {isTutorOpen && (
        <>
          {isMobile && (
            <>
              <div className="fixed inset-0 z-[59] bg-black/60 backdrop-blur-sm" onClick={() => setIsTutorOpen(false)} />
              <div
                ref={tutorPanelRef}
                style={{ height: `${tutorSheetHeight}dvh` }}
                className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col overflow-hidden rounded-t-3xl border-t border-x border-slate-200 bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.15)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_-20px_60px_rgba(0,0,0,0.5)]"
              >
                <div
                  className="flex touch-none cursor-ns-resize select-none justify-center py-3"
                  onPointerDown={(e) => {
                    sheetDragRef.current = { startY: e.clientY, startHeight: tutorSheetHeight };
                    setIsDraggingSheet(true);
                  }}
                >
                  <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />
                </div>
                <div className="flex justify-center gap-2 pb-2">
                  {[62, 88].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTutorSheetHeight(h)}
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
                        Math.abs(tutorSheetHeight - h) < 5
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                      }`}
                    >
                      {h === 62 ? "Médio" : "Grande"}
                    </button>
                  ))}
                </div>
                {renderTutorHeader(false)}
                {renderTutorBody()}
              </div>
            </>
          )}

          {!isMobile && (
            <div
              ref={tutorPanelRef}
              style={
                isTutorFullscreen
                  ? { left: 16, top: 16, right: 16, bottom: 16, width: "auto", height: "auto" }
                  : isTutorMinimized
                  ? { left: `${tutorPosition.x}px`, top: `${tutorPosition.y}px`, width: `${tutorSize.width}px`, height: "auto" }
                  : { left: `${tutorPosition.x}px`, top: `${tutorPosition.y}px`, width: `${tutorSize.width}px`, height: `${tutorSize.height}px` }
              }
              className={`fixed z-[60] flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 dark:shadow-2xl dark:shadow-black/60 ${
                isTutorFullscreen
                  ? "max-w-none max-h-none"
                  : isTutorMinimized
                  ? "resize-none"
                  : "resize min-w-[340px] min-h-[450px] max-w-[90vw] max-h-[90vh]"
              }`}
            >
              {renderTutorHeader(true)}
              {!isTutorFullscreen && !isTutorMinimized && (
                <div className="shrink-0 flex justify-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
                  {[
                    { label: "Médio", width: 420, height: 580 },
                    { label: "Grande", width: 520, height: 680 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyTutorPreset(p.width, p.height)}
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
                        Math.abs(tutorSize.width - p.width) < 20 && Math.abs(tutorSize.height - p.height) < 20
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              {!isTutorMinimized && renderTutorBody()}
            </div>
          )}
        </>
      )}

      {/* ── Modal do vídeo ── */}
      {isVideoOpen && discipline.introVideoUrl && (
        <>
          <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md" onClick={closeVideo} />
          <div
            className="fixed z-[121]"
            style={
              shouldRotateVideo
                ? { position: "fixed", top: "50%", left: "50%", width: "100dvh", height: "100dvw", transform: "translate(-50%, -50%) rotate(90deg)", transformOrigin: "center center", overflow: "hidden" }
                : { inset: 0 }
            }
          >
            <div
              ref={videoModalRef}
              onClick={(e) => e.stopPropagation()}
              onMouseMove={resetControlsTimer}
              onTouchStart={resetControlsTimer}
              className={`absolute bg-black ${
                shouldRotateVideo
                  ? "inset-0 rounded-none"
                  : "inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:w-[90vw] md:max-w-5xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:border-white/10 md:shadow-[0_40px_120px_rgba(0,0,0,0.8)] md:max-h-[92dvh] md:overflow-hidden"
              }`}
              style={!shouldRotateVideo ? { height: "100dvh" } : undefined}
            >
              <div className="absolute inset-0 bg-black">
                {!videoReady && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="text-xs font-medium tracking-widest text-slate-500 uppercase">A carregar…</p>
                  </div>
                )}
                <video
                  ref={videoRef}
                  className={`h-full w-full ${shouldRotateVideo ? "object-cover" : "object-contain"}`}
                  playsInline
                  preload="metadata"
                  src={discipline.introVideoUrl}
                  onClick={toggleControls}
                />
                {!videoPlaying && videoReady && showControls && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void toggleVideoPlay(); }}
                      className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-2xl backdrop-blur-md transition hover:scale-110 hover:bg-indigo-600/80 active:scale-95"
                    >
                      <Play size={24} className="translate-x-0.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Barra superior */}
              <div className={`absolute left-0 right-0 top-0 z-20 bg-gradient-to-b from-black/90 via-black/60 to-transparent px-4 py-4 md:px-6 md:py-5 transition-all duration-300 ease-out ${showControls ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-600/20">
                      <PlayCircle size={18} className="text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">Vídeo Introdutório</p>
                      <p className="truncate text-xs text-slate-400">{discipline.title}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsVideoLandscape((p) => !p); setShowSpeedMenu(false); }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200 backdrop-blur-md transition hover:bg-white/10 md:hidden"
                    >
                      {isVideoLandscape ? <Smartphone size={13} /> : <Monitor size={13} />}
                      <span>{isVideoLandscape ? "Vertical" : "Paisagem"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={closeVideo}
                      className="rounded-xl border border-white/10 bg-black/50 p-2.5 text-slate-300 backdrop-blur-md transition hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Controlos inferiores */}
              <div
                className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 py-5 md:px-6 md:py-6 transition-all duration-300 ease-out ${showControls ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
                style={{ paddingBottom: `max(1.25rem, env(safe-area-inset-bottom))` }}
              >
                <div className="space-y-4">
                  <div className="group relative h-2 cursor-pointer rounded-full bg-white/15" onClick={handleProgressClick}>
                    <div className="absolute inset-y-0 left-0 rounded-full bg-white/20 transition-all" style={{ width: `${videoBuffered}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 transition-all" style={{ width: `${videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0}%` }} />
                    <div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-indigo-500 bg-white shadow-lg opacity-0 transition-opacity group-hover:opacity-100" style={{ left: `calc(${videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0}% - 8px)` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs tabular-nums text-slate-400">
                    <span>{formatTime(videoCurrentTime)}</span>
                    <span>{videoDuration ? formatTime(videoDuration) : "--:--"}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => void toggleVideoPlay()}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-500 active:scale-95"
                    >
                      {videoPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
                    </button>
                    <button type="button" onClick={() => skipVideo(-15)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" title="-15s">
                      <SkipBack size={16} />
                    </button>
                    <button type="button" onClick={() => skipVideo(15)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" title="+15s">
                      <SkipForward size={16} />
                    </button>
                    <div className="hidden items-center gap-2.5 border-l border-white/10 pl-2.5 sm:flex">
                      <button type="button" onClick={toggleVideoMute} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10">
                        {videoMuted || videoVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={videoMuted ? 0 : videoVolume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-white/15 accent-indigo-500"
                      />
                    </div>
                    <div className="relative ml-auto">
                      <button
                        type="button"
                        onClick={() => setShowSpeedMenu((p) => !p)}
                        className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                      >
                        <Settings size={14} /> {videoSpeed}×
                      </button>
                      {showSpeedMenu && (
                        <div className="absolute bottom-[calc(100%+8px)] right-0 z-[130] min-w-[120px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
                          <div className="border-b border-white/10 px-3 py-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Velocidade</p>
                          </div>
                          <div className="p-1">
                            {VIDEO_SPEEDS.map((speed) => (
                              <button
                                key={speed}
                                type="button"
                                onClick={() => setVideoSpeedFn(speed)}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition hover:bg-white/10 ${videoSpeed === speed ? "text-indigo-400 bg-indigo-500/10" : "text-slate-300"}`}
                              >
                                <span>{speed}×</span>
                                {videoSpeed === speed && <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal do Quiz ── */}
      {activeQuiz && (
        <QuizHost
          key={activeQuiz.contentId}
          isOpen={true}
          contentId={activeQuiz.contentId}
          title={activeQuiz.title}
          disciplineName={activeQuiz.disciplineName}
          chapterTitle={activeQuiz.chapterTitle}
          timeLimitSeconds={activeQuiz.timeLimitSecs}
          onClose={() => setActiveQuiz(null)}
        />
      )}
    </div>
  );
}