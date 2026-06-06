// app/(app)/(dashboard)/avaliacoes/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

import type { Database, Profile } from "@/src/types/database";
import AvaliacoesClient from "./AvaliacoesClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Avaliações | B-ISAF",
};

type MinimalDiscipline = {
  id: string;
  name: string;
};

type QuizItem = {
  contentId: string;
  title: string;
  chapterTitle: string;
  disciplineId: string;
  disciplineName: string;
  timeLimitSecs: number | null;
  bestScore: number | null;
  attempts: number;
};

function getSupabaseServerClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Server Component: não precisamos gravar cookies aqui
        },
      },
    }
  );
}

export default async function AvaliacoesPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Server Component: read-only
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  /* ──────────────────────────────────────────────────────────────
     Perfil
  ────────────────────────────────────────────────────────────── */
const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", session.user.id)
  .maybeSingle();

if (profileError || !profileData) redirect("/login");

const profile = profileData as Profile;

  /* ──────────────────────────────────────────────────────────────
     Disciplinas do curso atual
  ────────────────────────────────────────────────────────────── */
  const { data: disciplines } = await supabase
    .from("disciplines")
    .select("id, name, code, year, semester, cover_image_url, professor_name")
    .eq("course_id", profile.course_id ?? "")
    .eq("year", profile.current_year)
    .eq("semester", profile.current_semester)
    .eq("is_active", true)
    .order("name");

  /* ──────────────────────────────────────────────────────────────
     Disciplinas extra
  ────────────────────────────────────────────────────────────── */
  const { data: extras } = await supabase
    .from("student_extra_disciplines")
    .select(`
      discipline_id,
      disciplines (
        id, name, code, year, semester, cover_image_url, professor_name
      )
    `)
    .eq("student_id", profile.id);

  const extraDiscs = (extras ?? [])
    .map((e: any) => e.disciplines)
    .filter(Boolean) as MinimalDiscipline[];

  const baseDiscs = (disciplines ?? []) as MinimalDiscipline[];

  const allDiscs: MinimalDiscipline[] = [
    ...baseDiscs,
    ...extraDiscs.filter((ed) => !baseDiscs.some((d) => d.id === ed.id)),
  ];

  const disciplineMap = new Map(allDiscs.map((d) => [d.id, d]));

  /* ──────────────────────────────────────────────────────────────
     Buscar quizzes por capítulos/temas
     - 1) quizzes ligados a topics.contents
     - 2) quizzes ligados diretamente a contents.chapter_id
  ────────────────────────────────────────────────────────────── */
  const disciplineIds = allDiscs.map((d) => d.id);

  const { data: chapters } = disciplineIds.length
    ? await supabase
        .from("chapters")
        .select(`
          id,
          title,
          discipline_id,
          topics (
            id,
            title,
            contents (
              id,
              title,
              type,
              time_limit_seconds,
              chapter_id,
              topic_id
            )
          )
        `)
        .in("discipline_id", disciplineIds)
        .eq("is_active", true)
        .order("order_index")
    : { data: [] as any[] };

  const quizItemsMap = new Map<string, QuizItem>();

  // 1) quizzes por topic.contents
  for (const chapter of chapters ?? []) {
    const discipline = disciplineMap.get(chapter.discipline_id);
    if (!discipline) continue;

    for (const topic of chapter.topics ?? []) {
      for (const content of topic.contents ?? []) {
        if (content.type !== "quiz") continue;

        quizItemsMap.set(content.id, {
          contentId: content.id,
          title: content.title,
          chapterTitle: chapter.title,
          disciplineId: chapter.discipline_id,
          disciplineName: discipline.name,
          timeLimitSecs: content.time_limit_seconds ?? null,
          bestScore: null,
          attempts: 0,
        });
      }
    }
  }

  // 2) quizzes ligados diretamente ao capítulo
  const chapterIds = (chapters ?? []).map((ch: any) => ch.id);

  const { data: chapterQuizzes } = chapterIds.length
    ? await supabase
        .from("contents")
        .select(`
          id,
          title,
          type,
          time_limit_seconds,
          chapter_id,
          chapters (
            id,
            title,
            discipline_id
          )
        `)
        .eq("type", "quiz")
        .eq("is_active", true)
        .in("chapter_id", chapterIds)
    : { data: [] as any[] };

  for (const content of chapterQuizzes ?? []) {
    const chapter = Array.isArray(content.chapters)
      ? content.chapters[0]
      : content.chapters;

    if (!chapter) continue;

    const discipline = disciplineMap.get(chapter.discipline_id);
    if (!discipline) continue;

    if (!quizItemsMap.has(content.id)) {
      quizItemsMap.set(content.id, {
        contentId: content.id,
        title: content.title,
        chapterTitle: chapter.title,
        disciplineId: chapter.discipline_id,
        disciplineName: discipline.name,
        timeLimitSecs: content.time_limit_seconds ?? null,
        bestScore: null,
        attempts: 0,
      });
    }
  }

  const quizItems = Array.from(quizItemsMap.values());

  /* ──────────────────────────────────────────────────────────────
     Histórico do aluno
  ────────────────────────────────────────────────────────────── */
  const contentIds = quizItems.map((q) => q.contentId);

  const { data: results } = contentIds.length
    ? await supabase
        .from("quiz_results")
        .select("content_id, score, attempted_at")
        .eq("student_id", profile.id)
        .in("content_id", contentIds)
        .order("attempted_at", { ascending: false })
    : { data: [] as any[] };

  const resultMap = new Map<string, { bestScore: number; attempts: number }>();

  for (const r of results ?? []) {
    const current = resultMap.get(r.content_id);

    const score = Math.round(Number(r.score ?? 0));

    if (!current) {
      resultMap.set(r.content_id, {
        bestScore: score,
        attempts: 1,
      });
    } else {
      resultMap.set(r.content_id, {
        bestScore: Math.max(current.bestScore, score),
        attempts: current.attempts + 1,
      });
    }
  }

  const quizItemsWithResults = quizItems.map((q) => ({
    ...q,
    bestScore: resultMap.get(q.contentId)?.bestScore ?? null,
    attempts: resultMap.get(q.contentId)?.attempts ?? 0,
  }));

  return (
    <AvaliacoesClient
      profile={profile as any}
      quizItems={quizItemsWithResults}
      disciplines={allDiscs as any}
    />
  );
}