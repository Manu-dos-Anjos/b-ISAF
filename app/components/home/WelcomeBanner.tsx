"use client";

import Link from "next/link";
import { BookOpen, Headphones, ClipboardList, ArrowRight } from "lucide-react";

type WelcomeBannerProps = {
  userName: string;
};

const quickActions = [
  {
    title: "Conteúdo por disciplina",
    icon: BookOpen,
    href: "/disciplinas",
    mobileClass: "bg-blue-500/10 text-blue-300 hover:bg-blue-500/20",
    desktopClass:
      "bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-500",
    iconClass: "text-blue-400",
    textClass: "text-slate-200",
    arrowClass: "text-slate-500",
  },
  {
    title: "Resumos em áudio",
    icon: Headphones,
    href: "/disciplinas?filter=audio",
    mobileClass: "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20",
    desktopClass:
      "bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-500",
    iconClass: "text-purple-400",
    textClass: "text-slate-200",
    arrowClass: "text-slate-500",
  },
  {
    title: "Testes e questionários",
    icon: ClipboardList,
    href: "/disciplinas?filter=quiz",
    mobileClass: "bg-amber-400/10 text-amber-300 hover:bg-amber-400/20",
    desktopClass:
      "bg-gradient-to-br from-amber-300 via-yellow-300 to-amber-400 hover:brightness-110 border border-amber-300/50",
    iconClass: "text-amber-900",
    textClass: "text-amber-900 font-semibold",
    arrowClass: "text-amber-700",
  },
];

export default function WelcomeBanner({ userName }: WelcomeBannerProps) {
  return (
    <section>
      {/* ── MOBILE ── */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900 p-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-white">
              Olá, <span className="text-blue-400">{userName}!</span>
            </h1>
            <p className="text-xs text-slate-400">Pronto para começar?</p>
          </div>

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

      {/* ── DESKTOP ── */}
      <div className="hidden rounded-2xl border border-slate-700/50 bg-slate-900 lg:block">
        <div className="flex items-center gap-6 p-6">

          {/* Texto de boas-vindas */}
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