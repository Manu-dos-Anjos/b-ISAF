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
  book:          Book,
  calculator:    Calculator,
  science:       FlaskConical,
  communication: MessageSquare,
  computer:      Monitor,
};

export type ContentType = "audio" | "slide" | "quiz";

export interface TopicContent {
  id:    string;
  type:  ContentType;
  title: string;
  url?:  string;
}

export interface Topic {
  id:       string;
  title:    string;
  contents: TopicContent[];
}

export interface Chapter {
  id:     string;
  title:  string;
  status: "Concluído" | "Não concluído";
  topics: Topic[];
}

export interface Discipline {
  id:          string;
  title:       string;
  professor:   string;
  progress:    number;
  lessonCount: number;
  icon:        keyof typeof iconMap;
  coverUrl:    string;
  href:        string;

  // ← FIX: campo estava a ser usado mas não declarado
  introVideoUrl?: string;

  // Campos académicos para filtrar pelo utilizador
  year:     string; // "1º Ano"
  semester: string; // "1º Semestre"
  course:   string; // "Informática de Gestão Financeira"

  // Estrutura da página da disciplina
  chapters?: Chapter[];
}

/* ================================================================
   DADOS MOCK
   ================================================================ */

export const mockDisciplines: Discipline[] = [
  // ── 1º Ano · 1º Semestre · IGF ──────────────────────────────
  {
    id: "ingles-i",
    title: "Língua Inglesa I",
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
              { id: "ingles-c-03", type: "quiz",  title: "Quiz - Greetings" },
            ],
          },
          {
            id: "ingles-top-02",
            title: "Self-Introductions",
            contents: [
              { id: "ingles-c-04", type: "audio", title: "Áudio - Introductions" },
              { id: "ingles-c-05", type: "slide", title: "Slides - Introductions" },
              { id: "ingles-c-06", type: "quiz",  title: "Quiz - Introductions" },
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
              { id: "mat-c-03", type: "quiz",  title: "Quiz - Equações" },
            ],
          },
          {
            id: "mat-top-02",
            title: "Sistemas Lineares",
            contents: [
              { id: "mat-c-04", type: "audio", title: "Áudio - Sistemas Lineares" },
              { id: "mat-c-05", type: "slide", title: "Slides - Sistemas Lineares" },
              { id: "mat-c-06", type: "quiz",  title: "Quiz - Sistemas Lineares" },
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
              { id: "mig-c-03", type: "quiz",  title: "Quiz - Método Científico" },
            ],
          },
          {
            id: "mig-top-02",
            title: "Problema de Pesquisa",
            contents: [
              { id: "mig-c-04", type: "audio", title: "Áudio - Problema de Pesquisa" },
              { id: "mig-c-05", type: "slide", title: "Slides - Problema de Pesquisa" },
              { id: "mig-c-06", type: "quiz",  title: "Quiz - Problema de Pesquisa" },
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
              { id: "com-c-05", type: "quiz",  title: "Quiz - Comunicação Não Verbal" },
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
              { id: "fsi-c-01", type: "audio", title: "Áudio - Conceito de SI",  url: "/audios/fundamentos-organigrama.mp3" },
              { id: "fsi-c-02", type: "slide", title: "Slides - Conceito de SI", url: "/slides/fsi.pdf" },
              { id: "fsi-c-03", type: "quiz",  title: "Quiz - Conceito de SI" },
            ],
          },
          {
            id: "fsi-top-02",
            title: "Componentes de um Sistema de Informação",
            contents: [
              { id: "fsi-c-04", type: "audio", title: "Áudio - Componentes" },
              { id: "fsi-c-05", type: "slide", title: "Slides - Componentes" },
              { id: "fsi-c-06", type: "quiz",  title: "Quiz - Componentes" },
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
              { id: "fsi-c-11", type: "quiz",  title: "Quiz - Alinhamento Estratégico" },
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
              { id: "fsi-c-16", type: "quiz",  title: "Quiz - Redes e Comunicação" },
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
              { id: "fsi-c-19", type: "quiz",  title: "Quiz - Segurança" },
            ],
          },
        ],
      },
    ],
  },

  // ── 1º Ano · 2º Semestre · IGF ──────────────────────────────
  {
    id: "contabilidade-geral",
    title: "Contabilidade Geral I",
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
              { id: "cont-c-03", type: "quiz",  title: "Quiz - Património" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "ingles-ii",
    title: "Língua Inglesa II",
    professor: "Prof. Ana Costa",
    progress: 0,
    lessonCount: 13,
    icon: "book",
    coverUrl: "/disciplines/ingles.jpg",
    href: "/disciplinas/ingles-ii",
    year: "1º Ano",
    semester: "2º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "ingles2-cap-01",
        title: "Capítulo 01: Business Communication",
        status: "Não concluído",
        topics: [
          {
            id: "ingles2-top-01",
            title: "Formal Emails",
            contents: [
              { id: "ingles2-c-01", type: "audio", title: "Áudio - Formal Emails" },
              { id: "ingles2-c-02", type: "slide", title: "Slides - Formal Emails" },
              { id: "ingles2-c-03", type: "quiz",  title: "Quiz - Formal Emails" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "intro-organizacoes",
    title: "Introdução às Organizações e à Gestão",
    professor: "Prof. Luís Rodrigues",
    progress: 0,
    lessonCount: 9,
    icon: "communication",
    coverUrl: "/disciplines/organizacoes.jpg",
    href: "/disciplinas/intro-organizacoes",
    year: "1º Ano",
    semester: "2º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "org-cap-01",
        title: "Capítulo 01: Conceito de Organização",
        status: "Não concluído",
        topics: [
          {
            id: "org-top-01",
            title: "Tipos de Organizações",
            contents: [
              { id: "org-c-01", type: "audio", title: "Áudio - Tipos de Organizações" },
              { id: "org-c-02", type: "slide", title: "Slides - Tipos de Organizações" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "arquitetura-computadores",
    title: "Arquitetura de Computadores",
    professor: "Prof. Filipe Nunes",
    progress: 0,
    lessonCount: 10,
    icon: "computer",
    coverUrl: "/disciplines/arquitetura.jpg",
    href: "/disciplinas/arquitetura-computadores",
    year: "1º Ano",
    semester: "2º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "arq-cap-01",
        title: "Capítulo 01: Arquitectura Von Neumann",
        status: "Não concluído",
        topics: [
          {
            id: "arq-top-01",
            title: "CPU e Memória",
            contents: [
              { id: "arq-c-01", type: "audio", title: "Áudio - CPU e Memória" },
              { id: "arq-c-02", type: "slide", title: "Slides - CPU e Memória" },
              { id: "arq-c-03", type: "quiz",  title: "Quiz - CPU e Memória" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "matematica-ii",
    title: "Matemática II",
    professor: "Prof. João Silva",
    progress: 0,
    lessonCount: 8,
    icon: "calculator",
    coverUrl: "/disciplines/matematica.jpg",
    href: "/disciplinas/matematica-ii",
    year: "1º Ano",
    semester: "2º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [
      {
        id: "mat2-cap-01",
        title: "Capítulo 01: Cálculo Diferencial",
        status: "Não concluído",
        topics: [
          {
            id: "mat2-top-01",
            title: "Derivadas",
            contents: [
              { id: "mat2-c-01", type: "audio", title: "Áudio - Derivadas" },
              { id: "mat2-c-02", type: "slide", title: "Slides - Derivadas" },
              { id: "mat2-c-03", type: "quiz",  title: "Quiz - Derivadas" },
            ],
          },
        ],
      },
    ],
  },

  // ── 2º Ano · 1º Semestre · IGF ──────────────────────────────
  {
    id: "contabilidade-geral-ii",
    title: "Contabilidade Geral II",
    professor: "Prof. Sofia Neto",
    progress: 0,
    lessonCount: 10,
    icon: "calculator",
    coverUrl: "/disciplines/contabilidade.jpg",
    href: "/disciplinas/contabilidade-geral-ii",
    year: "2º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [],
  },
  {
    id: "programacao-i",
    title: "Programação I",
    professor: "Prof. André Costa",
    progress: 0,
    lessonCount: 14,
    icon: "computer",
    coverUrl: "/disciplines/programacao.jpg",
    href: "/disciplinas/programacao-i",
    year: "2º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [],
  },
  {
    id: "sistemas-digitais",
    title: "Sistemas Digitais",
    professor: "Prof. Filipe Nunes",
    progress: 0,
    lessonCount: 12,
    icon: "computer",
    coverUrl: "/disciplines/sistemas_digitais.jpg",
    href: "/disciplinas/sistemas-digitais",
    year: "2º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [],
  },
  {
    id: "calculo-operacoes-financeiras",
    title: "Cálculo e Operações Financeiras",
    professor: "Prof. Sofia Neto",
    progress: 0,
    lessonCount: 11,
    icon: "calculator",
    coverUrl: "/disciplines/financas.jpg",
    href: "/disciplinas/calculo-operacoes-financeiras",
    year: "2º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [],
  },
  {
    id: "introducao-economia",
    title: "Introdução à Economia",
    professor: "Prof. Luís Rodrigues",
    progress: 0,
    lessonCount: 9,
    icon: "book",
    coverUrl: "/disciplines/economia.jpg",
    href: "/disciplinas/introducao-economia",
    year: "2º Ano",
    semester: "1º Semestre",
    course: "Informática de Gestão Financeira",
    chapters: [],
  },
];

/* ================================================================
   UTILITÁRIOS
   ================================================================ */

/**
 * Devolve as disciplinas do ano, semestre e curso do utilizador.
 * Fase 3: substituir por query Supabase.
 */
export function getDisciplinesForUser(
  year:     string,
  semester: string,
  course:   string
): Discipline[] {
  return mockDisciplines.filter(
    (d) => d.year === year && d.semester === semester && d.course === course
  );
}

export function getDisciplineById(id: string): Discipline | undefined {
  return mockDisciplines.find((d) => d.id === id);
}

/**
 * "Informática de Gestão Financeira" → "IGF"
 */
export function getCourseAbbreviation(course: string): string {
  return course
    .split(" ")
    .filter((word) => word.length > 3)
    .map((word) => word[0].toUpperCase())
    .join("");
}
