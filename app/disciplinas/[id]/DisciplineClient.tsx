// DisciplineClient.tsx
"use client";

import { useAudioPlayer } from "@/app/lib/context/AudioPlayerContext";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
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
  RotateCw,
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
} from "lucide-react";

import SlideViewer from "@/app/components/slides/SlideViewer";
import { useLocalStorageState } from "@/app/lib/hooks/useLocalStorageState";

import type {
  Discipline,
  Chapter,
  Topic,
  TopicContent,
} from "@/app/lib/mockData";

/* =========================================================
   Tipos auxiliares
   ========================================================= */

type DisciplineWithVideo = Discipline & {
  introVideoUrl?: string;
};

type Props = {
  discipline: DisciplineWithVideo;
};

type MobileView = "chapters" | "topics";

type TutorMessage = {
  role: "user" | "assistant";
  text: string;
};

type TutorContext = {
  discipline: string;
  chapter: string;
  topic: string;
};

type TutorDragState = {
  offsetX: number;
  offsetY: number;
};

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
  isFullscreen?: boolean;
  rotation?: 0 | 90;
};

type FloatingContentDragState = {
  panelId: string;
  offsetX: number;
  offsetY: number;
};

/* =========================================================
   Helpers visuais
   ========================================================= */

function getContentIcon(type: TopicContent["type"]) {
  switch (type) {
    case "audio":
      return Headphones;
    case "slide":
      return FileText;
    case "quiz":
      return Trophy;
    default:
      return PlayCircle;
  }
}

function getContentButtonClass(type: TopicContent["type"]) {
  switch (type) {
    case "audio":
    case "slide":
    case "quiz":
      return "bg-blue-700 hover:bg-blue-600 text-white";
    default:
      return "bg-blue-600 hover:bg-blue-500 text-white";
  }
}

function getContentPanelTheme(type: TopicContent["type"]) {
  switch (type) {
    case "audio":
    case "slide":
      return {
        borderClass: "border-blue-700/20",
        iconClass: "bg-blue-700/20 text-blue-200",
        label: type === "audio" ? "Campo de Áudio" : "Campo de Slide",
      };
    default:
      return {
        borderClass: "border-blue-500/20",
        iconClass: "bg-blue-600/20 text-blue-300",
        label: "Campo",
      };
  }
}

const actionButtonClass =
  "inline-flex h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium whitespace-nowrap transition";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const VIDEO_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_PANEL_W = 544;
const DEFAULT_PANEL_H = 420;
const MOBILE_PANEL_W = 0.94;
const MOBILE_PANEL_H = 0.82;
const VIDEO_CONTROLS_HIDE_DELAY = 3000; // 3 segundos

/* =========================================================
   Componente principal
   ========================================================= */

export default function DisciplineClient({ discipline }: Props) {
  const chapters = discipline.chapters ?? [];

  /* ── mobile ─────────────────────────────────────────────── */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  /* ── navegação ───────────────────────────────────────────── */
  const [activeChapterId, setActiveChapterId] =
    useLocalStorageState<string>(
      `dc-activeChapter-${discipline.id}`,
      chapters[0]?.id ?? ""
    );

  const [mobileView, setMobileView] = useLocalStorageState<MobileView>(
    `dc-mobileView-${discipline.id}`,
    "chapters"
  );

  const [isVideoOpen, setIsVideoOpen] = useState(false);

  /* ── vídeo ───────────────────────────────────────────────── */
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
  const [showVideoControls, setShowVideoControls] = useState(true);

  /* ── Tutor IA ────────────────────────────────────────────── */
  const [isTutorOpen, setIsTutorOpen] = useLocalStorageState<boolean>(
    `dc-tutorOpen-${discipline.id}`,
    false
  );
  const [isTutorMinimized, setIsTutorMinimized] =
    useLocalStorageState<boolean>(
      `dc-tutorMinimized-${discipline.id}`,
      false
    );
  const [tutorInput, setTutorInput] = useState("");
  const [tutorMessages, setTutorMessages] = useLocalStorageState<
    TutorMessage[]
  >(`dc-tutorMessages-${discipline.id}`, [
    {
      role: "assistant",
      text: "Olá! Sou o Tutor IA. Pergunta-me sobre este tema e eu ajudo-te com base no conteúdo da disciplina.",
    },
  ]);
  const [tutorContext, setTutorContext] =
    useLocalStorageState<TutorContext | null>(
      `dc-tutorContext-${discipline.id}`,
      null
    );
  const [tutorPosition, setTutorPosition] = useLocalStorageState(
    `dc-tutorPosition-${discipline.id}`,
    { x: 0, y: 0 }
  );
  const [tutorSize, setTutorSize] = useLocalStorageState(
    `dc-tutorSize-${discipline.id}`,
    { width: 420, height: 580 }
  );
  const [hasTutorPosition, setHasTutorPosition] =
    useLocalStorageState<boolean>(
      `dc-hasTutorPos-${discipline.id}`,
      false
    );
  const [isTutorFullscreen, setIsTutorFullscreen] =
    useLocalStorageState<boolean>(
      `dc-tutorFullscreen-${discipline.id}`,
      false
    );
  const [isDraggingTutor, setIsDraggingTutor] = useState(false);
  const [isResizingTutor, setIsResizingTutor] = useState(false);
  const [tutorSheetHeight, setTutorSheetHeight] =
    useLocalStorageState<number>(
      `dc-tutorSheetH-${discipline.id}`,
      62
    );
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const sheetDragRef = useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);
  const tutorPanelRef = useRef<HTMLDivElement | null>(null);
  const tutorDragRef = useRef<TutorDragState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ── áudio global ────────────────────────────────────────── */
  const audioPlayer = useAudioPlayer();

  /* ── painéis de slides ───────────────────────────────────── */
  const [contentPanels, setContentPanels] = useLocalStorageState<
    FloatingContentPanel[]
  >(`dc-contentPanels-${discipline.id}`, []);
  const [isDraggingContent, setIsDraggingContent] = useState(false);
  const contentDragRef = useRef<FloatingContentDragState | null>(null);
  const contentPanelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [browserFullscreenPanelId, setBrowserFullscreenPanelId] = useState<
    string | null
  >(null);

  /* =========================================================
     Fullscreen listeners (para painéis de slides)
     ========================================================= */
  useEffect(() => {
    const onFsChange = () => {
      const el = document.fullscreenElement as HTMLElement | null;
      setBrowserFullscreenPanelId(el?.dataset?.panelId ?? null);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleBrowserFullscreen = async (panelId: string) => {
    const el = contentPanelRefs.current[panelId];
    if (!el) return;
    try {
      if (document.fullscreenElement?.dataset?.panelId === panelId) {
        await document.exitFullscreen();
      } else {
        if (document.fullscreenElement) await document.exitFullscreen();
        await el.requestFullscreen();
      }
    } catch (err) {
      console.error("Falha ao alternar fullscreen:", err);
    }
  };

  /* =========================================================
     Helpers do vídeo
     ========================================================= */
  const closeVideo = () => {
    videoRef.current?.pause();
    setIsVideoLandscape(false);
    setIsVideoOpen(false);
    setShowSpeedMenu(false);
    setShowVideoControls(true);
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
  };

  const toggleVideoPlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.paused) await video.play();
      else video.pause();
    } catch { /* ignore */ }
  };

  const seekVideo = (nextTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = clamp(nextTime, 0, Math.max(0, videoDuration || 0));
    video.currentTime = clamped;
    setVideoCurrentTime(clamped);
  };

  const skipVideo = (delta: number) => seekVideo(videoCurrentTime + delta);

  const toggleVideoMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (videoMuted || video.volume === 0) {
      const restore = lastVideoVolume || 0.7;
      video.muted = false;
      video.volume = restore;
      setVideoMuted(false);
      setVideoVolume(restore);
    } else {
      setLastVideoVolume(video.volume || 1);
      video.volume = 0;
      video.muted = true;
      setVideoMuted(true);
      setVideoVolume(0);
    }
  };

  const handleVolumeChange = (val: number) => {
    const video = videoRef.current;
    if (!video) return;
    const v = clamp(val, 0, 1);
    video.volume = v;
    video.muted = v === 0;
    setVideoVolume(v);
    setVideoMuted(v === 0);
    if (v > 0) setLastVideoVolume(v);
  };

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    seekVideo(ratio * (videoDuration || 0));
  };

  const setVideoSpeedFn = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setVideoSpeed(speed);
    setShowSpeedMenu(false);
  };

  /* =========================================================
     Modo paisagem (CSS rotate — só mobile)
     ========================================================= */
  const toggleVideoLandscape = () => {
    setIsVideoLandscape((prev) => !prev);
    setShowSpeedMenu(false);
  };

  /* =========================================================
     Controlos auto-hide — 3s de inatividade
     ========================================================= */
  const resetControlsHideTimer = () => {
    setShowVideoControls(true);
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
    }
    // Só esconde se estiver a reproduzir
    if (videoPlaying) {
      controlsHideTimerRef.current = window.setTimeout(() => {
        setShowVideoControls(false);
      }, VIDEO_CONTROLS_HIDE_DELAY);
    }
  };

  const toggleVideoControls = () => {
    setShowVideoControls((prev) => !prev);
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
  };

  // Quando vídeo começa a reproduzir, inicia o timer
  useEffect(() => {
    if (videoPlaying) {
      resetControlsHideTimer();
    } else {
      // Vídeo pausado → mostra controlos sempre
      setShowVideoControls(true);
      if (controlsHideTimerRef.current) {
        window.clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
    }
  }, [videoPlaying]);

  // Cleanup do timer ao desmontar
  useEffect(() => {
    return () => {
      if (controlsHideTimerRef.current) {
        window.clearTimeout(controlsHideTimerRef.current);
      }
    };
  }, []);

  /* =========================================================
     Sync eventos do vídeo
     ========================================================= */
  useEffect(() => {
    if (!isVideoOpen) return;

    setVideoReady(false);
    setVideoPlaying(false);
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setVideoMuted(false);
    setVideoVolume(1);
    setVideoSpeed(1);
    setShowSpeedMenu(false);
    setShowVideoControls(true);

    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      setVideoDuration(
        Number.isFinite(video.duration) ? video.duration : 0
      );
      setVideoReady(true);
      video.playbackRate = 1;
    };
    const onTimeUpdate = () => {
      setVideoCurrentTime(video.currentTime || 0);
      if (video.buffered.length > 0) {
        setVideoBuffered(
          (video.buffered.end(video.buffered.length - 1) /
            (video.duration || 1)) *
            100
        );
      }
    };
    const onPlay = () => setVideoPlaying(true);
    const onPause = () => setVideoPlaying(false);
    const onVolumeChange = () => {
      setVideoVolume(video.volume);
      setVideoMuted(video.muted || video.volume === 0);
      if (video.volume > 0) setLastVideoVolume(video.volume);
    };
    const onEnded = () => {
      setVideoPlaying(false);
      setVideoCurrentTime(video.duration || 0);
    };
    const onReady = () => setVideoReady(true);

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("ended", onEnded);
    video.addEventListener("canplay", onReady);
    video.addEventListener("error", onReady);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onReady);
    };
  }, [isVideoOpen]);

  /* ── Tutor IA auto-scroll ────────────────────────────────── */
  useEffect(() => {
    if (isTutorOpen && !isTutorMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isTutorOpen, isTutorMinimized, tutorMessages]);

  /* ── Tutor IA posicionamento inicial ─────────────────────── */
  useEffect(() => {
    if (!isTutorOpen || hasTutorPosition || isMobile) return;
    const timer = window.setTimeout(() => {
      const x = Math.max(16, window.innerWidth - tutorSize.width - 16);
      const y = Math.max(
        16,
        window.innerHeight -
          (isTutorMinimized ? 60 : tutorSize.height) -
          16
      );
      setTutorPosition({ x, y });
      setHasTutorPosition(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    isTutorOpen,
    hasTutorPosition,
    isMobile,
    tutorSize,
    isTutorMinimized,
  ]);

  /* ── Tutor IA resize observer ────────────────────────────── */
  useEffect(() => {
    if (
      isMobile ||
      !isTutorOpen ||
      isTutorFullscreen ||
      isTutorMinimized
    )
      return;
    const observer = new ResizeObserver((entries) => {
      if (isResizingTutor) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const nw = Math.round(width);
          const nh = Math.round(height);
          if (
            Math.abs(nw - tutorSize.width) > 5 ||
            Math.abs(nh - tutorSize.height) > 5
          ) {
            setTutorSize({ width: nw, height: nh });
          }
        }
      }
    });
    if (tutorPanelRef.current) observer.observe(tutorPanelRef.current);
    return () => observer.disconnect();
  }, [
    isMobile,
    isTutorOpen,
    isTutorFullscreen,
    isTutorMinimized,
    isResizingTutor,
    tutorSize.width,
    tutorSize.height,
  ]);

  /* ── Drag Tutor ──────────────────────────────────────────── */
  useEffect(() => {
    if (!isDraggingTutor) return;
    const onMove = (e: PointerEvent) => {
      if (!tutorDragRef.current || !tutorPanelRef.current) return;
      const rect = tutorPanelRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 16;
      const maxY = window.innerHeight - rect.height - 16;
      setTutorPosition({
        x: clamp(
          e.clientX - tutorDragRef.current.offsetX,
          16,
          Math.max(16, maxX)
        ),
        y: clamp(
          e.clientY - tutorDragRef.current.offsetY,
          16,
          Math.max(16, maxY)
        ),
      });
    };
    const onUp = () => {
      setIsDraggingTutor(false);
      tutorDragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDraggingTutor]);

  /* ── Drag bottom sheet ───────────────────────────────────── */
  useEffect(() => {
    if (!isDraggingSheet) return;
    const onMove = (e: PointerEvent) => {
      if (!sheetDragRef.current) return;
      const dy = sheetDragRef.current.startY - e.clientY;
      const dvh = window.innerHeight / 100;
      setTutorSheetHeight(
        clamp(sheetDragRef.current.startHeight + dy / dvh, 28, 92)
      );
    };
    const onUp = () => {
      setIsDraggingSheet(false);
      sheetDragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDraggingSheet]);

  /* ── Drag slides ─────────────────────────────────────────── */
  useEffect(() => {
    if (!isDraggingContent) return;
    const onMove = (e: PointerEvent) => {
      if (!contentDragRef.current) return;
      const { panelId, offsetX, offsetY } = contentDragRef.current;
      const panelEl = contentPanelRefs.current[panelId];
      if (!panelEl) return;
      const rect = panelEl.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      setContentPanels((prev) =>
        prev.map((p) =>
          p.id === panelId
            ? {
                ...p,
                position: {
                  x: clamp(e.clientX - offsetX, 8, Math.max(8, maxX)),
                  y: clamp(e.clientY - offsetY, 8, Math.max(8, maxY)),
                },
              }
            : p
        )
      );
    };
    const onUp = () => {
      setIsDraggingContent(false);
      contentDragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDraggingContent]);

  /* ── Computed ────────────────────────────────────────────── */
  const activeChapter =
    chapters.find((ch) => ch.id === activeChapterId) ??
    chapters[0] ??
    null;

  const stats = useMemo(
    () => ({
      totalChapters: chapters.length,
      totalTopics: chapters.reduce(
        (a, ch) => a + (ch.topics?.length ?? 0),
        0
      ),
      totalContents: chapters.reduce(
        (a, ch) =>
          a +
          (ch.topics ?? []).reduce(
            (b, t) => b + (t.contents?.length ?? 0),
            0
          ),
        0
      ),
    }),
    [chapters]
  );

  const shouldRotateVideoFallback = isMobile && isVideoLandscape;

  /* ── Tutor helpers ───────────────────────────────────────── */
  const openTutor = (topicTitle: string) => {
    setTutorContext({
      discipline: discipline.title,
      chapter: activeChapter?.title ?? "",
      topic: topicTitle,
    });
    setTutorMessages([
      {
        role: "assistant",
        text: `Olá! Vamos falar sobre "${topicTitle}". Escreve a tua dúvida e eu ajudo-te.`,
      },
    ]);
    setTutorInput("");
    setIsTutorOpen(true);
    setIsTutorMinimized(false);
    setHasTutorPosition(false);
  };

  const focusContentPanel = (panelId: string) => {
    setContentPanels((prev) => {
      const found = prev.find((p) => p.id === panelId);
      if (!found) return prev;
      return [...prev.filter((p) => p.id !== panelId), found];
    });
  };

  const togglePanelFullscreen = (panelId: string) => {
    setContentPanels((prev) =>
      prev.map((p) =>
        p.id === panelId ? { ...p, isFullscreen: !p.isFullscreen } : p
      )
    );
  };

  const rotatePanelMobile = async (panelId: string) => {
    const current = contentPanels.find((p) => p.id === panelId);
    const nextRotation: 0 | 90 =
      (current?.rotation ?? 0) === 0 ? 90 : 0;

    setContentPanels((prev) =>
      prev.map((p) =>
        p.id === panelId
          ? {
              ...p,
              rotation: nextRotation,
              isFullscreen: nextRotation === 90,
            }
          : p
      )
    );

    if (!isMobile) {
      try {
        const el = contentPanelRefs.current[panelId];
        if (nextRotation === 90) {
          if (document.fullscreenElement) await document.exitFullscreen();
          if (el) await el.requestFullscreen();
        } else {
          if (document.fullscreenElement) await document.exitFullscreen();
        }
      } catch { /* ignore */ }
    }
  };

  const tutorSizePresets = [
    { label: "Pequeno", width: 380, height: 520 },
    { label: "Médio", width: 420, height: 580 },
    { label: "Grande", width: 520, height: 680 },
  ];

  const applyTutorSizePreset = (width: number, height: number) => {
    setIsResizingTutor(true);
    const maxX = window.innerWidth - width - 16;
    const maxY = window.innerHeight - height - 16;
    setTutorSize({ width, height });
    setTutorPosition((prev) => ({
      x: clamp(prev.x, 16, Math.max(16, maxX)),
      y: clamp(prev.y, 16, Math.max(16, maxY)),
    }));
    setTimeout(() => setIsResizingTutor(false), 100);
  };

  const toggleTutorFullscreen = () => {
    setIsTutorFullscreen((p) => !p);
    if (isTutorMinimized) setIsTutorMinimized(false);
  };

  const toggleTutorMinimize = () => {
    setIsTutorMinimized((p) => !p);
    if (isTutorFullscreen) setIsTutorFullscreen(false);
  };

  /* ── Abrir conteúdo ──────────────────────────────────────── */
  const openContent = (content: TopicContent, topicTitle: string) => {
    if (content.type === "audio") {
      if (!content.url) {
        alert("Este áudio ainda não tem URL configurada.");
        return;
      }
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

    const panelId = [
      discipline.id,
      activeChapter?.id ?? "chapter",
      topicTitle,
      content.id,
    ].join("-");
    const context: ContentPanelContext = {
      discipline: discipline.title,
      chapter: activeChapter?.title ?? "",
      topic: topicTitle,
      content,
    };

    setContentPanels((prev) => {
      const exists = prev.find((p) => p.id === panelId);
      if (exists) return [...prev.filter((p) => p.id !== panelId), exists];

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const estimatedW =
        vw < 768
          ? Math.min(vw * MOBILE_PANEL_W, vw - 16)
          : DEFAULT_PANEL_W;
      const estimatedH =
        vw < 768
          ? Math.min(vh * MOBILE_PANEL_H, vh - 24)
          : DEFAULT_PANEL_H;
      const offset = prev.length * 24;

      return [
        ...prev,
        {
          id: panelId,
          context,
          position: {
            x: clamp(16 + offset, 8, Math.max(8, vw - estimatedW - 8)),
            y: clamp(16 + offset, 8, Math.max(8, vh - estimatedH - 8)),
          },
          size: { width: estimatedW, height: estimatedH },
          isFullscreen: false,
          rotation: 0,
        },
      ];
    });
  };

  const handleSendTutorMessage = () => {
    const trimmed = tutorInput.trim();
    if (!trimmed) return;
    setTutorMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
    ]);
    setTutorInput("");
    setTimeout(() => {
      setTutorMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Recebi a tua pergunta sobre "${tutorContext?.topic ?? "este tema"}". Em breve isto vai ser ligado à IA real.`,
        },
      ]);
    }, 700);
  };

  /* ── Renders auxiliares ──────────────────────────────────── */
  const renderContentAction = (
    content: TopicContent,
    topicTitle: string
  ) => {
    const Icon = getContentIcon(content.type);
    const contentBtnColor = getContentButtonClass(content.type);
    if (content.type === "quiz") {
      return (
        <Link
          key={content.id}
          href="/avaliacoes"
          className={`${actionButtonClass} ${contentBtnColor}`}
          title={content.title}
        >
          <Icon size={14} /> Questionário
        </Link>
      );
    }
    return (
      <button
        key={content.id}
        type="button"
        onClick={() => openContent(content, topicTitle)}
        className={`${actionButtonClass} ${contentBtnColor}`}
        title={content.title}
      >
        <Icon size={14} />{" "}
        {content.type === "audio" ? "Áudio" : "Slide"}
      </button>
    );
  };

  const renderTopicActions = (topic: Topic) => {
    const contents = topic.contents ?? [];
    return (
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:ml-auto">
        {contents
          .filter((c) => c.type === "audio")
          .map((c) => renderContentAction(c, topic.title))}
        {contents
          .filter((c) => c.type === "slide")
          .map((c) => renderContentAction(c, topic.title))}
        {contents
          .filter((c) => c.type === "quiz")
          .map((c) => renderContentAction(c, topic.title))}
        <button
          type="button"
          onClick={() => openTutor(topic.title)}
          className={`${actionButtonClass} bg-violet-600 hover:bg-violet-500 text-white`}
        >
          <Sparkles size={14} /> Tutor IA
        </button>
      </div>
    );
  };

  const renderChapterCard = (chapter: Chapter, isActive: boolean) => {
    const topicsCount = chapter.topics?.length ?? 0;
    const progress = chapter.status === "Concluído" ? 100 : 35;
    return (
      <button
        key={chapter.id}
        onClick={() => {
          setActiveChapterId(chapter.id);
          setMobileView("topics");
        }}
        className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
          isActive
            ? "border-blue-500 bg-blue-500/10 shadow-sm shadow-blue-500/10"
            : "border-white/10 bg-white/5 hover:bg-white/10"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-white">{chapter.title}</p>
            <p className="mt-1 text-sm text-slate-400">
              {chapter.status} · {topicsCount} temas
            </p>
          </div>
          <ChevronRight
            size={18}
            className={`mt-1 shrink-0 ${
              isActive ? "text-blue-300" : "text-slate-500"
            }`}
          />
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </button>
    );
  };

  const renderTutorBody = () => (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="tutor-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-3 md:px-4 md:py-4">
        {tutorMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-none bg-blue-600 text-white"
                  : "rounded-bl-none bg-white/5 text-slate-200"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="shrink-0 border-t border-white/10 p-3 md:p-4">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:px-4 md:py-3">
          <input
            value={tutorInput}
            onChange={(e) => setTutorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendTutorMessage();
            }}
            placeholder="Escreve a tua pergunta..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={handleSendTutorMessage}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 md:h-10 md:w-10"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderTutorHeader = (isDraggable: boolean) => (
    <div className="shrink-0 flex items-start justify-between gap-3 border-b border-white/10 px-3 py-3 md:px-4 md:py-4">
      <div
        className={`flex flex-1 min-w-0 select-none items-start gap-2 md:gap-3 ${
          isDraggable && !isTutorFullscreen
            ? "cursor-move"
            : "cursor-default"
        }`}
        onPointerDown={
          isDraggable && !isTutorFullscreen
            ? (e) => {
                if (e.button !== 0 || !tutorPanelRef.current) return;
                const rect =
                  tutorPanelRef.current.getBoundingClientRect();
                tutorDragRef.current = {
                  offsetX: e.clientX - rect.left,
                  offsetY: e.clientY - rect.top,
                };
                setIsDraggingTutor(true);
              }
            : undefined
        }
      >
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400 md:h-9 md:w-9 md:rounded-xl">
          <Sparkles size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 md:gap-2">
            <h3 className="text-sm font-semibold text-white">
              Tutor IA
            </h3>
            {isDraggable &&
              !isTutorFullscreen &&
              !isTutorMinimized && (
                <GripVertical
                  size={14}
                  className="hidden text-slate-500 sm:block"
                />
              )}
          </div>
          {!isTutorMinimized && (
            <p className="hidden text-xs text-slate-400 sm:block">
              Assistente da disciplina
            </p>
          )}
          {tutorContext &&
            !isTutorFullscreen &&
            !isTutorMinimized && (
              <div className="mt-2 space-y-1 text-[11px] text-slate-300 md:mt-3">
                <p>
                  <span className="text-slate-500">Disciplina:</span>{" "}
                  {tutorContext.discipline}
                </p>
                <p>
                  <span className="text-slate-500">Capítulo:</span>{" "}
                  {tutorContext.chapter}
                </p>
                <p>
                  <span className="text-slate-500">Tema:</span>{" "}
                  {tutorContext.topic}
                </p>
              </div>
            )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1">
        {!isMobile && !isTutorMinimized && (
          <button
            type="button"
            onClick={toggleTutorFullscreen}
            className="rounded-full p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            {isTutorFullscreen ? (
              <Minimize2 size={20} />
            ) : (
              <Maximize2 size={20} />
            )}
          </button>
        )}
        {!isMobile && (
          <button
            type="button"
            onClick={toggleTutorMinimize}
            className="rounded-full p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            {isTutorMinimized ? (
              <ChevronUp size={20} />
            ) : (
              <ChevronDown size={20} />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsTutorOpen(false)}
          className="rounded-full p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );

  /* ── Empty state ─────────────────────────────────────────── */
  if (chapters.length === 0) {
    return (
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <div className="absolute inset-0">
            {discipline.coverUrl ? (
              <Image
                src={discipline.coverUrl}
                alt=""
                fill
                className="object-cover opacity-20"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-950" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/80 to-slate-950/35" />
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-blue-400">
              {discipline.year} · {discipline.semester}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              {discipline.title}
            </h1>
          </div>
        </section>
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 text-slate-300">
          Esta disciplina ainda não tem capítulos definidos.
        </div>
      </div>
    );
  }

  /* =========================================================
     RENDER PRINCIPAL
     ========================================================= */
  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45 p-5">
        <div className="absolute inset-0">
          {discipline.coverUrl ? (
            <Image
              src={discipline.coverUrl}
              alt=""
              fill
              className="object-cover opacity-20"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-950" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/80 to-slate-950/35" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-blue-400">
              {discipline.year} · {discipline.semester}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {discipline.title}
            </h1>
            <div className="flex flex-wrap gap-3 pt-2 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {stats.totalChapters} capítulos
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {stats.totalTopics} temas
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {stats.totalContents} conteúdos
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsVideoLandscape(false);
              setVideoReady(false);
              setVideoPlaying(false);
              setVideoCurrentTime(0);
              setIsVideoOpen(true);
            }}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <PlayCircle size={18} /> Reproduzir vídeo
          </button>
        </div>
      </section>

      {/* MOBILE */}
      <section className="lg:hidden">
        <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
            {(["chapters", "topics"] as MobileView[]).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setMobileView(view)}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  mobileView === view
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {view === "chapters" ? "Capítulos" : "Temas"}
              </button>
            ))}
          </div>

          {mobileView === "chapters" ? (
            <div className="mt-4 space-y-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-200">
                  Capítulos
                </h2>
                <span className="text-xs text-slate-500">
                  Escolhe um capítulo
                </span>
              </div>
              {chapters.map((c) =>
                renderChapterCard(c, c.id === activeChapter?.id)
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-slate-100">
                    {activeChapter?.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {activeChapter?.status} ·{" "}
                    {activeChapter?.topics?.length ?? 0} temas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileView("chapters")}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Voltar aos capítulos
                </button>
              </div>
              <div className="space-y-3">
                {activeChapter?.topics?.map((topic, index) => (
                  <article
                    key={topic.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-semibold text-slate-200">
                        {index + 1}
                      </div>
                      <h3 className="text-base font-medium leading-snug text-white">
                        {topic.title}
                      </h3>
                    </div>
                    {renderTopicActions(topic)}
                  </article>
                ))}
                {(!activeChapter?.topics ||
                  activeChapter.topics.length === 0) && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-400">
                    Este capítulo ainda não tem temas definidos.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* DESKTOP */}
      <section className="hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 lg:grid lg:grid-cols-[340px_1fr] lg:h-[40rem]">
        <aside className="scrollbar-theme border-r border-white/10 p-5 lg:h-full lg:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">
              Capítulos
            </h2>
            <span className="text-xs text-slate-500">Lista fixa</span>
          </div>
          <div className="space-y-3">
            {chapters.map((c) =>
              renderChapterCard(c, c.id === activeChapter?.id)
            )}
          </div>
        </aside>
        <main className="scrollbar-theme h-full overflow-y-auto p-5">
          <div className="mb-4 border-b border-white/10 pb-3">
            <h2 className="text-lg font-semibold text-slate-100">
              {activeChapter?.title}
            </h2>
          </div>
          <div className="space-y-3">
            {activeChapter?.topics?.map((topic, index) => (
              <article
                key={topic.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-semibold text-slate-200">
                      {index + 1}
                    </div>
                    <h3 className="text-base font-medium leading-snug text-white">
                      {topic.title}
                    </h3>
                  </div>
                </div>
                {renderTopicActions(topic)}
              </article>
            ))}
          </div>
        </main>
      </section>

      {/* PAINÉIS FLUTUANTES */}
      {contentPanels.map((panel, index) => {
        const theme = getContentPanelTheme(panel.context.content.type);
        const isBrowserFs = browserFullscreenPanelId === panel.id;
        const isAppFs = !!panel.isFullscreen;
        const rotation: 0 | 90 = panel.rotation ?? 0;
        const isMobileLandscapePanel = isMobile && rotation === 90;
        const isAnyFs =
          isBrowserFs || isAppFs || isMobileLandscapePanel;
        const panelWidth = panel.size?.width ?? DEFAULT_PANEL_W;
        const panelHeight = panel.size?.height ?? DEFAULT_PANEL_H;

        return (
          <div
            key={panel.id}
            data-panel-id={panel.id}
            ref={(el) => {
              contentPanelRefs.current[panel.id] = el;
            }}
            style={{
              ...(isAnyFs
                ? { left: 0, top: 0, right: 0, bottom: 0 }
                : {
                    left: `${panel.position.x}px`,
                    top: `${panel.position.y}px`,
                    width: `${panelWidth}px`,
                    height: `${panelHeight}px`,
                  }),
              zIndex: 59 + index,
            }}
            className={`fixed flex flex-col overflow-hidden bg-slate-950/95 backdrop-blur-xl ${
              isAnyFs
                ? "rounded-none border-0 shadow-none w-auto h-auto max-w-none max-h-none"
                : "rounded-3xl border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.55)] min-w-[20rem] min-h-[16rem] max-w-[96vw] max-h-[90dvh] resize"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-violet-500/[0.04]" />

            <div
              className={`relative shrink-0 flex items-center justify-between gap-2 border-b px-3 py-2 md:px-4 md:py-2.5 ${theme.borderClass}`}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent" />
              <div
                className={`relative z-10 flex flex-1 min-w-0 select-none items-center gap-2 ${
                  isAnyFs ? "cursor-default" : "cursor-move"
                }`}
                onPointerDown={(e) => {
                  if (isAnyFs || e.button !== 0) return;
                  const panelEl =
                    contentPanelRefs.current[panel.id];
                  if (!panelEl) return;
                  focusContentPanel(panel.id);
                  const rect = panelEl.getBoundingClientRect();
                  contentDragRef.current = {
                    panelId: panel.id,
                    offsetX: e.clientX - rect.left,
                    offsetY: e.clientY - rect.top,
                  };
                  setIsDraggingContent(true);
                }}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 ${theme.iconClass}`}
                >
                  <FileText size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-xs font-semibold text-white">
                      {panel.context.content.title}
                    </h3>
                    {!isAnyFs && (
                      <GripVertical
                        size={13}
                        className="hidden shrink-0 text-slate-500 sm:block"
                      />
                    )}
                  </div>
                  {!isAnyFs && (
                    <p className="truncate text-[10px] text-slate-500">
                      {panel.context.discipline} ·{" "}
                      {panel.context.chapter}
                    </p>
                  )}
                </div>
              </div>

              <div className="relative z-10 flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => void rotatePanelMobile(panel.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white md:hidden"
                  title={
                    rotation === 90
                      ? "Voltar ao normal"
                      : "Modo paisagem"
                  }
                >
                  <RotateCw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void toggleBrowserFullscreen(panel.id)
                  }
                  className="hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white md:inline-flex"
                  title={
                    isBrowserFs
                      ? "Sair do ecrã inteiro"
                      : "Ecrã inteiro"
                  }
                >
                  {isBrowserFs ? (
                    <Shrink size={14} />
                  ) : (
                    <Expand size={14} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => togglePanelFullscreen(panel.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  title={isAppFs ? "Restaurar" : "Maximizar"}
                >
                  {isAppFs ? (
                    <Minimize2 size={14} />
                  ) : (
                    <Maximize2 size={14} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setContentPanels((p) =>
                      p.filter((x) => x.id !== panel.id)
                    )
                  }
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-red-400"
                  title="Fechar painel"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="relative flex-1 min-h-0 overflow-hidden bg-black">
              {panel.context.content.url ? (
                <SlideViewer
                  url={panel.context.content.url}
                  rotation={rotation}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6">
                  <div className="max-w-md space-y-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500">
                      <FileText size={28} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-200">
                        Slide não disponível
                      </p>
                      <p className="text-xs leading-relaxed text-slate-500">
                        Este conteúdo ainda não possui um ficheiro
                        associado.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left text-xs text-slate-400">
                      Adiciona{" "}
                      <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">
                        url
                      </code>{" "}
                      no{" "}
                      <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">
                        mockData.ts
                      </code>
                      .
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* TUTOR IA */}
      {isTutorOpen && (
        <>
          {isMobile && (
            <>
              <div
                className="fixed inset-0 z-[59] bg-black/50"
                onClick={() => setIsTutorOpen(false)}
              />
              <div
                ref={tutorPanelRef}
                style={{ height: `${tutorSheetHeight}dvh` }}
                className="fixed bottom-0 left-0 right-0 z-[60] flex flex-col overflow-hidden rounded-t-2xl border-t border-x border-white/10 bg-slate-950 shadow-2xl"
              >
                <div
                  className="flex touch-none select-none justify-center py-2.5 cursor-ns-resize"
                  onPointerDown={(e) => {
                    sheetDragRef.current = {
                      startY: e.clientY,
                      startHeight: tutorSheetHeight,
                    };
                    setIsDraggingSheet(true);
                  }}
                >
                  <div className="h-1 w-10 rounded-full bg-white/25" />
                </div>
                <div className="flex justify-center gap-2 pb-1">
                  {[35, 62, 88].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setTutorSheetHeight(h)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition ${
                        Math.abs(tutorSheetHeight - h) < 5
                          ? "bg-violet-600 text-white"
                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      {h === 35
                        ? "Pequeno"
                        : h === 62
                        ? "Médio"
                        : "Grande"}
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
                  ? {
                      left: 16,
                      top: 16,
                      right: 16,
                      bottom: 16,
                      width: "auto",
                      height: "auto",
                    }
                  : isTutorMinimized
                  ? {
                      left: `${tutorPosition.x}px`,
                      top: `${tutorPosition.y}px`,
                      width: `${tutorSize.width}px`,
                      height: "auto",
                    }
                  : {
                      left: `${tutorPosition.x}px`,
                      top: `${tutorPosition.y}px`,
                      width: `${tutorSize.width}px`,
                      height: `${tutorSize.height}px`,
                    }
              }
              className={`fixed z-[60] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl ${
                isTutorFullscreen
                  ? "max-w-none max-h-none"
                  : isTutorMinimized
                  ? "resize-none"
                  : "resize min-w-[340px] min-h-[450px] max-w-[90vw] max-h-[90vh]"
              }`}
            >
              {renderTutorHeader(true)}
              {!isTutorFullscreen && !isTutorMinimized && (
                <div className="shrink-0 flex justify-center gap-2 border-b border-white/10 px-4 py-2">
                  {tutorSizePresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        applyTutorSizePreset(
                          preset.width,
                          preset.height
                        )
                      }
                      className={`rounded-full px-3 py-1 text-[10px] font-medium transition ${
                        Math.abs(tutorSize.width - preset.width) <
                          20 &&
                        Math.abs(tutorSize.height - preset.height) <
                          20
                          ? "bg-violet-600 text-white"
                          : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
              {!isTutorMinimized && renderTutorBody()}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
    MODAL DO VÍDEO — substituir bloco completo
    ═══════════════════════════════════════════════════════ */}
{isVideoOpen && discipline.introVideoUrl && (
  <>
    <div
      className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm"
      onClick={closeVideo}
    />

    <div
      className="fixed z-[121]"
      style={
        shouldRotateVideoFallback
          ? {
              position: "fixed",
              top: "50%",
              left: "50%",
              width: "100dvh",
              height: "100dvw",
              transform: "translate(-50%, -50%) rotate(90deg)",
              transformOrigin: "center center",
              overflow: "hidden",
            }
          : { inset: 0 }
      }
    >
      <div
        ref={videoModalRef}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={resetControlsHideTimer}
        onTouchStart={resetControlsHideTimer}
        className={`
          absolute bg-black
          ${
            shouldRotateVideoFallback
              ? "inset-0 rounded-none"
              : [
                  "inset-0",
                  "md:inset-auto md:left-1/2 md:top-1/2",
                  "md:w-[90vw] md:max-w-5xl",
                  "md:-translate-x-1/2 md:-translate-y-1/2",
                  "md:rounded-3xl md:border md:border-white/[0.08]",
                  "md:shadow-2xl md:max-h-[92dvh]",
                ].join(" ")
          }
        `}
        style={
          !shouldRotateVideoFallback
            ? { height: "100dvh" }
            : undefined
        }
      >
        {/* ══════════════════════════════════════════════
            VÍDEO — ocupa todo o espaço (sem flex)
            ══════════════════════════════════════════════ */}
        <div className="absolute inset-0 bg-black">
          {!videoReady && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-xs font-medium text-slate-500">A carregar…</p>
            </div>
          )}

          <video
            ref={videoRef}
            className={`h-full w-full ${
              shouldRotateVideoFallback
                ? "object-cover"
                : "object-contain"
            }`}
            playsInline
            preload="metadata"
            src={discipline.introVideoUrl}
            onClick={toggleVideoControls}
          />

          {/* Play overlay — só quando pausado */}
          {!videoPlaying && videoReady && showVideoControls && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleVideoPlay();
                }}
                className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/50 backdrop-blur-sm transition hover:scale-110 hover:bg-blue-600/80 hover:border-blue-500/50 active:scale-95"
              >
                <Play size={22} className="translate-x-0.5 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            HEADER FLUTUANTE (absolute top-0)
            ══════════════════════════════════════════════ */}
        <div
          className={`
            absolute top-0 left-0 right-0 z-20
            border-b border-white/10 bg-gradient-to-b from-black/90 via-black/70 to-transparent
            px-3 py-3 md:px-5 md:py-4
            transition-all duration-300 ease-out
            ${showVideoControls 
              ? "translate-y-0 opacity-100" 
              : "-translate-y-full opacity-0 pointer-events-none"
            }
          `}
          style={
            shouldRotateVideoFallback
              ? { paddingTop: "0.5rem", paddingBottom: "0.5rem" }
              : undefined
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-600/25">
                <PlayCircle size={15} className="text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white md:text-sm">
                  Vídeo Introdutório
                </p>
                <p className="truncate text-[10px] text-slate-400 md:text-xs">
                  {discipline.title}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {/* Botão Paisagem — só mobile */}
              <button
                type="button"
                onClick={toggleVideoLandscape}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/50 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition hover:bg-white/10 md:hidden"
                title={isVideoLandscape ? "Modo vertical" : "Modo paisagem"}
              >
                {isVideoLandscape ? (
                  <Smartphone size={12} />
                ) : (
                  <Monitor size={12} />
                )}
                <span>{isVideoLandscape ? "Vertical" : "Paisagem"}</span>
              </button>

              {/* Fechar */}
              <button
                type="button"
                onClick={closeVideo}
                className="rounded-xl border border-white/10 bg-black/50 p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-red-400 md:p-2"
                title="Fechar"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            FOOTER FLUTUANTE (absolute bottom-0)
            ══════════════════════════════════════════════ */}
        <div
          className={`
            absolute bottom-0 left-0 right-0 z-20
            border-t border-white/10 bg-gradient-to-t from-black/90 via-black/70 to-transparent
            px-3 py-3 md:px-5 md:py-4
            transition-all duration-300 ease-out
            ${showVideoControls 
              ? "translate-y-0 opacity-100" 
              : "translate-y-full opacity-0 pointer-events-none"
            }
          `}
          style={{
            paddingBottom: `max(0.75rem, env(safe-area-inset-bottom))`,
            ...(shouldRotateVideoFallback
              ? { 
                  paddingTop: "0.5rem", 
                  paddingBottom: `max(0.5rem, env(safe-area-inset-bottom))` 
                }
              : {}),
          }}
        >
          <div className="space-y-2">
            {/* Barra de progresso */}
            <div
              className="group relative h-1.5 cursor-pointer rounded-full bg-white/15"
              onClick={handleProgressClick}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/20"
                style={{ width: `${videoBuffered}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${
                    videoDuration > 0
                      ? (videoCurrentTime / videoDuration) * 100
                      : 0
                  }%`,
                }}
              />
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-blue-400/50 bg-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  left: `calc(${
                    videoDuration > 0
                      ? (videoCurrentTime / videoDuration) * 100
                      : 0
                  }% - 7px)`,
                }}
              />
            </div>

            {/* Tempo */}
            <div className="flex items-center justify-between text-[11px] tabular-nums text-slate-400">
              <span>{formatTime(videoCurrentTime)}</span>
              <span>
                {videoDuration ? formatTime(videoDuration) : "--:--"}
              </span>
            </div>

            {/* Botões de controlo */}
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                type="button"
                onClick={() => void toggleVideoPlay()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500"
              >
                {videoPlaying ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} className="translate-x-0.5" />
                )}
              </button>

              {/* -15s */}
              <button
                type="button"
                onClick={() => skipVideo(-15)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                title="-15s"
              >
                <SkipBack size={15} />
              </button>

              {/* +15s */}
              <button
                type="button"
                onClick={() => skipVideo(15)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                title="+15s"
              >
                <SkipForward size={15} />
              </button>

              {/* Mute */}
              <button
                type="button"
                onClick={toggleVideoMute}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
              >
                {videoMuted || videoVolume === 0 ? (
                  <VolumeX size={15} />
                ) : (
                  <Volume2 size={15} />
                )}
              </button>

              {/* Volume slider — desktop */}
              <div className="hidden w-20 items-center sm:flex">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={videoMuted ? 0 : videoVolume}
                  onChange={(e) =>
                    handleVolumeChange(Number(e.target.value))
                  }
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-blue-500"
                />
              </div>

              {/* Velocidade */}
              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={() => setShowSpeedMenu((p) => !p)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  <Settings size={13} /> {videoSpeed}×
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-[calc(100%+8px)] right-0 z-[130] min-w-[110px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                    <div className="border-b border-white/10 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Velocidade
                      </p>
                    </div>
                    {VIDEO_SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => setVideoSpeedFn(speed)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-xs transition hover:bg-white/5 ${
                          videoSpeed === speed
                            ? "font-semibold text-blue-400"
                            : "text-slate-300"
                        }`}
                      >
                        <span>{speed}×</span>
                        {videoSpeed === speed && (
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))}
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
    </div>
  );
}