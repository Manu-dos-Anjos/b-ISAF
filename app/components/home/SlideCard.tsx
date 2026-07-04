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
  id,
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
    <div className="group relative w-[280px] flex-shrink-0 overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
      
      {/* Imagem */}
      <div className="relative h-40 overflow-hidden">
        <Image
          src={thumbnail}
          alt={tituloSlide}
          fill
          sizes="(max-width: 640px) 100vw, 280px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

        {percentual > 0 && (
          <div className="absolute top-3 right-3 bg-black/70 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md">
            {percentual}%
          </div>
        )}
      </div>

      {/* Conteúdo - com flex-1 e estrutura fixa para alinhar a barra */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-medium">
          {disciplina}
        </p>

        {/* Título com altura fixa */}
        <h3 className="font-semibold leading-tight line-clamp-2 min-h-[2.5rem] mt-1 mb-4 text-gray-900 dark:text-white">
          {tituloSlide}
        </h3>

        {/* Informações */}
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <Eye size={16} />
            <span>{slidesVistos} slides</span>
            {totalSlides && <span className="text-gray-400">/ {totalSlides}</span>}
          </div>

          {ultimaVisualizacao && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock size={14} />
              <span>{ultimaVisualizacao}</span>
            </div>
          )}
        </div>

        {/* Barra de progresso - sempre no fundo */}
        {percentual > 0 && (
          <div className="mt-auto h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${percentual}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}