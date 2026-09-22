// app/lib/data/homeHistory.ts

import type { SupabaseClient } from "@supabase/supabase-js";

/* =========================================================
   TIPOS
========================================================= */

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

  /**
   * Indica se o quiz ainda está em andamento.
   *
   * Atualmente é calculado com base nos dados disponíveis
   * em quiz_results.
   */
  emAndamento: boolean;
};

/* =========================================================
   HELPERS
========================================================= */

function formatDuration(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) {
    return "--:--";
  }

  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);

  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRelative(iso?: string | null): string {
  if (!iso) return "";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = Date.now() - date.getTime();
  const diffH = Math.round(diffMs / 36e5);

  if (diffH < 1) {
    return "Agora mesmo";
  }

  if (diffH < 24) {
    return `Há ${diffH}h`;
  }

  const diffD = Math.round(diffH / 24);

  if (diffD < 7) {
    return `${diffD}d atrás`;
  }

  return date.toLocaleDateString("pt-PT");
}

/* =========================================================
   ÁUDIOS
========================================================= */

export async function fetchAudioHistory(
  supabase: SupabaseClient,
  studentId: string,
  limit = 10
): Promise<UserAudioHistory[]> {
  /*
   * 1. Busca os progressos do estudante.
   *
   * Não filtramos type aqui porque student_progress
   * não possui o tipo do conteúdo.
   */
  const { data: progressRows, error: progressError } = await supabase
    .from("student_progress")
    .select(`
      id,
      content_id,
      progress_percent,
      updated_at
    `)
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (progressError) {
    throw progressError;
  }

  if (!progressRows || progressRows.length === 0) {
    return [];
  }

  const contentIds = progressRows.map(
    (row: { content_id: string }) => row.content_id
  );

  /*
   * 2. Busca somente conteúdos do tipo audio.
   */
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
            id,
            name,
            cover_image_url
          )
        )
      )
    `)
    .in("id", contentIds)
    .eq("type", "audio")
    .eq("is_active", true);

  if (contentsError) {
    throw contentsError;
  }

  if (!contents || contents.length === 0) {
    return [];
  }

  /*
   * 3. Cria mapa content_id -> progresso.
   */
  const progressMap = new Map(
    progressRows.map((row: any) => [
      row.content_id,
      row,
    ])
  );

  /*
   * 4. Junta conteúdo + progresso.
   */
  return contents
    .filter(
      (content: any) =>
        content.topic?.chapter?.discipline
    )
    .map((content: any) => {
      const progress = progressMap.get(content.id);
      const disciplina = content.topic.chapter.discipline;

      return {
        id: progress?.id ?? content.id,

        contentId: content.id,

        disciplinaId: disciplina.id,

        disciplina: disciplina.name,

        tema: content.title,

        duracao: formatDuration(
          content.duration_seconds
        ),

        progress:
          progress?.progress_percent ?? 0,

        thumbnail:
          disciplina.cover_image_url ?? null,

        fileUrl:
          content.file_url ?? null,
      };
    })
    .sort((a, b) => {
      const progressA = progressMap.get(
        a.contentId
      );

      const progressB = progressMap.get(
        b.contentId
      );

      return (
        new Date(
          progressB?.updated_at ?? 0
        ).getTime() -
        new Date(
          progressA?.updated_at ?? 0
        ).getTime()
      );
    })
    .slice(0, limit);
}

/* =========================================================
   SLIDES
========================================================= */

export async function fetchSlideHistory(
  supabase: SupabaseClient,
  studentId: string,
  limit = 10
): Promise<UserSlideHistory[]> {
  /*
   * 1. Busca os progressos.
   */
  const { data: progressRows, error: progressError } =
    await supabase
      .from("student_progress")
      .select(`
        id,
        content_id,
        progress_percent,
        updated_at
      `)
      .eq("student_id", studentId)
      .order("updated_at", { ascending: false })
      .limit(50);

  if (progressError) {
    throw progressError;
  }

  if (!progressRows || progressRows.length === 0) {
    return [];
  }

  const contentIds = progressRows.map(
    (row: { content_id: string }) => row.content_id
  );

  /*
   * 2. Busca somente slides.
   */
  const { data: contents, error: contentsError } =
    await supabase
      .from("contents")
      .select(`
        id,
        title,
        type,
        is_active,
        topic:topics (
          chapter:chapters (
            discipline:disciplines (
              id,
              name,
              cover_image_url
            )
          )
        )
      `)
      .in("id", contentIds)
      .eq("type", "slide")
      .eq("is_active", true);

  if (contentsError) {
    throw contentsError;
  }

  if (!contents || contents.length === 0) {
    return [];
  }

  /*
   * 3. Mapa dos progressos.
   */
  const progressMap = new Map(
    progressRows.map((row: any) => [
      row.content_id,
      row,
    ])
  );

  /*
   * 4. Combina conteúdo + progresso.
   */
  return contents
    .filter(
      (content: any) =>
        content.topic?.chapter?.discipline
    )
    .map((content: any) => {
      const progress = progressMap.get(content.id);
      const disciplina = content.topic.chapter.discipline;

      return {
        id: progress?.id ?? content.id,

        contentId: content.id,

        disciplinaId: disciplina.id,

        disciplina: disciplina.name,

        tituloSlide: content.title,

        progress:
          progress?.progress_percent ?? 0,

        ultimaVisualizacao:
          formatRelative(
            progress?.updated_at
          ),

        thumbnail:
          disciplina.cover_image_url ?? null,
      };
    })
    .sort((a, b) => {
      const progressA = progressMap.get(
        a.contentId
      );

      const progressB = progressMap.get(
        b.contentId
      );

      return (
        new Date(
          progressB?.updated_at ?? 0
        ).getTime() -
        new Date(
          progressA?.updated_at ?? 0
        ).getTime()
      );
    })
    .slice(0, limit);
}

/* =========================================================
   QUIZZES
========================================================= */

export async function fetchQuizHistory(
  supabase: SupabaseClient,
  studentId: string,
  limit = 10
): Promise<UserQuizHistory[]> {
  /* Resultados concluídos e progresso parcial vivem em tabelas diferentes. */
  const { data: results, error: resultsError } =
    await supabase
      .from("quiz_results")
      .select(`
        id,
        content_id,
        correct_answers,
        total_questions,
        attempted_at
      `)
      .eq("student_id", studentId)
      .order("attempted_at", {
        ascending: false,
      })
      .limit(Math.max(limit * 3, 30));

  if (resultsError) {
    throw resultsError;
  }

  const { data: progressRows, error: progressError } = await supabase
    .from("student_progress")
    .select("content_id, progress_percent, updated_at, completed")
    .eq("student_id", studentId)
    .eq("completed", false)
    .order("updated_at", { ascending: false })
    .limit(Math.max(limit * 3, 30));

  if (progressError) {
    throw progressError;
  }

  type QuizResultRow = {
    content_id: string;
  };

  const quizResults = (results ?? []) as QuizResultRow[];

  /*
   * Mantém apenas a tentativa mais recente de cada quiz.
   * A consulta vem ordenada por attempted_at descendente.
   */
  const latestResults = quizResults.filter((result, index) =>
    quizResults.findIndex((candidate) => candidate.content_id === result.content_id) === index
  );

  const contentIds = [
    ...new Set([
      ...latestResults.map((result: any) => result.content_id),
      ...(progressRows ?? []).map((row: any) => row.content_id),
    ]),
  ];

  if (contentIds.length === 0) return [];

  /*
   * 2. Busca os conteúdos dos quizzes.
   *
   * Aqui o quiz liga diretamente ao chapter.
   */
  const {
    data: contents,
    error: contentsError,
  } = await supabase
    .from("contents")
    .select(`
      id,
      title,
      type,
      chapter:chapters (
        discipline:disciplines (
          id,
          name,
          cover_image_url
        )
      )
    `)
    .in("id", contentIds)
    .eq("type", "quiz");

  if (contentsError) {
    throw contentsError;
  }

  if (!contents || contents.length === 0) {
    return [];
  }

  /*
   * 3. Mapa dos conteúdos.
   */
  const contentsMap = new Map(
    (contents as any[]).map(
      (content) => [
        content.id,
        content,
      ]
    )
  );

  const resultsMap = new Map(
    latestResults.map((result: any) => [result.content_id, result])
  );
  const progressMap = new Map(
    (progressRows ?? []).map((row: any) => [row.content_id, row])
  );

  /* Combina cada quiz com o resultado final ou com o progresso parcial. */
  return contentIds
    .map((contentId) => {
      const result = resultsMap.get(contentId);
      const progress = progressMap.get(contentId);
      const content = contentsMap.get(contentId);

      if (
        !content?.chapter?.discipline
      ) {
        return null;
      }

      const disciplina =
        content.chapter.discipline;

      const emAndamento = !result;
      const totalQuestions = Math.max(1, Number(result?.total_questions ?? 0));
      const progressPercent = Math.max(
        0,
        Math.min(100, Number(progress?.progress_percent ?? 0))
      );
      const correctAnswers = Number(result?.correct_answers ?? 0);

      return {
        id: result?.id ?? `progress-${contentId}`,

        contentId: result.content_id,

        disciplinaId: disciplina.id,

        disciplina: disciplina.name,

        tituloQuiz: content.title,

        pontuacao: emAndamento ? progressPercent : correctAnswers,

        totalPerguntas: totalQuestions,

        dataConclusao:
          formatRelative(result?.attempted_at ?? progress?.updated_at),

        thumbnail:
          disciplina.cover_image_url ?? null,

        emAndamento,
      };
    })
    .filter(
      (
        item
      ): item is UserQuizHistory =>
        item !== null
      )
      .sort((a, b) => {
        const aDate = resultsMap.get(a.contentId)?.attempted_at ?? progressMap.get(a.contentId)?.updated_at;
        const bDate = resultsMap.get(b.contentId)?.attempted_at ?? progressMap.get(b.contentId)?.updated_at;
        return new Date(bDate ?? 0).getTime() - new Date(aDate ?? 0).getTime();
      })
      .slice(0, limit);
}