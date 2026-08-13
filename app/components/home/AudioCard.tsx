// components/home/AudioCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Headphones, Play } from "lucide-react";

type AudioCardProps = {
  disciplina: string;
  tema: string;
  duracao: string;
  thumbnail?: string;
  progress?: number; // 0–100
  onClick?: () => void;
};

export default function AudioCard({
  disciplina,
  tema,
  duracao,
  thumbnail = "/thumbnails/default.jpg",
  progress = 0,
  onClick,
}: AudioCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const isInProgress = clampedProgress > 0 && clampedProgress < 100;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`Ouvir ${tema}, ${disciplina}, duração ${duracao}${
        isInProgress ? `, ${clampedProgress}% ouvido` : ""
      }`}
      className="group relative h-[110px] w-[200px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-slate-300 shadow-md shadow-slate-200 outline-none transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-xl hover:shadow-slate-300/60 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] dark:border-white/10 dark:shadow-none dark:hover:border-white/20 dark:hover:shadow-none dark:focus-visible:ring-offset-slate-950"
    >
      {/* Imagem ou fallback */}
      {!imgFailed ? (
        <Image
          src={thumbnail}
          alt=""
          fill
          sizes="200px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={false}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950">
          <Headphones size={28} className="text-white/20" />
        </div>
      )}

      {/* Véu de contraste — reforçado para garantir legibilidade
          mesmo sobre thumbnails claras (antes ficava quase transparente
          a meio da imagem, deixando o texto a "flutuar" sem fundo) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/70 to-transparent" />

      {/* Texto — com sombra própria como reforço extra de legibilidade,
          independente do véu por baixo */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pb-4 text-white">
        <p
          className="text-xs font-semibold text-white/95"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
        >
          {disciplina}
        </p>
        <p
          className="line-clamp-2 text-sm font-bold leading-tight text-white"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
        >
          {tema}
        </p>
      </div>

      {/* Duração */}
      <div className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white ring-1 ring-white/10">
        <Headphones size={10} />
        {duracao}
      </div>

      {/* Indicador "a meio" */}
      {isInProgress && (
        <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500 ring-1 ring-white/40" />
        </span>
      )}

      {/* Botão play */}
      <div className="absolute bottom-4 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg transition-transform group-hover:scale-110">
        <Play className="ml-0.5 h-4 w-4 text-black" fill="black" />
      </div>

      {/* Barra de progresso */}
      {clampedProgress > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}