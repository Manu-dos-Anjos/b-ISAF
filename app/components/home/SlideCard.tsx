"use client";

import Image from "next/image";
import { Clock, Eye } from "lucide-react";

type SlideCardProps = {
  id: string | number;
  disciplina: string;
  tituloSlide: string;
  slidesVistos: number;
  totalSlides?: number;
  ultimaVisualizacao?: string;
  thumbnail: string;
  progress?: number;
};

export default function SlideCard({
  disciplina,
  tituloSlide,
  slidesVistos,
  totalSlides,
  ultimaVisualizacao,
  thumbnail,
  progress,
}: SlideCardProps) {
  const percentual = totalSlides
    ? Math.round((slidesVistos / totalSlides) * 100)
    : progress || 0;

  return (
    <div className="group relative flex w-[280px] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md shadow-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-xl hover:shadow-slate-300/60 dark:border-white/10 dark:bg-slate-900 dark:shadow-none dark:hover:border-white/20 dark:hover:shadow-none">

      {/* Imagem */}
      <div className="relative h-40 overflow-hidden bg-slate-200 dark:bg-white/5">
        <Image
          src={thumbnail}
          alt={tituloSlide}
          fill
          sizes="(max-width: 640px) 100vw, 280px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

        {percentual > 0 && (
          <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur-md">
            {percentual}%
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          {disciplina}
        </p>

        <h3 className="mb-4 mt-1 min-h-[2.5rem] line-clamp-2 font-semibold leading-tight text-slate-900 dark:text-white">
          {tituloSlide}
        </h3>

        {/* Informações */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <Eye size={15} />
            <span className="font-medium">{slidesVistos} slides</span>
            {totalSlides && (
              <span className="text-slate-400 dark:text-slate-500">/ {totalSlides}</span>
            )}
          </div>

          {ultimaVisualizacao && (
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Clock size={13} />
              <span>{ultimaVisualizacao}</span>
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        {percentual > 0 ? (
          <div className="mt-auto space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-500">Progresso</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">{percentual}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
                style={{ width: `${percentual}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-auto">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <Eye size={12} />
              Não iniciado
            </span>
          </div>
        )}
      </div>
    </div>
  );
}