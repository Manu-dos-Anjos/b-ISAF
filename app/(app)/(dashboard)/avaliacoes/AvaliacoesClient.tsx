"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Trophy,
  Clock,
  Play,
  CheckCircle2,
  RotateCcw,
  BarChart3,
  BookOpen,
  Target,
  Flame,
  Award,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import React from "react";

import QuizPlayer from "@/app/components/quiz/QuizPlayer";
import QuizReview from "@/app/components/quiz/QuizReview";
import QuizStats from "@/app/components/quiz/QuizStats";
import type { Profile } from "@/src/types/database";

type QuizItem = {
  contentId: string;
  title: string;
  chapterTitle: string;
  disciplineId: string;
  disciplineName: string;
  timeLimitSecs: number | null;
  bestScore: number | null;
  attempts: number;
};

type Discipline = { id: string; name: string };

type Props = {
  profile: Profile;
  quizItems: QuizItem[];
  disciplines: Discipline[];
};

type ModalState =
  | { type: "player"; quiz: QuizItem }
  | { type: "review"; quiz: QuizItem }
  | { type: "stats"; quiz: QuizItem }
  | null;

const SCROLLBAR_X = [
  "scrollbar-thin",
  "scrollbar-track-transparent",
  "[&::-webkit-scrollbar]:h-1",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-slate-700/40",
  "hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/60",
].join(" ");

function formatTime(secs: number) {
  if (!Number.isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getScoreTheme(score: number | null) {
  if (score === null)
    return { label: "Novo", className: "border-white/10 bg-white/5 text-slate-300" };
  if (score >= 80)
    return { label: `${score}%`, className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" };
  if (score >= 50)
    return { label: `${score}%`, className: "border-blue-500/20 bg-blue-500/10 text-blue-300" };
  return { label: `${score}%`, className: "border-rose-500/20 bg-rose-500/10 text-rose-300" };
}

function getPerformanceLabel(score: number | null) {
  if (score === null) return "Ainda não concluído";
  if (score >= 90) return "Excelente";
  if (score >= 75) return "Muito bem";
  if (score >= 50) return "Aprovado";
  return "Precisa de revisão";
}

type EBProps = { children: React.ReactNode; onClose: () => void };
type EBState = { hasError: boolean; message: string };

class ModalErrorBoundary extends React.Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: unknown): EBState {
    return { hasError: true, message: error instanceof Error ? error.message : "Erro desconhecido." };
  }
  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[ModalErrorBoundary]", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <p className="text-base font-bold text-white">Ocorreu um erro inesperado</p>
            <p className="mt-1 max-w-xs text-sm text-slate-400">{this.state.message}</p>
          </div>
          <button
            onClick={this.props.onClose}
            className="rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Fechar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AvaliacoesClient({ profile, quizItems, disciplines }: Props) {
  const [modal, setModal]               = useState<ModalState>(null);
  const [search, setSearch]             = useState("");
  const [filterDisc, setFilterDisc]     = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "done">("all");
  const [expandedDisc, setExpandedDisc] = useState<Record<string, boolean>>({});

  const firstName = profile.full_name?.trim().split(/\s+/)[0] ?? "Aluno";

  const doneCount    = quizItems.filter((q) => q.attempts > 0).length;
  const pendingCount = quizItems.length - doneCount;

  const avgScore = useMemo(() => {
    const done = quizItems.filter((q) => q.bestScore !== null);
    if (!done.length) return null;
    return Math.round(done.reduce((s, q) => s + (q.bestScore ?? 0), 0) / done.length);
  }, [quizItems]);

  const avgAttempts = useMemo(() => {
    if (!quizItems.length) return 0;
    return Math.round((quizItems.reduce((s, q) => s + q.attempts, 0) / quizItems.length) * 10) / 10;
  }, [quizItems]);

  const safeChapterTitle = (t: string | null | undefined) => t?.trim() || "Sem capítulo";

  const filteredQuizzes = useMemo(() => {
    return quizItems.filter((q) => {
      const term = search.trim().toLowerCase();
      if (term && !q.title.toLowerCase().includes(term) && !q.chapterTitle.toLowerCase().includes(term) && !q.disciplineName.toLowerCase().includes(term)) return false;
      if (filterDisc !== "all" && q.disciplineId !== filterDisc) return false;
      if (filterStatus === "done" && q.attempts === 0) return false;
      if (filterStatus === "pending" && q.attempts > 0) return false;
      return true;
    });
  }, [quizItems, search, filterDisc, filterStatus]);

  const groupedByDiscipline = useMemo(() => {
    const map = new Map<string, { discipline: Discipline; chapters: Map<string, QuizItem[]> }>();
    for (const quiz of filteredQuizzes) {
      if (!map.has(quiz.disciplineId)) {
        const disc = disciplines.find((d) => d.id === quiz.disciplineId) ?? { id: quiz.disciplineId, name: quiz.disciplineName };
        map.set(quiz.disciplineId, { discipline: disc, chapters: new Map() });
      }
      const group = map.get(quiz.disciplineId)!;
      const key   = safeChapterTitle(quiz.chapterTitle);
      if (!group.chapters.has(key)) group.chapters.set(key, []);
      group.chapters.get(key)!.push(quiz);
    }
    return Array.from(map.values());
  }, [filteredQuizzes, disciplines]);

  const disciplineStats = useMemo(() => {
    return disciplines
      .map((d) => {
        const its       = quizItems.filter((q) => q.disciplineId === d.id);
        const done      = its.filter((q) => q.attempts > 0).length;
        const withScore = its.filter((q) => q.bestScore !== null);
        const avg       = withScore.length > 0
          ? Math.round(withScore.reduce((s, q) => s + (q.bestScore ?? 0), 0) / withScore.length)
          : null;
        return { ...d, total: its.length, done, avg };
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total || (b.avg ?? -1) - (a.avg ?? -1));
  }, [disciplines, quizItems]);

  const topDiscipline = disciplineStats[0] ?? null;

  const isDiscOpen = (discId: string, index: number) => expandedDisc[discId] ?? index === 0;
  const toggleDisc = (id: string, index: number) =>
    setExpandedDisc((prev) => ({ ...prev, [id]: !isDiscOpen(id, index) }));

  function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/95 backdrop-blur-md sm:items-center sm:p-4">
        <div className="relative flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-none border border-white/10 bg-slate-950 shadow-2xl sm:h-auto sm:max-h-[95dvh] sm:rounded-3xl">
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="h-1.5 w-12 rounded-full bg-white/20" />
          </div>
          <ModalErrorBoundary onClose={onClose}>{children}</ModalErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pb-24">

        {/* ══════════════════════════════════════════
            HERO — sem px próprio
        ══════════════════════════════════════════ */}
        <section>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-5 md:p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-slate-950/80 to-slate-950" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.18),transparent_45%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,197,94,0.08),transparent_50%)]" />

            <div className="relative z-10 grid gap-5 lg:grid-cols-[1.3fr_0.8fr]">
              {/* esquerda */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-300">
                  <Sparkles size={12} />
                  Avaliações
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                    Olá, <span className="text-indigo-300">{firstName}</span>
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-400">
                    Aqui tens os questionários e avaliações das tuas disciplinas,
                    organizados por capítulo, com histórico, revisão e estatísticas.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {[
                    { label: "Disponíveis", value: quizItems.length,                         icon: BookOpen,     color: "text-blue-300",    bg: "bg-blue-500/10"    },
                    { label: "Concluídos",  value: doneCount,                                icon: CheckCircle2, color: "text-emerald-300", bg: "bg-emerald-500/10" },
                    { label: "Pendentes",   value: pendingCount,                             icon: Target,       color: "text-amber-300",   bg: "bg-amber-500/10"   },
                    { label: "Média",       value: avgScore !== null ? `${avgScore}%` : "—", icon: Trophy,       color: avgScore !== null && avgScore >= 50 ? "text-indigo-300" : "text-slate-300", bg: "bg-indigo-500/10" },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm sm:p-4">
                      <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                        <Icon size={16} className={color} />
                      </div>
                      <p className={`text-center text-xl font-bold tabular-nums ${color}`}>{value}</p>
                      <p className="text-center text-[10px] font-medium uppercase tracking-widest text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* painel lateral */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Resumo rápido</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">O teu progresso</h2>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                    <Flame size={18} />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Questionários feitos</span>
                      <span>{doneCount}/{quizItems.length}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                        style={{ width: `${quizItems.length ? (doneCount / quizItems.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">Média tentativas</p>
                      <p className="mt-2 text-2xl font-bold text-white tabular-nums">{avgAttempts}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">Disciplinas</p>
                      <p className="mt-2 text-2xl font-bold text-white tabular-nums">{disciplineStats.length}</p>
                    </div>
                  </div>

                  {topDiscipline && (
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
                        Disciplina com mais quizzes
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-200">{topDiscipline.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{topDiscipline.total} avaliação/avaliações</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FILTROS STICKY
            — sticky sai do fluxo, precisa de px
              igual ao AppShell: px-4 lg:px-6
        ══════════════════════════════════════════ */}
        <section className="sticky top-0 z-20 border-b border-white/10 bg-[#050816]/95 px-4 py-3 backdrop-blur-xl lg:px-6">
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar questionários, capítulos ou disciplinas..."
                className="min-h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            <div className={`flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible ${SCROLLBAR_X}`}>
              <span className="mr-1 hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 sm:inline-flex">
                <Filter size={12} />
                Filtrar
              </span>

              {([{ key: "all", label: "Todos" }, { key: "pending", label: "Por fazer" }, { key: "done", label: "Concluídos" }] as const).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilterStatus(item.key)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    filterStatus === item.key
                      ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

              <button
                onClick={() => setFilterDisc("all")}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  filterDisc === "all"
                    ? "border-blue-500/30 bg-blue-500/15 text-blue-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                }`}
              >
                Todas as disciplinas
              </button>

              {disciplineStats.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setFilterDisc(d.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    filterDisc === d.id
                      ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            LISTA AGRUPADA
        ══════════════════════════════════════════ */}
        <section className="py-6">
          {groupedByDiscipline.length === 0 ? (
            <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center sm:min-h-[42vh] sm:p-10">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
                <BookOpen size={28} className="text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Nenhum questionário encontrado</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                Ainda não há avaliações disponíveis para os filtros que escolheste.
                Tenta mudar a pesquisa ou selecionar outra disciplina.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByDiscipline.map((group, index) => {
                const discId       = group.discipline.id;
                const isOpen       = isDiscOpen(discId, index);
                const allQuizzes   = Array.from(group.chapters.values()).flat();
                const totalQuizzes = allQuizzes.length;
                const doneQuizzes  = allQuizzes.filter((q) => q.attempts > 0).length;
                const isCompleted  = totalQuizzes > 0 && doneQuizzes === totalQuizzes;

                return (
                  <div
                    key={discId}
                    className={`overflow-hidden rounded-2xl border transition-all ${
                      isCompleted
                        ? "border-emerald-500/20"
                        : isOpen
                        ? "border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                        : "border-white/10"
                    }`}
                  >
                    <button
                      onClick={() => toggleDisc(discId, index)}
                      className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition ${
                        isCompleted
                          ? "bg-emerald-950/20 hover:bg-emerald-950/30"
                          : isOpen
                          ? "bg-indigo-950/60 hover:bg-indigo-950/70"
                          : "bg-slate-950/40 hover:bg-slate-950/50"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                          isCompleted ? "bg-emerald-600/30 text-emerald-400" : isOpen ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400"
                        }`}>
                          <BookOpen size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate font-semibold ${isOpen || isCompleted ? "text-white" : "text-slate-300"}`}>
                            {group.discipline.name}
                            {isCompleted && (
                              <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                                Concluído
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {totalQuizzes} questionário(s) · {doneQuizzes} concluído(s)
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="hidden items-center gap-2 sm:flex">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                              style={{ width: `${totalQuizzes ? (doneQuizzes / totalQuizzes) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-xs text-slate-400">
                            {totalQuizzes ? Math.round((doneQuizzes / totalQuizzes) * 100) : 0}%
                          </span>
                        </div>
                        {isOpen
                          ? <ChevronDown size={16} className="text-slate-400" />
                          : <ChevronRight size={16} className="text-slate-400" />
                        }
                      </div>
                    </button>

                    {isOpen && (
                      <div className="divide-y divide-white/5 bg-slate-950/30">
                        {Array.from(group.chapters.entries()).map(([chapterTitle, quizzes]) => (
                          <div key={chapterTitle} className="p-4">
                            <div className="mb-3 flex items-center gap-2 border-b border-white/5 pb-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {chapterTitle}
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              {quizzes.map((quiz) => {
                                const scoreTheme = getScoreTheme(quiz.bestScore);
                                const isDone     = quiz.attempts > 0;
                                return (
                                  <div
                                    key={quiz.contentId}
                                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                                      isDone ? "hover:bg-indigo-950/40" : "hover:bg-white/5"
                                    }`}
                                  >
                                    <div className="shrink-0">
                                      {isDone
                                        ? <CheckCircle2 size={14} className="text-emerald-400" />
                                        : <Award size={14} className="text-amber-400" />
                                      }
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-medium text-slate-200">
                                          {quiz.title}
                                        </span>
                                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums ${scoreTheme.className}`}>
                                          {scoreTheme.label}
                                        </span>
                                      </div>
                                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                                        {quiz.timeLimitSecs !== null && (
                                          <span className="flex items-center gap-1">
                                            <Clock size={11} />
                                            {formatTime(quiz.timeLimitSecs)}
                                          </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                          <RotateCcw size={11} />
                                          {quiz.attempts} tentativa{quiz.attempts === 1 ? "" : "s"}
                                        </span>
                                        <span className={isDone ? "text-emerald-400" : "text-amber-400"}>
                                          {getPerformanceLabel(quiz.bestScore)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1.5">
                                      <button
                                        onClick={() => setModal({ type: "player", quiz })}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-500 active:scale-[0.98]"
                                      >
                                        <Play size={12} fill="currentColor" />
                                        {isDone ? "Repetir" : "Começar"}
                                      </button>
                                      {isDone && (
                                        <>
                                          <button
                                            onClick={() => setModal({ type: "review", quiz })}
                                            title="Rever"
                                            className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                                          >
                                            <CheckCircle2 size={14} />
                                          </button>
                                          <button
                                            onClick={() => setModal({ type: "stats", quiz })}
                                            title="Estatísticas"
                                            className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                                          >
                                            <BarChart3 size={14} />
                                          </button>
                                        </>
                                      )}
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
        </section>
      </div>

      {/* MODAIS */}
      {modal?.type === "player" && (
        <ModalErrorBoundary onClose={() => setModal(null)}>
          <QuizPlayer
            contentId={modal.quiz.contentId}
            title={modal.quiz.title}
            disciplineName={modal.quiz.disciplineName}
            chapterTitle={modal.quiz.chapterTitle}
            timeLimitSeconds={modal.quiz.timeLimitSecs}
            onClose={() => setModal(null)}
          />
        </ModalErrorBoundary>
      )}
      {modal?.type === "review" && (
        <ModalShell onClose={() => setModal(null)}>
          <QuizReview
            contentId={modal.quiz.contentId}
            title={modal.quiz.title}
            onClose={() => setModal(null)}
            onRepeat={() => setModal({ type: "player", quiz: modal.quiz })}
            onStats={() => setModal({ type: "stats", quiz: modal.quiz })}
          />
        </ModalShell>
      )}
      {modal?.type === "stats" && (
        <ModalShell onClose={() => setModal(null)}>
          <QuizStats
            contentId={modal.quiz.contentId}
            title={modal.quiz.title}
            onBack={() => setModal({ type: "review", quiz: modal.quiz })}
            onClose={() => setModal(null)}
          />
        </ModalShell>
      )}
    </>
  );
}