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
} from "lucide-react";

import SlideViewer from "@/app/components/slides/SlideViewer";
// Hook que persiste estado no localStorage (código fornecido anteriormente)
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
  isFullscreen?: boolean; // fullscreen "dentro da app"
  rotation?: 0 | 90; // rotação mobile
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
      return "bg-blue-700 hover:bg-blue-600 text-white";
    case "slide":
      return "bg-blue-700 hover:bg-blue-600 text-white";
    case "quiz":
      return "bg-blue-700 hover:bg-blue-600 text-white";
    default:
      return "bg-blue-600 hover:bg-blue-500 text-white";
  }
}

function getContentPanelTheme(type: TopicContent["type"]) {
  switch (type) {
    case "audio":
      return {
        borderClass: "border-blue-700/20",
        panelClass: "bg-blue-700/10",
        iconClass: "bg-blue-700/20 text-blue-200",
        scrollbarClass: "scrollbar-audio",
        label: "Campo de Áudio",
      };

    case "slide":
      return {
        borderClass: "border-blue-700/20",
        panelClass: "bg-blue-700/10",
        iconClass: "bg-blue-700/20 text-blue-300",
        scrollbarClass: "scrollbar-slide",
        label: "Campo de Slide",
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

/* =========================================================
   Componente principal
   ========================================================= */

export default function DisciplineClient({ discipline }: Props) {
  const chapters = discipline.chapters ?? [];

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
     Tutor IA flutuante (PERSISTENTE)
     ========================================================= */
  const [isTutorOpen, setIsTutorOpen] = useLocalStorageState<boolean>(
    `dc-tutorOpen-${discipline.id}`,
    false
  );
  const [tutorInput, setTutorInput] = useState("");
  const [tutorMessages, setTutorMessages] = useLocalStorageState<TutorMessage[]>(
    `dc-tutorMessages-${discipline.id}`,
    [
      {
        role: "assistant",
        text:
          "Olá! Sou o Tutor IA. Pergunta-me sobre este tema e eu ajudo-te com base no conteúdo da disciplina.",
      },
    ]
  );
  const [tutorContext, setTutorContext] = useLocalStorageState<TutorContext | null>(
    `dc-tutorContext-${discipline.id}`,
    null
  );

  const [tutorPosition, setTutorPosition] = useLocalStorageState(
    `dc-tutorPosition-${discipline.id}`,
    { x: 0, y: 0 }
  );
  const [hasTutorPosition, setHasTutorPosition] = useLocalStorageState<boolean>(
    `dc-hasTutorPos-${discipline.id}`,
    false
  );
  const [isDraggingTutor, setIsDraggingTutor] = useState(false);

  const tutorPanelRef = useRef<HTMLDivElement | null>(null);
  const tutorDragRef = useRef<TutorDragState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* =========================================================
     Player global (mini-player)
     ========================================================= */
  const audioPlayer = useAudioPlayer();

  /* =========================================================
     Painéis flutuantes (Slides) (PERSISTENTE)
     ========================================================= */
  const [contentPanels, setContentPanels] = useLocalStorageState<FloatingContentPanel[]>(
    `dc-contentPanels-${discipline.id}`,
    []
  );
  const [isDraggingContent, setIsDraggingContent] = useState(false);
  const contentDragRef = useRef<FloatingContentDragState | null>(null);
  const contentPanelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  /* =========================================================
     Fullscreen REAL do navegador (para slides em mobile + desktop)
     ========================================================= */
  const [browserFullscreenPanelId, setBrowserFullscreenPanelId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const onFsChange = () => {
      const el = document.fullscreenElement as HTMLElement | null;
      const id = el?.dataset?.panelId ?? null;
      setBrowserFullscreenPanelId(id);
    };

    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleBrowserFullscreen = async (panelId: string) => {
    const el = contentPanelRefs.current[panelId];
    if (!el) return;

    try {
      const current = document.fullscreenElement as HTMLElement | null;
      const currentId = current?.dataset?.panelId ?? null;

      if (currentId === panelId) {
        await document.exitFullscreen();
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      await el.requestFullscreen();
    } catch (err) {
      console.error("Falha ao alternar fullscreen:", err);
    }
  };
  
  /* =========================================================
     Auto-scroll do Tutor IA
     ========================================================= */
  useEffect(() => {
    if (isTutorOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isTutorOpen, tutorMessages]);

  /* =========================================================
     Posicionamento inicial do Tutor IA - CORRIGIDO
     ========================================================= */
  useEffect(() => {
    if (!isTutorOpen || hasTutorPosition) return;

    const timer = window.setTimeout(() => {
      const rect = tutorPanelRef.current?.getBoundingClientRect();

      // Fallback para mobile: se as dimensões não estiverem disponíveis,
      // usa uma percentagem da janela para garantir visibilidade
      const panelWidth =
        rect?.width && rect.width > 0
          ? rect.width
          : Math.min(window.innerWidth * 0.94, 672);

      const panelHeight =
        rect?.height && rect.height > 0
          ? rect.height
          : Math.min(window.innerHeight * 0.85, 520);

      // Canto inferior direito com margem segura
      const x = Math.max(8, window.innerWidth - panelWidth - 8);
      const y = Math.max(8, window.innerHeight - panelHeight - 8);

      setTutorPosition({ x, y });
      setHasTutorPosition(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isTutorOpen, hasTutorPosition]);

  /* =========================================================
     Drag do Tutor IA
     ========================================================= */
  useEffect(() => {
    if (!isDraggingTutor) return;

    const handleMove = (event: PointerEvent) => {
      if (!tutorDragRef.current || !tutorPanelRef.current) return;

      const rect = tutorPanelRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const nextX = event.clientX - tutorDragRef.current.offsetX;
      const nextY = event.clientY - tutorDragRef.current.offsetY;

      const maxX = window.innerWidth - width - 8;
      const maxY = window.innerHeight - height - 8;

      setTutorPosition({
        x: clamp(nextX, 8, Math.max(8, maxX)),
        y: clamp(nextY, 8, Math.max(8, maxY)),
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
      const width = rect.width;
      const height = rect.height;

      const nextX = event.clientX - offsetX;
      const nextY = event.clientY - offsetY;

      const maxX = window.innerWidth - width - 8;
      const maxY = window.innerHeight - height - 8;

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
    chapters.find((chapter) => chapter.id === activeChapterId) ??
    chapters[0] ??
    null;

  const stats = useMemo(() => {
    const totalChapters = chapters.length;

    const totalTopics = chapters.reduce(
      (acc, chapter) => acc + (chapter.topics?.length ?? 0),
      0
    );

    const totalContents = chapters.reduce(
      (acc, chapter) =>
        acc +
        (chapter.topics ?? []).reduce(
          (topicAcc, topic) => topicAcc + (topic.contents?.length ?? 0),
          0
        ),
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
    setHasTutorPosition(false); // força reposicionamento ao abrir
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
      prev.map((p) =>
        p.id === panelId ? { ...p, isFullscreen: !p.isFullscreen } : p
      )
    );
  };

  const rotatePanelMobile = (panelId: string) => {
    setContentPanels((prev) =>
      prev.map((p) =>
        p.id === panelId
          ? { ...p, rotation: (p.rotation ?? 0) === 0 ? 90 : 0 }
          : p
      )
    );
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

    // Slide
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
      const exists = prev.find((panel) => panel.id === panelId);
      if (exists) return [...prev.filter((p) => p.id !== panelId), exists];

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const estimatedWidth =
        viewportWidth < 768
          ? Math.min(viewportWidth * 0.92, viewportWidth - 16)
          : 544;

      const estimatedHeight = Math.min(viewportHeight * 0.78, 420);

      const offset = prev.length * 24;

      const x = clamp(
        16 + offset,
        8,
        Math.max(8, viewportWidth - estimatedWidth - 8)
      );

      const y = clamp(
        16 + offset,
        8,
        Math.max(8, viewportHeight - estimatedHeight - 8)
      );

      return [
        ...prev,
        {
          id: panelId,
          context,
          position: { x, y },
          isFullscreen: false,
          rotation: 0,
        },
      ];
    });
  };

  /* =========================================================
     Envio de mensagens do Tutor IA
     ========================================================= */
  const handleSendTutorMessage = () => {
    const trimmed = tutorInput.trim();
    if (!trimmed) return;

    const userMessage: TutorMessage = { role: "user", text: trimmed };
    setTutorMessages((prev) => [...prev, userMessage]);
    setTutorInput("");

    setTimeout(() => {
      setTutorMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Recebi a tua pergunta sobre "${
            tutorContext?.topic ?? "este tema"
          }". Em breve isto vai ser ligado à IA real com o contexto da disciplina.`,
        },
      ]);
    }, 700);
  };

  /* =========================================================
     Botões de conteúdo
     ========================================================= */
  const renderContentAction = (content: TopicContent, topicTitle: string) => {
    const Icon = getContentIcon(content.type);
    const contentButtonColor = getContentButtonClass(content.type);

    if (content.type === "quiz") {
      return (
        <Link
          key={content.id}
          href="/avaliacoes"
          className={`${actionButtonClass} ${contentButtonColor}`}
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
        className={`${actionButtonClass} ${contentButtonColor}`}
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
    const audioContents = contents.filter((c) => c.type === "audio");
    const slideContents = contents.filter((c) => c.type === "slide");
    const quizContents = contents.filter((c) => c.type === "quiz");

    return (
      <div
        className="
          grid w-full grid-cols-2 gap-2
          sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:ml-auto
        "
      >
        {audioContents.map((content) => renderContentAction(content, topic.title))}
        {slideContents.map((content) => renderContentAction(content, topic.title))}
        {quizContents.map((content) => renderContentAction(content, topic.title))}
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
            onClick={() => setIsVideoOpen(true)}
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
                <h2 className="text-lg font-semibold text-slate-200">
                  Capítulos
                </h2>
                <span className="text-xs text-slate-500">
                  Escolhe um capítulo
                </span>
              </div>

              {chapters.map((chapter) =>
                renderChapterCard(chapter, chapter.id === activeChapter?.id)
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
      <section className="hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 lg:grid lg:grid-cols-[340px_1fr] lg:h-[640px]">
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

      {/* =====================================================
          PAINÉIS FLUTUANTES (SLIDES) – OTIMIZADOS PARA MOBILE
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
                ? { left: 0, top: 0, right: 0, bottom: 0 }
                : isAppFs
                  ? { left: 8, top: 8, right: 8, bottom: 8 }
                  : { left: `${panel.position.x}px`, top: `${panel.position.y}px` }),
              zIndex: 59 + index,
            }}
            className={`
              fixed flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl
              ${
                isAnyFs
                  ? "w-auto h-auto max-w-none max-h-none resize-none"
                  : "w-[94vw] md:w-[34rem] min-w-[20rem] min-h-[16rem] max-w-[96vw] max-h-[90dvh] resize"
              }
            `}
          >
            {/* Header */}
            <div
              className={`flex items-start justify-between gap-3 border-b px-3 py-3 md:px-4 md:py-4 ${theme.borderClass}`}
            >
              <div
                className={`flex flex-1 select-none items-start gap-2 md:gap-3 ${
                  isAnyFs ? "cursor-default" : "cursor-move"
                }`}
                onPointerDown={(event) => {
                  if (isAnyFs) return;
                  if (event.button !== 0) return;

                  const panelElement = contentPanelRefs.current[panel.id];
                  if (!panelElement) return;

                  focusContentPanel(panel.id);

                  const rect = panelElement.getBoundingClientRect();
                  contentDragRef.current = {
                    panelId: panel.id,
                    offsetX: event.clientX - rect.left,
                    offsetY: event.clientY - rect.top,
                  };
                  setIsDraggingContent(true);
                }}
              >
                <div
                  className={`flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg md:rounded-xl ${theme.iconClass}`}
                >
                  <FileText size={16} className="md:size-18" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1 md:gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      {theme.label}
                    </h3>
                    {!isAnyFs && (
                      <GripVertical size={14} className="text-slate-500 hidden sm:block" />
                    )}
                  </div>

                  <p className="text-xs text-slate-400 hidden sm:block">
                    Conteúdo da aula
                  </p>

                  {!isAnyFs && (
                    <div className="mt-2 md:mt-3 space-y-1 text-[11px] text-slate-300">
                      <p>
                        <span className="text-slate-500">Disciplina:</span>{" "}
                        {panel.context.discipline}
                      </p>
                      <p>
                        <span className="text-slate-500">Capítulo:</span>{" "}
                        {panel.context.chapter}
                      </p>
                      <p>
                        <span className="text-slate-500">Tema:</span>{" "}
                        {panel.context.topic}
                      </p>
                      <p className="truncate">
                        <span className="text-slate-500">Conteúdo:</span>{" "}
                        {selectedContent.title}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 md:gap-2">
                <button
                  type="button"
                  onClick={() => rotatePanelMobile(panel.id)}
                  className="md:hidden rounded-full p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  aria-label="Rodar slide"
                >
                  <RotateCw size={20} />
                </button>

                <button
                  type="button"
                  onClick={() => void toggleBrowserFullscreen(panel.id)}
                  className="rounded-full p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  aria-label={isBrowserFs ? "Sair da tela inteira" : "Tela inteira"}
                >
                  {isBrowserFs ? <Shrink size={20} /> : <Expand size={20} />}
                </button>

                <button
                  type="button"
                  onClick={() => togglePanelFullscreen(panel.id)}
                  className="rounded-full p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  aria-label={isAppFs ? "Sair da tela inteira" : "Maximizar painel"}
                >
                  {isAppFs ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setContentPanels((prev) =>
                      prev.filter((current) => current.id !== panel.id)
                    )
                  }
                  className="rounded-full p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  aria-label="Fechar campo flutuante"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden">
              <div
                className={`${theme.scrollbarClass} h-full overflow-y-auto px-3 py-3 md:px-4 md:py-4`}
              >
                <div
                  className={`rounded-2xl border p-3 md:p-4 ${theme.borderClass} ${theme.panelClass}`}
                >
                  {!isAnyFs && (
                    <>
                      <p className="text-sm font-medium text-white">
                        {selectedContent.title}
                      </p>
                      <p className="mt-1 text-xs md:text-sm text-slate-300">
                        No mobile, podes rodar (horizontal). Também tens tela inteira.
                      </p>
                    </>
                  )}

                  {selectedContent.url ? (
                    <div className={`${isAnyFs ? "mt-0" : "mt-3 md:mt-4"}`}>
                      <SlideViewer
                        url={selectedContent.url}
                        rotation={rotation}
                        className={
                          isAnyFs
                            ? "h-[calc(100dvh-120px)]"
                            : "h-52 md:h-80"
                        }
                      />
                    </div>
                  ) : (
                    <div className="mt-3 md:mt-4 rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                      Para testar, adiciona{" "}
                      <code className="rounded bg-white/5 px-1 py-0.5 text-slate-200">
                        url
                      </code>{" "}
                      no conteúdo do{" "}
                      <code className="rounded bg-white/5 px-1 py-0.5 text-slate-200">
                        mockData.ts
                      </code>
                      .
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* =====================================================
          TUTOR IA FLUTUANTE – OTIMIZADO PARA MOBILE
          ===================================================== */}
      {isTutorOpen && (
        <div
          ref={tutorPanelRef}
          style={{ left: `${tutorPosition.x}px`, top: `${tutorPosition.y}px` }}
          className="
            fixed z-[60]
            w-[94vw] md:w-[42rem]
            min-w-[20rem] min-h-[20rem]
            max-w-[96vw] max-h-[85dvh] md:max-h-[80vh]
            resize overflow-hidden
            rounded-2xl border border-white/10 bg-slate-950 shadow-2xl
          "
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-3 py-3 md:px-4 md:py-4">
            <div
              className="flex flex-1 select-none items-start gap-2 md:gap-3 cursor-move"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                if (!tutorPanelRef.current) return;

                const rect = tutorPanelRef.current.getBoundingClientRect();
                tutorDragRef.current = {
                  offsetX: event.clientX - rect.left,
                  offsetY: event.clientY - rect.top,
                };
                setIsDraggingTutor(true);
              }}
            >
              <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg md:rounded-xl bg-violet-600/20 text-violet-400">
                <Sparkles size={16} className="md:size-18" />
              </div>

              <div>
                <div className="flex items-center gap-1 md:gap-2">
                  <h3 className="text-sm font-semibold text-white">Tutor IA</h3>
                  <GripVertical size={14} className="text-slate-500 hidden sm:block" />
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">Assistente da disciplina</p>

                {tutorContext && (
                  <div className="mt-2 md:mt-3 space-y-1 text-[11px] text-slate-300">
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

            <button
              type="button"
              onClick={() => setIsTutorOpen(false)}
              className="rounded-full p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Fechar Tutor IA"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col" style={{ height: "calc(100% - 4.5rem)" }}>
            <div className="tutor-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-3 md:px-4 md:py-4">
              {tutorMessages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
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

            <div className="border-t border-white/10 p-3 md:p-4">
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
        </div>
      )}

      {/* Modal do vídeo */}
      {isVideoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setIsVideoOpen(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Vídeo Introdutório
                </h3>
                <p className="text-sm text-slate-400">
                  Entenda o que você vai estudar!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsVideoOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Fechar vídeo"
              >
                <X size={18} />
              </button>
            </div>

            {discipline.introVideoUrl ? (
              <div className="aspect-video bg-black">
                <video
                  className="h-full w-full"
                  controls
                  autoPlay
                  src={discipline.introVideoUrl}
                />
              </div>
            ) : (
              <div className="space-y-3 p-6 text-slate-300">
                <p>Ainda não foi configurado nenhum vídeo para esta disciplina.</p>
                <p className="text-sm text-slate-500">
                  Para ativar, adiciona{" "}
                  <code className="rounded bg-white/5 px-1 py-0.5 text-slate-200">
                    introVideoUrl
                  </code>{" "}
                  no objeto da disciplina no{" "}
                  <code className="rounded bg-white/5 px-1 py-0.5 text-slate-200">
                    mockData.ts
                  </code>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}