// app/components/quiz/QuizStats.tsx
"use client";

import { useEffect, useState } from "react";
import {
  X, ChevronLeft, Loader2, AlertTriangle,
  Users, TrendingUp, Clock, Target,
} from "lucide-react";
import { getQuizStats, type QuizStats as QuizStatsData } from "@/app/actions/quiz-stats";
import QuizModalShell from "./QuizModalShell";

/* ================================================================
   HELPERS
   ================================================================ */

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function rateColor(rate: number) {
  if (rate >= 70)
    return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  if (rate >= 45)
    return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
}

/* ================================================================
   PROPS
   ================================================================ */

type Props = {
  contentId: string;
  title:     string;
  onBack:    () => void;
  onClose:   () => void;
};

/* ================================================================
   COMPONENTE
   ================================================================ */

export default function QuizStats({ contentId, title, onBack, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState<QuizStatsData | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getQuizStats(contentId);
        setStats(data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [contentId]);

  return (
    <QuizModalShell>
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="rounded-xl p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:hover:text-white dark:hover:bg-white/10 transition"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Estatísticas da turma
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
              {title}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:hover:text-white dark:hover:bg-white/10 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Conteúdo (único a fazer scroll) ── */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5">

        {loading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 size={24} className="animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">A calcular estatísticas…</p>
          </div>
        )}

        {!loading && !stats && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sem dados suficientes ainda.<br />
              Sê o primeiro a completar este quiz!
            </p>
          </div>
        )}

        {!loading && stats && (
          <>
            {/* ── Métricas globais ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  icon:  Users,
                  label: "Tentativas",
                  value: stats.totalAttempts.toString(),
                  color: "text-blue-600 dark:text-blue-400",
                  bg:    "bg-blue-100 dark:bg-blue-500/10",
                },
                {
                  icon:  TrendingUp,
                  label: "Média da turma",
                  value: `${stats.avgScore}%`,
                  color: stats.avgScore >= 60
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                  bg: stats.avgScore >= 60
                    ? "bg-emerald-100 dark:bg-emerald-500/10"
                    : "bg-rose-100 dark:bg-rose-500/10",
                },
                {
                  icon:  Clock,
                  label: "Tempo médio",
                  value: stats.avgTimeSecs ? formatTime(stats.avgTimeSecs) : "—",
                  color: "text-violet-600 dark:text-violet-400",
                  bg:    "bg-violet-100 dark:bg-violet-500/10",
                },
                {
                  icon:  Target,
                  label: "Taxa conclusão",
                  value: `${stats.completionRate}%`,
                  color: "text-amber-600 dark:text-amber-400",
                  bg:    "bg-amber-100 dark:bg-amber-500/10",
                },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 text-center dark:border-white/10 dark:bg-slate-900 dark:shadow-none"
                >
                  <div className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                    <Icon size={16} className={color} />
                  </div>
                  <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* ── Desempenho por questão ── */}
            {stats.questionStats.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                  Desempenho por questão
                </p>

                <div className="space-y-3">
                  {stats.questionStats.map((qs, idx) => {
                    const { bar, text } = rateColor(qs.correctRate);

                    return (
                      <div
                        key={qs.questionId}
                        className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-3 dark:border-white/10 dark:bg-slate-900 dark:shadow-none"
                      >
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                          {idx + 1}. {qs.questionText}
                        </p>

                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                              <span>Taxa de acerto</span>
                              <span>{qs.totalAttempts} resp.</span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/5">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${bar}`}
                                style={{ width: `${qs.correctRate}%` }}
                              />
                            </div>
                          </div>
                          <span className={`shrink-0 text-sm font-black tabular-nums ${text}`}>
                            {qs.correctRate}%
                          </span>
                        </div>

                        {qs.answerDist.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-600 font-semibold">
                              Distribuição
                            </p>
                            {qs.answerDist.map((ad) => (
                              <div key={ad.answerId} className="flex items-center gap-2">
                                <p className="w-32 shrink-0 truncate text-[11px] text-slate-600 dark:text-slate-400">
                                  {ad.text}
                                </p>
                                <div className="flex-1">
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/5">
                                    <div
                                      className="h-full rounded-full bg-blue-500/70 dark:bg-blue-500/50 transition-all duration-500"
                                      style={{ width: `${ad.pct}%` }}
                                    />
                                  </div>
                                </div>
                                <span className="w-10 shrink-0 text-right text-[11px] font-semibold text-slate-500 tabular-nums">
                                  {ad.pct}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {qs.correctRate < 50 && qs.topWrongAnswer && (
                          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/15 dark:bg-amber-500/8 px-3 py-2">
                            <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <p className="text-[11px] text-amber-700 dark:text-amber-400/80 leading-relaxed">
                              Muitos alunos escolheram{" "}
                              <span className="font-semibold text-amber-800 dark:text-amber-300">
                                "{qs.topWrongAnswer}"
                              </span>{" "}
                              — rever este conteúdo pode ajudar.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </QuizModalShell>
  );
}