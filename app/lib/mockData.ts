// app/lib/mockData.ts
import type { LucideIcon } from "lucide-react";
import { Book, Calculator, FlaskConical, MessageSquare, Monitor } from "lucide-react";

export const iconMap: Record<string, LucideIcon> = {
  book: Book,
  calculator: Calculator,
  science: FlaskConical,
  communication: MessageSquare,
  computer: Monitor,
};

export interface Discipline {
  id: string;
  title: string;
  professor: string;
  progress: number;
  lessonCount: number;
  icon: keyof typeof iconMap;
  coverUrl: string;
  href: string;

  // Campos académicos para filtrar pelo utilizador
  year: string;      // ex: "1º Ano"
  semester: string;  // ex: "1º Semestre"
  course: string;    // ex: "Informática de Gestão Financeira"
}

export const mockDisciplines: Discipline[] = [
  {
    id: "ingles-i",
    title: "Inglês I",
    professor: "Prof. Ana Costa",
    progress: 65,
    lessonCount: 13,
    icon: "book",
    coverUrl: "/disciplines/ingles.jpg",
    href: "/disciplinas/1-ano-1-semestre/ingles-i",
    year: "1º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
  },
  {
    id: "matematica-i",
    title: "Matemática I",
    professor: "Prof. João Silva",
    progress: 40,
    lessonCount: 8,
    icon: "calculator",
    coverUrl: "/disciplines/matematica.jpg",
    href: "/disciplinas/1-ano-1-semestre/matematica-i",
    year: "1º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
  },
  {
    id: "metodologias-investigacao",
    title: "Metodologias de Investigação Científica",
    professor: "Prof. Maria Lima",
    progress: 90,
    lessonCount: 18,
    icon: "science",
    coverUrl: "/disciplines/metodologias.jpg",
    href: "/disciplinas/1-ano-1-semestre/metodologias-investigacao",
    year: "1º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
  },
  {
    id: "comunicacao-pessoal",
    title: "Comunicação Pessoal e Empresarial",
    professor: "Prof. Pedro Santos",
    progress: 25,
    lessonCount: 5,
    icon: "communication",
    coverUrl: "/disciplines/comunicacao.jpg",
    href: "/disciplinas/1-ano-1-semestre/comunicacao-pessoal",
    year: "1º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
  },
  {
    id: "fundamentos-sistemas",
    title: "Fundamentos de Sistemas de Informação",
    professor: "Prof. Carlos Mendes",
    progress: 55,
    lessonCount: 11,
    icon: "computer",
    coverUrl: "/disciplines/fundamentos_si.jpg",
    href: "/disciplinas/1-ano-1-semestre/fundamentos-de-sistemas-de-informacao",
    year: "1º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
  },

  // --- 1º Ano · 2º Semestre ---
  {
    id: "contabilidade-geral",
    title: "Contabilidade Geral",
    professor: "Prof. Sofia Neto",
    progress: 0,
    lessonCount: 10,
    icon: "calculator",
    coverUrl: "/disciplines/contabilidade.jpg",
    href: "/disciplinas/1-ano-2-semestre/contabilidade-geral",
    year: "1º Ano",
    semester: "2º Semestre",
    course: "Informática de Gestão Financeira",
  },
  {
    id: "redes-computadores",
    title: "Redes de Computadores",
    professor: "Prof. Rui Ferreira",
    progress: 0,
    lessonCount: 9,
    icon: "computer",
    coverUrl: "/disciplines/redes.jpg",
    href: "/disciplinas/1-ano-2-semestre/redes-computadores",
    year: "1º Ano",
    semester: "2º Semestre",
    course: "Informática de Gestão Financeira",
  },

  // --- 2º Ano · 1º Semestre ---
  {
    id: "base-dados",
    title: "Base de Dados",
    professor: "Prof. André Costa",
    progress: 0,
    lessonCount: 14,
    icon: "computer",
    coverUrl: "/disciplines/base_dados.jpg",
    href: "/disciplinas/2-ano-1-semestre/base-dados",
    year: "2º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
  },
];

// -------------------------------------------------------
// Utilitários
// -------------------------------------------------------

/**
 * Devolve apenas as disciplinas do ano, semestre e curso do utilizador.
 * Quando ligarmos ao Firebase, substituímos esta função por uma query ao Firestore.
 */
export function getDisciplinesForUser(
  year: string,
  semester: string,
  course: string
): Discipline[] {
  return mockDisciplines.filter(
    (d) =>
      d.year === year &&
      d.semester === semester &&
      d.course === course
  );
}

/**
 * Gera abreviação do curso a partir das palavras com mais de 3 letras.
 * "Informática de Gestão Financeira" → "IGF"
 */
export function getCourseAbbreviation(course: string): string {
  return course
    .split(" ")
    .filter((word) => word.length > 3)
    .map((word) => word[0].toUpperCase())
    .join("");
}