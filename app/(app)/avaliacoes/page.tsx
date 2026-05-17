// app/avaliacoes/page.tsx
import { ClipboardList } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Avaliações · b-ISAF" };

export default function AvaliacoesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
        <ClipboardList size={28} className="text-amber-400" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Avaliações</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Os teus questionários e resultados aparecem aqui.
        Esta secção está em desenvolvimento — Fase 3 do roadmap.
      </p>
      <span className="mt-4 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
        Em breve
      </span>
    </div>
  );
}
