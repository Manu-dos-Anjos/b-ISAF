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
    <div className="h-[110px] w-[200px] shrink-0 rounded-[12px] overflow-hidden relative group cursor-pointer">
      
      {/* Imagem que preenche todo o card */}
      <Image
        src={thumbnail}
        alt={tema}
        fill                // ← Esta é a chave!
        sizes="200px"       // ← Otimização importante
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        priority={false}
      />

      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />

      {/* Informações do áudio */}
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <p className="text-xs text-white/70">{disciplina}</p>
        <p className="text-sm font-medium line-clamp-2 leading-tight">{tema}</p>
      </div>

      {/* Duração */}
      <div className="absolute top-3 right-3 bg-black/70 text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
        {duracao}
      </div>

      {/* Botão Play */}
      <div className="absolute bottom-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
        <Play className="w-4 h-4 text-black ml-0.5" fill="black" />
      </div>
    </div>
  );
}