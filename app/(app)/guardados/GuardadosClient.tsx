// app/guardados/GuardadosClient.tsx
"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Search,
  Filter,
  BookOpen,
  Headphones,
  FileText,
  Trophy,
  PlayCircle,
  ChevronRight,
  ChevronDown,
  Trash2,
  ExternalLink,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
  Expand,
  Shrink,
} from "lucide-react";
import type { Profile } from "@/src/types/database";
import { removeSavedItem, type SavedItem } from "@/app/actions/saved";
import { useAudioPlayer } from "@/app/lib/context/AudioPlayerContext";
import SlideViewer from "@/app/components/slides/SlideViewer";
import QuizPlayer from "@/app/components/quiz/QuizPlayer";

type Discipline = { id: string; name: string };

type Props = {
  profile: Profile;
  savedItems: SavedItem[];
  disciplines: Discipline[];
};

/* ================================================================
   CONSTANTES
================================================================ */

const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 2;
const ZOOM_STEP = 0.1;

const SCROLLBAR_X = [
  "scrollbar-thin",
  "scrollbar-track-transparent",
  "[&::-webkit-scrollbar]:h-1",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-slate-300/60",
  "dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/40",
  "hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/70",
  "dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/60",
].join(" ");

const CONTENT_META: Record<
  SavedItem["type"],
  { icon: typeof Headphones; label: string; colorClasses: string }
> = {
  audio: {
    icon: Headphones,
    label: "Áudio",
    colorClasses:
      "border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
  },
  slide: {
    icon: FileText,
    label: "Slide",
    colorClasses:
      "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  quiz: {
    icon: Trophy,
    label: "Quiz",
    colorClasses:
      "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  },
  interactive: {
    icon: PlayCircle,
    label: "Interativo",
    colorClasses:
      "border-violet-300 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
  },
};

/* ================================================================
   ZOOM CONTROLS (reutilizado do DisciplineClient)
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
   COMPONENTE PRINCIPAL
================================================================ */

export default function GuardadosClient({
  profile,
  savedItems: initialItems,
  disciplines,
}: Props) {
  const router      = useRouter();
  const audioPlayer = useAudioPlayer();

  const [items, setItems]               = useState<SavedItem[]>(initialItems);
  const [search, setSearch]             = useState("");
  const [filterDisc, setFilterDisc]     = useState<string>("all");
  const [filterType, setFilterType]     = useState<string>("all");
  const [removingId, setRemovingId]     = useState<string | null>(null);
  const [expandedDisc, setExpandedDisc] = useState<Record<string, boolean>>({});

  /* ── Slide modal ── */
  const [activeSlide, setActiveSlide]         = useState<SavedItem | null>(null);
  const [slideZoom, setSlideZoom]             = useState(1);
  const [slideFullscreen, setSlideFullscreen] = useState(false);

  /* ── Quiz modal ── */
  const [activeQuiz, setActiveQuiz] = useState<SavedItem | null>(null);

  const firstName = profile.full_name?.trim().split(/\s+/)[0] ?? "Aluno";

  const handleRemove = useCallback(async (savedId: string) => {
    setRemovingId(savedId);
    await removeSavedItem(savedId);
    setItems((prev) => prev.filter((i) => i.savedId !== savedId));
    setRemovingId(null);
  }, []);

  const openItem = useCallback(
    (item: SavedItem) => {
      if (item.type === "audio") {
        if (!item.fileUrl) {
          alert("Este áudio ainda não tem ficheiro associado.");
          return;
        }
        void audioPlayer.play({
  id:         item.contentId,
  title:      item.title,
  url:        item.fileUrl,
  discipline: item.disciplineName,
  chapter:    item.chapterTitle,
  topic:      item.topicTitle,   // ← agora disponível
  coverUrl:   item.disciplineCoverUrl ?? undefined, 
});
        return;
      }

      if (item.type === "slide") {
        if (!item.fileUrl) {
          alert("Este slide ainda não tem ficheiro associado.");
          return;
        }
        setSlideZoom(1);
        setSlideFullscreen(false);
        setActiveSlide(item);
        return;
      }

      if (item.type === "quiz") {
        setActiveQuiz(item);
        return;
      }

      // Interativo — sem viewer dedicado ainda
      router.push(`/disciplinas/${item.disciplineId}`);
    },
    [audioPlayer, router]
  );

  const closeSlide = useCallback(() => {
    setActiveSlide(null);
    setSlideZoom(1);
    setSlideFullscreen(false);
  }, []);

  const adjustZoom = (delta: number) =>
    setSlideZoom((z) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100))
    );

  const isDiscOpen = (discId: string, index: number) =>
    expandedDisc[discId] ?? index === 0;

  const toggleDisc = (id: string, index: number) =>
    setExpandedDisc((prev) => ({ ...prev, [id]: !isDiscOpen(id, index) }));

  /* ── Filtros ── */
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = search.trim().toLowerCase();
      if (
        term &&
        !item.title.toLowerCase().includes(term) &&
        !item.chapterTitle.toLowerCase().includes(term)
      )
        return false;
      if (filterDisc !== "all" && item.disciplineId !== filterDisc) return false;
      if (filterType !== "all" && item.type !== filterType) return false;
      return true;
    });
  }, [items, search, filterDisc, filterType]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { discipline: Discipline; chapters: Map<string, SavedItem[]> }
    >();
    for (const item of filteredItems) {
      if (!map.has(item.disciplineId)) {
        map.set(item.disciplineId, {
          discipline: { id: item.disciplineId, name: item.disciplineName },
          chapters: new Map(),
        });
      }
      const group = map.get(item.disciplineId)!;
      const ch    = item.chapterTitle?.trim() || "Sem capítulo";
      if (!group.chapters.has(ch)) group.chapters.set(ch, []);
      group.chapters.get(ch)!.push(item);
    }
    return Array.from(map.values());
  }, [filteredItems]);

  const disciplinesWithItems = useMemo(() => {
    const ids = new Set(items.map((i) => i.disciplineId));
    return disciplines.filter((d) => ids.has(d.id));
  }, [disciplines, items]);

  const typeCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
    return counts;
  }, [items]);

  const typeOptions = [
    { key: "all",         label: "Todos"       },
    { key: "audio",       label: "Áudios"      },
    { key: "slide",       label: "Slides"      },
    { key: "quiz",        label: "Quizzes"     },
    { key: "interactive", label: "Interativos" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ══════════════════════════════════════════
          CABEÇALHO
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-950/50 dark:shadow-none sm:rounded-2xl sm:p-5 md:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50 dark:from-indigo-950/60 dark:via-slate-950/80 dark:to-slate-950" />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 sm:text-[11px]">
              Guardados
            </p>
            <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl md:text-3xl">
              Olá, {firstName}
            </h1>
            <p className="mt-1 hidden max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:block">
              Acede rapidamente aos áudios, slides e quizzes que guardaste para
              rever mais tarde, organizados por disciplina e capítulo.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end text-right">
            <p className="text-2xl font-bold leading-none text-slate-900 dark:text-white sm:text-3xl">
              {items.length}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-500 sm:text-[11px]">
              guardados
            </p>
          </div>
        </div>

        {/* Stats */}
        <div
          className={`relative z-10 mt-3 flex gap-1.5 overflow-x-auto sm:mt-5 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible ${SCROLLBAR_X}`}
        >
          {[
            { label: "Áudios",      value: typeCount["audio"] ?? 0,    icon: Headphones },
            { label: "Slides",      value: typeCount["slide"] ?? 0,    icon: FileText   },
            { label: "Quizzes",     value: typeCount["quiz"] ?? 0,     icon: Trophy     },
            { label: "Disciplinas", value: disciplinesWithItems.length, icon: Bookmark  },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5 sm:block sm:rounded-xl sm:px-3 sm:py-3"
            >
              <Icon size={12} className="text-slate-400 dark:text-slate-500 sm:hidden" />
              <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white sm:hidden">{value}</span>
              <span className="text-xs text-slate-500 sm:hidden">{label}</span>
              <div className="hidden items-center gap-1.5 text-slate-500 sm:flex">
                <Icon size={12} />
                <p className="text-[10px] font-medium uppercase tracking-widest">{label}</p>
              </div>
              <p className="mt-1.5 hidden text-xl font-bold tabular-nums text-slate-900 dark:text-white sm:block">{value}</p>
            </div>
          ))}
        </div>

        {/* Pesquisa + filtros */}
        <div className="relative z-10 mt-3 space-y-2 sm:mt-5">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar guardados..."
              className="min-h-9 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/20 sm:min-h-11 sm:rounded-xl sm:py-3 sm:pl-10 sm:pr-4"
            />
          </div>

          <div className={`flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-white/5 sm:rounded-xl ${SCROLLBAR_X}`}>
            {typeOptions.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterType(key)}
                className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium transition sm:flex-1 sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs ${
                  filterType === key
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={`flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:gap-2 sm:overflow-visible ${SCROLLBAR_X}`}>
            <span className="mr-1 hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 sm:inline-flex">
              <Filter size={12} /> Disciplina
            </span>
            <button
              type="button"
              onClick={() => setFilterDisc("all")}
              className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-xs ${
                filterDisc === "all"
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-200"
                  : "border-slate-300 bg-white text-slate-500 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Todas
            </button>
            {disciplinesWithItems.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setFilterDisc(d.id)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-xs ${
                  filterDisc === d.id
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-200"
                    : "border-slate-300 bg-white text-slate-500 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          LISTA
      ══════════════════════════════════════════ */}
      <div className="space-y-4">
        {grouped.length === 0 ? (
          <div className="flex min-h-[32vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-white/10 dark:bg-white/[0.03] sm:min-h-[38vh] sm:p-8 md:min-h-[42vh] md:p-10">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] sm:h-16 sm:w-16">
              <Bookmark size={26} className="text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
              Nenhum item guardado
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {items.length === 0
                ? "Ainda não guardaste nenhum conteúdo. Usa o ícone de marcador nas disciplinas para guardar áudios, slides e quizzes."
                : "Nenhum item corresponde aos filtros selecionados."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {grouped.map((group, index) => {
              const discId     = group.discipline.id;
              const isOpen     = isDiscOpen(discId, index);
              const totalItems = Array.from(group.chapters.values()).flat().length;

              return (
                <div
                  key={discId}
                  className={`overflow-hidden rounded-2xl border transition-all ${
                    isOpen
                      ? "border-indigo-300 shadow-md shadow-indigo-100 dark:border-indigo-500/40 dark:shadow-lg dark:shadow-indigo-500/10"
                      : "border-slate-200 dark:border-white/10"
                  }`}
                >
                  {/* cabeçalho acordeão */}
                  <button
                    onClick={() => toggleDisc(discId, index)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition sm:gap-4 sm:px-5 sm:py-4 ${
                      isOpen
                        ? "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-950/70"
                        : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950/50"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold sm:h-9 sm:w-9 ${isOpen ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-white/5 dark:text-slate-400"}`}>
                        <BookOpen size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold sm:text-base ${isOpen ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
                          {group.discipline.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {totalItems} {totalItems === 1 ? "item guardado" : "itens guardados"}
                        </p>
                      </div>
                    </div>
                    {isOpen
                      ? <ChevronDown  size={16} className="shrink-0 text-slate-400" />
                      : <ChevronRight size={16} className="shrink-0 text-slate-400" />
                    }
                  </button>

                  {/* corpo */}
                  {isOpen && (
                    <div className="divide-y divide-slate-100 bg-slate-50/60 dark:divide-white/5 dark:bg-slate-950/30">
                      {Array.from(group.chapters.entries()).map(([chTitle, chItems]) => (
                        <div key={chTitle} className="p-3 sm:p-4">
                          <div className="mb-2.5 flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-white/5 sm:mb-3">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              {chTitle}
                            </p>
                          </div>

                          <div className="space-y-1 sm:space-y-1.5">
                            {chItems.map((item) => {
                              const meta = CONTENT_META[item.type];
                              const Icon = meta.icon;
                              return (
                                <div
                                  key={item.savedId}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openItem(item)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") openItem(item);
                                  }}
                                  title={`Abrir ${meta.label.toLowerCase()}: ${item.title}`}
                                  className="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-slate-100 dark:hover:bg-white/5 sm:px-3 sm:py-2.5"
                                >
                                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.colorClasses}`}>
                                    <Icon size={13} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm leading-snug text-slate-700 dark:text-slate-300">
                                      {item.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {meta.label}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:gap-1 md:opacity-0 md:group-hover:opacity-100">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); router.push(`/disciplinas/${item.disciplineId}`); }}
                                      title="Abrir disciplina"
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
                                    >
                                      <ExternalLink size={13} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); void handleRemove(item.savedId); }}
                                      disabled={removingId === item.savedId}
                                      title="Remover dos guardados"
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                                    >
                                      {removingId === item.savedId
                                        ? <Loader2 size={13} className="animate-spin" />
                                        : <Trash2 size={13} />
                                      }
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

{/* ══════════════════════════════════════════
    MODAL: SLIDE — com zoom + fullscreen
══════════════════════════════════════════ */}
{activeSlide && (
  <>
    {!slideFullscreen && (
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-md"
        onClick={closeSlide}
      />
    )}

    <div
      className={`fixed z-[81] flex flex-col overflow-hidden bg-white dark:bg-slate-950 transition-all duration-200 ${
        slideFullscreen
          ? "inset-0 rounded-none border-0"
          : [
              // Mobile: bottom sheet a quase ecrã inteiro
              "inset-x-0 bottom-0 top-[5dvh] rounded-t-3xl border-t border-x border-slate-200 shadow-2xl dark:border-white/10",
              // Desktop: janela centrada, grande, redimensionável
              "sm:inset-auto sm:rounded-3xl sm:border sm:border-slate-200 sm:dark:border-white/10",
              "sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
              "sm:w-[min(780px,92vw)] sm:h-[min(88dvh,760px)]",
              "sm:resize sm:overflow-auto sm:min-w-[400px] sm:min-h-[360px]",
            ].join(" ")
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Handle mobile */}
      {!slideFullscreen && (
        <div className="flex shrink-0 justify-center py-2.5 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>
      )}

      {/* ── Cabeçalho ── */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-200 bg-slate-50 px-4 py-2.5 dark:border-emerald-500/20 dark:bg-black/30">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-emerald-50 text-emerald-600 dark:border-white/10 dark:bg-emerald-500/10 dark:text-emerald-400">
            <FileText size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xs font-bold text-slate-900 dark:text-white">
              {activeSlide.title}
            </h3>
            <p className="truncate text-[10px] text-slate-500 mt-0.5">
              {[activeSlide.disciplineName, activeSlide.chapterTitle]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ZoomControls
            zoom={slideZoom}
            onZoomIn={() => adjustZoom(ZOOM_STEP)}
            onZoomOut={() => adjustZoom(-ZOOM_STEP)}
            onReset={() => setSlideZoom(1)}
          />
          <button
            type="button"
            onClick={() => setSlideFullscreen((f) => !f)}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            title={slideFullscreen ? "Sair do ecrã inteiro" : "Ecrã inteiro"}
          >
            {slideFullscreen ? <Shrink size={14} /> : <Expand size={14} />}
          </button>
          <button
            type="button"
            onClick={closeSlide}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
            title="Fechar"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Viewer — ocupa todo o espaço restante ── */}
      <div className="relative min-h-0 flex-1">
        <SlideViewer
  url={activeSlide.fileUrl ?? ""}
  title={activeSlide.title}
  zoom={slideZoom}
  contentId={activeSlide.contentId}                    // ✅ campo correto
  estimatedDurationSeconds={activeSlide.durationSeconds ?? undefined} // ✅ campo correto
/>
      </div>
    </div>
  </>
)}

      {/* ══════════════════════════════════════════
          MODAL: QUIZ
      ══════════════════════════════════════════ */}
      {activeQuiz && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-md dark:bg-slate-950/90"
            onClick={() => setActiveQuiz(null)}
          />
          <div className="fixed inset-0 z-[81] flex items-end justify-center pointer-events-none sm:items-center sm:p-4">
            <div
              className="pointer-events-auto relative flex w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:rounded-3xl"
              style={{ maxHeight: "95dvh" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />
              </div>
              <QuizPlayer
                contentId={activeQuiz.contentId}
                title={activeQuiz.title}
                disciplineName={activeQuiz.disciplineName}
                chapterTitle={activeQuiz.chapterTitle}
                timeLimitSeconds={null}
                onClose={() => setActiveQuiz(null)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}