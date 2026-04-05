"use client";

import { BookOpen, Headphones, ClipboardList } from "lucide-react";

type WelcomeBannerProps = {
  userName: string;
};

export default function WelcomeBanner({ userName }: WelcomeBannerProps) {
  return (
    <section className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 overflow-hidden">
      <div className="relative px-6 md:px-10 py-9 md:py-12">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          
          {/* Texto de boas-vindas */}
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter text-white">
              Bem-vindo, <span className="text-blue-400">{userName}</span>!
            </h1>
            <p className="mt-3 text-lg text-slate-400">
              Continua o teu progresso!
            </p>
          </div>

          {/* Três Cards de Ação */}
          <div className="flex flex-wrap md:flex-nowrap gap-4 w-full lg:w-auto">
            
            {/* Card 1 - Conteúdo por disciplina */}
            <div className="group flex-1 min-w-[155px] bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 transition-all rounded-2xl p-5 h-[108px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <BookOpen className="h-6 w-6 text-blue-400" />
              </div>
              <p className="text-sm font-medium text-white leading-tight">
                Conteúdo por<br />disciplina
              </p>
            </div>

            {/* Card 2 - Resumos em áudio */}
            <div className="group flex-1 min-w-[155px] bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 transition-all rounded-2xl p-5 h-[108px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Headphones className="h-6 w-6 text-purple-400" />
              </div>
              <p className="text-sm font-medium text-white leading-tight">
                Resumos em<br />áudio
              </p>
            </div>

            {/* Card 3 - Testes e quizzes (tons mais leves) */}
            <div className="group flex-1 min-w-[155px] bg-gradient-to-br from-amber-300 via-yellow-300 to-amber-400 
            hover:from-amber-400 hover:via-yellow-400 hover:to-amber-500 
            transition-all rounded-2xl p-5 h-[108px] flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between">
              <ClipboardList className="h-6 w-6 text-amber-950" />
              </div>
              <p className="text-sm font-semibold text-amber-950 leading-tight">
              Testes e<br />questionários
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}