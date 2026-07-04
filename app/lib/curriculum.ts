// app/lib/curriculum.ts
// ── Sem "use client" — pode ser importado em qualquer lado ──

export type CourseId =
  | "informatica-gestao-financeira"
  | "contabilidade-financas"
  | "gestao-bancaria-seguros";

export type Discipline = {
  id: string;
  name: string;
  annual?: boolean;
  credits?: number;
  topics?: string[];
};

export type Semester = {
  number: 1 | 2;
  disciplines: Discipline[];
  totalHours: number;
};

export type YearData = {
  year: 1 | 2 | 3 | 4;
  semesters: [Semester, Semester];
};

export type CourseData = {
  id: CourseId;
  name: string;
  years: YearData[];
};

export const CURRICULUM: Record<CourseId, CourseData> = {
  "informatica-gestao-financeira": {
    id: "informatica-gestao-financeira",
    name: "Informática de Gestão Financeira",
    years: [
      {
        year: 1,
        semesters: [
          {
            number: 1,
            totalHours: 768,
            disciplines: [
              { id: "igf-1-1-cpe",  name: "Comunicação Pessoal e Empresarial", annual: true },
              { id: "igf-1-1-li1",  name: "Língua Inglesa I" },
              { id: "igf-1-1-mi",   name: "Métodos de Investigação Científica" },
              { id: "igf-1-1-fsi",  name: "Fundamentos de Sistemas da Informação" },
              { id: "igf-1-1-mat1", name: "Matemática I" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
              { id: "igf-1-2-cg1",  name: "Contabilidade Geral I" },
              { id: "igf-1-2-li2",  name: "Língua Inglesa II" },
              { id: "igf-1-2-iog",  name: "Introdução às Organizações e à Gestão" },
              { id: "igf-1-2-arq",  name: "Arquitetura de Computadores" },
              { id: "igf-1-2-mat2", name: "Matemática II" },
            ],
          },
        ],
      },
      {
        year: 2,
        semesters: [
          {
            number: 1,
            totalHours: 768,
            disciplines: [
              { id: "igf-2-1-cg2",   name: "Contabilidade Geral II" },
              { id: "igf-2-1-prog1", name: "Programação I" },
              { id: "igf-2-1-sd",    name: "Sistemas Digitais" },
              { id: "igf-2-1-cof",   name: "Cálculo e Operações Financeiras" },
              { id: "igf-2-1-ie",    name: "Introdução à Economia" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
              { id: "igf-2-2-co",    name: "Comportamento Organizacional" },
              { id: "igf-2-2-prog2", name: "Programação II" },
              { id: "igf-2-2-bd1",   name: "Base de Dados I" },
              { id: "igf-2-2-cant",  name: "Contabilidade Analítica" },
              { id: "igf-2-2-pe",    name: "Probabilidades e Estatística" },
            ],
          },
        ],
      },
      {
        year: 3,
        semesters: [
          {
            number: 1,
            totalHours: 768,
            disciplines: [
              { id: "igf-3-1-mdsi", name: "Metodologia de Desenvolvimento de Sistemas de Informação" },
              { id: "igf-3-1-fe",   name: "Finanças Empresariais" },
              { id: "igf-3-1-bd2",  name: "Base de Dados II" },
              { id: "igf-3-1-rc",   name: "Redes de Computadores" },
              { id: "igf-3-1-so1",  name: "Sistemas Operativos I" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
              { id: "igf-3-2-qsi", name: "Qualidade de Sistemas de Informação" },
              { id: "igf-3-2-grn", name: "Gestão de Redes Informáticas" },
              { id: "igf-3-2-ds",  name: "Desenvolvimento de Software" },
              { id: "igf-3-2-ltw", name: "Linguagens e Tecnologias Web" },
              { id: "igf-3-2-so2", name: "Sistemas Operativos II" },
            ],
          },
        ],
      },
      {
        year: 4,
        semesters: [
          {
            number: 1,
            totalHours: 1216,
            disciplines: [
              { id: "igf-4-1-di",   name: "Direito Informático" },
              { id: "igf-4-1-sirn", name: "Segurança Informática em Redes de Sistemas" },
              { id: "igf-4-1-tm",   name: "Tecnologias Multimédia" },
              { id: "igf-4-1-fisc", name: "Fiscalidade" },
              { id: "igf-4-1-tfc",  name: "Trabalho Final de Curso", annual: true },
            ],
          },
          {
            number: 2,
            totalHours: 1216,
            disciplines: [
              { id: "igf-4-2-ai",  name: "Auditoria Informática" },
              { id: "igf-4-2-ce",  name: "Comércio Electrónico" },
              { id: "igf-4-2-md",  name: "Marketing Digital" },
              { id: "igf-4-2-grh", name: "Gestão de Recursos Humanos" },
              { id: "igf-4-2-tfc", name: "Trabalho Final de Curso", annual: true },
            ],
          },
        ],
      },
    ],
  },

  "contabilidade-financas": {
    id: "contabilidade-financas",
    name: "Contabilidade e Finanças",
    years: [
      {
        year: 1,
        semesters: [
          {
            number: 1,
            totalHours: 768,
            disciplines: [
              { id: "cf-1-1-cpe",  name: "Comunicação Pessoal e Empresarial", annual: true },
              { id: "cf-1-1-li1",  name: "Língua Inglesa I" },
              { id: "cf-1-1-mi",   name: "Métodos de Investigação Científica" },
              { id: "cf-1-1-ii",   name: "Introdução à Informática" },
              { id: "cf-1-1-mat1", name: "Matemática I" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
              { id: "cf-1-2-cpe",  name: "Comunicação Pessoal e Empresarial", annual: true },
              { id: "cf-1-2-li2",  name: "Língua Inglesa II" },
              { id: "cf-1-2-iog",  name: "Introdução às Organizações e à Gestão" },
              { id: "cf-1-2-cg1",  name: "Contabilidade Geral I" },
              { id: "cf-1-2-mat2", name: "Matemática II" },
            ],
          },
        ],
      },
      {
        year: 2,
        semesters: [
          {
            number: 1,
            totalHours: 768,
            disciplines: [
              { id: "cf-2-1-cg2",  name: "Contabilidade Geral II" },
              { id: "cf-2-1-li3",  name: "Língua Inglesa III" },
              { id: "cf-2-1-me1",  name: "Microeconomia I" },
              { id: "cf-2-1-cof",  name: "Cálculo e Operações Financeiras" },
              { id: "cf-2-1-est1", name: "Estatística I" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
              { id: "cf-2-2-ca",   name: "Contabilidade Analítica" },
              { id: "cf-2-2-li4",  name: "Língua Inglesa IV" },
              { id: "cf-2-2-me2",  name: "Microeconomia II" },
              { id: "cf-2-2-de",   name: "Direito das Empresas" },
              { id: "cf-2-2-est2", name: "Estatística II" },
            ],
          },
        ],
      },
      {
        year: 3,
        semesters: [
          {
            number: 1,
            totalHours: 768,
            disciplines: [
              { id: "cf-3-1-cpco", name: "Contabilidade, Planeamento e Controlo Orçamental" },
              { id: "cf-3-1-mac1", name: "Macroeconomia I" },
              { id: "cf-3-1-dc",   name: "Direito Comercial" },
              { id: "cf-3-1-fin1", name: "Finanças I" },
              { id: "cf-3-1-mkt1", name: "Marketing I" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
              { id: "cf-3-2-fisc", name: "Fiscalidade" },
              { id: "cf-3-2-mac2", name: "Macroeconomia II" },
              { id: "cf-3-2-epe",  name: "Estratégia e Planeamento da Empresa" },
              { id: "cf-3-2-fin2", name: "Finanças II" },
              { id: "cf-3-2-mkt2", name: "Marketing II" },
            ],
          },
        ],
      },
      {
        year: 4,
        semesters: [
          {
            number: 1,
            totalHours: 1216,
            disciplines: [
              { id: "cf-4-1-he",   name: "História Económica" },
              { id: "cf-4-1-grh",  name: "Gestão de Recursos Humanos" },
              { id: "cf-4-1-mpf",  name: "Mercados e Produtos Financeiros" },
              { id: "cf-4-1-caa",  name: "Contabilidade Analítica Avançada" },
              { id: "cf-4-1-tfc",  name: "Trabalho Final de Curso", annual: true },
            ],
          },
          {
            number: 2,
            totalHours: 1216,
            disciplines: [
              { id: "cf-4-2-aef", name: "Análise Económico-Financeira" },
              { id: "cf-4-2-aud", name: "Auditoria" },
              { id: "cf-4-2-eci", name: "Economia e Comércio Internacionais" },
              { id: "cf-4-2-scg", name: "Sistemas de Controlo de Gestão" },
              { id: "cf-4-2-tfc", name: "Trabalho Final de Curso", annual: true },
            ],
          },
        ],
      },
    ],
  },

  "gestao-bancaria-seguros": {
    id: "gestao-bancaria-seguros",
    name: "Gestão Bancária & Seguros",
    years: [
      {
        year: 1,
        semesters: [
          {
            number: 1,
            totalHours: 768,
            disciplines: [
              { id: "gbs-1-1-cpe",  name: "Comunicação Pessoal e Empresarial", annual: true },
              { id: "gbs-1-1-li1",  name: "Língua Inglesa I" },
              { id: "gbs-1-1-mi",   name: "Métodos de Investigação Científica" },
              { id: "gbs-1-1-ii",   name: "Introdução à Informática" },
              { id: "gbs-1-1-mat1", name: "Matemática I" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
              { id: "gbs-1-2-cpe",  name: "Comunicação Pessoal e Empresarial", annual: true },
              { id: "gbs-1-2-li2",  name: "Língua Inglesa II" },
              { id: "gbs-1-2-iog",  name: "Introdução às Organizações e à Gestão" },
              { id: "gbs-1-2-cg1",  name: "Contabilidade Geral I" },
              { id: "gbs-1-2-mat2", name: "Matemática II" },
            ],
          },
        ],
      },
      {
        year: 2,
        semesters: [
          {
            number: 1,
            totalHours: 768,
            disciplines: [
              { id: "gbs-2-1-cg2", name: "Contabilidade Geral II" },
              { id: "gbs-2-1-li3", name: "Língua Inglesa III" },
              { id: "gbs-2-1-est", name: "Estatística" },
              { id: "gbs-2-1-cof", name: "Cálculo e Operações Financeiras" },
              { id: "gbs-2-1-tsi", name: "Tecnologias e Sistemas de Informação" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
              { id: "gbs-2-2-ca",  name: "Contabilidade Analítica" },
              { id: "gbs-2-2-li4", name: "Língua Inglesa IV" },
              { id: "gbs-2-2-co",  name: "Comportamento Organizacional" },
              { id: "gbs-2-2-mpf", name: "Mercados e Produtos Financeiros" },
              { id: "gbs-2-2-irs", name: "Introdução ao Risco e Seguro" },
            ],
          },
        ],
      },
      {
        year: 3,
        semesters: [
          {
            number: 1,
            totalHours: 768,
            disciplines: [
              { id: "gbs-3-1-cpco", name: "Contabilidade, Planeamento e Controlo Orçamental" },
              { id: "gbs-3-1-fe",   name: "Finanças Empresariais" },
              { id: "gbs-3-1-dab",  name: "Direito na Actividade Bancária" },
              { id: "gbs-3-1-agr",  name: "Análise e Gestão de Risco" },
              { id: "gbs-3-1-fcb",  name: "Financiamento e Crédito Bancário" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
              { id: "gbs-3-2-das",  name: "Direito na Actividade Seguradora" },
              { id: "gbs-3-2-opb",  name: "Operações e Prática Bancária" },
              { id: "gbs-3-2-fpf",  name: "Fiscalidade de Produtos Financeiros" },
              { id: "gbs-3-2-aef",  name: "Análise Económico-Financeira" },
              { id: "gbs-3-2-svsa", name: "Seguro de Vida, Saúde e Acidentes" },
            ],
          },
        ],
      },
      {
        year: 4,
        semesters: [
          {
            number: 1,
            totalHours: 1216,
            disciplines: [
              { id: "gbs-4-1-ops",  name: "Operações e Prática Seguradora" },
              { id: "gbs-4-1-grh",  name: "Gestão de Recursos Humanos" },
              { id: "gbs-4-1-eai",  name: "Economia Angolana e Internacional" },
              { id: "gbs-4-1-spnv", name: "Seguros de Propriedade e Não-Vida" },
              { id: "gbs-4-1-tfc",  name: "Trabalho Final de Curso", annual: true },
            ],
          },
          {
            number: 2,
            totalHours: 1216,
            disciplines: [
              { id: "gbs-4-2-afbs", name: "Auditoria Financeira Banca e Seguros" },
              { id: "gbs-4-2-msf",  name: "Marketing de Serviços Financeiros" },
              { id: "gbs-4-2-gapf", name: "Gestão de Activos, Passivos e Fundos de Pensões" },
              { id: "gbs-4-2-scg",  name: "Sistemas de Controlo de Gestão" },
              { id: "gbs-4-2-tfc",  name: "Trabalho Final de Curso", annual: true },
            ],
          },
        ],
      },
    ],
  },
};

/* ── Helpers úteis ── */

/** Devolve todas as disciplinas de um curso/ano/semestre */
export function getSemesterDisciplines(
  courseId: CourseId,
  year: 1 | 2 | 3 | 4,
  semester: 1 | 2
): Discipline[] {
  const course = CURRICULUM[courseId];
  if (!course) return [];
  const yearData = course.years.find((y) => y.year === year);
  if (!yearData) return [];
  const semData = yearData.semesters.find((s) => s.number === semester);
  return semData?.disciplines ?? [];
}

/** Encontra a disciplina pelo id em qualquer curso */
export function findDisciplineById(id: string): Discipline | null {
  for (const course of Object.values(CURRICULUM))
    for (const year of course.years)
      for (const sem of year.semesters)
        for (const disc of sem.disciplines)
          if (disc.id === id) return disc;
  return null;
}