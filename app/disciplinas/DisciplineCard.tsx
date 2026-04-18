import Link from "next/link";
import Image from "next/image";
import { Book } from "lucide-react";
import { iconMap, type Discipline } from "@/app/lib/mockData";

type Props = {
  discipline: Discipline;
};

export default function DisciplineCard({ discipline }: Props) {
  const Icon = iconMap[discipline.icon] ?? Book;

  return (
    <Link
      href={discipline.href}
      className="
        group relative overflow-hidden rounded-2xl
        border border-slate-200 bg-white shadow-sm
        transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
        dark:border-white/10 dark:bg-slate-900
      "
    >
      {/* Cover */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-white/5">
        {discipline.coverUrl ? (
          <Image
            src={discipline.coverUrl}
            alt={`Capa da disciplina ${discipline.title}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
        )}

        {/* Gradiente discreto para leitura do texto */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

        {/* Badge do ícone */}
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm backdrop-blur dark:bg-slate-950/60 dark:text-white">
          <Icon size={14} className="opacity-90" />
          <span className="line-clamp-1">Disciplina</span>
        </div>

        {/* Título */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="inline-block max-w-full rounded-xl bg-slate-950/35 px-3 py-2 backdrop-blur-sm">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white">
              {discipline.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Progresso */}
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {discipline.lessonCount} aulas
          </p>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {discipline.progress}%
          </span>
        </div>

        <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
            style={{ width: `${discipline.progress}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {discipline.progress}% concluído
        </p>
      </div>
    </Link>
  );
}