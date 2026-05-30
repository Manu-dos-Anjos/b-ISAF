// app/lib/hooks/useDisciplineStudyPlan.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase/client";

/* ================================================================
   TIPOS
================================================================ */

export type StudyPlanTopic = {
  id: string;
  title: string;
  order_index: number;
};

export type StudyPlanChapter = {
  id: string;
  title: string;
  order_index: number;
  status: string;
  topics: StudyPlanTopic[];
};

export type StudyPlanDiscipline = {
  id: string;
  code: string | null;
  name: string;
  cover_image_url: string | null;
  intro_video_url: string | null;
  chapters: StudyPlanChapter[];
};

/* ================================================================
   HOOK
================================================================ */

export function useDisciplineStudyPlan(
  disciplineCode?: string,
  enabled: boolean = true
) {
  const [studyPlan, setStudyPlan] = useState<StudyPlanDiscipline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!disciplineCode || !enabled) {
      setStudyPlan(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        /* ── disciplina ── */
        const { data: disciplineRow, error: disciplineError } = await supabase
          .from("disciplines")
          .select("id, code, name, cover_image_url, intro_video_url")
          .eq("code", disciplineCode)
          .eq("is_active", true)
          .maybeSingle();

        if (cancelled) return;

        if (disciplineError) {
          throw disciplineError;
        }

        if (!disciplineRow) {
          setStudyPlan(null);
          setError("Disciplina não encontrada no Supabase.");
          return;
        }

        /* ── capítulos ── */
        const { data: chaptersData, error: chaptersError } = await supabase
          .from("chapters")
          .select("id, title, order_index, status, is_active")
          .eq("discipline_id", disciplineRow.id)
          .eq("is_active", true)
          .order("order_index", { ascending: true });

        if (cancelled) return;

        if (chaptersError) {
          throw chaptersError;
        }

        const chapterIds = (chaptersData ?? []).map((chapter) => chapter.id);

        /* ── tópicos ── */
        let topicsData: {
          id: string;
          chapter_id: string;
          title: string;
          order_index: number;
          is_active: boolean;
        }[] = [];

        if (chapterIds.length > 0) {
          const { data: topicsRows, error: topicsError } = await supabase
            .from("topics")
            .select("id, chapter_id, title, order_index, is_active")
            .in("chapter_id", chapterIds)
            .eq("is_active", true)
            .order("order_index", { ascending: true });

          if (cancelled) return;

          if (topicsError) {
            throw topicsError;
          }

          topicsData = topicsRows ?? [];
        }

        /* ── mapear tópicos por capítulo ── */
        const topicsByChapter = new Map<string, StudyPlanTopic[]>();

        for (const topic of topicsData) {
          const list = topicsByChapter.get(topic.chapter_id) ?? [];
          list.push({
            id: topic.id,
            title: topic.title,
            order_index: topic.order_index,
          });
          topicsByChapter.set(topic.chapter_id, list);
        }

        /* ── montar estrutura final ── */
        const chapters = (chaptersData ?? []).map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          order_index: chapter.order_index,
          status: chapter.status,
          topics: topicsByChapter.get(chapter.id) ?? [],
        }));

        if (cancelled) return;

        setStudyPlan({
          id: disciplineRow.id,
          code: disciplineRow.code,
          name: disciplineRow.name,
          cover_image_url: disciplineRow.cover_image_url,
          intro_video_url: disciplineRow.intro_video_url,
          chapters,
        });
      } catch (err) {
        if (cancelled) return;
        setStudyPlan(null);
        setError(err instanceof Error ? err.message : "Erro inesperado ao carregar o plano.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [disciplineCode, enabled]);

  return { studyPlan, isLoading, error };
}