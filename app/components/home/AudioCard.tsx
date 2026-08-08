import Image from "next/image";
import { Play } from "lucide-react";

type AudioCardProps = {
  disciplina: string;
  tema: string;
  duracao: string;
  thumbnail?: string;
  progress?: number;
};

export default function AudioCard({
  disciplina,
  tema,
  duracao,
  thumbnail = "/thumbnails/default.jpg",
}: AudioCardProps) {
  return (
    <div className="group relative h-[110px] w-[200px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-slate-300 shadow-md shadow-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-xl hover:shadow-slate-300/60 dark:border-white/10 dark:shadow-none dark:hover:border-white/20 dark:hover:shadow-none">

      {/* Imagem */}
      <Image
        src={thumbnail}
        alt={tema}
        fill
        sizes="200px"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        priority={false}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

      {/* Informações */}
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <p className="text-xs font-medium text-white/80">{disciplina}</p>
        <p className="line-clamp-2 text-sm font-semibold leading-tight">{tema}</p>
      </div>

      {/* Duração */}
      <div className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white ring-1 ring-white/10">
        {duracao}
      </div>

      {/* Botão Play */}
      <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg transition-transform group-hover:scale-110">
        <Play className="ml-0.5 h-4 w-4 text-black" fill="black" />
      </div>
    </div>
  );
}