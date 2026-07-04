"use client";

import Link from "next/link";
import {
  BookOpen,
  Headphones,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

type WelcomeBannerProps = {
  userName: string;
};

/* =========================================================
   Ações rápidas
   Ordem:
   1) Resumos em áudio  -> azul
   2) Conteúdo por disciplina -> verde
   3) Questionário -> âmbar
   ========================================================= */
const quickActions = [
  {
    title: "Resumos em áudio",
    icon: Headphones,
    href: "/disciplinas?filter=audio",

    // MOBILE: azul escuro suave
    mobileClass: "bg-blue-700/10 text-blue-200 hover:bg-blue-700/20",

    // DESKTOP: card com fundo azul escuro e borda azul discreta
    desktopClass:
      "bg-blue-950/80 hover:bg-blue-900/80 border border-blue-700/30 hover:border-blue-500/40 shadow-sm shadow-blue-950/20",

    // Ícone
    iconClass: "text-blue-300",

    // Texto
    textClass: "text-blue-100 font-medium",

    // Seta
    arrowClass: "text-blue-300",
  },
  {
    title: "Conteúdos por disciplina",
    icon: BookOpen,
    href: "/disciplinas",

    // MOBILE: azul escuro suave
    mobileClass: "bg-blue-700/10 text-blue-200 hover:bg-blue-700/20",

    // DESKTOP: card com fundo verde escuro e borda verde discreta
    desktopClass:
      "bg-blue-950/80 hover:bg-blue-900/80 border border-blue-700/30 hover:border-blue-500/40 shadow-sm shadow-blue-950/20",

    // Ícone
    iconClass: "text-blue-300",

    // Texto
    textClass: "text-blue-100 font-medium",

    // Seta
    arrowClass: "text-blue-300",
  },
  {
    title: "Questionários",
    icon: ClipboardList,
    href: "/disciplinas?filter=quiz",

    // MOBILE: azul escuro suave
    mobileClass: "bg-blue-700/10 text-blue-200 hover:bg-blue-700/20",

    // DESKTOP: card com fundo âmbar escuro, mais clean que castanho
    desktopClass:
      "bg-blue-950/80 hover:bg-blue-900/80 border border-blue-700/30 hover:border-blue-500/40 shadow-sm shadow-blue-950/20",

    // Ícone
    iconClass: "text-blue-300",

    // Texto
    textClass: "text-blue-100 font-medium",

    // Seta
    arrowClass: "text-blue-300",
  },
];

export default function WelcomeBanner({ userName }: WelcomeBannerProps) {
  return (
    <section>
      {/* =====================================================
          MOBILE
          ===================================================== */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900 p-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          {/* Texto de boas-vindas */}
          <div>
            <h1 className="text-lg font-semibold text-white">
              Olá, <span className="text-blue-400">{userName}!</span>
            </h1>
            <p className="text-xs text-slate-400">Pronto para começar?</p>
          </div>

          {/* Botões rápidos compactos */}
          <div className="flex items-center gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                title={action.title}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${action.mobileClass}`}
              >
                <action.icon className="h-5 w-5" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================
          DESKTOP
          ===================================================== */}
      <div className="hidden rounded-2xl border border-slate-700/50 bg-slate-900 lg:block">
        <div className="flex items-center gap-6 p-6">
          {/* Texto principal */}
          <div className="flex-1">
            <p className="text-sm text-slate-400">Bem-vindo,</p>
            <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-white">
              {userName}! 👋
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Impulsione o seu progresso aqui!
            </p>
          </div>

          {/* Divisor vertical */}
          <div className="h-16 w-px bg-slate-700/60" />

          {/* Cards de ação */}
          <div className="flex gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className={`group relative flex w-44 flex-col gap-3 rounded-xl p-4 transition-all duration-200 ${action.desktopClass}`}
              >
                {/* Seta no canto superior direito */}
                <ArrowRight
                  className={`absolute right-3 top-3 h-4 w-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${action.arrowClass}`}
                />

                {/* Ícone */}
                <action.icon className={`h-5 w-5 ${action.iconClass}`} />

                {/* Título */}
                <p className={`text-sm leading-snug ${action.textClass}`}>
                  {action.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}