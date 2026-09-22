// app/lib/hooks/useHomeHistory.ts
"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser } from "@/app/lib/context/UserContext";
import {
  fetchAudioHistory,
  fetchSlideHistory,
  fetchQuizHistory,
  type UserAudioHistory,
  type UserSlideHistory,
  type UserQuizHistory,
} from "@/app/lib/data/homeHistory";

export function useHomeHistory() {
  const { supabase } = useSupabase();
  const { profile, isLoading: userLoading } = useUser();

  const [audios,   setAudios]   = useState<UserAudioHistory[]>([]);
  const [slides,   setSlides]   = useState<UserSlideHistory[]>([]);
  const [quizzes,  setQuizzes]  = useState<UserQuizHistory[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // LOG 1 — estado do utilizador
    console.log("[useHomeHistory] userLoading:", userLoading, "| profile?.id:", profile?.id);

    if (userLoading) return;

    if (!profile?.id) {
      console.log("[useHomeHistory] sem profile.id — a limpar listas");
      setAudios([]);
      setSlides([]);
      setQuizzes([]);
      setLoading(false);
      return;
    }

    const studentId = profile.id;
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      try {
        console.log("[useHomeHistory] a buscar histórico para:", studentId);

        const [a, s, q] = await Promise.all([
          fetchAudioHistory(supabase, studentId),
          fetchSlideHistory(supabase, studentId),
          fetchQuizHistory(supabase, studentId),
        ]);

        // LOG 2 — resultados crus
        console.log("[useHomeHistory] audios:", a);
        console.log("[useHomeHistory] slides:", s);
        console.log("[useHomeHistory] quizzes:", q);

        if (!cancelled) {
          setAudios(a);
          setSlides(s);
          setQuizzes(q);
        }
      } catch (error) {
        console.error("[useHomeHistory] ERRO:", error);
        if (!cancelled) {
          setAudios([]);
          setSlides([]);
          setQuizzes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadHistory();

    const refresh = () => void loadHistory();
    window.addEventListener("focus", refresh);
    window.addEventListener("b-isaf:quiz-progress-updated", refresh);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("b-isaf:quiz-progress-updated", refresh);
    };
  }, [profile?.id, userLoading, supabase]);

  return { audios, slides, quizzes, loading };
}