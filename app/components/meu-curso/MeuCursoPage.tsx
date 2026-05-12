// app/(protected)/meu-curso/MeuCursoPage.tsx
"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useTransition,
  useActionState,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen, ChevronRight, ChevronDown, X, GraduationCap,
  Clock, Calendar, RefreshCw, FileText, AlertCircle,
  CheckCircle2, Circle, Lock, Layers, Info, Phone, Mail,
  MapPin, Headphones, PresentationIcon, Upload, Plus,
  Trash2, Loader2, Edit3,
} from "lucide-react";
import { parseHorarioPDF, type ParsedSlot } from "@/app/actions/parseHorario";

/* ================================================================
   TIPOS
   ================================================================ */

export type CourseId =
  | "informatica-gestao-financeira"
  | "contabilidade-financas"
  | "gestao-bancaria-seguros";

export type DisciplineStatus = "current" | "completed" | "upcoming" | "locked";

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
  startTime: string;
  endTime: string;
  disciplineName: string;
  room: string;
  professor: string;
  type: string;
};

/* ================================================================
   MAPA DE SLUGS REAIS
   ================================================================ */
const DISCIPLINE_SLUGS: Record<string, string> = {
  "igf-1-1-cpe":  "comunicacao-pessoal-e-empresarial",
  "igf-1-1-li1":  "lingua-inglesa-i",
  "igf-1-1-mi":   "metodologias-de-investigacao-cientifica",
  "igf-1-1-fsi":  "fundamentos-de-sistemas-da-informacao",
  "igf-1-1-mat1": "matematica-i",
  "igf-1-2-cg1":  "contabilidade-geral-i",
  "igf-1-2-li2":  "lingua-inglesa-ii",
  "igf-1-2-iog":  "introducao-as-organizacoes-e-a-gestao",
  "igf-1-2-arq":  "arquitetura-de-computadores",
  "igf-1-2-mat2": "matematica-ii",
  "igf-2-1-cg2":   "contabilidade-geral-ii",
  "igf-2-1-prog1": "programacao-i",
  "igf-2-1-sd":    "sistemas-digitais",
  "igf-2-1-cof":   "calculo-e-operacoes-financeiras",
  "igf-2-1-ie":    "introducao-a-economia",
  "igf-2-2-co":    "comportamento-organizacional",
  "igf-2-2-prog2": "programacao-ii",
  "igf-2-2-bd1":   "base-de-dados-i",
  "igf-2-2-cant":  "contabilidade-analitica",
  "igf-2-2-pe":    "probabilidades-e-estatistica",
  "igf-3-1-mdsi": "metodologia-de-desenvolvimento-de-sistemas-de-informacao",
  "igf-3-1-fe":   "financas-empresariais",
  "igf-3-1-bd2":  "base-de-dados-ii",
  "igf-3-1-rc":   "redes-de-computadores",
  "igf-3-1-so1":  "sistemas-operativos-i",
  "igf-3-2-qsi":  "qualidade-de-sistemas-de-informacao",
  "igf-3-2-grn":  "gestao-de-redes-informaticas",
  "igf-3-2-ds":   "desenvolvimento-de-software",
  "igf-3-2-ltw":  "linguagens-e-tecnologias-web",
  "igf-3-2-so2":  "sistemas-operativos-ii",
  "igf-4-1-di":   "direito-informatico",
  "igf-4-1-sirn": "seguranca-informatica-em-redes-de-sistemas",
  "igf-4-1-tm":   "tecnologias-multimedia",
  "igf-4-1-fisc": "fiscalidade",
  "igf-4-1-tfc":  "trabalho-final-de-curso",
  "igf-4-2-ai":  "auditoria-informatica",
  "igf-4-2-ce":  "comercio-electronico",
  "igf-4-2-md":  "marketing-digital",
  "igf-4-2-grh": "gestao-de-recursos-humanos",
  "igf-4-2-tfc": "trabalho-final-de-curso",
  "cf-1-1-cpe":  "comunicacao-pessoal-e-empresarial",
  "cf-1-1-li1":  "lingua-inglesa-i",
  "cf-1-1-mi":   "metodologias-de-investigacao-cientifica",
  "cf-1-1-ii":   "introducao-a-informatica",
  "cf-1-1-mat1": "matematica-i",
  "cf-1-2-cpe":  "comunicacao-pessoal-e-empresarial",
  "cf-1-2-li2":  "lingua-inglesa-ii",
  "cf-1-2-iog":  "introducao-as-organizacoes-e-a-gestao",
  "cf-1-2-cg1":  "contabilidade-geral-i",
  "cf-1-2-mat2": "matematica-ii",
  "cf-2-1-cg2":  "contabilidade-geral-ii",
  "cf-2-1-li3":  "lingua-inglesa-iii",
  "cf-2-1-me1":  "microeconomia-i",
  "cf-2-1-cof":  "calculo-e-operacoes-financeiras",
  "cf-2-1-est1": "estatistica-i",
  "cf-2-2-ca":   "contabilidade-analitica",
  "cf-2-2-li4":  "lingua-inglesa-iv",
  "cf-2-2-me2":  "microeconomia-ii",
  "cf-2-2-de":   "direito-das-empresas",
  "cf-2-2-est2": "estatistica-ii",
  "cf-3-1-cpco": "contabilidade-planeamento-e-controlo-orcamental",
  "cf-3-1-mac1": "macroeconomia-i",
  "cf-3-1-dc":   "direito-comercial",
  "cf-3-1-fin1": "financas-i",
  "cf-3-1-mkt1": "marketing-i",
  "cf-3-2-fisc": "fiscalidade",
  "cf-3-2-mac2": "macroeconomia-ii",
  "cf-3-2-epe":  "estrategia-e-planeamento-da-empresa",
  "cf-3-2-fin2": "financas-ii",
  "cf-3-2-mkt2": "marketing-ii",
  "cf-4-1-he":   "historia-economica",
  "cf-4-1-grh":  "gestao-de-recursos-humanos",
  "cf-4-1-mpf":  "mercados-e-produtos-financeiros",
  "cf-4-1-caa":  "contabilidade-analitica-avancada",
  "cf-4-1-tfc":  "trabalho-final-de-curso",
  "cf-4-2-aef":  "analise-economico-financeira",
  "cf-4-2-aud":  "auditoria",
  "cf-4-2-eci":  "economia-e-comercio-internacionais",
  "cf-4-2-scg":  "sistemas-de-controlo-de-gestao",
  "cf-4-2-tfc":  "trabalho-final-de-curso",
  "gbs-1-1-cpe":  "comunicacao-pessoal-e-empresarial",
  "gbs-1-1-li1":  "lingua-inglesa-i",
  "gbs-1-1-mi":   "metodologias-de-investigacao-cientifica",
  "gbs-1-1-ii":   "introducao-a-informatica",
  "gbs-1-1-mat1": "matematica-i",
  "gbs-1-2-cpe":  "comunicacao-pessoal-e-empresarial",
  "gbs-1-2-li2":  "lingua-inglesa-ii",
  "gbs-1-2-iog":  "introducao-as-organizacoes-e-a-gestao",
  "gbs-1-2-cg1":  "contabilidade-geral-i",
  "gbs-1-2-mat2": "matematica-ii",
  "gbs-2-1-cg2":  "contabilidade-geral-ii",
  "gbs-2-1-li3":  "lingua-inglesa-iii",
  "gbs-2-1-est":  "estatistica",
  "gbs-2-1-cof":  "calculo-e-operacoes-financeiras",
  "gbs-2-1-tsi":  "tecnologias-e-sistemas-de-informacao",
  "gbs-2-2-ca":   "contabilidade-analitica",
  "gbs-2-2-li4":  "lingua-inglesa-iv",
  "gbs-2-2-co":   "comportamento-organizacional",
  "gbs-2-2-mpf":  "mercados-e-produtos-financeiros",
  "gbs-2-2-irs":  "introducao-ao-risco-e-seguro",
  "gbs-3-1-cpco": "contabilidade-planeamento-e-controlo-orcamental",
  "gbs-3-1-fe":   "financas-empresariais",
  "gbs-3-1-dab":  "direito-na-actividade-bancaria",
  "gbs-3-1-agr":  "analise-e-gestao-de-risco",
  "gbs-3-1-fcb":  "financiamento-e-credito-bancario",
  "gbs-3-2-das":  "direito-na-actividade-seguradora",
  "gbs-3-2-opb":  "operacoes-e-pratica-bancaria",
  "gbs-3-2-fpf":  "fiscalidade-de-produtos-financeiros",
  "gbs-3-2-aef":  "analise-economico-financeira",
  "gbs-3-2-svsa": "seguro-de-vida-saude-e-acidentes",
  "gbs-4-1-ops":  "operacoes-e-pratica-seguradora",
  "gbs-4-1-grh":  "gestao-de-recursos-humanos",
  "gbs-4-1-eai":  "economia-angolana-e-internacional",
  "gbs-4-1-spnv": "seguros-de-propriedade-e-nao-vida",
  "gbs-4-1-tfc":  "trabalho-final-de-curso",
  "gbs-4-2-afbs": "auditoria-financeira-banca-e-seguros",
  "gbs-4-2-msf":  "marketing-de-servicos-financeiros",
  "gbs-4-2-gapf": "gestao-de-activos-passivos-e-fundos-de-pensoes",
  "gbs-4-2-scg":  "sistemas-de-controlo-de-gestao",
  "gbs-4-2-tfc":  "trabalho-final-de-curso",
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
            number: 1, totalHours: 768,
            disciplines: [
              { id: "igf-1-1-cpe",  name: "Comunicação Pessoal e Empresarial", annual: true },
              { id: "igf-1-1-li1",  name: "Inglês I" },
              { id: "igf-1-1-mi",   name: "Metodologias de Investigação Científica" },
              { id: "igf-1-1-fsi",  name: "Fundamentos de Sistemas da Informação" },
              { id: "igf-1-1-mat1", name: "Matemática I" },
            ],
          },
          {
            number: 2, totalHours: 768,
            disciplines: [
              { id: "igf-1-2-cg1",  name: "Contabilidade Geral I" },
              { id: "igf-1-2-li2",  name: "Inglês II" },
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
            number: 1, totalHours: 768,
            disciplines: [
              { id: "igf-2-1-cg2",   name: "Contabilidade Geral II" },
              { id: "igf-2-1-prog1", name: "Programação I" },
              { id: "igf-2-1-sd",    name: "Sistemas Digitais" },
              { id: "igf-2-1-cof",   name: "Cálculo e Operações Financeiras" },
              { id: "igf-2-1-ie",    name: "Introdução à Economia" },
            ],
          },
          {
            number: 2, totalHours: 768,
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
            number: 1, totalHours: 768,
            disciplines: [
              { id: "igf-3-1-mdsi", name: "Metodologia de Desenvolvimento de Sistemas de Informação" },
              { id: "igf-3-1-fe",   name: "Finanças Empresariais" },
              { id: "igf-3-1-bd2",  name: "Base de Dados II" },
              { id: "igf-3-1-rc",   name: "Redes de Computadores" },
              { id: "igf-3-1-so1",  name: "Sistemas Operativos I" },
            ],
          },
          {
            number: 2, totalHours: 768,
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
            number: 1, totalHours: 1216,
            disciplines: [
              { id: "igf-4-1-di",   name: "Direito Informático" },
              { id: "igf-4-1-sirn", name: "Segurança Informática em Redes de Sistemas" },
              { id: "igf-4-1-tm",   name: "Tecnologias Multimédia" },
              { id: "igf-4-1-fisc", name: "Fiscalidade" },
              { id: "igf-4-1-tfc",  name: "Trabalho Final de Curso", annual: true },
            ],
          },
          {
            number: 2, totalHours: 1216,
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
            number: 1, totalHours: 768,
            disciplines: [
              { id: "cf-1-1-cpe",  name: "Comunicação Pessoal e Empresarial", annual: true },
              { id: "cf-1-1-li1",  name: "Inglês I" },
              { id: "cf-1-1-mi",   name: "Metodologias de Investigação Científica" },
              { id: "cf-1-1-ii",   name: "Introdução à Informática" },
              { id: "cf-1-1-mat1", name: "Matemática I" },
            ],
          },
          {
            number: 2, totalHours: 768,
            disciplines: [
              { id: "cf-1-2-cpe",  name: "Comunicação Pessoal e Empresarial", annual: true },
              { id: "cf-1-2-li2",  name: "Inglês II" },
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
            number: 1, totalHours: 768,
            disciplines: [
              { id: "cf-2-1-cg2",  name: "Contabilidade Geral II" },
              { id: "cf-2-1-li3",  name: "Inglês III" },
              { id: "cf-2-1-me1",  name: "Microeconomia I" },
              { id: "cf-2-1-cof",  name: "Cálculo e Operações Financeiras" },
              { id: "cf-2-1-est1", name: "Estatística I" },
            ],
          },
          {
            number: 2, totalHours: 768,
            disciplines: [
              { id: "cf-2-2-ca",   name: "Contabilidade Analítica" },
              { id: "cf-2-2-li4",  name: "Inglês IV" },
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
            number: 1, totalHours: 768,
            disciplines: [
              { id: "cf-3-1-cpco", name: "Contabilidade, Planeamento e Controlo Orçamental" },
              { id: "cf-3-1-mac1", name: "Macroeconomia I" },
              { id: "cf-3-1-dc",   name: "Direito Comercial" },
              { id: "cf-3-1-fin1", name: "Finanças I" },
              { id: "cf-3-1-mkt1", name: "Marketing I" },
            ],
          },
          {
            number: 2, totalHours: 768,
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
            number: 1, totalHours: 1216,
            disciplines: [
              { id: "cf-4-1-he",  name: "História Económica" },
              { id: "cf-4-1-grh", name: "Gestão de Recursos Humanos" },
              { id: "cf-4-1-mpf", name: "Mercados e Produtos Financeiros" },
              { id: "cf-4-1-caa", name: "Contabilidade Analítica Avançada" },
              { id: "cf-4-1-tfc", name: "Trabalho Final de Curso", annual: true },
            ],
          },
          {
            number: 2, totalHours: 1216,
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
            number: 1, totalHours: 768,
            disciplines: [
              { id: "gbs-1-1-cpe",  name: "Comunicação Pessoal e Empresarial", annual: true },
              { id: "gbs-1-1-li1",  name: "Inglês I" },
              { id: "gbs-1-1-mi",   name: "Metodologias de Investigação Científica" },
              { id: "gbs-1-1-ii",   name: "Introdução à Informática" },
              { id: "gbs-1-1-mat1", name: "Matemática I" },
            ],
          },
          {
            number: 2, totalHours: 768,
            disciplines: [
              { id: "gbs-1-2-cpe",  name: "Comunicação Pessoal e Empresarial", annual: true },
              { id: "gbs-1-2-li2",  name: "Inglês II" },
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
            number: 1, totalHours: 768,
            disciplines: [
              { id: "gbs-2-1-cg2",  name: "Contabilidade Geral II" },
              { id: "gbs-2-1-li3",  name: "Inglês III" },
              { id: "gbs-2-1-est",  name: "Estatística" },
              { id: "gbs-2-1-cof",  name: "Cálculo e Operações Financeiras" },
              { id: "gbs-2-1-tsi",  name: "Tecnologias e Sistemas de Informação" },
            ],
          },
          {
            number: 2, totalHours: 768,
            disciplines: [
              { id: "gbs-2-2-ca",  name: "Contabilidade Analítica" },
              { id: "gbs-2-2-li4", name: "Inglês IV" },
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
            number: 1, totalHours: 768,
            disciplines: [
              { id: "gbs-3-1-cpco", name: "Contabilidade, Planeamento e Controlo Orçamental" },
              { id: "gbs-3-1-fe",   name: "Finanças Empresariais" },
              { id: "gbs-3-1-dab",  name: "Direito na Actividade Bancária" },
              { id: "gbs-3-1-agr",  name: "Análise e Gestão de Risco" },
              { id: "gbs-3-1-fcb",  name: "Financiamento e Crédito Bancário" },
            ],
          },
          {
            number: 2, totalHours: 768,
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
            number: 1, totalHours: 1216,
            disciplines: [
              { id: "gbs-4-1-ops",  name: "Operações e Prática Seguradora" },
              { id: "gbs-4-1-grh",  name: "Gestão de Recursos Humanos" },
              { id: "gbs-4-1-eai",  name: "Economia Angolana e Internacional" },
              { id: "gbs-4-1-spnv", name: "Seguros de Propriedade e Não-Vida" },
              { id: "gbs-4-1-tfc",  name: "Trabalho Final de Curso", annual: true },
            ],
          },
          {
            number: 2, totalHours: 1216,
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
const DAYS_ORDER = [
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
] as const;

const TYPE_COLORS: Record<WeeklySlot["type"], string> = {
  "Teórica":         "border-blue-500/30 bg-blue-500/10 text-blue-300",
  "Prática":         "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Teórico-Prática": "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

/* ================================================================
   TABS — chaves usadas na URL (?tab=curriculo)
   ================================================================ */
type Tab = "curriculo" | "horario" | "mudanca";
type ScheduleMode = "view" | "upload" | "manual";

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */
type Props = {
  courseId: CourseId;
  currentYear: 1 | 2 | 3 | 4;
  currentSemester: 1 | 2;
  studentName: string;
  studentNumber?: string | null;
};

export default function MeuCursoPage({
  courseId        = "informatica-gestao-financeira",
  currentYear     = 1,
  currentSemester = 1,
  studentName     = "Manuel dos Anjos",
  studentNumber,
}: Props) {
  const course  = CURRICULUM[courseId];
  const router  = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* ── Lê tab e scheduleMode da URL (restaura ao recarregar) ── */
  const tabFromUrl = (searchParams.get("tab") as Tab) ?? "curriculo";
  const modeFromUrl = (searchParams.get("mode") as ScheduleMode) ?? "view";

  const [activeTab,     setActiveTabState]     = useState<Tab>(tabFromUrl);
  const [scheduleMode,  setScheduleModeState]  = useState<ScheduleMode>(modeFromUrl);

  /* ── Sincroniza estado → URL sem recarregar a página ── */
  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.delete("mode"); // reset mode ao mudar de tab
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setScheduleMode = (mode: ScheduleMode) => {
    setScheduleModeState(mode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", mode);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  /* ── Estado curricular ── */
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([currentYear]));

  /* ── Estado do horário ── */
  const [mySchedule, setMySchedule] = useState<WeeklySlot[]>([]);
  const [pendingSlots, setPendingSlots] = useState<ParsedSlot[] | null>(null);
  const [manualSlots, setManualSlots] = useState<ManualSlot[]>([
    { day: "Segunda", startTime: "08:00", endTime: "10:00", disciplineName: "", room: "", professor: "", type: "Teórica" },
  ]);
  const [saving, setSaving] = useState(false);

  /* ── Server Action via useActionState ── */
  const [actionState, formAction, isPending] = useActionState(parseHorarioPDF, null);

  /* ── Quando a action retorna com sucesso, guarda os slots pendentes ── */
  useEffect(() => {
    if (actionState?.success && actionState.slots) {
      setPendingSlots(actionState.slots);
    }
  }, [actionState]);

  /* ── Scroll automático ── */
  const disciplinePanelRef = useRef<HTMLDivElement | null>(null);

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

  /* ── Helpers curriculares ── */
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
    if (year === currentYear && semester > currentSemester) return "upcoming";
    return "locked";
  };

  const statusIcon = (status: DisciplineStatus) => {
    switch (status) {
      case "completed": return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />;
      case "current":   return <Circle size={14} className="text-blue-400 shrink-0 fill-blue-400/30" />;
      case "upcoming":  return <Circle size={14} className="text-slate-500 shrink-0" />;
      case "locked":    return <Lock size={14} className="text-slate-600 shrink-0" />;
    }
  };

  const statusLabel: Record<DisciplineStatus, string> = {
    completed: "Concluída", current: "Em curso",
    upcoming: "A frequentar", locked: "Bloqueada",
  };

  const goToDiscipline = (id: string) =>
    router.push(`/disciplinas/${getDisciplineSlug(id)}`);

  const goToScheduleDiscipline = (slot: WeeklySlot) => {
    const slug = slot.disciplineSlug
      ? getDisciplineSlug(slot.disciplineSlug)
      : getDisciplineSlug(slot.id);
    router.push(`/disciplinas/${slug}`);
  };

  /* ── Confirmar slots do PDF e adicionar ao horário ── */
  const confirmParsedSlots = () => {
    if (!pendingSlots) return;
    const asWeeklySlots: WeeklySlot[] = pendingSlots.map((s) => ({
      id: s.id,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      discipline: s.discipline,
      room: s.room,
      professor: s.professor,
      type: s.type,
    }));
    setMySchedule(asWeeklySlots);
    setPendingSlots(null);
    setScheduleMode("view");
    // TODO: guardar no Supabase
  };

  /* ── Guardar slots manuais ── */
  const saveManual = () => {
    setSaving(true);
    const asWeeklySlots: WeeklySlot[] = manualSlots
      .filter((s) => s.disciplineName.trim())
      .map((s, i) => ({
        id: `manual-${i}`,
        day: s.day as WeeklySlot["day"],
        startTime: s.startTime,
        endTime: s.endTime,
        discipline: s.disciplineName,
        room: s.room || undefined,
        professor: s.professor || undefined,
        type: s.type as WeeklySlot["type"],
      }));
    setMySchedule(asWeeklySlots);
    setSaving(false);
    setScheduleMode("view");
    // TODO: guardar no Supabase
  };

  const addManualSlot = () =>
    setManualSlots([...manualSlots, {
      day: "Segunda", startTime: "08:00", endTime: "10:00",
      disciplineName: "", room: "", professor: "", type: "Teórica",
    }]);

  const removeManualSlot = (i: number) =>
    setManualSlots(manualSlots.filter((_, idx) => idx !== i));

  const updateManualSlot = (i: number, field: keyof ManualSlot, value: string) => {
    const updated = [...manualSlots];
    updated[i][field] = value;
    setManualSlots(updated);
  };

  /* ── Horário agrupado por dia ── */
  const scheduleByDay = useMemo(() => {
    const map: Record<string, WeeklySlot[]> = {};
    for (const day of DAYS_ORDER) map[day] = [];
    for (const slot of mySchedule) {
      if (map[slot.day]) map[slot.day].push(slot);
    }
    return map;
  }, [mySchedule]);

  const progress = Math.round(
    ((currentYear - 1) * 2 + (currentSemester - 1)) / 8 * 100
  );

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-5 md:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-slate-950/80 to-slate-950" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Meu Curso</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">{course.name}</h1>
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
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">Progresso</p>
            <p className="text-3xl font-bold text-white">
              {progress}<span className="text-base font-medium text-slate-400">%</span>
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
              curriculo: "Grelha Curricular", horario: "Horário Semanal", mudanca: "Mudar de Curso",
            };
            const icons: Record<Tab, React.ElementType> = {
              curriculo: Layers, horario: Calendar, mudanca: RefreshCw,
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

      {/* ================================================================
          TAB: GRELHA CURRICULAR
          ================================================================ */}
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
                    isCurrentYear ? "bg-indigo-950/60"
                    : isCompleted  ? "bg-emerald-950/20"
                    : "bg-slate-950/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                      isCurrentYear ? "bg-indigo-600 text-white"
                      : isCompleted  ? "bg-emerald-600/30 text-emerald-400"
                      : "bg-white/5 text-slate-400"
                    }`}>
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
                    ? <ChevronDown size={16} className="text-slate-400" />
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
                          <div className={`mb-3 flex items-center gap-2 border-b pb-2 ${
                            isSemCurrent ? "border-indigo-500/30" : "border-white/5"
                          }`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${isSemCurrent ? "bg-indigo-400" : "bg-slate-600"}`} />
                            <p className={`text-xs font-semibold uppercase tracking-wider ${
                              isSemCurrent ? "text-indigo-400" : "text-slate-500"
                            }`}>
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
                                  onClick={() => {
                                    if (discStatus === "locked") return;
                                    setSelectedDisciplineId(isSelected ? null : disc.id);
                                  }}
                                  disabled={discStatus === "locked"}
                                  className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                                    isSelected
                                      ? "bg-indigo-600/20 ring-1 ring-indigo-500/40"
                                      : discStatus === "locked"
                                      ? "cursor-default opacity-50"
                                      : isCurrent
                                      ? "hover:bg-indigo-950/40"
                                      : "hover:bg-white/5"
                                  }`}
                                >
                                  {statusIcon(discStatus)}
                                  <span className={`flex-1 leading-snug ${isSelected ? "text-indigo-200" : "text-slate-300"}`}>
                                    {disc.name}
                                    {disc.annual && (
                                      <span className="ml-1.5 text-[10px] text-slate-500">(Anual)</span>
                                    )}
                                  </span>
                                  {discStatus !== "locked" && (
                                    <ChevronRight
                                      size={12}
                                      className={`shrink-0 transition-transform ${
                                        isSelected ? "rotate-90 text-indigo-400" : "text-slate-600 group-hover:text-slate-400"
                                      }`}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isExpanded && selectedDiscipline && selectedDiscipline.year === yearData.year && (
                  <div ref={disciplinePanelRef}>
                    <DisciplinePanel
                      discipline={selectedDiscipline.discipline}
                      year={selectedDiscipline.year}
                      semester={selectedDiscipline.semester}
                      status={getDisciplineStatus(selectedDiscipline.year, selectedDiscipline.semester)}
                      onClose={() => setSelectedDisciplineId(null)}
                      onGoToDiscipline={() => goToDiscipline(selectedDiscipline.discipline.id)}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[11px] text-slate-500">
            <span className="font-medium text-slate-400">Legenda:</span>
            {(["completed", "current", "upcoming", "locked"] as DisciplineStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                {statusIcon(s)}{statusLabel[s]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================
          TAB: HORÁRIO SEMANAL
          ================================================================ */}
      {activeTab === "horario" && (
        <div className="space-y-4">

          {/* ─── MODO: VER ─── */}
          {scheduleMode === "view" && (
            <>
              {mySchedule.length === 0 ? (
                /* Empty state */
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-10 text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-slate-600" />
                  <p className="text-lg font-semibold text-slate-300">Ainda não tens horário configurado</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Importa o teu horário em PDF ou preenche manualmente
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => setScheduleMode("upload")}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                    >
                      <Upload size={16} /> Importar PDF
                    </button>
                    <button
                      onClick={() => setScheduleMode("manual")}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      <Plus size={16} /> Preencher manual
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Botões de edição */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setScheduleMode("upload")}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      <Upload size={14} /> Reimportar PDF
                    </button>
                    <button
                      onClick={() => {
                        setManualSlots(
                          mySchedule.map((s) => ({
                            day: s.day, startTime: s.startTime, endTime: s.endTime,
                            disciplineName: s.discipline, room: s.room ?? "",
                            professor: s.professor ?? "", type: s.type,
                          }))
                        );
                        setScheduleMode("manual");
                      }}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      <Edit3 size={14} /> Editar manual
                    </button>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.08] px-4 py-3 text-xs text-blue-300">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <span>
                      <strong>Clica em qualquer aula</strong> para aceder ao conteúdo da disciplina.
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {DAYS_ORDER.map((day) => {
                      const slots = scheduleByDay[day];
                      if (slots.length === 0) return null;
                      return (
                        <div key={day} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
                          <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
                            <p className="text-sm font-semibold text-slate-200">{day}</p>
                            <p className="text-xs text-slate-500">
                              {slots.length} aula{slots.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="space-y-2 p-3">
                            {slots.map((slot) => (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => goToScheduleDiscipline(slot)}
                                className={`group w-full rounded-xl border p-3 text-left text-xs transition hover:brightness-110 active:scale-[0.98] ${TYPE_COLORS[slot.type]}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-semibold leading-snug">{slot.discipline}</p>
                                  <span className="shrink-0 rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-medium">
                                    {slot.type.charAt(0)}
                                  </span>
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] opacity-80">
                                  <span className="flex items-center gap-1">
                                    <Clock size={10} /> {slot.startTime} – {slot.endTime}
                                  </span>
                                  {slot.room && (
                                    <span className="flex items-center gap-1">
                                      <MapPin size={10} /> {slot.room}
                                    </span>
                                  )}
                                </div>
                                {slot.professor && (
                                  <p className="mt-1 text-[11px] opacity-60">{slot.professor}</p>
                                )}
                                <div className="mt-2 flex items-center gap-1 text-[10px] opacity-0 transition-opacity group-hover:opacity-60">
                                  <ChevronRight size={10} /> Ver conteúdo
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {DAYS_ORDER.filter((d) => scheduleByDay[d].length === 0).length > 0 && (
                    <p className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-slate-600">
                      Sem aulas: {DAYS_ORDER.filter((d) => scheduleByDay[d].length === 0).join(", ")}
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* ─── MODO: UPLOAD PDF ─── */}
          {scheduleMode === "upload" && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Importar Horário</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Seleciona o PDF do teu horário — o texto é extraído automaticamente
                  </p>
                </div>
                <button
                  onClick={() => { setScheduleMode("view"); setPendingSlots(null); }}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              {/* Formulário — action é a Server Action diretamente */}
              <form action={formAction} className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Ficheiro PDF
                    </label>
                    <input
                      type="file"
                      name="file"
                      accept=".pdf"
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 file:mr-4 file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white hover:file:bg-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending ? (
                      <><Loader2 size={16} className="animate-spin" /> A processar...</>
                    ) : (
                      <><Upload size={16} /> Extrair horário</>
                    )}
                  </button>
                </div>
              </form>

              {/* Resultado da action */}
              {actionState && !isPending && (
                <div className={`mt-4 rounded-xl border p-4 ${
                  actionState.success
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-red-500/20 bg-red-500/10"
                }`}>
                  {actionState.success && pendingSlots ? (
                    <>
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 size={18} />
                        <p className="font-semibold">
                          {pendingSlots.length} aulas extraídas com sucesso!
                        </p>
                      </div>

                      {/* Preview */}
                      <div className="mt-4 max-h-60 space-y-1.5 overflow-auto">
                        {pendingSlots.map((slot, idx) => (
                          <div key={idx} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                            <span className="font-semibold text-slate-200">
                              {slot.day} · {slot.startTime}–{slot.endTime}
                            </span>
                            <span className="ml-2 text-slate-400">{slot.discipline}</span>
                            {slot.room && <span className="ml-2 text-slate-500">· {slot.room}</span>}
                            {slot.type && (
                              <span className="ml-2 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300">
                                {slot.type}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={confirmParsedSlots}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                      >
                        <CheckCircle2 size={16} /> Confirmar e usar este horário
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle size={18} />
                        <p className="font-semibold">Erro na extração</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{actionState.error}</p>
                      {actionState.extractedText && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs text-slate-500">
                            Ver texto extraído (para afinar a regex)
                          </summary>
                          <pre className="mt-2 max-h-48 overflow-auto rounded bg-black/30 p-3 text-[10px] text-slate-400">
                            {actionState.extractedText}
                          </pre>
                        </details>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── MODO: MANUAL ─── */}
          {scheduleMode === "manual" && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Preenchimento Manual</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Adiciona as tuas aulas uma a uma
                  </p>
                </div>
                <button
                  onClick={() => setScheduleMode("view")}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              <div className="space-y-3">
                {manualSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-6"
                  >
                    {/* Linha 1 */}
                    <select
                      value={slot.day}
                      onChange={(e) => updateManualSlot(index, "day", e.target.value)}
                      className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300"
                    >
                      {DAYS_ORDER.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>

                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateManualSlot(index, "startTime", e.target.value)}
                      className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300"
                    />

                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateManualSlot(index, "endTime", e.target.value)}
                      className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300"
                    />

                    <input
                      type="text"
                      placeholder="Disciplina *"
                      value={slot.disciplineName}
                      onChange={(e) => updateManualSlot(index, "disciplineName", e.target.value)}
                      className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 sm:col-span-2"
                    />

                    <button
                      onClick={() => removeManualSlot(index)}
                      className="flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
                    >
                      <Trash2 size={15} />
                    </button>

                    {/* Linha 2 */}
                    <input
                      type="text"
                      placeholder="Sala"
                      value={slot.room}
                      onChange={(e) => updateManualSlot(index, "room", e.target.value)}
                      className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 sm:col-span-2"
                    />

                    <input
                      type="text"
                      placeholder="Professor"
                      value={slot.professor}
                      onChange={(e) => updateManualSlot(index, "professor", e.target.value)}
                      className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 sm:col-span-2"
                    />

                    <select
                      value={slot.type}
                      onChange={(e) => updateManualSlot(index, "type", e.target.value)}
                      className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 sm:col-span-2"
                    >
                      <option value="Teórica">Teórica</option>
                      <option value="Prática">Prática</option>
                      <option value="Teórico-Prática">Teórico-Prática</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={addManualSlot}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  <Plus size={16} /> Adicionar aula
                </button>

                <button
                  onClick={saveManual}
                  disabled={saving || manualSlots.every((s) => !s.disciplineName.trim())}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <><Loader2 size={16} className="animate-spin" /> A guardar...</>
                  ) : (
                    <><CheckCircle2 size={16} /> Guardar Horário</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================
          TAB: MUDANÇA DE CURSO
          ================================================================ */}
      {activeTab === "mudanca" && (
        <CourseChangeSection currentCourseId={courseId} />
      )}
    </div>
  );
}

/* ================================================================
   PAINEL INLINE DE DISCIPLINA
   ================================================================ */
function DisciplinePanel({
  discipline, year, semester, status, onClose, onGoToDiscipline,
}: {
  discipline: Discipline; year: number; semester: number;
  status: DisciplineStatus; onClose: () => void; onGoToDiscipline: () => void;
}) {
  const statusColors: Record<DisciplineStatus, string> = {
    completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    current:   "bg-blue-500/10 border-blue-500/20 text-blue-300",
    upcoming:  "bg-slate-500/10 border-slate-500/20 text-slate-400",
    locked:    "bg-slate-800/30 border-slate-700/20 text-slate-600",
  };
  const statusLabel: Record<DisciplineStatus, string> = {
    completed: "Concluída", current: "Em curso",
    upcoming: "Próximo semestre", locked: "Bloqueada",
  };

  return (
    <div className="border-t border-indigo-500/20 bg-indigo-950/30 px-5 py-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
            <BookOpen size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{discipline.name}</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {year}º Ano · {semester}º Semestre{discipline.annual ? " · Anual" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColors[status]}`}>
            {statusLabel[status]}
          </span>
          <button
            type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {discipline.topics && discipline.topics.length > 0 ? (
        <div className="space-y-1.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Temas e Capítulos — clica para aceder ao conteúdo
          </p>
          {discipline.topics.map((topic, idx) => (
            <button
              key={idx} type="button" onClick={onGoToDiscipline}
              className="group flex w-full items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-slate-300 transition hover:border-indigo-500/30 hover:bg-indigo-950/40"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-600/20 text-[10px] font-bold text-indigo-400">
                {idx + 1}
              </span>
              <span className="flex-1 leading-snug">{topic}</span>
              <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Headphones size={12} className="text-indigo-400" />
                <PresentationIcon size={12} className="text-indigo-400" />
                <ChevronRight size={12} className="text-indigo-400" />
              </div>
            </button>
          ))}
          <button
            type="button" onClick={onGoToDiscipline}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-4 py-2.5 text-sm font-medium text-indigo-300 transition hover:bg-indigo-600/20"
          >
            <BookOpen size={14} /> Ir para a disciplina completa <ChevronRight size={14} />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
            <Layers size={24} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">Plano de estudo ainda não disponível</p>
            <p className="mt-1 text-xs text-slate-600">
              Os temas e capítulos serão carregados quando o docente os publicar.
            </p>
          </div>
          <button
            type="button" onClick={onGoToDiscipline}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-4 py-2.5 text-sm font-medium text-indigo-300 transition hover:bg-indigo-600/20"
          >
            <BookOpen size={14} /> Ir para a disciplina <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   SECÇÃO: MUDANÇA DE CURSO
   ================================================================ */
function CourseChangeSection({ currentCourseId }: { currentCourseId: CourseId }) {
  const otherCourses = Object.values(CURRICULUM).filter((c) => c.id !== currentCourseId);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-4 py-4 text-sm text-amber-300">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">Atenção antes de continuar</p>
          <p className="text-xs text-amber-400/80 leading-relaxed">
            A mudança de curso é um processo formal que requer aprovação da Secretaria Académica
            do ISAF. Lê atentamente os requisitos abaixo antes de submeter qualquer pedido.
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
            { icon: FileText, title: "Requerimento formal", desc: "Deve ser submetido um requerimento escrito dirigido ao Director Académico, durante o período de matrículas e inscrições." },
            { icon: CheckCircle2, title: "Aproveitamento mínimo", desc: "O estudante deve ter aprovação em pelo menos 50% das cadeiras do ano que frequentou. Reprovações por falta podem condicionar o pedido." },
            { icon: GraduationCap, title: "Equivalências curriculares", desc: "As cadeiras comuns entre cursos poderão ser creditadas após análise da Comissão Científica. As cadeiras sem equivalência terão de ser frequentadas." },
            { icon: Calendar, title: "Prazo de submissão", desc: "Os pedidos são aceites apenas no início de cada ano lectivo, durante o período de matrículas (normalmente Fevereiro e Setembro)." },
            { icon: Info, title: "Documentação necessária", desc: "Cédula pessoal ou BI, declaração de notas do ano findo, recibo de propinas em dia e declaração de intenção de mudança." },
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
          <p className="mt-0.5 text-xs text-slate-500">Seleciona o curso de destino para ver mais detalhes</p>
        </div>
        <div className="divide-y divide-white/5">
          {otherCourses.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-4">
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
            { icon: Phone,  label: "Telefone",   value: "+244 222 000 000" },
            { icon: Mail,   label: "Email",       value: "secretaria@isaf.co.ao" },
            { icon: MapPin, label: "Localização", value: "Luanda, Angola" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <Icon size={15} className="mt-0.5 shrink-0 text-indigo-400" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">{label}</p>
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