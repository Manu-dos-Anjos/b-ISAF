// app/actions/saved.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Database } from "@/src/types/database";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type SavedItem = {
  savedId: string;
  contentId: string;
  title: string;
  type: "audio" | "slide" | "quiz" | "interactive";
  disciplineId: string;
  disciplineName: string;
  disciplineCoverUrl: string | null;
  chapterTitle: string;
  topicTitle: string;
  fileUrl: string | null;
  durationSeconds: number | null;
  savedAt: string;
};

type SavedRow = {
  id: string;
  content_id: string;
  saved_at: string;
};

type ContentRow = {
  id: string;
  title: string;
  type: string;
  file_url: string | null;
  topic_id: string | null;
  chapter_id: string | null; // Adicionado
  duration_seconds: number | null;
};

type TopicRow = {
  id: string;
  title: string;
  chapter_id: string | null;
};

type ChapterRow = {
  id: string;
  title: string;
  discipline_id: string | null;
};

type DisciplineRow = {
  id: string;
  name: string;
  cover_image_url: string | null;
};

export async function getSavedItems(studentId: string): Promise<SavedItem[]> {
  // 1) Itens guardados do aluno
  const { data: savedRows, error: savedErr } = await supabase
    .from("saved_items")
    .select("id, content_id, saved_at")
    .eq("student_id", studentId)
    .order("saved_at", { ascending: false });

  if (savedErr) {
    console.error("[getSavedItems] erro ao buscar saved_items:", savedErr);
    return [];
  }

  const rows = (savedRows ?? []) as SavedRow[];
  if (rows.length === 0) return [];

  // 2) Conteúdos associados (inclui chapter_id)
  const contentIds = [...new Set(rows.map((r) => r.content_id))];

  const { data: contentRows, error: contentErr } = await supabase
    .from("contents")
    .select("id, title, type, file_url, topic_id, chapter_id, duration_seconds")
    .in("id", contentIds);

  if (contentErr) {
    console.error("[getSavedItems] erro ao buscar contents:", contentErr);
  }

  const contents = (contentRows ?? []) as ContentRow[];
  const contentsMap = new Map(contents.map((c) => [c.id, c]));

  // 3) Tópicos (apenas para áudio/slide, que têm topic_id)
  const topicIds = [
    ...new Set(
      contents
        .filter((c) => c.type !== "quiz" && c.topic_id)
        .map((c) => c.topic_id as string)
    ),
  ];

  let topics: TopicRow[] = [];
  if (topicIds.length > 0) {
    const { data: topicRows, error: topicErr } = await supabase
      .from("topics")
      .select("id, title, chapter_id")
      .in("id", topicIds);

    if (topicErr) {
      console.error("[getSavedItems] erro ao buscar topics:", topicErr);
    }
    topics = (topicRows ?? []) as TopicRow[];
  }
  const topicsMap = new Map(topics.map((t) => [t.id, t]));

  // 4) Capítulos — recolhe IDs de tópicos E de quizzes
  const chapterIds = [
    ...new Set([
      ...topics.map((t) => t.chapter_id).filter((id): id is string => !!id),
      ...contents
        .filter((c) => c.type === "quiz" && c.chapter_id)
        .map((c) => c.chapter_id as string),
    ]),
  ];

  let chapters: ChapterRow[] = [];
  if (chapterIds.length > 0) {
    const { data: chapterRows, error: chapterErr } = await supabase
      .from("chapters")
      .select("id, title, discipline_id")
      .in("id", chapterIds);

    if (chapterErr) {
      console.error("[getSavedItems] erro ao buscar chapters:", chapterErr);
    }
    chapters = (chapterRows ?? []) as ChapterRow[];
  }
  const chaptersMap = new Map(chapters.map((c) => [c.id, c]));

  // 5) Disciplinas
  const disciplineIds = [
    ...new Set(chapters.map((c) => c.discipline_id).filter((id): id is string => !!id)),
  ];

  let disciplinesRows: DisciplineRow[] = [];
  if (disciplineIds.length > 0) {
    const { data: discRows, error: discErr } = await supabase
      .from("disciplines")
      .select("id, name, cover_image_url")
      .in("id", disciplineIds);

    if (discErr) {
      console.error("[getSavedItems] erro ao buscar disciplines:", discErr);
    }
    disciplinesRows = (discRows ?? []) as DisciplineRow[];
  }
  const disciplinesMap = new Map(disciplinesRows.map((d) => [d.id, d]));

  // 6) Montagem final — percorre a cadeia correta para cada tipo
  return rows.map((row) => {
    const content = contentsMap.get(row.content_id);

    let topic: TopicRow | undefined;
    let chapter: ChapterRow | undefined;
    let discipline: DisciplineRow | undefined;

    if (content) {
      if (content.type === "quiz" && content.chapter_id) {
        // Quiz ligado directamente ao capítulo
        chapter = chaptersMap.get(content.chapter_id);
      } else if (content.topic_id) {
        // Áudio/slide ligado ao tópico
        topic = topicsMap.get(content.topic_id);
        if (topic?.chapter_id) {
          chapter = chaptersMap.get(topic.chapter_id);
        }
      }

      if (chapter?.discipline_id) {
        discipline = disciplinesMap.get(chapter.discipline_id);
      }
    }

    return {
      savedId: row.id,
      contentId: content?.id ?? row.content_id,
      title: content?.title ?? "(conteúdo removido)",
      type: (content?.type as SavedItem["type"]) ?? "audio",
      disciplineId: discipline?.id ?? "",
      disciplineName: discipline?.name ?? "Sem disciplina",
      disciplineCoverUrl: discipline?.cover_image_url ?? null,
      chapterTitle: chapter?.title ?? "Sem capítulo",
      topicTitle: topic?.title ?? "",
      fileUrl: content?.file_url ?? null,
      durationSeconds: content?.duration_seconds ?? null,
      savedAt: row.saved_at,
    };
  });
}

export async function saveItem(studentId: string, contentId: string) {
  const { data: existing, error: findError } = await supabase
    .from("saved_items")
    .select("id")
    .eq("student_id", studentId)
    .eq("content_id", contentId)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (existing?.id) {
    return { success: true, savedId: existing.id, alreadySaved: true };
  }

  const { data, error } = await supabase
    .from("saved_items")
    .insert({
      student_id: studentId,
      content_id: contentId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/guardados");

  return {
    success: true,
    savedId: data.id,
    alreadySaved: false,
  };
}

export async function removeSavedItem(savedId: string) {
  const { error } = await supabase.from("saved_items").delete().eq("id", savedId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/guardados");

  return { success: true };
}