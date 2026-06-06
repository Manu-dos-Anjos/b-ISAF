"use client";

import Image from "next/image";
import { Trophy, Calendar, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

type QuizCardProps = {
  id: string | number;
  disciplina: string;
  tituloQuiz: string;
  acertos: number;
  totalPerguntas: number;
  dataConclusao?: string;
  thumbnail: string;
  onClick?: () => void;
};

function getScorePalette(pct: number) {
  if (pct >= 80)
    return {
      bar: "from-emerald-400 to-teal-400",
      label: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      icon: <CheckCircle2 size={14} className="text-emerald-500" />,
      status: "Excelente",
    };

  if (pct >= 50)
    return {
      bar: "from-amber-400 to-orange-400",
      label: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      icon: <CheckCircle2 size={14} className="text-amber-500" />,
      status: "Regular",
    };

  return {
    bar: "from-rose-400 to-pink-400",
    label: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    icon: <XCircle size={14} className="text-rose-500" />,
    status: "Precisa de revisão",
  };
}

function formatDate(dateString?: string) {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function QuizCard({
  disciplina,
  tituloQuiz,
  acertos,
  totalPerguntas,
  dataConclusao,
  thumbnail,
  onClick,
}: QuizCardProps) {
  const percentual =
    totalPerguntas > 0 ? Math.round((acertos / totalPerguntas) * 100) : 0;

  const palette = getScorePalette(percentual);
  const dataFormatada = formatDate(dataConclusao);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-[272px] flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20 dark:hover:shadow-none"
    >
      {/* Capa */}
      <div className="relative h-36 shrink-0 overflow-hidden bg-slate-100 dark:bg-white/5">
        <Image
          src={thumbnail}
          alt={tituloQuiz}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="272px"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        <div className="absolute right-3 top-3">
          <div className="flex items-center justify-center rounded-xl bg-black/40 px-3 py-1.5 shadow-lg ring-1 ring-white/20 backdrop-blur-md">
            <span className="text-xl font-extrabold leading-none tracking-tight text-white">
              {percentual}
              <span className="text-sm font-semibold text-white/70">%</span>
            </span>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-16">
          <span className="inline-block max-w-full truncate rounded-xl bg-black/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md">
            {disciplina}
          </span>
        </div>
      </div>

      {/* Corpo */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-800 dark:text-white">
          {tituloQuiz}
        </h3>

        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${palette.bg}`}>
            <Trophy size={13} className={palette.label} />
            <span className={`text-xs font-bold ${palette.label}`}>
              {acertos}
              <span className="font-normal opacity-60"> / {totalPerguntas}</span>
            </span>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              {palette.icon}
              <span className={`text-[11px] font-semibold ${palette.label}`}>
                {palette.status}
              </span>
            </div>

            {dataFormatada && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                <Calendar size={10} />
                <span>{dataFormatada}</span>
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-slate-100 dark:bg-white/5" />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Desempenho</p>
            <p className={`text-[10px] font-semibold ${palette.label}`}>{percentual}%</p>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${palette.bar} transition-all duration-500`}
              style={{ width: `${percentual}%` }}
            />
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>Histórico recente</span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
            Rever <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </button>
  );
}