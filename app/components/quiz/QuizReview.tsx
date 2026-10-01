"use client";

import { useEffect, useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Trophy,
  RotateCcw,
  BarChart2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser } from "@/app/lib/context/UserContext";
import QuizModalShell from "./QuizModalShell";

/* ================================================================
   TIPOS
   ================================================================ */

type ReviewDetail = {
  questionId: string;
  questionText: string;
  selectedId: string | null;
  selectedText: string | null;
  selectedFeedback: string | null;
  correctId: string;
  correctText: string;
  correctFeedback: string | null;
  questionExplanation: string | null;
  isCorrect: boolean;
};

type ResultSummary = {
  id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_spent_seconds: number | null;
  attempted_at: string;
};

type ResultDetailRow = {
  question_id: string;
  selected_answer_id: string | null;
  is_correct: boolean;
};

type QuestionRow = {
  id: string;
  question_text: string;
  order_index: number;
  explanation: string | null;
};

type AnswerRow = {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  order_index: number;
  feedback: string | null;
};

type Props = {
  contentId: string;
  title: string;
  onClose: () => void;
  onRepeat: () => void;
  onStats: () => void;
};

/* ================================================================
   COMPONENTE
   ================================================================ */

export default function QuizReview({
  contentId,
  title,
  onClose,
  onRepeat,
  onStats,
}: Props) {
  const { supabase } = useSupabase();
  const { profile } = useUser();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultSummary | null>(null);
  const [details, setDetails] = useState<ReviewDetail[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const studentId = profile?.id ?? null;

  /* ── Carregar último resultado ── */
  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setResult(null);
      setDetails([]);
      return;
    }

    const sid = studentId as string;
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const { data: resultData, error: resErr } = await supabase
          .from("quiz_results")
          .select(
            "id, score, total_questions, correct_answers, time_spent_seconds, attempted_at"
          )
          .eq("student_id", sid)
          .eq("content_id", contentId)
          .order("attempted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (resErr) throw resErr;
        if (cancelled) return;

        if (!resultData) {
          setResult(null);
          setDetails([]);
          return;
        }

        setResult(resultData as ResultSummary);
        const resultId = (resultData as ResultSummary).id;

        const { data: dets, error: detErr } = await supabase
          .from("quiz_results_details")
          .select("question_id, selected_answer_id, is_correct")
          .eq("result_id", resultId);

        if (detErr) throw detErr;
        if (cancelled) return;

        const detailRows = (dets ?? []) as ResultDetailRow[];
        const questionIds = [...new Set(detailRows.map((d) => d.question_id))];

        let questionRows: QuestionRow[] = [];
        if (questionIds.length > 0) {
          const { data: qRows, error: qErr } = await supabase
            .from("quiz_questions")
            .select("id, question_text, order_index, explanation")
            .in("id", questionIds);

          if (qErr) throw qErr;

          questionRows = ((qRows ?? []) as QuestionRow[]).sort(
            (a, b) => a.order_index - b.order_index
          );
        }

        let answerRows: AnswerRow[] = [];
        if (questionIds.length > 0) {
          const { data: aRows, error: aErr } = await supabase
            .from("quiz_answers")
            .select("id, question_id, answer_text, is_correct, order_index, feedback")
            .in("question_id", questionIds);

          if (aErr) throw aErr;

          answerRows = ((aRows ?? []) as AnswerRow[]).sort(
            (a, b) => a.order_index - b.order_index
          );
        }

        if (cancelled) return;

        const questionsMap = new Map(
          questionRows.map((q) => [
            q.id,
            {
              text: q.question_text,
              orderIndex: q.order_index,
              explanation: q.explanation,
            },
          ])
        );

        const answersById = new Map(
          answerRows.map((a) => [
            a.id,
            {
              text: a.answer_text,
              feedback: a.feedback,
              isCorrect: a.is_correct,
              questionId: a.question_id,
            },
          ])
        );

        const correctByQuestion = new Map<
          string,
          { id: string; text: string; feedback: string | null }
        >();

        for (const a of answerRows) {
          if (a.is_correct) {
            correctByQuestion.set(a.question_id, {
              id: a.id,
              text: a.answer_text,
              feedback: a.feedback,
            });
          }
        }

        const orderedDetails = [...detailRows].sort((a, b) => {
          const ao = questionsMap.get(a.question_id)?.orderIndex ?? 0;
          const bo = questionsMap.get(b.question_id)?.orderIndex ?? 0;
          return ao - bo;
        });

        setDetails(
          orderedDetails.map((d) => {
            const selected = d.selected_answer_id
              ? answersById.get(d.selected_answer_id) ?? null
              : null;

            const correct = correctByQuestion.get(d.question_id) ?? null;

            return {
              questionId: d.question_id,
              questionText: questionsMap.get(d.question_id)?.text ?? "—",
              selectedId: d.selected_answer_id,
              selectedText: selected?.text ?? null,
              selectedFeedback: selected?.feedback ?? null,
              correctId: correct?.id ?? "",
              correctText: correct?.text ?? "—",
              correctFeedback: correct?.feedback ?? null,
              questionExplanation:
                questionsMap.get(d.question_id)?.explanation ?? null,
              isCorrect: d.is_correct,
            };
          })
        );
      } catch (err) {
        console.error("Erro ao carregar revisão:", err);
        setResult(null);
        setDetails([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase, studentId, contentId]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function perfMessage(pct: number) {
    if (pct >= 90)
      return { text: "Excelente!", color: "text-amber-600 dark:text-amber-400" };
    if (pct >= 75)
      return { text: "Muito bem!", color: "text-emerald-600 dark:text-emerald-400" };
    if (pct >= 50)
      return { text: "Aprovado!", color: "text-blue-600 dark:text-blue-400" };
    return { text: "Continua a estudar!", color: "text-rose-600 dark:text-rose-400" };
  }

  /* ================================================================
     RENDER
     ================================================================ */

  if (loading) {
    return (
      <QuizModalShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 md:gap-2.5">
          <Loader2 size={24} className="animate-spin text-blue-600 dark:text-blue-400 md:h-5 md:w-5" />
          <p className="text-sm md:text-xs text-slate-500 dark:text-slate-400">
            A carregar revisão…
          </p>
        </div>
      </QuizModalShell>
    );
  }

  if (!result) {
    return (
      <QuizModalShell>
        <div className="flex shrink-0 items-center justify-end px-5 md:px-4 py-4 md:py-3">
          <button
            onClick={onClose}
            className="rounded-xl md:rounded-lg p-2 md:p-1.5 text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={16} className="md:h-4 md:w-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 md:gap-2.5 px-6 md:px-5 text-center">
          <AlertCircle size={24} className="text-slate-400 dark:text-slate-600 md:h-5 md:w-5" />
          <p className="text-sm md:text-xs text-slate-500 dark:text-slate-400">
            Nenhum resultado encontrado.
          </p>
          <p className="text-xs md:text-[11px] text-slate-500 dark:text-slate-500">
            Usa o botão do capítulo para iniciar o questionário.
          </p>
        </div>
      </QuizModalShell>
    );
  }

  const pct = Math.round(Number(result.score));
  const pass = pct >= 50;
  const perf = perfMessage(pct);

  return (
    <QuizModalShell>
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-white/10 px-5 md:px-4 py-4 md:py-3">
        <div>
          <p className="text-[11px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Revisão
          </p>
          <p className="mt-0.5 line-clamp-1 text-sm md:text-xs font-bold text-slate-900 dark:text-white">
            {title}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl md:rounded-lg p-2 md:p-1.5 text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X size={16} className="md:h-4 md:w-4" />
        </button>
      </div>

      {/* ── Corpo com scroll (score + lista) ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Score card */}
        <div
          className={`mx-5 md:mx-4 mt-5 md:mt-4 rounded-2xl md:rounded-xl border p-5 md:p-4 ${
            pass
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
              : "border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5"
          }`}
        >
          <div className="flex items-center gap-4 md:gap-3">
            <div
              className={`flex h-14 w-14 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-2xl md:rounded-xl ${
                pass
                  ? "bg-emerald-100 dark:bg-emerald-500/15"
                  : "bg-rose-100 dark:bg-rose-500/15"
              }`}
            >
              <Trophy
                size={24}
                className={`md:h-6 md:w-6 ${
                  pass
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              />
            </div>

            <div className="flex-1">
              <p
                className={`text-4xl md:text-3xl font-black tabular-nums ${
                  pass
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {pct}%
              </p>
              <p className="mt-0.5 text-xs md:text-[11px] text-slate-600 dark:text-slate-400">
                {result.correct_answers} de {result.total_questions} correctas
              </p>
            </div>

            <div className="text-right">
              <p className={`text-sm md:text-xs font-bold ${perf.color}`}>{perf.text}</p>
              {result.time_spent_seconds != null && (
                <p className="mt-1 text-[11px] md:text-[10px] text-slate-500">
                  ⏱ {formatTime(result.time_spent_seconds)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 md:mt-2.5 h-2 md:h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pass ? "bg-emerald-500" : "bg-rose-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Lista de perguntas */}
        <div className="space-y-2 md:space-y-1.5 px-5 md:px-4 py-4 md:py-3">
          <p className="mb-3 md:mb-2.5 text-[11px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Revisão questão a questão
          </p>

          {details.map((d, idx) => {
            const open = expanded.has(d.questionId);

            return (
              <div
                key={d.questionId}
                className="overflow-hidden rounded-2xl md:rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900 dark:shadow-none"
              >
                <button
                  onClick={() => toggle(d.questionId)}
                  className="flex w-full items-center gap-3 md:gap-2.5 px-4 md:px-3 py-3.5 md:py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <div
                    className={`flex h-6 w-6 md:h-5 md:w-5 shrink-0 items-center justify-center rounded-full ${
                      d.isCorrect
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                    }`}
                  >
                    {d.isCorrect ? (
                      <CheckCircle2 size={13} className="md:h-3 md:w-3" />
                    ) : (
                      <XCircle size={13} className="md:h-3 md:w-3" />
                    )}
                  </div>

                  <p className="flex-1 text-xs md:text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">
                    {idx + 1}. {d.questionText}
                  </p>

                  <div className="shrink-0 text-slate-400 dark:text-slate-600">
                    {open ? (
                      <ChevronUp size={14} className="md:h-3.5 md:w-3.5" />
                    ) : (
                      <ChevronDown size={14} className="md:h-3.5 md:w-3.5" />
                    )}
                  </div>
                </button>

                {open && (
                  <div className="space-y-2 md:space-y-1.5 border-t border-slate-200 dark:border-white/5 px-4 md:px-3 py-3 md:py-2.5">
                    {!d.isCorrect && d.selectedText && (
                      <div className="flex items-start gap-2 md:gap-1.5">
                        <XCircle
                          size={12}
                          className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400 md:h-3 md:w-3"
                        />
                        <div>
                          <p className="text-[10px] md:text-[9px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-500">
                            A tua resposta
                          </p>
                          <p className="mt-0.5 text-xs md:text-[11px] text-rose-700 dark:text-rose-300">
                            {d.selectedText}
                          </p>
                        </div>
                      </div>
                    )}

                    {!d.isCorrect && !d.selectedText && (
                      <p className="text-[11px] md:text-[10px] italic text-slate-500">
                        Não respondeste a esta pergunta.
                      </p>
                    )}

                    <div className="flex items-start gap-2 md:gap-1.5">
                      <CheckCircle2
                        size={12}
                        className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400 md:h-3 md:w-3"
                      />
                      <div>
                        <p className="text-[10px] md:text-[9px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">
                          Resposta correcta
                        </p>
                        <p className="mt-0.5 text-xs md:text-[11px] text-emerald-700 dark:text-emerald-300">
                          {d.correctText}
                        </p>
                      </div>
                    </div>

                    {d.selectedFeedback && (
                      <div className="rounded-xl md:rounded-lg bg-slate-50 px-3 md:px-2.5 py-2 md:py-1.5 dark:bg-white/5">
                        <p className="text-[10px] md:text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                          Feedback
                        </p>
                        <p className="mt-1 text-xs md:text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                          {d.selectedFeedback}
                        </p>
                      </div>
                    )}

                    {!d.isCorrect &&
                      d.correctFeedback &&
                      d.correctFeedback !== d.selectedFeedback && (
                        <div className="rounded-xl md:rounded-lg bg-emerald-50 px-3 md:px-2.5 py-2 md:py-1.5 dark:bg-emerald-500/10">
                          <p className="text-[10px] md:text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            Comentário da resposta correcta
                          </p>
                          <p className="mt-1 text-xs md:text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-200">
                            {d.correctFeedback}
                          </p>
                        </div>
                      )}

                    {d.questionExplanation && (
                      <div className="rounded-xl md:rounded-lg border border-blue-200 bg-blue-50 px-3 md:px-2.5 py-2 md:py-1.5 dark:border-blue-500/20 dark:bg-blue-500/10">
                        <p className="text-[10px] md:text-[9px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-200">
                          Explicação
                        </p>
                        <p className="mt-1 text-xs md:text-[11px] leading-relaxed text-blue-800 dark:text-blue-200">
                          {d.questionExplanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Acções (sempre visíveis, nunca exigem scroll) ── */}
      <div className="flex shrink-0 gap-3 md:gap-2 border-t border-slate-200 dark:border-white/10 px-5 md:px-4 py-4 md:py-3">
        <button
          onClick={onRepeat}
          className="flex flex-1 items-center justify-center gap-2 md:gap-1.5 rounded-2xl md:rounded-xl border border-slate-300 bg-slate-100 py-3 md:py-2.5 text-sm md:text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <RotateCcw size={14} className="md:h-3.5 md:w-3.5" /> Repetir
        </button>
        <button
          onClick={onStats}
          className="flex flex-1 items-center justify-center gap-2 md:gap-1.5 rounded-2xl md:rounded-xl bg-indigo-600 py-3 md:py-2.5 text-sm md:text-xs font-bold text-white transition hover:bg-indigo-500"
        >
          <BarChart2 size={14} className="md:h-3.5 md:w-3.5" /> Ver estatísticas
        </button>
      </div>
    </QuizModalShell>
  );
}