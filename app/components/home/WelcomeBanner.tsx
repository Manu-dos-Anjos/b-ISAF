import { BookOpen, Headphones, ClipboardList } from "lucide-react";

type WelcomeBannerProps = {
  userName: string;
};

export default function WelcomeBanner({ userName }: WelcomeBannerProps) {
  return (
    <section className="rounded-[28px] bg-gradient-to-r from-blue-600 via-purple-600 to-fuchsia-500 px-4 md:px-8 py-6 shadow-lg overflow-hidden">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 min-h-[132px]">
        
        {/* Texto de boas-vindas */}
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white leading-tight">
            Bem-vindo de volta, {userName}!
          </h1>
        </div>

        {/* Cards com destaque de cor */}
        <div className="flex flex-wrap md:flex-nowrap gap-3 w-full lg:w-auto">
          
          {/* Card 1 - Conteúdo por disciplina (azul vibrante) */}
          <div className="flex-1 min-w-[140px] md:min-w-[170px] flex h-[84px] flex-col justify-between rounded-[22px] bg-violet-400/60 p-4 text-slate-900 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium leading-5">
                Conteúdo por disciplina
              </span>
              <BookOpen className="h-5 w-5 opacity-90" />
            </div>
          </div>

          {/* Card 2 - Resumos em áudio (roxo vibrante) */}
          <div className="flex-1 min-w-[140px] md:min-w-[170px] flex h-[84px] flex-col justify-between rounded-[22px] bg-violet-400/90 p-4 text-slate-900 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium leading-5">
                Resumos em áudio
              </span>
              <Headphones className="h-5 w-5 opacity-90" />
            </div>
          </div>

          {/* Card 3 - Testes e quizzes (mantido em amarelo para destaque principal) */}
          <div className="flex-1 min-w-[140px] md:min-w-[170px] flex h-[84px] flex-col justify-between rounded-[22px] bg-yellow-300 p-4 text-slate-900 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium leading-5">
                Testes e quizzes
              </span>
              <ClipboardList className="h-5 w-5 opacity-90" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}