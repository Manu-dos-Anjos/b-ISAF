// app/lib/hooks/useDisciplineStudyPlan.ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

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

export type StudyPlanResult = {
  disciplineId: string;   // UUID real da disciplina
  disciplineCode: string; // ex: "FSI"
  chapters: StudyPlanChapter[];
};

type Params = {
  courseUUID: string;   // UUID do curso
  year: number;
  semester: number;
  disciplineCode: string; // código da disciplina ex: "CPE", "FSI"
  enabled?: boolean;
};

/* ================================================================
   HOOK
================================================================ */

export function useDisciplineStudyPlan({
  courseUUID,
  year,
  semester,
  disciplineCode,
  enabled = true,
}: Params) {
  const [result,    setResult]    = useState<StudyPlanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!courseUUID || !disciplineCode || !enabled) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        /* ── 1. encontrar o discipline_id via discipline_courses ── */
        const { data: dcRows, error: dcError } = await supabase
          .from("discipline_courses")
          .select(`
            discipline_id,
            disciplines (
              id,
              code,
              name,
              is_active
            )
          `)
          .eq("course_id", courseUUID)
          .eq("year",      year)
          .eq("semester",  semester);

        if (cancelled) return;
        if (dcError) throw dcError;

        /* ── encontrar a disciplina pelo code ── */
        const match = (dcRows ?? []).find((row) => {
          const disc = row.disciplines as {
            id: string;
            code: string;
            name: string;
            is_active: boolean;
          } | null;
          return disc?.code === disciplineCode && disc?.is_active === true;
        });

        if (!match) {
          setResult(null);
          setError(null); // sem erro — disciplina simplesmente não tem conteúdo ainda
          return;
        }

        const disciplineId = match.discipline_id;
        const disc = match.disciplines as {
          id: string;
          code: string;
          name: string;
          is_active: boolean;
        };

        /* ── 2. buscar capítulos ── */
        const { data: chaptersData, error: chaptersError } = await supabase
          .from("chapters")
          .select("id, title, order_index, status, is_active")
          .eq("discipline_id", disciplineId)
          .eq("is_active", true)
          .order("order_index", { ascending: true });

        if (cancelled) return;
        if (chaptersError) throw chaptersError;

        const chapterIds = (chaptersData ?? []).map((ch) => ch.id);

        /* ── 3. buscar tópicos ── */
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
          if (topicsError) throw topicsError;

          topicsData = topicsRows ?? [];
        }

        /* ── 4. mapear tópicos por capítulo ── */
        const topicsByChapter = new Map<string, StudyPlanTopic[]>();

        for (const topic of topicsData) {
          const list = topicsByChapter.get(topic.chapter_id) ?? [];
          list.push({
            id:          topic.id,
            title:       topic.title,
            order_index: topic.order_index,
          });
          topicsByChapter.set(topic.chapter_id, list);
        }

        /* ── 5. estrutura final ── */
        const chapters: StudyPlanChapter[] = (chaptersData ?? []).map((ch) => ({
          id:          ch.id,
          title:       ch.title,
          order_index: ch.order_index,
          status:      ch.status,
          topics:      topicsByChapter.get(ch.id) ?? [],
        }));

        if (cancelled) return;

        setResult({
          disciplineId:   disc.id,
          disciplineCode: disc.code,
          chapters,
        });
      } catch (err) {
        if (cancelled) return;
        setResult(null);
        setError(
          err instanceof Error
            ? err.message
            : "Erro inesperado ao carregar o plano de estudo."
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => { cancelled = true; };
  }, [courseUUID, year, semester, disciplineCode, enabled]);

  return { result, isLoading, error };
}