"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser } from "@/app/lib/context/UserContext";

/* ================================================================
   TIPOS LOCAIS
   ================================================================ */

export type ContentRow = {
  id: string;
  type: "audio" | "slide" | "quiz";
  title: string;
  file_url: string | null;
  file_key: string | null;
  order_index: number;
  time_limit_seconds: number | null;
  duration_seconds: number | null;
  progress_percent: number;
  completed: boolean;
};

export type TopicRow = {
  id: string;
  title: string;
  order_index: number;
  contents: ContentRow[];
};

export type ChapterRow = {
  id: string;
  title: string;
  order_index: number;
  status: "Concluído" | "Não concluído";
  topics: TopicRow[];
  quiz: ContentRow | null;
};

export type DisciplineRow = {
  id: string;
  name: string;
  code: string | null;
  cover_image_url: string | null;
  intro_video_url: string | null;
  professor_name: string | null;
  year: number;
  semester: number;
  progress: number;
  annual: boolean;
  chapters: ChapterRow[];
};

/* ================================================================
   TIPOS RAW
   ================================================================ */

type DBTopicContent = {
  id: string;
  type: "audio" | "slide" | "quiz";
  title: string;
  file_url: string | null;
  file_key: string | null;
  order_index: number;
  time_limit_seconds: number | null;
  duration_seconds: number | null;
};

type DBChapterContent = DBTopicContent & {
  topic_id: string | null;
  chapter_id: string | null;
};

type DBTopic = {
  id: string;
  title: string;
  order_index: number;
  contents: DBTopicContent[];
};

type DBChapter = {
  id: string;
  title: string;
  order_index: number;
  status: string;
  topics: DBTopic[];
  contents: DBChapterContent[];
};

type DBDiscipline = {
  id: string;
  name: string;
  code: string | null;
  cover_image_url: string | null;
  intro_video_url: string | null;
  professor_name: string | null;
  chapters: DBChapter[];
};

type DBDisciplineCourse = {
  year: number;
  semester: number;
  professor_name: string | null;
  disciplines: DBDiscipline;
};

type ProgressMap = Map<string, { progress_percent: number; completed: boolean }>;

/* ================================================================
   HELPERS
   ================================================================ */

function toContentRow(
  c: DBTopicContent | DBChapterContent,
  progressMap: ProgressMap
): ContentRow {
  return {
    id: c.id,
    type: c.type,
    title: c.title,
    file_url: c.file_url,
    file_key: c.file_key,
    order_index: c.order_index,
    time_limit_seconds: c.time_limit_seconds,
    duration_seconds: c.duration_seconds,
    progress_percent: progressMap.get(c.id)?.progress_percent ?? 0,
    completed: progressMap.get(c.id)?.completed ?? false,
  };
}

function getChapterContentIds(ch: DBChapter) {
  const topicContentIds = ch.topics.flatMap((t) =>
    t.contents.map((c) => c.id)
  );

  const directQuizIds = (ch.contents ?? [])
    .filter((c) => c.type === "quiz" && c.topic_id === null)
    .map((c) => c.id);

  return {
    contentIds: [...topicContentIds, ...directQuizIds],
    quizIds: directQuizIds,
  };
}

function collectContentIdsFromChapters(chapters: DBChapter[]) {
  const contentIds = new Set<string>();
  const quizIds = new Set<string>();

  for (const ch of chapters) {
    const ids = getChapterContentIds(ch);
    for (const id of ids.contentIds) contentIds.add(id);
    for (const id of ids.quizIds) quizIds.add(id);
  }

  return {
    contentIds: [...contentIds],
    quizIds: [...quizIds],
  };
}

function getChapterAllContents(chapter: ChapterRow): ContentRow[] {
  return [
    ...chapter.topics.flatMap((t) => t.contents),
    ...(chapter.quiz ? [chapter.quiz] : []),
  ];
}

function buildChapters(raw: DBChapter[], progressMap: ProgressMap): ChapterRow[] {
  return [...raw]
    .sort((a, b) => a.order_index - b.order_index)
    .map((ch): ChapterRow => {
      const topics: TopicRow[] = [...ch.topics]
        .sort((a, b) => a.order_index - b.order_index)
        .map((t): TopicRow => ({
          id: t.id,
          title: t.title,
          order_index: t.order_index,
          contents: [...t.contents]
            .sort((a, b) => a.order_index - b.order_index)
            .map((c): ContentRow => toContentRow(c, progressMap)),
        }));

      const quizRaw =
        [...(ch.contents ?? [])]
          .filter((c) => c.type === "quiz" && c.topic_id === null)
          .sort((a, b) => a.order_index - b.order_index)[0] ?? null;

      const quiz: ContentRow | null = quizRaw
        ? toContentRow(quizRaw, progressMap)
        : null;

      const allContents = [...topics.flatMap((t) => t.contents), ...(quiz ? [quiz] : [])];
      const allDone = allContents.length > 0 && allContents.every((c) => c.completed);

      return {
        id: ch.id,
        title: ch.title,
        order_index: ch.order_index,
        status: allDone ? "Concluído" : "Não concluído",
        topics,
        quiz,
      };
    });
}

function calcProgress(chapters: ChapterRow[]): number {
  const all = chapters.flatMap(getChapterAllContents);
  const completed = all.filter((c) => c.completed).length;
  return all.length > 0 ? Math.round((completed / all.length) * 100) : 0;
}

async function fetchProgressMap(
  supabase: ReturnType<typeof import("@/app/lib/supabase/client").createClient>,
  studentId: string,
  contentIds: string[],
  quizIds: string[]
): Promise<ProgressMap> {
  const map: ProgressMap = new Map();

  // Progresso normal (áudio/slide e, por segurança, qualquer conteúdo já guardado em student_progress)
  if (contentIds.length > 0) {
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
        completed: row.completed,
      });
    }
  }

  // Quizzes: a submissão final em quiz_results conta como concluído
  if (quizIds.length > 0) {
    const { data } = await supabase
      .from("quiz_results")
      .select("content_id, score")
      .eq("student_id", studentId)
      .in("content_id", quizIds);

    const bestScoreByContent = new Map<string, number>();

    for (const row of (data ?? []) as Array<{
      content_id: string;
      score: number;
    }>) {
      const current = bestScoreByContent.get(row.content_id) ?? 0;
      const score = Number(row.score ?? 0);
      if (score > current) bestScoreByContent.set(row.content_id, score);
    }

    for (const [contentId, score] of bestScoreByContent.entries()) {
      map.set(contentId, {
        progress_percent: score,
        completed: score >= 50,
      });
    }
  }

  return map;
}

function toDisciplineRow(
  dc: DBDisciplineCourse,
  progressMap: ProgressMap,
  disciplineSemesterCount?: Map<string, number>
): DisciplineRow {
  const disc = dc.disciplines;
  const chapters = buildChapters(disc.chapters ?? [], progressMap);
  const semesterCount = disciplineSemesterCount?.get(disc.id) ?? 1;
  const annual = semesterCount > 1;

  return {
    id: disc.id,
    name: disc.name,
    code: disc.code,
    cover_image_url: disc.cover_image_url,
    intro_video_url: disc.intro_video_url,
    professor_name: dc.professor_name,
    year: dc.year,
    semester: dc.semester,
    progress: calcProgress(chapters),
    annual,
    chapters,
  };
}

/* ================================================================
   SELECT STRING
   ================================================================ */

const DISCIPLINE_SELECT = `
  year,
  semester,
  professor_name,
  disciplines (
    id, name, code, cover_image_url, intro_video_url,
    chapters (
      id, title, order_index, status,

      contents (
        id, type, title, file_url, file_key, order_index,
        time_limit_seconds, duration_seconds, topic_id, chapter_id
      ),

      topics (
        id, title, order_index,
        contents (
          id, type, title, file_url, file_key, order_index,
          time_limit_seconds, duration_seconds
        )
      )
    )
  )
` as const;

/* ================================================================
   useDisciplines
   ================================================================ */

export function useDisciplines() {
  const { supabase } = useSupabase();
  const { profile } = useUser();

  const [disciplines, setDisciplines] = useState<DisciplineRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisciplines = useCallback(async () => {
    const courseId = profile?.course_id;
const year = profile?.current_year;
const semester = profile?.current_semester;
const studentId = profile?.id;

if (
  !courseId ||
  year == null ||
  semester == null ||
  !studentId
) {
  setDisciplines([]);
  setIsLoading(false);
  return;
}

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbErr } = await supabase
        .from("discipline_courses")
        .select(DISCIPLINE_SELECT)
        .eq("course_id", courseId)
        .eq("year", year)
        .eq("semester", semester);

      if (dbErr) throw dbErr;

      const rows = (data ?? []) as unknown as DBDisciplineCourse[];

      if (rows.length === 0) {
        setDisciplines([]);
        return;
      }

      const allContentIds = new Set<string>();
      const allQuizIds = new Set<string>();

      for (const row of rows) {
        const ids = collectContentIdsFromChapters(row.disciplines.chapters ?? []);
        for (const id of ids.contentIds) allContentIds.add(id);
        for (const id of ids.quizIds) allQuizIds.add(id);
      }

      const progressMap = await fetchProgressMap(
  supabase,
  studentId,
  [...allContentIds],
  [...allQuizIds]
);

      const disciplineSemesterCount = new Map<string, number>();
      for (const row of rows) {
        const key = row.disciplines.id;
        disciplineSemesterCount.set(key, (disciplineSemesterCount.get(key) ?? 0) + 1);
      }

      const result = rows
        .map((dc) => toDisciplineRow(dc, progressMap, disciplineSemesterCount))
        .sort((a, b) => a.name.localeCompare(b.name));

      setDisciplines(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar disciplinas");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, profile]);

  useEffect(() => {
    void fetchDisciplines();
  }, [fetchDisciplines]);

  return { disciplines, isLoading, error, refetch: fetchDisciplines };
}

/* ================================================================
   useDiscipline
   ================================================================ */

export function useDiscipline(disciplineId: string) {
  const { supabase } = useSupabase();
  const { profile } = useUser();

  const [discipline, setDiscipline] = useState<DisciplineRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDiscipline(null);
    setIsLoading(true);
    setError(null);

    const courseId = profile?.course_id;
    const studentId = profile?.id;

    if (!disciplineId || !courseId || !studentId) {
      setIsLoading(false);
      return;
    }

    const resolvedStudentId = studentId;

    let cancelled = false;

    async function load() {
      try {
        const { data, error: dbErr } = await supabase
          .from("discipline_courses")
          .select(DISCIPLINE_SELECT)
          .eq("discipline_id", disciplineId)
          .eq("course_id", courseId)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (dbErr) throw dbErr;
        if (!data) {
          setDiscipline(null);
          return;
        }

        const dc = data as unknown as DBDisciplineCourse;
        const ids = collectContentIdsFromChapters(dc.disciplines.chapters ?? []);

        const progressMap = await fetchProgressMap(
          supabase,
          resolvedStudentId,
          ids.contentIds,
          ids.quizIds
        );

        if (cancelled) return;

        setDiscipline(
          toDisciplineRow(dc, progressMap, new Map([[dc.disciplines.id, 1]]))
        );
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Erro ao carregar disciplina"
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase, profile?.course_id, profile?.id, disciplineId]);

  return { discipline, isLoading, error };
}