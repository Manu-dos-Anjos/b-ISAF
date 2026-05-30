// app/(app)/disciplinas/page.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Headphones, FileText, Trophy, Sparkles,
  BookOpen, TrendingUp, X,
  SlidersHorizontal, AlertCircle,
} from "lucide-react";
import { useUser }          from "@/app/lib/context/UserContext";
import { useDisciplines }   from "@/app/lib/hooks/useDisciplines";
import { useSchedule }      from "@/app/lib/hooks/useSchedule";
import { useScheduleInfo }  from "@/app/lib/hooks/useScheduleInfo";
import DisciplineCard       from "./DisciplineCard";
import type { DisciplineCardData } from "./DisciplineCard";

/* ================================================================
   FILTROS
   ================================================================ */

const CONTENT_FILTERS = [
  { id: "audio", label: "Áudios",        icon: Headphones },
  { id: "slide", label: "Slides",        icon: FileText   },
  { id: "quiz",  label: "Questionários", icon: Trophy     },
  { id: "tutor", label: "Tutor IA",      icon: Sparkles   },
] as const;

type FilterId = typeof CONTENT_FILTERS[number]["id"];

/* ================================================================
   HELPERS
   ================================================================ */

function toDisciplineCardData(
  discipline: ReturnType<typeof useDisciplines>["disciplines"][number],
): DisciplineCardData {
  const contentCounts = { audio: 0, slide: 0, quiz: 0 };
  let lessonCount = 0;

  for (const ch of discipline.chapters) {
    for (const t of ch.topics) {
      lessonCount += t.contents.length;
      for (const c of t.contents) {
        if (c.type === "audio")      contentCounts.audio++;
        else if (c.type === "slide") contentCounts.slide++;
        else if (c.type === "quiz")  contentCounts.quiz++;
      }
    }
  }

  return {
    id:            discipline.id,
    title:         discipline.name,
    code:          discipline.code,
    href:          `/disciplinas/${discipline.id}`,
    coverUrl:      discipline.cover_image_url,
    progress:      discipline.progress,
    year:          `${discipline.year}º Ano`,
    semester:      `${discipline.semester}º Semestre`,
    lessonCount,
    chaptersCount: discipline.chapters.length,
    contentCounts,
  };
}

/* ================================================================
   SKELETONS
   ================================================================ */

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <div className="aspect-video w-full bg-slate-100 dark:bg-white/5" />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-white/5" />
          <div className="h-3 w-32 rounded bg-slate-100 dark:bg-white/5" />
        </div>
        <div className="h-10 w-full rounded-xl bg-slate-100 dark:bg-white/5" />
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

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
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
      <h3 className="mt-4 font-semibold text-slate-700 dark:text-slate-300">
        {title}
      </h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500">{description}</p>
      {action}
    </div>
  );
}

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */

export default function DisciplinasPage() {
  const { user, profile, course } = useUser();

  const [activeFilters, setActiveFilters] = useState<Set<FilterId>>(new Set());

  /* ── Dados ── */
  const { disciplines, isLoading: discLoading, error, refetch } = useDisciplines();
  const { schedule, isLoading: schedLoading }                   = useSchedule();
  const scheduleInfoMap                                          = useScheduleInfo(disciplines, schedule);

  const isLoading = discLoading || schedLoading;

  /* ── Stats ── */
  const stats = useMemo(() => {
    let audios = 0, slides = 0, quizzes = 0;
    for (const d of disciplines)
      for (const ch of d.chapters)
        for (const t of ch.topics)
          for (const c of t.contents) {
            if (c.type === "audio")      audios++;
            else if (c.type === "slide") slides++;
            else if (c.type === "quiz")  quizzes++;
          }
    const avgProgress = disciplines.length
      ? Math.round(
          disciplines.reduce((s, d) => s + d.progress, 0) / disciplines.length
        )
      : 0;
    return { total: disciplines.length, audios, slides, quizzes, avgProgress };
  }, [disciplines]);

  /* ── Filtro de conteúdo ── */
  const filtered = useMemo(() => {
    if (activeFilters.size === 0) return disciplines;
    return disciplines.filter((d) =>
      [...activeFilters].every((f) => {
        if (f === "tutor") return true;
        return d.chapters.some((ch) =>
          ch.topics.some((t) => t.contents.some((c) => c.type === f))
        );
      })
    );
  }, [disciplines, activeFilters]);

  const toggleFilter = (id: FilterId) =>
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ── Dados académicos ── */
  const yearLabel     = profile?.current_year     ? `${profile.current_year}º Ano`         : "";
  const semesterLabel = profile?.current_semester ? `${profile.current_semester}º Semestre` : "";
  const courseName    = course?.name ?? user?.academic?.course ?? "";
  const courseCode    = course?.code ?? "";

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* ── Erro ── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 py-16 text-center">
        <AlertCircle size={28} className="text-rose-400" />
        <p className="mt-3 font-semibold text-slate-200">
          Erro ao carregar disciplinas
        </p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 transition hover:bg-rose-500/20"
        >
          Tentar novamente
        </button>
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
                {courseName}
              </p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {[courseCode, yearLabel, semesterLabel]
                  .filter(Boolean)
                  .join(" · ")}
              </h1>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-white/5 dark:bg-white/[0.03]">
              <TrendingUp size={16} className="shrink-0 text-blue-500" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Progresso médio
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {stats.avgProgress}%
                </p>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Disciplinas
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats de conteúdo */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/5">
          {[
            { icon: Headphones, label: "Áudios",  value: stats.audios,  color: "text-blue-500"   },
            { icon: FileText,   label: "Slides",  value: stats.slides,  color: "text-indigo-500" },
            { icon: Trophy,     label: "Quizzes", value: stats.quizzes, color: "text-amber-500"  },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-2.5 px-4 py-3">
              <Icon size={15} className={`${color} opacity-80`} />
              <div>
                <p className="text-base font-bold leading-none text-slate-800 dark:text-white">
                  {value}
                </p>
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

          {activeFilters.size > 0 && (
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
            {activeFilters.size > 0
              ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`
              : `${stats.total} disciplina${stats.total !== 1 ? "s" : ""}`}
          </h2>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((discipline) => (
              <DisciplineCard
                key={discipline.id}
                discipline={toDisciplineCardData(discipline)}
                scheduleInfo={scheduleInfoMap.get(discipline.id)}
              />
            ))}
          </div>
        ) : disciplines.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Sem disciplinas disponíveis"
            description={`Não encontrámos disciplinas para ${yearLabel} do ${semesterLabel}. Verifica o teu perfil académico.`}
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
      </section>
    </div>
  );
}