// app/guardados/page.tsx
import { Bookmark } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Guardados · b-ISAF" };

export default function GuardadosPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
        <Bookmark size={28} className="text-indigo-400" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Guardados</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Os teus áudios, slides e quizzes favoritos aparecem aqui.
        Esta secção está em desenvolvimento — Fase 3 do roadmap.
      </p>
      <span className="mt-4 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
        Em breve
      </span>
    </div>
  );
}
