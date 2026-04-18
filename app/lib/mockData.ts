// app/lib/mockData.ts
import type { LucideIcon } from "lucide-react";
import {
  Book,
  Calculator,
  FlaskConical,
  MessageSquare,
  Monitor,
} from "lucide-react";

export const iconMap: Record<string, LucideIcon> = {
  book: Book,
  calculator: Calculator,
  science: FlaskConical,
  communication: MessageSquare,
  computer: Monitor,
};

export type ContentType = "audio" | "slide" | "quiz";

export interface TopicContent {
  id: string;
  type: ContentType;
  title: string;
  url?: string;
}

export interface Topic {
  id: string;
  title: string;
  contents: TopicContent[];
}

export interface Chapter {
  id: string;
  title: string;
  status: "Concluído" | "Não concluído";
  topics: Topic[];
}

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
  year: string; // ex: "1º Ano"
  semester: string; // ex: "1º Semestre"
  course: string; // ex: "Informática de Gestão Financeira"

  // Estrutura da página da disciplina
  chapters?: Chapter[];
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
    href: "/disciplinas/ingles-i",
    year: "1º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "ingles-cap-01",
        title: "Capítulo 01: Greetings and Introductions",
        status: "Concluído",
        topics: [
          {
            id: "ingles-top-01",
            title: "Greetings",
            contents: [
              { id: "ingles-c-01", type: "audio", title: "Áudio - Greetings" },
              { id: "ingles-c-02", type: "slide", title: "Slides - Greetings" },
              { id: "ingles-c-03", type: "quiz", title: "Quiz - Greetings" },
            ],
          },
          {
            id: "ingles-top-02",
            title: "Self-Introductions",
            contents: [
              { id: "ingles-c-04", type: "audio", title: "Áudio - Introductions" },
              { id: "ingles-c-05", type: "slide", title: "Slides - Introductions" },
              { id: "ingles-c-06", type: "quiz", title: "Quiz - Introductions" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "matematica-i",
    title: "Matemática I",
    professor: "Prof. João Silva",
    progress: 40,
    lessonCount: 8,
    icon: "calculator",
    coverUrl: "/disciplines/matematica.jpg",
    href: "/disciplinas/matematica-i",
    year: "1º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "mat-cap-01",
        title: "Capítulo 01: Álgebra e Equações",
        status: "Concluído",
        topics: [
          {
            id: "mat-top-01",
            title: "Equações do 1º Grau",
            contents: [
              { id: "mat-c-01", type: "audio", title: "Áudio - Equações" },
              { id: "mat-c-02", type: "slide", title: "Slides - Equações" },
              { id: "mat-c-03", type: "quiz", title: "Quiz - Equações" },
            ],
          },
          {
            id: "mat-top-02",
            title: "Sistemas Lineares",
            contents: [
              { id: "mat-c-04", type: "audio", title: "Áudio - Sistemas Lineares" },
              { id: "mat-c-05", type: "slide", title: "Slides - Sistemas Lineares" },
              { id: "mat-c-06", type: "quiz", title: "Quiz - Sistemas Lineares" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "metodologias-investigacao",
    title: "Metodologias de Investigação Científica",
    professor: "Prof. Maria Lima",
    progress: 90,
    lessonCount: 18,
    icon: "science",
    coverUrl: "/disciplines/metodologias.jpg",
    href: "/disciplinas/metodologias-investigacao",
    year: "1º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "mig-cap-01",
        title: "Capítulo 01: Introdução à Investigação",
        status: "Concluído",
        topics: [
          {
            id: "mig-top-01",
            title: "Método Científico",
            contents: [
              { id: "mig-c-01", type: "audio", title: "Áudio - Método Científico" },
              { id: "mig-c-02", type: "slide", title: "Slides - Método Científico" },
              { id: "mig-c-03", type: "quiz", title: "Quiz - Método Científico" },
            ],
          },
          {
            id: "mig-top-02",
            title: "Problema de Pesquisa",
            contents: [
              { id: "mig-c-04", type: "audio", title: "Áudio - Problema de Pesquisa" },
              { id: "mig-c-05", type: "slide", title: "Slides - Problema de Pesquisa" },
              { id: "mig-c-06", type: "quiz", title: "Quiz - Problema de Pesquisa" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "comunicacao-pessoal",
    title: "Comunicação Pessoal e Empresarial",
    professor: "Prof. Pedro Santos",
    progress: 25,
    lessonCount: 5,
    icon: "communication",
    coverUrl: "/disciplines/comunicacao.jpg",
    href: "/disciplinas/comunicacao-pessoal",
    year: "1º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "com-cap-01",
        title: "Capítulo 01: Fundamentos da Comunicação",
        status: "Concluído",
        topics: [
          {
            id: "com-top-01",
            title: "Comunicação Verbal",
            contents: [
              { id: "com-c-01", type: "audio", title: "Áudio - Comunicação Verbal" },
              { id: "com-c-02", type: "slide", title: "Slides - Comunicação Verbal" },
            ],
          },
          {
            id: "com-top-02",
            title: "Comunicação Não Verbal",
            contents: [
              { id: "com-c-03", type: "audio", title: "Áudio - Comunicação Não Verbal" },
              { id: "com-c-04", type: "slide", title: "Slides - Comunicação Não Verbal" },
              { id: "com-c-05", type: "quiz", title: "Quiz - Comunicação Não Verbal" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "fundamentos-sistemas",
    title: "Fundamentos de Sistemas de Informação",
    professor: "Prof. Carlos Mendes",
    progress: 55,
    lessonCount: 11,
    icon: "computer",
    coverUrl: "/disciplines/fundamentos_si.jpg",
    href: "/disciplinas/fundamentos-sistemas",
    introVideoUrl: "/videos/fundamentos-intro.mp4",
    year: "1º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "fsi-cap-01",
        title: "Capítulo 01: Introdução aos Sistemas de Informação",
        status: "Concluído",
        topics: [
          {
            id: "fsi-top-01",
            title: "O conceito de Sistema de Informação",
            contents: [
              { id: "fsi-c-01", type: "audio", title: "Áudio - Conceito de SI" },
              { id: "fsi-c-02", type: "slide", title: "Slides - Conceito de SI" },
              { id: "fsi-c-03", type: "quiz", title: "Quiz - Conceito de SI" },
            ],
          },
          {
            id: "fsi-top-02",
            title: "Componentes de um Sistema de Informação",
            contents: [
              { id: "fsi-c-04", type: "audio", title: "Áudio - Componentes" },
              { id: "fsi-c-05", type: "slide", title: "Slides - Componentes" },
              { id: "fsi-c-06", type: "quiz", title: "Quiz - Componentes" },
            ],
          },
        ],
      },
      {
        id: "fsi-cap-02",
        title: "Capítulo 02: Sistemas de Informação e Organizações",
        status: "Concluído",
        topics: [
          {
            id: "fsi-top-03",
            title: "Relação entre SI e Organizações",
            contents: [
              { id: "fsi-c-07", type: "audio", title: "Áudio - SI e Organizações" },
              { id: "fsi-c-08", type: "slide", title: "Slides - SI e Organizações" },
            ],
          },
          {
            id: "fsi-top-04",
            title: "Alinhamento Estratégico",
            contents: [
              { id: "fsi-c-09", type: "audio", title: "Áudio - Alinhamento Estratégico" },
              { id: "fsi-c-10", type: "slide", title: "Slides - Alinhamento Estratégico" },
              { id: "fsi-c-11", type: "quiz", title: "Quiz - Alinhamento Estratégico" },
            ],
          },
        ],
      },
      {
        id: "fsi-cap-03",
        title: "Capítulo 03: Infraestrutura de TI",
        status: "Não concluído",
        topics: [
          {
            id: "fsi-top-05",
            title: "Hardware e Software",
            contents: [
              { id: "fsi-c-12", type: "audio", title: "Áudio - Hardware e Software" },
              { id: "fsi-c-13", type: "slide", title: "Slides - Hardware e Software" },
            ],
          },
          {
            id: "fsi-top-06",
            title: "Redes e Comunicação",
            contents: [
              { id: "fsi-c-14", type: "audio", title: "Áudio - Redes e Comunicação" },
              { id: "fsi-c-15", type: "slide", title: "Slides - Redes e Comunicação" },
              { id: "fsi-c-16", type: "quiz", title: "Quiz - Redes e Comunicação" },
            ],
          },
        ],
      },
      {
        id: "fsi-cap-04",
        title: "Capítulo 04: Segurança da Informação",
        status: "Não concluído",
        topics: [
          {
            id: "fsi-top-07",
            title: "Riscos e Proteção de Dados",
            contents: [
              { id: "fsi-c-17", type: "audio", title: "Áudio - Segurança" },
              { id: "fsi-c-18", type: "slide", title: "Slides - Segurança" },
              { id: "fsi-c-19", type: "quiz", title: "Quiz - Segurança" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "contabilidade-geral",
    title: "Contabilidade Geral",
    professor: "Prof. Sofia Neto",
    progress: 0,
    lessonCount: 10,
    icon: "calculator",
    coverUrl: "/disciplines/contabilidade.jpg",
    href: "/disciplinas/contabilidade-geral",
    year: "1º Ano",
    semester: "2º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "cont-cap-01",
        title: "Capítulo 01: Noções Básicas de Contabilidade",
        status: "Não concluído",
        topics: [
          {
            id: "cont-top-01",
            title: "Património e Inventário",
            contents: [
              { id: "cont-c-01", type: "audio", title: "Áudio - Património" },
              { id: "cont-c-02", type: "slide", title: "Slides - Património" },
              { id: "cont-c-03", type: "quiz", title: "Quiz - Património" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "redes-computadores",
    title: "Redes de Computadores",
    professor: "Prof. Rui Ferreira",
    progress: 0,
    lessonCount: 9,
    icon: "computer",
    coverUrl: "/disciplines/redes.jpg",
    href: "/disciplinas/redes-computadores",
    year: "1º Ano",
    semester: "2º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "redes-cap-01",
        title: "Capítulo 01: Fundamentos de Redes",
        status: "Não concluído",
        topics: [
          {
            id: "redes-top-01",
            title: "Topologias de Rede",
            contents: [
              { id: "redes-c-01", type: "audio", title: "Áudio - Topologias" },
              { id: "redes-c-02", type: "slide", title: "Slides - Topologias" },
            ],
          },
          {
            id: "redes-top-02",
            title: "Protocolos de Comunicação",
            contents: [
              { id: "redes-c-03", type: "audio", title: "Áudio - Protocolos" },
              { id: "redes-c-04", type: "slide", title: "Slides - Protocolos" },
              { id: "redes-c-05", type: "quiz", title: "Quiz - Protocolos" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "base-dados",
    title: "Base de Dados",
    professor: "Prof. André Costa",
    progress: 0,
    lessonCount: 14,
    icon: "computer",
    coverUrl: "/disciplines/base_dados.jpg",
    href: "/disciplinas/base-dados",
    year: "2º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "bd-cap-01",
        title: "Capítulo 01: Modelação Relacional",
        status: "Não concluído",
        topics: [
          {
            id: "bd-top-01",
            title: "Tabelas e Relacionamentos",
            contents: [
              { id: "bd-c-01", type: "audio", title: "Áudio - Tabelas" },
              { id: "bd-c-02", type: "slide", title: "Slides - Tabelas" },
              { id: "bd-c-03", type: "quiz", title: "Quiz - Tabelas" },
            ],
          },
          {
            id: "bd-top-02",
            title: "Chaves Primárias e Estrangeiras",
            contents: [
              { id: "bd-c-04", type: "audio", title: "Áudio - Chaves" },
              { id: "bd-c-05", type: "slide", title: "Slides - Chaves" },
            ],
          },
          {
            id: "bd-top-03",
            title: "Normalização",
            contents: [
              { id: "bd-c-06", type: "audio", title: "Áudio - Normalização" },
              { id: "bd-c-07", type: "slide", title: "Slides - Normalização" },
              { id: "bd-c-08", type: "quiz", title: "Quiz - Normalização" },
            ],
          },
        ],
      },
    ],
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
    (d) => d.year === year && d.semester === semester && d.course === course
  );
}

export function getDisciplineById(id: string): Discipline | undefined {
  return mockDisciplines.find((discipline) => discipline.id === id);
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