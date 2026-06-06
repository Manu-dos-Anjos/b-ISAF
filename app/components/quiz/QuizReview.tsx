// app/components/quiz/QuizReview.tsx
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
} from "lucide-react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser } from "@/app/lib/context/UserContext";

/* ================================================================
   TIPOS
   ================================================================ */

type ReviewDetail = {
  questionId: string;
  questionText: string;
  selectedId: string | null;
  selectedText: string | null;
  correctId: string;
  correctText: string;
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
};

type AnswerRow = {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  order_index: number;
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
        // 1) Buscar o último resultado do aluno para este quiz
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

        // Guardar id do resultado (resolver inferência do TS)
        const resultId = (resultData as ResultSummary).id;

        // 2) Buscar os detalhes desse resultado
        const { data: dets, error: detErr } = await supabase
          .from("quiz_results_details")
          .select("question_id, selected_answer_id, is_correct")
          .eq("result_id", resultId);

        if (detErr) throw detErr;

        if (cancelled) return;

        const detailRows = (dets ?? []) as ResultDetailRow[];

        // 3) Buscar as perguntas envolvidas
        const questionIds = [...new Set(detailRows.map((d) => d.question_id))];

        let questionRows: QuestionRow[] = [];
        if (questionIds.length > 0) {
          const { data: qRows, error: qErr } = await supabase
            .from("quiz_questions")
            .select("id, question_text, order_index")
            .in("id", questionIds);

          if (qErr) throw qErr;

          questionRows = ((qRows ?? []) as QuestionRow[]).sort(
            (a, b) => a.order_index - b.order_index
          );
        }

        // 4) Buscar as respostas dessas perguntas
        let answerRows: AnswerRow[] = [];
        if (questionIds.length > 0) {
          const { data: aRows, error: aErr } = await supabase
            .from("quiz_answers")
            .select("id, question_id, answer_text, is_correct, order_index")
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
            },
          ])
        );

        const answersById = new Map(
          answerRows.map((a) => [a.id, a.answer_text])
        );

        const correctByQuestion = new Map<string, { id: string; text: string }>();

        for (const a of answerRows) {
          if (a.is_correct) {
            correctByQuestion.set(a.question_id, {
              id: a.id,
              text: a.answer_text,
            });
          }
        }

        // Ordenar pela ordem da pergunta no quiz
        const orderedDetails = [...detailRows].sort((a, b) => {
          const ao = questionsMap.get(a.question_id)?.orderIndex ?? 0;
          const bo = questionsMap.get(b.question_id)?.orderIndex ?? 0;
          return ao - bo;
        });

        setDetails(
          orderedDetails.map((d) => ({
            questionId: d.question_id,
            questionText: questionsMap.get(d.question_id)?.text ?? "—",
            selectedId: d.selected_answer_id,
            selectedText: d.selected_answer_id
              ? answersById.get(d.selected_answer_id) ?? null
              : null,
            correctId: correctByQuestion.get(d.question_id)?.id ?? "",
            correctText: correctByQuestion.get(d.question_id)?.text ?? "—",
            isCorrect: d.is_correct,
          }))
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

  /* ── Toggle expand ── */
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ── Formatar tempo ── */
  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  /* ── Mensagem de desempenho ── */
  function perfMessage(pct: number) {
    if (pct >= 90) return { text: "Excelente! 🏆", color: "text-amber-400" };
    if (pct >= 75) return { text: "Muito bem! 🎉", color: "text-emerald-400" };
    if (pct >= 50) return { text: "Aprovado! 👍", color: "text-blue-400" };
    return { text: "Continua a estudar!", color: "text-rose-400" };
  }

  /* ================================================================
     RENDER
     ================================================================ */

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <Loader2 size={24} className="animate-spin text-blue-400" />
        <p className="text-sm text-slate-400">A carregar revisão…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-slate-400">Nenhum resultado encontrado.</p>
        <button
          onClick={onRepeat}
          className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
        >
          Fazer questionário
        </button>
      </div>
    );
  }

  const pct = Math.round(Number(result.score));
  const pass = pct >= 50;
  const perf = perfMessage(pct);

  return (
    <div className="flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Revisão
          </p>
          <p className="mt-0.5 line-clamp-1 text-sm font-bold text-white">{title}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Score card ── */}
      <div
        className={`mx-5 mt-5 rounded-2xl border p-5 ${
          pass
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-rose-500/20 bg-rose-500/5"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              pass ? "bg-emerald-500/15" : "bg-rose-500/15"
            }`}
          >
            <Trophy
              size={24}
              className={pass ? "text-emerald-400" : "text-rose-400"}
            />
          </div>

          <div className="flex-1">
            <p
              className={`text-4xl font-black tabular-nums ${
                pass ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {pct}%
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {result.correct_answers} de {result.total_questions} correctas
            </p>
          </div>

          <div className="text-right">
            <p className={`text-sm font-bold ${perf.color}`}>{perf.text}</p>
            {result.time_spent_seconds != null && (
              <p className="mt-1 text-[11px] text-slate-500">
                ⏱ {formatTime(result.time_spent_seconds)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              pass ? "bg-emerald-500" : "bg-rose-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Lista de perguntas ── */}
      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Revisão questão a questão
        </p>

        {details.map((d, idx) => {
          const open = expanded.has(d.questionId);

          return (
            <div
              key={d.questionId}
              className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
            >
              <button
                onClick={() => toggle(d.questionId)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/5"
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    d.isCorrect
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-rose-500/15 text-rose-400"
                  }`}
                >
                  {d.isCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                </div>

                <p className="flex-1 text-xs font-medium leading-relaxed text-slate-300 line-clamp-2">
                  {idx + 1}. {d.questionText}
                </p>

                <div className="shrink-0 text-slate-600">
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {open && (
                <div className="space-y-2 border-t border-white/5 px-4 py-3">
                  {!d.isCorrect && d.selectedText && (
                    <div className="flex items-start gap-2">
                      <XCircle
                        size={12}
                        className="mt-0.5 shrink-0 text-rose-400"
                      />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-500">
                          A tua resposta
                        </p>
                        <p className="mt-0.5 text-xs text-rose-300">
                          {d.selectedText}
                        </p>
                      </div>
                    </div>
                  )}

                  {!d.isCorrect && !d.selectedText && (
                    <p className="text-[11px] italic text-slate-500">
                      Não respondeste a esta pergunta.
                    </p>
                  )}

                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      size={12}
                      className="mt-0.5 shrink-0 text-emerald-400"
                    />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                        Resposta correcta
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-300">
                        {d.correctText}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Acções ── */}
      <div className="flex shrink-0 gap-3 border-t border-white/10 px-5 py-4">
        <button
          onClick={onRepeat}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
        >
          <RotateCcw size={14} /> Repetir
        </button>
        <button
          onClick={onStats}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
        >
          <BarChart2 size={14} /> Ver estatísticas
        </button>
      </div>
    </div>
  );
}