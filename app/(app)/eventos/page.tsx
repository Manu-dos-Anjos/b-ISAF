// app/eventos/page.tsx
import { Calendar } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Eventos | b-ISAF" };

export default function EventosPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-500/10">
        <Calendar size={28} className="text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Eventos</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
        Palestras, workshops e comunicados do ISAF aparecem aqui.
        Esta secção está em desenvolvimento — Fase 4 do roadmap.
      </p>
      <span className="mt-4 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
        Em breve
      </span>
    </div>
  );
}