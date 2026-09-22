// app/(app)/admin/avaliacoes/page.tsx
"use client";

import { ClipboardList, ShieldAlert } from "lucide-react";
import { useAdmin } from "@/app/lib/hooks/useAdmin";

export default function AdminAvaliacoesPage() {
  const { isAdmin, loading } = useAdmin();

  if (loading) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert size={32} className="text-rose-500" />
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Área restrita</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center dark:border-white/10 dark:bg-white/[0.02]">
      <ClipboardList size={32} className="text-slate-300 dark:text-slate-700" />
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Gestão de Avaliações</p>
      <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
        Em construção — em breve poderás gerir quizzes, épocas e notas por disciplina.
      </p>
    </div>
  );
}