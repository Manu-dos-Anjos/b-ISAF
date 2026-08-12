"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  wide?: boolean;
};

/**
 * Shell de modal partilhado por QuizReview e QuizStats.
 * Garante que o painel tem altura fixa e que apenas o CONTEÚDO
 * faz scroll — nunca a página inteira. Header e footer ficam
 * sempre visíveis (shrink-0), independentemente do tamanho do conteúdo.
 */
export default function QuizModalShell({ children, wide }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 backdrop-blur-md dark:bg-slate-950/90 sm:items-center p-0 sm:p-4"
    >
      <div
        className={`relative flex h-[95dvh] w-full flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 rounded-t-3xl sm:h-[92dvh] sm:rounded-3xl ${
          wide
            ? "sm:w-[min(96vw,1400px)]"
            : "sm:w-[min(92vw,1100px)] sm:max-w-2xl lg:max-w-3xl"
        }`}
      >
        {/* Drag handle (mobile) */}
        <div className="flex shrink-0 justify-center pt-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" />
        </div>

        {/* Área de conteúdo: única responsável por fazer scroll */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}