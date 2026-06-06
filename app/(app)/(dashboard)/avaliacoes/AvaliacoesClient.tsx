"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Sparkles,
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
} from "lucide-react";

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

type Discipline = {
  id: string;
  name: string;
};

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

function formatTime(secs: number) {
  if (!Number.isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getScoreTheme(score: number | null) {
  if (score === null) {
    return {
      label: "Novo",
      className: "border-white/10 bg-white/5 text-slate-300",
    };
  }

  if (score >= 80) {
    return {
      label: `${score}%`,
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (score >= 50) {
    return {
      label: `${score}%`,
      className: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    };
  }

  return {
    label: `${score}%`,
    className: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  };
}

function getPerformanceLabel(score: number | null) {
  if (score === null) return "Ainda não concluído";
  if (score >= 90) return "Excelente";
  if (score >= 75) return "Muito bem";
  if (score >= 50) return "Aprovado";
  return "Precisa de revisão";
}

export default function AvaliacoesClient({
  profile,
  quizItems,
  disciplines,
}: Props) {
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState("");
  const [filterDisc, setFilterDisc] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "done">(
    "all"
  );

  const firstName = profile.full_name?.split(" ")[0] ?? "Aluno";

  const doneCount = quizItems.filter((q) => q.attempts > 0).length;
  const pendingCount = quizItems.length - doneCount;

  const avgScore = useMemo(() => {
    const done = quizItems.filter((q) => q.bestScore !== null);
    if (!done.length) return null;

    return Math.round(
      done.reduce((sum, q) => sum + (q.bestScore ?? 0), 0) / done.length
    );
  }, [quizItems]);

  const avgAttempts = useMemo(() => {
    if (!quizItems.length) return 0;
    return (
      Math.round(
        (quizItems.reduce((sum, q) => sum + q.attempts, 0) / quizItems.length) *
          10
      ) / 10
    );
  }, [quizItems]);

  const filteredQuizzes = useMemo(() => {
    return quizItems.filter((q) => {
      const term = search.trim().toLowerCase();

      if (
        term &&
        !q.title.toLowerCase().includes(term) &&
        !q.chapterTitle.toLowerCase().includes(term) &&
        !q.disciplineName.toLowerCase().includes(term)
      ) {
        return false;
      }

      if (filterDisc !== "all" && q.disciplineId !== filterDisc) return false;
      if (filterStatus === "done" && q.attempts === 0) return false;
      if (filterStatus === "pending" && q.attempts > 0) return false;

      return true;
    });
  }, [quizItems, search, filterDisc, filterStatus]);

  const disciplineStats = useMemo(() => {
    return disciplines
      .map((d) => {
        const items = quizItems.filter((q) => q.disciplineId === d.id);
        const done = items.filter((q) => q.attempts > 0).length;

        const withScore = items.filter((q) => q.bestScore !== null);
        const avg =
          withScore.length > 0
            ? Math.round(
                withScore.reduce((s, q) => s + (q.bestScore ?? 0), 0) /
                  withScore.length
              )
            : null;

        return {
          ...d,
          total: items.length,
          done,
          avg,
        };
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total || (b.avg ?? -1) - (a.avg ?? -1));
  }, [disciplines, quizItems]);

  const topDiscipline = disciplineStats[0] ?? null;

  return (
    <>
      <div className="min-h-screen bg-[#050816] pb-24 text-white">
        {/* HERO */}
        <section className="px-4 pt-4 sm:px-6 sm:pt-6">
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-indigo-950/70 via-slate-950 to-slate-950 shadow-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.18),transparent_45%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,197,94,0.08),transparent_50%)]" />

            <div className="relative grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.3fr_0.8fr] lg:p-8">
              {/* Lado esquerdo */}
              <div className="space-y-4 sm:space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-300">
                  <Sparkles size={12} />
                  Avaliações
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
                    Olá, {firstName}
                  </h1>
                  <p className="max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                    Aqui tens os questionários e avaliações das tuas disciplinas,
                    organizados por capítulo, com histórico, revisão e
                    estatísticas.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {[
                    {
                      label: "Disponíveis",
                      value: quizItems.length,
                      icon: BookOpen,
                      color: "text-blue-300",
                      bg: "bg-blue-500/10",
                    },
                    {
                      label: "Concluídos",
                      value: doneCount,
                      icon: CheckCircle2,
                      color: "text-emerald-300",
                      bg: "bg-emerald-500/10",
                    },
                    {
                      label: "Pendentes",
                      value: pendingCount,
                      icon: Target,
                      color: "text-amber-300",
                      bg: "bg-amber-500/10",
                    },
                    {
                      label: "Média",
                      value: avgScore !== null ? `${avgScore}%` : "—",
                      icon: Trophy,
                      color:
                        avgScore !== null && avgScore >= 50
                          ? "text-indigo-300"
                          : "text-slate-300",
                      bg: "bg-indigo-500/10",
                    },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm sm:p-4"
                    >
                      <div
                        className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}
                      >
                        <Icon size={16} className={color} />
                      </div>
                      <p
                        className={`text-center text-lg font-black tabular-nums ${color}`}
                      >
                        {value}
                      </p>
                      <p className="text-center text-[10px] uppercase tracking-widest text-slate-500">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Painel lateral */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                      Resumo rápido
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-white">
                      O teu progresso
                    </h2>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                    <Flame size={18} />
                  </div>
                </div>

                <div className="mt-4 space-y-3 sm:mt-5">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Questionários feitos</span>
                      <span>
                        {doneCount}/{quizItems.length}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                        style={{
                          width: `${
                            quizItems.length
                              ? (doneCount / quizItems.length) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-[11px] uppercase tracking-widest text-slate-500">
                        Média tentativas
                      </p>
                      <p className="mt-2 text-2xl font-black text-white tabular-nums">
                        {avgAttempts}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-[11px] uppercase tracking-widest text-slate-500">
                        Disciplinas
                      </p>
                      <p className="mt-2 text-2xl font-black text-white tabular-nums">
                        {disciplineStats.length}
                      </p>
                    </div>
                  </div>

                  {topDiscipline && (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                      <p className="text-[11px] uppercase tracking-widest text-slate-500">
                        Disciplina com mais quizzes
                      </p>
                      <p className="mt-2 text-sm font-bold text-white">
                        {topDiscipline.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {topDiscipline.total} avaliação/avaliações
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FILTROS */}
        <section className="sticky top-0 z-20 border-b border-white/10 bg-[#050816]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto max-w-7xl space-y-3">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar questionários, capítulos ou disciplinas..."
                className="min-h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
              <span className="mr-1 hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 sm:inline-flex">
                <Filter size={12} />
                Filtrar
              </span>

              {(
                [
                  { key: "all", label: "Todos" },
                  { key: "pending", label: "Por fazer" },
                  { key: "done", label: "Concluídos" },
                ] as const
              ).map((item) => (
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

        {/* CONTEÚDO */}
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {filteredQuizzes.length === 0 ? (
            <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center sm:min-h-[42vh] sm:p-10">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
                <BookOpen size={28} className="text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Nenhum questionário encontrado
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                Ainda não há avaliações disponíveis para os filtros que escolheste.
                Tenta mudar a pesquisa ou selecionar outra disciplina.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                    Questionários
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredQuizzes.length} avaliação/avaliações encontrada(s)
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredQuizzes.map((quiz) => {
                  const scoreTheme = getScoreTheme(quiz.bestScore);
                  const isDone = quiz.attempts > 0;

                  return (
                    <article
                      key={quiz.contentId}
                      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-[0_20px_70px_rgba(0,0,0,0.35)]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                      <div className="relative p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border sm:h-12 sm:w-12 ${
                                isDone
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                  : "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle2 size={18} />
                              ) : (
                                <Trophy size={18} />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 sm:text-[11px]">
                                {quiz.disciplineName}
                              </p>
                              <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-white sm:text-lg">
                                {quiz.title}
                              </h3>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-2xl border px-2.5 py-1 text-xs font-black tabular-nums ${scoreTheme.className}`}
                          >
                            {scoreTheme.label}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                          <BookOpen size={12} />
                          <span className="truncate">{quiz.chapterTitle}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {quiz.timeLimitSecs !== null && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-400">
                              <Clock size={11} />
                              {formatTime(quiz.timeLimitSecs)}
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-400">
                            <RotateCcw size={11} />
                            {quiz.attempts} tentativa{quiz.attempts === 1 ? "" : "s"}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
                              isDone
                                ? "border-emerald-500/15 bg-emerald-500/10 text-emerald-300"
                                : "border-amber-500/15 bg-amber-500/10 text-amber-300"
                            }`}
                          >
                            <Award size={11} />
                            {getPerformanceLabel(quiz.bestScore)}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <button
                            onClick={() => setModal({ type: "player", quiz })}
                            className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 active:scale-[0.99] sm:col-span-3"
                          >
                            <Play size={14} fill="currentColor" />
                            {isDone ? "Repetir" : "Começar"}
                          </button>

                          {isDone && (
                            <>
                              <button
                                onClick={() => setModal({ type: "review", quiz })}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08]"
                              >
                                <CheckCircle2 size={13} />
                                Rever
                              </button>

                              <button
                                onClick={() => setModal({ type: "stats", quiz })}
                                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-slate-300 transition hover:bg-white/[0.08]"
                                title="Ver estatísticas"
                              >
                                <BarChart3 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* MODAIS */}
      {modal?.type === "player" && (
        <QuizPlayer
          contentId={modal.quiz.contentId}
          title={modal.quiz.title}
          disciplineName={modal.quiz.disciplineName}
          chapterTitle={modal.quiz.chapterTitle}
          timeLimitSeconds={modal.quiz.timeLimitSecs}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "review" && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/95 backdrop-blur-md sm:items-center sm:p-4">
          <div className="relative flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-none border border-white/10 bg-slate-950 shadow-2xl sm:h-auto sm:max-h-[95dvh] sm:rounded-3xl">
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            <QuizReview
              contentId={modal.quiz.contentId}
              title={modal.quiz.title}
              onClose={() => setModal(null)}
              onRepeat={() => setModal({ type: "player", quiz: modal.quiz })}
              onStats={() => setModal({ type: "stats", quiz: modal.quiz })}
            />
          </div>
        </div>
      )}

      {modal?.type === "stats" && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/95 backdrop-blur-md sm:items-center sm:p-4">
          <div className="relative flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-none border border-white/10 bg-slate-950 shadow-2xl sm:h-auto sm:max-h-[95dvh] sm:rounded-3xl">
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            <QuizStats
              contentId={modal.quiz.contentId}
              title={modal.quiz.title}
              onBack={() => setModal({ type: "review", quiz: modal.quiz })}
              onClose={() => setModal(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}