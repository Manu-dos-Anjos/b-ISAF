"use client";

import { use, useMemo } from "react";
import { Loader2, AlertCircle, BookOpen } from "lucide-react";
import { useDiscipline } from "@/app/lib/hooks/useDisciplines";
import DisciplineClient from "./DisciplineClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: PageProps) {
  const { id } = use(params);
  const { discipline, isLoading, error } = useDiscipline(id);

  const adapted = useMemo(() => {
    if (!discipline) return null;

    return {
      id: discipline.id,
      title: discipline.name,
      professor: "",
      progress: discipline.progress,
      lessonCount: discipline.chapters.reduce(
        (acc, chapter) =>
          acc +
          chapter.topics.reduce(
            (sum, topic) => sum + topic.contents.length,
            0
          ) +
          (chapter.quiz ? 1 : 0),
        0
      ),
      icon: "book" as const,
      coverUrl: discipline.cover_image_url ?? "",
      href: `/disciplinas/${discipline.id}`,
      introVideoUrl: discipline.intro_video_url ?? undefined,
      year: `${discipline.year}º Ano`,
      semester: `${discipline.semester}º Semestre`,
      course: "",
      chapters: discipline.chapters.map((ch) => ({
        id: ch.id,
        title: ch.title,
        status: ch.status,
        quiz: ch.quiz
          ? {
              id: ch.quiz.id,
              type: ch.quiz.type,
              title: ch.quiz.title,
              url: ch.quiz.file_url ?? undefined,
              timeLimitSeconds: ch.quiz.time_limit_seconds,
              durationSeconds: ch.quiz.duration_seconds,
            }
          : null,
        topics: ch.topics.map((t) => ({
          id: t.id,
          title: t.title,
          contents: t.contents.map((c) => ({
            id: c.id,
            type: c.type,
            title: c.title,
            url: c.file_url ?? undefined,
            timeLimitSeconds: c.time_limit_seconds,
            durationSeconds: c.duration_seconds,
          })),
        })),
      })),
    };
  }, [discipline]);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 md:gap-2.5">
        <div className="relative">
          <Loader2
            size={32}
            className="animate-spin text-indigo-600 dark:text-blue-500 md:h-7 md:w-7"
          />
          <div className="absolute inset-0 animate-ping rounded-full bg-indigo-400/30 blur-xl" />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 md:text-xs">
          A carregar disciplina…
        </p>
      </div>
    );
  }

  /* ── Erro ── */
  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 md:gap-2.5 text-center">
        <div className="flex h-16 w-16 md:h-14 md:w-14 items-center justify-center rounded-2xl md:rounded-xl bg-rose-50 dark:bg-rose-500/10">
          <AlertCircle
            size={28}
            className="text-rose-500 dark:text-rose-400 md:h-6 md:w-6"
          />
        </div>
        <p className="text-base md:text-sm font-semibold text-slate-900 dark:text-slate-200">
          Erro ao carregar disciplina
        </p>
        <p className="max-w-xs text-sm md:text-xs text-slate-600 dark:text-slate-500">
          {error}
        </p>
      </div>
    );
  }

  /* ── Não encontrada ── */
  if (!adapted) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 md:gap-2.5 text-center">
        <div className="flex h-16 w-16 md:h-14 md:w-14 items-center justify-center rounded-2xl md:rounded-xl bg-slate-100 dark:bg-white/5">
          <BookOpen
            size={28}
            className="text-slate-400 dark:text-slate-600 md:h-6 md:w-6"
          />
        </div>
        <p className="text-base md:text-sm font-semibold text-slate-900 dark:text-slate-200">
          Disciplina não encontrada
        </p>
        <p className="max-w-xs text-sm md:text-xs text-slate-600 dark:text-slate-500">
          A disciplina que procuras não existe ou não está disponível.
        </p>
      </div>
    );
  }

  return <DisciplineClient discipline={adapted} />;
}