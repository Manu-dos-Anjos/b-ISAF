// app/components/meu-curso/MeuCursoPage.tsx
"use client";
import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
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
  Sparkles,
  ScrollText,
  Scale,
  FileCheck2,
  ClipboardList,
  Search,
  ArrowLeft,
  ListTree,
} from "lucide-react";
import { useDisciplineStudyPlan } from "@/app/lib/hooks/useDisciplineStudyPlan";
import { useSchedule } from "@/app/lib/hooks/useSchedule";
import { useScheduleReset } from "@/app/lib/hooks/useScheduleReset";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

const SCROLLBAR_X = [
  "scrollbar-thin",
  "scrollbar-track-transparent",
  "[&::-webkit-scrollbar]:h-1",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-slate-300/60",
  "dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/40",
  "hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/70",
  "dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/60",
].join(" ");

export type CourseId =
  | "informatica-gestao-financeira"
  | "contabilidade-financas"
  | "gestao-bancaria-seguros";

export type DisciplineStatus = "current" | "completed" | "upcoming" | "extra";

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

const CURRICULUM: Record<CourseId, CourseData> = {
  "informatica-gestao-financeira": {
    id: "informatica-gestao-financeira",
    name: "Informática de Gestão Financeira",
    years: [
      { year: 1, semesters: [
        { number: 1, totalHours: 768, disciplines: [
          { id: "igf-1-1-cpe", name: "Comunicação Pessoal e Empresarial" },
          { id: "igf-1-1-li1", name: "Língua Inglesa I" },
          { id: "igf-1-1-mi", name: "Métodos de Investigação Científica" },
          { id: "igf-1-1-fsi", name: "Fundamentos de Sistemas de Informação" },
          { id: "igf-1-1-mat1", name: "Matemática I" },
        ]},
        { number: 2, totalHours: 768, disciplines: [
          { id: "igf-1-2-cg1", name: "Contabilidade Geral I" },
          { id: "igf-1-2-li2", name: "Língua Inglesa II" },
          { id: "igf-1-2-iog", name: "Introdução às Organizações e à Gestão" },
          { id: "igf-1-2-arq", name: "Arquitetura de Computadores" },
          { id: "igf-1-2-mat2", name: "Matemática II" },
        ]},
      ]},
      { year: 2, semesters: [
        { number: 1, totalHours: 768, disciplines: [
          { id: "igf-2-1-cg2", name: "Contabilidade Geral II" },
          { id: "igf-2-1-prog1", name: "Programação I" },
          { id: "igf-2-1-sd", name: "Sistemas Digitais" },
          { id: "igf-2-1-cof", name: "Cálculo e Operações Financeiras" },
          { id: "igf-2-1-ie", name: "Introdução à Economia" },
        ]},
        { number: 2, totalHours: 768, disciplines: [
          { id: "igf-2-2-co", name: "Comportamento Organizacional" },
          { id: "igf-2-2-prog2", name: "Programação II" },
          { id: "igf-2-2-bd1", name: "Base de Dados I" },
          { id: "igf-2-2-cant", name: "Contabilidade Analítica" },
          { id: "igf-2-2-pe", name: "Probabilidades e Estatística" },
        ]},
      ]},
      { year: 3, semesters: [
        { number: 1, totalHours: 768, disciplines: [
          { id: "igf-3-1-mdsi", name: "Metodologia de Desenvolvimento de Sistemas de Informação" },
          { id: "igf-3-1-fe", name: "Finanças Empresariais" },
          { id: "igf-3-1-bd2", name: "Base de Dados II" },
          { id: "igf-3-1-rc", name: "Redes de Computadores" },
          { id: "igf-3-1-so1", name: "Sistemas Operativos I" },
        ]},
        { number: 2, totalHours: 768, disciplines: [
          { id: "igf-3-2-qsi", name: "Qualidade de Sistemas de Informação" },
          { id: "igf-3-2-grn", name: "Gestão de Redes Informáticas" },
          { id: "igf-3-2-ds", name: "Desenvolvimento de Software" },
          { id: "igf-3-2-ltw", name: "Linguagens e Tecnologias Web" },
          { id: "igf-3-2-so2", name: "Sistemas Operativos II" },
        ]},
      ]},
      { year: 4, semesters: [
        { number: 1, totalHours: 1216, disciplines: [
          { id: "igf-4-1-di", name: "Direito Informático" },
          { id: "igf-4-1-sirn", name: "Segurança Informática em Redes de Sistemas" },
          { id: "igf-4-1-tm", name: "Tecnologias Multimédia" },
          { id: "igf-4-1-fisc", name: "Fiscalidade" },
          { id: "igf-4-1-tfc", name: "Trabalho Final de Curso", annual: true },
        ]},
        { number: 2, totalHours: 1216, disciplines: [
          { id: "igf-4-2-ai", name: "Auditoria Informática" },
          { id: "igf-4-2-ce", name: "Comércio Electrónico" },
          { id: "igf-4-2-md", name: "Marketing Digital" },
          { id: "igf-4-2-grh", name: "Gestão de Recursos Humanos" },
          { id: "igf-4-2-tfc", name: "Trabalho Final de Curso", annual: true },
        ]},
      ]},
    ],
  },
  "contabilidade-financas": {
    id: "contabilidade-financas",
    name: "Contabilidade e Finanças",
    years: [
      { year: 1, semesters: [
        { number: 1, totalHours: 768, disciplines: [
          { id: "cf-1-1-cpe", name: "Comunicação Pessoal e Empresarial", annual: true },
          { id: "cf-1-1-li1", name: "Língua Inglesa I" },
          { id: "cf-1-1-mi", name: "Metodologias de Investigação Científica" },
          { id: "cf-1-1-ii", name: "Introdução à Informática" },
          { id: "cf-1-1-mat1", name: "Matemática I" },
        ]},
        { number: 2, totalHours: 768, disciplines: [
          { id: "cf-1-2-cpe", name: "Comunicação Pessoal e Empresarial", annual: true },
          { id: "cf-1-2-li2", name: "Língua Inglesa II" },
          { id: "cf-1-2-iog", name: "Introdução às Organizações e à Gestão" },
          { id: "cf-1-2-cg1", name: "Contabilidade Geral I" },
          { id: "cf-1-2-mat2", name: "Matemática II" },
        ]},
      ]},
      { year: 2, semesters: [
        { number: 1, totalHours: 768, disciplines: [
          { id: "cf-2-1-cg2", name: "Contabilidade Geral II" },
          { id: "cf-2-1-li3", name: "Língua Inglesa III" },
          { id: "cf-2-1-me1", name: "Microeconomia I" },
          { id: "cf-2-1-cof", name: "Cálculo e Operações Financeiras" },
          { id: "cf-2-1-est1", name: "Estatística I" },
        ]},
        { number: 2, totalHours: 768, disciplines: [
          { id: "cf-2-2-ca", name: "Contabilidade Analítica" },
          { id: "cf-2-2-li4", name: "Língua Inglesa IV" },
          { id: "cf-2-2-me2", name: "Microeconomia II" },
          { id: "cf-2-2-de", name: "Direito das Empresas" },
          { id: "cf-2-2-est2", name: "Estatística II" },
        ]},
      ]},
      { year: 3, semesters: [
        { number: 1, totalHours: 768, disciplines: [
          { id: "cf-3-1-cpco", name: "Contabilidade, Planeamento e Controlo Orçamental" },
          { id: "cf-3-1-mac1", name: "Macroeconomia I" },
          { id: "cf-3-1-dc", name: "Direito Comercial" },
          { id: "cf-3-1-fin1", name: "Finanças I" },
          { id: "cf-3-1-mkt1", name: "Marketing I" },
        ]},
        { number: 2, totalHours: 768, disciplines: [
          { id: "cf-3-2-fisc", name: "Fiscalidade" },
          { id: "cf-3-2-mac2", name: "Macroeconomia II" },
          { id: "cf-3-2-epe", name: "Estratégia e Planeamento da Empresa" },
          { id: "cf-3-2-fin2", name: "Finanças II" },
          { id: "cf-3-2-mkt2", name: "Marketing II" },
        ]},
      ]},
      { year: 4, semesters: [
        { number: 1, totalHours: 1216, disciplines: [
          { id: "cf-4-1-he", name: "História Económica" },
          { id: "cf-4-1-grh", name: "Gestão de Recursos Humanos" },
          { id: "cf-4-1-mpf", name: "Mercados e Produtos Financeiros" },
          { id: "cf-4-1-caa", name: "Contabilidade Analítica Avançada" },
          { id: "cf-4-1-tfc", name: "Trabalho Final de Curso", annual: true },
        ]},
        { number: 2, totalHours: 1216, disciplines: [
          { id: "cf-4-2-aef", name: "Análise Económico-Financeira" },
          { id: "cf-4-2-aud", name: "Auditoria" },
          { id: "cf-4-2-eci", name: "Economia e Comércio Internacionais" },
          { id: "cf-4-2-scg", name: "Sistemas de Controlo de Gestão" },
          { id: "cf-4-2-tfc", name: "Trabalho Final de Curso", annual: true },
        ]},
      ]},
    ],
  },
  "gestao-bancaria-seguros": {
    id: "gestao-bancaria-seguros",
    name: "Gestão Bancária & Seguros",
    years: [
      { year: 1, semesters: [
        { number: 1, totalHours: 768, disciplines: [
          { id: "gbs-1-1-cpe", name: "Comunicação Pessoal e Empresarial", annual: true },
          { id: "gbs-1-1-li1", name: "Língua Inglesa I" },
          { id: "gbs-1-1-mi", name: "Metodologias de Investigação Científica" },
          { id: "gbs-1-1-ii", name: "Introdução à Informática" },
          { id: "gbs-1-1-mat1", name: "Matemática I" },
        ]},
        { number: 2, totalHours: 768, disciplines: [
          { id: "gbs-1-2-li2", name: "Língua Inglesa II" },
          { id: "gbs-1-2-iog", name: "Introdução às Organizações e à Gestão" },
          { id: "gbs-1-2-cg1", name: "Contabilidade Geral I" },
          { id: "gbs-1-2-mat2", name: "Matemática II" },
        ]},
      ]},
      { year: 2, semesters: [
        { number: 1, totalHours: 768, disciplines: [
          { id: "gbs-2-1-cg2", name: "Contabilidade Geral II" },
          { id: "gbs-2-1-li3", name: "Língua Inglesa III" },
          { id: "gbs-2-1-est", name: "Estatística" },
          { id: "gbs-2-1-cof", name: "Cálculo e Operações Financeiras" },
          { id: "gbs-2-1-tsi", name: "Tecnologias e Sistemas de Informação" },
        ]},
        { number: 2, totalHours: 768, disciplines: [
          { id: "gbs-2-2-ca", name: "Contabilidade Analítica" },
          { id: "gbs-2-2-li4", name: "Língua Inglesa IV" },
          { id: "gbs-2-2-co", name: "Comportamento Organizacional" },
          { id: "gbs-2-2-mpf", name: "Mercados e Produtos Financeiros" },
          { id: "gbs-2-2-irs", name: "Introdução ao Risco e Seguro" },
        ]},
      ]},
      { year: 3, semesters: [
        { number: 1, totalHours: 768, disciplines: [
          { id: "gbs-3-1-cpco", name: "Contabilidade, Planeamento e Controlo Orçamental" },
          { id: "gbs-3-1-fe", name: "Finanças Empresariais" },
          { id: "gbs-3-1-dab", name: "Direito na Actividade Bancária" },
          { id: "gbs-3-1-agr", name: "Análise e Gestão de Risco" },
          { id: "gbs-3-1-fcb", name: "Financiamento e Crédito Bancário" },
        ]},
        { number: 2, totalHours: 768, disciplines: [
          { id: "gbs-3-2-das", name: "Direito na Actividade Seguradora" },
          { id: "gbs-3-2-opb", name: "Operações e Prática Bancária" },
          { id: "gbs-3-2-fpf", name: "Fiscalidade de Produtos Financeiros" },
          { id: "gbs-3-2-aef", name: "Análise Económico-Financeira" },
          { id: "gbs-3-2-svsa", name: "Seguro de Vida, Saúde e Acidentes" },
        ]},
      ]},
      { year: 4, semesters: [
        { number: 1, totalHours: 1216, disciplines: [
          { id: "gbs-4-1-ops", name: "Operações e Prática Seguradora" },
          { id: "gbs-4-1-grh", name: "Gestão de Recursos Humanos" },
          { id: "gbs-4-1-eai", name: "Economia Angolana e Internacional" },
          { id: "gbs-4-1-spnv", name: "Seguros de Propriedade e Não-Vida" },
          { id: "gbs-4-1-tfc", name: "Trabalho Final de Curso", annual: true },
        ]},
        { number: 2, totalHours: 1216, disciplines: [
          { id: "gbs-4-2-afbs", name: "Auditoria Financeira Banca e Seguros" },
          { id: "gbs-4-2-msf", name: "Marketing de Serviços Financeiros" },
          { id: "gbs-4-2-gapf", name: "Gestão de Activos, Passivos e Fundos de Pensões" },
          { id: "gbs-4-2-scg", name: "Sistemas de Controlo de Gestão" },
          { id: "gbs-4-2-tfc", name: "Trabalho Final de Curso", annual: true },
        ]},
      ]},
    ],
  },
};

const DAYS_ORDER = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

const TYPE_COLORS: Record<WeeklySlot["type"], string> = {
  Teórica: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  Prática: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  "Teórico-Prática": "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
};

const DAY_LABELS: Record<WeeklySlot["day"], string> = {
  Segunda: "Segunda-Feira",
  Terça: "Terça-Feira",
  Quarta: "Quarta-Feira",
  Quinta: "Quinta-Feira",
  Sexta: "Sexta-Feira",
  Sábado: "Sábado",
};

const COURSE_UUIDS: Record<CourseId, string> = {
  "informatica-gestao-financeira": "60313e51-2b89-4c1d-9737-6606c9d5e999",
  "contabilidade-financas": "4c41b444-b985-40e0-8449-bdf3156cf3ab",
  "gestao-bancaria-seguros": "724e59d4-8acb-4235-9698-18a325f4ffe5",
};

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
    "metodos de investigacao cientifica": "Met. Inv.",
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
        const full = normalizeText(disc.name);
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

function getCellSlot(mySchedule: WeeklySlot[], day: WeeklySlot["day"], period: FixedPeriod) {
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

type Tab = "curriculo" | "horario" | "regulamentos";
type ScheduleMode = "view" | "manual";
type GridCell = {
  disciplineId: string;
  room: string;
  professor: string;
  type: WeeklySlot["type"];
};
type GridKey = string;

type Props = {
  courseId: CourseId;
  currentYear: 1 | 2 | 3 | 4;
  currentSemester: 1 | 2;
  studentName: string;
  studentNumber?: string | null;
};

export default function MeuCursoPage({
  courseId = "informatica-gestao-financeira",
  currentYear = 1,
  currentSemester = 1,
  studentName = "Estudante",
  studentNumber,
}: Props) {
  useScheduleReset();
  const course = CURRICULUM[courseId] ?? CURRICULUM["informatica-gestao-financeira"];
  const { supabase, user: authUser } = useSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = (searchParams.get("tab") as Tab) ?? "curriculo";
  const modeParam = searchParams.get("mode");
  const modeFromUrl: ScheduleMode = modeParam === "manual" ? "manual" : "view";
  const [activeTab, setActiveTabState] = useState<Tab>(tabFromUrl);
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

  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([currentYear]));
  const disciplinePanelRef = useRef<HTMLDivElement | null>(null);

  const [extraIds, setExtraIds] = useState<Set<string>>(new Set());
  const [extrasLoading, setExtrasLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setExtrasLoading(true);
      if (authUser) {
        try {
          const { data, error } = await supabase
            .from("student_extra_disciplines")
            .select("discipline_id")
            .eq("student_id", authUser.id);
          if (!error && data && active) {
            setExtraIds(new Set((data as Array<{ discipline_id: string }>).map((r) => r.discipline_id)));
            setExtrasLoading(false);
            return;
          }
        } catch {}
      }
      try {
        const raw = localStorage.getItem("b-isaf:extraDisciplines");
        if (raw && active) {
          setExtraIds(new Set(JSON.parse(raw) as string[]));
        }
      } catch {}
      if (active) setExtrasLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [authUser, supabase]);

  const isExtra = useCallback(
    (disciplineId: string) => extraIds.has(disciplineId),
    [extraIds]
  );

  const {
    schedule: mySchedule,
    isLoading: scheduleLoading,
    isSaving: scheduleSaving,
    error: scheduleError,
    saveSchedule,
  } = useSchedule();

  const [manualGrid, setManualGrid] = useState<Record<GridKey, GridCell>>({});
  const [globalRoom, setGlobalRoom] = useState<string>("S.03");
  const [manualPeriodGroup, setManualPeriodGroup] = useState<FixedPeriod["group"]>("tarde");

  const currentSemesterDisciplines = useMemo(() => {
    const yearData = course.years.find((y) => y.year === currentYear);
    if (!yearData) return [];
    const semData = yearData.semesters.find((s) => s.number === currentSemester);
    return semData?.disciplines ?? [];
  }, [course, currentYear, currentSemester]);

  const filteredPeriods = useMemo(
    () => FIXED_PERIODS.filter((p) => p.group === manualPeriodGroup),
    [manualPeriodGroup]
  );

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

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const getDisciplineStatus = useCallback(
    (disciplineId: string, year: number, semester: number): DisciplineStatus => {
      if (isExtra(disciplineId)) return "extra";
      if (year < currentYear) return "completed";
      if (year === currentYear && semester < currentSemester) return "completed";
      if (year === currentYear && semester === currentSemester) return "current";
      return "upcoming";
    },
    [isExtra, currentYear, currentSemester]
  );

  const statusIcon = (status: DisciplineStatus) => {
    switch (status) {
      case "completed": return <CheckCircle2 size={14} className="shrink-0 text-emerald-500 dark:text-emerald-400" />;
      case "current": return <Circle size={14} className="shrink-0 fill-blue-500/30 text-blue-500 dark:fill-blue-400/30 dark:text-blue-400" />;
      case "extra": return <Sparkles size={14} className="shrink-0 text-violet-500 dark:text-violet-400" />;
      case "upcoming": return <Circle size={14} className="shrink-0 text-slate-600 dark:text-slate-500" />;
    }
  };

  const statusLabel: Record<DisciplineStatus, string> = {
    completed: "Concluída",
    current: "Em curso",
    upcoming: "A frequentar",
    extra: "Cadeira extra",
  };

  const goToDiscipline = (disciplineId: string, topicId?: string) => {
    const query = topicId ? `?openTopic=${encodeURIComponent(topicId)}` : "";
    router.push(`/disciplinas/${disciplineId}${query}`);
  };

  const goToScheduleDiscipline = (slot: WeeklySlot) => {
    const resolved = slot.disciplineSlug
      ? getDisciplineSlug(slot.disciplineSlug)
      : resolveDisciplineSlugFromScheduleName(slot.discipline, course);
    if (resolved) router.push(`/disciplinas/${resolved}`);
  };

  const getGridCell = (day: string, periodKey: string): GridCell => {
    const key: GridKey = `${day}|${periodKey}`;
    return manualGrid[key] ?? { disciplineId: "", room: globalRoom, professor: "", type: "Teórica" };
  };

  const updateGridCell = (day: string, periodKey: string, field: keyof GridCell, value: string) => {
    const key: GridKey = `${day}|${periodKey}`;
    setManualGrid((prev) => {
      const existing = prev[key] ?? { disciplineId: "", room: globalRoom, professor: "", type: "Teórica" };
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

  const applyBlockToGrid = (day: string, periodKey: string, cell: GridCell, length: number) => {
    const startIndex = filteredPeriods.findIndex((p) => p.key === periodKey);
    if (startIndex < 0) return;
    setManualGrid((prev) => {
      const next = { ...prev };
      for (let i = 0; i < length; i++) {
        const period = filteredPeriods[startIndex + i];
        if (!period) break;
        const key: GridKey = `${day}|${period.key}`;
        next[key] = { disciplineId: cell.disciplineId, room: cell.room || globalRoom, professor: cell.professor, type: cell.type };
      }
      return next;
    });
  };

  const saveManual = async () => {
    const slots: WeeklySlot[] = [];
    let counter = 0;
    for (const [key, cell] of Object.entries(manualGrid)) {
      if (!cell.disciplineId) continue;
      const [day, periodKey] = key.split("|");
      const period = getPeriodByKey(periodKey);
      const disc = currentSemesterDisciplines.find((d) => d.id === cell.disciplineId);
      if (!period || !disc) continue;
      slots.push({
        id: `manual-${counter++}`,
        day: day as WeeklySlot["day"],
        startTime: period.startTime,
        endTime: period.endTime,
        discipline: disc.name,
        disciplineSlug: getDisciplineSlug(disc.id),
        room: cell.room || globalRoom,
        professor: cell.professor,
        type: cell.type,
      });
    }
    try {
      await saveSchedule(slots);
      setScheduleMode("view");
    } catch {}
  };

  const activePeriods = useMemo(() => getActivePeriods(mySchedule), [mySchedule]);

  const scheduleProfessors = useMemo(() => {
    const map = new Map<string, { discipline: string; professor: string; room?: string }>();
    for (const slot of mySchedule) {
      if (!slot.professor) continue;
      const key = normalizeText(slot.discipline);
      if (!map.has(key)) map.set(key, { discipline: slot.discipline, professor: slot.professor, room: slot.room });
    }
    return Array.from(map.values());
  }, [mySchedule]);

  const progress = Math.round((((currentYear - 1) * 2 + (currentSemester - 1)) / 8) * 100);
  const filledCellCount = Object.values(manualGrid).filter((c) => c.disciplineId).length;

  const selectSm =
    "w-full appearance-none rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 " +
    "focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 transition " +
    "dark:border-white/15 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-500/40";

  const SelectWrap = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
    <div className={`relative ${className}`}>
      {children}
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-5">
      {scheduleError && (
        <div className="flex items-center gap-2 rounded-xl md:rounded-lg border border-rose-300 bg-rose-50 px-4 md:px-3 py-3 md:py-2 text-sm md:text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={15} className="shrink-0 md:h-3.5 md:w-3.5" />
          <span>{scheduleError}</span>
        </div>
      )}

      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-950/50 dark:shadow-none sm:rounded-2xl sm:p-5 md:p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50 dark:from-indigo-950/60 dark:via-slate-950/80 dark:to-slate-950" />

        <div className="relative z-10 flex items-center justify-between gap-3 md:gap-2.5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 sm:text-xs md:text-[11px]">
              Meu Curso
            </p>
            <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl md:text-xl">
              {course.name}
            </h1>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-sm md:text-xs">
              {studentName}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end text-right">
            <p className="text-2xl font-bold leading-none text-slate-900 dark:text-white sm:text-3xl md:text-2xl">
              {progress}
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 sm:text-base md:text-sm">%</span>
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-500 sm:text-[11px] md:text-[10px]">
              Progresso
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 sm:mt-2 sm:text-sm md:text-xs">
          <span className="flex items-center gap-1.5">
            <GraduationCap size={13} className="text-indigo-500 dark:text-indigo-400 sm:size-[14px] md:size-[13px]" />
            {currentYear}º Ano · {currentSemester}º Semestre
          </span>
          {studentNumber && (
            <span className="flex items-center gap-1.5">
              <FileText size={13} className="text-indigo-500 dark:text-indigo-400 sm:size-[14px] md:size-[13px]" />
              Nº {studentNumber}
            </span>
          )}
        </div>

        <div className="relative z-10 mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10 sm:hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className={`relative z-10 mt-3 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-white/5 sm:mt-5 md:mt-4 sm:rounded-xl ${SCROLLBAR_X}`}>
          {(["curriculo", "horario", "regulamentos"] as Tab[]).map((tab) => {
            const labels: Record<Tab, string> = {
              curriculo: "Grelha Curricular",
              horario: "Horário Semanal",
              regulamentos: "Regulamentos",
            };
            const labelsShort: Record<Tab, string> = {
              curriculo: "Currículo",
              horario: "Horário",
              regulamentos: "Regulamentos",
            };
            const icons: Record<Tab, ElementType> = {
              curriculo: Layers,
              horario: Calendar,
              regulamentos: ScrollText,
            };
            const Icon = icons[tab];
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 md:py-1.5 text-[11px] md:text-[10px] font-medium transition sm:gap-2 md:gap-1.5 sm:rounded-lg sm:px-3 md:px-2.5 sm:text-xs md:text-[11px] ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <Icon size={14} className="md:h-3 md:w-3" />
                <span className="sm:hidden">{labelsShort[tab]}</span>
                <span className="hidden sm:inline">{labels[tab]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "curriculo" && (
        <div className="space-y-3 sm:space-y-4 md:space-y-3">
          {extrasLoading && (
            <div className="flex items-center gap-2 rounded-xl md:rounded-lg border border-slate-200 bg-slate-50 px-4 md:px-3 py-2.5 md:py-2 text-xs md:text-[11px] text-slate-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-500">
              <Loader2 size={12} className="animate-spin md:h-3 md:w-3" />
              A carregar cadeiras extra…
            </div>
          )}

          {course.years.map((yearData) => {
            const isCurrentYear = yearData.year === currentYear;
            const isExpanded = expandedYears.has(yearData.year);
            const isCompleted = yearData.year < currentYear;
            return (
              <div
                key={yearData.year}
                className={`overflow-hidden rounded-xl border transition-all sm:rounded-2xl md:rounded-xl ${
                  isCurrentYear
                    ? "border-indigo-300 shadow-md shadow-indigo-100 dark:border-indigo-500/40 dark:shadow-lg dark:shadow-indigo-500/10"
                    : "border-slate-200 dark:border-white/10"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleYear(yearData.year)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition sm:gap-4 md:gap-3 sm:px-5 md:px-4 sm:py-4 md:py-3 ${
                    isCurrentYear
                      ? "bg-indigo-50 dark:bg-indigo-950/60"
                      : isCompleted
                      ? "bg-emerald-50 dark:bg-emerald-950/20"
                      : "bg-slate-50 dark:bg-slate-950/40"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 md:gap-2.5">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold sm:h-9 sm:w-9 md:h-8 md:w-8 ${
                        isCurrentYear
                          ? "bg-indigo-600 text-white"
                          : isCompleted
                          ? "bg-emerald-200 text-emerald-700 dark:bg-emerald-600/30 dark:text-emerald-400"
                          : "bg-slate-200 text-slate-500 dark:bg-white/5 dark:text-slate-400"
                      }`}
                    >
                      {yearData.year}
                    </div>
                    <div className="min-w-0">
                      <p className={`flex flex-wrap items-center gap-1.5 truncate font-semibold sm:gap-2 md:gap-1.5 ${isCurrentYear ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
                        <span className="text-sm md:text-xs">{yearData.year}º Ano</span>
                        {isCurrentYear && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] md:text-[9px] font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                            Ano Corrente
                          </span>
                        )}
                        {isCompleted && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] md:text-[9px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                            Concluído
                          </span>
                        )}
                      </p>
                      <p className="text-xs md:text-[11px] text-slate-500 dark:text-slate-500">
                        Carga horária: {yearData.semesters[0].totalHours}h
                      </p>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronDown size={16} className="shrink-0 text-slate-600 dark:text-slate-400 md:h-4 md:w-4" />
                    : <ChevronRight size={16} className="shrink-0 text-slate-600 dark:text-slate-400 md:h-4 md:w-4" />
                  }
                </button>

                {isExpanded && (
                  <div className="grid divide-y divide-slate-100 bg-slate-50/50 dark:divide-white/5 dark:bg-slate-950/30 md:grid-cols-2 md:divide-x md:divide-y-0">
                    {yearData.semesters.map((sem) => {
                      const semBaseStatus = (() => {
                        if (yearData.year < currentYear) return "completed";
                        if (yearData.year === currentYear && sem.number < currentSemester) return "completed";
                        if (yearData.year === currentYear && sem.number === currentSemester) return "current";
                        return "upcoming";
                      })();
                      const isSemCurrent = semBaseStatus === "current";
                      return (
                        <div key={sem.number} className="p-3 sm:p-4 md:p-3">
                          <div
                            className={`mb-2.5 flex items-center gap-2 border-b pb-2 sm:mb-3 md:mb-2.5 ${
                              isSemCurrent ? "border-indigo-200 dark:border-indigo-500/30" : "border-slate-200 dark:border-white/5"
                            }`}
                          >
                            <div className={`h-1.5 w-1.5 rounded-full ${isSemCurrent ? "bg-indigo-400" : "bg-slate-300 dark:bg-slate-600"}`} />
                            <p className={`text-xs md:text-[11px] font-semibold uppercase tracking-wider ${isSemCurrent ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-500"}`}>
                              {sem.number}º Semestre
                            </p>
                          </div>
                          <div className="space-y-1 sm:space-y-1.5 md:space-y-1">
                            {sem.disciplines.map((disc) => {
                              const discStatus = getDisciplineStatus(disc.id, yearData.year, sem.number);
                              const isSelected = selectedDisciplineId === disc.id;
                              const isCurrent = discStatus === "current";
                              const isExtraDisc = discStatus === "extra";
                              return (
                                <button
                                  key={disc.id}
                                  type="button"
                                  onClick={() => setSelectedDisciplineId(isSelected ? null : disc.id)}
                                  className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm md:text-xs transition-all sm:px-3 md:px-2.5 sm:py-2.5 md:py-2 ${
                                    isSelected
                                      ? isExtraDisc
                                        ? "bg-violet-100 ring-1 ring-violet-300 dark:bg-violet-600/20 dark:ring-violet-500/40"
                                        : "bg-indigo-100 ring-1 ring-indigo-300 dark:bg-indigo-600/20 dark:ring-indigo-500/40"
                                      : isExtraDisc
                                      ? "bg-violet-50 ring-1 ring-violet-200 hover:bg-violet-100 dark:bg-violet-950/30 dark:ring-violet-500/20 dark:hover:bg-violet-950/50"
                                      : isCurrent
                                      ? "hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                      : "hover:bg-slate-100 dark:hover:bg-white/5"
                                  }`}
                                >
                                  {statusIcon(discStatus)}
                                  <span
                                    className={`flex-1 leading-snug ${
                                      isSelected
                                        ? isExtraDisc ? "text-violet-800 dark:text-violet-200" : "text-indigo-800 dark:text-indigo-200"
                                        : isExtraDisc
                                        ? "text-violet-700 dark:text-violet-200"
                                        : "text-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    {disc.name}
                                    {disc.annual && (
                                      <span className="ml-1.5 text-[10px] md:text-[9px] text-slate-500 dark:text-slate-500">(Anual)</span>
                                    )}
                                  </span>
                                  {isExtraDisc && (
                                    <span className="shrink-0 rounded-full border border-violet-300 bg-violet-100 px-1.5 py-0.5 text-[9px] md:text-[8px] font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400">
                                      Extra
                                    </span>
                                  )}
                                  <ChevronRight
                                    size={12}
                                    className={`shrink-0 transition-transform ${
                                      isSelected
                                        ? isExtraDisc ? "rotate-90 text-violet-500 dark:text-violet-400" : "rotate-90 text-indigo-500 dark:text-indigo-400"
                                        : "text-slate-600 group-hover:text-slate-700 dark:text-slate-600 dark:group-hover:text-slate-400"
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
                          selectedDiscipline.discipline.id,
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

          <div className="flex flex-wrap items-center gap-3 rounded-xl md:rounded-lg border border-slate-200 bg-slate-50 px-4 md:px-3 py-3 md:py-2.5 text-[11px] md:text-[10px] text-slate-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-500 sm:gap-4 md:gap-3">
            <span className="font-medium text-slate-600 dark:text-slate-400">Legenda:</span>
            {(["completed", "current", "upcoming", "extra"] as DisciplineStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                {statusIcon(s)}
                <span className={s === "extra" ? "text-violet-600 dark:text-violet-400" : ""}>{statusLabel[s]}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {activeTab === "horario" && (
        <div className="space-y-3 sm:space-y-4 md:space-y-3">
          {scheduleLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 md:py-12">
              <Loader2 size={20} className="animate-spin text-indigo-500 dark:text-indigo-400 md:h-5 md:w-5" />
              <p className="text-sm md:text-xs text-slate-500 dark:text-slate-400">A carregar horário…</p>
            </div>
          ) : scheduleMode === "view" ? (
            <>
              {mySchedule.length === 0 ? (
                <div className="rounded-2xl md:rounded-xl border border-slate-200 bg-white p-8 md:p-6 text-center shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none sm:p-10 md:p-8">
                  <Calendar size={40} className="mx-auto mb-4 text-slate-300 dark:text-slate-600 sm:size-12 md:size-10" />
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300 sm:text-lg md:text-base">
                    Ainda não tens horário configurado
                  </p>
                  <p className="mt-1 text-sm md:text-xs text-slate-500 dark:text-slate-500">
                    Preenche o teu horário manualmente
                  </p>
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => { setManualGrid({}); setScheduleMode("manual"); }}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 md:px-4 py-2.5 md:py-2 text-sm md:text-xs font-medium text-white transition hover:bg-indigo-500"
                    >
                      <Plus size={16} className="md:h-3.5 md:w-3.5" /> Criar horário manualmente
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 md:gap-1.5">
                    <button
                      onClick={() => {
                        const newGrid: Record<GridKey, GridCell> = {};
                        for (const slot of mySchedule) {
                          const periodKey = `${slot.startTime}-${slot.endTime}`;
                          const key: GridKey = `${slot.day}|${periodKey}`;
                          const disc = currentSemesterDisciplines.find((d) => d.name === slot.discipline);
                          newGrid[key] = {
                            disciplineId: disc?.id ?? "",
                            room: slot.room ?? globalRoom,
                            professor: slot.professor ?? "",
                            type: slot.type,
                          };
                        }
                        setManualGrid(newGrid);
                        setScheduleMode("manual");
                      }}
                      className="flex items-center gap-2 md:gap-1.5 rounded-lg border border-slate-300 bg-white px-4 md:px-3 py-2 md:py-1.5 text-sm md:text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                    >
                      <Edit3 size={14} className="md:h-3.5 md:w-3.5" /> Editar horário
                    </button>
                  </div>
                  <div className="flex items-start gap-3 md:gap-2 rounded-xl md:rounded-lg border border-blue-200 bg-blue-50 px-4 md:px-3 py-3 md:py-2 text-xs md:text-[11px] text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/[0.08] dark:text-blue-300">
                    <Info size={14} className="mt-0.5 shrink-0 md:h-3 md:w-3" />
                    <span>
                      <strong>Clica em qualquer aula</strong> para aceder ao conteúdo da disciplina.
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-2xl md:rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none">
                    <div className="border-b border-slate-200 px-4 py-4 dark:border-white/10">
                      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                          <h2 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg md:text-base">Horário Semanal</h2>
                          <p className="text-xs md:text-[11px] text-slate-500 dark:text-slate-500">Estruturado conforme os horários do ISAF</p>
                        </div>
                        <div className="flex flex-wrap gap-2 md:gap-1.5 text-[11px] md:text-[10px] text-slate-500 dark:text-slate-400">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 md:px-2 py-1 dark:border-white/10 dark:bg-white/5">{currentYear}º Ano</span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 md:px-2 py-1 dark:border-white/10 dark:bg-white/5">{currentSemester}º Semestre</span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 md:px-2 py-1 dark:border-white/10 dark:bg-white/5">{course.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`overflow-x-auto ${SCROLLBAR_X}`}>
                      <table className="min-w-[980px] w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-white/[0.03]">
                            <th className="w-24 border-b border-r border-slate-200 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:text-slate-500">
                              Hora
                            </th>
                            {DAYS_ORDER.map((day) => (
                              <th
                                key={day}
                                className="border-b border-r border-slate-200 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:border-white/10 dark:text-slate-300 last:border-r-0"
                              >
                                {DAY_LABELS[day]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {activePeriods.map((period, idx) => (
                            <tr key={period.key} className="group">
                              <td className={`border-b border-r border-slate-200 px-3 py-3 align-middle dark:border-white/10 ${idx % 2 === 0 ? "bg-slate-50 dark:bg-white/[0.02]" : "bg-white dark:bg-white/[0.04]"}`}>
                                <div className="flex flex-col items-center leading-none">
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{period.startTime}</span>
                                  <span className="mt-1 text-xs text-slate-600 dark:text-slate-500">{period.endTime}</span>
                                </div>
                              </td>
                              {DAYS_ORDER.map((day) => {
                                const slot = getCellSlot(mySchedule, day, period);
                                return (
                                  <td
                                    key={`${day}-${period.key}`}
                                    className={`border-b border-r border-slate-200 px-2 py-2 align-middle dark:border-white/10 last:border-r-0 ${idx % 2 === 0 ? "bg-white dark:bg-slate-950/30" : "bg-slate-50/60 dark:bg-slate-950/45"}`}
                                  >
                                    {slot ? (
                                      <button
                                        type="button"
                                        onClick={() => goToScheduleDiscipline(slot)}
                                        className={`flex min-h-[56px] w-full flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition hover:brightness-105 active:scale-[0.985] dark:hover:brightness-110 ${TYPE_COLORS[slot.type]}`}
                                        title={slot.discipline}
                                      >
                                        <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-800 dark:text-white">
                                          {getDisciplineShortName(slot.discipline)}
                                        </span>
                                        {slot.room && (
                                          <span className="mt-1 text-[10px] leading-none text-slate-600 dark:text-white/70">{slot.room}</span>
                                        )}
                                        <span className="mt-1 inline-flex rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] font-medium text-slate-700 dark:bg-black/20 dark:text-white/75">
                                          {slot.type}
                                        </span>
                                      </button>
                                    ) : (
                                      <div className="flex min-h-[56px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.015]">
                                        <span className="text-[10px] text-slate-300 dark:text-slate-700">—</span>
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
                  <div className="flex flex-wrap gap-2 md:gap-1.5 text-[11px] md:text-[10px] sm:gap-3 md:gap-2">
                    {(Object.entries(TYPE_COLORS) as [WeeklySlot["type"], string][]).map(([type, cls]) => (
                      <span key={type} className={`flex items-center gap-1.5 rounded-full border px-3 md:px-2.5 py-1 ${cls}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {type}
                      </span>
                    ))}
                  </div>
                  {scheduleProfessors.length > 0 && (
                    <div className="rounded-2xl md:rounded-xl border border-slate-200 bg-white p-4 md:p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none">
                      <p className="mb-3 md:mb-2.5 text-[11px] md:text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
                        Professores associados
                      </p>
                      <div className="grid gap-3 md:gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {scheduleProfessors.map((item) => (
                          <div
                            key={`${item.discipline}-${item.professor}`}
                            className="rounded-xl md:rounded-lg border border-slate-200 bg-slate-50 px-3 md:px-2.5 py-2 md:py-1.5 dark:border-white/5 dark:bg-white/[0.02]"
                          >
                            <p className="text-sm md:text-xs font-medium text-slate-800 dark:text-slate-200">
                              {getDisciplineShortName(item.discipline)}
                            </p>
                            <p className="mt-0.5 text-xs md:text-[11px] text-slate-500 dark:text-slate-500">
                              {item.professor}{item.room ? ` · ${item.room}` : ""}
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

      {activeTab === "regulamentos" && <RegulamentosSection />}
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
  currentYear, currentSemester, disciplines, manualGrid, globalRoom,
  manualPeriodGroup, filteredPeriods, saving, filledCellCount, selectSm,
  SelectWrap, onUpdateCell, onGetCell, onGlobalRoomChange, onPeriodGroupChange,
  onApplyBlock, onSave, onCancel,
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

  const handleDisciplineChange = (day: string, periodKey: string, disciplineId: string, currentCell: GridCell) => {
    if (!disciplineId) {
      onUpdateCell(day, periodKey, "disciplineId", "");
      return;
    }
    const nextCell: GridCell = {
      disciplineId,
      room: currentCell.room || globalRoom,
      professor: profMap[disciplineId] ?? currentCell.professor ?? "",
      type: currentCell.type || "Teórica",
    };
    onApplyBlock(day, periodKey, nextCell, autoBlockSize);
  };

  const applyFromCurrentCell = (day: string, periodKey: string) => {
    const cell = onGetCell(day, periodKey);
    if (!cell.disciplineId) return;
    onApplyBlock(day, periodKey, cell, autoBlockSize);
  };

  const inputStyle =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 placeholder-slate-400 " +
    "focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 transition " +
    "dark:border-white/15 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-indigo-500/40";

  return (
    <div className="rounded-2xl md:rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 dark:border-white/10 sm:px-5 md:px-4 sm:py-4 md:py-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg md:text-base">Preenchimento Manual</h2>
          <p className="mt-0.5 text-xs md:text-[11px] text-slate-500 dark:text-slate-500">
            {currentYear}º Ano · {currentSemester}º Semestre — selecciona a disciplina em cada tempo
          </p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300">
          <X size={18} className="md:h-4 md:w-4" />
        </button>
      </div>
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.015] sm:px-5 md:px-4 md:py-3">
        <div className="flex flex-wrap items-start gap-4 sm:gap-6 md:gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sala (padrão)</label>
            <input
              type="text"
              value={globalRoom}
              onChange={(e) => onGlobalRoomChange(e.target.value)}
              placeholder="ex: S.03"
              className={`w-28 sm:w-32 md:w-28 ${inputStyle}`}
            />
          </div>
          <div className="hidden h-auto w-px self-stretch bg-slate-200 dark:bg-white/10 md:block" />
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Turno</label>
            <div className="flex gap-1">
              {([{ key: "manha", label: "Manhã" }, { key: "tarde", label: "Tarde" }, { key: "noite", label: "Noite" }] as { key: FixedPeriod["group"]; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPeriodGroupChange(key)}
                  className={`rounded-lg px-3 md:px-2.5 py-2 md:py-1.5 text-xs md:text-[11px] font-medium transition sm:px-4 md:px-3 ${manualPeriodGroup === key ? "bg-indigo-600 text-white" : "border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden h-auto w-px self-stretch bg-slate-200 dark:bg-white/10 md:block" />
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Bloco automático</label>
            <div className="flex gap-1">
              {([1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAutoBlockSize(n)}
                  className={`rounded-lg px-3 md:px-2.5 py-2 md:py-1.5 text-xs md:text-[11px] font-medium transition sm:px-4 md:px-3 ${autoBlockSize === n ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"}`}
                >
                  {n === 1 ? "1 tempo" : `${n} tempos`}
                </button>
              ))}
            </div>
            <p className="text-[10px] md:text-[9px] text-slate-400 dark:text-slate-600">Ao escolher uma disciplina preenche os tempos seguintes</p>
          </div>
          {filledCellCount > 0 && (
            <>
              <div className="hidden h-auto w-px self-stretch bg-slate-200 dark:bg-white/10 md:block" />
              <div className="flex items-center self-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 md:px-2.5 py-2 md:py-1.5 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                <CheckCircle2 size={13} className="text-indigo-500 dark:text-indigo-400 md:h-3 md:w-3" />
                <span className="text-xs md:text-[11px] text-indigo-700 dark:text-indigo-300">
                  {filledCellCount} {filledCellCount === 1 ? "tempo preenchido" : "tempos preenchidos"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mx-4 mt-4 flex items-start gap-3 md:gap-2 rounded-xl md:rounded-lg border border-amber-200 bg-amber-50 px-4 md:px-3 py-3 md:py-2 text-xs md:text-[11px] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/[0.06] dark:text-amber-300 sm:mx-5 md:mx-4">
        <Info size={13} className="mt-0.5 shrink-0 md:h-3 md:w-3" />
        <span>
          Selecciona a disciplina em cada célula. Células vazias são ignoradas.
          Com bloco automático activo, os tempos seguintes são preenchidos automaticamente.
        </span>
      </div>
      <div className={`overflow-x-auto p-4 md:p-3 sm:p-5 md:p-4 ${SCROLLBAR_X}`}>
        <table className="w-full border-collapse" style={{ minWidth: `${80 + 6 * 148}px` }}>
          <thead>
            <tr>
              <th className="w-20 border border-slate-200 bg-slate-100 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-500">Hora</th>
              {DAYS_ORDER.map((day) => (
                <th key={day} className="border border-slate-200 bg-slate-100 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPeriods.map((period, idx) => (
              <tr key={period.key}>
                <td className={`border border-slate-200 px-2 py-2 align-middle text-center dark:border-white/10 ${idx % 2 === 0 ? "bg-slate-50 dark:bg-white/[0.02]" : "bg-white dark:bg-white/[0.04]"}`}>
                  <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">{period.startTime}</span>
                  <span className="block text-[11px] text-slate-400 dark:text-slate-500">{period.endTime}</span>
                </td>
                {DAYS_ORDER.map((day) => {
                  const cell = onGetCell(day, period.key);
                  const hasDisc = !!cell.disciplineId;
                  return (
                    <td
                      key={`${day}-${period.key}`}
                      className={`border border-slate-200 p-1.5 align-top transition-colors dark:border-white/10 ${hasDisc ? "bg-indigo-50 dark:bg-indigo-950/25" : idx % 2 === 0 ? "bg-slate-50/60 dark:bg-slate-950/20" : "bg-white dark:bg-slate-950/35"}`}
                    >
                      <div className="space-y-1.5">
                        <SelectWrap>
                          <select
                            value={cell.disciplineId}
                            onChange={(e) => handleDisciplineChange(day, period.key, e.target.value, cell)}
                            className={`${selectSm} ${hasDisc ? "border-indigo-300 bg-indigo-100 text-indigo-800 dark:border-indigo-500/50 dark:bg-indigo-900/70 dark:text-indigo-100" : ""}`}
                          >
                            <option value="">— vazio —</option>
                            {disciplines.map((d) => (
                              <option key={d.id} value={d.id}>{getDisciplineShortName(d.name)}</option>
                            ))}
                          </select>
                        </SelectWrap>
                        {hasDisc && (() => {
                          const disc = disciplines.find((d) => d.id === cell.disciplineId);
                          return disc ? (
                            <p className="line-clamp-1 px-0.5 text-[9px] leading-tight text-indigo-600/80 dark:text-indigo-300/80" title={disc.name}>{disc.name}</p>
                          ) : null;
                        })()}
                        {hasDisc && (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={cell.room}
                              onChange={(e) => onUpdateCell(day, period.key, "room", e.target.value)}
                              placeholder="Sala"
                              className={inputStyle}
                            />
                            <SelectWrap>
                              <select
                                value={cell.type}
                                onChange={(e) => onUpdateCell(day, period.key, "type", e.target.value)}
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
                              onChange={(e) => onUpdateCell(day, period.key, "professor", e.target.value)}
                              placeholder="Professor"
                              className={inputStyle}
                            />
                            <button
                              type="button"
                              onClick={() => applyFromCurrentCell(day, period.key)}
                              className="flex w-full items-center justify-center gap-2 rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1.5 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-600/10 dark:text-indigo-300 dark:hover:bg-indigo-600/20"
                            >
                              <RefreshCw size={11} />
                              Aplicar {autoBlockSize === 1 ? "esta aula" : `bloco de ${autoBlockSize} tempos`}
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
      {disciplines.length > 0 && (
        <div className="border-t border-slate-200 px-4 pb-4 pt-4 dark:border-white/10 sm:px-5 md:px-4">
          <p className="mb-3 md:mb-2.5 text-[11px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Professor por disciplina{" "}
            <span className="font-normal normal-case text-slate-400 dark:text-slate-600">(aplica-se a todas as aulas dessa disciplina)</span>
          </p>
          <div className="grid gap-2 md:gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {disciplines.map((disc) => (
              <div key={disc.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] md:text-[10px] font-semibold text-slate-700 dark:text-slate-300" title={disc.name}>
                    {getDisciplineShortName(disc.name)}
                  </p>
                  <input
                    type="text"
                    placeholder="Nome do professor"
                    value={profMap[disc.id] ?? ""}
                    onChange={(e) => setProfessor(disc.id, e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-600 dark:focus:border-indigo-500/50"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-3 border-t border-slate-200 px-4 py-4 dark:border-white/10 sm:px-5 md:px-4 md:py-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl md:rounded-lg border border-slate-300 bg-white px-4 md:px-3 py-3 md:py-2 text-sm md:text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !hasAnyEntry}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl md:rounded-lg bg-indigo-600 px-4 md:px-3 py-3 md:py-2 text-sm md:text-xs font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin md:h-3.5 md:w-3.5" /> A guardar…</>
          ) : (
            <><CheckCircle2 size={16} className="md:h-3.5 md:w-3.5" /> Guardar Horário</>
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
  discipline, year, semester, status, courseId, onClose, onGoToDiscipline,
}: {
  discipline: Discipline;
  year: number;
  semester: number;
  status: DisciplineStatus;
  courseId: CourseId;
  onClose: () => void;
  onGoToDiscipline: (disciplineId: string, topicId?: string) => void;
}) {
  const courseUUID = COURSE_UUIDS[courseId];
  const disciplineCode = getDisciplineCodeFromId(discipline.id);
  const isInteractive = status === "current" || status === "extra";
  const isExtraPanel = status === "extra";

  const { result, isLoading, error } = useDisciplineStudyPlan({
    courseUUID, year, semester, disciplineCode, enabled: true,
  });

  const chapters = result?.chapters ?? [];
  const [activeChapterId, setActiveChapterId] = useState<string>("");

  useEffect(() => {
    if (chapters.length === 0) { setActiveChapterId(""); return; }
    setActiveChapterId((current) => {
      const exists = chapters.some((ch) => ch.id === current);
      return exists ? current : chapters[0].id;
    });
  }, [chapters]);

  const activeChapter = chapters.find((ch) => ch.id === activeChapterId) ?? chapters[0] ?? null;

  const openDiscipline = (topicId?: string) => {
    if (!result?.disciplineId) return;
    onGoToDiscipline(result.disciplineId, topicId);
  };

  const statusColors: Record<DisciplineStatus, string> = {
    completed: "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300",
    current: "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300",
    upcoming: "bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-500/10 dark:border-slate-500/20 dark:text-slate-400",
    extra: "bg-violet-100 border-violet-300 text-violet-700 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-300",
  };

  const statusLabelMap: Record<DisciplineStatus, string> = {
    completed: "Concluída",
    current: "Em curso",
    upcoming: "A frequentar",
    extra: "Cadeira extra",
  };

  const panelBg = isExtraPanel
    ? "border-violet-200 bg-violet-50 dark:border-violet-500/20 dark:bg-violet-950/30"
    : "border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-950/30";
  const accentBg = isExtraPanel
    ? "bg-violet-200 text-violet-700 dark:bg-violet-600/20 dark:text-violet-400"
    : "bg-indigo-200 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-400";
  const chipActive = isExtraPanel
    ? "border-violet-300 bg-violet-200/60 text-violet-800 dark:border-violet-500/40 dark:bg-violet-600/15 dark:text-violet-200"
    : "border-indigo-300 bg-indigo-200/60 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-600/15 dark:text-indigo-200";
  const numBadge = isExtraPanel
    ? "bg-violet-200 text-violet-700 dark:bg-violet-600/20 dark:text-violet-400"
    : "bg-indigo-200 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-400";
  const topicBadge = isExtraPanel
    ? "bg-violet-200/70 text-violet-700 dark:bg-violet-600/15 dark:text-violet-300"
    : "bg-indigo-200/70 text-indigo-700 dark:bg-indigo-600/15 dark:text-indigo-300";
  const topicHover = isExtraPanel
    ? "hover:border-violet-300 hover:bg-violet-100 dark:hover:border-violet-500/30 dark:hover:bg-violet-950/30"
    : "hover:border-indigo-300 hover:bg-indigo-100 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-950/30";
  const topicArrow = isExtraPanel ? "text-violet-500 dark:text-violet-400" : "text-indigo-500 dark:text-indigo-400";
  const btnStyle = isExtraPanel
    ? "border-violet-300 bg-violet-100 text-violet-700 hover:bg-violet-200 dark:border-violet-500/30 dark:bg-violet-600/10 dark:text-violet-300 dark:hover:bg-violet-600/20"
    : "border-indigo-300 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:border-indigo-500/30 dark:bg-indigo-600/10 dark:text-indigo-300 dark:hover:bg-indigo-600/20";

  return (
    <div className={`border-t px-4 py-4 sm:px-5 sm:py-5 md:px-4 md:py-4 ${panelBg}`}>
      <div className="mb-4 md:mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 md:gap-2.5">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9 md:h-8 md:w-8 ${accentBg}`}>
            <BookOpen size={16} className="md:h-3.5 md:w-3.5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 md:gap-1.5">
              <h3 className="text-sm md:text-xs font-semibold text-slate-900 dark:text-white sm:text-base md:text-sm">{discipline.name}</h3>
            </div>
            <p className="mt-0.5 text-xs md:text-[11px] text-slate-500 dark:text-slate-400">
              {year}º Ano · {semester}º Semestre
              {discipline.annual ? " · Anual" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-1.5">
          <span className={`rounded-full border px-2.5 md:px-2 py-0.5 text-[10px] md:text-[9px] font-semibold uppercase tracking-wide ${statusColors[status]}`}>
            {statusLabelMap[status]}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
          >
            <X size={15} className="md:h-3.5 md:w-3.5" />
          </button>
        </div>
      </div>

      <p className="mb-4 md:mb-3 text-[10px] md:text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
        {isExtraPanel
          ? "Plano de estudo — cadeira extra"
          : isInteractive
          ? "Plano de estudo — semestre corrente"
          : "Plano de estudo — só visualização"}
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-xl md:rounded-lg border border-slate-200 bg-white/60 p-6 md:p-4 dark:border-white/5 dark:bg-white/[0.02]">
          <Loader2 size={16} className="animate-spin text-indigo-500 dark:text-indigo-400 md:h-3.5 md:w-3.5" />
          <p className="text-sm md:text-xs text-slate-500 dark:text-slate-400">A carregar plano de estudo…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl md:rounded-lg border border-rose-300 bg-rose-50 p-4 md:p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
          <p className="text-sm md:text-xs font-semibold text-rose-700 dark:text-rose-300">Não foi possível carregar o plano</p>
          <p className="mt-1 text-xs md:text-[11px] text-rose-600/80 dark:text-rose-200/80">{error}</p>
        </div>
      ) : chapters.length === 0 ? (
        <div className="space-y-3 md:space-y-2.5">
          <div className="rounded-xl md:rounded-lg border border-dashed border-slate-300 bg-white/60 p-5 md:p-4 text-center dark:border-white/10 dark:bg-white/[0.02]">
            <Layers size={24} className="mx-auto mb-2 text-slate-400 dark:text-slate-600 md:h-5 md:w-5" />
            <p className="text-sm md:text-xs font-medium text-slate-500 dark:text-slate-400">Plano de estudo ainda não disponível</p>
            <p className="mt-1 text-xs md:text-[11px] text-slate-600 dark:text-slate-600">Os capítulos e temas serão inseridos brevemente.</p>
          </div>
          {isInteractive && (
            <button
              type="button"
              onClick={() => openDiscipline()}
              className={`flex w-full items-center justify-center gap-2 rounded-xl md:rounded-lg border px-4 md:px-3 py-2.5 md:py-2 text-sm md:text-xs font-medium transition ${btnStyle}`}
            >
              <BookOpen size={14} className="md:h-3.5 md:w-3.5" />
              Ir para a disciplina
              <ChevronRight size={14} className="md:h-3.5 md:w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 md:space-y-3">
          <div className={`flex gap-2 md:gap-1.5 overflow-x-auto pb-2 ${SCROLLBAR_X}`}>
            {chapters.map((chapter, idx) => {
              const isActive = chapter.id === activeChapter?.id;
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => setActiveChapterId(chapter.id)}
                  className={`inline-flex shrink-0 items-center gap-2 md:gap-1.5 rounded-full border px-3 md:px-2.5 py-2 md:py-1.5 text-xs md:text-[11px] font-medium transition ${
                    isActive
                      ? chipActive
                      : "border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-white/20 dark:hover:bg-white/[0.05] dark:hover:text-slate-200"
                  }`}
                  title={chapter.title}
                >
                  <span className="flex h-5 md:h-4 w-5 md:w-4 items-center justify-center rounded-full bg-black/10 text-[10px] md:text-[9px] font-bold dark:bg-black/20">
                    {idx + 1}
                  </span>
                  <span className="max-w-[11rem] truncate">{chapter.title}</span>
                  <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] md:text-[9px] text-slate-600 dark:bg-black/20 dark:text-slate-300">
                    {chapter.topics.length}
                  </span>
                </button>
              );
            })}
          </div>

          {activeChapter && (
            <div className="overflow-hidden rounded-xl md:rounded-lg border border-slate-200 bg-white/70 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 md:gap-1.5">
                    <span className={`flex h-6 md:h-5 w-6 md:w-5 shrink-0 items-center justify-center rounded-md text-[10px] md:text-[9px] font-bold ${numBadge}`}>
                      {chapters.findIndex((c) => c.id === activeChapter.id) + 1}
                    </span>
                    <h4 className="truncate text-sm md:text-xs font-semibold text-slate-800 dark:text-slate-200">{activeChapter.title}</h4>
                  </div>
                  <p className="mt-1 text-[11px] md:text-[10px] text-slate-500 dark:text-slate-500">
                    {activeChapter.status} · {activeChapter.topics.length} tema(s)
                  </p>
                </div>
                {isInteractive && (
                  <button
                    type="button"
                    onClick={() => openDiscipline()}
                    className={`shrink-0 rounded-lg border px-3 md:px-2.5 py-2 md:py-1.5 text-[11px] md:text-[10px] font-medium transition ${btnStyle}`}
                  >
                    Abrir disciplina
                  </button>
                )}
              </div>
              <div className="p-4 md:p-3">
                {activeChapter.topics.length > 0 ? (
                  <div className="grid gap-2 md:gap-1.5 md:grid-cols-2">
                    {activeChapter.topics.map((topic, topicIdx) =>
                      isInteractive ? (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => openDiscipline(topic.id)}
                          className={`group flex min-h-[3.25rem] w-full items-start gap-3 md:gap-2 rounded-lg border border-slate-200 bg-white px-3 md:px-2.5 py-2.5 md:py-2 text-left text-sm md:text-xs text-slate-700 transition dark:border-white/5 dark:bg-black/10 dark:text-slate-300 ${topicHover}`}
                        >
                          <span className={`mt-0.5 flex h-6 md:h-5 w-6 md:w-5 shrink-0 items-center justify-center rounded-md text-[10px] md:text-[9px] font-bold ${topicBadge}`}>
                            {topicIdx + 1}
                          </span>
                          <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">{topic.title}</span>
                          <ChevronRight size={12} className={`mt-1 shrink-0 ${topicArrow}`} />
                        </button>
                      ) : (
                        <div
                          key={topic.id}
                          className="flex min-h-[3.25rem] w-full items-start gap-3 md:gap-2 rounded-lg border border-slate-200 bg-white px-3 md:px-2.5 py-2.5 md:py-2 text-sm md:text-xs text-slate-500 dark:border-white/5 dark:bg-black/10 dark:text-slate-400"
                        >
                          <span className="mt-0.5 flex h-6 md:h-5 w-6 md:w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] md:text-[9px] font-bold text-slate-600 dark:bg-white/5 dark:text-slate-600">
                            {topicIdx + 1}
                          </span>
                          <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">{topic.title}</span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white/60 px-4 py-6 md:py-4 text-center text-xs md:text-[11px] text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-500">
                    Este capítulo ainda não tem temas registados.
                  </div>
                )}
              </div>
            </div>
          )}

          {isInteractive && (
            <button
              type="button"
              onClick={() => openDiscipline()}
              className={`flex w-full items-center justify-center gap-2 rounded-xl md:rounded-lg border px-4 md:px-3 py-2.5 md:py-2 text-sm md:text-xs font-medium transition ${btnStyle}`}
            >
              <BookOpen size={14} className="md:h-3.5 md:w-3.5" />
              Ir para a disciplina completa
              <ChevronRight size={14} className="md:h-3.5 md:w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   REGULAMENTOS — MODELO DE DADOS
================================================================ */
type ContentBlock =
  | { type: "p"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "note"; text: string }
  | { type: "formula"; text: string };

type RegArticle = {
  id: string;
  number: string;
  title?: string;
  blocks: ContentBlock[];
};

type RegSection = {
  id: string;
  title: string;
  articles: RegArticle[];
};

type RegChapter = {
  id: string;
  title: string;
  sections?: RegSection[];
  articles?: RegArticle[];
};

type RegulationCategory = "academico" | "avaliacao" | "disciplinar";

type RegulationDocument = {
  id: string;
  category: RegulationCategory;
  title: string;
  subtitle?: string;
  meta?: string;
  intro?: ContentBlock[];
  chapters: RegChapter[];
  closing?: ContentBlock[];
  signature?: { role: string; name: string }[];
};

const REGULATION_CATEGORY_META: Record<
  RegulationCategory,
  { label: string; icon: ElementType; description: string }
> = {
  academico: {
    label: "Regime Académico",
    icon: GraduationCap,
    description: "Matrícula, inscrição, precedências, transferências e mudança de curso.",
  },
  avaliacao: {
    label: "Avaliação & Exames",
    icon: FileCheck2,
    description: "Provas, exames, revisões, melhorias de nota e vigilância.",
  },
  disciplinar: {
    label: "Regime Disciplinar",
    icon: Scale,
    description: "Direitos, deveres, infracções e sanções aplicáveis aos estudantes.",
  },
};

function art(number: string, blocks: ContentBlock[], title?: string): RegArticle {
  return { id: `art-${number}`, number, title, blocks };
}
function p(text: string): ContentBlock {
  return { type: "p", text };
}
function list(items: string[], ordered = false): ContentBlock {
  return { type: "list", items, ordered };
}
function note(text: string): ContentBlock {
  return { type: "note", text };
}
function formula(text: string): ContentBlock {
  return { type: "formula", text };
}

const REG_ACADEMICO: RegulationDocument = {
  id: "regulamento-regime-academico",
  category: "academico",
  title: "Regulamento do Regime Académico",
  subtitle: "3.3 — Regime Académico do ISAF",
  meta: "Instituto Superior de Administração e Finanças (ISAF)",
  intro: [
    p("O ISAF – Instituto Superior Politécnico de Administração e Finanças é um estabelecimento privado de ensino superior, que se rege pelas leis, princípios e normas aplicáveis ao sub-sistema de ensino superior angolano e pelas disposições dos seus Estatutos."),
    p("A actividade académica do ISAF regula-se pelo presente Regulamento do Regime Académico."),
  ],
  chapters: [
    {
      id: "cap-1",
      title: "Capítulo I — Regime de Acesso",
      articles: [
        art("1º", [p("(Princípio geral)"),
          list([
            "O ingresso dos estudantes nos cursos de licenciatura ministrados pelo ISAF está condicionado à realização de matrícula, a qual, salvo situações específicas previstas nos Capítulos V e VI do presente Regulamento, obedece ao princípio geral de provas de acesso.",
            "O Director Geral poderá isentar os estudantes da prestação de provas de acesso, sempre que se preveja a existência de vagas para todos os candidatos.",
          ], true),
        ]),
        art("2º", [p("(Vagas existentes)"),
          list([
            "O acesso ao ISAF assenta na existência de um número estabelecido de vagas em cada Departamento.",
            "Cabe ao Director Geral determinar o número de vagas para ingresso e reparti-lo por cursos e especialidades.",
            "Para a definição do número de vagas para ingresso no ISAF e sua distribuição por cursos e especialidades, o Director Geral basear-se-á na disponibilidade de corpo docente e na existência de instalações e equipamentos didácticos necessários e adequados.",
            "O número de vagas para ingresso em cada curso e especialidade será tornado público por Despacho do Director Geral publicado antes do início das matrículas.",
          ], true),
        ]),
        art("3º", [p("(Calendário e anúncio da realização das provas de acesso)"),
          list([
            "O calendário das provas de acesso ao ISAF é elaborado e tornado público no mínimo 30 (trinta) dias antes da realização das provas.",
            "A duração de todo o processo das provas de acesso, da inscrição à publicação dos resultados finais, é de 30 (trinta) dias. Em caso de absoluta necessidade, esse prazo poderá ser dilatado mediante Despacho do Director Geral.",
            "À data do anúncio sobre a realização de cada prova de acesso deverão ser tornadas públicas informações sobre a natureza da prova a realizar e o respectivo conteúdo, programa e bibliografia recomendada para a admissão a cada curso.",
          ], true),
        ]),
        art("4º", [p("(Local de inscrição)"), p("A inscrição para as provas de acesso tem lugar nos Serviços Académicos do Instituto.")]),
        art("5º", [p("(Condições de inscrição)"), p("A inscrição para as provas de acesso é condicionada à conclusão do ensino pré-universitário, ensino médio ou equivalente, comprovada mediante apresentação do documento previsto na alínea b) do Artigo 6º.")]),
        art("6º", [p("(Processo de inscrição)"),
          p("O processo de inscrição para as provas de acesso deve ser constituído pelos seguintes documentos:"),
          list([
            "Bilhete de Identidade (passaporte, para os estrangeiros), acompanhado de uma fotocópia que ficará arquivada, depois de conferida com o original;",
            "Original do certificado do curso médio ou pré-universitário, com notas discriminadas em todas as disciplinas e anos;",
            "Fotocópia do certificado da situação militar regularizada;",
            "Ficha de admissão devidamente preenchida (a fornecer pelo ISAF);",
            "Comprovativo do pagamento à entidade promotora da taxa fixada para o efeito.",
          ]),
          p("No acto da inscrição para as provas, é emitido um recibo em nome do candidato."),
        ]),
        art("7º", [p("(Listas de candidatos)"), p("As listas de admissão à realização das provas serão afixadas nas instalações do ISAF, dentro do prazo previsto nos respectivos calendários.")]),
        art("8º", [p("(Realização da prova de acesso)"),
          list([
            "As provas de acesso realizam-se na data prevista no calendário, nas instalações do ISAF ou, excepcionalmente, em qualquer outro local para o efeito designado.",
            "Para prestação das provas de acesso é obrigatória a apresentação do Bilhete de Identidade ou Passaporte (para cidadãos estrangeiros) e do recibo fornecido pelo ISAF no acto de inscrição para as provas.",
          ], true),
        ]),
        art("9º", [p("(Júri)"),
          list([
            "O Júri para a coordenação do processo de elaboração, correcção e classificação das provas de acesso é nomeado por Despacho do Director Geral, o qual indicará um dos elementos do Júri para exercer as funções de Presidente.",
            "Caberá ao Júri a direcção do processo de correcção, avaliação e classificação das provas, assim como a afixação dos respectivos resultados finais, após terem sido homologados pelo Director Geral.",
            "Constitui competência do Director Geral a designação do Júri para revisão de provas.",
          ], true),
        ]),
        art("10º", [p("(Comunicação dos resultados)"),
          list([
            "Os resultados obtidos por cada candidato são tornados públicos pelo ISAF dentro do prazo estabelecido no calendário.",
            "As listas com os resultados finais serão afixadas de forma seriada, por cursos e turnos.",
          ], true),
        ]),
        art("11º", [p("(Apuramento dos candidatos)"),
          list([
            "Serão considerados admitidos os candidatos que obtenham as melhores classificações dentro do número de vagas existentes.",
            "O Director Geral poderá definir uma classificação mínima para a admissão a cada um dos cursos de cada Departamento.",
          ], true),
        ]),
        art("12º", [p("(Revisão de provas)"),
          list([
            "O candidato tem direito a solicitar revisão da sua prova, podendo apresentar nos Serviços Académicos do ISAF o respectivo pedido dentro de um prazo não superior a 48 (quarenta e oito) horas contadas a partir da afixação dos resultados.",
            "O Júri designado para o efeito procederá à revisão das provas e publicará os respectivos resultados, após homologação pelo Director Geral, num prazo não superior a 48 (quarenta e oito) horas contadas a partir do fim do prazo referido no ponto anterior.",
            "Caso o número de provas a ser revisto o justifique, o prazo inicial atrás referido poderá ser prorrogado mediante Despacho do Director Geral.",
            "Não há lugar a reclamação ou recurso da decisão do Júri de revisão de provas.",
          ], true),
        ]),
        art("13º", [p("(Relatórios)"), p("As Unidades Orgânicas enviarão ao Director Geral, no prazo de 15 (quinze) dias contados após o termo do processo, um relatório final sobre as provas de acesso.")]),
      ],
    },
    {
      id: "cap-2",
      title: "Capítulo II — Matrícula e Inscrição",
      sections: [
        {
          id: "sec-2-1",
          title: "Secção I — Matrícula",
          articles: [
            art("14º", [p("(Conceito)"), p("A matrícula é o acto pelo qual o estudante ingressa no Instituto Superior Politécnico de Administração e Finanças.")]),
            art("15º", [p("(Acesso a Matrícula)"), p("Podem efectuar a sua matrícula no ISAF os estudantes que se candidatem e sejam admitidos pelas seguintes vias:"),
              list([
                "Através do regime geral de acesso aos cursos do ISAF, o qual se aplica aos estudantes com o Ensino Secundário concluído ou possuidores de habilitações legalmente equivalentes, não podendo, neste caso, efectuar a sua candidatura pelo regime de reingresso, mudança de curso ou transferência, desde que satisfaçam as condições habilitacionais específicas e realizem as provas oficialmente exigidas;",
                "Através do regime de reingresso, mudança de curso ou transferência.",
              ]),
            ]),
            art("16º", [p("(Vigência de Matrícula e Pagamento)"),
              list([
                "Todos os estudantes admitidos no ISAF, que tenham sido aceites na sequência de um processo de candidatura, são obrigados a efectuar a sua matrícula sob pena de, sem motivo justificado e confirmado documentalmente, não poderem candidatar-se à matrícula e inscrição no ano lectivo seguinte, nem solicitar mudança de curso, reingresso ou transferência.",
                "No acto da matrícula é emitido um recibo em nome do estudante.",
              ], true),
            ]),
          ],
        },
        {
          id: "sec-2-2",
          title: "Secção II — Inscrição",
          articles: [
            art("17º", [p("(Efeitos e frequência)"),
              list([
                "A inscrição é um acto posterior à matrícula, ocorrendo a primeira inscrição em simultâneo com a matrícula.",
                "A inscrição é feita em cada Unidade Curricular em que o estudante pretenda ser avaliado.",
                "A inscrição faz-se semestralmente para as Unidades Curriculares semestrais ou anualmente para as anuais.",
                "Nenhum estudante pode, a qualquer título, frequentar ou ser avaliado em qualquer Unidade Curricular, sem se encontrar regularmente matriculado e inscrito na Unidade Curricular.",
                "No acto da inscrição, o estudante deverá optar pelo regime de avaliação a que pretende estar sujeito: a) o regime geral, que é o de Avaliação Contínua, ou b) o regime especial, que é o de Avaliação Final.",
                "Serão aceites os pedidos de inscrição em regime especial de avaliação para os estudantes que fundamentem a sua pretensão em razões de natureza geográfica ou profissional, impeditivas do seu enquadramento no regime geral de avaliação.",
                "Os Serviços Académicos afixarão a lista dos estudantes inscritos até 48 (quarenta e oito) horas antes do início do período lectivo.",
              ], true),
            ]),
            art("18º", [p("(Repetição de inscrição)"),
              list([
                "Não é permitida a repetição de inscrição em disciplinas em que o estudante tenha já obtido aprovação, excepto em caso de exame para melhoria de nota.",
                "A realização de exame para melhoria de nota é permitida uma única vez.",
              ], true),
            ]),
            art("19º", [p("(Funcionamento de cursos, disciplinas de opção e especializações)"), p("O funcionamento de cursos de graduação académica, de disciplinas de opção e de cursos ou ramos de especialização, para além da disponibilidade dos meios humanos, está condicionado à existência de um número mínimo de estudantes, em função de uma avaliação prévia a efectuar pelo Departamento onde se integrem.")]),
            art("20º", [p("(Instrução do processo de matrícula e inscrição)"),
              list([
                "A matrícula e inscrição são efectuadas nos Serviços Académicos do ISAF durante o período estipulado no calendário escolar do Instituto.",
                "Os estudantes cuja inscrição em determinada Unidade Curricular esteja condicionada aos resultados de exames a realizar em época de recurso dispõem de um prazo de 7 (sete) dias, contados a partir da publicação do resultado do último exame, para entregar o boletim de inscrição devidamente preenchido.",
                "Serão liminarmente indeferidos os pedidos cuja apresentação não se enquadre nos prazos estabelecidos.",
                "A matrícula e a inscrição só podem ser efectuadas pelo próprio, ou por procurador bastante, sendo os erros ou omissões cometidos no preenchimento do boletim da exclusiva responsabilidade deste.",
              ], true),
              p("Documentos necessários para a matrícula:"),
              list([
                "Boletim de matrícula, devidamente preenchido;",
                "Bilhete de identidade de cidadão nacional ou passaporte, tratando-se de estrangeiros;",
                "Original da certidão de habilitações literárias, com notas discriminadas;",
                "Atestado médico;",
                "Declaração de entidade patronal, tratando-se de trabalhadores-estudantes;",
                "Fotocópia de certificado da situação militar regularizada;",
                "Fotografia tipo passe em número a definir pelos Serviços Académicos;",
                "Comprovativo do pagamento à entidade promotora da taxa fixada para o efeito.",
              ]),
              p("Documentos necessários para a inscrição nas Unidades Curriculares:"),
              list([
                "Boletim de inscrição, devidamente preenchido;",
                "Comprovativo do pagamento à entidade promotora da taxa fixada para o efeito.",
              ]),
            ]),
          ],
        },
        {
          id: "sec-2-3",
          title: "Secção III — Anulação de Matrícula e de Inscrição",
          articles: [
            art("21º", [p("(Anulação de matrícula e de inscrição)"),
              p("A anulação da matrícula de qualquer estudante pode verificar-se nas seguintes condições:"),
              list([
                "A pedido do estudante;",
                "Quando se constate que foram prestadas falsas declarações;",
                "Sempre que seja determinada, na sequência de processo disciplinar;",
                "Caso a instituição promotora a solicite ao Director-Geral, por comprovado e continuado incumprimento das obrigações financeiras assumidas pelo estudante no acto da matrícula.",
              ]),
              p("A anulação da matrícula é concretizada mediante despacho do Director Geral."),
              p("A anulação da inscrição do estudante em uma ou mais Unidades Curriculares pode verificar-se nas seguintes condições:"),
              list([
                "Caso o estudante apresente por escrito aos Serviços Académicos o pedido de anulação, até 4 (quatro) semanas após o início das aulas;",
                "Caso o estudante não tenha preenchido correctamente o boletim de inscrição, não tenha apresentado o comprovativo de pagamento ou não tenha praticado qualquer desses actos dentro do prazo definido;",
                "Caso o estudante se tenha inscrito em Unidade Curricular em que, por razões de precedência, venha a constatar-se que não se poderia inscrever.",
              ]),
              p("A anulação da inscrição concretiza-se mediante despacho do Chefe dos Serviços Académicos."),
            ]),
            art("22º", [p("(Consequência pela anulação da matrícula ou da inscrição)"),
              list([
                "Caso se verifique a anulação da matrícula, o reingresso no Instituto está condicionado à obtenção de despacho favorável do Director Geral, a requerimento apresentado para o efeito.",
                "A reinscrição em uma ou mais Unidades Curriculares poderá ser realizada, como se de inscrição nova se tratasse, desde que ultrapassado o óbice que determinou a anulação e obedecidos os procedimentos previstos no Artigo 19º.",
              ], true),
            ]),
          ],
        },
        {
          id: "sec-2-4",
          title: "Secção IV — Mensalidade",
          articles: [
            art("23º", [p("(Propina)"),
              list([
                "Propina é o acto que faculta ao estudante, depois da inscrição, a frequência das diversas disciplinas do curso.",
                "A propina é paga mensalmente até ao dia 10 (dez) de cada mês, ou ao primeiro dia útil subsequente, caso esse dia seja de descanso semanal ou feriado.",
                "O incumprimento do ponto anterior poderá sujeitar o estudante: a) ao pagamento de uma sobretaxa a definir em diploma próprio; b) a sanções a serem definidas pelo Director Geral, a pedido da entidade promotora, podendo conduzir à anulação da matrícula, conforme a gravidade da situação.",
                "No acto do pagamento da propina é emitido pela entidade promotora um recibo em nome do estudante.",
              ], true),
            ]),
          ],
        },
      ],
    },
    {
      id: "cap-3",
      title: "Capítulo III — O Ensino e Avaliação de Conhecimentos e Competências",
      sections: [
        {
          id: "sec-3-1",
          title: "Secção I — Ensino-Aprendizagem",
          articles: [
            art("24º", [p("(Âmbito)"),
              list([
                "As Unidades Curriculares dos cursos são leccionadas de acordo com os planos curriculares e conteúdos programáticos definidos, sendo coordenadas por cada Departamento.",
                "O conteúdo programático de cada Unidade Curricular, com a respectiva bibliografia recomendada, é disponibilizado aos estudantes nela inscritos no início do ano ou semestre lectivo.",
                "As Unidades Orgânicas devem abrir, por cada Unidade Curricular da sua responsabilidade, um dossier onde fique arquivada toda a informação pertinente (conteúdo programático, mapas de dosificação, enunciados de provas, apontamentos, etc.).",
                "Sem prejuízo da liberdade de orientação e de opinião científica dos docentes, o ensino será ministrado mediante aulas, conferências, colóquios, seminários, estágios e estudos livres, ou outros processos julgados convenientes.",
              ], true),
            ]),
            art("25º", [p("(Formas de organização do ensino)"),
              list([
                "Cada docente utilizará as formas de organização do ensino adequadas às características da Unidade Curricular, leccionando aulas teóricas e práticas de forma a constituir um sistema.",
                "As aulas práticas devem servir para a resolução de exercícios, realização de experiências, demonstrações ou trabalhos laboratoriais, permitindo aos estudantes desenvolver capacidades e competências na aplicação de procedimentos e técnicas.",
                "Em cada aula teórica devem ser criadas condições de estudo para a aprendizagem compreensiva de factos, conceitos e princípios.",
                "As aulas podem ser teórico-práticas, destinando-se a propiciar a aprendizagem compreensiva das relações entre métodos, processos e técnicas de aplicação prática de conceitos e princípios.",
              ], true),
            ]),
            art("26º", [p("(Conferências)"), p("As conferências são aulas teóricas e têm em vista a análise, por especialistas, de temas referentes a uma determinada área do saber.")]),
            art("27º", [p("(Colóquios)"), p("Os colóquios têm em vista a análise e discussão amplamente participada de um ou vários temas afins, previamente fixados.")]),
            art("28º", [p("(Seminários)"),
              list([
                "Os seminários destinam-se a aprofundar um determinado sistema de conhecimentos ou aspectos tratados nas aulas teóricas.",
                "Quando se realizarem seminários, dever-se-á entregar aos estudantes um guia para a preparação prévia.",
                "Os seminários devem ser participativos e activos, podendo organizar-se mediante exposição por equipas, perguntas e respostas, debate ou outros processos.",
              ], true),
            ]),
            art("29º", [p("(Visitas de Estudo)"),
              list([
                "As visitas de estudo destinam-se a propiciar a observação e investigação directa de um ou vários objectos de estudo, situados fora do local habitual de aprendizagem.",
                "Implicam uma clara definição de objectivos e métodos de trabalho, preparação cuidada, boa organização das observações e expressão dos resultados obtidos.",
              ], true),
            ]),
            art("30º", [p("(Projecto)"),
              list([
                "Os trabalhos de projecto consistem na integração do estudo já desenvolvido ao longo do ano ou nos anos anteriores, destinando-se a fomentar a criatividade e o espírito investigativo dos estudantes.",
                "Os trabalhos de projecto incidirão sobre temas propostos pelos docentes e desenvolvidos pelos estudantes com o apoio de, pelo menos, um docente.",
              ], true),
            ]),
            art("31º", [p("(Estágio)"), p("Os estágios têm por fim fomentar e desenvolver nos estudantes qualidades de criatividade, inovação e capacidade de investigação científica ou pedagógica, assim como a capacidade de aplicação de conhecimentos adquiridos à resolução de problemas concretos, com vista à sua formação académica e profissional.")]),
            art("32º", [p("(Sumários)"), p("No início de cada aula, o docente deverá:"),
              list([
                "Preencher, em suporte próprio destinado para o efeito pelos Serviços Académicos, um sumário da mesma, referindo os itens leccionados, a actividade realizada e as indicações necessárias ao estudo do estudante;",
                "Fornecer aos estudantes esses mesmos elementos.",
              ]),
            ]),
            art("33º", [p("(Programação e calendário do ano académico)"),
              p("No início de cada ano escolar, o ISAF publicará a programação do ano académico, que incluirá:"),
              list([
                "As datas de início e fim do período lectivo;",
                "Os períodos de férias lectivas e de pausas académicas;",
                "Os períodos de matrícula e de inscrição;",
                "Os períodos de realização de provas de frequência;",
                "O início e o fim das épocas de exames.",
              ]),
              p("A programação é de cumprimento obrigatório pelos docentes. Antes do início do período lectivo será publicado o horário das aulas de cada unidade curricular."),
            ]),
          ],
        },
        {
          id: "sec-3-2",
          title: "Secção II — Avaliação de Conhecimentos e Competências",
          articles: [
            art("34º", [p("(Avaliação académica)"), p("Todas as regras relativas ao processo e aos regimes de avaliação académica constam do Regulamento do Sistema de Avaliação da Aprendizagem em vigor no ISAF.")]),
            art("35º", [p("(Transição de ano)"), p("O estudante só transita de ano nas seguintes condições:"),
              list([
                "Se tiver um máximo de três disciplinas em atraso;",
                "Se tiver todas as mensalidades pagas.",
              ]),
            ]),
            art("36º", [p("(Cálculo da classificação final do curso)"),
              list([
                "O final de curso é sancionado após conclusão com aproveitamento de todas as disciplinas do plano curricular e, cumulativamente, com a apresentação, defesa e aprovação do trabalho de fim de curso.",
                "O trabalho de fim de curso é um trabalho científico que pode revestir várias modalidades, sendo objecto de regulamento próprio.",
                "A nota final de curso combinará as notas finais das disciplinas e a nota do trabalho de fim de curso.",
              ], true),
            ]),
          ],
        },
      ],
    },
    {
      id: "cap-4",
      title: "Capítulo IV — Regime de Precedência",
      articles: [
        art("37º", [p("(Precedência)"),
          list([
            "Nos cursos ministrados no ISAF, em cada semestre ou ano lectivo, podem existir Unidades Curriculares com precedência.",
            "Considera-se Unidade Curricular com precedência aquela em que é necessária aprovação prévia noutra ou noutras Unidades Curriculares do semestre ou ano anterior do curso, para que o estudante nela se possa inscrever.",
            "As relações de precedência entre as Unidades Curriculares que integram cada curso são definidas no respectivo Programa de Curso.",
          ], true),
        ]),
      ],
    },
    {
      id: "cap-5",
      title: "Capítulo V — Regime de Transferência e Mudança de Curso",
      articles: [
        art("38º", [p("(Definição)"),
          list([
            "Transferência é o acto pelo qual um estudante de outra Instituição de Ensino Superior requer a sua admissão no ISAF, ou vice-versa.",
            "Mudança de curso é o acto pelo qual um estudante do ISAF solicita admissão num curso diferente daquele em que praticou a última inscrição.",
            "A transferência ou mudança de curso só é permitida antes do início de cada ano lectivo, devendo o interessado ou seu procurador requerê-la ao Director-Geral do ISAF.",
          ], true),
        ]),
      ],
    },
    {
      id: "cap-6",
      title: "Capítulo VI — Equivalência de Habilitações",
      articles: [
        art("39º", [p("(Âmbito)"),
          list([
            "Pode ser concedida equivalência de habilitações às correspondentes habilitações adquiridas em instituições nacionais de ensino superior.",
            "A equivalência de habilitações é requerida ao Director Geral, devendo o requerimento mencionar obrigatoriamente as unidades curriculares de que é requerida a equivalência, a instituição onde foram adquiridas e a área científica em que se integram.",
          ], true),
        ]),
        art("40º", [p("(Documentos para a instrução do pedido)"), p("O requerimento, de acordo com as habilitações de que se requer a equivalência, será acompanhado dos seguintes documentos:"),
          list([
            "Diploma, certificado ou documento comprovativo de aprovação nas unidades curriculares de que é requerida equivalência, com indicação da respectiva classificação;",
            "Plano de estudos onde conste a designação dessas unidades curriculares e o seu conteúdo programático;",
            "Carga horária ou unidades de créditos dessas unidades curriculares.",
          ]),
        ]),
        art("41º", [p("(Matrícula e inscrição de estudantes que solicitem equivalência)"), p("As decisões proferidas relativamente aos pedidos de equivalência de habilitações adquiridas em outras instituições de ensino superior nacionais não excluem a aplicabilidade das regras gerais em vigor quanto à matrícula e inscrição no ISAF, nomeadamente as constantes do Capítulo II do presente regulamento.")]),
      ],
    },
    {
      id: "cap-7",
      title: "Capítulo VII — Direitos e Deveres do Corpo Discente e Regime Disciplinar",
      sections: [
        {
          id: "sec-7-1",
          title: "Secção I — Direitos e Deveres dos Discentes",
          articles: [
            art("42º", [p("(Direitos)"), p("O estudante tem os seguintes direitos:"),
              list([
                "Frequentar as aulas bem como usufruir dos meios de ensino, de investigação e de produção;",
                "Usufruir dos serviços prestados pelas estruturas sociais da instituição;",
                "Possuir um cartão que o identifique como estudante;",
                "Reclamar e recorrer perante as estruturas competentes de qualquer acto lesivo dos seus interesses, respeitadas as normas institucionais sobre a matéria;",
                "Ser tratado com consideração e respeito pela sua integridade e dignidade.",
              ]),
            ]),
            art("43º", [p("(Deveres)"), p("O estudante tem os seguintes deveres:"),
              list([
                "Dedicar todo o seu esforço e aptidão ao bom aproveitamento académico;",
                "Respeitar e observar os regulamentos em vigor no ISAF e nos respectivos Departamentos;",
                "Respeitar e tratar com lealdade as autoridades académicas, os docentes, os trabalhadores não docentes e os colegas;",
                "Obedecer às orientações superiormente emanadas;",
                "Utilizar de forma adequada os bens e equipamentos que constituem património do ISAF.",
              ]),
            ]),
          ],
        },
        {
          id: "sec-7-2",
          title: "Secção II — Regime Disciplinar",
          articles: [
            art("44º", [p("(Procedimento disciplinar)"),
              list([
                "O poder disciplinar é exercido pelo Director-Geral ou por quem este delegar expressamente esta competência.",
                "Qualquer violação às normas vigentes no ISAF deve ser objecto de informação circunstanciada, por quem, no exercício das suas funções, a verificar.",
                "O procedimento disciplinar será organizado e conduzido do modo mais simples, eficaz e célere, implicando, obrigatoriamente e em todos os casos, a audição do estudante arguido e o direito de defesa deste.",
              ], true),
            ]),
            art("45º", [p("(Sanções)"),
              list([
                "Os estudantes do ISAF estão sujeitos às seguintes sanções disciplinares: a) Admoestação simples; b) Censura registada; c) Suspensão temporária; d) Expulsão.",
                "Todas as sanções são registadas no processo individual do estudante pelos Serviços Académicos.",
              ], true),
            ]),
            art("46º", [p("(Infracções)"), p("Consideram-se infracções disciplinares, designadamente:"),
              list([
                "Inobservância dos regulamentos em vigor;",
                "Desrespeito às autoridades académicas, aos trabalhadores, docentes e colegas do ISAF;",
                "Ofensas verbais, escritas ou físicas contra as autoridades académicas, trabalhadores, docentes e colegas do ISAF;",
                "Danos causados intencionalmente ou com negligência grave nas instalações, equipamentos ou materiais que constituem propriedade do ISAF;",
                "Desobediência a ordens superiores do ISAF;",
                "Furto, roubo ou destruição de bens patrimoniais do ISAF;",
                "Fraude em provas de avaliação contínua ou em exames;",
                "Suborno activo ou passivo e corrupção relacionados com a vida académica;",
                "Actos perturbadores da organização e regular funcionamento do ISAF;",
                "Actos que denotem xenofobia, racismo ou outra forma de discriminação étnica, social, política, religiosa ou sexual.",
              ]),
            ]),
            art("47º", [p("(Fraude)"), p("Constitui fraude na realização de provas de avaliação contínua ou exames, nomeadamente:"),
              list([
                "O recurso à consulta de documentação de qualquer natureza quando não expressamente autorizada, durante a realização da prova;",
                "A cópia e a troca de opiniões ou de informações relativas à prova em curso entre participantes na mesma ou entre estes e terceiras pessoas não autorizadas;",
                "O indevido conhecimento prévio, parcial ou total, das questões da prova, ou a tentativa da sua obtenção.",
              ]),
              p("Constitui ainda fraude a cópia de obras alheias em provas e trabalhos escolares submetidos a avaliação."),
            ]),
            art("48º", [p("(Atenuantes)"), p("São circunstâncias atenuantes da infracção disciplinar:"),
              list(["O bom comportamento anterior;", "O bom aproveitamento académico;", "A confissão espontânea da infracção."]),
            ]),
            art("49º", [p("(Agravantes)"), p("São circunstâncias agravantes da infracção disciplinar:"),
              list(["A premeditação;", "A acumulação de infracções;", "A reincidência."]),
            ]),
            art("50º", [p("(Critérios de graduação)"),
              list([
                "Para aplicação das sanções disciplinares previstas, salvo a de admoestação simples e a de admoestação registada, é exigida prévia instauração de processo disciplinar escrito.",
                "As sanções disciplinares serão graduadas em função da gravidade da infracção e das circunstâncias agravantes e atenuantes.",
                "O instrutor do processo disciplinar é nomeado pelo Director-Geral ou por quem detenha essa competência por delegação expressa.",
                "Durante o processo disciplinar, o estudante pode ser suspenso preventivamente.",
              ], true),
            ]),
            art("51º", [p("(Recurso)"),
              list([
                "O estudante tem direito de recorrer das decisões de aplicação de sanções disciplinares.",
                "O prazo de interposição de recurso é de 15 (quinze) dias, contados a partir da data em que o estudante tenha conhecimento por escrito da medida disciplinar aplicada.",
                "A decisão sobre o recurso é definitiva e irrecorrível.",
              ], true),
            ]),
          ],
        },
      ],
    },
    {
      id: "cap-8",
      title: "Capítulo VIII — Disposições Finais",
      articles: [
        art("52º", [p("(Obrigatoriedade da observância)"), p("O presente regulamento é de observância obrigatória, não podendo o seu desconhecimento ser invocado por docentes, trabalhadores e estudantes do ISAF como justificação para o incumprimento de qualquer das regras que o compõem.")]),
        art("53º", [p("(Dúvidas e Casos Omissos)"), p("As dúvidas e os casos omissos suscitados na interpretação e na aplicação deste regulamento serão resolvidos pelo Director Geral do ISAF.")]),
      ],
    },
  ],
};

/* ================================================================
   DOC 2 — REGULAMENTO DE AVALIAÇÃO DA APRENDIZAGEM
================================================================ */

const REG_AVALIACAO: RegulationDocument = {
  id: "regulamento-avaliacao-aprendizagem",
  category: "avaliacao",
  title: "Regulamento de Avaliação da Aprendizagem",
  subtitle: "Regulamento 003 | Versão 1.0",
  meta: "Elaboração: 19/07/2024 · Revisão: 09/04/2025 · Aprovação: 11/09/2025",
  chapters: [
    {
      id: "cap-1",
      title: "Capítulo I — Disposições Gerais",
      articles: [
        art("1º", [p("(Objecto)"), p("Este Regulamento estabelece as disposições aplicáveis à avaliação da aprendizagem nos cursos de licenciatura do ISAF – Instituto Superior Técnico de Administração e Finanças.")]),
        art("2º", [p("(Definição)"), p("Para efeitos do presente Regulamento, entende-se por avaliação da aprendizagem o processo destinado a avaliar os conhecimentos dos estudantes nas unidades curriculares dos cursos de licenciatura.")]),
        art("3º", [p("(Regimes de avaliação da aprendizagem)"), p("A avaliação da aprendizagem dos estudantes em cada unidade curricular far-se-á por um Regime Geral, também designado \"com frequência\", para todos os cursos e períodos.")]),
      ],
    },
    {
      id: "cap-2",
      title: "Capítulo II — Regime Geral de Avaliação",
      articles: [
        art("4º", [p("(Elementos da avaliação presencial e contínua)"),
          list([
            "No regime geral ou \"com frequência\", a avaliação é presencial e contínua.",
            "O regime geral é obrigatório no ano curricular em que o estudante está inscrito. Constituem elementos obrigatórios: a) Provas de frequência; b) Avaliação contínua; c) Exame Final.",
            "O estudante fica dispensado do Exame Final se tiver obtido uma nota igual ou superior a catorze valores, na escala de 0 a 20, desde que tenha classificação positiva nas avaliações anteriores.",
            "A classificação da unidade curricular para dispensa do exame é a média ponderada dos elementos de avaliação, com os seguintes coeficientes de ponderação:",
          ], true),
          {
            type: "table",
            headers: ["Elementos de avaliação", "UC Semestral", "UC Anual"],
            rows: [
              ["1ª Frequência", "45%", "45%"],
              ["2ª Frequência", "45%", "45%"],
              ["Avaliação contínua (Prova avaliativa)", "10%", "10%"],
            ],
          },
          p("A nota do Exame é considerada como nota final da unidade curricular."),
          p("O estudante obtém aprovação na unidade curricular se tiver classificação igual ou superior a 10 valores."),
        ]),
        art("5º", [p("(Provas de frequência)"),
          list([
            "As provas de frequência são um elemento obrigatório da avaliação de aprendizagem do estudante. Realizam-se rigorosamente nas datas e horários fixados no calendário de provas, com duração de 120 minutos, classificadas na escala de zero (0) a vinte (20) valores.",
            "São exigidas duas (2) provas de frequência para cada unidade curricular no decurso do semestre.",
            "A prova de segunda frequência pode ser substituída por um trabalho, sujeito à defesa, devidamente concertado entre os docentes da UC, validado pelo Coordenador do Curso e aprovado pela Direcção Académica.",
            "O critério de avaliação da mesma UC deve ser uniforme.",
            "O estudante que perde uma das frequências deverá realizar as demais avaliações, com prejuízo da classificação da avaliação perdida, não sendo possível a remarcação.",
            "O docente é responsável pela classificação da prova de frequência e pelo registo dos resultados na plataforma de gestão académica.",
            "Os docentes providenciarão formas expeditas de permitir que os estudantes possam consultar as suas provas classificadas de cinco (5) a sete (7) dias úteis após a data de realização, conforme o número de estudantes por turma.",
            "Finda a consulta, o docente tomará as diligências adequadas para as remeter à Direcção Académica para efeitos de arquivo.",
            "O estudante que não concordar com a nota atribuída pode solicitar a revisão da sua prova 72 horas após a publicação das notas.",
          ], true),
        ]),
        art("6º", [p("(Avaliação contínua)"),
          list([
            "A avaliação contínua é um elemento obrigatório da avaliação de aprendizagem do estudante, de carácter cumulativo, visando classificar o desempenho do estudante em termos de participação nas aulas, interesse demonstrado e resultados e eficiência do aluno.",
            "O docente regista na plataforma de gestão de alunos a classificação da avaliação contínua com base no valor ponderado de 10%.",
            "O prazo para registo na plataforma é de até cinco dias úteis depois do último dia de aulas do semestre.",
          ], true),
        ]),
        art("7º", [p("(Exames)"),
          list([
            "Cabe à Direcção do ISAF organizar, coordenar e superintender as actividades administrativas, logísticas e de alocação de docentes aos serviços de vigilância dos exames.",
            "A matéria objecto de avaliação nos exames é a leccionada no decurso do semestre ou ano lectivo, consoante se trate de unidade curricular semestral ou anual.",
            "O Exame é obrigatório para os estudantes que não tenham sido dispensados.",
            "Para o cálculo da média final de avaliação na UC, o Exame tem o peso de 60%.",
          ], true),
        ]),
      ],
    },
    {
      id: "cap-3",
      title: "Capítulo III — Regime Específico de Avaliação",
      articles: [
        art("9º", [p("(Exame final)"),
          list([
            "O exame final é o momento de avaliação sobre toda a matéria leccionada no decurso do semestre.",
            "Tem lugar depois de terminadas as aulas, em datas fixadas no Calendário Académico, em duas épocas: a) Normal; b) Recurso.",
            "Designa-se normal a primeira oferta do exame final após o fim das aulas semestrais e, de recurso, a segunda oferta.",
            "Têm acesso ao exame final em época normal todos os estudantes inscritos em unidades curriculares.",
            "Têm acesso ao exame final em época de recurso os estudantes sem aprovação no exame final de época normal.",
            "A nota do exame de recurso tem o peso de 80% e será calculada obedecendo à seguinte fórmula:",
          ], true),
          formula("Nota Final de Exame de Recurso = 0,8 × Nota da avaliação de Recurso + 0,2 × Nota da Média geral"),
          p("Havendo mais que um docente a classificar exames de uma mesma unidade curricular, cabe ao coordenador da unidade curricular garantir a uniformização dos conteúdos a ser avaliados e a entrega dos resultados nos prazos previamente anunciados. Observar-se-ão os seguintes prazos para comunicar os resultados de exames:"),
          list([
            "Para os exames da época normal, até 3 dias úteis antes da data da realização do exame de recurso;",
            "Para os exames de recurso, até 5 dias úteis a contar da data da sua realização;",
            "Para os exames especiais, até 5 dias úteis a contar da data da sua realização.",
          ]),
        ]),
        art("10º", [p("(Emolumentos)"), p("Pela realização de exame de recurso ou especial, o estudante deverá pagar os emolumentos fixados na Tabela de Propinas e Emolumentos, tendo consigo o comprovativo de pagamento que lhe poderá ser exigido no momento de acesso à prova de exame.")]),
      ],
    },
    {
      id: "cap-4",
      title: "Revisão de Provas e Melhoria de Notas",
      articles: [
        art("11º", [p("(Revisão de prova)"),
          list([
            "O estudante tem o direito de requerer a revisão de prova de exame final ou de qualquer outra avaliação feita, dentro do prazo estipulado de até 72 horas após a data da publicação dos resultados.",
            "O requerimento é entregue na Secretaria Académica.",
            "No acto de entrega do requerimento, o requerente deve apresentar o comprovativo de pagamento dos referidos emolumentos.",
            "O pagamento realizado pelo estudante correspondente ao processo de revisão não será devolvido, ainda que solicitada a revisão.",
            "A revisão deverá ser feita por um júri.",
          ], true),
        ]),
        art("12º", [p("(Melhoria de nota)"),
          list([
            "O estudante pode requerer melhoria de classificação em qualquer unidade curricular em que tenha obtido aprovação, dentro do semestre inscrito.",
            "O requerimento é apresentado na Secretaria Académica e está limitado a um (1) número de vezes em que o estudante pode requerer exame de melhoria de classificação por unidade curricular.",
            "Não é permitida a melhoria de nota para os estudantes que tenham passado por situação de fraude.",
            "Pelo requerimento, o estudante pagará os emolumentos constantes da Tabela de Emolumentos.",
            "A classificação obtida no exame de melhoria prevalece sobre a anterior apenas se for superior a esta.",
            "A nota final do exame de melhoria tem o peso de 80% e será calculada obedecendo à seguinte fórmula:",
          ], true),
          formula("Nota Final de Exame de Melhoria = 0,8 × Nota da avaliação de Melhoria + 0,2 × Nota anterior"),
        ]),
      ],
    },
    {
      id: "cap-5",
      title: "Capítulo IV — Época Especial de Exames",
      articles: [
        art("13º", [p("(Exame especial)"),
          list([
            "Cabe à Direcção do ISAF realizar o Exame Especial, caso existam estudantes elegíveis nos termos do Artº 14º.",
            "Nos anos lectivos em que se realizar a época especial de exames, os estudantes serão informados através de aviso publicado nos locais conspícuos habituais.",
            "Em época especial existe apenas uma chamada.",
            "O estudante só poderá ter acesso a exames em época especial nas unidades curriculares em que está regularmente inscrito no ano lectivo a que corresponde a época especial.",
            "Em época especial, cada estudante apenas se poderá inscrever para exame a um conjunto de unidades curriculares que não exceda o número de três UCs.",
            "A inscrição para época especial decorre após a inscrição no exame ou por solicitação escrita endereçada à Direcção do ISAF.",
            "A nota final do exame especial tem o peso de 80% e será calculada obedecendo à seguinte fórmula:",
          ], true),
          formula("Nota Final de Exame Especial = 0,8 × Nota da avaliação de Melhoria + 0,2 × Nota anterior"),
        ]),
        art("14º", [p("(Acesso ao Exame Especial)"),
          p("Nos anos lectivos em que a Direcção do ISAF decidir realizar uma época especial de exames, têm acesso a exame os estudantes que se encontrem nas seguintes situações:"),
          list([
            "Estudantes finalistas que tenham cadeiras em atraso;",
            "Estudantes que, tendo estado de licença de maternidade, não tenham podido comparecer ao exame da unidade curricular. Deverão entregar a certidão de registo de nascimento;",
            "Estudantes desportistas federados que comprovem o seu estatuto através de declaração da respectiva Federação antes do fim do segundo semestre e que não tenham podido comparecer ao exame por motivo de participação em estágio ou prova desportiva federada;",
            "Estudantes com estatuto de trabalhador-estudante, desde que tenham feito prova dessa qualidade no início do semestre correspondente;",
            "Estudantes bombeiros com pelo menos um ano de serviço efectivo, que comprovem o seu estatuto antes do fim do segundo semestre e não tenham podido comparecer por motivo de actividade operacional;",
            "Estudantes militares com pelo menos seis meses de incorporação, que comprovem o seu estatuto antes do fim do segundo semestre e não tenham podido comparecer por motivo de actividade operacional;",
            "Estudantes que não tenham podido comparecer ao exame por motivo de: i. Comparência em tribunal; ii. Trabalho de cidadania relacionado com eleições; iii. Trabalho de voluntariado organizado de socorro e ajuda humanitária de emergência; iv. Doação de sangue no âmbito de campanhas públicas; v. Cirurgia de emergência.",
          ]),
          note("É proibido realizar a melhoria de notas no exame de época especial."),
        ]),
      ],
    },
    {
      id: "cap-6",
      title: "Capítulo V — Disposições Finais",
      articles: [
        art("15º", [p("(Outras disposições)"),
          list([
            "O estudante é responsável pelo cumprimento das instruções que lhe forem dadas no enunciado das provas, pelos serviços e pelos docentes vigilantes dos exames.",
            "Os exames são individuais e intransmissíveis.",
            "São inaceitáveis e puníveis os comportamentos que violem a individualidade dos exames, como a troca de informação entre examinandos sob qualquer forma ou a utilização de computadores, telemóveis ou quaisquer outros instrumentos de acesso a informação ou comunicação.",
            "São igualmente inaceitáveis e puníveis as práticas que visem alterar, substituir ou de qualquer outra forma suscitar dúvidas acerca da identidade do examinando.",
            "São inaceitáveis práticas de fraude académica em qualquer momento de avaliação.",
          ], true),
        ]),
        art("16º", [p("(Dúvidas e omissões)"), p("As dúvidas suscitadas na interpretação e na aplicação deste Regulamento e as omissões serão resolvidas por despacho da Direcção Geral.")]),
      ],
    },
  ],
  closing: [p("A DIRECÇÃO DO ISAF. Setembro de 2025."), p("Aprovado pelo Conselho Pedagógico em reunião de 20 de setembro de 2025."), p("Luanda, aos 20 de setembro de 2025.")],
  signature: [{ role: "A Presidente", name: "Dra. Carla Cristina Vilarinho de Sousa Queiroz" }],
};

/* ================================================================
   DOC 3 — INSTRUTIVO DE REALIZAÇÃO DE PROVAS
================================================================ */

const REG_INSTRUTIVO: RegulationDocument = {
  id: "instrutivo-realizacao-provas",
  category: "avaliacao",
  title: "Instrutivo de Realização de Provas",
  meta: "Luanda, 20 de janeiro de 2026",
  intro: [
    p("O Regulamento Académico do ISAF e outros normativos estabelecem um conjunto de normas e procedimentos a serem cumpridos pelos Estudantes durante o período avaliativo."),
    p("Pela experiência dos anos anteriores, recomenda-se a adopção de alguns procedimentos para o alcance dos melhores resultados possíveis. Deste modo, com vista a garantir o melhor funcionamento no decorrer deste processo, determina-se o seguinte:"),
  ],
  chapters: [
    {
      id: "cap-unico",
      title: "Normas Gerais",
      articles: [
        art("", [
          list([
            "As provas têm a duração de 120 minutos;",
            "Para acesso às salas de provas, os Estudantes devem ser portadores do cartão de estudante ou bilhete de identidade. No dia da prova, os Estudantes devem-se fazer presentes à porta da sala onde se realizará a prova 10 minutos antes da hora do início da mesma;",
            "A tolerância de atraso na comparência dos Estudantes às provas não pode ultrapassar os 15 minutos após a hora do início;",
            "Os Estudantes cujos nomes não constarem na lista de presenças/pauta estão proibidos de entrar na sala, a não ser que sejam portadores de uma autorização por escrito da Coordenação de Exames;",
            "Para a realização das provas, os Estudantes não podem entrar na sala com pastas ou mochilas, telemóveis, tablets nem quaisquer sistemas de comunicação móvel (computadores, auriculares, headphones, smartwatch, etc.) e quaisquer suportes não autorizados (livros, cadernos, sebentas, folhas). Em caso de incumprimento desta proibição, a prova será anulada;",
            "Compete ao Docente anular imediatamente as provas dos Estudantes que, no decurso da realização da prova, cometam ou tentem cometer actos que se traduzam inequivocamente em fraude académica;",
            "É proibido o uso de canetas com tinta apagável e corrector;",
            "Não é permitido aos Estudantes saírem para irem às casas de banho. Em caso de saída, o estudante deve entregar a sua prova.",
          ], true),
          note("A anulação da prova não impede a aplicação de outras sanções que o Regulamento Disciplinar do ISAF considere adequadas."),
          p("Chama-se especial atenção aos Estudantes para o cumprimento estrito destas regras, para se evitarem eventuais constrangimentos."),
          p("Em caso de dúvidas, contactar o(a) Departamento de Ensino."),
        ]),
      ],
    },
  ],
  signature: [{ role: "Vice-Presidente do ISAF para os Assuntos Académicos", name: "Profª. Doutora Martha Nyanungo" }],
};

/* ================================================================
   DOC 4 — REGULAMENTO DE ELABORAÇÃO DE PROVAS E VIGILÂNCIA
================================================================ */

const REG_VIGILANCIA: RegulationDocument = {
  id: "regulamento-elaboracao-provas-vigilancia",
  category: "avaliacao",
  title: "Regulamento de Elaboração de Provas e Procedimentos de Vigilância",
  subtitle: "Regulamento 004 | Versão 1.0",
  meta: "Elaboração: 07/10/2025 · Aprovação: 13/10/2025",
  chapters: [
    {
      id: "cap-1",
      title: "Capítulo I — Disposições Gerais",
      articles: [
        art("1º", [p("(Objecto e âmbito de aplicação)"), p("O presente Regulamento estabelece as normas referentes ao rigor exigido para a elaboração de provas escritas em todas as épocas de avaliação académica nos cursos de graduação do ISAF, bem como os procedimentos de vigilância.")]),
        art("2º", [p("(Âmbito de aplicação)"), p("O presente Regulamento aplica-se a todos os cursos ministrados no ISAF, cujo cumprimento é de carácter obrigatório.")]),
        art("3º", [p("(Princípios para a elaboração de provas)"),
          list([
            "Deverão apresentar no mínimo duas (2) variantes de provas para cada turno (manhã, tarde e pós-laboral) em todas as épocas avaliativas (provas de frequências e exames);",
            "Todas as situações que contrariem a alínea anterior deverão ser autorizadas pela Direcção Académica;",
            "As provas feitas com ajuda de tecnologias de informação (computadores) deverão ter variantes automáticas, não repetindo as variantes para estudantes que frequentam turnos diferentes;",
            "Cabe aos Coordenadores de núcleos de Disciplina e de curso submeter os enunciados (com as respectivas variantes), via e-mail específico para o efeito (outras formas não serão aceites), à Coordenação de Exames, num prazo de 48 horas antes da realização da prova.",
          ], true),
        ]),
        art("4º", [p("(Obrigações do professor vigilante)"), p("O Professor-Vigilante tem as seguintes obrigações, no acto da realização de vigilância de provas:"),
          list([
            "Comparecer no ISAF, na sala de Coordenação de Exames, trinta (30) minutos antes do início das provas;",
            "Fazer a chamada quinze (15) minutos antes do início da prova e organizar os estudantes na sala;",
            "Garantir que os estudantes sentem por ordem de chamada;",
            "Não permitir a entrada na sala de prova aos estudantes cujo nome não conste na lista de presenças, salvo autorização da Direcção;",
            "Exigir o cartão de estudante ou qualquer outro documento de identificação com fotografia;",
            "Não permitir a entrada de telemóveis ou pertences não necessários à realização da prova;",
            "Não permitir a entrada de estudantes na sala de prova após 30 minutos do início da prova;",
            "Confirmar a assinatura dos estudantes na lista de presenças;",
            "Não permitir que o estudante saia da sala, após concluída a prova, sem assinar a lista de presenças;",
            "Manter a postura, ordem e disciplina, evitando falar em voz alta durante a vigilância;",
            "Proibir a troca de material entre estudantes durante a realização da prova;",
            "Permanecer obrigatoriamente na sala até ao fim da prova;",
            "Não usar o telemóvel, nem computador, nem corrigir provas durante a realização da vigilância;",
            "No final da prova, conferir o número de provas realizadas, que deverá coincidir com o número de assinaturas e o nome do estudante no mapa de comparência.",
          ], true),
        ]),
        art("5º", [p("(Obrigações do Estudante)"), p("Os estudantes aptos para realizar a avaliação têm a obrigação de:"),
          list([
            "Apresentar-se na sala de avaliação livre de qualquer equipamento (telemóveis, pastas, estojos, canetas e relógios digitais e outros não necessários para a realização da prova);",
            "Estar frente à sala indicada para avaliação quinze minutos antes do início da prova, para permitir a organização da sala;",
            "Estar atento à chamada feita pelo professor vigilante, não sendo permitida a entrada na sala de prova aos estudantes cujo nome não conste na lista de presenças;",
            "Apresentar o cartão de estudante e, na ausência deste, outro documento de identificação com fotografia;",
            "Não solicitar entrada em sala de prova após 30 minutos do início da mesma;",
            "Não trocar material (lápis, borrachas, lapiseiras, correctores, máquina calculadora) durante a realização da prova;",
            "Assinar a lista de presença.",
          ], true),
        ]),
        art("6º", [p("(Princípios para a revisão de provas)"), p("Este princípio aplica-se apenas às provas de frequência. Devem observar-se os seguintes princípios:"),
          list([
            "O professor tem a obrigatoriedade de efectuar a revisão de prova em sala de aulas antes do lançamento das notas no sistema;",
            "Durante a revisão, o professor deve utilizar a chave como base de correcção;",
            "Após a revisão, a chave da prova, a pauta e as respectivas provas devem obrigatoriamente ser entregues à Coordenação de Exames, num prazo de 5 dias úteis;",
            "No caso de provas elaboradas de forma conjunta, é da responsabilidade do Coordenador do núcleo de disciplina proceder à entrega da chave da respectiva prova;",
            "Excepcionalmente, para os casos em que um único professor elabora a prova, deverá o mesmo proceder à entrega da respectiva chave.",
          ], true),
        ]),
      ],
    },
    {
      id: "cap-2",
      title: "Capítulo II — Disposições Finais",
      articles: [
        art("7º", [p("(Dúvidas)"),
          list([
            "As dúvidas resultantes da aplicação do presente regulamento devem ser apresentadas à Direcção Académica do ISAF.",
            "O incumprimento deste Regulamento será reflectido na avaliação do desempenho do docente.",
          ], true),
        ]),
        art("8º", [p("(Entrada em vigor)"), p("O presente Regulamento entra em vigor no dia 13 de Outubro de 2025.")]),
      ],
    },
  ],
  closing: [p("Luanda, aos 13 de Outubro de 2025.")],
  signature: [{ role: "A Presidente", name: "Dra. Carla Cristina Vilarinho de Sousa Queiroz" }],
};

/* ================================================================
   DOC 5 — REGULAMENTO DISCIPLINAR DOS ESTUDANTES
================================================================ */

const REG_DISCIPLINAR: RegulationDocument = {
  id: "regulamento-disciplinar-estudantes",
  category: "disciplinar",
  title: "Regulamento Disciplinar dos Estudantes",
  meta: "Aprovado pelo Conselho de Direcção do ISAF — Agosto de 2019",
  intro: [
    p("O Decreto n.º 90/09, de 15 de Dezembro, que estabelece as Normas Gerais Reguladoras do Subsistema de Ensino Superior, atribui às instituições de ensino superior o poder de punir as infracções disciplinares praticadas pelos seus estudantes, à semelhança do que acontece com o pessoal docente e não-docente."),
    p("A finalidade do presente Regulamento Disciplinar é clarificar o que não é permitido no comportamento de um estudante, fixando os pressupostos e procedimentos conducentes à aplicação de sanções disciplinares, e, por essa via, defender a liberdade de aprender num ambiente propício e capaz de assegurar o respeito pela integridade física e moral dos membros da comunidade académica."),
  ],
  chapters: [
    {
      id: "cap-1",
      title: "Capítulo I — Disposições Gerais",
      articles: [
        art("1º", [p("(Âmbito de aplicação)"),
          list([
            "O presente Regulamento fixa o regime disciplinar aplicável a todos os estudantes do Instituto Superior Técnico de Administração e Finanças (ISAF).",
            "Consideram-se estudantes do ISAF aqueles que estejam a frequentar nele qualquer curso, seja ou não conferente de grau.",
            "A aplicação do presente Regulamento não prejudica nem isenta da responsabilidade civil e criminal a que possa haver lugar pela prática de facto sancionável.",
            "A perda temporária da qualidade de estudante não impede a punição por infracção anteriormente cometida, executando-se a sanção quando o infractor recuperar aquela qualidade.",
          ], true),
        ]),
        art("2º", [p("(Infracções disciplinares)"),
          p("Considera-se infracção disciplinar o comportamento do estudante que, por acção ou omissão, ainda que meramente culposo, seja violador de deveres de correcção ou de conduta ética responsável, bem como de quaisquer deveres constantes da lei ou regulamentos. Constitui infracção disciplinar, nomeadamente:"),
          list([
            "a) Obstruir, no âmbito académico, o exercício do direito à livre expressão, do direito de livre associação ou de manifestação pacífica;",
            "b) Falsear os resultados de provas e trabalhos académicos (cábula, cópia, plágio, obtenção fraudulenta de enunciados, substituição fraudulenta de respostas, actuação como substituto em prova de avaliação, ou falsificação de pautas/enunciados);",
            "c) Praticar actos de suborno ou corrupção relacionados com a vida académica;",
            "d) Forjar, alterar, destruir ou falsificar registos académicos ou o Cartão de Estudante;",
            "e) Prestar informações falsas ou ocultar informação aos órgãos ou serviços do ISAF, que prejudique o bom nome da instituição, ou da qual obtenha benefícios;",
            "f) Não respeitar o próximo, fazer ameaças verbais a colegas, pessoal docente e não-docente e demais pessoas relacionadas com o ISAF;",
            "g) Praticar actos de violência ou coacção física ou psicológica contra colegas, pessoal docente e não-docente e demais pessoas relacionadas com o ISAF;",
            "h) Impedir ou perturbar, por meio de violência ou ameaça de violência, o normal decurso das aulas, provas académicas ou actividades de investigação, ou o regular funcionamento dos órgãos e serviços do ISAF;",
            "i) Introduzir ou facilitar a entrada e permanência de estranhos, sem devida autorização, nas instalações do ISAF;",
            "j) Ter na posse ou utilizar armas, produtos tóxicos, biológicos, químicos ou radioactivos prejudiciais à saúde e segurança das instalações;",
            "k) Ter na posse, consumir, produzir ou distribuir substâncias estupefacientes ou equiparadas;",
            "l) Fumar nas instalações de ensino do ISAF em espaços públicos;",
            "m) Consumir bebidas alcoólicas nas instalações do ISAF;",
            "n) Ingerir alimentos em locais onde tal não é permitido;",
            "o) Utilizar inadequadamente os materiais didácticos, equipamento e instalações do ISAF;",
            "p) Danificar, subtrair ou apropriar-se ilicitamente de bens patrimoniais pertencentes ao ISAF;",
            "q) Utilizar indevidamente o nome ou a simbologia do ISAF;",
            "r) Resistir, activa ou passivamente, ao cumprimento das directivas dos funcionários do ISAF;",
            "s) Manter relações sexuais nas instalações do ISAF;",
            "t) Ordenar, colaborar, encobrir, facilitar ou favorecer a prática de infracções disciplinares;",
            "u) Não cumprir as sanções disciplinares que lhe forem aplicadas;",
            "v) Provocar ou proceder a actos de assédio sexual ou verbal dentro do ISAF;",
            "w) Adoptar outros comportamentos violadores de normas expressas no Regulamento Disciplinar e demais deveres previstos nos regulamentos internos e na Lei.",
          ]),
        ]),
      ],
    },
    {
      id: "cap-2",
      title: "Capítulo II — Sanções Disciplinares e seus Efeitos",
      articles: [
        art("3º", [p("(Tipos de sanções disciplinares)"), p("As sanções disciplinares aplicáveis são as seguintes:"),
          list(["Advertência oral;", "Advertência por escrito;", "Suspensão temporária das actividades académicas;", "Suspensão da matrícula;", "Expulsão."]),
        ]),
        art("4º", [p("(Qualificação das sanções disciplinares)"),
          list([
            "As sanções de advertência oral e por escrito são consideradas comuns.",
            "As sanções de suspensão temporária e suspensão da matrícula são consideradas graves.",
            "A sanção de expulsão é considerada muito grave.",
          ], true),
        ]),
        art("5º", [p("(Caracterização das sanções disciplinares)"),
          list([
            "A advertência, oral ou por escrito, é aplicada sem dependência de processo, mas com audiência e defesa do estudante, consistindo numa mera repreensão fundamentada pela infracção cometida.",
            "A suspensão temporária das actividades académicas consiste na proibição de frequência das aulas e de prestação de provas académicas, impedindo o estudante de entrar nas instalações do ISAF, com duração mínima de 7 dias úteis e máxima de 1 semestre, sem dispensa do pagamento de propinas.",
            "A suspensão da matrícula consiste na privação da qualidade de estudante por 1 semestre ou 1 ano lectivo, podendo, em caso de fraude académica, ser anuladas quaisquer classificações obtidas durante o período de frequência.",
            "A expulsão consiste no afastamento do estudante do ISAF, ficando impossibilitado de inscrever-se, frequentar aulas ou permanecer nas instalações, aplicável aos casos \"Muito Graves\" sem atenuantes.",
            "A aplicação das sanções referidas no nº 2 poderá ser substituída pela realização de serviços a favor da comunidade académica, sem remuneração, não podendo exceder quatro horas diárias nem coincidir com as actividades académicas.",
          ], true),
        ]),
        art("6º", [p("(Suspensão preventiva)"), p("Sempre que a presença do estudante se revele inconveniente para a descoberta da verdade, ou haja perigo de perturbação do normal decurso das actividades académicas, pode o Director Geral, ou os Directores Adjuntos por delegação, decretar a suspensão do estudante por período não superior a 30 dias.")]),
        art("7º", [p("(Limites dos efeitos das sanções)"), p("As sanções aplicadas têm unicamente os efeitos previstos no presente Regulamento.")]),
        art("8º", [p("(Registo das sanções)"), p("As sanções aplicadas constam de registo no processo individual do estudante do ISAF.")]),
      ],
    },
    {
      id: "cap-3",
      title: "Capítulo III — Factos a que se Aplicam as Sanções",
      articles: [
        art("9º", [p("(Advertências)"), p("A sanção de advertência aplica-se aos factos descritos nas alíneas l), m), n), s) e demais correspondentes do Art.º 2.º, não podendo ser aplicada se houver reincidência, dolo ou circunstâncias agravantes.")]),
        art("10º", [p("(Suspensão Temporária)"), p("A suspensão temporária é aplicável aos estudantes que tenham cometido as infracções referidas nas alíneas a), e), i), o), p), q), t), u), v) e w) do n.º 2 do art.º 2.º.")]),
        art("11º", [p("(Expulsão)"), p("A medida disciplinar de expulsão é aplicável aos estudantes que tenham cometido as infracções referidas nas alíneas b), c), d), f), g), h), j), k) do n.º 2 do art.º 2.º.")]),
      ],
    },
    {
      id: "cap-3b",
      title: "Medidas e Graduação das Sanções",
      articles: [
        art("12º", [p("(Determinação da sanção aplicável)"),
          list([
            "A determinação da sanção aplicável é feita em função da culpa do estudante e das exigências de prevenção.",
            "Deve atender-se a todas as circunstâncias, considerando particularmente: número de infracções, grau de participação, intensidade do dolo, motivações, dano produzido, conduta anterior e posterior, condições pessoais e situação económica.",
            "A decisão de aplicação de sanção deve expressamente referir os fundamentos da determinação.",
          ], true),
        ]),
        art("13º", [p("(Circunstâncias agravantes)"),
          list([
            "A vontade determinada de produzir resultados prejudiciais ao ISAF, órgão, serviço, pessoas ou bens;",
            "A produção efectiva de resultados prejudiciais quando previsíveis;",
            "A gravidade do dano causado, ainda que a título de negligência;",
            "A premeditação (desígnio formado, pelo menos, 24 horas antes);",
            "O conluio com outrem para a prática da infracção;",
            "A infracção cometida durante o cumprimento de anterior sanção disciplinar;",
            "A reincidência (infracção cometida antes de decorrido 1 ano sobre o cumprimento de sanção anterior);",
            "A acumulação de infracções;",
            "A prática de acto ilícito sob efeito de álcool ou estupefacientes.",
          ]),
        ]),
        art("14º", [p("(Circunstâncias atenuantes e dirimentes)"),
          p("São circunstâncias atenuantes: confissão espontânea, bom comportamento anterior, provocação — podendo excepcionalmente considerar-se outras."),
          p("São circunstâncias dirimentes da responsabilidade disciplinar: coacção que retire a liberdade de agir; privação acidental e involuntária das faculdades intelectuais; legítima defesa própria ou de terceiro; não exigibilidade de conduta diversa; exercício de um direito ou cumprimento de um dever."),
        ]),
        art("15º", [p("(Redução extraordinária da sanção)"), p("Quando existam circunstâncias atenuantes que diminuam substancialmente a culpa do infractor, a sanção disciplinar pode ser atenuada, aplicando-se sanção inferior.")]),
      ],
    },
    {
      id: "cap-4",
      title: "Capítulo III — Procedimento Disciplinar",
      articles: [
        art("16º", [p("(Participação)"),
          list([
            "Quem tiver conhecimento da prática de qualquer facto qualificável como infracção disciplinar deve fazer participação verbal ou escrita ao Director Geral, Directores Adjuntos ou titular do órgão executivo da unidade orgânica.",
            "Nos casos de injúrias, ameaça, coacção ou ofensa corporal, o processo disciplinar depende de participação por escrito do ofendido.",
            "A participação pode ser anónima ou confidencial.",
          ], true),
        ]),
        art("17º", [p("(Competência para Instauração do Processo Disciplinar)"),
          list([
            "Compete ao Director Geral mandar instaurar o processo disciplinar, sem prejuízo de delegação nos Directores Adjuntos.",
            "Cabe também ao Director Geral ordenar o arquivamento do processo, quando procedam razões para o efeito.",
            "Havendo delegação, as decisões de instauração ou arquivamento devem ser comunicadas ao Director Geral no prazo máximo de 5 dias.",
          ], true),
        ]),
        art("18º", [p("(Obrigatoriedade do Processo Disciplinar)"),
          list([
            "Nos casos passíveis de sanções graves e muito graves, proceder-se-á obrigatoriamente ao apuramento com vista à aplicação das mesmas.",
            "As sanções comuns são aplicadas sem dependência de processo disciplinar, mas com audiência e defesa do estudante.",
            "Se a Comissão Disciplinar verificar que a falta é susceptível de preencher tipo legal de crime, dará conhecimento ao Director Geral para efeitos de responsabilidade criminal.",
          ], true),
        ]),
        art("19º", [p("(Comissão Disciplinar)"), p("Cabe ao Director Geral, ou seu substituto, nomear a Comissão Disciplinar de entre os membros do corpo docente em regime de tempo integral ou outros técnicos do ISAF, à qual incumbe instruir e conduzir o processo disciplinar até à sua conclusão.")]),
        art("20º", [p("(Duração do Processo Disciplinar)"),
          list([
            "A instrução do processo disciplinar tem a duração máxima de 15 dias, contados a partir do início das funções da Comissão Disciplinar.",
            "Esse prazo só poderá ser prorrogado por despacho do Director Geral, perante casos de excepcional complexidade e sob proposta fundamentada do Coordenador da Comissão Disciplinar.",
          ], true),
        ]),
        art("21º", [p("(Consulta do Processo Disciplinar)"), p("Estando a decorrer o prazo para apresentação da defesa, pode o estudante, por si ou pelo seu mandatário, examinar o processo em data, hora e local previamente definidos pelo instrutor.")]),
        art("22º", [p("(Defesa do Estudante)"),
          list([
            "O estudante pode apresentar a sua defesa, por escrito, por si ou pelo seu mandatário, no local indicado pela Comissão Disciplinar.",
            "Com a apresentação da defesa, deve juntar lista de testemunhas e documentos, podendo requerer diligências probatórias, passíveis de recusa fundamentada se meramente dilatórias, impertinentes ou desnecessárias.",
            "Não são ouvidas mais de duas testemunhas por cada facto.",
            "A falta de auscultação do estudante no prazo fixado vale como efectiva audiência para todos os efeitos legais.",
            "A Comissão Disciplinar procede à inquirição de testemunhas e reúne os demais elementos de prova no prazo de 5 dias.",
            "A Comissão apenas expede 2.ª convocatória quando a falta for justificada pela testemunha no prazo de 5 dias.",
          ], true),
        ]),
        art("23º", [p("(Relatório final da Comissão Disciplinar)"),
          list([
            "Terminada a instrução, concluindo pela existência de indícios suficientes, a Comissão elabora proposta de medida disciplinar remetida ao Director Geral para decisão.",
            "Caso não seja apurado o cometimento de nenhuma infracção, ou a pessoa visada não seja a infractora, sugere-se o arquivamento do processo.",
          ], true),
        ]),
        art("24º", [p("(Competência para a decisão e aplicação da sanção disciplinar)"),
          list([
            "Compete ao Director Geral, ou por delegação aos Directores Gerais Adjuntos, após consulta ao Conselho de Direcção, analisar o processo e decidir no prazo de 10 dias contados da recepção do Relatório da Comissão Disciplinar.",
            "A decisão deve expor resumidamente o tipo de infracção cometida, demonstrar a sua gravidade e a necessidade da punição, ou relatar a razão do arquivamento.",
          ], true),
        ]),
        art("25º", [p("(Notificação do Estudante)"),
          list([
            "O estudante deve ser notificado pessoalmente da decisão que aplica a sanção disciplinar, podendo recorrer no prazo máximo de 5 dias após a notificação.",
            "Não sendo possível a notificação pessoal, esta é feita por edital afixado na Associação de Estudantes, vitrina de informação e site oficial do ISAF.",
            "A decisão só produz efeitos a partir da notificação ou publicitação.",
          ], true),
        ]),
        art("26º", [p("(Recurso Hierárquico)"),
          list([
            "O estudante tem direito a recorrer da decisão, devendo fazê-lo por escrito, endereçado ao Director Geral, alegando as razões do recurso.",
            "Cabe ao Conselho de Direcção apreciar o Recurso Hierárquico apresentado pelo estudante.",
          ], true),
        ]),
        art("27º", [p("(Revisão do Processo Disciplinar)"),
          list([
            "A revisão do processo disciplinar é admitida a todo o tempo, pressupondo a ocorrência de circunstâncias ou surgimento de meios de prova que demonstrem a inexistência dos factos que fundamentaram a sanção.",
            "É sempre determinada pelo Director Geral, por sua iniciativa, dos Directores Adjuntos, ou a requerimento do estudante.",
            "Na pendência da revisão, e por proposta fundamentada do instrutor, a sanção pode ser suspensa.",
            "Da revisão não pode resultar agravação da responsabilidade do estudante.",
            "Se a revisão determinar revogação ou atenuação da sanção, tal decisão deverá ser tornada pública.",
          ], true),
        ]),
        art("28º", [p("(Prescrição das sanções disciplinares)"), p("As sanções disciplinares prescrevem no prazo de um ano, a contar da data em que as respectivas decisões se tornem impugnáveis.")]),
        art("29º", [p("(Extinção da responsabilidade disciplinar)"), p("A responsabilidade disciplinar extingue-se: a) pelo cumprimento da sanção; b) pela prescrição do procedimento disciplinar; c) pela prescrição da sanção; d) pela revogação ou comutação da pena; e) pela morte do infractor.")]),
      ],
    },
    {
      id: "cap-6",
      title: "Capítulo VI — Disposições Finais",
      articles: [
        art("30º", [p("(Contagem dos prazos)"), p("Os prazos previstos no presente Regulamento são úteis, não incluindo Sábados, Domingos ou feriados e durante os períodos de férias escolares.")]),
        art("31º", [p("(Entrada em vigor)"), p("O presente Regulamento entra em vigor logo após a sua aprovação pelo órgão competente e respectiva publicação.")]),
      ],
    },
    {
      id: "apendice",
      title: "Apêndice — Resumo das Infracções e Sanções Aplicáveis",
      articles: [
        art("", [
          {
            type: "table",
            headers: ["Infracções Comuns\n(Advertência)", "Infracções Graves\n(Suspensão)", "Infracções Muito Graves\n(Expulsão)"],
            rows: [
              [
                "Fumar nas instalações de ensino.",
                "Obstruir o exercício do direito à livre expressão, associação ou manifestação pacífica.",
                "Falsear resultados de provas e trabalhos académicos (cábula, cópia, plágio, fraude em avaliação).",
              ],
              [
                "Consumir bebidas alcoólicas nas instalações do ISAF.",
                "Prestar informações falsas ou ocultar informação aos órgãos/serviços do ISAF.",
                "Praticar actos de suborno ou corrupção relacionados com a vida académica.",
              ],
              [
                "Ingerir bebidas ou alimentos em locais não permitidos.",
                "Introduzir/facilitar entrada de estranhos sem autorização nas instalações.",
                "Forjar, alterar, destruir ou falsificar registos académicos ou o Cartão de Estudante.",
              ],
              [
                "Apresentar-se com indumentárias inadequadas ao ambiente académico.",
                "Utilizar inadequadamente materiais didácticos, equipamento e instalações.",
                "Usar linguagem insultuosa, ofender a honra/privacidade ou ameaçar colegas, docentes e não-docentes.",
              ],
              [
                "Adoptar outros comportamentos violadores das normas do Regulamento.",
                "Danificar, subtrair ou apropriar-se ilicitamente de bens do ISAF.",
                "Praticar actos de violência ou coacção física/psicológica.",
              ],
              [
                "Número excessivo de faltas injustificadas.",
                "Utilizar indevidamente o nome ou simbologia do ISAF.",
                "Impedir/perturbar por violência ou ameaça o normal decurso de aulas e provas.",
              ],
              [
                "—",
                "Manter relações íntimas nas instalações do ISAF.",
                "Ter na posse ou utilizar armas, produtos tóxicos, biológicos, químicos ou radioactivos.",
              ],
              [
                "—",
                "Ordenar, colaborar, encobrir ou favorecer a prática de infracções disciplinares.",
                "Ter na posse, consumir, produzir ou distribuir substâncias estupefacientes.",
              ],
              [
                "—",
                "Não cumprir sanções disciplinares aplicadas.",
                "—",
              ],
              [
                "—",
                "Provocar ou proceder a actos de assédio sexual ou verbal.",
                "—",
              ],
            ],
          },
        ]),
      ],
    },
  ],
  closing: [p("Luanda, 8 de Agosto de 2019.")],
  signature: [{ role: "A Directora Geral", name: "Carla Cristina V. Queiroz" }],
};

const ALL_REGULATIONS: RegulationDocument[] = [
  REG_ACADEMICO,
  REG_AVALIACAO,
  REG_INSTRUTIVO,
  REG_VIGILANCIA,
  REG_DISCIPLINAR,
];

/* ================================================================
   RENDER HELPERS
================================================================ */
function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-2.5 md:space-y-2">
      {blocks.map((block, i) => {
        if (block.type === "p") {
          return (
            <p key={i} className="text-[13px] md:text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {block.text}
            </p>
          );
        }
        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag
              key={i}
              className={`space-y-1.5 md:space-y-1 pl-1 text-[13px] md:text-xs leading-relaxed text-slate-700 dark:text-slate-300 ${
                block.ordered ? "list-decimal marker:text-indigo-500 dark:marker:text-indigo-400" : "list-disc marker:text-slate-400 dark:marker:text-slate-600"
              } ml-4`}
            >
              {block.items.map((item, j) => (
                <li key={j} className="pl-1">{item}</li>
              ))}
            </Tag>
          );
        }
        if (block.type === "note") {
          return (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 md:px-2.5 py-2.5 md:py-2 text-[12px] md:text-[11px] leading-relaxed text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/[0.08] dark:text-amber-300"
            >
              <Info size={13} className="mt-0.5 shrink-0 md:h-3 md:w-3" />
              <span>{block.text}</span>
            </div>
          );
        }
        if (block.type === "formula") {
          return (
            <div
              key={i}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 md:px-2.5 py-2.5 md:py-2 text-center text-[12px] md:text-[11px] font-semibold text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/[0.08] dark:text-indigo-300"
            >
              {block.text}
            </div>
          );
        }
        if (block.type === "table") {
          return (
            <div key={i} className={`overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10 ${SCROLLBAR_X}`}>
              <table className="w-full min-w-[420px] border-collapse text-[12px] md:text-[11px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-white/5">
                    {block.headers.map((h, hi) => (
                      <th
                        key={hi}
                        className="whitespace-pre-line border-b border-slate-200 px-3 md:px-2 py-2 md:py-1.5 text-left font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50/70 dark:bg-white/[0.02]"}>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="border-b border-slate-100 px-3 md:px-2 py-2 md:py-1.5 align-top leading-relaxed text-slate-700 dark:border-white/5 dark:text-slate-300"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function ArticleBlock({ article }: { article: RegArticle }) {
  return (
    <div id={article.id || undefined} className="rounded-xl md:rounded-lg border border-slate-200 bg-white/70 p-3.5 dark:border-white/5 dark:bg-white/[0.02] sm:p-4 md:p-3">
      {article.number && (
        <div className="mb-2 md:mb-1.5 flex items-center gap-2 md:gap-1.5">
          <span className="flex h-6 md:h-5 shrink-0 items-center justify-center rounded-md bg-indigo-100 px-2 md:px-1.5 text-[11px] md:text-[10px] font-bold text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300">
            Art. {article.number}
          </span>
          {article.title && (
            <span className="text-[12px] md:text-[11px] font-medium text-slate-500 dark:text-slate-500">{article.title}</span>
          )}
        </div>
      )}
      <ContentBlocks blocks={article.blocks} />
    </div>
  );
}

function ChapterBlock({ chapter, defaultOpen }: { chapter: RegChapter; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const totalArticles =
    (chapter.articles?.length ?? 0) +
    (chapter.sections?.reduce((acc, s) => acc + s.articles.length, 0) ?? 0);
  return (
    <div id={chapter.id} className="overflow-hidden rounded-2xl md:rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3.5 text-left transition hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] sm:px-5 md:px-4 md:py-3"
      >
        <div className="flex min-w-0 items-center gap-2.5 md:gap-2">
          <ListTree size={15} className="shrink-0 text-indigo-500 dark:text-indigo-400 md:h-3.5 md:w-3.5" />
          <span className="min-w-0 flex-1 break-words text-sm md:text-xs font-semibold leading-snug text-slate-800 dark:text-slate-200">{chapter.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-1.5">
          <span className="rounded-full bg-slate-200 px-2 md:px-1.5 py-0.5 text-[10px] md:text-[9px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
            {totalArticles} art.
          </span>
          {open ? <ChevronDown size={16} className="text-slate-400 md:h-4 md:w-4" /> : <ChevronRight size={16} className="text-slate-400 md:h-4 md:w-4" />}
        </div>
      </button>
      {open && (
        <div className="space-y-4 md:space-y-3 px-4 py-4 sm:px-5 md:px-4 md:py-3">
          {chapter.sections?.map((section) => (
            <div key={section.id} className="space-y-2.5 md:space-y-2">
              <p className="text-[11px] md:text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {section.title}
              </p>
              <div className="space-y-2.5 md:space-y-2">
                {section.articles.map((a) => (
                  <ArticleBlock key={a.id} article={a} />
                ))}
              </div>
            </div>
          ))}
          {chapter.articles?.length ? (
            <div className="space-y-2.5 md:space-y-2">
              {chapter.articles.map((a) => (
                <ArticleBlock key={a.id} article={a} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   VIEWER DE UM DOCUMENTO
================================================================ */
function RegulationViewer({ doc, onBack }: { doc: RegulationDocument; onBack: () => void }) {
  const meta = REGULATION_CATEGORY_META[doc.category];
  const CatIcon = meta.icon;
  const scrollToChapter = (chapterId: string) => {
    const el = document.getElementById(chapterId);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  };
  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-4">
      <div className="overflow-hidden rounded-2xl md:rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none">
        <div className="flex items-start gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03] sm:px-5 md:px-4 md:py-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 flex h-8 md:h-7 w-8 md:w-7 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <ArrowLeft size={15} className="md:h-3.5 md:w-3.5" />
          </button>
          <div className="mt-0.5 flex h-9 md:h-8 w-9 md:w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-600/15 dark:text-indigo-400">
            <CatIcon size={17} className="md:h-4 md:w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-[9px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              {meta.label}
            </p>
            <h2 className="mt-0.5 text-base md:text-sm font-bold text-slate-900 dark:text-white sm:text-lg md:text-base">{doc.title}</h2>
            {doc.subtitle && <p className="mt-0.5 text-xs md:text-[11px] text-slate-500 dark:text-slate-500">{doc.subtitle}</p>}
            {doc.meta && <p className="mt-1 text-[11px] md:text-[10px] text-slate-400 dark:text-slate-600">{doc.meta}</p>}
          </div>
        </div>
        {doc.chapters.length > 1 && (
          <div className={`flex gap-2 md:gap-1.5 overflow-x-auto px-4 py-3 md:px-3 md:py-2.5 sm:px-5 md:px-4 ${SCROLLBAR_X}`}>
            {doc.chapters.map((ch, idx) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => scrollToChapter(ch.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 md:px-2.5 py-1.5 md:py-1 text-[11px] md:text-[10px] font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
              >
                <span className="flex h-4 md:h-3.5 w-4 md:w-3.5 items-center justify-center rounded-full bg-black/10 text-[9px] md:text-[8px] font-bold dark:bg-black/20">
                  {idx + 1}
                </span>
                <span className="max-w-[18rem] whitespace-normal break-words text-left leading-snug">{ch.title.replace(/^Capítulo [IVX]+\s*—\s*/i, "")}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {doc.intro && (
        <div className="rounded-2xl md:rounded-xl border border-slate-200 bg-white p-4 md:p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none sm:p-5 md:p-4">
          <ContentBlocks blocks={doc.intro} />
        </div>
      )}
      <div className="space-y-3 sm:space-y-4 md:space-y-3">
        {doc.chapters.map((ch, idx) => (
          <ChapterBlock key={ch.id} chapter={ch} defaultOpen={idx === 0} />
        ))}
      </div>
      {(doc.closing || doc.signature) && (
        <div className="rounded-2xl md:rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-3 dark:border-white/10 dark:bg-white/[0.02] sm:p-5 md:p-4">
          {doc.closing && <ContentBlocks blocks={doc.closing} />}
          {doc.signature && (
            <div className="mt-4 md:mt-3 space-y-3 md:space-y-2.5">
              {doc.signature.map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-[11px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">{s.role}</p>
                  <p className="mt-1 text-sm md:text-xs font-semibold text-slate-700 dark:text-slate-300">{s.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center justify-center gap-2 rounded-xl md:rounded-lg border border-slate-300 bg-white px-4 md:px-3 py-3 md:py-2 text-sm md:text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
      >
        <ArrowLeft size={15} className="md:h-3.5 md:w-3.5" />
        Voltar à lista de regulamentos
      </button>
    </div>
  );
}

/* ================================================================
   SECÇÃO PRINCIPAL — REGULAMENTOS
================================================================ */
function RegulamentosSection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const selectedDoc = ALL_REGULATIONS.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedDoc) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedDoc]);

  if (selectedDoc) {
    return <RegulationViewer doc={selectedDoc} onBack={() => setSelectedId(null)} />;
  }

  const normalizedQuery = normalizeText(query);
  const filtered = normalizedQuery
    ? ALL_REGULATIONS.filter((d) => normalizeText(d.title).includes(normalizedQuery))
    : ALL_REGULATIONS;

  const grouped = new Map<RegulationCategory, RegulationDocument[]>();
  for (const doc of filtered) {
    const list = grouped.get(doc.category) ?? [];
    list.push(doc);
    grouped.set(doc.category, list);
  }

  const categoryOrder: RegulationCategory[] = ["academico", "avaliacao", "disciplinar"];

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-4">
      <div className="flex items-start gap-3 md:gap-2.5 rounded-xl md:rounded-lg border border-indigo-200 bg-indigo-50 px-4 md:px-3 py-4 md:py-3 text-sm md:text-xs text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/[0.08] dark:text-indigo-300">
        <Info size={16} className="mt-0.5 shrink-0 md:h-4 md:w-4" />
        <div className="space-y-1">
          <p className="font-semibold">Regulamentos do ISAF</p>
          <p className="text-xs md:text-[11px] leading-relaxed text-indigo-700/80 dark:text-indigo-400/80">
            Consulta aqui, directamente na plataforma, os documentos oficiais que regulam
            a vida académica, a avaliação de conhecimentos e o regime disciplinar dos
            estudantes. A leitura destes regulamentos é obrigatória.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar regulamento…"
          className="w-full rounded-xl md:rounded-lg border border-slate-300 bg-white py-2.5 md:py-2 pl-10 md:pl-9 pr-3 text-sm md:text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200 dark:placeholder-slate-600 dark:focus:ring-indigo-500/40"
        />
      </div>

      <div className="space-y-4 sm:space-y-5 md:space-y-4">
        {categoryOrder.map((category) => {
          const docs = grouped.get(category);
          if (!docs || docs.length === 0) return null;
          const meta = REGULATION_CATEGORY_META[category];
          const CatIcon = meta.icon;
          return (
            <div key={category} className="space-y-2.5 md:space-y-2">
              <div className="flex items-center gap-2.5 md:gap-2 px-1">
                <div className="flex h-7 md:h-6 w-7 md:w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-600/15 dark:text-indigo-400">
                  <CatIcon size={14} className="md:h-3 md:w-3" />
                </div>
                <div>
                  <p className="text-xs md:text-[11px] font-semibold text-slate-700 dark:text-slate-300">{meta.label}</p>
                  <p className="text-[10px] md:text-[9px] text-slate-600 dark:text-slate-600">{meta.description}</p>
                </div>
              </div>
              <div className="grid gap-2.5 md:gap-2 sm:grid-cols-2">
                {docs.map((doc) => {
                  const totalArticles = doc.chapters.reduce(
                    (acc, ch) =>
                      acc +
                      (ch.articles?.length ?? 0) +
                      (ch.sections?.reduce((a, s) => a + s.articles.length, 0) ?? 0),
                    0
                  );
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedId(doc.id)}
                      className="group flex items-start gap-3 md:gap-2.5 rounded-xl md:rounded-lg border border-slate-200 bg-white p-4 md:p-3 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none dark:hover:border-indigo-500/30"
                    >
                      <div className="mt-0.5 flex h-9 md:h-8 w-9 md:w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-indigo-100 group-hover:text-indigo-600 dark:bg-white/5 dark:text-slate-400 dark:group-hover:bg-indigo-600/15 dark:group-hover:text-indigo-400">
                        <FileText size={16} className="md:h-4 md:w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm md:text-xs font-semibold leading-snug text-slate-800 dark:text-slate-200">
                          {doc.title}
                        </p>
                        {doc.subtitle && (
                          <p className="mt-0.5 text-[11px] md:text-[10px] text-slate-400 dark:text-slate-600">{doc.subtitle}</p>
                        )}
                        <div className="mt-2 md:mt-1.5 flex items-center gap-2 text-[10px] md:text-[9px] text-slate-400 dark:text-slate-600">
                          <span className="rounded-full bg-slate-100 px-2 md:px-1.5 py-0.5 font-medium dark:bg-white/5">
                            {doc.chapters.length} capítulo{doc.chapters.length !== 1 ? "s" : ""}
                          </span>
                          {totalArticles > 0 && (
                            <span className="rounded-full bg-slate-100 px-2 md:px-1.5 py-0.5 font-medium dark:bg-white/5">
                              {totalArticles} artigo{totalArticles !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        size={14}
                        className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600 dark:group-hover:text-indigo-400 md:h-3.5 md:w-3.5"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl md:rounded-xl border border-dashed border-slate-300 bg-white p-8 md:p-6 text-center dark:border-white/10 dark:bg-slate-950/40">
            <Search size={28} className="mx-auto mb-3 md:mb-2 text-slate-300 dark:text-slate-600 md:h-6 md:w-6" />
            <p className="text-sm md:text-xs font-medium text-slate-500 dark:text-slate-400">
              Nenhum regulamento encontrado para &quot;{query}&quot;
            </p>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 md:gap-2.5 rounded-xl md:rounded-lg border border-amber-200 bg-amber-50 px-4 md:px-3 py-3.5 md:py-2.5 text-xs md:text-[11px] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/[0.06] dark:text-amber-300">
        <ClipboardList size={14} className="mt-0.5 shrink-0 md:h-3 md:w-3" />
        <span>
          Estes regulamentos são de observância obrigatória por todos os estudantes,
          docentes e trabalhadores do ISAF. Em caso de dúvida, contacta a Direcção
          Académica ou a Secretaria.
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl md:rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03] sm:px-5 md:px-4 md:py-3">
          <h2 className="text-sm md:text-xs font-semibold text-slate-900 dark:text-slate-100 sm:text-base md:text-sm">
            Dúvidas sobre os regulamentos?
          </h2>
        </div>
        <div className="grid gap-3 md:gap-2 p-4 md:p-3 sm:grid-cols-3 sm:p-5 md:p-4">
          {[
            { icon: Phone, label: "Telefone", value: "+244 227 281 009" },
            { icon: Mail, label: "Email", value: "geral@isaf.ao" },
            { icon: MapPin, label: "Localização", value: "Morro Bento, Luanda" },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-start gap-3 md:gap-2 rounded-xl md:rounded-lg border border-slate-200 bg-slate-50 px-4 md:px-3 py-3 md:py-2 dark:border-white/5 dark:bg-white/[0.02]"
            >
              <Icon size={15} className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400 md:h-3.5 md:w-3.5" />
              <div>
                <p className="text-[10px] md:text-[9px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-600">
                  {label}
                </p>
                <p className="mt-0.5 text-xs md:text-[11px] font-medium text-slate-700 dark:text-slate-300">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}