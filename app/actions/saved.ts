// app/actions/saved.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

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
  chapterTitle: string;
  fileUrl: string | null;
  savedAt: string;
};

export async function getSavedItems(studentId: string): Promise<SavedItem[]> {
  const { data, error } = await supabase
    .from("saved_items")
    .select(`
      id, saved_at, content_id,
      contents!inner(
        id, title, type, file_url, chapter_id,
        chapters!inner(id, title, disciplines!inner(id, name))
      )
    `)
    .eq("student_id", studentId)
    .order("saved_at", { ascending: false });

  if (error || !data) return [];

  return data.map((item: any) => {
    const content = item.contents;
    const chapter = Array.isArray(content.chapters)
      ? content.chapters[0]
      : content.chapters;

    const discipline = chapter?.disciplines
      ? Array.isArray(chapter.disciplines)
        ? chapter.disciplines[0]
        : chapter.disciplines
      : null;

    return {
      savedId: item.id,
      contentId: content.id,
      title: content.title,
      type: content.type,
      disciplineId: discipline?.id || "",
      disciplineName: discipline?.name || "",
      chapterTitle: chapter?.title || "",
      fileUrl: content.file_url,
      savedAt: item.saved_at,
    };
  });
}

export async function saveItem(studentId: string, contentId: string) {
  // evita duplicados
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