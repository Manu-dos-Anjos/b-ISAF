// app/lib/hooks/useDisciplines.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser } from "@/app/lib/context/UserContext";
import type { Database } from "@/src/types/database";

/* ================================================================
   TIPOS LOCAIS
   ================================================================ */

export type ContentRow = {
  id:               string;
  type:             "audio" | "slide" | "quiz";
  title:            string;
  file_url:         string | null;
  file_key:         string | null;
  order_index:      number;
  progress_percent: number;
  completed:        boolean;
};

export type TopicRow = {
  id:          string;
  title:       string;
  order_index: number;
  contents:    ContentRow[];
};

export type ChapterRow = {
  id:          string;
  title:       string;
  order_index: number;
  status:      "Concluído" | "Não concluído";
  topics:      TopicRow[];
};

export type DisciplineRow = {
  id:              string;
  name:            string;
  code:            string | null;
  cover_image_url: string | null;
  intro_video_url: string | null;
  professor_name:  string | null;
  year:            number;
  semester:        number;
  progress:        number;
  chapters:        ChapterRow[];
};

/* ================================================================
   TIPOS RAW (inferidos do Database — sem any)
   ================================================================ */

type DBContent  = Database["public"]["Tables"]["contents"]["Row"];
type DBTopic    = Database["public"]["Tables"]["topics"]["Row"]    & { contents: DBContent[] };
type DBChapter  = Database["public"]["Tables"]["chapters"]["Row"]  & { topics: DBTopic[] };
type DBDiscipline = Database["public"]["Tables"]["disciplines"]["Row"] & {
  chapters: DBChapter[];
};

// Resultado da query a discipline_courses com join
type DBDisciplineCourse = {
  year:           number;
  semester:       number;
  professor_name: string | null;
  disciplines:    DBDiscipline;   // objecto singular (não array) por causa do FK
};

type ProgressMap = Map<string, { progress_percent: number; completed: boolean }>;

/* ================================================================
   HELPERS
   ================================================================ */

function buildChapters(raw: DBChapter[], progressMap: ProgressMap): ChapterRow[] {
  return [...raw]
    .sort((a, b) => a.order_index - b.order_index)
    .map((ch): ChapterRow => {
      const topics: TopicRow[] = [...ch.topics]
        .sort((a, b) => a.order_index - b.order_index)
        .map((t): TopicRow => ({
          id:          t.id,
          title:       t.title,
          order_index: t.order_index,
          contents: [...t.contents]
            .sort((a, b) => a.order_index - b.order_index)
            .map((c): ContentRow => ({
              id:               c.id,
              type:             c.type,
              title:            c.title,
              file_url:         c.file_url,
              file_key:         c.file_key,
              order_index:      c.order_index,
              progress_percent: progressMap.get(c.id)?.progress_percent ?? 0,
              completed:        progressMap.get(c.id)?.completed        ?? false,
            })),
        }));

      const allContents = topics.flatMap((t) => t.contents);
      const allDone     = allContents.length > 0 && allContents.every((c) => c.completed);

      return {
        id:          ch.id,
        title:       ch.title,
        order_index: ch.order_index,
        status:      allDone ? "Concluído" : "Não concluído",
        topics,
      };
    });
}

function calcProgress(chapters: ChapterRow[]): number {
  const all       = chapters.flatMap((ch) => ch.topics.flatMap((t) => t.contents));
  const completed = all.filter((c) => c.completed).length;
  return all.length > 0 ? Math.round((completed / all.length) * 100) : 0;
}

async function fetchProgressMap(
  supabase:   ReturnType<typeof import("@/app/lib/supabase/client").createClient>,
  studentId:  string,
  contentIds: string[]
): Promise<ProgressMap> {
  const map: ProgressMap = new Map();
  if (contentIds.length === 0) return map;

  const { data } = await supabase
    .from("student_progress")
    .select("content_id, progress_percent, completed")
    .eq("student_id", studentId)
    .in("content_id", contentIds);

    const rows = (data ?? []) as Array<{
      content_id: string;
      progress_percent: number;
      completed: boolean;
    }>;

    for (const row of rows) {
      map.set(row.content_id, {
        progress_percent: row.progress_percent,
        completed:        row.completed,
      });
    }
  return map;
}

function toDisciplineRow(dc: DBDisciplineCourse, progressMap: ProgressMap): DisciplineRow {
  const disc     = dc.disciplines;
  const chapters = buildChapters(disc.chapters, progressMap);

  return {
    id:              disc.id,
    name:            disc.name,
    code:            disc.code,
    cover_image_url: disc.cover_image_url,
    intro_video_url: disc.intro_video_url,
    professor_name:  dc.professor_name,
    year:            dc.year,
    semester:        dc.semester,
    progress:        calcProgress(chapters),
    chapters,
  };
}

/* ================================================================
   SELECT STRING (partilhado pelos dois hooks)
   ================================================================ */

const DISCIPLINE_SELECT = `
  year,
  semester,
  professor_name,
  disciplines (
    id, name, code, cover_image_url, intro_video_url,
    chapters (
      id, title, order_index, status,
      topics (
        id, title, order_index,
        contents (
          id, type, title, file_url, file_key, order_index
        )
      )
    )
  )
` as const;

/* ================================================================
   useDisciplines — lista do curso/ano/semestre do estudante
   ================================================================ */

export function useDisciplines() {
  const { supabase } = useSupabase();
  const { profile }  = useUser();

  const [disciplines, setDisciplines] = useState<DisciplineRow[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const fetchDisciplines = useCallback(async () => {
    if (!profile?.course_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbErr } = await supabase
        .from("discipline_courses")
        .select(DISCIPLINE_SELECT)
        .eq("course_id", profile.course_id)
        .eq("year",      profile.current_year)
        .eq("semester",  profile.current_semester);

      if (dbErr) throw dbErr;

      const rows = (data ?? []) as unknown as DBDisciplineCourse[];

      if (rows.length === 0) {
        setDisciplines([]);
        return;
      }

      // Recolher todos os content IDs
      const allContentIds = rows.flatMap((dc) =>
        dc.disciplines.chapters.flatMap((ch) =>
          ch.topics.flatMap((t) => t.contents.map((c) => c.id))
        )
      );

      const progressMap = await fetchProgressMap(supabase, profile.id, allContentIds);

      const result = rows
        .map((dc) => toDisciplineRow(dc, progressMap))
        .sort((a, b) => a.name.localeCompare(b.name));

      setDisciplines(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar disciplinas");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, profile]);

  useEffect(() => { void fetchDisciplines(); }, [fetchDisciplines]);

  return { disciplines, isLoading, error, refetch: fetchDisciplines };
}

/* ================================================================
   useDiscipline — disciplina individual por ID
   ================================================================ */

export function useDiscipline(disciplineId: string) {
  const { supabase } = useSupabase();
  const { profile }  = useUser();

  const [discipline, setDiscipline] = useState<DisciplineRow | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!disciplineId || !profile?.course_id) return;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: dbErr } = await supabase
          .from("discipline_courses")
          .select(DISCIPLINE_SELECT)
          .eq("discipline_id", disciplineId)
          .eq("course_id",     profile!.course_id!)
          .single();

        if (dbErr) throw dbErr;
        if (!data)  { setDiscipline(null); return; }

        const dc = data as unknown as DBDisciplineCourse;

        const allContentIds = dc.disciplines.chapters.flatMap((ch) =>
          ch.topics.flatMap((t) => t.contents.map((c) => c.id))
        );

        const progressMap = await fetchProgressMap(
          supabase,
          profile!.id,
          allContentIds
        );

        setDiscipline(toDisciplineRow(dc, progressMap));

      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar disciplina");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [supabase, profile, disciplineId]);

  return { discipline, isLoading, error };
}