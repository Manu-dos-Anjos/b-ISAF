"use client";

import { useAudioPlayer } from "@/app/lib/context/AudioPlayerContext";
import { useEffect, useMemo, useRef, useState } from "react";
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
        panelClass: "bg-blue-700/10",
        iconClass: "bg-blue-700/20 text-blue-200",
        scrollbarClass: type === "audio" ? "scrollbar-audio" : "scrollbar-slide",
        label: type === "audio" ? "Campo de Áudio" : "Campo de Slide",
      };
    default:
      return {
        borderClass: "border-blue-500/20",
        panelClass: "bg-blue-500/10",
        iconClass: "bg-blue-600/20 text-blue-300",
        scrollbarClass: "scrollbar-audio",
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

/* =========================================================
   Componente principal
   ========================================================= */

export default function DisciplineClient({ discipline }: Props) {
  const chapters = discipline.chapters ?? [];

  /* =========================================================
     Detecção de mobile (hidratação segura)
     ========================================================= */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* =========================================================
     Estado principal da navegação (PERSISTENTE)
     ========================================================= */
  const [activeChapterId, setActiveChapterId] = useLocalStorageState<string>(
    `dc-activeChapter-${discipline.id}`,
    chapters[0]?.id ?? ""
  );
  const [mobileView, setMobileView] = useLocalStorageState<MobileView>(
    `dc-mobileView-${discipline.id}`,
    "chapters"
  );
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  /* =========================================================
     Vídeo introdutório
     ========================================================= */
  const videoModalRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isVideoLandscape, setIsVideoLandscape] = useState(false);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [lastVideoVolume, setLastVideoVolume] = useState(1);
  const [videoMuted, setVideoMuted] = useState(false);

  /* =========================================================
     Tutor IA — estado (PERSISTENTE)
     ========================================================= */
  const [isTutorOpen, setIsTutorOpen] = useLocalStorageState<boolean>(
    `dc-tutorOpen-${discipline.id}`,
    false
  );
  const [isTutorMinimized, setIsTutorMinimized] = useLocalStorageState<boolean>(
    `dc-tutorMinimized-${discipline.id}`,
    false
  );
  const [tutorInput, setTutorInput] = useState("");
  const [tutorMessages, setTutorMessages] = useLocalStorageState<TutorMessage[]>(
    `dc-tutorMessages-${discipline.id}`,
    [
      {
        role: "assistant",
        text: "Olá! Sou o Tutor IA. Pergunta-me sobre este tema e eu ajudo-te com base no conteúdo da disciplina.",
      },
    ]
  );
  const [tutorContext, setTutorContext] = useLocalStorageState<TutorContext | null>(
    `dc-tutorContext-${discipline.id}`,
    null
  );

  /* Desktop: posição flutuante + tamanho */
  const [tutorPosition, setTutorPosition] = useLocalStorageState(
    `dc-tutorPosition-${discipline.id}`,
    { x: 0, y: 0 }
  );
  const [tutorSize, setTutorSize] = useLocalStorageState(
    `dc-tutorSize-${discipline.id}`,
    { width: 420, height: 580 }
  );
  const [hasTutorPosition, setHasTutorPosition] = useLocalStorageState<boolean>(
    `dc-hasTutorPos-${discipline.id}`,
    false
  );
  const [isTutorFullscreen, setIsTutorFullscreen] = useLocalStorageState<boolean>(
    `dc-tutorFullscreen-${discipline.id}`,
    false
  );
  const [isDraggingTutor, setIsDraggingTutor] = useState(false);
  const [isResizingTutor, setIsResizingTutor] = useState(false);

  /* Mobile: altura do bottom sheet (% de dvh) */
  const [tutorSheetHeight, setTutorSheetHeight] = useLocalStorageState<number>(
    `dc-tutorSheetH-${discipline.id}`,
    62
  );
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const sheetDragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const tutorPanelRef = useRef<HTMLDivElement | null>(null);
  const tutorDragRef = useRef<TutorDragState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* =========================================================
     Player global (mini-player)
     ========================================================= */
  const audioPlayer = useAudioPlayer();

  /* =========================================================
     Painéis flutuantes — Slides (PERSISTENTE)
     ========================================================= */
  const [contentPanels, setContentPanels] = useLocalStorageState<FloatingContentPanel[]>(
    `dc-contentPanels-${discipline.id}`,
    []
  );
  const [isDraggingContent, setIsDraggingContent] = useState(false);
  const contentDragRef = useRef<FloatingContentDragState | null>(null);
  const contentPanelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* =========================================================
     Fullscreen REAL do navegador (slides)
     ========================================================= */
  const [browserFullscreenPanelId, setBrowserFullscreenPanelId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const onFsChange = () => {
      const el = document.fullscreenElement as HTMLElement | null;

      const panelId = el?.dataset?.panelId ?? null;
      setBrowserFullscreenPanelId(panelId);

      const isVideoFs = !!el && el === videoModalRef.current;
      setIsVideoFullscreen(isVideoFs);

      if (!el) {
        setIsVideoLandscape(false);
        try {
          (screen.orientation as any)?.unlock?.();
        } catch {
          // ignore
        }
      }
    };

    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleBrowserFullscreen = async (panelId: string) => {
    const el = contentPanelRefs.current[panelId];
    if (!el) return;

    try {
      const currentId =
        (document.fullscreenElement as HTMLElement | null)?.dataset?.panelId ?? null;

      if (currentId === panelId) {
        await document.exitFullscreen();
        return;
      }

      if (document.fullscreenElement) await document.exitFullscreen();
      await el.requestFullscreen();
    } catch (err) {
      console.error("Falha ao alternar fullscreen:", err);
    }
  };

  /* =========================================================
     Helpers do vídeo introdutório
     ========================================================= */
  const closeVideo = async () => {
    try {
      const video = videoRef.current;
      if (video) {
        video.pause();
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    } finally {
      try {
        (screen.orientation as any)?.unlock?.();
      } catch {
        // ignore
      }

      setIsVideoLandscape(false);
      setIsVideoFullscreen(false);
      setIsVideoOpen(false);
    }
  };

  const toggleVideoPlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (err) {
      console.error("Falha ao reproduzir/pausar o vídeo:", err);
    }
  };

  const seekVideo = (nextTime: number) => {
    const video = videoRef.current;
    if (!video) return;

    const clamped = clamp(nextTime, 0, Math.max(0, videoDuration || 0));
    video.currentTime = clamped;
    setVideoCurrentTime(clamped);
  };

  const skipVideo = (delta: number) => {
    seekVideo(videoCurrentTime + delta);
  };

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

  const toggleVideoFullscreen = async () => {
    if (!videoModalRef.current) return;

    try {
      const fsEl = document.fullscreenElement as HTMLElement | null;

      if (fsEl === videoModalRef.current) {
        await document.exitFullscreen();
        return;
      }

      if (fsEl) {
        await document.exitFullscreen();
      }

      await videoModalRef.current.requestFullscreen();
    } catch (err) {
      console.error("Falha ao alternar fullscreen do vídeo:", err);
    }
  };

  const toggleVideoLandscape = async () => {
    const next = !isVideoLandscape;
    setIsVideoLandscape(next);

    try {
      if (next) {
        if (!document.fullscreenElement && videoModalRef.current) {
          await videoModalRef.current.requestFullscreen();
        } else if (
          document.fullscreenElement &&
          document.fullscreenElement !== videoModalRef.current
        ) {
          await document.exitFullscreen();
          if (videoModalRef.current) {
            await videoModalRef.current.requestFullscreen();
          }
        }

        await (screen.orientation as any)?.lock?.("landscape");
      } else {
        if (document.fullscreenElement === videoModalRef.current) {
          await document.exitFullscreen();
        }
        (screen.orientation as any)?.unlock?.();
      }
    } catch {
      // Alguns browsers mobile não suportam lock de orientação.
      // A UI continua a funcionar em fullscreen.
    }
  };

  /* =========================================================
     Auto-scroll do Tutor IA
     ========================================================= */
  useEffect(() => {
    if (isTutorOpen && !isTutorMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isTutorOpen, isTutorMinimized, tutorMessages]);

  /* =========================================================
     Sincronizar vídeo quando abrir
     ========================================================= */
  useEffect(() => {
    if (!isVideoOpen) return;

    setVideoReady(false);
    setVideoPlaying(false);
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setVideoMuted(false);
    setVideoVolume(1);

    const video = videoRef.current;
    if (!video) return;

    const sync = () => {
      setVideoCurrentTime(video.currentTime || 0);
      setVideoDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setVideoVolume(video.volume);
      setVideoMuted(video.muted || video.volume === 0);
      setVideoPlaying(!video.paused);
      setVideoReady(true);
    };

    const onLoadedMetadata = () => {
      setVideoDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setVideoReady(true);
    };

    const onTimeUpdate = () => setVideoCurrentTime(video.currentTime || 0);
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
    const onError = () => setVideoReady(true);

    sync();

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
  }, [isVideoOpen]);

  /* =========================================================
     Posicionamento inicial do Tutor IA (desktop)
     ========================================================= */
  useEffect(() => {
    if (!isTutorOpen || hasTutorPosition || isMobile) return;

    const timer = window.setTimeout(() => {
      const panelWidth = tutorSize.width;
      const panelHeight = isTutorMinimized ? 60 : tutorSize.height;
      const x = Math.max(16, window.innerWidth - panelWidth - 16);
      const y = Math.max(16, window.innerHeight - panelHeight - 16);
      setTutorPosition({ x, y });
      setHasTutorPosition(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isTutorOpen, hasTutorPosition, isMobile, tutorSize, isTutorMinimized]);

  /* =========================================================
     Sincronizar tamanho do tutor quando redimensionado manualmente (desktop)
     ========================================================= */
  useEffect(() => {
    if (isMobile || !isTutorOpen || isTutorFullscreen || isTutorMinimized) return;

    const observer = new ResizeObserver((entries) => {
      if (isResizingTutor) return;

      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const newWidth = Math.round(width);
          const newHeight = Math.round(height);

          if (
            Math.abs(newWidth - tutorSize.width) > 5 ||
            Math.abs(newHeight - tutorSize.height) > 5
          ) {
            setTutorSize({ width: newWidth, height: newHeight });
          }
        }
      }
    });

    if (tutorPanelRef.current) {
      observer.observe(tutorPanelRef.current);
    }

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

  /* =========================================================
     Drag do Tutor IA (desktop)
     ========================================================= */
  useEffect(() => {
    if (!isDraggingTutor) return;

    const handleMove = (event: PointerEvent) => {
      if (!tutorDragRef.current || !tutorPanelRef.current) return;
      const rect = tutorPanelRef.current.getBoundingClientRect();
      const nextX = event.clientX - tutorDragRef.current.offsetX;
      const nextY = event.clientY - tutorDragRef.current.offsetY;
      const maxX = window.innerWidth - rect.width - 16;
      const maxY = window.innerHeight - rect.height - 16;
      setTutorPosition({
        x: clamp(nextX, 16, Math.max(16, maxX)),
        y: clamp(nextY, 16, Math.max(16, maxY)),
      });
    };

    const handleUp = () => {
      setIsDraggingTutor(false);
      tutorDragRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [isDraggingTutor]);

  /* =========================================================
     Drag do Bottom Sheet do Tutor IA (mobile)
     ========================================================= */
  useEffect(() => {
    if (!isDraggingSheet) return;

    const handleMove = (e: PointerEvent) => {
      if (!sheetDragRef.current) return;
      const dy = sheetDragRef.current.startY - e.clientY;
      const dvh = window.innerHeight / 100;
      const newH = sheetDragRef.current.startHeight + dy / dvh;
      setTutorSheetHeight(clamp(newH, 28, 92));
    };

    const handleUp = () => {
      setIsDraggingSheet(false);
      sheetDragRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [isDraggingSheet]);

  /* =========================================================
     Drag dos painéis de slide
     ========================================================= */
  useEffect(() => {
    if (!isDraggingContent) return;

    const handleMove = (event: PointerEvent) => {
      if (!contentDragRef.current) return;
      const { panelId, offsetX, offsetY } = contentDragRef.current;
      const panelElement = contentPanelRefs.current[panelId];
      if (!panelElement) return;
      const rect = panelElement.getBoundingClientRect();
      const nextX = event.clientX - offsetX;
      const nextY = event.clientY - offsetY;
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      setContentPanels((prev) =>
        prev.map((panel) =>
          panel.id === panelId
            ? {
                ...panel,
                position: {
                  x: clamp(nextX, 8, Math.max(8, maxX)),
                  y: clamp(nextY, 8, Math.max(8, maxY)),
                },
              }
            : panel
        )
      );
    };

    const handleUp = () => {
      setIsDraggingContent(false);
      contentDragRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [isDraggingContent]);

  /* =========================================================
     Capítulo ativo e estatísticas
     ========================================================= */
  const activeChapter =
    chapters.find((chapter) => chapter.id === activeChapterId) ?? chapters[0] ?? null;

  const stats = useMemo(() => {
    const totalChapters = chapters.length;
    const totalTopics = chapters.reduce((acc, ch) => acc + (ch.topics?.length ?? 0), 0);
    const totalContents = chapters.reduce(
      (acc, ch) =>
        acc + (ch.topics ?? []).reduce((tAcc, t) => tAcc + (t.contents?.length ?? 0), 0),
      0
    );
    return { totalChapters, totalTopics, totalContents };
  }, [chapters]);

  /* =========================================================
     Tutor IA: abertura
     ========================================================= */
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

  /* =========================================================
     Focar painel (trazer para frente)
     ========================================================= */
  const focusContentPanel = (panelId: string) => {
    setContentPanels((prev) => {
      const found = prev.find((panel) => panel.id === panelId);
      if (!found) return prev;
      return [...prev.filter((panel) => panel.id !== panelId), found];
    });
  };

  /* =========================================================
     Fullscreen dentro da app + rotação mobile
     ========================================================= */
  const togglePanelFullscreen = (panelId: string) => {
    setContentPanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, isFullscreen: !p.isFullscreen } : p))
    );
  };

  const rotatePanelMobile = (panelId: string) => {
    setContentPanels((prev) =>
      prev.map((p) =>
        p.id === panelId ? { ...p, rotation: (p.rotation ?? 0) === 0 ? 90 : 0 } : p
      )
    );
  };

  /* =========================================================
     Tamanhos predefinidos do Tutor (desktop)
     ========================================================= */
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

  /* =========================================================
     Toggle fullscreen do Tutor (desktop)
     ========================================================= */
  const toggleTutorFullscreen = () => {
    setIsTutorFullscreen((prev) => !prev);
    if (isTutorMinimized) setIsTutorMinimized(false);
  };

  /* =========================================================
     Toggle minimize do Tutor
     ========================================================= */
  const toggleTutorMinimize = () => {
    setIsTutorMinimized((prev) => !prev);
    if (isTutorFullscreen) setIsTutorFullscreen(false);
  };

  /* =========================================================
     Abrir conteúdo
     ========================================================= */
  const openContent = (content: TopicContent, topicTitle: string) => {
    if (content.type === "audio") {
      if (!content.url) {
        alert("Este áudio ainda não tem URL configurada no mockData.");
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

    const panelId = [discipline.id, activeChapter?.id ?? "chapter", topicTitle, content.id].join(
      "-"
    );
    const context: ContentPanelContext = {
      discipline: discipline.title,
      chapter: activeChapter?.title ?? "",
      topic: topicTitle,
      content,
    };

    setContentPanels((prev) => {
      const exists = prev.find((panel) => panel.id === panelId);
      if (exists) return [...prev.filter((p) => p.id !== panelId), exists];

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const estimatedW = vw < 768 ? Math.min(vw * 0.92, vw - 16) : 544;
      const estimatedH = Math.min(vh * 0.78, 420);
      const offset = prev.length * 24;
      const x = clamp(16 + offset, 8, Math.max(8, vw - estimatedW - 8));
      const y = clamp(16 + offset, 8, Math.max(8, vh - estimatedH - 8));

      return [
        ...prev,
        { id: panelId, context, position: { x, y }, isFullscreen: false, rotation: 0 },
      ];
    });
  };

  /* =========================================================
     Envio de mensagens do Tutor IA
     ========================================================= */
  const handleSendTutorMessage = () => {
    const trimmed = tutorInput.trim();
    if (!trimmed) return;
    setTutorMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setTutorInput("");
    setTimeout(() => {
      setTutorMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Recebi a tua pergunta sobre "${tutorContext?.topic ?? "este tema"}". Em breve isto vai ser ligado à IA real com o contexto da disciplina.`,
        },
      ]);
    }, 700);
  };

  /* =========================================================
     Render: botões de conteúdo
     ========================================================= */
  const renderContentAction = (content: TopicContent, topicTitle: string) => {
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
          <Icon size={14} />
          Questionário
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
        <Icon size={14} />
        {content.type === "audio" ? "Áudio" : "Slide"}
      </button>
    );
  };

  const renderTutorButton = (topicTitle: string) => (
    <button
      key={`tutor-${topicTitle}`}
      type="button"
      onClick={() => openTutor(topicTitle)}
      className={`${actionButtonClass} bg-violet-600 hover:bg-violet-500 text-white`}
      title="Abrir Tutor IA"
    >
      <Sparkles size={14} />
      Tutor IA
    </button>
  );

  const renderTopicActions = (topic: Topic) => {
    const contents = topic.contents ?? [];
    const audioC = contents.filter((c) => c.type === "audio");
    const slideC = contents.filter((c) => c.type === "slide");
    const quizC = contents.filter((c) => c.type === "quiz");
    return (
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:ml-auto">
        {audioC.map((c) => renderContentAction(c, topic.title))}
        {slideC.map((c) => renderContentAction(c, topic.title))}
        {quizC.map((c) => renderContentAction(c, topic.title))}
        {renderTutorButton(topic.title)}
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
            className={`mt-1 shrink-0 ${isActive ? "text-blue-300" : "text-slate-500"}`}
          />
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-linear-to-r from-blue-500 to-indigo-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </button>
    );
  };

  /* =========================================================
     Conteúdo do Tutor IA (partilhado mobile/desktop)
     ========================================================= */
  const renderTutorBody = () => (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="tutor-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-3 md:px-4 md:py-4">
        {tutorMessages.map((message, idx) => (
          <div key={idx} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                message.role === "user"
                  ? "rounded-br-none bg-blue-600 text-white"
                  : "rounded-bl-none bg-white/5 text-slate-200"
              }`}
            >
              {message.text}
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
            className="inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500"
            aria-label="Enviar pergunta"
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
          isDraggable && !isTutorFullscreen ? "cursor-move" : "cursor-default"
        }`}
        onPointerDown={
          isDraggable && !isTutorFullscreen
            ? (event) => {
                if (event.button !== 0 || !tutorPanelRef.current) return;
                const rect = tutorPanelRef.current.getBoundingClientRect();
                tutorDragRef.current = {
                  offsetX: event.clientX - rect.left,
                  offsetY: event.clientY - rect.top,
                };
                setIsDraggingTutor(true);
              }
            : undefined
        }
      >
        <div className="shrink-0 flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg md:rounded-xl bg-violet-600/20 text-violet-400">
          <Sparkles size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 md:gap-2">
            <h3 className="text-sm font-semibold text-white">Tutor IA</h3>
            {isDraggable && !isTutorFullscreen && !isTutorMinimized && (
              <GripVertical size={14} className="hidden text-slate-500 sm:block" />
            )}
          </div>
          {!isTutorMinimized && (
            <p className="hidden text-xs text-slate-400 sm:block">Assistente da disciplina</p>
          )}

          {tutorContext && !isTutorFullscreen && !isTutorMinimized && (
            <div className="mt-2 space-y-1 text-[11px] text-slate-300 md:mt-3">
              <p>
                <span className="text-slate-500">Disciplina:</span> {tutorContext.discipline}
              </p>
              <p>
                <span className="text-slate-500">Capítulo:</span> {tutorContext.chapter}
              </p>
              <p>
                <span className="text-slate-500">Tema:</span> {tutorContext.topic}
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
            aria-label={isTutorFullscreen ? "Sair do modo expandido" : "Expandir"}
          >
            {isTutorFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        )}
        {!isMobile && (
          <button
            type="button"
            onClick={toggleTutorMinimize}
            className="rounded-full p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label={isTutorMinimized ? "Expandir" : "Minimizar"}
          >
            {isTutorMinimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsTutorOpen(false)}
          className="rounded-full p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Fechar Tutor IA"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );

  /* =========================================================
     Estado vazio
     ========================================================= */
  if (chapters.length === 0) {
    return (
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-5">
          <div className="absolute inset-0">
            {discipline.coverUrl ? (
              <Image
                src={discipline.coverUrl}
                alt={`Imagem de fundo de ${discipline.title}`}
                fill
                className="object-cover opacity-20"
              />
            ) : (
              <div className="h-full w-full bg-linear-to-br from-slate-800 to-slate-950" />
            )}
          </div>
          <div className="absolute inset-0 bg-linear-to-r from-slate-950/92 via-slate-950/80 to-slate-950/35" />
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
     Render principal
     ========================================================= */
  return (
    <div className="space-y-6">
      {/* Cabeçalho principal */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45 p-5">
        <div className="absolute inset-0">
          {discipline.coverUrl ? (
            <Image
              src={discipline.coverUrl}
              alt={`Imagem de fundo de ${discipline.title}`}
              fill
              className="object-cover opacity-20"
            />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-slate-800 to-slate-950" />
          )}
        </div>
        <div className="absolute inset-0 bg-linear-to-r from-slate-950/92 via-slate-950/80 to-slate-950/35" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-blue-400">
              {discipline.year} · {discipline.semester}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">{discipline.title}</h1>
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
              setIsVideoFullscreen(false);
              setVideoReady(false);
              setVideoPlaying(false);
              setVideoCurrentTime(0);
              setIsVideoOpen(true);
            }}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <PlayCircle size={18} />
            Reproduzir vídeo
          </button>
        </div>
      </section>

      {/* MOBILE */}
      <section className="lg:hidden">
        <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setMobileView("chapters")}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                mobileView === "chapters"
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              Capítulos
            </button>
            <button
              type="button"
              onClick={() => setMobileView("topics")}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                mobileView === "topics"
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              Temas
            </button>
          </div>

          {mobileView === "chapters" ? (
            <div className="mt-4 space-y-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-200">Capítulos</h2>
                <span className="text-xs text-slate-500">Escolhe um capítulo</span>
              </div>
              {chapters.map((chapter) => renderChapterCard(chapter, chapter.id === activeChapter?.id))}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-slate-100">
                    {activeChapter?.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {activeChapter?.status} · {activeChapter?.topics?.length ?? 0} temas
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
                  <article key={topic.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-semibold text-slate-200">
                        {index + 1}
                      </div>
                      <h3 className="text-base font-medium leading-snug text-white">{topic.title}</h3>
                    </div>
                    {renderTopicActions(topic)}
                  </article>
                ))}
                {(!activeChapter?.topics || activeChapter.topics.length === 0) && (
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
      <section className="hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 lg:grid lg:grid-cols-[340px_1fr] lg:h-160">
        <aside className="scrollbar-theme border-b border-white/10 p-5 lg:h-full lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-white/10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">Capítulos</h2>
            <span className="text-xs text-slate-500">Lista fixa</span>
          </div>
          <div className="space-y-3">
            {chapters.map((chapter: Chapter) =>
              renderChapterCard(chapter, chapter.id === activeChapter?.id)
            )}
          </div>
        </aside>

        <main className="scrollbar-theme h-full overflow-y-auto p-5">
          <div className="mb-4 border-b border-white/10 pb-3">
            <h2 className="text-lg font-semibold text-slate-100">{activeChapter?.title}</h2>
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
                    <h3 className="text-base font-medium leading-snug text-white">{topic.title}</h3>
                  </div>
                </div>
                {renderTopicActions(topic)}
              </article>
            ))}
          </div>
        </main>
      </section>

      {/* =====================================================
          PAINÉIS FLUTUANTES (SLIDES)
          ===================================================== */}
      {contentPanels.map((panel, index) => {
        const theme = getContentPanelTheme(panel.context.content.type);
        const selectedContent = panel.context.content;

        const isBrowserFs = browserFullscreenPanelId === panel.id;
        const isAppFs = !!panel.isFullscreen;
        const isAnyFs = isBrowserFs || isAppFs;
        const rotation: 0 | 90 = panel.rotation ?? 0;

        return (
          <div
            key={panel.id}
            data-panel-id={panel.id}
            ref={(el) => {
              contentPanelRefs.current[panel.id] = el;
            }}
            style={{
              ...(isBrowserFs
                ? {
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
                  }
                : isAppFs
                ? {
                    left: 8,
                    top: 8,
                    right: 8,
                    bottom: 8,
                  }
                : {
                    left: `${panel.position.x}px`,
                    top: `${panel.position.y}px`,
                  }),
              zIndex: 59 + index,
            }}
            className={`
              fixed flex flex-col overflow-hidden
              rounded-3xl border border-white/10
              bg-slate-950/95 backdrop-blur-xl
              shadow-[0_25px_80px_rgba(0,0,0,0.55)]
              ${
                isAnyFs
                  ? "w-auto h-auto max-w-none max-h-none"
                  : "w-[94vw] md:w-136 min-w-80 min-h-64 max-w-[96vw] max-h-[90dvh] resize"
              }
            `}
          >
            {/* Glow suave */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-violet-500/[0.04]" />

            {/* HEADER */}
            <div
              className={`
                relative shrink-0 flex items-center justify-between gap-3
                border-b px-3 py-2.5 md:px-4 md:py-3
                ${theme.borderClass}
              `}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent" />

              <div
                className={`
                  relative z-10 flex flex-1 min-w-0 select-none items-center gap-3
                  ${isAnyFs ? "cursor-default" : "cursor-move"}
                `}
                onPointerDown={(event) => {
                  if (isAnyFs || event.button !== 0) return;

                  const panelEl = contentPanelRefs.current[panel.id];
                  if (!panelEl) return;

                  focusContentPanel(panel.id);

                  const rect = panelEl.getBoundingClientRect();
                  contentDragRef.current = {
                    panelId: panel.id,
                    offsetX: event.clientX - rect.left,
                    offsetY: event.clientY - rect.top,
                  };

                  setIsDraggingContent(true);
                }}
              >
                <div
                  className={`
                    flex h-8 w-8 shrink-0 items-center justify-center
                    rounded-xl border border-white/10
                    ${theme.iconClass}
                  `}
                >
                  <FileText size={15} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {selectedContent.title}
                    </h3>

                    {!isAnyFs && (
                      <GripVertical size={13} className="hidden shrink-0 text-slate-500 sm:block" />
                    )}
                  </div>

                  {!isAnyFs && (
                    <p className="truncate text-[11px] text-slate-500">
                      {panel.context.discipline} · {panel.context.chapter}
                    </p>
                  )}
                </div>
              </div>

              <div className="relative z-10 flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => rotatePanelMobile(panel.id)}
                  className="
                    rounded-xl p-2 text-slate-400 transition
                    hover:bg-white/5 hover:text-white md:hidden
                  "
                  aria-label="Rodar slide"
                  title="Rodar slide"
                >
                  <RotateCw size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => void toggleBrowserFullscreen(panel.id)}
                  className="
                    rounded-xl p-2 text-slate-400 transition
                    hover:bg-white/5 hover:text-white
                  "
                  aria-label={isBrowserFs ? "Sair do ecrã inteiro" : "Ecrã inteiro"}
                  title={isBrowserFs ? "Sair do ecrã inteiro" : "Ecrã inteiro"}
                >
                  {isBrowserFs ? <Shrink size={16} /> : <Expand size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => togglePanelFullscreen(panel.id)}
                  className="
                    rounded-xl p-2 text-slate-400 transition
                    hover:bg-white/5 hover:text-white
                  "
                  aria-label={isAppFs ? "Restaurar" : "Maximizar"}
                  title={isAppFs ? "Restaurar" : "Maximizar"}
                >
                  {isAppFs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setContentPanels((prev) => prev.filter((p) => p.id !== panel.id))
                  }
                  className="
                    rounded-xl p-2 text-slate-400 transition
                    hover:bg-white/5 hover:text-red-400
                  "
                  aria-label="Fechar painel"
                  title="Fechar painel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="relative flex-1 min-h-0 overflow-hidden bg-black">
              {selectedContent.url ? (
                <SlideViewer url={selectedContent.url} rotation={rotation} />
              ) : (
                <div className="flex h-full items-center justify-center p-6">
                  <div
                    className="
                      max-w-md space-y-4 rounded-3xl
                      border border-dashed border-white/10
                      bg-white/[0.03]
                      p-6 text-center
                      backdrop-blur-sm
                    "
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500">
                      <FileText size={28} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-200">Slide não disponível</p>
                      <p className="text-xs leading-relaxed text-slate-500">
                        Este conteúdo ainda não possui um ficheiro associado.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left text-xs text-slate-400">
                      Adiciona{" "}
                      <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">
                        url
                      </code>{" "}
                      no conteúdo do{" "}
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

      {/* =====================================================
          TUTOR IA — MOBILE: bottom sheet | DESKTOP: painel flutuante
          ===================================================== */}
      {isTutorOpen && (
        <>
          {/* MOBILE bottom sheet */}
          {isMobile && (
            <>
              <div
                className="fixed inset-0 z-59 bg-black/50"
                onClick={() => setIsTutorOpen(false)}
              />

              <div
                ref={tutorPanelRef}
                style={{ height: `${tutorSheetHeight}dvh` }}
                className="fixed bottom-0 left-0 right-0 z-60 flex flex-col overflow-hidden rounded-t-2xl border-t border-x border-white/10 bg-slate-950 shadow-2xl"
              >
                <div
                  className="flex touch-none select-none justify-center py-2.5 cursor-ns-resize"
                  onPointerDown={(e) => {
                    sheetDragRef.current = { startY: e.clientY, startHeight: tutorSheetHeight };
                    setIsDraggingSheet(true);
                  }}
                >
                  <div className="h-1 w-10 rounded-full bg-white/25 transition-colors hover:bg-white/40" />
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
                      {h === 35 ? "Pequeno" : h === 62 ? "Médio" : "Grande"}
                    </button>
                  ))}
                </div>

                {renderTutorHeader(false)}
                {renderTutorBody()}
              </div>
            </>
          )}

          {/* DESKTOP painel flutuante */}
          {!isMobile && (
            <div
              ref={tutorPanelRef}
              style={
                isTutorFullscreen
                  ? { left: 16, top: 16, right: 16, bottom: 16, width: "auto", height: "auto" }
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
              className={`
                fixed z-60 flex flex-col
                overflow-hidden
                rounded-2xl border border-white/10 bg-slate-950 shadow-2xl
                ${
                  isTutorFullscreen
                    ? "max-w-none max-h-none"
                    : isTutorMinimized
                    ? "resize-none"
                    : "resize min-w-[340px] min-h-[450px] max-w-[90vw] max-h-[90vh]"
                }
              `}
            >
              {renderTutorHeader(true)}

              {!isTutorFullscreen && !isTutorMinimized && (
                <div className="shrink-0 flex justify-center gap-2 border-b border-white/10 px-4 py-2">
                  {tutorSizePresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyTutorSizePreset(preset.width, preset.height)}
                      className={`rounded-full px-3 py-1 text-[10px] font-medium transition ${
                        Math.abs(tutorSize.width - preset.width) < 20 &&
                        Math.abs(tutorSize.height - preset.height) < 20
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

     {/* =====================================================
    MODAL DO VÍDEO INTRODUTÓRIO
    ===================================================== */}
{isVideoOpen && (
  <div
    className={`fixed inset-0 z-[120] bg-black/85 backdrop-blur-md overflow-hidden ${
      isVideoLandscape || isVideoFullscreen
        ? "p-0"
        : "flex items-center justify-center p-3 md:p-4"
    }`}
    onClick={() => void closeVideo()}
  >
    <div
      ref={videoModalRef}
      onClick={(e) => e.stopPropagation()}
      className={`
        relative flex flex-col overflow-hidden border border-white/10 bg-slate-950 shadow-2xl
        ${
          isVideoLandscape || isVideoFullscreen
            ? "h-[100dvh] w-[100dvw] max-w-none rounded-none"
            : "w-full max-w-6xl max-h-[92dvh] rounded-3xl"
        }
      `}
    >
      {/* Header */}
      <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
              <PlayCircle size={18} />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white md:text-base">
                Vídeo Introdutório
              </h3>
              <p className="truncate text-xs text-slate-400 md:text-sm">
                {discipline.title}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleVideoLandscape()}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition md:hidden ${
              isVideoLandscape
                ? "border-blue-500/30 bg-blue-500/15 text-blue-200"
                : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
            aria-label={
              isVideoLandscape ? "Sair do modo horizontal" : "Modo horizontal"
            }
          >
            <RotateCw size={14} />
            {isVideoLandscape ? "Vertical" : "Horizontal"}
          </button>

          <button
            type="button"
            onClick={() => void toggleVideoFullscreen()}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label={isVideoFullscreen ? "Sair do ecrã inteiro" : "Ecrã inteiro"}
            title={isVideoFullscreen ? "Sair do ecrã inteiro" : "Ecrã inteiro"}
          >
            {isVideoFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button
            type="button"
            onClick={() => void closeVideo()}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Fechar vídeo"
            title="Fechar vídeo"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {discipline.introVideoUrl ? (
        <>
          {/* Área do vídeo */}
          <div
            className={`
              relative min-h-0 bg-black
              ${
                isVideoLandscape || isVideoFullscreen
                  ? "flex-1 overflow-hidden"
                  : "aspect-video"
              }
            `}
          >
            {/* Loading */}
            {!videoReady && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-xs font-medium text-slate-400">
                    A carregar vídeo...
                  </p>
                </div>
              </div>
            )}

            <video
              ref={videoRef}
              className="h-full w-full bg-black object-contain"
              playsInline
              preload="metadata"
              controls={false}
              src={discipline.introVideoUrl}
              onError={() => setVideoReady(true)}
            />

            {/* Controlos overlay no modo horizontal/fullscreen */}
            {(isVideoLandscape || isVideoFullscreen) && (
              <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleVideoPlay()}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500"
                      aria-label={videoPlaying ? "Pausar" : "Reproduzir"}
                    >
                      {videoPlaying ? <Pause size={16} /> : <PlayCircle size={16} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => skipVideo(-15)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                      aria-label="Voltar 15 segundos"
                    >
                      <SkipBack size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => skipVideo(15)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                      aria-label="Avançar 15 segundos"
                    >
                      <SkipForward size={16} />
                    </button>

                    <div className="ml-auto text-right text-[11px] tabular-nums text-slate-400">
                      <span>{formatTime(videoCurrentTime)}</span>
                      <span className="mx-1 text-slate-600">/</span>
                      <span>{videoDuration ? formatTime(videoDuration) : "--:--"}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, videoDuration || 0)}
                      value={videoCurrentTime}
                      onChange={(e) => seekVideo(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-blue-600"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={toggleVideoMute}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-slate-200 transition hover:bg-white/10"
                      aria-label={
                        videoMuted || videoVolume === 0 ? "Ativar som" : "Silenciar"
                      }
                    >
                      {videoMuted || videoVolume === 0 ? (
                        <>
                          <VolumeX size={16} />
                          <span className="text-xs">Sem som</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={16} />
                          <span className="text-xs">Som</span>
                        </>
                      )}
                    </button>

                    <span className="text-[11px] text-slate-500">
                      Volume oculto
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controlos normais no modo portrait */}
          {!isVideoLandscape && !isVideoFullscreen && (
            <div className="shrink-0 border-t border-white/10 bg-slate-950/90 px-4 py-3 md:px-6 md:py-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleVideoPlay()}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500"
                    aria-label={videoPlaying ? "Pausar" : "Reproduzir"}
                  >
                    {videoPlaying ? <Pause size={18} /> : <PlayCircle size={18} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => skipVideo(-15)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                    aria-label="Voltar 15 segundos"
                  >
                    <SkipBack size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => skipVideo(15)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                    aria-label="Avançar 15 segundos"
                  >
                    <SkipForward size={18} />
                  </button>

                  <div className="ml-auto text-right text-[11px] tabular-nums text-slate-400">
                    <span>{formatTime(videoCurrentTime)}</span>
                    <span className="mx-1 text-slate-600">/</span>
                    <span>{videoDuration ? formatTime(videoDuration) : "--:--"}</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={Math.max(0, videoDuration || 0)}
                  value={videoCurrentTime}
                  onChange={(e) => seekVideo(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-blue-600"
                />

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleVideoMute}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-slate-200 transition hover:bg-white/10"
                    aria-label={
                      videoMuted || videoVolume === 0 ? "Ativar som" : "Silenciar"
                    }
                  >
                    {videoMuted || videoVolume === 0 ? (
                      <>
                        <VolumeX size={16} />
                        <span className="text-xs">Sem som</span>
                      </>
                    ) : (
                      <>
                        <Volume2 size={16} />
                        <span className="text-xs">Som</span>
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-slate-500">
                    Volume oculto
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 md:p-10">
          <div className="max-w-md space-y-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500">
              <PlayCircle size={28} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-200">
                Vídeo não disponível
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                Ainda não foi configurado nenhum vídeo introdutório para esta disciplina.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left text-xs text-slate-400">
              Adiciona{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">
                introVideoUrl
              </code>{" "}
              no objeto da disciplina no{" "}
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
)}
    </div>
  );
}