"use client";

import Image from "next/image";
import { Trophy, Calendar } from "lucide-react";

type QuizCardProps = {
  id: string | number;
  disciplina: string;
  tituloQuiz: string;
  pontuacao: number;
  totalPerguntas: number;
  dataConclusao?: string;
  thumbnail: string;
};

export default function QuizCard({
  id,
  disciplina,
  tituloQuiz,
  pontuacao,
  totalPerguntas,
  dataConclusao,
  thumbnail,
}: QuizCardProps) {
  const percentual = Math.round((pontuacao / totalPerguntas) * 100);

  return (
    <div className="group relative w-[280px] flex-shrink-0 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
      
      {/* Imagem */}
      <div className="relative h-40 overflow-hidden">
        <Image
          src={thumbnail}
          alt={tituloQuiz}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="absolute top-4 right-4 bg-emerald-600 text-white font-bold text-2xl w-14 h-14 flex items-center justify-center rounded-2xl shadow-lg ring-4 ring-white dark:ring-slate-900">
          {percentual}
          <span className="text-sm font-normal align-super">%</span>
        </div>
      </div>

      {/* Conteúdo com alinhamento fixo da barra */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs uppercase tracking-widest text-violet-600 dark:text-violet-400 font-medium">
          {disciplina}
        </p>

        <h3 className="font-semibold leading-tight line-clamp-2 min-h-[2.5rem] mt-1 mb-4 text-gray-900 dark:text-white">
          {tituloQuiz}
        </h3>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Trophy size={18} />
            <span className="font-semibold">
              {pontuacao} / {totalPerguntas}
            </span>
          </div>

          {dataConclusao && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Calendar size={14} />
              <span>{dataConclusao}</span>
            </div>
          )}
        </div>

        {/* Barra de progresso sempre alinhada no fundo */}
        <div className="mt-auto h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${percentual}%` }}
          />
        </div>
      </div>
    </div>
  );
}