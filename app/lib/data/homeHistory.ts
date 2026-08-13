// app/lib/data/homeHistory.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type UserAudioHistory = {
  id: string;
  contentId: string;
  disciplinaId: string;
  disciplina: string;
  tema: string;
  duracao: string;
  progress: number;
  thumbnail: string | null;
  fileUrl: string | null;
};

export type UserSlideHistory = {
  id: string;
  contentId: string;
  disciplinaId: string;
  disciplina: string;
  tituloSlide: string;
  progress: number;
  ultimaVisualizacao: string;
  thumbnail: string | null;
};

export type UserQuizHistory = {
  id: string;
  contentId: string;
  disciplinaId: string;
  disciplina: string;
  tituloQuiz: string;
  pontuacao: number;
  totalPerguntas: number;
  dataConclusao: string;
  thumbnail: string | null;
};

function formatDuration(seconds?: number | null): string {
  if (seconds == null) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRelative(iso?: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffH = Math.round(diffMs / 36e5);
  if (diffH < 1) return "Agora mesmo";
  if (diffH < 24) return `Há ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d atrás`;
  return new Date(iso).toLocaleDateString("pt-PT");
}

export async function fetchAudioHistory(
  supabase: SupabaseClient,
  studentId: string,
  limit = 10
): Promise<UserAudioHistory[]> {
  // 1. Busca os content_ids de tipo audio com progresso
  const { data: progressRows, error: progressError } = await supabase
    .from("student_progress")
    .select("id, content_id, progress_percent, updated_at")
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false })
    .limit(50); // busca mais para depois filtrar por tipo

  if (progressError) throw progressError;
  if (!progressRows || progressRows.length === 0) return [];

  const contentIds = progressRows.map((r: any) => r.content_id);

  // 2. Busca os conteúdos com o join completo, filtrando por tipo
  const { data: contents, error: contentsError } = await supabase
    .from("contents")
    .select(`
      id,
      title,
      type,
      duration_seconds,
      file_url,
      is_active,
      topic:topics (
        chapter:chapters (
          discipline:disciplines (
            id, name, cover_image_url
          )
        )
      )
    `)
    .in("id", contentIds)
    .eq("type", "audio")
    .eq("is_active", true);

  if (contentsError) throw contentsError;
  if (!contents || contents.length === 0) return [];

  // 3. Combina os dados
  const progressMap = new Map(
    progressRows.map((r: any) => [r.content_id, r])
  );

  return contents
    .filter((c: any) => c.topic?.chapter?.discipline)
    .map((c: any) => {
      const progress = progressMap.get(c.id);
      const disciplina = c.topic.chapter.discipline;
      return {
        id: progress?.id ?? c.id,
        contentId: c.id,
        disciplinaId: disciplina.id,
        disciplina: disciplina.name,
        tema: c.title,
        duracao: formatDuration(c.duration_seconds),
        progress: progress?.progress_percent ?? 0,
        thumbnail: disciplina.cover_image_url ?? null,
        fileUrl: c.file_url ?? null,
      };
    })
    .sort((a, b) => {
      const pa = progressMap.get(a.contentId);
      const pb = progressMap.get(b.contentId);
      return new Date(pb?.updated_at ?? 0).getTime() -
             new Date(pa?.updated_at ?? 0).getTime();
    })
    .slice(0, limit);
}

export async function fetchSlideHistory(
  supabase: SupabaseClient,
  studentId: string,
  limit = 10
): Promise<UserSlideHistory[]> {
  // 1. Busca progresso
  const { data: progressRows, error: progressError } = await supabase
    .from("student_progress")
    .select("id, content_id, progress_percent, updated_at")
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (progressError) throw progressError;
  if (!progressRows || progressRows.length === 0) return [];

  const contentIds = progressRows.map((r: any) => r.content_id);

  // 2. Busca slides com join
  const { data: contents, error: contentsError } = await supabase
    .from("contents")
    .select(`
      id,
      title,
      type,
      is_active,
      topic:topics (
        chapter:chapters (
          discipline:disciplines (
            id, name, cover_image_url
          )
        )
      )
    `)
    .in("id", contentIds)
    .eq("type", "slide")
    .eq("is_active", true);

  if (contentsError) throw contentsError;
  if (!contents || contents.length === 0) return [];

  const progressMap = new Map(
    progressRows.map((r: any) => [r.content_id, r])
  );

  return contents
    .filter((c: any) => c.topic?.chapter?.discipline)
    .map((c: any) => {
      const progress = progressMap.get(c.id);
      const disciplina = c.topic.chapter.discipline;
      return {
        id: progress?.id ?? c.id,
        contentId: c.id,
        disciplinaId: disciplina.id,
        disciplina: disciplina.name,
        tituloSlide: c.title,
        progress: progress?.progress_percent ?? 0,
        ultimaVisualizacao: formatRelative(progress?.updated_at),
        thumbnail: disciplina.cover_image_url ?? null,
      };
    })
    .sort((a, b) => {
      const pa = progressMap.get(a.contentId);
      const pb = progressMap.get(b.contentId);
      return new Date(pb?.updated_at ?? 0).getTime() -
             new Date(pa?.updated_at ?? 0).getTime();
    })
    .slice(0, limit);
}

export async function fetchQuizHistory(
  supabase: SupabaseClient,
  studentId: string,
  limit = 10
): Promise<UserQuizHistory[]> {
  // 1. Busca resultados de quiz
  const { data: results, error: resultsError } = await supabase
    .from("quiz_results")
    .select("id, content_id, correct_answers, total_questions, attempted_at")
    .eq("student_id", studentId)
    .order("attempted_at", { ascending: false })
    .limit(limit);

  if (resultsError) throw resultsError;
  if (!results || results.length === 0) return [];

  const contentIds = [...new Set(results.map((r: any) => r.content_id))];

  // 2. Busca conteúdos (quiz liga a chapter diretamente, não a topic)
  const { data: contents, error: contentsError } = await supabase
    .from("contents")
    .select(`
      id,
      title,
      type,
      chapter:chapters (
        discipline:disciplines (
          id, name, cover_image_url
        )
      )
    `)
    .in("id", contentIds)
    .eq("type", "quiz");

  if (contentsError) throw contentsError;
  if (!contents || contents.length === 0) return [];

  const contentsMap = new Map(
    (contents as any[]).map((c) => [c.id, c])
  );

  return results
    .map((r: any) => {
      const content = contentsMap.get(r.content_id);
      if (!content?.chapter?.discipline) return null;
      const disciplina = content.chapter.discipline;
      return {
        id: r.id,
        contentId: r.content_id,
        disciplinaId: disciplina.id,
        disciplina: disciplina.name,
        tituloQuiz: content.title,
        pontuacao: r.correct_answers,
        totalPerguntas: r.total_questions,
        dataConclusao: formatRelative(r.attempted_at),
        thumbnail: disciplina.cover_image_url ?? null,
      };
    })
    .filter(Boolean) as UserQuizHistory[];
}