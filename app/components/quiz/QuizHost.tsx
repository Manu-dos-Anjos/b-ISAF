"use client";

import { useEffect, useState } from "react";
import QuizPlayer from "./QuizPlayer";
import QuizReview from "./QuizReview";
import QuizStats from "./QuizStats";
import QuizModalShell from "./QuizModalShell";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

type ViewMode = "review" | "player" | "stats";

type Props = {
  isOpen: boolean;
  contentId: string;
  title: string;
  disciplineName: string;
  chapterTitle: string;
  timeLimitSeconds?: number | null;
  onClose: () => void;
  initialView?: ViewMode;
};

export default function QuizHost({
  isOpen,
  contentId,
  title,
  disciplineName,
  chapterTitle,
  timeLimitSeconds,
  onClose,
  initialView,
}: Props) {
  const { supabase } = useSupabase();

  const [view, setView] = useState<ViewMode | null>(initialView ?? null);
  const [checking, setChecking] = useState(initialView == null);

  useEffect(() => {
    if (!isOpen || initialView != null) return;

    let cancelled = false;

    async function decideView() {
      setChecking(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setView("player");
          return;
        }

        const { data } = await supabase
          .from("quiz_results")
          .select("id")
          .eq("student_id", user.id)
          .eq("content_id", contentId)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        setView(data ? "review" : "player");
      } catch {
        if (!cancelled) setView("player");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    void decideView();

    return () => {
      cancelled = true;
    };
  }, [isOpen, initialView, supabase, contentId]);

  if (!isOpen) return null;

  const closeAndReset = () => {
    setView(initialView ?? null);
    onClose();
  };

  if (checking || view === null) {
    return (
      <QuizModalShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="rounded-2xl bg-slate-100 px-6 py-4 text-sm font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300">
            A preparar questionário…
          </div>
        </div>
      </QuizModalShell>
    );
  }

  if (view === "player") {
    return (
      <QuizPlayer
        contentId={contentId}
        title={title}
        disciplineName={disciplineName}
        chapterTitle={chapterTitle}
        timeLimitSeconds={timeLimitSeconds}
        onClose={closeAndReset}
      />
    );
  }

  if (view === "stats") {
    return (
      <QuizStats
        contentId={contentId}
        title={title}
        onBack={() => setView("review")}
        onClose={closeAndReset}
      />
    );
  }

  return (
    <QuizReview
      contentId={contentId}
      title={title}
      onClose={closeAndReset}
      onRepeat={() => setView("player")}
      onStats={() => setView("stats")}
    />
  );
}