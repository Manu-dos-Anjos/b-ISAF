// app/components/meu-curso/MeuCursoPageWrapper.tsx
"use client";

import { useUser } from "@/app/lib/context/UserContext";
import MeuCursoPage, { type CourseId } from "./MeuCursoPage";

/* ================================================================
   Mapeamento: nome completo do curso → CourseId usado pelo MeuCursoPage
   Fase 2: este mapeamento virá da tabela courses do Supabase (campo code/id)
   ================================================================ */
const COURSE_ID_MAP: Record<string, CourseId> = {
  "Informática de Gestão Financeira":  "informatica-gestao-financeira",
  "Contabilidade e Finanças":          "contabilidade-financas",
  "Gestão Bancária & Seguros":         "gestao-bancaria-seguros",
  "Gestão Bancária e Seguros":         "gestao-bancaria-seguros",
};

function parseCourseId(courseName: string): CourseId {
  return COURSE_ID_MAP[courseName] ?? "informatica-gestao-financeira";
}

function parseYear(yearStr: string): 1 | 2 | 3 | 4 {
  const n = parseInt(yearStr.replace(/\D/g, ""), 10);
  return ([1, 2, 3, 4].includes(n) ? n : 1) as 1 | 2 | 3 | 4;
}

function parseSemester(semStr: string): 1 | 2 {
  const n = parseInt(semStr.replace(/\D/g, ""), 10);
  return (n === 2 ? 2 : 1) as 1 | 2;
}

/* ================================================================
   WRAPPER — lê UserContext e passa props para MeuCursoPage
   ================================================================ */
export default function MeuCursoPageWrapper() {
  const { user } = useUser();

  // Enquanto o utilizador não carrega, mostra skeleton mínimo
  if (!user) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
      </div>
    );
  }

  return (
    <MeuCursoPage
      courseId={parseCourseId(user.academic.course)}
      currentYear={parseYear(user.academic.year)}
      currentSemester={parseSemester(user.academic.semester)}
      studentName={user.name}
      studentNumber={user.academic.studentNumber}
    />
  );
}
