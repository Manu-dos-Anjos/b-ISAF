"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser } from "@/app/lib/context/UserContext";

export type QuizSessionState = {
  questionIds: string[];
  currentQuestionIndex: number;
  answers: Record<string, string[]>;
  timeRemainingSeconds: number | null;
  attemptStartedAt: string;
};

type SaveAnswerOptions = {
  multiple?: boolean;
};

export type SubmitQuizResult = {
  resultId: string;
  correctCount: number;
  totalQuestions: number;
  scorePct: number;
};

function sessionKey(contentId: string) {
  return `b-isaf:quiz:session:${contentId}`;
}

function createEmptySession(timeLimitSeconds?: number | null): QuizSessionState {
  return {
    questionIds: [],
    currentQuestionIndex: 0,
    answers: {},
    timeRemainingSeconds: timeLimitSeconds ?? null,
    attemptStartedAt: new Date().toISOString(),
  };
}

function normalizeAnswers(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string[]> = {};
  for (const [qid, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[qid] = value.filter((v): v is string => typeof v === "string");
    } else if (typeof value === "string") {
      out[qid] = [value];
    }
  }
  return out;
}

function readSession(contentId: string): QuizSessionState | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(sessionKey(contentId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<QuizSessionState> | null;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      questionIds: Array.isArray(parsed.questionIds) ? parsed.questionIds : [],
      currentQuestionIndex:
        typeof parsed.currentQuestionIndex === "number" ? parsed.currentQuestionIndex : 0,
      answers: normalizeAnswers(parsed.answers),
      timeRemainingSeconds:
        typeof parsed.timeRemainingSeconds === "number" ? parsed.timeRemainingSeconds : null,
      attemptStartedAt:
        typeof parsed.attemptStartedAt === "string"
          ? parsed.attemptStartedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeSession(contentId: string, session: QuizSessionState) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(sessionKey(contentId), JSON.stringify(session));
  } catch {
    // ignore
  }
}

function removeSession(contentId: string) {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(sessionKey(contentId));
  } catch {
    // ignore
  }
}

export function useQuizSession(contentId: string, timeLimitSeconds?: number | null) {
  const { supabase } = useSupabase();
  const { user } = useUser() as any;

  const [session, setSession] = useState<QuizSessionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guarda a referência do userId para evitar efeitos repetidos
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  // Carrega ou cria a sessão
  useEffect(() => {
    setIsLoading(true);
    const existing = readSession(contentId);
    if (existing) {
      setSession(existing);
    } else {
      const fresh = createEmptySession(timeLimitSeconds);
      setSession(fresh);
      writeSession(contentId, fresh);
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const persist = useCallback(
    (updater: (prev: QuizSessionState) => QuizSessionState) => {
      setSession((prev) => {
        const base = prev ?? createEmptySession(timeLimitSeconds);
        const next = updater(base);
        writeSession(contentId, next);
        return next;
      });
    },
    [contentId, timeLimitSeconds]
  );

  // Nova função para gravar progresso parcial no Supabase
  const savePartialProgress = useCallback(async (currentSession?: QuizSessionState | null) => {
    const userId = userIdRef.current;
    if (!userId || !contentId || !currentSession) return;

    const total = currentSession.questionIds.length;
    if (total === 0) return;

    const answered = Object.values(currentSession.answers).filter(
      (answerIds) => answerIds.length > 0
    ).length;
    const reached = Math.max(answered, currentSession.currentQuestionIndex);
    const progressPercent = Math.min(100, Math.round((reached / total) * 100));

    try {
      const { error } = await supabase.from("student_progress").upsert(
        {
          student_id: userId,
          content_id: contentId,
          progress_percent: progressPercent,
          last_position_seconds: 0,
          completed: false,
          completed_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,content_id" }
      );
      if (error) console.error("Erro ao gravar progresso parcial do quiz:", error);
      else window.dispatchEvent(new CustomEvent("b-isaf:quiz-progress-updated"));
    } catch (err) {
      console.error("Falha na gravação de progresso parcial do quiz:", err);
    }
  }, [supabase, contentId]);

  const savePartialProgressRef = useRef(savePartialProgress);
  useEffect(() => {
    savePartialProgressRef.current = savePartialProgress;
  }, [savePartialProgress]);

  // Grava progresso ao sair da página ou desmontar
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session) void savePartialProgressRef.current(session);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Limpa ao desmontar? Não remove a sessão, apenas grava.
      if (session) void savePartialProgressRef.current(session);
    };
  }, [session]);

  const loadSession = useCallback(async () => {
    const existing = readSession(contentId);
    if (existing) setSession(existing);
    return existing;
  }, [contentId]);

  const setQuestionIds = useCallback(
    (ids: string[]) => {
      persist((prev) => ({ ...prev, questionIds: ids }));
    },
    [persist]
  );

  const setQuestion = useCallback(
    (index: number) => {
      persist((prev) => {
        const next = {
          ...prev,
          currentQuestionIndex: Math.max(
            0,
            Math.min(index, Math.max(prev.questionIds.length - 1, 0))
          ),
        };
        void savePartialProgressRef.current(next);
        return next;
      });
    },
    [persist]
  );

  const saveAnswer = useCallback(
    (questionId: string, answerId: string, options: SaveAnswerOptions = {}) => {
      persist((prev) => {
        const current = prev.answers[questionId] ?? [];
        const nextForQuestion = options.multiple
          ? current.includes(answerId)
            ? current.filter((id) => id !== answerId)
            : [...current, answerId]
          : [answerId];

        const next = {
          ...prev,
          answers: { ...prev.answers, [questionId]: nextForQuestion },
        };

        // Grava progresso após cada resposta
        void savePartialProgressRef.current(next);

        return next;
      });
    },
    [persist, savePartialProgressRef]
  );

  const tickTimer = useCallback(() => {
    persist((prev) => {
      if (prev.timeRemainingSeconds == null) return prev;
      return { ...prev, timeRemainingSeconds: Math.max(0, prev.timeRemainingSeconds - 1) };
    });
  }, [persist]);

  const resetSession = useCallback(async () => {
    const fresh = createEmptySession(timeLimitSeconds);
    writeSession(contentId, fresh);
    setSession(fresh);
    return fresh;
  }, [contentId, timeLimitSeconds]);

  const clearSession = useCallback(async () => {
    removeSession(contentId);
    setSession(null);
  }, [contentId]);

  // ===================== SUBMISSÃO REAL =====================
  const submitQuiz = useCallback(async (): Promise<SubmitQuizResult | null> => {
    if (!session || !userIdRef.current || session.questionIds.length === 0) return null;

    setIsSubmitting(true);
    try {
      const { questionIds, answers, attemptStartedAt } = session;

      const { data: answerRows, error: answersError } = await supabase
        .from("quiz_answers")
        .select("id, question_id, is_correct")
        .in("question_id", questionIds);

      if (answersError) throw answersError;

      const correctByQuestion: Record<string, string[]> = {};
      for (const row of answerRows ?? []) {
        if (row.is_correct) {
          correctByQuestion[row.question_id] = [
            ...(correctByQuestion[row.question_id] ?? []),
            row.id,
          ];
        }
      }

      let correctCount = 0;
      const details: {
        question_id: string;
        selected_answer_id: string | null;
        is_correct: boolean;
      }[] = [];

      for (const qid of questionIds) {
        const selected = answers[qid] ?? [];
        const correct = correctByQuestion[qid] ?? [];
        const isCorrect =
          selected.length > 0 &&
          selected.length === correct.length &&
          selected.every((id) => correct.includes(id));

        if (isCorrect) correctCount++;

        details.push({
          question_id: qid,
          selected_answer_id: selected[0] ?? null,
          is_correct: isCorrect,
        });
      }

      const totalQuestions = questionIds.length;
      const scorePct = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
      const timeSpentSeconds = Math.round(
        (Date.now() - new Date(attemptStartedAt).getTime()) / 1000
      );

      const { data: resultRow, error: resultError } = await supabase
        .from("quiz_results")
        .insert({
          student_id: userIdRef.current,
          content_id: contentId,
          score: scorePct,
          total_questions: totalQuestions,
          correct_answers: correctCount,
          time_spent_seconds: timeSpentSeconds,
        })
        .select()
        .single();

      if (resultError || !resultRow) throw resultError;

      const detailRows = details.map((d) => ({
        result_id: resultRow.id,
        question_id: d.question_id,
        selected_answer_id: d.selected_answer_id,
        is_correct: d.is_correct,
      }));

      const { error: detailsError } = await supabase
        .from("quiz_results_details")
        .insert(detailRows);

      if (detailsError) {
        console.error("Erro ao gravar detalhes do quiz:", detailsError);
      }

      // Remove o progresso parcial do student_progress (se existir)
      await supabase
        .from("student_progress")
        .delete()
        .eq("student_id", userIdRef.current)
        .eq("content_id", contentId);

      await clearSession();

      return {
        resultId: resultRow.id,
        correctCount,
        totalQuestions,
        scorePct,
      };
    } catch (err) {
      console.error("Erro ao submeter quiz:", err);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [session, supabase, contentId, clearSession]);

  return {
    session,
    isLoading,
    isSubmitting,
    saveAnswer,
    setQuestion,
    setQuestionIds,
    tickTimer,
    clearSession,
    resetSession,
    loadSession,
    submitQuiz,
  };
}