// app/lib/hooks/useQuizSession.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser }     from "@/app/lib/context/UserContext";

/* ================================================================
   TIPOS
   ================================================================ */

export type QuizSessionState = {
  contentId:            string;
  currentQuestionIndex: number;
  timeRemainingSeconds: number | null;
  answers:              Record<string, string>; // { [question_id]: answer_id }
};

type UseQuizSessionResult = {
  session:       QuizSessionState | null;
  hasActiveSession: boolean;
  isLoading:     boolean;
  saveAnswer:    (questionId: string, answerId: string) => void;
  setQuestion:   (index: number) => void;
  tickTimer:     () => void;
  clearSession:  () => Promise<void>;
  loadSession:   () => Promise<QuizSessionState | null>;
};

const LS_PREFIX = "b-isaf:quiz:session:";

function lsKey(contentId: string) {
  return `${LS_PREFIX}${contentId}`;
}

/* ================================================================
   HOOK
   ================================================================ */

export function useQuizSession(
  contentId: string,
  timeLimitSeconds?: number | null
): UseQuizSessionResult {
  const { supabase }  = useSupabase();
  const { profile }   = useUser();

  const [session,   setSession]   = useState<QuizSessionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* Ref para debounce do sync remoto */
  const syncTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef    = useRef<QuizSessionState | null>(null);

  /* ── Sync remoto (debounced 5s) ── */
  const syncRemote = useCallback(async (state: QuizSessionState) => {
    if (!profile) return;
    try {
      await supabase.from("quiz_sessions").upsert({
        student_id:             profile.id,
        content_id:             contentId,
        current_question_index: state.currentQuestionIndex,
        time_remaining_seconds: state.timeRemainingSeconds,
        answers:                state.answers,
        updated_at:             new Date().toISOString(),
      }, { onConflict: "student_id,content_id" });
    } catch (e) {
      console.warn("Quiz session sync failed:", e);
    }
  }, [supabase, profile, contentId]);

  const scheduleSyncRemote = useCallback((state: QuizSessionState) => {
    pendingRef.current = state;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (pendingRef.current) void syncRemote(pendingRef.current);
    }, 5000);
  }, [syncRemote]);

  /* ── Persistir estado ── */
  const persist = useCallback((next: QuizSessionState) => {
    setSession(next);
    // Local imediato
    try { localStorage.setItem(lsKey(contentId), JSON.stringify(next)); } catch { /* ignore */ }
    // Remoto debounced
    scheduleSyncRemote(next);
  }, [contentId, scheduleSyncRemote]);

  /* ── Carregar sessão ── */
  const loadSession = useCallback(async (): Promise<QuizSessionState | null> => {
    setIsLoading(true);
    try {
      // 1. Tentar do Supabase primeiro (mais recente)
      if (profile) {
        const { data } = await supabase
          .from("quiz_sessions")
          .select("*")
          .eq("student_id", profile.id)
          .eq("content_id", contentId)
          .maybeSingle();

        if (data) {
          const state: QuizSessionState = {
            contentId,
            currentQuestionIndex: data.current_question_index,
            timeRemainingSeconds: data.time_remaining_seconds,
            answers:              (data.answers as Record<string, string>) ?? {},
          };
          setSession(state);
          try { localStorage.setItem(lsKey(contentId), JSON.stringify(state)); } catch { /* ignore */ }
          return state;
        }
      }

      // 2. Fallback: localStorage
      try {
        const raw = localStorage.getItem(lsKey(contentId));
        if (raw) {
          const state = JSON.parse(raw) as QuizSessionState;
          setSession(state);
          return state;
        }
      } catch { /* ignore */ }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase, profile, contentId]);

  /* ── Limpar sessão ── */
  const clearSession = useCallback(async () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    setSession(null);
    try { localStorage.removeItem(lsKey(contentId)); } catch { /* ignore */ }
    if (profile) {
      try {
        await supabase.from("quiz_sessions")
          .delete()
          .eq("student_id", profile.id)
          .eq("content_id", contentId);
      } catch { /* ignore */ }
    }
  }, [supabase, profile, contentId]);

  /* ── API ── */
  const saveAnswer = useCallback((questionId: string, answerId: string) => {
    setSession((prev) => {
      const next: QuizSessionState = {
        contentId,
        currentQuestionIndex: prev?.currentQuestionIndex ?? 0,
        timeRemainingSeconds: prev?.timeRemainingSeconds ?? null,
        answers: { ...(prev?.answers ?? {}), [questionId]: answerId },
      };
      try { localStorage.setItem(lsKey(contentId), JSON.stringify(next)); } catch { /* ignore */ }
      scheduleSyncRemote(next);
      return next;
    });
  }, [contentId, scheduleSyncRemote]);

  const setQuestion = useCallback((index: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, currentQuestionIndex: index };
      try { localStorage.setItem(lsKey(contentId), JSON.stringify(next)); } catch { /* ignore */ }
      scheduleSyncRemote(next);
      return next;
    });
  }, [contentId, scheduleSyncRemote]);

  const tickTimer = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.timeRemainingSeconds === null) return prev;
      const next = { ...prev, timeRemainingSeconds: Math.max(0, prev.timeRemainingSeconds - 1) };
      // Sync local a cada tick; remoto pelo debounce já activo
      try { localStorage.setItem(lsKey(contentId), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [contentId]);

  /* ── Inicializar sessão nova (sem histórico) ── */
  useEffect(() => {
    // Só inicializa se não houver sessão carregada
    setSession((prev) => {
      if (prev) return prev;
      return {
        contentId,
        currentQuestionIndex: 0,
        timeRemainingSeconds: timeLimitSeconds ?? null,
        answers: {},
      };
    });
  }, [contentId, timeLimitSeconds]);

  /* Cleanup ao desmontar */
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      // Sync imediato ao desmontar
      if (pendingRef.current) void syncRemote(pendingRef.current);
    };
  }, [syncRemote]);

  return {
    session,
    hasActiveSession: (session?.currentQuestionIndex ?? 0) > 0 || Object.keys(session?.answers ?? {}).length > 0,
    isLoading,
    saveAnswer,
    setQuestion,
    tickTimer,
    clearSession,
    loadSession,
  };
}