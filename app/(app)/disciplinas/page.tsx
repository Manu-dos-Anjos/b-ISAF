// app/(app)/disciplinas/page.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Headphones, FileText, Trophy, Sparkles,
  BookOpen, TrendingUp, Clock, X,
  SlidersHorizontal, Plus, Trash2, GraduationCap,
} from "lucide-react";
import { useUser } from "@/app/lib/context/UserContext";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import {
  getDisciplinesForUser,
  getCourseAbbreviation,
  mockDisciplines,
  type Discipline,
} from "@/app/lib/mockData";
import DisciplineCard, { type DisciplineScheduleInfo } from "./DisciplineCard";
import { CURRICULUM, type CourseId } from "@/app/lib/curriculum";

/* ================================================================
   TIPOS
   ================================================================ */
type WeeklySlot = {
  id: string;
  day: "Segunda" | "Terça" | "Quarta" | "Quinta" | "Sexta" | "Sábado";
  startTime: string; endTime: string;
  discipline: string; room?: string;
  professor?: string;
  type: "Teórica" | "Prática" | "Teórico-Prática";
};

/* ================================================================
   CONSTANTES
   ================================================================ */
const SCHEDULE_LS_KEY  = "b-isaf:schedule";
const EXTRA_DISC_LS_KEY = "b-isaf:extraDisciplines"; // fallback até Supabase

const COURSE_ID_MAP: Record<string, CourseId> = {
  "Informática de Gestão Financeira": "informatica-gestao-financeira",
  "Contabilidade e Finanças":         "contabilidade-financas",
  "Gestão Bancária & Seguros":        "gestao-bancaria-seguros",
  "Gestão Bancária e Seguros":        "gestao-bancaria-seguros",
};

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
    const ex = map.get(key)!;
    if (!ex.professor && slot.professor) ex.professor = slot.professor;
    if (!ex.nextClass) ex.nextClass = { day: slot.day, startTime: slot.startTime, endTime: slot.endTime, room: slot.room, type: slot.type };
  }
  return map;
}

function findScheduleInfo(map: Map<string, DisciplineScheduleInfo>, name: string): DisciplineScheduleInfo | null {
  const key = name.toLowerCase().trim();
  if (map.has(key)) return map.get(key)!;
  for (const [k, v] of map.entries()) if (key.includes(k) || k.includes(key)) return v;
  return null;
}

function disciplineHasContentType(d: Discipline, type: ContentFilterId): boolean {
  if (type === "tutor") return true;
  for (const ch of d.chapters ?? [])
    for (const t of ch.topics ?? [])
      if ((t.contents ?? []).some((c) => c.type === type)) return true;
  return false;
}

/* ================================================================
   SKELETONS / EMPTY STATE
   ================================================================ */
function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-white/5" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-white/5" />
        <div className="h-8 w-full rounded-xl bg-slate-100 dark:bg-white/5" />
        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/5" />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description: string; action?: React.ReactNode;
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

/* ================================================================
   MODAL: Adicionar cadeira extra
   ================================================================ */
function AddExtraDisciplineModal({
  courseId, currentDisciplineIds, onAdd, onClose,
}: {
  courseId: CourseId;
  currentDisciplineIds: Set<string>;
  onAdd: (disciplineId: string) => void;
  onClose: () => void;
}) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const curriculum = CURRICULUM[courseId];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="font-semibold text-white">Adicionar cadeira</h3>
            <p className="mt-0.5 text-xs text-slate-400">Selecciona uma cadeira da grelha curricular</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Filtro de ano */}
        <div className="flex gap-2 border-b border-white/10 px-5 py-3">
          <button
            type="button"
            onClick={() => setSelectedYear(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${!selectedYear ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
          >
            Todos
          </button>
          {curriculum.years.map((y) => (
            <button
              key={y.year}
              type="button"
              onClick={() => setSelectedYear(y.year)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${selectedYear === y.year ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
            >
              {y.year}º Ano
            </button>
          ))}
        </div>

        {/* Lista de cadeiras */}
        <div className="max-h-80 overflow-y-auto p-3">
          {curriculum.years
            .filter((y) => !selectedYear || y.year === selectedYear)
            .map((yearData) => (
              <div key={yearData.year} className="mb-3">
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {yearData.year}º Ano
                </p>
                {yearData.semesters.flatMap((sem) =>
                  sem.disciplines.map((disc) => {
                    // Encontrar a disciplina no mockData pelo nome
                    const mockDisc = mockDisciplines.find(
                      (d) => d.title.toLowerCase() === disc.name.toLowerCase()
                    );
                    const discId    = mockDisc?.id ?? disc.id;
                    const isAdded   = currentDisciplineIds.has(discId);

                    return (
                      <button
                        key={disc.id}
                        type="button"
                        disabled={isAdded}
                        onClick={() => { onAdd(discId); onClose(); }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          isAdded
                            ? "cursor-default opacity-40"
                            : "hover:bg-white/5 text-slate-300"
                        }`}
                      >
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isAdded ? "border-emerald-500/40 bg-emerald-500/20" : "border-white/10 bg-white/5"
                        }`}>
                          {isAdded
                            ? <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            : <Plus size={10} className="text-slate-500" />}
                        </div>
                        <span className="flex-1 leading-snug">{disc.name}</span>
                        <span className="shrink-0 text-[10px] text-slate-600">{sem.number}º Sem</span>
                      </button>
                    );
                  })
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */
export default function DisciplinasPage() {
  const { user }     = useUser();
  const { supabase, user: authUser } = useSupabase();

  /* ── Hooks (todos antes de qualquer return condicional) ── */
  const [activeFilters,  setActiveFilters]  = useState<Set<ContentFilterId>>(new Set());
  const [scheduleSlots,  setScheduleSlots]  = useState<WeeklySlot[]>([]);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [extraIds,       setExtraIds]       = useState<string[]>([]);
  const [showModal,      setShowModal]      = useState(false);

  /* Carregar horário */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCHEDULE_LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WeeklySlot[];
        if (Array.isArray(parsed)) setScheduleSlots(parsed);
      }
    } catch { /* silencioso */ }
    finally { setScheduleLoaded(true); }
  }, []);

  /* Carregar cadeiras extra do Supabase (com fallback localStorage) */
  useEffect(() => {
    if (!authUser) return;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("student_extra_disciplines")
          .select("discipline_id")
          .eq("student_id", authUser.id);

        if (error) throw error;
        setExtraIds((data ?? []).map((r) => r.discipline_id));
      } catch {
        // Fallback localStorage
        try {
          const raw = localStorage.getItem(EXTRA_DISC_LS_KEY);
          if (raw) setExtraIds(JSON.parse(raw) as string[]);
        } catch { /* silencioso */ }
      }
    };

    void load();
  }, [authUser, supabase]);

  /* Dados do utilizador */
  const year     = user?.academic?.year     ?? "";
  const semester = user?.academic?.semester ?? "";
  const course   = user?.academic?.course   ?? "";

  const disciplines = useMemo(
    () => (user ? getDisciplinesForUser(year, semester, course) : []),
    [user, year, semester, course]
  );

  const courseAbbr = useMemo(() => course ? getCourseAbbreviation(course) : "", [course]);
  const courseId   = useMemo(() => COURSE_ID_MAP[course] ?? "informatica-gestao-financeira" as CourseId, [course]);

  /* Cadeiras extra resolvidas */
  const extraDisciplines = useMemo(
    () => extraIds
      .map((id) => mockDisciplines.find((d) => d.id === id))
      .filter((d): d is Discipline => !!d && !disciplines.some((curr) => curr.id === d.id)),
    [extraIds, disciplines]
  );

  const scheduleMap = useMemo(() => buildScheduleMap(scheduleSlots), [scheduleSlots]);

  /* Stats (semestre actual) */
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
    return {
      total, audios, slides, quizzes,
      avgProgress: total
        ? Math.round(disciplines.reduce((s, d) => s + (d.progress ?? 0), 0) / total)
        : 0,
    };
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

  /* Adicionar cadeira extra */
  const addExtra = useCallback(async (disciplineId: string) => {
    const newIds = [...new Set([...extraIds, disciplineId])];
    setExtraIds(newIds);

    if (authUser) {
      try {
        await supabase.from("student_extra_disciplines").upsert(
          { student_id: authUser.id, discipline_id: disciplineId },
          { onConflict: "student_id,discipline_id" }
        );
      } catch {
        // Fallback localStorage
        try { localStorage.setItem(EXTRA_DISC_LS_KEY, JSON.stringify(newIds)); } catch { /* ignore */ }
      }
    } else {
      try { localStorage.setItem(EXTRA_DISC_LS_KEY, JSON.stringify(newIds)); } catch { /* ignore */ }
    }
  }, [extraIds, authUser, supabase]);

  /* Remover cadeira extra */
  const removeExtra = useCallback(async (disciplineId: string) => {
    const newIds = extraIds.filter((id) => id !== disciplineId);
    setExtraIds(newIds);

    if (authUser) {
      try {
        await supabase.from("student_extra_disciplines")
          .delete()
          .eq("student_id", authUser.id)
          .eq("discipline_id", disciplineId);
      } catch {
        try { localStorage.setItem(EXTRA_DISC_LS_KEY, JSON.stringify(newIds)); } catch { /* ignore */ }
      }
    } else {
      try { localStorage.setItem(EXTRA_DISC_LS_KEY, JSON.stringify(newIds)); } catch { /* ignore */ }
    }
  }, [extraIds, authUser, supabase]);

  const currentDisciplineIds = useMemo(
    () => new Set([...disciplines.map((d) => d.id), ...extraIds]),
    [disciplines, extraIds]
  );

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
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-500 dark:text-blue-400">{course}</p>
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
              <button key={id} type="button" onClick={() => toggleFilter(id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "border-blue-500 bg-blue-500 text-white shadow-sm shadow-blue-500/30"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}>
                <Icon size={12} />{label}
              </button>
            );
          })}
          {activeFilters.size > 0 && (
            <button type="button" onClick={() => setActiveFilters(new Set())}
              className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300">
              <X size={11} />Limpar
            </button>
          )}
        </div>
      </div>

      {/* ── Grelha principal ── */}
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
            {filtered.map((d) => (
              <DisciplineCard key={d.id} discipline={d} scheduleInfo={findScheduleInfo(scheduleMap, d.title)} />
            ))}
          </div>
        ) : disciplines.length === 0 ? (
          <EmptyState icon={BookOpen} title="Sem disciplinas disponíveis"
            description={`Não encontrámos disciplinas para ${year} do ${semester}.`} />
        ) : (
          <EmptyState icon={SlidersHorizontal} title="Nenhuma disciplina encontrada"
            description="Remove os filtros activos para ver todas as disciplinas."
            action={
              <button type="button" onClick={() => setActiveFilters(new Set())}
                className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/20">
                Limpar filtros
              </button>
            } />
        )}

        {scheduleLoaded && scheduleSlots.length === 0 && disciplines.length > 0 && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-400/80">
            <Clock size={13} className="mt-0.5 shrink-0 text-amber-500" />
            <p>Os nomes dos docentes e aulas não estão disponíveis. Vai a <strong className="text-amber-400">Meu Curso → Horário Semanal</strong> e faz o upload do teu horário em PDF.</p>
          </div>
        )}
      </section>

      {/* ── Cadeiras adicionais ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GraduationCap size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cadeiras adicionais
            </h2>
            {extraDisciplines.length > 0 && (
              <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                {extraDisciplines.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400 transition hover:bg-indigo-500/20"
          >
            <Plus size={13} />
            Adicionar cadeira
          </button>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-slate-500 mb-4">
          Cadeiras de outros anos ou semestres que frequentes. Os materiais de estudo ficam disponíveis normalmente.
        </div>

        {extraDisciplines.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {extraDisciplines.map((d) => (
              <div key={d.id} className="relative">
                {/* Badge "Fora do plano" */}
                <div className="absolute -top-2 left-3 z-10">
                  <span className="rounded-full border border-indigo-500/30 bg-slate-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
                    Fora do plano
                  </span>
                </div>
                <DisciplineCard discipline={d} scheduleInfo={findScheduleInfo(scheduleMap, d.title)} />
                {/* Botão remover */}
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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-center">
            <GraduationCap size={24} className="mb-2 text-slate-600" />
            <p className="text-sm font-medium text-slate-500">Nenhuma cadeira adicional</p>
            <p className="mt-1 text-xs text-slate-600">
              Se frequentas cadeiras de outros anos, adiciona-as aqui para aceder aos materiais.
            </p>
          </div>
        )}
      </section>

      {/* ── Modal ── */}
      {showModal && (
        <AddExtraDisciplineModal
          courseId={courseId}
          currentDisciplineIds={currentDisciplineIds}
          onAdd={(id) => void addExtra(id)}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}