import type { Profile } from "@/src/types/database";

type QuizItem = {
  contentId: string;
  title: string;
  chapterTitle: string;
  disciplineId: string;
  disciplineName: string;
  timeLimitSecs: number | null;
  bestScore: number | null;
  attempts: number;
};

type Discipline = {
  id: string;
  name: string;
};

export const mockProfile = {
  id: "mock-profile-1",
  full_name: "Mariana Chico",
  email: "mariana.chico@isaf.pt",
  student_number: "2024001",
  avatar_url: null,
  bio: null,
  role: "student",
  course_id: "mock-course-1",
  current_year: 1,
  current_semester: 2,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  schedule_reset_at: null,
} as Profile;

export const mockDisciplines: Discipline[] = [
  { id: "disc-1", name: "Informática de Gestão Financeira" },
  { id: "disc-2", name: "Contabilidade Geral I" },
  { id: "disc-3", name: "Introdução às Organizações e à Gestão" },
  { id: "disc-4", name: "Arquitetura de Computadores" },
];

export const mockQuizItems: QuizItem[] = [
  {
    contentId: "quiz-1",
    title: "Quiz 1 — Fundamentos de Gestão",
    chapterTitle: "Capítulo 1 · Introdução à Gestão",
    disciplineId: "disc-3",
    disciplineName: "Introdução às Organizações e à Gestão",
    timeLimitSecs: 300,
    bestScore: 92,
    attempts: 2,
  },
  {
    contentId: "quiz-2",
    title: "Quiz 2 — Tipos de Organizações",
    chapterTitle: "Capítulo 2 · Organizações",
    disciplineId: "disc-3",
    disciplineName: "Introdução às Organizações e à Gestão",
    timeLimitSecs: 420,
    bestScore: 78,
    attempts: 1,
  },
  {
    contentId: "quiz-3",
    title: "Quiz 1 — Lançamentos Contabilísticos",
    chapterTitle: "Capítulo 1 · Princípios Básicos",
    disciplineId: "disc-2",
    disciplineName: "Contabilidade Geral I",
    timeLimitSecs: 360,
    bestScore: 64,
    attempts: 3,
  },
  {
    contentId: "quiz-4",
    title: "Quiz 2 — Débito e Crédito",
    chapterTitle: "Capítulo 2 · Registo de Operações",
    disciplineId: "disc-2",
    disciplineName: "Contabilidade Geral I",
    timeLimitSecs: 480,
    bestScore: 47,
    attempts: 2,
  },
  {
    contentId: "quiz-5",
    title: "Quiz 1 — Sistemas e Componentes",
    chapterTitle: "Capítulo 1 · Hardware",
    disciplineId: "disc-4",
    disciplineName: "Arquitetura de Computadores",
    timeLimitSecs: 300,
    bestScore: 85,
    attempts: 1,
  },
  {
    contentId: "quiz-6",
    title: "Quiz 2 — Memória e Processadores",
    chapterTitle: "Capítulo 2 · Organização Interna",
    disciplineId: "disc-4",
    disciplineName: "Arquitetura de Computadores",
    timeLimitSecs: 420,
    bestScore: null,
    attempts: 0,
  },
  {
    contentId: "quiz-7",
    title: "Quiz 1 — Conceitos de Algoritmia",
    chapterTitle: "Capítulo 1 · Lógica de Programação",
    disciplineId: "disc-1",
    disciplineName: "Informática de Gestão Financeira",
    timeLimitSecs: 300,
    bestScore: 100,
    attempts: 2,
  },
  {
    contentId: "quiz-8",
    title: "Quiz 2 — Estruturas Condicionais",
    chapterTitle: "Capítulo 2 · Controlo de Fluxo",
    disciplineId: "disc-1",
    disciplineName: "Informática de Gestão Financeira",
    timeLimitSecs: 360,
    bestScore: 72,
    attempts: 1,
  },
];