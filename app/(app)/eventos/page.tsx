// app/(app)/eventos/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar, CalendarPlus, Clock, MapPin, Star, Play, Link2, Search,
  Share2, RefreshCw, X, Sparkles, AlertTriangle, ClipboardList, ExternalLink, Ticket,
  Loader2,
} from "lucide-react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { CATEGORY_META, type EventCategory } from "@/app/lib/events/classifyCategory";
import type { EventLink } from "@/app/lib/events/parseWhatsAppEvent";
import QuizModalShell from "@/app/components/quiz/QuizModalShell";

/* ================================================================
   SCROLLBAR CLASSES
================================================================ */
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

/* ================================================================
   TIPOS
================================================================ */

type EventRow = {
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
};

type EventStatus = "ongoing" | "today" | "upcoming" | "expired";

/* ================================================================
   HELPERS DE DATA / ESTADO
================================================================ */

const parseIso = (iso: string) => new Date(`${iso}T00:00:00`);

const todayStart = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

function getStatus(ev: EventRow): EventStatus {
  const today = todayStart().getTime();
  const s = ev.date_start ? parseIso(ev.date_start).getTime() : null;
  const e = ev.date_end ? parseIso(ev.date_end).getTime() : s;
  if (s === null) return "upcoming";
  if (today > (e ?? s)) return "expired";
  if (s !== e && today >= s && today <= (e ?? s)) return "ongoing";
  if (today === s) return "today";
  return "upcoming";
}

function countdownLabel(ev: EventRow): string | null {
  const s = ev.date_start ? parseIso(ev.date_start).getTime() : null;
  if (s === null) return null;
  const days = Math.round((s - todayStart().getTime()) / 86400000);
  if (days === 1) return "Amanhã";
  if (days > 1 && days <= 7) return `Daqui a ${days} dias`;
  return null;
}

const fmtDate = (iso: string) =>
  parseIso(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

function fmtRange(ev: EventRow): string {
  if (!ev.date_start) return ev.date_label || "Data a definir";
  if (ev.date_end && ev.date_end !== ev.date_start)
    return `${fmtDate(ev.date_start)} – ${fmtDate(ev.date_end)}`;
  return fmtDate(ev.date_start);
}

const monthLabel = (iso: string) =>
  parseIso(iso).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

const catOf = (c: string): EventCategory =>
  c in CATEGORY_META ? (c as EventCategory) : "comunidade";

/* Acento por categoria — sóbrio: filete + dot, sem gradientes */
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

/* ================================================================
   CALENDÁRIO / PARTILHA
================================================================ */

const icsDate = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

function gcalUrl(ev: EventRow): string {
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

function downloadIcs(ev: EventRow) {
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

async function shareEvent(ev: EventRow) {
  const text = `${ev.title} · ${fmtRange(ev)}${ev.location ? ` · ${ev.location}` : ""}`;
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: ev.title, text, url: window.location.href });
      return;
    }
    await navigator.clipboard.writeText(`${text} — ${window.location.href}`);
  } catch {
    /* partilha cancelada pelo utilizador */
  }
}

const validLinks = (links: EventLink[]) =>
  (links ?? []).filter((l) => /^https?:\/\//i.test(l.url ?? ""));

const LINK_META: Record<EventLink["kind"], { label: string; icon: typeof MapPin }> = {
  map:    { label: "Ver local no mapa", icon: MapPin },
  stream: { label: "Assistir online",   icon: Play },
  apply:  { label: "Candidatar-se",     icon: ClipboardList },
  info:   { label: "Mais informações",  icon: Link2 },
};

/* ================================================================
   SKELETONS
================================================================ */

function CardSkeleton() {
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

function HeroSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40 sm:rounded-2xl">
      <div className="grid sm:grid-cols-[260px_1fr]">
        <div className="h-44 bg-slate-200 dark:bg-white/10 sm:h-full" />
        <div className="space-y-2.5 p-4 sm:p-5">
          <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-5 w-4/5 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   COMPONENTE
================================================================ */

function EventosContent() {
  const { supabase } = useSupabase();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");

  const [events, setEvents] = useState<EventRow[]>([]);
  const [marks, setMarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"proximos" | "marcados">("proximos");
  const [cat, setCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evRes, mkRes] = await Promise.all([
        supabase.from("events").select("*").eq("is_published", true),
        supabase.from("event_marks").select("event_id"),
      ]);
      if (evRes.error) throw evRes.error;
      setEvents((evRes.data as EventRow[]) ?? []);
      setMarks(new Set(((mkRes.data as { event_id: string }[]) ?? []).map((r) => r.event_id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── Abrir modal automaticamente via ?open={id} ── */
  useEffect(() => {
    if (!openId || events.length === 0) return;
    const ev = events.find((e) => e.id === openId);
    if (ev) setSelected(ev);
  }, [openId, events]);

  const toggleMark = async (ev: EventRow) => {
    setMarkingId(ev.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (marks.has(ev.id)) {
        await supabase.from("event_marks").delete().eq("user_id", user.id).eq("event_id", ev.id);
        setMarks((p) => { const n = new Set(p); n.delete(ev.id); return n; });
      } else {
        const { error: err } = await supabase.from("event_marks").insert({ user_id: user.id, event_id: ev.id });
        if (!err) setMarks((p) => new Set(p).add(ev.id));
      }
    }
    setMarkingId(null);
  };

  /* ── Derivados ── */
  const upcoming = useMemo(() => events.filter((e) => getStatus(e) !== "expired"), [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return upcoming
      .filter((e) => cat === "all" || e.category === cat)
      .filter((e) =>
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => (a.date_start ?? "9999").localeCompare(b.date_start ?? "9999"));
  }, [upcoming, cat, query]);

  const markedList = useMemo(
    () =>
      events
        .filter((e) => marks.has(e.id))
        .sort((a, b) => (b.date_start ?? "").localeCompare(a.date_start ?? "")),
    [events, marks]
  );

  const featured = useMemo(
    () => (cat === "all" && !query ? filtered.find((e) => e.is_featured) ?? null : null),
    [filtered, cat, query]
  );

  const listWithoutFeatured = useMemo(
    () => (featured ? filtered.filter((e) => e.id !== featured.id) : filtered),
    [filtered, featured]
  );

  const groups = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const ev of listWithoutFeatured) {
      const key = ev.date_start ? monthLabel(ev.date_start) : "Sem data confirmada";
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [listWithoutFeatured]);

  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of upcoming) m.set(e.category, (m.get(e.category) ?? 0) + 1);
    return m;
  }, [upcoming]);

  /* ── Chips de estado ── */
  const statusChip = (ev: EventRow) => {
    const st = getStatus(ev);
    if (st === "ongoing")
      return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">A decorrer</span>;
    if (st === "today")
      return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Hoje</span>;
    if (st === "expired")
      return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">Realizado</span>;
    const cd = countdownLabel(ev);
    if (cd)
      return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">{cd}</span>;
    return null;
  };

  /* ── Banner com fallback ── */
  const banner = (ev: EventRow, cls: string) =>
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

  /* ── Card vertical em grelha (banner grande no topo) ── */
  const renderCard = (ev: EventRow) => {
    const c = catOf(ev.category);
    const marked = marks.has(ev.id);
    const d = ev.date_start ? parseIso(ev.date_start) : null;
    const st = getStatus(ev);

    return (
      <article
        key={ev.id}
        className={`group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-white/20 ${
          st === "expired" ? "opacity-70" : ""
        }`}
      >
        {/* ═══ Banner com imagem grande ═══ */}
        <button
          type="button"
          onClick={() => setSelected(ev)}
          className="relative block h-40 w-full shrink-0 overflow-hidden md:h-36"
        >
          {banner(
            ev,
            "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

          {/* Chips no topo */}
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

          {/* Badge de data sobreposto */}
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

          {/* Status no canto inferior direito */}
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
            {st === "upcoming" && countdownLabel(ev) && (
              <span className="rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur dark:bg-slate-900/95 dark:text-slate-200">
                {countdownLabel(ev)}
              </span>
            )}
          </div>
        </button>

        {/* ═══ Corpo ═══ */}
        <div className="flex flex-1 flex-col gap-1.5 p-3.5 md:p-3">
          <button type="button" onClick={() => setSelected(ev)} className="text-left">
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

        {/* ═══ Footer ═══ */}
        <div className="flex items-center justify-between border-t border-slate-100 px-3.5 py-2.5 dark:border-white/5 md:px-3">
          <button
            type="button"
            onClick={() => setSelected(ev)}
            className="text-[11px] font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400 md:text-[10px]"
          >
            Ver detalhes
          </button>
          <button
            type="button"
            onClick={() => void toggleMark(ev)}
            disabled={markingId === ev.id}
            aria-label={marked ? "Remover dos marcados" : "Marcar evento"}
            className={`rounded-lg p-1.5 transition disabled:opacity-50 ${
              marked
                ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                : "text-slate-300 hover:bg-slate-100 hover:text-amber-500 dark:text-slate-600 dark:hover:bg-white/10"
            }`}
          >
            {markingId === ev.id ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Star size={15} fill={marked ? "currentColor" : "none"} />
            )}
          </button>
        </div>
      </article>
    );
  };

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Cabeçalho ── */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-950/50 dark:shadow-none sm:rounded-2xl sm:p-5 md:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50 dark:from-indigo-950/60 dark:via-slate-950/80 dark:to-slate-950" />

        <div className="relative z-10 flex items-center justify-between gap-3 md:gap-2.5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 sm:text-[11px] md:text-[10px]">
              Eventos
            </p>
            <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl md:text-xl">
              Comunidade ISAF
            </h1>
            <p className="mt-1 hidden max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:block md:text-xs md:max-w-xl">
              Palestras, formações e iniciativas da comunidade. Marca com ⭐ para guardares no teu histórico.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end text-right">
            <p className="text-2xl font-bold leading-none text-slate-900 dark:text-white sm:text-3xl md:text-2xl">
              {upcoming.length}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-500 sm:text-[11px] md:text-[10px]">
              próximos
            </p>
          </div>
        </div>

        {/* Tabs + pesquisa */}
        <div className="relative z-10 mt-3 space-y-2 sm:mt-5 md:mt-4">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar eventos..."
              className="min-h-9 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/20 sm:min-h-11 md:min-h-10 sm:rounded-xl sm:py-3 md:py-2.5 sm:pl-10 sm:pr-4 md:text-xs"
            />
          </div>

          <div className={`flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-white/5 sm:rounded-xl ${SCROLLBAR_X}`}>
            {([
              { key: "proximos", label: "Próximos" },
              { key: "marcados", label: "Marcados" },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] font-medium transition sm:flex-1 sm:rounded-lg sm:py-2 sm:text-xs ${
                  tab === t.key
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                {t.key === "marcados" && <Star size={12} />}
                {t.label}
                {t.key === "marcados" && marks.size > 0 && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                    {marks.size}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Chips de categoria */}
          {tab === "proximos" && catCounts.size > 0 && (
            <div className={`flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:gap-2 md:gap-1.5 sm:overflow-visible ${SCROLLBAR_X}`}>
              <button
                type="button"
                onClick={() => setCat("all")}
                className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 md:px-2.5 sm:py-1.5 md:py-1 sm:text-xs md:text-[11px] ${
                  cat === "all"
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-200"
                    : "border-slate-300 bg-white text-slate-500 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Todos
              </button>
              {Array.from(catCounts.entries()).map(([key, count]) => {
                const c = catOf(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCat(key)}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 md:px-2.5 sm:py-1.5 md:py-1 sm:text-xs md:text-[11px] ${
                      cat === key
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-200"
                        : "border-slate-300 bg-white text-slate-500 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <span className="mr-1 inline-flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${ACCENT[c].dot}`} />
                      {CATEGORY_META[c].label}
                    </span>
                    <span className="opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Conteúdo ── */}
      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 py-14 text-center dark:border-rose-500/20 dark:bg-rose-500/[0.06]">
          <AlertTriangle size={26} className="text-rose-500" />
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            Não foi possível carregar os eventos
          </p>
          <p className="max-w-xs text-xs text-rose-600/80 dark:text-rose-400/70">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <HeroSkeleton />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      ) : tab === "proximos" ? (
        <>
          {/* Destaque */}
          {featured && (
            <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-slate-950/40 sm:rounded-2xl">
              <div className="grid sm:grid-cols-[260px_1fr]">
                <div className="relative h-44 sm:h-full">
                  {banner(featured, "h-full w-full object-cover")}
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 shadow-sm dark:bg-slate-900/90 dark:text-amber-400">
                    <Sparkles size={10} /> Destaque
                  </span>
                </div>
                <div className="flex flex-col justify-center gap-2 p-4 md:p-3.5 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${ACCENT[catOf(featured.category)].dot}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {CATEGORY_META[catOf(featured.category)].label}
                    </span>
                    {statusChip(featured)}
                  </div>
                  <button type="button" onClick={() => setSelected(featured)} className="text-left">
                    <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white md:text-base">
                      {featured.title}
                    </h2>
                    {featured.theme && (
                      <p className="mt-1 line-clamp-2 text-xs italic leading-snug text-slate-600 dark:text-slate-400 md:text-[11px]">
                        <span className="not-italic font-semibold text-amber-700 dark:text-amber-400">Tema:</span>{" "}
                        {featured.theme}
                      </p>
                    )}
                  </button>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 tabular-nums"><Calendar size={12} /> {fmtRange(featured)}</span>
                    {featured.time_label && <span className="inline-flex items-center gap-1 tabular-nums"><Clock size={12} /> {featured.time_label}</span>}
                    {featured.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={12} /><span className="truncate">{featured.location}</span></span>}
                  </div>
                  {featured.description && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-xs">
                      {featured.description}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(featured)}
                      className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      Ver detalhes
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleMark(featured)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        marks.has(featured.id)
                          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                      }`}
                    >
                      {marks.has(featured.id) ? "Marcado" : "Marcar"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* Lista por mês */}
          {groups.length === 0 ? (
            <div className="flex min-h-[32vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-white/10 dark:bg-white/[0.03] sm:min-h-[38vh] sm:p-8 md:min-h-[34vh] md:rounded-xl md:p-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] sm:h-16 sm:w-16 md:h-14 md:w-14 md:rounded-2xl">
                <Calendar size={26} className="text-slate-400 dark:text-slate-500 md:h-6 md:w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg md:text-base">
                {query || cat !== "all" ? "Nenhum evento corresponde à pesquisa." : "Não há eventos próximos."}
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 md:text-xs md:max-w-sm">
                Os eventos expiram automaticamente no fim do dia em que ocorrem.
              </p>
            </div>
          ) : (
            <div className="space-y-6 md:space-y-5">
              {groups.map(([month, rows]) => (
                <section key={month}>
                  <div className="sticky top-24 z-10 -mx-1 mb-2.5 rounded-lg bg-slate-50/90 px-1 py-1.5 backdrop-blur dark:bg-[#050816]/90">
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 first-letter:uppercase dark:text-slate-300">
                        {month}
                      </h2>
                      <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                        {rows.length} evento{rows.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-2.5">
                    {rows.map(renderCard)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      ) : markedList.length === 0 ? (
        <div className="flex min-h-[32vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-white/10 dark:bg-white/[0.03] sm:min-h-[38vh] sm:p-8 md:min-h-[34vh] md:rounded-xl md:p-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] sm:h-16 sm:w-16 md:h-14 md:w-14 md:rounded-2xl">
            <Star size={26} className="text-slate-400 dark:text-slate-500 md:h-6 md:w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg md:text-base">
            Ainda não marcaste nenhum evento.
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 md:text-xs md:max-w-sm">
            Usa a ⭐ para guardares eventos aqui — incluindo os já realizados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-2.5">
          {markedList.map(renderCard)}
        </div>
      )}

      {/* ── Modal de detalhes ── */}
      {selected && (
        <QuizModalShell>
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10 md:px-3.5 md:py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ACCENT[catOf(selected.category)].dot}`} />
              <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {CATEGORY_META[catOf(selected.category)].label}
              </span>
              {statusChip(selected)}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Fechar"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Cartaz completo (sem cortes) */}
            {selected.image_url && !imgFailed.has(selected.id) && (
              <div className="relative flex items-center justify-center border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.image_url}
                  alt={`Cartaz do evento: ${selected.title}`}
                  onError={() => setImgFailed((p) => new Set(p).add(selected.id))}
                  className="max-h-[55vh] w-full object-contain md:max-h-[48vh]"
                />
                <a
                  href={selected.image_url}
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
                {selected.title}
              </h2>
              {selected.theme && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Tema
                  </p>
                  <p className="mt-1 text-sm leading-snug text-slate-800 dark:text-slate-200 md:text-xs">
                    {selected.theme}
                  </p>
                </div>
              )}
              {/* Grelha de metadados */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-white/10">
                {[
                  { icon: Calendar, label: "Data", value: fmtRange(selected) },
                  { icon: Clock, label: "Hora", value: selected.time_label ?? "A definir" },
                  { icon: MapPin, label: "Local", value: selected.location ?? "A definir" },
                  { icon: Ticket, label: "Preço", value: selected.price_label ?? (selected.is_free ? "Gratuita" : "Pago") },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white p-3 dark:bg-slate-950">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <Icon size={11} /> {label}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-snug text-slate-800 dark:text-slate-200">{value}</p>
                  </div>
                ))}
              </div>

              {selected.description && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300 md:text-xs">
                  {selected.description}
                </p>
              )}

              {validLinks(selected.links).length > 0 && (
                <div className="space-y-1.5">
                  {validLinks(selected.links).map((l, i) => {
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

          {/* Footer de acções */}
          <div className="shrink-0 grid grid-cols-4 gap-1.5 border-t border-slate-200 p-3 dark:border-white/10 md:p-2.5">
            <button
              type="button"
              onClick={() => void toggleMark(selected)}
              disabled={markingId === selected.id}
              className={`col-span-1 flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-semibold transition disabled:opacity-50 ${
                marks.has(selected.id)
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              <Star size={15} fill={marks.has(selected.id) ? "currentColor" : "none"} />
              {marks.has(selected.id) ? "Marcado" : "Marcar"}
            </button>
            <button
              type="button"
              onClick={() => downloadIcs(selected)}
              className="flex flex-col items-center gap-1 rounded-lg bg-slate-100 py-2 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <CalendarPlus size={15} /> .ics
            </button>
            <a
              href={gcalUrl(selected)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 rounded-lg bg-slate-100 py-2 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <Calendar size={15} /> Google
            </a>
            <button
              type="button"
              onClick={() => void shareEvent(selected)}
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

/* ================================================================
   PÁGINA (wrapped em Suspense por causa de useSearchParams)
================================================================ */

export default function EventosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400">A carregar eventos…</p>
          </div>
        </div>
      }
    >
      <EventosContent />
    </Suspense>
  );
}