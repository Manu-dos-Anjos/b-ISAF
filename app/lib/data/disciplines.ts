export type ContentType = "audio" | "slide" | "quiz";

export type TopicContent = {
  id: string;
  type: ContentType;
  title: string;
  href?: string;
};

export type Topic = {
  id: string;
  title: string;
  contents: TopicContent[];
};

export type Chapter = {
  id: string;
  title: string;
  status: "Concluído" | "Não concluído";
  topics: Topic[];
};

export type Discipline = {
  id: string;
  code: string;
  name: string;
  professor: string;
  year: string;
  semester: string;
  coverUrl?: string;
  chapters: Chapter[];
};

export const disciplines: Discipline[] = [
  {
    id: "fundamentos-de-sistemas-de-informacao",
    code: "FSI101",
    name: "Fundamentos de Sistemas de Informação",
    professor: "Prof. Carlos Mendes",
    year: "1º Ano",
    semester: "1º Semestre",
    coverUrl: "/covers/fsi.jpg",
    chapters: [
      {
        id: "cap-01",
        title: "Capítulo 01: Introdução aos Sistemas de Informação",
        status: "Concluído",
        topics: [
          {
            id: "tema-01",
            title: "O conceito de Sistema de Informação",
            contents: [
              { id: "c1", type: "audio", title: "Áudio - Conceito de SI" },
              { id: "c2", type: "slide", title: "Slides - Conceito de SI" },
              { id: "c3", type: "quiz", title: "Quiz - Conceito de SI" },
            ],
          },
          {
            id: "tema-02",
            title: "Componentes de um Sistema de Informação",
            contents: [
              { id: "c4", type: "audio", title: "Áudio - Componentes" },
              { id: "c5", type: "slide", title: "Slides - Componentes" },
              { id: "c6", type: "quiz", title: "Quiz - Componentes" },
            ],
          },
          {
            id: "tema-03",
            title: "Tipos de Sistemas de Informação",
            contents: [
              { id: "c7", type: "audio", title: "Áudio - Tipos de SI" },
              { id: "c8", type: "slide", title: "Slides - Tipos de SI" },
              { id: "c9", type: "quiz", title: "Quiz - Tipos de SI" },
            ],
          },
          {
            id: "tema-04",
            title: "Benefícios e Desafios dos Sistemas de Informação",
            contents: [
              { id: "c10", type: "audio", title: "Áudio - Benefícios e Desafios" },
              { id: "c11", type: "slide", title: "Slides - Benefícios e Desafios" },
              { id: "c12", type: "quiz", title: "Quiz - Benefícios e Desafios" },
            ],
          },
        ],
      },
      {
        id: "cap-02",
        title: "Capítulo 02: Sistemas de Informação e Organizações",
        status: "Concluído",
        topics: [
          {
            id: "tema-05",
            title: "Relação entre SI e Organizações",
            contents: [
              { id: "c13", type: "audio", title: "Áudio - SI e Organizações" },
              { id: "c14", type: "slide", title: "Slides - SI e Organizações" },
              { id: "c15", type: "quiz", title: "Quiz - SI e Organizações" },
            ],
          },
        ],
      },
      {
        id: "cap-03",
        title: "Capítulo 03: Infraestrutura de TI",
        status: "Não concluído",
        topics: [
          {
            id: "tema-06",
            title: "Hardware, Software e Redes",
            contents: [
              { id: "c16", type: "audio", title: "Áudio - Infraestrutura" },
              { id: "c17", type: "slide", title: "Slides - Infraestrutura" },
              { id: "c18", type: "quiz", title: "Quiz - Infraestrutura" },
            ],
          },
        ],
      },
      {
        id: "cap-04",
        title: "Capítulo 04: Segurança da Informação",
        status: "Não concluído",
        topics: [
          {
            id: "tema-07",
            title: "Riscos e Proteção de Dados",
            contents: [
              { id: "c19", type: "audio", title: "Áudio - Segurança" },
              { id: "c20", type: "slide", title: "Slides - Segurança" },
              { id: "c21", type: "quiz", title: "Quiz - Segurança" },
            ],
          },
        ],
      },
    ],
  },
];

export function getDisciplineById(id: string) {
  return disciplines.find((discipline) => discipline.id === id);
}