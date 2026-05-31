// app/components/meu-curso/MeuCursoPage.tsx
"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  type ElementType,
  type ComponentType,
  type ReactNode,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  X,
  GraduationCap,
  Calendar,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  Circle,
  Layers,
  Info,
  Phone,
  Mail,
  MapPin,
  Plus,
  Loader2,
  Edit3,
} from "lucide-react";
import {
  useDisciplineStudyPlan,
} from "@/app/lib/hooks/useDisciplineStudyPlan";
import { useSchedule } from "@/app/lib/hooks/useSchedule";
import { useScheduleReset } from "@/app/lib/hooks/useScheduleReset";

/* ================================================================
   SCROLLBAR CLASSES
================================================================ */

/** Scrollbar vertical — usada nos painéis com overflow-y */
const SCROLLBAR_Y = [
  "scrollbar-thin",
  "scrollbar-track-transparent",
  "[&::-webkit-scrollbar]:w-1.5",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-slate-700/40",
  "hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/60",
].join(" ");

/** Scrollbar horizontal — usada nos chips e na tabela */
const SCROLLBAR_X = [
  "scrollbar-thin",
  "scrollbar-track-transparent",
  "[&::-webkit-scrollbar]:h-1",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-slate-700/40",
  "hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/60",
].join(" ");

/* ================================================================
   TIPOS
================================================================ */

export type CourseId =
  | "informatica-gestao-financeira"
  | "contabilidade-financas"
  | "gestao-bancaria-seguros";

export type DisciplineStatus = "current" | "completed" | "upcoming";

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

export type WeeklySlot = {
  id: string;
  day: "Segunda" | "Terça" | "Quarta" | "Quinta" | "Sexta" | "Sábado";
  startTime: string;
  endTime: string;
  discipline: string;
  disciplineSlug?: string;
  room?: string;
  professor?: string;
  type: "Teórica" | "Prática" | "Teórico-Prática";
};

type ManualSlot = {
  day: string;
  periodKey: string;
  disciplineName: string;
  room: string;
  professor: string;
  type: string;
};

/* ================================================================
   HORÁRIOS FIXOS DO ISAF
================================================================ */

type FixedPeriod = {
  key: string;
  startTime: string;
  endTime: string;
  label: string;
  group: "manha" | "tarde" | "noite";
};

const FIXED_PERIODS: FixedPeriod[] = [
  { key: "07:30-08:20", startTime: "07:30", endTime: "08:20", label: "07:30 – 08:20", group: "manha" },
  { key: "08:20-09:10", startTime: "08:20", endTime: "09:10", label: "08:20 – 09:10", group: "manha" },
  { key: "09:20-10:10", startTime: "09:20", endTime: "10:10", label: "09:20 – 10:10", group: "manha" },
  { key: "10:10-11:00", startTime: "10:10", endTime: "11:00", label: "10:10 – 11:00", group: "manha" },
  { key: "11:10-12:00", startTime: "11:10", endTime: "12:00", label: "11:10 – 12:00", group: "manha" },
  { key: "12:00-12:50", startTime: "12:00", endTime: "12:50", label: "12:00 – 12:50", group: "manha" },
  { key: "13:00-13:50", startTime: "13:00", endTime: "13:50", label: "13:00 – 13:50", group: "tarde" },
  { key: "13:50-14:40", startTime: "13:50", endTime: "14:40", label: "13:50 – 14:40", group: "tarde" },
  { key: "14:50-15:40", startTime: "14:50", endTime: "15:40", label: "14:50 – 15:40", group: "tarde" },
  { key: "15:40-16:30", startTime: "15:40", endTime: "16:30", label: "15:40 – 16:30", group: "tarde" },
  { key: "16:40-17:30", startTime: "16:40", endTime: "17:30", label: "16:40 – 17:30", group: "tarde" },
  { key: "18:00-18:45", startTime: "18:00", endTime: "18:45", label: "18:00 – 18:45", group: "noite" },
  { key: "18:45-19:30", startTime: "18:45", endTime: "19:30", label: "18:45 – 19:30", group: "noite" },
  { key: "19:40-20:25", startTime: "19:40", endTime: "20:25", label: "19:40 – 20:25", group: "noite" },
  { key: "20:30-21:15", startTime: "20:30", endTime: "21:15", label: "20:30 – 21:15", group: "noite" },
  { key: "21:15-22:00", startTime: "21:15", endTime: "22:00", label: "21:15 – 22:00", group: "noite" },
  { key: "22:05-22:50", startTime: "22:05", endTime: "22:50", label: "22:05 – 22:50", group: "noite" },
];

function getPeriodByKey(key: string): FixedPeriod | undefined {
  return FIXED_PERIODS.find((p) => p.key === key);
}

/* ================================================================
   MAPA DE SLUGS
================================================================ */
const DISCIPLINE_SLUGS: Record<string, string> = {
  "igf-1-1-cpe": "comunicacao-pessoal-e-empresarial",
  "igf-1-1-li1": "lingua-inglesa-i",
  "igf-1-1-mi": "metodologias-de-investigacao-cientifica",
  "igf-1-1-fsi": "fundamentos-de-sistemas-de-informacao",
  "igf-1-1-mat1": "matematica-i",
  "igf-1-2-cg1": "contabilidade-geral-i",
  "igf-1-2-li2": "lingua-inglesa-ii",
  "igf-1-2-iog": "introducao-as-organizacoes-e-a-gestao",
  "igf-1-2-arq": "arquitetura-de-computadores",
  "igf-1-2-mat2": "matematica-ii",
  "igf-2-1-cg2": "contabilidade-geral-ii",
  "igf-2-1-prog1": "programacao-i",
  "igf-2-1-sd": "sistemas-digitais",
  "igf-2-1-cof": "calculo-e-operacoes-financeiras",
  "igf-2-1-ie": "introducao-a-economia",
  "igf-2-2-co": "comportamento-organizacional",
  "igf-2-2-prog2": "programacao-ii",
  "igf-2-2-bd1": "base-de-dados-i",
  "igf-2-2-cant": "contabilidade-analitica",
  "igf-2-2-pe": "probabilidades-e-estatistica",
  "igf-3-1-mdsi": "metodologia-de-desenvolvimento-de-sistemas-de-informacao",
  "igf-3-1-fe": "financas-empresariais",
  "igf-3-1-bd2": "base-de-dados-ii",
  "igf-3-1-rc": "redes-de-computadores",
  "igf-3-1-so1": "sistemas-operativos-i",
  "igf-3-2-qsi": "qualidade-de-sistemas-de-informacao",
  "igf-3-2-grn": "gestao-de-redes-informaticas",
  "igf-3-2-ds": "desenvolvimento-de-software",
  "igf-3-2-ltw": "linguagens-e-tecnologias-web",
  "igf-3-2-so2": "sistemas-operativos-ii",
  "igf-4-1-di": "direito-informatico",
  "igf-4-1-sirn": "seguranca-informatica-em-redes-de-sistemas",
  "igf-4-1-tm": "tecnologias-multimedia",
  "igf-4-1-fisc": "fiscalidade",
  "igf-4-1-tfc": "trabalho-final-de-curso",
  "igf-4-2-ai": "auditoria-informatica",
  "igf-4-2-ce": "comercio-electronico",
  "igf-4-2-md": "marketing-digital",
  "igf-4-2-grh": "gestao-de-recursos-humanos",
  "igf-4-2-tfc": "trabalho-final-de-curso",
  "cf-1-1-cpe": "comunicacao-pessoal-e-empresarial",
  "cf-1-1-li1": "lingua-inglesa-i",
  "cf-1-1-mi": "metodologias-de-investigacao-cientifica",
  "cf-1-1-ii": "introducao-a-informatica",
  "cf-1-1-mat1": "matematica-i",
  "cf-1-2-cpe": "comunicacao-pessoal-e-empresarial",
  "cf-1-2-li2": "lingua-inglesa-ii",
  "cf-1-2-iog": "introducao-as-organizacoes-e-a-gestao",
  "cf-1-2-cg1": "contabilidade-geral-i",
  "cf-1-2-mat2": "matematica-ii",
  "cf-2-1-cg2": "contabilidade-geral-ii",
  "cf-2-1-li3": "lingua-inglesa-iii",
  "cf-2-1-me1": "microeconomia-i",
  "cf-2-1-cof": "calculo-e-operacoes-financeiras",
  "cf-2-1-est1": "estatistica-i",
  "cf-2-2-ca": "contabilidade-analitica",
  "cf-2-2-li4": "lingua-inglesa-iv",
  "cf-2-2-me2": "microeconomia-ii",
  "cf-2-2-de": "direito-das-empresas",
  "cf-2-2-est2": "estatistica-ii",
  "cf-3-1-cpco": "contabilidade-planeamento-e-controlo-orcamental",
  "cf-3-1-mac1": "macroeconomia-i",
  "cf-3-1-dc": "direito-comercial",
  "cf-3-1-fin1": "financas-i",
  "cf-3-1-mkt1": "marketing-i",
  "cf-3-2-fisc": "fiscalidade",
  "cf-3-2-mac2": "macroeconomia-ii",
  "cf-3-2-epe": "estrategia-e-planeamento-da-empresa",
  "cf-3-2-fin2": "financas-ii",
  "cf-3-2-mkt2": "marketing-ii",
  "cf-4-1-he": "historia-economica",
  "cf-4-1-grh": "gestao-de-recursos-humanos",
  "cf-4-1-mpf": "mercados-e-produtos-financeiros",
  "cf-4-1-caa": "contabilidade-analitica-avancada",
  "cf-4-1-tfc": "trabalho-final-de-curso",
  "cf-4-2-aef": "analise-economico-financeira",
  "cf-4-2-aud": "auditoria",
  "cf-4-2-eci": "economia-e-comercio-internacionais",
  "cf-4-2-scg": "sistemas-de-controlo-de-gestao",
  "cf-4-2-tfc": "trabalho-final-de-curso",
  "gbs-1-1-cpe": "comunicacao-pessoal-e-empresarial",
  "gbs-1-1-li1": "lingua-inglesa-i",
  "gbs-1-1-mi": "metodologias-de-investigacao-cientifica",
  "gbs-1-1-ii": "introducao-a-informatica",
  "gbs-1-1-mat1": "matematica-i",
  "gbs-1-2-cpe": "comunicacao-pessoal-e-empresarial",
  "gbs-1-2-li2": "lingua-inglesa-ii",
  "gbs-1-2-iog": "introducao-as-organizacoes-e-a-gestao",
  "gbs-1-2-cg1": "contabilidade-geral-i",
  "gbs-1-2-mat2": "matematica-ii",
  "gbs-2-1-cg2": "contabilidade-geral-ii",
  "gbs-2-1-li3": "lingua-inglesa-iii",
  "gbs-2-1-est": "estatistica",
  "gbs-2-1-cof": "calculo-e-operacoes-financeiras",
  "gbs-2-1-tsi": "tecnologias-e-sistemas-de-informacao",
  "gbs-2-2-ca": "contabilidade-analitica",
  "gbs-2-2-li4": "lingua-inglesa-iv",
  "gbs-2-2-co": "comportamento-organizacional",
  "gbs-2-2-mpf": "mercados-e-produtos-financeiros",
  "gbs-2-2-irs": "introducao-ao-risco-e-seguro",
  "gbs-3-1-cpco": "contabilidade-planeamento-e-controlo-orcamental",
  "gbs-3-1-fe": "financas-empresariais",
  "gbs-3-1-dab": "direito-na-actividade-bancaria",
  "gbs-3-1-agr": "analise-e-gestao-de-risco",
  "gbs-3-1-fcb": "financiamento-e-credito-bancario",
  "gbs-3-2-das": "direito-na-actividade-seguradora",
  "gbs-3-2-opb": "operacoes-e-pratica-bancaria",
  "gbs-3-2-fpf": "fiscalidade-de-produtos-financeiros",
  "gbs-3-2-aef": "analise-economico-financeira",
  "gbs-3-2-svsa": "seguro-de-vida-saude-e-acidentes",
  "gbs-4-1-ops": "operacoes-e-pratica-seguradora",
  "gbs-4-1-grh": "gestao-de-recursos-humanos",
  "gbs-4-1-eai": "economia-angolana-e-internacional",
  "gbs-4-1-spnv": "seguros-de-propriedade-e-nao-vida",
  "gbs-4-1-tfc": "trabalho-final-de-curso",
  "gbs-4-2-afbs": "auditoria-financeira-banca-e-seguros",
  "gbs-4-2-msf": "marketing-de-servicos-financeiros",
  "gbs-4-2-gapf": "gestao-de-activos-passivos-e-fundos-de-pensoes",
  "gbs-4-2-scg": "sistemas-de-controlo-de-gestao",
  "gbs-4-2-tfc": "trabalho-final-de-curso",
};

function getDisciplineSlug(id: string): string {
  return DISCIPLINE_SLUGS[id] ?? id;
}

/* ================================================================
   DADOS CURRICULARES
================================================================ */
const CURRICULUM: Record<CourseId, CourseData> = {
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
              { id: "igf-1-1-mi",   name: "Metodologias de Investigação Científica" },
              { id: "igf-1-1-fsi",  name: "Fundamentos de Sistemas de Informação" },
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
              { id: "cf-1-1-mi",   name: "Metodologias de Investigação Científica" },
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
              { id: "cf-4-1-he",  name: "História Económica" },
              { id: "cf-4-1-grh", name: "Gestão de Recursos Humanos" },
              { id: "cf-4-1-mpf", name: "Mercados e Produtos Financeiros" },
              { id: "cf-4-1-caa", name: "Contabilidade Analítica Avançada" },
              { id: "cf-4-1-tfc", name: "Trabalho Final de Curso", annual: true },
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
              { id: "gbs-1-1-mi",   name: "Metodologias de Investigação Científica" },
              { id: "gbs-1-1-ii",   name: "Introdução à Informática" },
              { id: "gbs-1-1-mat1", name: "Matemática I" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
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

/* ================================================================
   CONSTANTES
================================================================ */
const DAYS_ORDER = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

const TYPE_COLORS: Record<WeeklySlot["type"], string> = {
  Teórica:           "border-blue-500/30 bg-blue-500/10 text-blue-300",
  Prática:           "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Teórico-Prática": "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

const DAY_LABELS: Record<WeeklySlot["day"], string> = {
  Segunda: "Segunda-Feira",
  Terça:   "Terça-Feira",
  Quarta:  "Quarta-Feira",
  Quinta:  "Quinta-Feira",
  Sexta:   "Sexta-Feira",
  Sábado:  "Sábado",
};

/* ================================================================
   HELPERS
================================================================ */
function getDisciplineCodeFromId(id: string): string {
  const parts = id.split("-");
  return parts[parts.length - 1].toUpperCase();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string }
) {
  return (
    timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(a.endTime) > timeToMinutes(b.startTime)
  );
}

function getDisciplineShortName(name: string) {
  const normalized = normalizeText(name);
  const overrides: Record<string, string> = {
    "comunicacao pessoal e empresarial": "CPE",
    "fundamentos de sistemas da informacao": "Fund SI",
    "metodologias de investigacao cientifica": "Met. Inv.",
    "matematica i": "Matem I",
    "matematica ii": "Matem II",
    "lingua inglesa i": "Inglês I",
    "lingua inglesa ii": "Inglês II",
    "lingua inglesa iii": "Inglês III",
    "lingua inglesa iv": "Inglês IV",
    "contabilidade geral i": "CG I",
    "contabilidade geral ii": "CG II",
    "contabilidade analitica": "Cont. Analítica",
    "programacao i": "Prog. I",
    "programacao ii": "Prog. II",
    "sistemas digitais": "Sist. Digitais",
    "base de dados i": "BD I",
    "base de dados ii": "BD II",
    "sistemas operativos i": "SO I",
    "sistemas operativos ii": "SO II",
    "redes de computadores": "Redes Comp.",
    "tecnologias e sistemas de informacao": "TSI",
    "introducao a informatica": "Intro. Inform.",
    "introducao a economia": "Intro. Econ.",
    "comportamento organizacional": "Comport. Org.",
    "calculo e operacoes financeiras": "COF",
    "probabilidades e estatistica": "Prob. e Est.",
    "microeconomia i": "Microecon. I",
    "microeconomia ii": "Microecon. II",
    "direito das empresas": "Dir. Empresas",
    "direito comercial": "Dir. Com.",
    "financas i": "Fin. I",
    "financas ii": "Fin. II",
    "marketing i": "Mkt. I",
    "marketing ii": "Mkt. II",
    "historia economica": "Hist. Econ.",
    "mercados e produtos financeiros": "Merc. e Prod. Fin.",
    "analise economico financeira": "AEF",
    "fiscalidade": "Fisc.",
    "auditoria": "Aud.",
    "economia e comercio internacionais": "ECI",
    "sistemas de controlo de gestao": "SCG",
    "direito informatico": "Dir. Inf.",
    "seguranca informatica em redes de sistemas": "SIRS",
    "tecnologias multimedia": "Multimédia",
    "auditoria informatica": "Aud. Inf.",
    "comercio electronico": "E-commerce",
    "marketing digital": "Mkt. Digital",
    "gestao de recursos humanos": "GRH",
    "contabilidade planeamento e controlo orcamental": "CPCO",
    "gestao de activos passivos e fundos de pensoes": "GAPF",
    "economia angolana e internacional": "EAI",
    "seguros de propriedade e nao vida": "SPNV",
    "auditoria financeira banca e seguros": "AFBS",
    "marketing de servicos financeiros": "MSF",
    "operacoes e pratica bancaria": "OPB",
    "operacoes e pratica seguradora": "OPS",
    "financiamento e credito bancario": "FCB",
    "fiscalidade de produtos financeiros": "FPF",
    "seguro de vida saude e acidentes": "SVSA",
    "analise e gestao de risco": "AGR",
    "introducao ao risco e seguro": "IRS",
    "estrategia e planeamento da empresa": "EPE",
    "macroeconomia i": "Macro I",
    "macroeconomia ii": "Macro II",
    "estatistica i": "Est. I",
    "estatistica ii": "Est. II",
    "estatistica": "Est.",
    "financas empresariais": "Fin. Emp.",
    "contabilidade analitica avancada": "CAA",
    "direito na actividade bancaria": "DAB",
    "direito na actividade seguradora": "DAS",
    "introducao as organizacoes e a gestao": "IOG",
    "arquitetura de computadores": "Arq. Comp.",
    "trabalho final de curso": "TFC",
    "metodologia de desenvolvimento de sistemas de informacao": "MDSI",
    "qualidade de sistemas de informacao": "QSI",
    "gestao de redes informaticas": "GRN",
    "desenvolvimento de software": "Dev. Software",
    "linguagens e tecnologias web": "LTW",
  };

  if (overrides[normalized]) return overrides[normalized];
  if (name.length <= 16) return name;

  const stopWords = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os"]);
  const roman = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i;
  const words = name.split(/[\s,/-]+/).filter(Boolean);
  const initials = words
    .filter((w) => !stopWords.has(normalizeText(w)))
    .map((w) => (roman.test(w) ? w.toUpperCase() : w[0].toUpperCase()))
    .join("");

  if (initials.length >= 2) return initials;
  return `${name.slice(0, 12)}…`;
}

function resolveDisciplineSlugFromScheduleName(name: string, course: CourseData) {
  const normalizedName = normalizeText(name);
  for (const year of course.years) {
    for (const sem of year.semesters) {
      for (const disc of sem.disciplines) {
        const full  = normalizeText(disc.name);
        const short = normalizeText(getDisciplineShortName(disc.name));
        if (
          normalizedName === full ||
          normalizedName === short ||
          normalizedName.includes(full) ||
          full.includes(normalizedName)
        ) {
          return getDisciplineSlug(disc.id);
        }
      }
    }
  }
  return null;
}

function getCellSlot(
  mySchedule: WeeklySlot[],
  day: WeeklySlot["day"],
  period: FixedPeriod
) {
  const daySlots = mySchedule.filter((slot) => slot.day === day);
  const exact = daySlots.find(
    (slot) => slot.startTime === period.startTime && slot.endTime === period.endTime
  );
  if (exact) return exact;
  return daySlots.find((slot) => overlaps(slot, period)) ?? null;
}

function getActivePeriods(mySchedule: WeeklySlot[]): FixedPeriod[] {
  if (mySchedule.length === 0) return FIXED_PERIODS;
  const usedKeys = new Set(mySchedule.map((s) => `${s.startTime}-${s.endTime}`));
  return FIXED_PERIODS.filter((p) => {
    if (usedKeys.has(p.key)) return true;
    return mySchedule.some((s) => overlaps(s, p));
  });
}

/* ================================================================
   TABS
================================================================ */
type Tab = "curriculo" | "horario" | "mudanca";
type ScheduleMode = "view" | "manual";

/* ================================================================
   TIPOS INTERNOS
================================================================ */
type GridCell = {
  disciplineId: string;
  room: string;
  professor: string;
  type: WeeklySlot["type"];
};
type GridKey = string;

/* ================================================================
   PROPS
================================================================ */
type Props = {
  courseId: CourseId;
  currentYear: 1 | 2 | 3 | 4;
  currentSemester: 1 | 2;
  studentName: string;
  studentNumber?: string | null;
};

const COURSE_UUIDS: Record<CourseId, string> = {
  "informatica-gestao-financeira": "60313e51-2b89-4c1d-9737-6606c9d5e999",
  "contabilidade-financas":        "4c41b444-b985-40e0-8449-bdf3156cf3ab",
  "gestao-bancaria-seguros":       "724e59d4-8acb-4235-9698-18a325f4ffe5",
};

/* ================================================================
   COMPONENTE PRINCIPAL
================================================================ */
export default function MeuCursoPage({
  courseId = "informatica-gestao-financeira",
  currentYear = 1,
  currentSemester = 1,
  studentName = "Estudante",
  studentNumber,
}: Props) {
  useScheduleReset();
  const course = CURRICULUM[courseId];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── URL state ──────────────────────────────────────────────
  const tabFromUrl  = (searchParams.get("tab")  as Tab)          ?? "curriculo";
  const modeParam   = searchParams.get("mode");
  const modeFromUrl : ScheduleMode = modeParam === "manual" ? "manual" : "view";

  const [activeTab,    setActiveTabState]    = useState<Tab>(tabFromUrl);
  const [scheduleMode, setScheduleModeState] = useState<ScheduleMode>(modeFromUrl);

  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.delete("mode");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setScheduleMode = (mode: ScheduleMode) => {
    setScheduleModeState(mode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", mode);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // ── Currículo state ────────────────────────────────────────
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([currentYear]));
  const disciplinePanelRef = useRef<HTMLDivElement | null>(null);

  // ── Horário (Supabase) ─────────────────────────────────────
  const {
    schedule:  mySchedule,
    isLoading: scheduleLoading,
    isSaving:  scheduleSaving,
    error:     scheduleError,
    saveSchedule,
  } = useSchedule();

  // ── Editor manual state ────────────────────────────────────
  const [manualGrid,        setManualGrid]        = useState<Record<GridKey, GridCell>>({});
  const [globalRoom,        setGlobalRoom]        = useState<string>("S.03");
  const [manualPeriodGroup, setManualPeriodGroup] = useState<FixedPeriod["group"]>("tarde");

  // ── Disciplinas do semestre actual ─────────────────────────
  const currentSemesterDisciplines = useMemo(() => {
    const yearData = course.years.find((y) => y.year === currentYear);
    if (!yearData) return [];
    const semData  = yearData.semesters.find((s) => s.number === currentSemester);
    return semData?.disciplines ?? [];
  }, [course, currentYear, currentSemester]);

  const filteredPeriods = useMemo(
    () => FIXED_PERIODS.filter((p) => p.group === manualPeriodGroup),
    [manualPeriodGroup]
  );

  // ── Disciplina seleccionada ────────────────────────────────
  const selectedDiscipline = useMemo(() => {
    if (!selectedDisciplineId) return null;
    for (const year of course.years) {
      for (const sem of year.semesters) {
        const found = sem.disciplines.find((d) => d.id === selectedDisciplineId);
        if (found) return { discipline: found, year: year.year, semester: sem.number };
      }
    }
    return null;
  }, [selectedDisciplineId, course]);

  useEffect(() => {
    if (!selectedDiscipline || !disciplinePanelRef.current) return;
    const NAVBAR_OFFSET = 88;
    const id = window.setTimeout(() => {
      const panel = disciplinePanelRef.current;
      if (!panel) return;
      const top = panel.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
    }, 100);
    return () => window.clearTimeout(id);
  }, [selectedDiscipline]);

  // ── Helpers currículo ──────────────────────────────────────
  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const getDisciplineStatus = (year: number, semester: number): DisciplineStatus => {
    if (year < currentYear) return "completed";
    if (year === currentYear && semester < currentSemester) return "completed";
    if (year === currentYear && semester === currentSemester) return "current";
    return "upcoming";
  };

  const statusIcon = (status: DisciplineStatus) => {
    switch (status) {
      case "completed": return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />;
      case "current":   return <Circle size={14} className="text-blue-400 shrink-0 fill-blue-400/30" />;
      case "upcoming":  return <Circle size={14} className="text-slate-500 shrink-0" />;
    }
  };

  const statusLabel: Record<DisciplineStatus, string> = {
    completed: "Concluída",
    current:   "Em curso",
    upcoming:  "A frequentar",
  };

  const goToDiscipline = (disciplineId: string) =>
    router.push(`/disciplinas/${disciplineId}`);

  const goToScheduleDiscipline = (slot: WeeklySlot) => {
    const resolved = slot.disciplineSlug
      ? getDisciplineSlug(slot.disciplineSlug)
      : resolveDisciplineSlugFromScheduleName(slot.discipline, course);
    if (resolved) router.push(`/disciplinas/${resolved}`);
  };

  // ── Grid helpers ───────────────────────────────────────────
  const getGridCell = (day: string, periodKey: string): GridCell => {
    const key: GridKey = `${day}|${periodKey}`;
    return manualGrid[key] ?? {
      disciplineId: "",
      room:         globalRoom,
      professor:    "",
      type:         "Teórica",
    };
  };

  const updateGridCell = (
    day: string,
    periodKey: string,
    field: keyof GridCell,
    value: string
  ) => {
    const key: GridKey = `${day}|${periodKey}`;
    setManualGrid((prev) => {
      const existing = prev[key] ?? {
        disciplineId: "",
        room:         globalRoom,
        professor:    "",
        type:         "Teórica",
      };
      return { ...prev, [key]: { ...existing, [field]: value } };
    });
  };

  const handleGlobalRoomChange = (newRoom: string) => {
    setGlobalRoom(newRoom);
    setManualGrid((prev) => {
      const next = { ...prev };
      for (const key in next) {
        if (!next[key].room || next[key].room === globalRoom) {
          next[key] = { ...next[key], room: newRoom };
        }
      }
      return next;
    });
  };

  const applyBlockToGrid = (
    day: string,
    periodKey: string,
    cell: GridCell,
    length: number
  ) => {
    const startIndex = filteredPeriods.findIndex((p) => p.key === periodKey);
    if (startIndex < 0) return;
    setManualGrid((prev) => {
      const next = { ...prev };
      for (let i = 0; i < length; i++) {
        const period = filteredPeriods[startIndex + i];
        if (!period) break;
        const key: GridKey = `${day}|${period.key}`;
        next[key] = {
          disciplineId: cell.disciplineId,
          room:         cell.room || globalRoom,
          professor:    cell.professor,
          type:         cell.type,
        };
      }
      return next;
    });
  };

  // ── Guardar horário no Supabase ────────────────────────────
  const saveManual = async () => {
    const slots: WeeklySlot[] = [];
    let counter = 0;
    for (const [key, cell] of Object.entries(manualGrid)) {
      if (!cell.disciplineId) continue;
      const [day, periodKey] = key.split("|");
      const period = getPeriodByKey(periodKey);
      const disc   = currentSemesterDisciplines.find((d) => d.id === cell.disciplineId);
      if (!period || !disc) continue;
      slots.push({
        id:             `manual-${counter++}`,
        day:            day as WeeklySlot["day"],
        startTime:      period.startTime,
        endTime:        period.endTime,
        discipline:     disc.name,
        disciplineSlug: getDisciplineSlug(disc.id),
        room:           cell.room || globalRoom,
        professor:      cell.professor,
        type:           cell.type,
      });
    }
    try {
      await saveSchedule(slots);
      setScheduleMode("view");
    } catch {
      // scheduleError já contém a mensagem
    }
  };

  // ── Computed ───────────────────────────────────────────────
  const scheduleByDay = useMemo(() => {
    const map: Record<string, WeeklySlot[]> = {};
    for (const day of DAYS_ORDER) map[day] = [];
    for (const slot of mySchedule) {
      if (map[slot.day]) map[slot.day].push(slot);
    }
    return map;
  }, [mySchedule]);

  const activePeriods = useMemo(() => getActivePeriods(mySchedule), [mySchedule]);

  const scheduleProfessors = useMemo(() => {
    const map = new Map<string, { discipline: string; professor: string; room?: string }>();
    for (const slot of mySchedule) {
      if (!slot.professor) continue;
      const key = normalizeText(slot.discipline);
      if (!map.has(key)) {
        map.set(key, { discipline: slot.discipline, professor: slot.professor, room: slot.room });
      }
    }
    return Array.from(map.values());
  }, [mySchedule]);

  const progress = Math.round(
    (((currentYear - 1) * 2 + (currentSemester - 1)) / 8) * 100
  );

  const filledCellCount = Object.values(manualGrid).filter((c) => c.disciplineId).length;

  // ── Estilos partilhados ────────────────────────────────────
  const selectSm =
    "w-full appearance-none rounded-md border border-white/15 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 " +
    "focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition";

  const SelectWrap = ({
    children,
    className = "",
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <div className={`relative ${className}`}>
      {children}
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );

  /* ==============================================================
     RENDER
  ============================================================== */
  return (
    <div className="space-y-6">

      {/* ── Erro de horário ── */}
      {scheduleError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={15} className="shrink-0" />
          <span>{scheduleError}</span>
        </div>
      )}

      {/* ── Cabeçalho ── */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-5 md:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-slate-950/80 to-slate-950" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Meu Curso
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
              {course.name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">{studentName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <GraduationCap size={14} className="text-indigo-400" />
                {currentYear}º Ano · {currentSemester}º Semestre
              </span>
              {studentNumber && (
                <span className="flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-400" />
                  Nº {studentNumber}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
              Progresso
            </p>
            <p className="text-3xl font-bold text-white">
              {progress}
              <span className="text-base font-medium text-slate-400">%</span>
            </p>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative z-10 mt-5 flex gap-1 rounded-xl bg-white/5 p-1">
          {(["curriculo", "horario", "mudanca"] as Tab[]).map((tab) => {
            const labels: Record<Tab, string> = {
              curriculo: "Grelha Curricular",
              horario:   "Horário Semanal",
              mudanca:   "Mudar de Curso",
            };
            const icons: Record<Tab, ElementType> = {
              curriculo: Layers,
              horario:   Calendar,
              mudanca:   RefreshCw,
            };
            const Icon = icons[tab];
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{labels[tab]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TAB: GRELHA CURRICULAR
      ══════════════════════════════════════════ */}
      {activeTab === "curriculo" && (
        <div className="space-y-4">
          {course.years.map((yearData) => {
            const isCurrentYear = yearData.year === currentYear;
            const isExpanded    = expandedYears.has(yearData.year);
            const isCompleted   = yearData.year < currentYear;

            return (
              <div
                key={yearData.year}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isCurrentYear
                    ? "border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                    : "border-white/10"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleYear(yearData.year)}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition ${
                    isCurrentYear
                      ? "bg-indigo-950/60"
                      : isCompleted
                      ? "bg-emerald-950/20"
                      : "bg-slate-950/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                        isCurrentYear
                          ? "bg-indigo-600 text-white"
                          : isCompleted
                          ? "bg-emerald-600/30 text-emerald-400"
                          : "bg-white/5 text-slate-400"
                      }`}
                    >
                      {yearData.year}
                    </div>
                    <div>
                      <p className={`font-semibold ${isCurrentYear ? "text-white" : "text-slate-300"}`}>
                        {yearData.year}º Ano
                        {isCurrentYear && (
                          <span className="ml-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                            Ano Corrente
                          </span>
                        )}
                        {isCompleted && (
                          <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            Concluído
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        Carga horária: {yearData.semesters[0].totalHours}h
                      </p>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronDown  size={16} className="text-slate-400" />
                    : <ChevronRight size={16} className="text-slate-400" />
                  }
                </button>

                {isExpanded && (
                  <div className="grid divide-y divide-white/5 bg-slate-950/30 md:grid-cols-2 md:divide-x md:divide-y-0">
                    {yearData.semesters.map((sem) => {
                      const semStatus    = getDisciplineStatus(yearData.year, sem.number);
                      const isSemCurrent = semStatus === "current";
                      return (
                        <div key={sem.number} className="p-4">
                          <div
                            className={`mb-3 flex items-center gap-2 border-b pb-2 ${
                              isSemCurrent ? "border-indigo-500/30" : "border-white/5"
                            }`}
                          >
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${
                                isSemCurrent ? "bg-indigo-400" : "bg-slate-600"
                              }`}
                            />
                            <p
                              className={`text-xs font-semibold uppercase tracking-wider ${
                                isSemCurrent ? "text-indigo-400" : "text-slate-500"
                              }`}
                            >
                              {sem.number}º Semestre
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            {sem.disciplines.map((disc) => {
                              const discStatus = getDisciplineStatus(yearData.year, sem.number);
                              const isSelected = selectedDisciplineId === disc.id;
                              const isCurrent  = discStatus === "current";
                              return (
                                <button
                                  key={disc.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedDisciplineId(isSelected ? null : disc.id)
                                  }
                                  className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                                    isSelected
                                      ? "bg-indigo-600/20 ring-1 ring-indigo-500/40"
                                      : isCurrent
                                      ? "hover:bg-indigo-950/40"
                                      : "hover:bg-white/5"
                                  }`}
                                >
                                  {statusIcon(discStatus)}
                                  <span
                                    className={`flex-1 leading-snug ${
                                      isSelected ? "text-indigo-200" : "text-slate-300"
                                    }`}
                                  >
                                    {disc.name}
                                    {disc.annual && (
                                      <span className="ml-1.5 text-[10px] text-slate-500">
                                        (Anual)
                                      </span>
                                    )}
                                  </span>
                                  <ChevronRight
                                    size={12}
                                    className={`shrink-0 transition-transform ${
                                      isSelected
                                        ? "rotate-90 text-indigo-400"
                                        : "text-slate-600 group-hover:text-slate-400"
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isExpanded &&
                  selectedDiscipline &&
                  selectedDiscipline.year === yearData.year && (
                    <div ref={disciplinePanelRef}>
                      <DisciplinePanel
                        discipline={selectedDiscipline.discipline}
                        year={selectedDiscipline.year}
                        semester={selectedDiscipline.semester}
                        status={getDisciplineStatus(
                          selectedDiscipline.year,
                          selectedDiscipline.semester
                        )}
                        courseId={courseId}
                        onClose={() => setSelectedDisciplineId(null)}
                        onGoToDiscipline={goToDiscipline}
                      />
                    </div>
                  )}
              </div>
            );
          })}

          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[11px] text-slate-500">
            <span className="font-medium text-slate-400">Legenda:</span>
            {(["completed", "current", "upcoming"] as DisciplineStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                {statusIcon(s)}
                {statusLabel[s]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: HORÁRIO SEMANAL
      ══════════════════════════════════════════ */}
      {activeTab === "horario" && (
        <div className="space-y-4">
          {scheduleLoading ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 size={20} className="animate-spin text-indigo-400" />
              <p className="text-sm text-slate-400">A carregar horário…</p>
            </div>
          ) : scheduleMode === "view" ? (
            <>
              {mySchedule.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-10 text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-slate-600" />
                  <p className="text-lg font-semibold text-slate-300">
                    Ainda não tens horário configurado
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Preenche o teu horário manualmente
                  </p>
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => { setManualGrid({}); setScheduleMode("manual"); }}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                    >
                      <Plus size={16} /> Criar horário manualmente
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const newGrid: Record<GridKey, GridCell> = {};
                        for (const slot of mySchedule) {
                          const periodKey = `${slot.startTime}-${slot.endTime}`;
                          const key: GridKey = `${slot.day}|${periodKey}`;
                          const disc = currentSemesterDisciplines.find(
                            (d) => d.name === slot.discipline
                          );
                          newGrid[key] = {
                            disciplineId: disc?.id ?? "",
                            room:         slot.room ?? globalRoom,
                            professor:    slot.professor ?? "",
                            type:         slot.type,
                          };
                        }
                        setManualGrid(newGrid);
                        setScheduleMode("manual");
                      }}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      <Edit3 size={14} /> Editar horário
                    </button>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.08] px-4 py-3 text-xs text-blue-300">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <span>
                      <strong>Clica em qualquer aula</strong> para aceder ao conteúdo da disciplina.
                    </span>
                  </div>

                  {/* Tabela de horário */}
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                    <div className="border-b border-white/10 px-4 py-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-white">Horário Semanal</h2>
                          <p className="text-xs text-slate-500">
                            Estruturado conforme os horários do ISAF
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            {currentYear}º Ano
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            {currentSemester}º Semestre
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                            {course.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Tabela com scrollbar horizontal integrada ── */}
                    <div className={`overflow-x-auto ${SCROLLBAR_X}`}>
                      <table className="min-w-[980px] w-full border-collapse">
                        <thead>
                          <tr className="bg-white/[0.03]">
                            <th className="w-24 border-b border-r border-white/10 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Hora
                            </th>
                            {DAYS_ORDER.map((day) => (
                              <th
                                key={day}
                                className="border-b border-r border-white/10 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300 last:border-r-0"
                              >
                                {DAY_LABELS[day]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {activePeriods.map((period, idx) => (
                            <tr key={period.key} className="group">
                              <td
                                className={`border-b border-r border-white/10 px-3 py-3 align-middle ${
                                  idx % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.04]"
                                }`}
                              >
                                <div className="flex flex-col items-center leading-none">
                                  <span className="text-sm font-semibold text-slate-200">
                                    {period.startTime}
                                  </span>
                                  <span className="mt-1 text-xs text-slate-500">
                                    {period.endTime}
                                  </span>
                                </div>
                              </td>
                              {DAYS_ORDER.map((day) => {
                                const slot = getCellSlot(mySchedule, day, period);
                                return (
                                  <td
                                    key={`${day}-${period.key}`}
                                    className={`border-b border-r border-white/10 px-2 py-2 align-middle last:border-r-0 ${
                                      idx % 2 === 0 ? "bg-slate-950/30" : "bg-slate-950/45"
                                    }`}
                                  >
                                    {slot ? (
                                      <button
                                        type="button"
                                        onClick={() => goToScheduleDiscipline(slot)}
                                        className={`flex min-h-[56px] w-full flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition hover:brightness-110 active:scale-[0.985] ${TYPE_COLORS[slot.type]}`}
                                        title={slot.discipline}
                                      >
                                        <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                                          {getDisciplineShortName(slot.discipline)}
                                        </span>
                                        {slot.room && (
                                          <span className="mt-1 text-[10px] leading-none text-white/70">
                                            {slot.room}
                                          </span>
                                        )}
                                        <span className="mt-1 inline-flex rounded-full bg-black/20 px-1.5 py-0.5 text-[9px] font-medium text-white/75">
                                          {slot.type}
                                        </span>
                                      </button>
                                    ) : (
                                      <div className="flex min-h-[56px] items-center justify-center rounded-xl border border-dashed border-white/5 bg-white/[0.015]">
                                        <span className="text-[10px] text-slate-700">—</span>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Legenda tipos */}
                  <div className="flex flex-wrap gap-3 text-[11px]">
                    {(Object.entries(TYPE_COLORS) as [WeeklySlot["type"], string][]).map(
                      ([type, cls]) => (
                        <span
                          key={type}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${cls}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {type}
                        </span>
                      )
                    )}
                  </div>

                  {/* Professores */}
                  {scheduleProfessors.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                        Professores associados
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {scheduleProfessors.map((item) => (
                          <div
                            key={`${item.discipline}-${item.professor}`}
                            className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
                          >
                            <p className="text-sm font-medium text-slate-200">
                              {getDisciplineShortName(item.discipline)}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.professor}
                              {item.room ? ` · ${item.room}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <ManualScheduleEditor
              currentYear={currentYear}
              currentSemester={currentSemester}
              disciplines={currentSemesterDisciplines}
              manualGrid={manualGrid}
              globalRoom={globalRoom}
              manualPeriodGroup={manualPeriodGroup}
              filteredPeriods={filteredPeriods}
              saving={scheduleSaving}
              filledCellCount={filledCellCount}
              selectSm={selectSm}
              SelectWrap={SelectWrap}
              onUpdateCell={updateGridCell}
              onGetCell={getGridCell}
              onGlobalRoomChange={handleGlobalRoomChange}
              onPeriodGroupChange={setManualPeriodGroup}
              onApplyBlock={applyBlockToGrid}
              onSave={saveManual}
              onCancel={() => setScheduleMode("view")}
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: MUDANÇA DE CURSO
      ══════════════════════════════════════════ */}
      {activeTab === "mudanca" && (
        <CourseChangeSection currentCourseId={courseId} />
      )}
    </div>
  );
}

/* ================================================================
   MANUAL SCHEDULE EDITOR
================================================================ */
type ManualScheduleEditorProps = {
  currentYear: number;
  currentSemester: number;
  disciplines: Discipline[];
  manualGrid: Record<GridKey, GridCell>;
  globalRoom: string;
  manualPeriodGroup: FixedPeriod["group"];
  filteredPeriods: FixedPeriod[];
  saving: boolean;
  filledCellCount: number;
  selectSm: string;
  SelectWrap: ComponentType<{ children: ReactNode; className?: string }>;
  onUpdateCell: (day: string, periodKey: string, field: keyof GridCell, value: string) => void;
  onGetCell: (day: string, periodKey: string) => GridCell;
  onGlobalRoomChange: (room: string) => void;
  onPeriodGroupChange: (group: FixedPeriod["group"]) => void;
  onApplyBlock: (day: string, periodKey: string, cell: GridCell, length: number) => void;
  onSave: () => void;
  onCancel: () => void;
};

function ManualScheduleEditor({
  currentYear,
  currentSemester,
  disciplines,
  manualGrid,
  globalRoom,
  manualPeriodGroup,
  filteredPeriods,
  saving,
  filledCellCount,
  selectSm,
  SelectWrap,
  onUpdateCell,
  onGetCell,
  onGlobalRoomChange,
  onPeriodGroupChange,
  onApplyBlock,
  onSave,
  onCancel,
}: ManualScheduleEditorProps) {
  const hasAnyEntry = filledCellCount > 0;
  const [autoBlockSize, setAutoBlockSize] = useState<1 | 2 | 3>(1);

  const [profMap, setProfMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const cell of Object.values(manualGrid)) {
      if (cell.disciplineId && cell.professor && !initial[cell.disciplineId]) {
        initial[cell.disciplineId] = cell.professor;
      }
    }
    return initial;
  });

  const setProfessor = (discId: string, val: string) => {
    setProfMap((prev) => ({ ...prev, [discId]: val }));
    Object.entries(manualGrid)
      .filter(([, c]) => c.disciplineId === discId)
      .forEach(([key]) => {
        const [day, pk] = key.split("|");
        onUpdateCell(day, pk, "professor", val);
      });
  };

  const handleDisciplineChange = (
    day: string,
    periodKey: string,
    disciplineId: string,
    currentCell: GridCell
  ) => {
    if (!disciplineId) {
      onUpdateCell(day, periodKey, "disciplineId", "");
      return;
    }
    const nextCell: GridCell = {
      disciplineId,
      room:      currentCell.room || globalRoom,
      professor: profMap[disciplineId] ?? currentCell.professor ?? "",
      type:      currentCell.type || "Teórica",
    };
    onApplyBlock(day, periodKey, nextCell, autoBlockSize);
  };

  const applyFromCurrentCell = (day: string, periodKey: string) => {
    const cell = onGetCell(day, periodKey);
    if (!cell.disciplineId) return;
    onApplyBlock(day, periodKey, cell, autoBlockSize);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Preenchimento Manual</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {currentYear}º Ano · {currentSemester}º Semestre — selecciona a disciplina em cada tempo
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
        >
          <X size={18} />
        </button>
      </div>

      {/* Configurações globais */}
      <div className="border-b border-white/10 bg-white/[0.015] px-5 py-4">
        <div className="flex flex-wrap items-start gap-6">
          {/* Sala global */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Sala (padrão)
            </label>
            <input
              type="text"
              value={globalRoom}
              onChange={(e) => onGlobalRoomChange(e.target.value)}
              placeholder="ex: S.03"
              className="w-32 rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition"
            />
          </div>

          <div className="hidden h-auto w-px self-stretch bg-white/10 md:block" />

          {/* Turno */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Turno
            </label>
            <div className="flex gap-1">
              {(
                [
                  { key: "manha", label: "Manhã" },
                  { key: "tarde", label: "Tarde" },
                  { key: "noite", label: "Noite" },
                ] as { key: FixedPeriod["group"]; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPeriodGroupChange(key)}
                  className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
                    manualPeriodGroup === key
                      ? "bg-indigo-600 text-white"
                      : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden h-auto w-px self-stretch bg-white/10 md:block" />

          {/* Bloco automático */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Bloco automático
            </label>
            <div className="flex gap-1">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAutoBlockSize(n)}
                  className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
                    autoBlockSize === n
                      ? "bg-emerald-600 text-white"
                      : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {n === 1 ? "1 tempo" : `${n} tempos`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600">
              Ao escolher uma disciplina preenche os tempos seguintes
            </p>
          </div>

          {/* Contador */}
          {filledCellCount > 0 && (
            <>
              <div className="hidden h-auto w-px self-stretch bg-white/10 md:block" />
              <div className="flex items-center self-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2">
                <CheckCircle2 size={13} className="text-indigo-400" />
                <span className="text-xs text-indigo-300">
                  {filledCellCount}{" "}
                  {filledCellCount === 1 ? "tempo preenchido" : "tempos preenchidos"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-300">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>
          Selecciona a disciplina em cada célula. Células vazias são ignoradas.
          Com bloco automático activo, os tempos seguintes são preenchidos automaticamente.
        </span>
      </div>

      {/* ── Grid com scrollbar horizontal integrada ── */}
      <div className={`overflow-x-auto p-5 ${SCROLLBAR_X}`}>
        <table
          className="w-full border-collapse"
          style={{ minWidth: `${80 + DAYS_ORDER.length * 148}px` }}
        >
          <thead>
            <tr>
              <th className="w-20 border border-white/10 bg-slate-900/80 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Hora
              </th>
              {DAYS_ORDER.map((day) => (
                <th
                  key={day}
                  className="border border-white/10 bg-slate-900/80 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-300"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPeriods.map((period, idx) => (
              <tr key={period.key}>
                <td
                  className={`border border-white/10 px-2 py-2 align-middle text-center ${
                    idx % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.04]"
                  }`}
                >
                  <span className="block text-sm font-bold text-slate-200">
                    {period.startTime}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {period.endTime}
                  </span>
                </td>
                {DAYS_ORDER.map((day) => {
                  const cell    = onGetCell(day, period.key);
                  const hasDisc = !!cell.disciplineId;
                  return (
                    <td
                      key={`${day}-${period.key}`}
                      className={`border border-white/10 p-1.5 align-top transition-colors ${
                        hasDisc
                          ? "bg-indigo-950/25"
                          : idx % 2 === 0
                          ? "bg-slate-950/20"
                          : "bg-slate-950/35"
                      }`}
                    >
                      <div className="space-y-1.5">
                        {/* Disciplina */}
                        <SelectWrap>
                          <select
                            value={cell.disciplineId}
                            onChange={(e) =>
                              handleDisciplineChange(day, period.key, e.target.value, cell)
                            }
                            className={`${selectSm} ${
                              hasDisc
                                ? "border-indigo-500/50 bg-indigo-900/70 text-indigo-100"
                                : ""
                            }`}
                          >
                            <option value="">— vazio —</option>
                            {disciplines.map((d) => (
                              <option key={d.id} value={d.id}>
                                {getDisciplineShortName(d.name)}
                              </option>
                            ))}
                          </select>
                        </SelectWrap>

                        {/* Nome completo */}
                        {hasDisc && (() => {
                          const disc = disciplines.find((d) => d.id === cell.disciplineId);
                          return disc ? (
                            <p
                              className="line-clamp-1 px-0.5 text-[9px] leading-tight text-indigo-300/80"
                              title={disc.name}
                            >
                              {disc.name}
                            </p>
                          ) : null;
                        })()}

                        {/* Campos extra */}
                        {hasDisc && (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={cell.room}
                              onChange={(e) =>
                                onUpdateCell(day, period.key, "room", e.target.value)
                              }
                              placeholder="Sala"
                              className="w-full rounded-md border border-white/15 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition"
                            />
                            <SelectWrap>
                              <select
                                value={cell.type}
                                onChange={(e) =>
                                  onUpdateCell(day, period.key, "type", e.target.value)
                                }
                                className={selectSm}
                              >
                                <option value="Teórica">Teórica</option>
                                <option value="Prática">Prática</option>
                                <option value="Teórico-Prática">Teórico-Prática</option>
                              </select>
                            </SelectWrap>
                            <input
                              type="text"
                              value={cell.professor}
                              onChange={(e) =>
                                onUpdateCell(day, period.key, "professor", e.target.value)
                              }
                              placeholder="Professor"
                              className="w-full rounded-md border border-white/15 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => applyFromCurrentCell(day, period.key)}
                              className="flex w-full items-center justify-center gap-2 rounded-md border border-indigo-500/30 bg-indigo-600/10 px-2 py-1.5 text-[11px] font-medium text-indigo-300 transition hover:bg-indigo-600/20"
                            >
                              <RefreshCw size={11} />
                              Aplicar{" "}
                              {autoBlockSize === 1 ? "esta aula" : `bloco de ${autoBlockSize} tempos`}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Professores por disciplina */}
      {disciplines.length > 0 && (
        <div className="border-t border-white/10 px-5 pb-4 pt-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Professor por disciplina{" "}
            <span className="normal-case font-normal text-slate-600">
              (aplica-se a todas as aulas dessa disciplina)
            </span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {disciplines.map((disc) => (
              <div
                key={disc.id}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[11px] font-semibold text-slate-300"
                    title={disc.name}
                  >
                    {getDisciplineShortName(disc.name)}
                  </p>
                  <input
                    type="text"
                    placeholder="Nome do professor"
                    value={profMap[disc.id] ?? ""}
                    onChange={(e) => setProfessor(disc.id, e.target.value)}
                    className="mt-1 w-full rounded border border-white/10 bg-slate-800 px-2 py-1 text-[11px] text-slate-200 placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-3 border-t border-white/10 px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !hasAnyEntry}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> A guardar…</>
          ) : (
            <><CheckCircle2 size={16} /> Guardar Horário</>
          )}
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   DISCIPLINE PANEL
================================================================ */
function DisciplinePanel({
  discipline,
  year,
  semester,
  status,
  courseId,
  onClose,
  onGoToDiscipline,
}: {
  discipline: Discipline;
  year: number;
  semester: number;
  status: DisciplineStatus;
  courseId: CourseId;
  onClose: () => void;
  onGoToDiscipline: (disciplineId: string) => void;
}) {
  const courseUUID     = COURSE_UUIDS[courseId];
  const disciplineCode = getDisciplineCodeFromId(discipline.id);
  const isInteractive  = status === "current";

  const { result, isLoading, error } = useDisciplineStudyPlan({
    courseUUID,
    year,
    semester,
    disciplineCode,
    enabled: true,
  });

  const chapters = result?.chapters ?? [];

  const [activeChapterId, setActiveChapterId] = useState<string>("");

  useEffect(() => {
    if (chapters.length === 0) {
      setActiveChapterId("");
      return;
    }
    setActiveChapterId((current) => {
      const exists = chapters.some((ch) => ch.id === current);
      return exists ? current : chapters[0].id;
    });
  }, [chapters]);

  const activeChapter =
    chapters.find((ch) => ch.id === activeChapterId) ?? chapters[0] ?? null;

  const openDiscipline = () => {
    if (!result?.disciplineId) return;
    onGoToDiscipline(result.disciplineId);
  };

  const statusColors: Record<DisciplineStatus, string> = {
    completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    current:   "bg-blue-500/10 border-blue-500/20 text-blue-300",
    upcoming:  "bg-slate-500/10 border-slate-500/20 text-slate-400",
  };

  const statusLabel: Record<DisciplineStatus, string> = {
    completed: "Concluída",
    current:   "Em curso",
    upcoming:  "A frequentar",
  };

  return (
    <div className="border-t border-indigo-500/20 bg-indigo-950/30 px-5 py-5">
      {/* ── Cabeçalho ── */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
            <BookOpen size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{discipline.name}</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {year}º Ano · {semester}º Semestre
              {discipline.annual ? " · Anual" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColors[status]}`}
          >
            {statusLabel[status]}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {isInteractive
          ? "Plano de estudo — semestre corrente"
          : "Plano de estudo — só visualização"}
      </p>

      {/* ── Estados ── */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-6">
          <Loader2 size={16} className="animate-spin text-indigo-400" />
          <p className="text-sm text-slate-400">A carregar plano de estudo…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
          <p className="text-sm font-semibold text-rose-300">
            Não foi possível carregar o plano
          </p>
          <p className="mt-1 text-xs text-rose-200/80">{error}</p>
        </div>
      ) : chapters.length === 0 ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
            <Layers size={24} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">
              Plano de estudo ainda não disponível
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Os capítulos e temas serão inseridos brevemente.
            </p>
          </div>

          {isInteractive && (
            <button
              type="button"
              onClick={openDiscipline}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-4 py-2.5 text-sm font-medium text-indigo-300 transition hover:bg-indigo-600/20"
            >
              <BookOpen size={14} />
              Ir para a disciplina
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Chips dos capítulos — scrollbar horizontal integrada ── */}
          <div className={`flex gap-2 overflow-x-auto pb-2 ${SCROLLBAR_X}`}>
            {chapters.map((chapter, idx) => {
              const isActive = chapter.id === activeChapter?.id;
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => setActiveChapterId(chapter.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? "border-indigo-500/40 bg-indigo-600/15 text-indigo-200"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.05] hover:text-slate-200"
                  }`}
                  title={chapter.title}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="max-w-[11rem] truncate">{chapter.title}</span>
                  <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] text-slate-300">
                    {chapter.topics.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Capítulo activo ── */}
          {activeChapter && (
            <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3 border-b border-white/5 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600/20 text-[10px] font-bold text-indigo-400">
                      {chapters.findIndex((c) => c.id === activeChapter.id) + 1}
                    </span>
                    <h4 className="truncate text-sm font-semibold text-slate-200">
                      {activeChapter.title}
                    </h4>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {activeChapter.status} · {activeChapter.topics.length} tema(s)
                  </p>
                </div>

                {isInteractive && (
                  <button
                    type="button"
                    onClick={openDiscipline}
                    className="shrink-0 rounded-lg border border-indigo-500/30 bg-indigo-600/10 px-3 py-2 text-[11px] font-medium text-indigo-300 transition hover:bg-indigo-600/20"
                  >
                    Abrir disciplina
                  </button>
                )}
              </div>

              {/* ── Tópicos em grelha compacta ── */}
              <div className="p-4">
                {activeChapter.topics.length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {activeChapter.topics.map((topic, topicIdx) =>
                      isInteractive ? (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={openDiscipline}
                          className="group flex min-h-[3.25rem] w-full items-start gap-3 rounded-lg border border-white/5 bg-black/10 px-3 py-2.5 text-left text-sm text-slate-300 transition hover:border-indigo-500/30 hover:bg-indigo-950/30"
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600/15 text-[10px] font-bold text-indigo-300">
                            {topicIdx + 1}
                          </span>
                          <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">
                            {topic.title}
                          </span>
                          <ChevronRight size={12} className="mt-1 shrink-0 text-indigo-400" />
                        </button>
                      ) : (
                        <div
                          key={topic.id}
                          className="flex min-h-[3.25rem] w-full items-start gap-3 rounded-lg border border-white/5 bg-black/10 px-3 py-2.5 text-sm text-slate-400"
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-[10px] font-bold text-slate-600">
                            {topicIdx + 1}
                          </span>
                          <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">
                            {topic.title}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs text-slate-500">
                    Este capítulo ainda não tem temas registados.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Acesso rápido ── */}
          {isInteractive && (
            <button
              type="button"
              onClick={openDiscipline}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-4 py-2.5 text-sm font-medium text-indigo-300 transition hover:bg-indigo-600/20"
            >
              <BookOpen size={14} />
              Ir para a disciplina completa
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   COURSE CHANGE SECTION
================================================================ */
function CourseChangeSection({ currentCourseId }: { currentCourseId: CourseId }) {
  const otherCourses = Object.values(CURRICULUM).filter((c) => c.id !== currentCourseId);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-4 py-4 text-sm text-amber-300">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">Atenção antes de continuar</p>
          <p className="text-xs leading-relaxed text-amber-400/80">
            A mudança de curso é um processo formal que requer aprovação da Secretaria
            Académica do ISAF. Lê atentamente os requisitos abaixo antes de submeter
            qualquer pedido.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
          <h2 className="font-semibold text-slate-100">Requisitos para Mudança de Curso</h2>
          <p className="mt-0.5 text-xs text-slate-500">Conforme o Regulamento Académico do ISAF</p>
        </div>
        <div className="divide-y divide-white/5 px-5">
          {[
            {
              icon: FileText,
              title: "Requerimento formal",
              desc: "Deve ser submetido um requerimento escrito dirigido ao Director Académico, durante o período de matrículas e inscrições.",
            },
            {
              icon: CheckCircle2,
              title: "Aproveitamento mínimo",
              desc: "O estudante deve ter aprovação em pelo menos 50% das cadeiras do ano que frequentou.",
            },
            {
              icon: GraduationCap,
              title: "Equivalências curriculares",
              desc: "As cadeiras comuns entre cursos poderão ser creditadas após análise da Comissão Científica.",
            },
            {
              icon: Calendar,
              title: "Prazo de submissão",
              desc: "Os pedidos são aceites apenas no início de cada ano lectivo, durante o período de matrículas.",
            },
            {
              icon: Info,
              title: "Documentação necessária",
              desc: "Cédula pessoal ou BI, declaração de notas do ano findo, recibo de propinas em dia e declaração de intenção de mudança.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600/15 text-indigo-400">
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
          <h2 className="font-semibold text-slate-100">Cursos Disponíveis</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Seleciona o curso de destino para ver mais detalhes
          </p>
        </div>
        <div className="divide-y divide-white/5">
          {otherCourses.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5">
                  <GraduationCap size={16} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-300">{c.name}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                4 anos
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
        <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
          <h2 className="font-semibold text-slate-100">Contactar a Secretaria</h2>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {[
            { icon: Phone, label: "Telefone",    value: "+244 222 000 000"      },
            { icon: Mail,  label: "Email",       value: "secretaria@isaf.co.ao" },
            { icon: MapPin,label: "Localização", value: "Luanda, Angola"        },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <Icon size={15} className="mt-0.5 shrink-0 text-indigo-400" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                  {label}
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-300">{value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 px-5 pb-5">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            <RefreshCw size={15} /> Submeter pedido de mudança
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-600">
            Ao clicar, será redirecionado para o formulário oficial da Secretaria.
          </p>
        </div>
      </div>
    </div>
  );
}