// app/guardados/GuardadosClient.tsx
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
  Star,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Ticket,
  Share2,
  ClipboardList,
  CalendarPlus,
} from "lucide-react";
import type { Profile } from "@/src/types/database";
import { removeSavedItem, type SavedItem } from "@/app/actions/saved";
import { useAudioPlayer } from "@/app/lib/context/AudioPlayerContext";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import SlideViewer from "@/app/components/slides/SlideViewer";
import QuizPlayer from "@/app/components/quiz/QuizPlayer";
import QuizModalShell from "@/app/components/quiz/QuizModalShell";
import { CATEGORY_META, type EventCategory } from "@/app/lib/events/classifyCategory";
import type { EventLink } from "@/app/lib/events/parseWhatsAppEvent";

type Discipline = { id: string; name: string };

type Props = {
  profile: Profile;
  savedItems: SavedItem[];
  disciplines: Discipline[];
};

/* ================================================================
   TIPOS DE EVENTOS MARCADOS
================================================================ */

type MarkedEvent = {
  id: string;
  title: string;
  theme: string | null;
  category: string;
  description: string | null;
  date_label: string | null;
  date_start: string | null;
  date_end: string | null;
  time_label: string | null;
  location: string | null;
  price_label: string | null;
  is_free: boolean | null;
  links: EventLink[];
  image_url: string | null;
  is_featured: boolean;
  marked_at: string;
};

/* ================================================================
   CONSTANTES
================================================================ */

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
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
   HELPERS DE EVENTO (espelham /eventos)
================================================================ */

const parseIso = (iso: string) => new Date(`${iso}T00:00:00`);

const todayStart = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

const getStatus = (ev: MarkedEvent): "ongoing" | "today" | "upcoming" | "expired" => {
  const today = todayStart().getTime();
  const s = ev.date_start ? parseIso(ev.date_start).getTime() : null;
  const e = ev.date_end ? parseIso(ev.date_end).getTime() : s;
  if (s === null) return "upcoming";
  if (today > (e ?? s)) return "expired";
  if (s !== e && today >= s && today <= (e ?? s)) return "ongoing";
  if (today === s) return "today";
  return "upcoming";
};

const fmtDate = (iso: string) =>
  parseIso(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

const fmtRange = (ev: MarkedEvent): string => {
  if (!ev.date_start) return ev.date_label || "Data a definir";
  if (ev.date_end && ev.date_end !== ev.date_start)
    return `${fmtDate(ev.date_start)} – ${fmtDate(ev.date_end)}`;
  return fmtDate(ev.date_start);
};

const catOf = (c: string): EventCategory =>
  c in CATEGORY_META ? (c as EventCategory) : "comunidade";

const ACCENT: Record<EventCategory, { bar: string; dot: string }> = {
  formacao:        { bar: "border-l-blue-500",    dot: "bg-blue-500" },
  palestra:        { bar: "border-l-violet-500",  dot: "bg-violet-500" },
  financas:        { bar: "border-l-emerald-500", dot: "bg-emerald-500" },
  empregabilidade: { bar: "border-l-amber-500",   dot: "bg-amber-500" },
  academico:       { bar: "border-l-indigo-500",  dot: "bg-indigo-500" },
  cultural:        { bar: "border-l-pink-500",    dot: "bg-pink-500" },
  desporto:        { bar: "border-l-orange-500",  dot: "bg-orange-500" },
  comunidade:      { bar: "border-l-slate-400",   dot: "bg-slate-400" },
};

const validLinks = (links: EventLink[]) =>
  (links ?? []).filter((l) => /^https?:\/\//i.test(l.url ?? ""));

const LINK_META: Record<EventLink["kind"], { label: string; icon: typeof MapPin }> = {
  map:    { label: "Ver local no mapa", icon: MapPin },
  stream: { label: "Assistir online",   icon: PlayCircle },
  apply:  { label: "Candidatar-se",     icon: ClipboardList },
  info:   { label: "Mais informações",  icon: ExternalLink },
};

const icsDate = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

function gcalUrl(ev: MarkedEvent): string {
  const start = ev.date_start ? icsDate(parseIso(ev.date_start)) : "";
  let end = "";
  const endRaw = ev.date_end ?? ev.date_start;
  if (endRaw) {
    const d = parseIso(endRaw);
    d.setDate(d.getDate() + 1);
    end = icsDate(d);
  }
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: start && end ? `${start}/${end}` : start,
    details: ev.description ?? "",
    location: ev.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadIcs(ev: MarkedEvent) {
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const endRaw = ev.date_end ?? ev.date_start;
  let endLine = "";
  if (endRaw) {
    const d = parseIso(endRaw);
    d.setDate(d.getDate() + 1);
    endLine = `DTEND;VALUE=DATE:${icsDate(d)}`;
  }
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//b-ISAF//Eventos//PT",
    "BEGIN:VEVENT",
    `UID:${ev.id}@b-isaf`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    ev.date_start ? `DTSTART;VALUE=DATE:${icsDate(parseIso(ev.date_start))}` : "",
    endLine,
    `SUMMARY:${esc(ev.title)}`,
    ev.location ? `LOCATION:${esc(ev.location)}` : "",
    ev.description ? `DESCRIPTION:${esc(ev.description)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.title.slice(0, 40).replace(/[^\w-]+/g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

async function shareEvent(ev: MarkedEvent) {
  const text = `${ev.title} · ${fmtRange(ev)}${ev.location ? ` · ${ev.location}` : ""}`;
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: ev.title, text, url: window.location.href });
      return;
    }
    await navigator.clipboard.writeText(`${text} — ${window.location.href}`);
  } catch {
    /* partilha cancelada */
  }
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
   SKELETON DE CARD DE EVENTO
================================================================ */

function EventCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40">
      <div className="h-40 bg-slate-200 dark:bg-white/10 md:h-36" />
      <div className="space-y-2.5 p-3.5">
        <div className="h-4 w-4/5 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-3 w-3/5 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-3 w-2/5 rounded bg-slate-200 dark:bg-white/10" />
      </div>
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
  const router = useRouter();
  const audioPlayer = useAudioPlayer();
  const { supabase } = useSupabase();

  const [items, setItems] = useState<SavedItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [filterDisc, setFilterDisc] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [expandedDisc, setExpandedDisc] = useState<Record<string, boolean>>({});

  const [activeSlide, setActiveSlide] = useState<SavedItem | null>(null);
  const [slideZoom, setSlideZoom] = useState(1);
  const [slideFullscreen, setSlideFullscreen] = useState(false);

  const [activeQuiz, setActiveQuiz] = useState<SavedItem | null>(null);

  /* ── Eventos marcados ── */
  const [markedEvents, setMarkedEvents] = useState<MarkedEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [unmarkingId, setUnmarkingId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MarkedEvent | null>(null);
  const [imgFailed, setImgFailed] = useState<Set<string>>(new Set());

  const firstName = profile.full_name?.trim().split(/\s+/)[0] ?? "Aluno";

  /* ── Carregar eventos marcados ── */
  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    const { data } = await supabase
      .from("event_marks")
      .select("event_id, created_at, events(*)")
      .order("created_at", { ascending: false });
    const mapped: MarkedEvent[] = ((data as any[]) ?? [])
      .filter((r) => r.events && r.events.is_published)
      .map((r) => ({ ...(r.events as any), marked_at: r.created_at }));
    setMarkedEvents(mapped);
    setEventsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const handleUnmark = async (ev: MarkedEvent) => {
    setUnmarkingId(ev.id);
    await supabase.from("event_marks").delete().eq("event_id", ev.id);
    setMarkedEvents((prev) => prev.filter((e) => e.id !== ev.id));
    setUnmarkingId(null);
    if (selectedEvent?.id === ev.id) setSelectedEvent(null);
  };

  /* ── Resto do comportamento original ── */
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
          id: item.contentId,
          title: item.title,
          url: item.fileUrl,
          discipline: item.disciplineName,
          chapter: item.chapterTitle,
          topic: item.topicTitle,
          coverUrl: item.disciplineCoverUrl ?? undefined,
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
      const ch = item.chapterTitle?.trim() || "Sem capítulo";
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

  const totalMarked = markedEvents.length;

  const typeOptions = [
    { key: "all", label: "Todos" },
    { key: "audio", label: "Áudios" },
    { key: "slide", label: "Slides" },
    { key: "quiz", label: "Quizzes" },
    { key: "interactive", label: "Interativos" },
  ];

  /* ── Helpers visuais de eventos (espelhados de /eventos) ── */
  const statusChip = (ev: MarkedEvent) => {
    const st = getStatus(ev);
    if (st === "ongoing")
      return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">A decorrer</span>;
    if (st === "today")
      return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hoje</span>;
    if (st === "expired")
      return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">Realizado</span>;
    return null;
  };

  const banner = (ev: MarkedEvent, cls: string) =>
    ev.image_url && !imgFailed.has(ev.id) ? (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={ev.image_url}
        alt=""
        onError={() => setImgFailed((p) => new Set(p).add(ev.id))}
        className={cls}
      />
    ) : (
      <div className={`${cls} bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800`} />
    );

  /* ── Card de evento marcado (grelha com banner grande) ── */
  const renderMarkedCard = (ev: MarkedEvent) => {
    const c = catOf(ev.category);
    const d = ev.date_start ? parseIso(ev.date_start) : null;
    const st = getStatus(ev);

    return (
      <article
        key={ev.id}
        className={`group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-white/20 ${
          st === "expired" ? "opacity-70" : ""
        }`}
      >
        {/* Banner */}
        <button
          type="button"
          onClick={() => setSelectedEvent(ev)}
          className="relative block h-40 w-full shrink-0 overflow-hidden md:h-36"
        >
          {banner(ev, "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]")}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-800 shadow-sm backdrop-blur dark:bg-slate-900/95 dark:text-slate-200">
              <span className={`h-1.5 w-1.5 rounded-full ${ACCENT[c].dot}`} />
              {CATEGORY_META[c].label}
            </span>
            {ev.is_free && (
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                Gratuita
              </span>
            )}
          </div>

          {d ? (
            <div className="absolute bottom-2.5 left-2.5 flex flex-col items-center rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm backdrop-blur dark:bg-slate-900/95">
              <span className="text-lg font-bold leading-none tabular-nums text-slate-900 dark:text-white">
                {d.getDate()}
              </span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {d.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "")}
              </span>
            </div>
          ) : (
            <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm backdrop-blur dark:bg-slate-900/95">
              <Calendar size={16} className="text-slate-400 dark:text-slate-500" />
            </div>
          )}

          <div className="absolute bottom-2.5 right-2.5">
            {st === "ongoing" && (
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                A decorrer
              </span>
            )}
            {st === "today" && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                Hoje
              </span>
            )}
            {st === "expired" && (
              <span className="rounded-full bg-slate-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                Realizado
              </span>
            )}
          </div>
        </button>

        {/* Corpo */}
        <div className="flex flex-1 flex-col gap-1.5 p-3.5 md:p-3">
          <button type="button" onClick={() => setSelectedEvent(ev)} className="text-left">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 dark:text-white md:text-sm">
              {ev.title}
            </h3>
          </button>

          {ev.theme && (
            <p className="line-clamp-1 text-[11px] italic leading-snug text-slate-600 dark:text-slate-400 md:text-[10px]">
              <span className="not-italic font-semibold text-amber-700 dark:text-amber-400">Tema:</span>{" "}
              {ev.theme}
            </p>
          )}

          <div className="mt-auto space-y-1 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <p className="flex items-center gap-1.5 tabular-nums">
              <Calendar size={12} className="shrink-0" /> {fmtRange(ev)}
              {ev.time_label && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <Clock size={12} className="shrink-0" /> {ev.time_label}
                </>
              )}
            </p>
            {ev.location && (
              <p className="flex items-center gap-1.5">
                <MapPin size={12} className="shrink-0" />
                <span className="truncate">{ev.location}</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-3.5 py-2.5 dark:border-white/5 md:px-3">
          <button
            type="button"
            onClick={() => setSelectedEvent(ev)}
            className="text-[11px] font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400 md:text-[10px]"
          >
            Ver detalhes
          </button>
          <button
            type="button"
            onClick={() => void handleUnmark(ev)}
            disabled={unmarkingId === ev.id}
            title="Remover dos marcados"
            className="rounded-lg p-1.5 text-amber-500 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:hover:bg-rose-500/10"
          >
            {unmarkingId === ev.id ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Star size={15} fill="currentColor" />
            )}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-5">
      {/* ══════════════════════════════════════════
          CABEÇALHO
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-950/50 dark:shadow-none sm:rounded-2xl sm:p-5 md:p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50 dark:from-indigo-950/60 dark:via-slate-950/80 dark:to-slate-950" />

        <div className="relative z-10 flex items-center justify-between gap-3 md:gap-2.5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 sm:text-[11px] md:text-[10px]">
              Guardados
            </p>
            <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl md:text-xl">
              Olá, {firstName}
            </h1>
            <p className="mt-1 hidden max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:block md:text-xs md:max-w-xl">
              Acede rapidamente aos áudios, slides, quizzes e eventos que guardaste
              para rever mais tarde.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end text-right">
            <p className="text-2xl font-bold leading-none text-slate-900 dark:text-white sm:text-3xl md:text-2xl">
              {items.length + totalMarked}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-500 sm:text-[11px] md:text-[10px]">
              guardados
            </p>
          </div>
        </div>

        {/* Stats */}
        <div
          className={`relative z-10 mt-3 flex gap-1.5 overflow-x-auto sm:mt-5 md:mt-4 sm:grid sm:grid-cols-5 sm:gap-2 md:gap-1.5 sm:overflow-visible ${SCROLLBAR_X}`}
        >
          {[
            { label: "Áudios", value: typeCount["audio"] ?? 0, icon: Headphones },
            { label: "Slides", value: typeCount["slide"] ?? 0, icon: FileText },
            { label: "Quizzes", value: typeCount["quiz"] ?? 0, icon: Trophy },
            { label: "Eventos", value: totalMarked, icon: Star },
            { label: "Disciplinas", value: disciplinesWithItems.length, icon: Bookmark },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5 sm:block sm:rounded-xl sm:px-3 md:px-2.5 sm:py-3 md:py-2.5"
            >
              <Icon size={12} className="text-slate-400 dark:text-slate-500 sm:hidden" />
              <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white sm:hidden">{value}</span>
              <span className="text-xs text-slate-500 sm:hidden">{label}</span>
              <div className="hidden items-center gap-1.5 text-slate-500 sm:flex">
                <Icon size={12} />
                <p className="text-[10px] font-medium uppercase tracking-widest">{label}</p>
              </div>
              <p className="mt-1.5 hidden text-xl font-bold tabular-nums text-slate-900 dark:text-white sm:block md:text-lg md:mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Pesquisa + filtros */}
        <div className="relative z-10 mt-3 space-y-2 md:space-y-1.5 sm:mt-5 md:mt-4">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar guardados..."
              className="min-h-9 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/20 sm:min-h-11 md:min-h-10 sm:rounded-xl sm:py-3 md:py-2.5 sm:pl-10 sm:pr-4 md:text-xs"
            />
          </div>

          <div className={`flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-white/5 sm:rounded-xl ${SCROLLBAR_X}`}>
            {typeOptions.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterType(key)}
                className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium transition sm:flex-1 sm:rounded-lg sm:px-3 md:px-2.5 sm:py-2 md:py-1.5 sm:text-xs md:text-[11px] ${
                  filterType === key
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={`flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:gap-2 md:gap-1.5 sm:overflow-visible ${SCROLLBAR_X}`}>
            <span className="mr-1 hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 sm:inline-flex md:text-[10px]">
              <Filter size={12} /> Disciplina
            </span>
            <button
              type="button"
              onClick={() => setFilterDisc("all")}
              className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 md:px-2.5 sm:py-1.5 md:py-1 sm:text-xs md:text-[11px] ${
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
                className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 md:px-2.5 sm:py-1.5 md:py-1 sm:text-xs md:text-[11px] ${
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
          EVENTOS MARCADOS (grelha com banner)
      ══════════════════════════════════════════ */}
      {(totalMarked > 0 || eventsLoading) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <Star size={15} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white md:text-xs">
                  Eventos marcados
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 md:text-[10px]">
                  {eventsLoading
                    ? "A carregar…"
                    : `${totalMarked} evento${totalMarked !== 1 ? "s" : ""} que marcaste com ⭐`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/eventos")}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:text-indigo-300"
            >
              Ver todos <ChevronRight size={12} />
            </button>
          </div>

          {eventsLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-2.5">
              {markedEvents.map(renderMarkedCard)}
            </div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════
          LISTA DE CONTEÚDOS
      ══════════════════════════════════════════ */}
      <div className="space-y-4 md:space-y-3">
        {grouped.length === 0 && items.length > 0 ? (
          <div className="flex min-h-[32vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-white/10 dark:bg-white/[0.03] sm:min-h-[38vh] md:min-h-[34vh] sm:p-8 md:p-6 md:rounded-2xl">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] sm:h-16 sm:w-16 md:h-14 md:w-14 md:rounded-2xl">
              <Search size={26} className="text-slate-400 dark:text-slate-500 md:h-6 md:w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg md:text-base">
              Nenhum conteúdo corresponde
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 md:text-xs md:max-w-sm">
              Ajusta os filtros ou a pesquisa para encontrares os teus áudios, slides e quizzes.
            </p>
          </div>
        ) : grouped.length === 0 && items.length === 0 && totalMarked === 0 ? (
          <div className="flex min-h-[32vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-white/10 dark:bg-white/[0.03] sm:min-h-[38vh] md:min-h-[34vh] sm:p-8 md:p-6 md:rounded-2xl">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] sm:h-16 sm:w-16 md:h-14 md:w-14 md:rounded-2xl">
              <Bookmark size={26} className="text-slate-400 dark:text-slate-500 md:h-6 md:w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg md:text-base">
              Ainda não guardaste nada
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 md:text-xs md:max-w-sm">
              Usa o ícone de marcador nas disciplinas para guardar áudios, slides e quizzes,
              ou a ⭐ nos eventos para os guardares aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 md:space-y-3">
            {grouped.map((group, index) => {
              const discId = group.discipline.id;
              const isOpen = isDiscOpen(discId, index);
              const totalItems = Array.from(group.chapters.values()).flat().length;

              return (
                <div
                  key={discId}
                  className={`overflow-hidden rounded-2xl md:rounded-xl border transition-all ${
                    isOpen
                      ? "border-indigo-300 shadow-md shadow-indigo-100 dark:border-indigo-500/40 dark:shadow-lg dark:shadow-indigo-500/10"
                      : "border-slate-200 dark:border-white/10"
                  }`}
                >
                  <button
                    onClick={() => toggleDisc(discId, index)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition sm:gap-4 md:gap-3 sm:px-5 md:px-4 sm:py-4 md:py-3 ${
                      isOpen
                        ? "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-950/70"
                        : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950/50"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 md:gap-2.5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold sm:h-9 sm:w-9 md:h-8 md:w-8 ${isOpen ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-white/5 dark:text-slate-400"}`}>
                        <BookOpen size={15} className="md:h-3.5 md:w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold sm:text-base md:text-sm ${isOpen ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
                          {group.discipline.name}
                        </p>
                        <p className="text-xs md:text-[11px] text-slate-500">
                          {totalItems} {totalItems === 1 ? "item guardado" : "itens guardados"}
                        </p>
                      </div>
                    </div>
                    {isOpen
                      ? <ChevronDown size={16} className="shrink-0 text-slate-400 md:h-4 md:w-4" />
                      : <ChevronRight size={16} className="shrink-0 text-slate-400 md:h-4 md:w-4" />
                    }
                  </button>

                  {isOpen && (
                    <div className="divide-y divide-slate-100 bg-slate-50/60 dark:divide-white/5 dark:bg-slate-950/30">
                      {Array.from(group.chapters.entries()).map(([chTitle, chItems]) => (
                        <div key={chTitle} className="p-3 sm:p-4 md:p-3">
                          <div className="mb-2.5 flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-white/5 sm:mb-3 md:mb-2.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            <p className="text-xs md:text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              {chTitle}
                            </p>
                          </div>

                          <div className="space-y-1 sm:space-y-1.5 md:space-y-1">
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
                                  className="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-slate-100 dark:hover:bg-white/5 sm:px-3 md:px-2.5 sm:py-2.5 md:py-2"
                                >
                                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.colorClasses}`}>
                                    <Icon size={13} className="md:h-3 md:w-3" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm md:text-xs leading-snug text-slate-700 dark:text-slate-300">
                                      {item.title}
                                    </p>
                                    <p className="mt-0.5 text-xs md:text-[11px] text-slate-500">
                                      {meta.label}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:gap-1 md:gap-0.5 md:opacity-0 md:group-hover:opacity-100">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); router.push(`/disciplinas/${item.disciplineId}`); }}
                                      title="Abrir disciplina"
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
                                    >
                                      <ExternalLink size={13} className="md:h-3 md:w-3" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); void handleRemove(item.savedId); }}
                                      disabled={removingId === item.savedId}
                                      title="Remover dos guardados"
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                                    >
                                      {removingId === item.savedId
                                        ? <Loader2 size={13} className="animate-spin md:h-3 md:w-3" />
                                        : <Trash2 size={13} className="md:h-3 md:w-3" />
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
          MODAL: SLIDE
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
                    "inset-x-0 bottom-0 top-[5dvh] rounded-t-3xl border-t border-x border-slate-200 shadow-2xl dark:border-white/10",
                    "sm:inset-auto sm:rounded-3xl md:rounded-2xl sm:border sm:border-slate-200 sm:dark:border-white/10",
                    "sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
                    "sm:w-[min(780px,92vw)] md:w-[min(720px,90vw)] sm:h-[min(88dvh,760px)] md:h-[min(82dvh,700px)]",
                    "sm:resize sm:overflow-auto sm:min-w-[400px] sm:min-h-[360px] md:min-w-[380px] md:min-h-[340px]",
                  ].join(" ")
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {!slideFullscreen && (
              <div className="flex shrink-0 justify-center py-2.5 sm:hidden">
                <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />
              </div>
            )}

            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-emerald-200 bg-slate-50 px-4 py-2.5 md:px-3.5 md:py-2 dark:border-emerald-500/20 dark:bg-black/30">
              <div className="flex min-w-0 flex-1 items-center gap-2.5 md:gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-emerald-50 text-emerald-600 dark:border-white/10 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <FileText size={14} className="md:h-3.5 md:w-3.5" />
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
                  className="rounded-xl p-2 md:p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  title={slideFullscreen ? "Sair do ecrã inteiro" : "Ecrã inteiro"}
                >
                  {slideFullscreen ? <Shrink size={14} className="md:h-3.5 md:w-3.5" /> : <Expand size={14} className="md:h-3.5 md:w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={closeSlide}
                  className="rounded-xl p-2 md:p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                  title="Fechar"
                >
                  <X size={15} className="md:h-4 md:w-4" />
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1">
              <SlideViewer
                url={activeSlide.fileUrl ?? ""}
                title={activeSlide.title}
                zoom={slideZoom}
                contentId={activeSlide.contentId}
                estimatedDurationSeconds={activeSlide.durationSeconds ?? undefined}
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
              className="pointer-events-auto relative flex w-full max-w-2xl md:max-w-xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:rounded-3xl md:rounded-2xl"
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

      {/* ══════════════════════════════════════════
          MODAL: EVENTO
      ══════════════════════════════════════════ */}
      {selectedEvent && (
        <QuizModalShell>
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10 md:px-3.5 md:py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ACCENT[catOf(selectedEvent.category)].dot}`} />
              <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {CATEGORY_META[catOf(selectedEvent.category)].label}
              </span>
              {statusChip(selectedEvent)}
            </div>
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              aria-label="Fechar"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {selectedEvent.image_url && !imgFailed.has(selectedEvent.id) && (
              <div className="relative flex items-center justify-center border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedEvent.image_url}
                  alt={`Cartaz do evento: ${selectedEvent.title}`}
                  onError={() => setImgFailed((p) => new Set(p).add(selectedEvent.id))}
                  className="max-h-[55vh] w-full object-contain md:max-h-[48vh]"
                />
                <a
                  href={selectedEvent.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir imagem original"
                  className="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white backdrop-blur transition hover:bg-black/70"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            <div className="space-y-4 p-4 md:space-y-3 md:p-3.5">
              <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white md:text-base">
                {selectedEvent.title}
              </h2>
              {selectedEvent.theme && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Tema
                  </p>
                  <p className="mt-1 text-sm leading-snug text-slate-800 dark:text-slate-200 md:text-xs">
                    {selectedEvent.theme}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10">
                {[
                  { icon: Calendar, label: "Data", value: fmtRange(selectedEvent) },
                  { icon: Clock, label: "Hora", value: selectedEvent.time_label ?? "A definir" },
                  { icon: MapPin, label: "Local", value: selectedEvent.location ?? "A definir" },
                  { icon: Ticket, label: "Preço", value: selectedEvent.price_label ?? (selectedEvent.is_free ? "Gratuita" : "Pago") },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white p-3 dark:bg-slate-950">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <Icon size={11} /> {label}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-snug text-slate-800 dark:text-slate-200">{value}</p>
                  </div>
                ))}
              </div>

              {selectedEvent.description && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300 md:text-xs">
                  {selectedEvent.description}
                </p>
              )}

              {validLinks(selectedEvent.links).length > 0 && (
                <div className="space-y-1.5">
                  {validLinks(selectedEvent.links).map((l, i) => {
                    const lm = LINK_META[l.kind];
                    const Icon = lm.icon;
                    return (
                      <a
                        key={i}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:text-indigo-300 md:py-2"
                      >
                        <Icon size={14} className="shrink-0" />
                        <span className="flex-1">{lm.label}</span>
                        <ExternalLink size={12} className="shrink-0 text-slate-300 dark:text-slate-600" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 grid grid-cols-4 gap-1.5 border-t border-slate-200 p-3 dark:border-white/10 md:p-2.5">
            <button
              type="button"
              onClick={() => void handleUnmark(selectedEvent)}
              disabled={unmarkingId === selectedEvent.id}
              className="col-span-1 flex flex-col items-center gap-1 rounded-lg bg-amber-50 py-2 text-[10px] font-semibold text-amber-700 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
            >
              <Star size={15} fill="currentColor" />
              Marcado
            </button>
            <button
              type="button"
              onClick={() => downloadIcs(selectedEvent)}
              className="flex flex-col items-center gap-1 rounded-lg bg-slate-100 py-2 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <CalendarPlus size={15} /> .ics
            </button>
            <a
              href={gcalUrl(selectedEvent)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 rounded-lg bg-slate-100 py-2 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Calendar size={15} /> Google
            </a>
            <button
              type="button"
              onClick={() => void shareEvent(selectedEvent)}
              className="flex flex-col items-center gap-1 rounded-lg bg-slate-100 py-2 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Share2 size={15} /> Partilhar
            </button>
          </div>
        </QuizModalShell>
      )}
    </div>
  );
}