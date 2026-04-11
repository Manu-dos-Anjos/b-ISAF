// app/disciplinas/page.tsx
"use client";

import { useState } from "react";
import { Headphones, FileText, Trophy, Sparkles } from "lucide-react";
import { useUser } from "@/app/lib/context/UserContext";
import {
  getDisciplinesForUser,
  getCourseAbbreviation,
} from "@/app/lib/mockData";
import DisciplineCard from "@/app/disciplinas/DisciplineCard";

const filterButtons = [
  { id: "audios",    label: "Áudios",        icon: Headphones },
  { id: "slides",    label: "Slides",        icon: FileText   },
  { id: "quizzes",   label: "Questionários", icon: Trophy     },
  { id: "tutor",     label: "Tutor IA",      icon: Sparkles   },
];

<div className="flex flex-wrap gap-2">
  {filterButtons.map((btn) => {
    const Icon = btn.icon;
    const isActive = setActiveFilter === btn.id;
    const isTutor = btn.id === "tutor";

    function setActiveFilter(arg0: string | null): void {
      throw new Error("Function not implemented.");
    }

    return (
      <button
        key={btn.id}
        onClick={() => setActiveFilter(isActive ? null : btn.id)}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-all
          ${isTutor && !isActive
            // Tutor tem estilo próprio quando inativo: gradiente subtil
            ? "border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 dark:border-violet-400/30"
            : isActive
            ? "border-blue-500 bg-blue-500 text-white"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          }
          ${isTutor && isActive ? "border-violet-500 bg-violet-600 text-white" : ""}
        `}
      >
        <Icon size={16} />
        <span>{btn.label}</span>
      </button>
    );
  })}
</div>

export default function DisciplinasPage() {
  const { user } = useUser();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Loading enquanto o utilizador ainda não carregou
  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-slate-400">A carregar...</p>
        </div>
      </div>
    );
  }

  const { year, semester, course } = user.academic;

  // Disciplinas filtradas pelos dados académicos do utilizador
  const disciplines = getDisciplinesForUser(year, semester, course);

  // Título da página gerado a partir dos dados reais
  const courseAbbr = getCourseAbbreviation(course);
  const pageTitle = `${courseAbbr} · ${year} · ${semester}`;

  return (
    <div className="space-y-8">

      {/* Cabeçalho */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-blue-500 dark:text-blue-400">
            {course}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {pageTitle}
          </h1>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((btn) => {
            const Icon = btn.icon;
            const isActive = activeFilter === btn.id;

            return (
              <button
                key={btn.id}
                onClick={() => setActiveFilter(isActive ? null : btn.id)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm 
                  font-medium shadow-sm transition-all
                  ${isActive
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
              >
                <Icon size={16} />
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Grelha de Disciplinas */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">
            Disciplinas
          </h2>
          <span className="text-sm text-slate-400">
            {disciplines.length}{" "}
            {disciplines.length === 1 ? "disciplina" : "disciplinas"}
          </span>
        </div>

        {disciplines.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {disciplines.map((discipline) => (
              <DisciplineCard key={discipline.id} discipline={discipline} />
            ))}
          </div>
        ) : (
          // Estado vazio quando não há disciplinas para este perfil
          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-slate-100 p-5 dark:bg-slate-800">
              <FileText size={30} className="text-slate-400" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-700 dark:text-slate-300">
              Sem disciplinas disponíveis
            </h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Não encontrámos disciplinas para{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                {year}
              </strong>{" "}
              do{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                {semester}
              </strong>
              . Verifica os teus dados na sidebar.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}