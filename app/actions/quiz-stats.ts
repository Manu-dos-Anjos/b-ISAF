// app/actions/quiz-stats.ts
"use server";

import { createClient } from "@supabase/supabase-js";

/* ================================================================
   Cliente com service role — acesso a todos os resultados
   para calcular estatísticas colectivas anónimas
   ================================================================ */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase service role key não configurada.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* ================================================================
   TIPOS
   ================================================================ */

export type QuestionStat = {
  questionId:       string;
  questionText:     string;
  totalAttempts:    number;
  correctRate:      number;        // 0-100
  topWrongAnswerId: string | null;
  topWrongAnswer:   string | null;
  answerDist:       { answerId: string; text: string; count: number; pct: number }[];
};

export type QuizStats = {
  contentId:         string;
  totalAttempts:     number;
  avgScore:          number;       // 0-100
  avgTimeSecs:       number | null;
  completionRate:    number;       // 0-100 (dos que iniciaram vs. terminaram)
  questionStats:     QuestionStat[];
};

/* ================================================================
   ACTION: buscar estatísticas de um quiz
   ================================================================ */
export async function getQuizStats(contentId: string): Promise<QuizStats | null> {
  const sb = getServiceClient();

  /* ── Resultados gerais ── */
  const { data: results, error: rErr } = await sb
    .from("quiz_results")
    .select("id, score, total_questions, correct_answers, time_spent_seconds")
    .eq("content_id", contentId);

  if (rErr || !results) return null;

  const totalAttempts  = results.length;
  const avgScore       = totalAttempts
    ? results.reduce((s, r) => s + Number(r.score), 0) / totalAttempts : 0;
  const timeSamples    = results.filter((r) => r.time_spent_seconds !== null);
  const avgTimeSecs    = timeSamples.length
    ? timeSamples.reduce((s, r) => s + (r.time_spent_seconds ?? 0), 0) / timeSamples.length : null;

  /* ── Buscar perguntas ── */
  const { data: questions } = await sb
    .from("quiz_questions")
    .select("id, question_text")
    .eq("content_id", contentId)
    .order("order_index");

  if (!questions || questions.length === 0) {
    return { contentId, totalAttempts, avgScore, avgTimeSecs, completionRate: 100, questionStats: [] };
  }

  const questionIds = questions.map((q) => q.id);

  /* ── Buscar opções ── */
  const { data: allAnswers } = await sb
    .from("quiz_answers")
    .select("id, question_id, answer_text, is_correct")
    .in("question_id", questionIds);

  const answerMap = new Map<string, { id: string; text: string; isCorrect: boolean; questionId: string }>();
  for (const a of allAnswers ?? []) {
    answerMap.set(a.id, { id: a.id, text: a.answer_text, isCorrect: a.is_correct, questionId: a.question_id });
  }

  /* ── Buscar detalhes das respostas ── */
  const resultIds = results.map((r) => r.id);
  const { data: details } = resultIds.length
    ? await sb
        .from("quiz_results_details")
        .select("question_id, selected_answer_id, is_correct")
        .in("result_id", resultIds)
    : { data: [] };

  /* ── Calcular por questão ── */
  const questionStats: QuestionStat[] = questions.map((q) => {
    const qDetails = (details ?? []).filter((d) => d.question_id === q.id);
    const total    = qDetails.length;
    const correct  = qDetails.filter((d) => d.is_correct).length;
    const rate     = total ? Math.round((correct / total) * 100) : 0;

    // Contagem por opção
    const countByAnswer = new Map<string, number>();
    for (const d of qDetails) {
      if (d.selected_answer_id) {
        countByAnswer.set(d.selected_answer_id, (countByAnswer.get(d.selected_answer_id) ?? 0) + 1);
      }
    }

    const answerDist = [...countByAnswer.entries()].map(([aid, count]) => ({
      answerId: aid,
      text:     answerMap.get(aid)?.text ?? "—",
      count,
      pct:      total ? Math.round((count / total) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    // Resposta errada mais escolhida
    const topWrong = answerDist.find(({ answerId }) => !answerMap.get(answerId)?.isCorrect) ?? null;

    return {
      questionId:       q.id,
      questionText:     q.question_text,
      totalAttempts:    total,
      correctRate:      rate,
      topWrongAnswerId: topWrong?.answerId ?? null,
      topWrongAnswer:   topWrong?.text     ?? null,
      answerDist,
    };
  });

  return {
    contentId,
    totalAttempts,
    avgScore:       Math.round(avgScore),
    avgTimeSecs:    avgTimeSecs !== null ? Math.round(avgTimeSecs) : null,
    completionRate: 100, // todos os registos em quiz_results são completos
    questionStats,
  };
}