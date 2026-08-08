"use client";

import { use, useMemo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useDiscipline } from "@/app/lib/hooks/useDisciplines";
import DisciplineClient from "./DisciplineClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: PageProps) {
  const { id } = use(params);
  const { discipline, isLoading, error } = useDiscipline(id);

  // Memoizado para que a referência só mude quando os dados do Supabase
  // mudarem — evita que useLocalStorageState receba um `initialValue`
  // novo a cada render e entre em loop.
  const adapted = useMemo(() => {
    if (!discipline) return null;

    return {
      id: discipline.id,
      title: discipline.name,
      professor: discipline.professor_name ?? "",
      progress: discipline.progress,
      lessonCount: discipline.chapters.reduce(
        (acc, chapter) =>
          acc + chapter.topics.reduce((sum, topic) => sum + topic.contents.length, 0),
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
        topics: ch.topics.map((t) => ({
          id: t.id,
          title: t.title,
          contents: t.contents.map((c) => ({
            id: c.id,
            type: c.type,
            title: c.title,
            url: c.file_url ?? undefined,
          })),
        })),
      })),
    };
  }, [discipline]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin text-indigo-600 dark:text-blue-500" />
        <p className="text-sm text-slate-600 dark:text-slate-400">A carregar disciplina…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <AlertCircle size={28} className="text-rose-500 dark:text-rose-400" />
        <p className="font-semibold text-slate-900 dark:text-slate-200">Erro ao carregar disciplina</p>
        <p className="max-w-xs text-sm text-slate-600 dark:text-slate-500">{error}</p>
      </div>
    );
  }

  if (!adapted) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <AlertCircle size={28} className="text-rose-500 dark:text-rose-400" />
        <p className="font-semibold text-slate-900 dark:text-slate-200">Disciplina não encontrada</p>
        <p className="max-w-xs text-sm text-slate-600 dark:text-slate-500">
          A disciplina que procuras não existe ou não está disponível.
        </p>
      </div>
    );
  }

  return <DisciplineClient discipline={adapted} />;
}