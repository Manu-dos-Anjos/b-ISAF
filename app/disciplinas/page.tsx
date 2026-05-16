// app/disciplinas/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Headphones,
  FileText,
  Trophy,
  Sparkles,
  BookOpen,
  TrendingUp,
  Clock,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useUser } from "@/app/lib/context/UserContext";
import { getDisciplinesForUser, getCourseAbbreviation } from "@/app/lib/mockData";
import DisciplineCard, { type DisciplineScheduleInfo } from "@/app/disciplinas/DisciplineCard";

/* ================================================================
   TIPO LOCAL (evita dependência circular com MeuCursoPage)
   Manter sincronizado com WeeklySlot em MeuCursoPage.tsx
   ================================================================ */
type WeeklySlot = {
  id: string;
  day: "Segunda" | "Terça" | "Quarta" | "Quinta" | "Sexta" | "Sábado";
  startTime: string;
  endTime: string;
  discipline: string;
  room?: string;
  professor?: string;
  type: "Teórica" | "Prática" | "Teórico-Prática";
};

/* ================================================================
   CONSTANTES
   ================================================================ */

const SCHEDULE_LS_KEY = "b-isaf:schedule";

const CONTENT_FILTERS = [
  { id: "audio", label: "Áudios",        icon: Headphones },
  { id: "slide", label: "Slides",        icon: FileText   },
  { id: "quiz",  label: "Questionários", icon: Trophy     },
  { id: "tutor", label: "Tutor IA",      icon: Sparkles   },
] as const;

type ContentFilterId = typeof CONTENT_FILTERS[number]["id"];

/* ================================================================
   HELPERS
   ================================================================ */

function buildScheduleMap(slots: WeeklySlot[]): Map<string, DisciplineScheduleInfo> {
  const map = new Map<string, DisciplineScheduleInfo>();
  for (const slot of slots) {
    const key = slot.discipline.toLowerCase().trim();
    if (!map.has(key)) map.set(key, { professor: slot.professor ?? null, nextClass: null });
    const existing = map.get(key)!;
    if (!existing.professor && slot.professor) existing.professor = slot.professor;
    if (!existing.nextClass) {
      existing.nextClass = {
        day: slot.day, startTime: slot.startTime, endTime: slot.endTime,
        room: slot.room, type: slot.type,
      };
    }
  }
  return map;
}

function findScheduleInfo(
  map: Map<string, DisciplineScheduleInfo>,
  name: string
): DisciplineScheduleInfo | null {
  const key = name.toLowerCase().trim();
  if (map.has(key)) return map.get(key)!;
  for (const [k, v] of map.entries()) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

function disciplineHasContentType(
  discipline: ReturnType<typeof getDisciplinesForUser>[number],
  type: ContentFilterId
): boolean {
  if (type === "tutor") return true;
  for (const ch of discipline.chapters ?? [])
    for (const t of ch.topics ?? [])
      if ((t.contents ?? []).some((c) => c.type === type)) return true;
  return false;
}

/* ================================================================
   SKELETONS
   ================================================================ */

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-white/5" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-8 w-full rounded-xl bg-slate-100 dark:bg-white/5" />
        <div className="h-px bg-slate-100 dark:bg-white/5" />
        <div className="flex gap-2">
          <div className="h-6 w-14 rounded-lg bg-slate-100 dark:bg-white/5" />
          <div className="h-6 w-14 rounded-lg bg-slate-100 dark:bg-white/5" />
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/5" />
      </div>
    </div>
  );
}

/* ================================================================
   EMPTY STATE
   ================================================================ */

function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-white/10">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
        <Icon size={24} className="text-slate-400 dark:text-slate-600" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500 dark:text-slate-500">{description}</p>
      {action}
    </div>
  );
}

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */

export default function DisciplinasPage() {
  const { user } = useUser();

  /* ── TODOS os hooks ANTES de qualquer return condicional ── */

  const [activeFilters, setActiveFilters] = useState<Set<ContentFilterId>>(new Set());
  const [scheduleSlots,  setScheduleSlots]  = useState<WeeklySlot[]>([]);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);

  /* Carregar horário do localStorage */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCHEDULE_LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WeeklySlot[];
        if (Array.isArray(parsed)) setScheduleSlots(parsed);
      }
    } catch {
      // sem dados de horário — silencioso
    } finally {
      setScheduleLoaded(true);
    }
    /*
     * TODO (Supabase):
     * const { data } = await supabase.from("schedules").select("*").eq("student_id", user.id);
     * setScheduleSlots(data ?? []);
     */
  }, []);

  /* Dados do utilizador — com fallback seguro para quando user === null */
  const year      = user?.academic?.year     ?? "";
  const semester  = user?.academic?.semester ?? "";
  const course    = user?.academic?.course   ?? "";

  const disciplines = useMemo(
    () => (user ? getDisciplinesForUser(year, semester, course) : []),
    [user, year, semester, course]
  );

  const courseAbbr = useMemo(
    () => (course ? getCourseAbbreviation(course) : ""),
    [course]
  );

  const scheduleMap = useMemo(() => buildScheduleMap(scheduleSlots), [scheduleSlots]);

  /* Stats */
  const stats = useMemo(() => {
    let audios = 0, slides = 0, quizzes = 0, total = 0;
    for (const d of disciplines) {
      total++;
      for (const ch of d.chapters ?? [])
        for (const t of ch.topics ?? [])
          for (const c of t.contents ?? []) {
            if (c.type === "audio") audios++;
            else if (c.type === "slide") slides++;
            else if (c.type === "quiz") quizzes++;
          }
    }
    const avgProgress = total
      ? Math.round(disciplines.reduce((s, d) => s + (d.progress ?? 0), 0) / total)
      : 0;
    return { total, audios, slides, quizzes, avgProgress };
  }, [disciplines]);

  /* Filtros */
  const filtered = useMemo(() => {
    let list = disciplines;
    if (activeFilters.size > 0)
      list = list.filter((d) => [...activeFilters].every((f) => disciplineHasContentType(d, f)));
    return list;
  }, [disciplines, activeFilters]);

  const toggleFilter = (id: ContentFilterId) =>
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const hasActiveFilters = activeFilters.size > 0;

  /* ── Loading state ── */
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-white/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-500 dark:text-blue-400">
                {course}
              </p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {courseAbbr} · {year} · {semester}
              </h1>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-white/5 dark:bg-white/[0.03]">
              <TrendingUp size={16} className="shrink-0 text-blue-500" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Progresso médio</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{stats.avgProgress}%</p>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Disciplinas</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/5">
          {[
            { icon: Headphones, label: "Áudios",  value: stats.audios,  color: "text-blue-500"   },
            { icon: FileText,   label: "Slides",  value: stats.slides,  color: "text-indigo-500" },
            { icon: Trophy,     label: "Quizzes", value: stats.quizzes, color: "text-amber-500"  },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-2.5 px-4 py-3">
              <Icon size={15} className={`${color} opacity-80`} />
              <div>
                <p className="text-base font-bold leading-none text-slate-800 dark:text-white">{value}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* ── Filtros ── */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={13} className="shrink-0 text-slate-400" />
        <span className="text-xs text-slate-400">Filtrar por:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {CONTENT_FILTERS.map(({ id, label, icon: Icon }) => {
            const active = activeFilters.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleFilter(id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/30"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setActiveFilters(new Set())}
              className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={11} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* ── Grelha ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {hasActiveFilters
              ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`
              : `${stats.total} disciplina${stats.total !== 1 ? "s" : ""}`}
          </h2>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((discipline) => (
              <DisciplineCard
                key={discipline.id}
                discipline={discipline}
                scheduleInfo={findScheduleInfo(scheduleMap, discipline.title)}
              />
            ))}
          </div>
        ) : disciplines.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Sem disciplinas disponíveis"
            description={`Não encontrámos disciplinas para ${year} do ${semester}. Verifica os teus dados académicos.`}
          />
        ) : (
          <EmptyState
            icon={SlidersHorizontal}
            title="Nenhuma disciplina encontrada"
            description="Remove os filtros activos para ver todas as disciplinas."
            action={
              <button
                type="button"
                onClick={() => setActiveFilters(new Set())}
                className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/20"
              >
                Limpar filtros
              </button>
            }
          />
        )}

        {/* Aviso de horário sem dados */}
        {scheduleLoaded && scheduleSlots.length === 0 && disciplines.length > 0 && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-400/80">
            <Clock size={13} className="mt-0.5 shrink-0 text-amber-500" />
            <p>
              Os nomes dos docentes e aulas agendadas não estão disponíveis.
              Vai a <strong className="text-amber-400">Meu Curso → Horário Semanal</strong> e
              faz o upload do teu horário em PDF para preencher automaticamente.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
