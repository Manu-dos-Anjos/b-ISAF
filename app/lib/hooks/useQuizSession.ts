"use client";

import { useCallback, useEffect, useState } from "react";

export type QuizSessionState = {
  questionIds: string[];
  currentQuestionIndex: number;
  /** questionId -> array de answerIds selecionados (suporta 1 ou várias respostas) */
  answers: Record<string, string[]>;
  timeRemainingSeconds: number | null;
  attemptStartedAt: string;
};

type SaveAnswerOptions = {
  /** Se true, faz toggle (adiciona/remove) em vez de substituir a seleção */
  multiple?: boolean;
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

/** Compatibilidade com sessões antigas onde `answers` era Record<string, string> */
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
  const [session, setSession] = useState<QuizSessionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      persist((prev) => ({
        ...prev,
        currentQuestionIndex: Math.max(
          0,
          Math.min(index, Math.max(prev.questionIds.length - 1, 0))
        ),
      }));
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

        return {
          ...prev,
          answers: { ...prev.answers, [questionId]: nextForQuestion },
        };
      });
    },
    [persist]
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

  return {
    session,
    isLoading,
    saveAnswer,
    setQuestion,
    setQuestionIds,
    tickTimer,
    clearSession,
    resetSession,
    loadSession,
  };
}