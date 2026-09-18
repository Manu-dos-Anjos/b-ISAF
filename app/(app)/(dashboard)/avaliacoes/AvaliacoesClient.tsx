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
  Award,
  ChevronRight,
  ChevronDown,
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
  | { type: "player"; quiz: QuizItem; simulation?: boolean }
  | { type: "review"; quiz: QuizItem }
  | { type: "stats"; quiz: QuizItem }
  | null;

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

function formatTime(secs: number) {
  if (!Number.isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getExamYear(title: string) {
  return title.match(/\b(19|20)\d{2}\b/)?.[0] ?? null;
}

function getScoreTheme(score: number | null) {
  if (score === null)
    return {
      label: "Novo",
      className:
        "border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
    };
  if (score >= 80)
    return {
      label: `${score}%`,
      className:
        "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    };
  if (score >= 50)
    return {
      label: `${score}%`,
      className:
        "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
    };
  return {
    label: `${score}%`,
    className:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
  };
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
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-300 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 dark:text-white">Ocorreu um erro inesperado</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{this.state.message}</p>
          </div>
          <button
            onClick={this.props.onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10"
          >
            Fechar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 backdrop-blur-md dark:bg-slate-950/95 sm:items-center sm:p-4">
      <div className="relative flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:h-auto sm:max-h-[95dvh] sm:rounded-3xl">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>
        <ModalErrorBoundary onClose={onClose}>{children}</ModalErrorBoundary>
      </div>
    </div>
  );
}

export default function AvaliacoesClient({ profile, quizItems, disciplines }: Props) {
  const [modal, setModal]               = useState<ModalState>(null);
  const [search, setSearch]             = useState("");
  const [filterDisc, setFilterDisc]     = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "done">("all");
  const [expandedDisc, setExpandedDisc] = useState<Record<string, boolean>>({});
  const [simulationDisc, setSimulationDisc] = useState("all");

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

  const simulationQuizzes = useMemo(
    () => quizItems.filter((quiz) => simulationDisc === "all" || quiz.disciplineId === simulationDisc),
    [quizItems, simulationDisc]
  );

  const simulationQuiz =
    simulationQuizzes.find((quiz) => quiz.attempts === 0) ?? simulationQuizzes[0] ?? null;
  const simulationMinutes = simulationQuiz?.timeLimitSecs
    ? Math.ceil(simulationQuiz.timeLimitSecs / 60)
    : 120;

  const isDiscOpen = (discId: string, index: number) => expandedDisc[discId] ?? index === 0;
  const toggleDisc = (id: string, index: number) =>
    setExpandedDisc((prev) => ({ ...prev, [id]: !isDiscOpen(id, index) }));

  return (
    <>
      <div className="space-y-4 sm:space-y-6">

        {/* ══════════════════════════════════════════
            CABEÇALHO
        ══════════════════════════════════════════ */}
        <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-950/50 dark:shadow-none sm:rounded-2xl sm:p-5 md:p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50 dark:from-indigo-950/60 dark:via-slate-950/80 dark:to-slate-950" />

          {/* Título + média — linha única no mobile */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 sm:text-xs">
                Avaliações
              </p>
              <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl md:text-3xl">
                Olá, {firstName}
              </h1>
              <p className="mt-1 hidden max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:block">
                Questionários e avaliações das tuas disciplinas, organizados por
                capítulo, com histórico, revisão e estatísticas.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end text-right">
              <p className="text-2xl font-bold leading-none text-slate-900 dark:text-white sm:text-3xl">
                {avgScore !== null ? avgScore : "—"}
                {avgScore !== null && <span className="text-sm font-medium text-slate-400 sm:text-base">%</span>}
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-500 sm:text-[11px]">
                Média geral
              </p>
            </div>
          </div>

          {/* Barra de progresso — visível no mobile por baixo do título */}
          <div className="relative z-10 mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10 sm:hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
              style={{ width: `${quizItems.length ? (doneCount / quizItems.length) * 100 : 0}%` }}
            />
          </div>
          <div className="relative z-10 mt-2 hidden justify-end sm:flex">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                style={{ width: `${quizItems.length ? (doneCount / quizItems.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Stats — faixa compacta de pills no mobile, grid de cards a partir de sm */}
          <div
            className={`relative z-10 mt-3 flex gap-1.5 overflow-x-auto sm:mt-5 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible ${SCROLLBAR_X}`}
          >
            {[
              { label: "Disponíveis", value: quizItems.length, icon: BookOpen },
              { label: "Concluídos", value: doneCount, icon: CheckCircle2 },
              { label: "Pendentes", value: pendingCount, icon: Target },
              { label: "Tentativas", value: avgAttempts, icon: Trophy },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5 sm:block sm:rounded-xl sm:px-3 sm:py-3"
              >
                <Icon size={12} className="text-slate-400 dark:text-slate-500 sm:hidden" />
                <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white sm:hidden">
                  {value}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500 sm:hidden">{label}</span>

                <div className="hidden items-center gap-1.5 text-slate-500 dark:text-slate-500 sm:flex">
                  <Icon size={12} />
                  <p className="text-[10px] font-medium uppercase tracking-widest">{label}</p>
                </div>
                <p className="mt-1.5 hidden text-xl font-bold tabular-nums text-slate-900 dark:text-white sm:block">
                  {value}
                </p>
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
                placeholder="Pesquisar questionários, capítulos ou disciplinas..."
                className="min-h-9 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-500/40 dark:focus:ring-indigo-500/20 sm:min-h-11 sm:rounded-xl sm:py-3 sm:pl-10 sm:pr-4"
              />
            </div>

            <div className={`flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-white/5 sm:rounded-xl ${SCROLLBAR_X}`}>
              {([{ key: "all", label: "Todos" }, { key: "pending", label: "Por fazer" }, { key: "done", label: "Concluídos" }] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilterStatus(item.key)}
                  className={`flex flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium transition sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs ${
                    filterStatus === item.key
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className={`flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:gap-2 sm:overflow-visible ${SCROLLBAR_X}`}>
              <span className="mr-1 hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500 sm:inline-flex">
                <Filter size={12} />
                Disciplina
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

              {disciplineStats.map((d) => (
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

        {/* ── SIMULADO INDIVIDUAL ── */}
        <section className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 shadow-sm dark:border-indigo-500/20 dark:from-indigo-950/50 dark:via-slate-950/70 dark:to-violet-950/30 sm:p-5 md:p-6">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
                <Target size={16} />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]">Simulado individual</p>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white sm:text-xl">Testa os teus conhecimentos</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Começa pelo próximo questionário disponível e acompanha o teu desempenho por disciplina.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-64">
              <label htmlFor="simulation-discipline" className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Disciplina
              </label>
              <select
                id="simulation-discipline"
                value={simulationDisc}
                onChange={(event) => setSimulationDisc(event.target.value)}
                className="h-10 rounded-lg border border-indigo-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-500/30"
              >
                <option value="all">Todas as disciplinas</option>
                {disciplineStats.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>{discipline.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative z-10 mt-4 flex flex-col gap-3 rounded-xl border border-indigo-100 bg-white/80 p-3 dark:border-white/10 dark:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prova disponível</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                {simulationQuiz?.title ?? "Nenhum questionário disponível"}
              </p>
              {simulationQuiz && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{simulationQuiz.disciplineName} · {simulationQuiz.chapterTitle} · {getExamYear(simulationQuiz.title) ? `Prova ${getExamYear(simulationQuiz.title)}` : "Simulado"}</p>}
            </div>
            <button
              type="button"
              disabled={!simulationQuiz}
              onClick={() => simulationQuiz && setModal({ type: "player", quiz: simulationQuiz, simulation: true })}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play size={14} fill="currentColor" />
              Começar prova · {simulationMinutes} min
            </button>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            LISTA AGRUPADA
        ══════════════════════════════════════════ */}
        <div className="space-y-3 sm:space-y-4">
          {groupedByDiscipline.length === 0 ? (
            <div className="flex min-h-[32vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-white/10 dark:bg-white/[0.03] sm:min-h-[38vh] sm:p-8 md:min-h-[42vh] md:p-10">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] sm:h-16 sm:w-16">
                <BookOpen size={26} className="text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                Nenhum questionário encontrado
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-500">
                Ainda não há avaliações disponíveis para os filtros que escolheste.
                Tenta mudar a pesquisa ou selecionar outra disciplina.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
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
                    className={`overflow-hidden rounded-xl border transition-all sm:rounded-2xl ${
                      isCompleted
                        ? "border-emerald-300 dark:border-emerald-500/20"
                        : isOpen
                        ? "border-indigo-300 shadow-md shadow-indigo-100 dark:border-indigo-500/40 dark:shadow-lg dark:shadow-indigo-500/10"
                        : "border-slate-200 dark:border-white/10"
                    }`}
                  >
                    <button
                      onClick={() => toggleDisc(discId, index)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition sm:gap-4 sm:px-5 sm:py-4 ${
                        isCompleted
                          ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                          : isOpen
                          ? "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-950/70"
                          : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950/50"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold sm:h-9 sm:w-9 ${
                          isCompleted
                            ? "bg-emerald-200 text-emerald-700 dark:bg-emerald-600/30 dark:text-emerald-400"
                            : isOpen
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-500 dark:bg-white/5 dark:text-slate-400"
                        }`}>
                          <BookOpen size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className={`flex flex-wrap items-center gap-1.5 truncate text-sm font-semibold sm:text-base ${
                            isOpen || isCompleted ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"
                          }`}>
                            {group.discipline.name}
                            {isCompleted && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                Concluído
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-500">
                            {totalQuizzes} questionário(s) · {doneQuizzes} concluído(s)
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <div className="hidden items-center gap-2 sm:flex">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                              style={{ width: `${totalQuizzes ? (doneQuizzes / totalQuizzes) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400">
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
                      <div className="divide-y divide-slate-100 bg-slate-50/60 dark:divide-white/5 dark:bg-slate-950/30">
                        {Array.from(group.chapters.entries()).map(([chapterTitle, quizzes]) => (
                          <div key={chapterTitle} className="p-3 sm:p-4">
                            <div className="mb-2.5 flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-white/5 sm:mb-3">
                              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                                {chapterTitle}
                              </p>
                            </div>

                            <div className="space-y-1 sm:space-y-1.5">
                              {quizzes.map((quiz) => {
                                const scoreTheme = getScoreTheme(quiz.bestScore);
                                const isDone     = quiz.attempts > 0;
                                return (
                                  <div
                                    key={quiz.contentId}
                                    className={`group flex flex-col gap-2.5 rounded-xl px-2.5 py-2.5 transition-all sm:flex-row sm:items-center sm:gap-3 sm:px-3 ${
                                      isDone ? "hover:bg-indigo-50 dark:hover:bg-indigo-950/40" : "hover:bg-slate-100 dark:hover:bg-white/5"
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5 sm:contents">
                                      <div className="mt-0.5 shrink-0 sm:mt-0">
                                        {isDone
                                          ? <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />
                                          : <Award size={14} className="text-amber-500 dark:text-amber-400" />
                                        }
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {quiz.title}
                                          </span>
                                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums ${scoreTheme.className}`}>
                                            {scoreTheme.label}
                                          </span>
                                        </div>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-500">
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
                                          <span className={isDone ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                                            {getPerformanceLabel(quiz.bestScore)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1.5 pl-[26px] sm:pl-0">
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
                                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
                                          >
                                            <CheckCircle2 size={14} />
                                          </button>
                                          <button
                                            onClick={() => setModal({ type: "stats", quiz })}
                                            title="Estatísticas"
                                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
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
        </div>
      </div>

      {/* MODAIS */}
      {modal?.type === "player" && (
        <ModalErrorBoundary onClose={() => setModal(null)}>
          <QuizPlayer
            contentId={modal.quiz.contentId}
            title={modal.quiz.title}
            disciplineName={modal.quiz.disciplineName}
            chapterTitle={modal.quiz.chapterTitle}
            timeLimitSeconds={modal.simulation ? (modal.quiz.timeLimitSecs ?? 120 * 60) : modal.quiz.timeLimitSecs}
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