// app/(app)/disciplinas/page.tsx
"use client";

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  type ElementType,
  type ReactNode,
} from "react";
import {
  Headphones,
  FileText,
  Trophy,
  Sparkles,
  BookOpen,
  TrendingUp,
  X,
  SlidersHorizontal,
  AlertCircle,
  Plus,
  Trash2,
  GraduationCap,
  CheckCircle2,
  Loader2,
  Lock,
  Info,
  LayoutGrid,
  List,
  ChevronRight,
  Clock,
  User,
  MapPin,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useUser } from "@/app/lib/context/UserContext";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useDisciplines, type DisciplineRow } from "@/app/lib/hooks/useDisciplines";
import { useSchedule } from "@/app/lib/hooks/useSchedule";
import { useScheduleInfo } from "@/app/lib/hooks/useScheduleInfo";
import DisciplineCard, { type DisciplineCardData } from "./DisciplineCard";
import { CURRICULUM, type CourseId } from "@/app/lib/curriculum";

/* ================================================================
   TIPOS AUXILIARES
================================================================ */
type CurriculumEntry = {
  id: string;
  name: string;
  code: string;
  year: number;
  semester: number;
  annual?: boolean;
};

type ViewMode = "grid" | "list";

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
   CONSTANTES
================================================================ */
const EXTRA_DISC_LS_KEY      = "b-isaf:extraDisciplines";
const VIEW_MODE_LS_KEY       = "b-isaf:disciplinas:viewMode";
const MAX_EXTRA_DISCIPLINES  = 3;

const COURSE_ID_MAP: Record<string, CourseId> = {
  "Informática de Gestão Financeira": "informatica-gestao-financeira",
  "Contabilidade e Finanças":         "contabilidade-financas",
  "Gestão Bancária & Seguros":        "gestao-bancaria-seguros",
  "Gestão Bancária e Seguros":        "gestao-bancaria-seguros",
  IGF: "informatica-gestao-financeira",
  CF:  "contabilidade-financas",
  GBS: "gestao-bancaria-seguros",
};

const SCROLLBAR_CLASS = [
  "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/40",
  "hover:scrollbar-thumb-slate-600/60 [&::-webkit-scrollbar]:w-1.5",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/40",
  "hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/60",
].join(" ");

const TYPE_DOT: Record<string, string> = {
  "Teórica":         "bg-blue-500",
  "Prática":         "bg-emerald-500",
  "Teórico-Prática": "bg-violet-500",
};

const TYPE_BADGE_LIST: Record<string, string> = {
  "Teórica":         "text-blue-400",
  "Prática":         "text-emerald-400",
  "Teórico-Prática": "text-violet-400",
};

/* ================================================================
   HELPERS
================================================================ */
function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveCourseId(courseName: string, courseCode: string): CourseId {
  return (
    COURSE_ID_MAP[courseName] ??
    COURSE_ID_MAP[courseCode] ??
    "informatica-gestao-financeira"
  );
}

function getCurriculumEntries(courseId: CourseId): CurriculumEntry[] {
  const curriculum = CURRICULUM[courseId];
  const entries: CurriculumEntry[] = [];
  const seen = new Set<string>();
  for (const yearData of curriculum.years) {
    for (const sem of yearData.semesters) {
      for (const disc of sem.disciplines) {
        if (seen.has(disc.id)) continue;
        seen.add(disc.id);
        const code = disc.id.split("-").pop()?.toUpperCase() ?? "";
        entries.push({
          id: disc.id, name: disc.name, code,
          year: yearData.year, semester: sem.number, annual: disc.annual,
        });
      }
    }
  }
  return entries;
}

function isSemesterAlreadyPassed(
  discYear: number, discSemester: number,
  currentYear: number, currentSemester: number,
): boolean {
  if (discYear < currentYear) return true;
  if (discYear === currentYear && discSemester < currentSemester) return true;
  return false;
}

function resolveRealDisciplineId(
  sourceId: string,
  lookup: Record<string, string>,
  entries: CurriculumEntry[],
) {
  if (lookup[sourceId]) return lookup[sourceId];
  const code = sourceId.split("-").pop()?.toUpperCase() ?? sourceId.toUpperCase();
  if (lookup[code]) return lookup[code];
  const norm = normalizeText(sourceId);
  if (lookup[norm]) return lookup[norm];
  const entry = entries.find((e) =>
    e.id === sourceId ||
    e.code.toUpperCase() === code ||
    normalizeText(e.name) === norm,
  );
  if (entry) {
    return (
      lookup[entry.id] ??
      lookup[entry.code.toUpperCase()] ??
      lookup[normalizeText(entry.name)] ??
      sourceId
    );
  }
  return sourceId;
}

function toDisciplineCardData(discipline: DisciplineRow): DisciplineCardData {
  const contentCounts = { audio: 0, slide: 0, quiz: 0 };
  let lessonCount = 0;
  for (const ch of discipline.chapters ?? []) {
    for (const t of ch.topics ?? []) {
      lessonCount += t.contents?.length ?? 0;
      for (const c of t.contents ?? []) {
        if (c.type === "audio") contentCounts.audio++;
        else if (c.type === "slide") contentCounts.slide++;
        else if (c.type === "quiz") contentCounts.quiz++;
      }
    }
  }
  return {
    id: discipline.id,
    title: discipline.name,
    code: discipline.code ?? "",
    href: `/disciplinas/${discipline.id}`,
    coverUrl: discipline.cover_image_url ?? null,
    progress: discipline.progress ?? 0,
    year: `${discipline.year}º Ano`,
    semester: `${discipline.semester}º Semestre`,
    lessonCount,
    chaptersCount: discipline.chapters?.length ?? 0,
    contentCounts,
  };
}

function toExtraCardData(entry: CurriculumEntry, realId: string): DisciplineCardData {
  return {
    id: realId,
    title: entry.name,
    code: entry.code,
    href: `/disciplinas/${realId}`,
    coverUrl: null,
    progress: 0,
    year: `${entry.year}º Ano`,
    semester: `${entry.semester}º Semestre`,
    lessonCount: 0,
    chaptersCount: 0,
    contentCounts: { audio: 0, slide: 0, quiz: 0 },
  };
}

function disciplineHasContentType(d: DisciplineRow, type: FilterId): boolean {
  if (type === "tutor") return true;
  for (const ch of d.chapters ?? [])
    for (const t of ch.topics ?? [])
      if ((t.contents ?? []).some((c) => c.type === type)) return true;
  return false;
}

/* ================================================================
   VISTA EM LISTA — item individual (com imagem)
================================================================ */
function DisciplineListItem({
  discipline,
  scheduleInfo,
  badge,
  onRemove,
}: {
  discipline: DisciplineCardData;
  scheduleInfo?: {
    professor?: string | null;
    nextClass?: {
      day: string;
      startTime: string;
      endTime: string;
      room?: string;
      type: "Teórica" | "Prática" | "Teórico-Prática";
    } | null;
  } | null;
  badge?: string;
  onRemove?: () => void;
}) {
  const { contentCounts, progress } = discipline;
  const hasContent =
    contentCounts.audio > 0 || contentCounts.slide > 0 || contentCounts.quiz > 0;
  const next = scheduleInfo?.nextClass;

  return (
    <Link
      href={discipline.href}
      className="group relative flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20 dark:hover:shadow-none"
    >
      {/* Badge (ex: "Semestre anterior") */}
      {badge && (
        <span className="absolute -top-px left-14 z-10 rounded-b-lg border border-t-0 border-indigo-500/30 bg-slate-900 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
          {badge}
        </span>
      )}

      {/* Botão remover */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onRemove(); }}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/80 text-slate-400 backdrop-blur-sm transition hover:bg-rose-500/20 hover:text-rose-400"
          title="Remover cadeira"
        >
          <Trash2 size={12} />
        </button>
      )}

      {/* ── Coluna esquerda: imagem ── */}
      <div className="relative w-28 shrink-0 overflow-hidden bg-slate-100 dark:bg-white/5 sm:w-36">
        {discipline.coverUrl ? (
          <>
            <Image
              src={discipline.coverUrl}
              alt={`Capa de ${discipline.title}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes="144px"
            />
            {/* Véu */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-950/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
          </>
        ) : (
          /* Placeholder */
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen size={24} className="text-slate-600" />
            </div>
          </div>
        )}

        {/* Badge de progresso sobre a imagem */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1 backdrop-blur-sm ring-1 ring-white/10">
            <div className="h-1 w-10 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[9px] font-bold tabular-nums text-white/80">
              {progress}%
            </span>
          </div>
        </div>

        {/* Badge ano · semestre */}
        <div className="absolute left-0 right-0 top-2 flex justify-center">
          <span className="rounded-md bg-black/40 px-2 py-0.5 text-[9px] font-semibold text-white/70 backdrop-blur-sm ring-1 ring-white/10">
            {discipline.year}
          </span>
        </div>
      </div>

      {/* ── Coluna direita: conteúdo ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 px-4 py-3.5">

        {/* Título + código */}
        <div className="flex items-start justify-between gap-2 pr-6">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-white">
              {discipline.title}
            </h3>
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              {discipline.semester}
              {discipline.code && (
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-px font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400">
                  {discipline.code}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Professor */}
        {scheduleInfo?.professor && (
          <div className="flex items-center gap-1.5">
            <User size={10} className="shrink-0 text-slate-400" />
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {scheduleInfo.professor}
            </p>
          </div>
        )}

        {/* Próxima aula */}
        {next ? (
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[next.type]}`} />
            <p className={`text-[11px] font-medium ${TYPE_BADGE_LIST[next.type]}`}>
              {next.day}, {next.startTime}
              {next.endTime !== next.startTime && (
                <span className="opacity-70"> – {next.endTime}</span>
              )}
              {next.room && (
                <span className="ml-1 inline-flex items-center gap-0.5 opacity-60 text-slate-400">
                  <MapPin size={9} />
                  {next.room}
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-600">
            <Clock size={10} className="shrink-0" />
            Sem aulas agendadas
          </div>
        )}

        {/* Separador */}
        <div className="h-px bg-slate-100 dark:bg-white/5" />

        {/* Conteúdos + seta */}
        <div className="flex items-center gap-2">
          {hasContent ? (
            <>
              {contentCounts.audio > 0 && (
                <span className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
                  <Headphones size={10} /> {contentCounts.audio}
                </span>
              )}
              {contentCounts.slide > 0 && (
                <span className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <FileText size={10} /> {contentCounts.slide}
                </span>
              )}
              {contentCounts.quiz > 0 && (
                <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-500 dark:bg-amber-500/10 dark:text-amber-400">
                  <Trophy size={10} /> {contentCounts.quiz}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-600">
              {discipline.chaptersCount} {discipline.chaptersCount === 1 ? "capítulo" : "capítulos"} · sem conteúdos
            </span>
          )}
          <ArrowRight
            size={13}
            className="ml-auto shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600"
          />
        </div>
      </div>
    </Link>
  );
}

/* ================================================================
   BOTÃO DE ALTERNÂNCIA DE VISTA
================================================================ */
function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => onChange("grid")}
        title="Vista em grelha"
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
          mode === "grid"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        }`}
      >
        <LayoutGrid size={14} />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        title="Vista em lista"
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
          mode === "list"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        }`}
      >
        <List size={14} />
      </button>
    </div>
  );
}

/* ================================================================
   SKELETONS
================================================================ */
function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <div className="h-36 w-full bg-slate-100 dark:bg-white/5" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-white/5" />
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

function ListSkeleton() {
  return (
    <div className="animate-pulse flex overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <div className="w-28 shrink-0 bg-slate-100 dark:bg-white/5 sm:w-36" style={{ minHeight: 110 }} />
      <div className="flex-1 space-y-3 p-4">
        <div className="h-3.5 w-2/3 rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-2.5 w-1/3 rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-2.5 w-1/2 rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-px bg-slate-100 dark:bg-white/5" />
        <div className="flex gap-2">
          <div className="h-6 w-12 rounded-lg bg-slate-100 dark:bg-white/5" />
          <div className="h-6 w-12 rounded-lg bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   EMPTY STATE / BANNERS
================================================================ */
function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: ElementType; title: string; description: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-white/10">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
        <Icon size={24} className="text-slate-400 dark:text-slate-600" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500">{description}</p>
      {action}
    </div>
  );
}

function ExtraLimitBanner({ current, max }: { current: number; max: number }) {
  const remaining = max - current;
  const atLimit   = remaining === 0;
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${
      atLimit
        ? "border-rose-500/20 bg-rose-500/5 text-rose-400"
        : "border-amber-500/20 bg-amber-500/5 text-amber-400"
    }`}>
      {atLimit
        ? <Lock size={14} className="mt-0.5 shrink-0" />
        : <Info size={14} className="mt-0.5 shrink-0" />}
      <p>
        {atLimit
          ? <><strong>{max} cadeiras extras</strong>: limite atingido. Remove uma para adicionar outra.</>
          : <>Podes adicionar <strong>{remaining} cadeira{remaining !== 1 ? "s" : ""}</strong> extra{remaining !== 1 ? "s" : ""} ({current}/{max}).</>}
      </p>
    </div>
  );
}

/* ================================================================
   MODAL: ADICIONAR CADEIRA EXTRA
================================================================ */
function AddExtraDisciplineModal({
  courseId, currentDisciplineIds, pageDisciplineIds, extraDisciplineIds,
  resolveRealId, currentYear, currentSemester, onAdd, onClose,
}: {
  courseId: CourseId;
  currentDisciplineIds: Set<string>;
  pageDisciplineIds: Set<string>;
  extraDisciplineIds: Set<string>;
  resolveRealId: (sourceId: string) => string;
  currentYear: number;
  currentSemester: number;
  onAdd: (disciplineId: string) => void;
  onClose: () => void;
}) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const curriculum = CURRICULUM[courseId];
  const entries    = useMemo(() => getCurriculumEntries(courseId), [courseId]);
  const atLimit    = extraDisciplineIds.size >= MAX_EXTRA_DISCIPLINES;

  const eligibleYears = useMemo(() => {
    const years = new Set<number>();
    for (const entry of entries) {
      if (isSemesterAlreadyPassed(entry.year, entry.semester, currentYear, currentSemester))
        years.add(entry.year);
    }
    return years;
  }, [entries, currentYear, currentSemester]);

  const visibleEntries = useMemo(() =>
    entries.filter((e) => {
      const passed      = isSemesterAlreadyPassed(e.year, e.semester, currentYear, currentSemester);
      const matchesYear = !selectedYear || e.year === selectedYear;
      return passed && matchesYear;
    }),
    [entries, currentYear, currentSemester, selectedYear],
  );

  const grouped = useMemo(() => {
    const map = new Map<number, CurriculumEntry[]>();
    for (const entry of visibleEntries) {
      const arr = map.get(entry.year) ?? [];
      arr.push(entry);
      map.set(entry.year, arr);
    }
    return map;
  }, [visibleEntries]);

  const hasEligible = eligibleYears.size > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="font-semibold text-white">Adicionar cadeira</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Apenas cadeiras de semestres já concluídos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Indicador de limite */}
        <div className="border-b border-white/5 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {Array.from({ length: MAX_EXTRA_DISCIPLINES }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    i < extraDisciplineIds.size ? "bg-indigo-500" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
            <span className={`text-xs font-medium ${atLimit ? "text-rose-400" : "text-slate-400"}`}>
              {extraDisciplineIds.size}/{MAX_EXTRA_DISCIPLINES} cadeiras extras
            </span>
          </div>
          {atLimit && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-400">
              <Lock size={11} /> Limite atingido. Remove uma cadeira para adicionar outra.
            </p>
          )}
        </div>

        {/* Filtro por ano */}
        {hasEligible && (
          <div className="flex gap-2 border-b border-white/10 px-5 py-3">
            <button
              type="button"
              onClick={() => setSelectedYear(null)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                !selectedYear ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              Todos
            </button>
            {curriculum.years
              .filter((y) => eligibleYears.has(y.year))
              .map((y) => (
                <button
                  key={y.year}
                  type="button"
                  onClick={() => setSelectedYear(y.year)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    selectedYear === y.year ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {y.year}º Ano
                </button>
              ))}
          </div>
        )}

        {/* Lista */}
        <div className={`max-h-80 overflow-y-auto p-3 ${SCROLLBAR_CLASS}`}>
          {!hasEligible ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Lock size={24} className="mb-3 text-slate-600" />
              <p className="text-sm font-medium text-slate-400">Sem cadeiras disponíveis</p>
              <p className="mt-1 max-w-xs text-xs text-slate-600">
                Só podes adicionar cadeiras de semestres já concluídos.
              </p>
            </div>
          ) : grouped.size === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500">
              Nenhuma cadeira disponível para este ano.
            </div>
          ) : (
            Array.from(grouped.entries()).map(([year, yearEntries]) => (
              <div key={year} className="mb-3">
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {year}º Ano
                </p>
                <div className="space-y-1">
                  {yearEntries.map((entry) => {
                    const realId     = resolveRealId(entry.id);
                    const isOnPage   = pageDisciplineIds.has(realId);
                    const isAdded    = extraDisciplineIds.has(realId);
                    const isDisabled = isOnPage || isAdded || (atLimit && !isAdded);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => { if (!isDisabled) { onAdd(realId); onClose(); } }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          isOnPage  ? "border border-blue-500/30 bg-blue-500/10 text-blue-200 ring-1 ring-blue-500/20"
                          : isAdded ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : atLimit ? "cursor-not-allowed opacity-40 text-slate-500"
                          : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isOnPage  ? "border-blue-400/40 bg-blue-500/20"
                          : isAdded ? "border-emerald-500/40 bg-emerald-500/20"
                          : atLimit ? "border-white/5 bg-white/5"
                          : "border-white/10 bg-white/5"
                        }`}>
                          {isOnPage  ? <CheckCircle2 size={12} className="text-blue-400" />
                          : isAdded  ? <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          : atLimit  ? <Lock size={9} className="text-slate-600" />
                          : <Plus size={10} className="text-slate-500" />}
                        </div>
                        <span className="flex-1 leading-snug">{entry.name}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                          isOnPage  ? "bg-blue-500/15 text-blue-300"
                          : isAdded ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-white/5 text-slate-600"
                        }`}>
                          {isOnPage ? "Na página" : isAdded ? "Adicionada" : `${entry.semester}º Sem`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/5 px-5 py-3">
          <p className="text-[11px] text-slate-600">
            Só são listadas cadeiras de semestres anteriores ao actual ({currentYear}º ano,{" "}
            {currentSemester}º semestre).
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   COMPONENTE PRINCIPAL
================================================================ */
export default function DisciplinasPage() {
  const { user, profile, course } = useUser();
  const { supabase, user: authUser } = useSupabase();

  const [activeFilters,  setActiveFilters]  = useState<Set<FilterId>>(new Set());
  const [extraIds,       setExtraIds]       = useState<string[]>([]);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [viewMode,       setViewMode]       = useState<ViewMode>("grid");

  const [disciplineLookup, setDisciplineLookup] = useState<Record<string, string>>({});
  const [lookupReady,      setLookupReady]      = useState(false);

  /* ── Restaurar preferência de vista ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_LS_KEY) as ViewMode | null;
      if (saved === "grid" || saved === "list") setViewMode(saved);
    } catch { /* ignore */ }
  }, []);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    try { localStorage.setItem(VIEW_MODE_LS_KEY, mode); } catch { /* ignore */ }
  };

  /* ── Dados ── */
  const { disciplines, isLoading: discLoading, error, refetch } = useDisciplines();
  const { schedule, isLoading: schedLoading } = useSchedule();
  const scheduleInfoMap = useScheduleInfo(disciplines, schedule);
  const isLoading = discLoading || schedLoading;

  /* ── Curso e ano/semestre ── */
  const courseName      = course?.name ?? user?.academic?.course ?? "";
  const courseCode      = course?.code ?? "";
  const currentYear     = profile?.current_year     ?? 1;
  const currentSemester = profile?.current_semester ?? 1;

  const currentCourseId      = useMemo(() => resolveCourseId(courseName, courseCode), [courseName, courseCode]);
  const currentCourseEntries = useMemo(() => getCurriculumEntries(currentCourseId), [currentCourseId]);
  const pageDisciplineIds    = useMemo(() => new Set(disciplines.map((d) => d.id)), [disciplines]);

  const resolveLocalIdToRealId = useCallback(
    (sourceId: string) => resolveRealDisciplineId(sourceId, disciplineLookup, currentCourseEntries),
    [disciplineLookup, currentCourseEntries],
  );

  /* ── Lookup ── */
  useEffect(() => {
    let active = true;
    const load = async () => {
      const courseUuid = profile?.course_id ?? undefined;
      if (!courseUuid) { if (active) setLookupReady(true); return; }
      try {
        const { data, error: supaErr } = await supabase
          .from("discipline_courses")
          .select("discipline_id, disciplines(id, name, code)")
          .eq("course_id", courseUuid);
        if (supaErr) throw supaErr;
        const next: Record<string, string> = {};
        for (const row of (data ?? []) as any[]) {
          const disc = row.disciplines;
          if (!disc) continue;
          const realId = row.discipline_id || disc.id;
          if (disc.id)   next[disc.id] = realId;
          if (disc.code) next[String(disc.code).toUpperCase()] = realId;
          if (disc.name) next[normalizeText(disc.name)] = realId;
        }
        if (active) setDisciplineLookup(next);
      } catch (err) {
        console.error("Erro ao carregar lookup:", err);
      } finally {
        if (active) setLookupReady(true);
      }
    };
    void load();
    return () => { active = false; };
  }, [profile?.course_id, supabase]);

  /* ── Carregar cadeiras extra ── */
  useEffect(() => {
    const fromLS = () => {
      try {
        const raw = localStorage.getItem(EXTRA_DISC_LS_KEY);
        if (raw) setExtraIds(JSON.parse(raw) as string[]);
      } catch { /* ignore */ }
    };
    if (!authUser) { fromLS(); return; }
    const fromSupa = async () => {
      try {
        const { data, error: e } = await supabase
          .from("student_extra_disciplines")
          .select("discipline_id")
          .eq("student_id", authUser.id);
        if (e) throw e;
        setExtraIds((data ?? []).map((r: any) => r.discipline_id));
      } catch { fromLS(); }
    };
    void fromSupa();
  }, [authUser, supabase]);

  /* ── Normalizar extras ── */
  useEffect(() => {
    if (!lookupReady) return;
    setExtraIds((prev) => {
      const normalized = [...new Set(
        prev.map((id) => resolveRealDisciplineId(id, disciplineLookup, currentCourseEntries)),
      )].filter((id) => {
        if (pageDisciplineIds.has(id)) return false;
        const entry = currentCourseEntries.find((e) => {
          const resolved = resolveRealDisciplineId(e.id, disciplineLookup, currentCourseEntries);
          return resolved === id;
        });
        if (!entry) return false;
        return isSemesterAlreadyPassed(entry.year, entry.semester, currentYear, currentSemester);
      });
      const changed =
        normalized.length !== prev.length || normalized.some((id, i) => id !== prev[i]);
      if (!changed) return prev;
      try { localStorage.setItem(EXTRA_DISC_LS_KEY, JSON.stringify(normalized)); } catch { /* ignore */ }
      return normalized;
    });
  }, [lookupReady, disciplineLookup, currentCourseEntries, pageDisciplineIds, currentYear, currentSemester]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    let audios = 0, slides = 0, quizzes = 0;
    for (const d of disciplines)
      for (const ch of d.chapters ?? [])
        for (const t of ch.topics ?? [])
          for (const c of t.contents ?? []) {
            if (c.type === "audio") audios++;
            else if (c.type === "slide") slides++;
            else if (c.type === "quiz") quizzes++;
          }
    const avgProgress = disciplines.length
      ? Math.round(disciplines.reduce((s, d) => s + (d.progress ?? 0), 0) / disciplines.length)
      : 0;
    return { total: disciplines.length, audios, slides, quizzes, avgProgress };
  }, [disciplines]);

  /* ── Filtro ── */
  const filtered = useMemo(() => {
    if (activeFilters.size === 0) return disciplines;
    return disciplines.filter((d) =>
      [...activeFilters].every((f) => disciplineHasContentType(d, f)),
    );
  }, [disciplines, activeFilters]);

  const toggleFilter = (id: FilterId) =>
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ── Extras ── */
  const normalizedExtraIds = useMemo(() => {
    if (!lookupReady) return extraIds;
    return [...new Set(
      extraIds.map((id) => resolveRealDisciplineId(id, disciplineLookup, currentCourseEntries)),
    )].filter((id) => !pageDisciplineIds.has(id));
  }, [extraIds, lookupReady, disciplineLookup, currentCourseEntries, pageDisciplineIds]);

  const extraDisciplineIdsSet = useMemo(() => new Set(normalizedExtraIds), [normalizedExtraIds]);

  const currentDisciplineIds = useMemo(
    () => new Set([...disciplines.map((d) => d.id), ...normalizedExtraIds]),
    [disciplines, normalizedExtraIds],
  );

  const extraDisciplineCards = useMemo(() => {
    if (!lookupReady) return [];
    return normalizedExtraIds
      .map((realId) => {
        const entry = currentCourseEntries.find((e) => {
          const resolved = resolveRealDisciplineId(e.id, disciplineLookup, currentCourseEntries);
          return resolved === realId;
        });
        if (!entry) return null;
        return toExtraCardData(entry, realId);
      })
      .filter((d): d is DisciplineCardData => !!d);
  }, [normalizedExtraIds, lookupReady, currentCourseEntries, disciplineLookup]);

  const atExtraLimit = normalizedExtraIds.length >= MAX_EXTRA_DISCIPLINES;

  /* ── Adicionar / remover extras ── */
  const addExtra = useCallback(async (sourceId: string) => {
    if (normalizedExtraIds.length >= MAX_EXTRA_DISCIPLINES) return;
    const realId = resolveRealDisciplineId(sourceId, disciplineLookup, currentCourseEntries);
    const entry  = currentCourseEntries.find((e) =>
      resolveRealDisciplineId(e.id, disciplineLookup, currentCourseEntries) === realId,
    );
    if (!entry || !isSemesterAlreadyPassed(entry.year, entry.semester, currentYear, currentSemester)) return;
    const newIds = [...new Set([...normalizedExtraIds, realId])].filter((id) => !pageDisciplineIds.has(id));
    setExtraIds(newIds);
    if (authUser) {
      try {
        await supabase
          .from("student_extra_disciplines")
          .upsert(
            { student_id: authUser.id, discipline_id: realId },
            { onConflict: "student_id,discipline_id" },
          );
      } catch {
        try { localStorage.setItem(EXTRA_DISC_LS_KEY, JSON.stringify(newIds)); } catch { /* ignore */ }
      }
    } else {
      try { localStorage.setItem(EXTRA_DISC_LS_KEY, JSON.stringify(newIds)); } catch { /* ignore */ }
    }
  }, [authUser, supabase, disciplineLookup, currentCourseEntries, normalizedExtraIds, pageDisciplineIds, currentYear, currentSemester]);

  const removeExtra = useCallback(async (disciplineId: string) => {
    const newIds = normalizedExtraIds.filter((id) => id !== disciplineId);
    setExtraIds(newIds);
    if (authUser) {
      try {
        await supabase
          .from("student_extra_disciplines")
          .delete()
          .eq("student_id", authUser.id)
          .eq("discipline_id", disciplineId);
      } catch {
        try { localStorage.setItem(EXTRA_DISC_LS_KEY, JSON.stringify(newIds)); } catch { /* ignore */ }
      }
    } else {
      try { localStorage.setItem(EXTRA_DISC_LS_KEY, JSON.stringify(newIds)); } catch { /* ignore */ }
    }
  }, [authUser, supabase, normalizedExtraIds]);

  const yearLabel     = profile?.current_year     ? `${profile.current_year}º Ano`         : "";
  const semesterLabel = profile?.current_semester ? `${profile.current_semester}º Semestre` : "";
  const courseAbbr    = course?.code ?? courseName;

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <ListSkeleton key={i} />)}
          </div>
        )}
      </div>
    );
  }

  /* ── Erro ── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 py-16 text-center">
        <AlertCircle size={28} className="text-rose-400" />
        <p className="mt-3 font-semibold text-slate-200">Erro ao carregar disciplinas</p>
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
                {[courseAbbr, yearLabel, semesterLabel].filter(Boolean).join(" · ")}
              </h1>
            </div>
            <div className="flex items-center gap-3">
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
        </div>
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
      <div className="flex min-w-0 items-center gap-2">
        <SlidersHorizontal size={13} className="shrink-0 text-slate-400" />
        <span className="hidden shrink-0 text-xs text-slate-400 sm:block">Filtrar por:</span>
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {CONTENT_FILTERS.map(({ id, label, icon: Icon }) => {
            const active = activeFilters.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleFilter(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
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
              className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1.5 text-xs text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={11} />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
        {activeFilters.size > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-blue-500/15 px-2 py-1 text-[10px] font-semibold text-blue-400 sm:hidden">
            <SlidersHorizontal size={9} />
            {activeFilters.size}
          </span>
        )}
      </div>

      {/* ── Disciplinas ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {activeFilters.size > 0
              ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`
              : `${stats.total} disciplina${stats.total !== 1 ? "s" : ""}`}
          </h2>
          <ViewToggle mode={viewMode} onChange={handleViewChange} />
        </div>

        {filtered.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((discipline) => (
                <DisciplineCard
                  key={discipline.id}
                  discipline={toDisciplineCardData(discipline)}
                  scheduleInfo={scheduleInfoMap.get(discipline.id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((discipline) => (
                <DisciplineListItem
                  key={discipline.id}
                  discipline={toDisciplineCardData(discipline)}
                  scheduleInfo={scheduleInfoMap.get(discipline.id)}
                />
              ))}
            </div>
          )
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

      {/* ── Cadeiras adicionais ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GraduationCap size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cadeiras adicionais
            </h2>
            {extraDisciplineCards.length > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                atExtraLimit ? "bg-rose-500/15 text-rose-400" : "bg-indigo-500/15 text-indigo-400"
              }`}>
                {extraDisciplineCards.length}/{MAX_EXTRA_DISCIPLINES}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowExtraModal(true)}
            disabled={!lookupReady || atExtraLimit}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              atExtraLimit
                ? "cursor-not-allowed border-rose-500/20 bg-rose-500/5 text-rose-500/50"
                : lookupReady
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                : "cursor-not-allowed border-white/5 bg-white/5 text-slate-600 opacity-50"
            }`}
          >
            {atExtraLimit ? <Lock size={13} /> : <Plus size={13} />}
            {atExtraLimit ? "Limite atingido" : "Adicionar cadeira"}
          </button>
        </div>

        {lookupReady && extraDisciplineCards.length > 0 && (
          <ExtraLimitBanner current={extraDisciplineCards.length} max={MAX_EXTRA_DISCIPLINES} />
        )}

        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-slate-500">
          Cadeiras de semestres anteriores em regime de recurso ou melhoria.
          Máximo de <strong className="text-slate-400">{MAX_EXTRA_DISCIPLINES}</strong> cadeiras.
        </div>

        {!lookupReady ? (
          <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 py-10 text-sm text-slate-400">
            <Loader2 size={16} className="mr-2 animate-spin" />
            A carregar cadeiras adicionais…
          </div>
        ) : extraDisciplineCards.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {extraDisciplineCards.map((d) => (
                <div key={d.id} className="relative">
                  <div className="absolute -top-2 left-3 z-10">
                    <span className="rounded-full border border-indigo-500/30 bg-slate-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
                      Semestre anterior
                    </span>
                  </div>
                  <DisciplineCard
                    discipline={d}
                    scheduleInfo={scheduleInfoMap.get(d.id)}
                  />
                  <button
                    type="button"
                    onClick={() => void removeExtra(d.id)}
                    className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/80 text-slate-400 backdrop-blur-sm transition hover:bg-rose-500/20 hover:text-rose-400"
                    title="Remover cadeira"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {extraDisciplineCards.map((d) => (
                <DisciplineListItem
                  key={d.id}
                  discipline={d}
                  scheduleInfo={scheduleInfoMap.get(d.id)}
                  badge="Semestre anterior"
                  onRemove={() => void removeExtra(d.id)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-center">
            <GraduationCap size={24} className="mb-2 text-slate-600" />
            <p className="text-sm font-medium text-slate-500">Nenhuma cadeira adicional</p>
            <p className="mt-1 text-xs text-slate-600">
              Frequentas cadeiras de semestres anteriores? Adiciona-as para aceder aos materiais.
            </p>
          </div>
        )}
      </section>

      {/* ── Modal ── */}
      {showExtraModal && !atExtraLimit && (
        <AddExtraDisciplineModal
          courseId={currentCourseId}
          currentDisciplineIds={currentDisciplineIds}
          pageDisciplineIds={pageDisciplineIds}
          extraDisciplineIds={extraDisciplineIdsSet}
          resolveRealId={resolveLocalIdToRealId}
          currentYear={currentYear}
          currentSemester={currentSemester}
          onAdd={(id) => void addExtra(id)}
          onClose={() => setShowExtraModal(false)}
        />
      )}
    </div>
  );
}