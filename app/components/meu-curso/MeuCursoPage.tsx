"use client";

import { useState, useMemo } from "react";
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  X,
  GraduationCap,
  Clock,
  Calendar,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  Circle,
  Lock,
  Layers,
  Info,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

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
  annual?: boolean; // cadeira anual (aparece nos dois semestres)
  credits?: number; // futuramente vindos da BD
  topics?: string[]; // temas / capítulos (vindos da BD)
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
  startTime: string; // "08:00"
  endTime: string;   // "10:00"
  discipline: string;
  room?: string;
  professor?: string;
  type: "Teórica" | "Prática" | "Teórico-Prática";
};

/* ================================================================
   DADOS CURRICULARES (extraídos dos PDFs)
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
              { id: "igf-1-1-mi",   name: "Métodos de Investigação" },
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
              { id: "igf-2-1-cg2",  name: "Contabilidade Geral II" },
              { id: "igf-2-1-prog1", name: "Programação I" },
              { id: "igf-2-1-sd",   name: "Sistemas Digitais" },
              { id: "igf-2-1-cof",  name: "Cálculo e Operações Financeiras" },
              { id: "igf-2-1-ie",   name: "Introdução à Economia" },
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
              { id: "igf-3-1-mdsi",  name: "Metodologia de Desenvolvimento de Sistemas de Informação" },
              { id: "igf-3-1-fe",    name: "Finanças Empresariais" },
              { id: "igf-3-1-bd2",   name: "Base de Dados II" },
              { id: "igf-3-1-rc",    name: "Redes de Computadores" },
              { id: "igf-3-1-so1",   name: "Sistemas Operativos I" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
              { id: "igf-3-2-qsi",  name: "Qualidade de Sistemas de Informação" },
              { id: "igf-3-2-grn",  name: "Gestão de Redes Informáticas" },
              { id: "igf-3-2-ds",   name: "Desenvolvimento de Software" },
              { id: "igf-3-2-ltw",  name: "Linguagens e Tecnologias Web" },
              { id: "igf-3-2-so2",  name: "Sistemas Operativos II" },
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
              { id: "igf-4-2-ai",   name: "Auditoria Informática" },
              { id: "igf-4-2-ce",   name: "Comércio Electrónico" },
              { id: "igf-4-2-md",   name: "Marketing Digital" },
              { id: "igf-4-2-grh",  name: "Gestão de Recursos Humanos" },
              { id: "igf-4-2-tfc",  name: "Trabalho Final de Curso", annual: true },
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
              { id: "cf-1-1-mi",   name: "Métodos de Investigação" },
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
              { id: "cf-4-2-aef",  name: "Análise Económico-Financeira" },
              { id: "cf-4-2-aud",  name: "Auditoria" },
              { id: "cf-4-2-eci",  name: "Economia e Comércio Internacionais" },
              { id: "cf-4-2-scg",  name: "Sistemas de Controlo de Gestão" },
              { id: "cf-4-2-tfc",  name: "Trabalho Final de Curso", annual: true },
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
              { id: "gbs-1-1-mi",   name: "Métodos de Investigação" },
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
              { id: "gbs-2-1-cg2",  name: "Contabilidade Geral II" },
              { id: "gbs-2-1-li3",  name: "Língua Inglesa III" },
              { id: "gbs-2-1-est",  name: "Estatística" },
              { id: "gbs-2-1-cof",  name: "Cálculo e Operações Financeiras" },
              { id: "gbs-2-1-tsi",  name: "Tecnologias e Sistemas de Informação" },
            ],
          },
          {
            number: 2,
            totalHours: 768,
            disciplines: [
              { id: "gbs-2-2-ca",   name: "Contabilidade Analítica" },
              { id: "gbs-2-2-li4",  name: "Língua Inglesa IV" },
              { id: "gbs-2-2-co",   name: "Comportamento Organizacional" },
              { id: "gbs-2-2-mpf",  name: "Mercados e Produtos Financeiros" },
              { id: "gbs-2-2-irs",  name: "Introdução ao Risco e Seguro" },
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
   HORÁRIO SEMANAL — estrutura-base (substituir pelos dados reais)
   As slots virão da Supabase: tabela "schedules"
   ================================================================ */
const MOCK_SCHEDULE: WeeklySlot[] = [
  {
    id: "s1", day: "Segunda", startTime: "08:00", endTime: "10:00",
    discipline: "Fundamentos de Sistemas da Informação", room: "Sala 12", professor: "Prof. Silva", type: "Teórica",
  },
  {
    id: "s2", day: "Segunda", startTime: "10:15", endTime: "12:15",
    discipline: "Matemática I", room: "Sala 8", professor: "Prof. Costa", type: "Teórico-Prática",
  },
  {
    id: "s3", day: "Terça", startTime: "08:00", endTime: "10:00",
    discipline: "Comunicação Pessoal e Empresarial", room: "Auditório A", professor: "Prof.ª Santos", type: "Teórica",
  },
  {
    id: "s4", day: "Terça", startTime: "14:00", endTime: "16:00",
    discipline: "Língua Inglesa I", room: "Sala 5", professor: "Prof.ª Moreira", type: "Prática",
  },
  {
    id: "s5", day: "Quarta", startTime: "10:15", endTime: "12:15",
    discipline: "Métodos de Investigação", room: "Sala 3", professor: "Prof. Fernandes", type: "Teórica",
  },
  {
    id: "s6", day: "Quinta", startTime: "08:00", endTime: "10:00",
    discipline: "Arquitetura de Computadores", room: "Lab. Informática", professor: "Prof. Lima", type: "Prática",
  },
  {
    id: "s7", day: "Quinta", startTime: "14:00", endTime: "16:00",
    discipline: "Matemática II", room: "Sala 8", professor: "Prof. Costa", type: "Teórico-Prática",
  },
  {
    id: "s8", day: "Sexta", startTime: "08:00", endTime: "10:00",
    discipline: "Fundamentos de Sistemas da Informação", room: "Lab. Informática", professor: "Prof. Silva", type: "Prática",
  },
];

const DAYS_ORDER = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

const TYPE_COLORS: Record<WeeklySlot["type"], string> = {
  "Teórica":           "border-blue-500/30 bg-blue-500/10 text-blue-300",
  "Prática":           "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Teórico-Prática":   "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */

type Props = {
  /** Vem do UserContext / Supabase profiles */
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
  studentName = "Manuel dos Anjos",
  studentNumber,
}: Props) {
  const course = CURRICULUM[courseId];

  /* estado local */
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([currentYear]));
  const [activeTab, setActiveTab] = useState<"curriculo" | "horario" | "mudanca">("curriculo");

  /* disciplina seleccionada */
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
    completed: "Concluída",
    current:   "Em curso",
    upcoming:  "A frequentar",
    locked:    "Bloqueada",
  };

  /* horário agrupado por dia */
  const scheduleByDay = useMemo(() => {
    const map: Record<string, WeeklySlot[]> = {};
    for (const day of DAYS_ORDER) map[day] = [];
    for (const slot of MOCK_SCHEDULE) {
      if (map[slot.day]) map[slot.day].push(slot);
    }
    return map;
  }, []);

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-5 md:p-6">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-950/60 via-slate-950/80 to-slate-950" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Meu Curso
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
              {course.name}
            </h1>
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

          {/* Progresso global */}
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">Progresso</p>
            <p className="text-3xl font-bold text-white">
              {Math.round(((currentYear - 1) * 2 + (currentSemester - 1)) / 8 * 100)}
              <span className="text-base font-medium text-slate-400">%</span>
            </p>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all"
                style={{ width: `${Math.round(((currentYear - 1) * 2 + (currentSemester - 1)) / 8 * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative z-10 mt-5 flex gap-1 rounded-xl bg-white/5 p-1">
          {(["curriculo", "horario", "mudanca"] as const).map((tab) => {
            const labels = { curriculo: "Grelha Curricular", horario: "Horário Semanal", mudanca: "Mudar de Curso" };
            const icons  = { curriculo: Layers, horario: Calendar, mudanca: RefreshCw };
            const Icon   = icons[tab];
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
            const isLocked      = yearData.year > currentYear;

            return (
              <div
                key={yearData.year}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isCurrentYear
                    ? "border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                    : "border-white/10"
                }`}
              >
                {/* Cabeçalho do ano */}
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
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400" />
                  )}
                </button>

                {/* Conteúdo do ano */}
                {isExpanded && (
                  <div className="grid divide-y divide-white/5 bg-slate-950/30 md:grid-cols-2 md:divide-x md:divide-y-0">
                    {yearData.semesters.map((sem) => {
                      const status = getDisciplineStatus(yearData.year, sem.number);
                      const isSemCurrent = status === "current";

                      return (
                        <div key={sem.number} className="p-4">
                          <div className={`mb-3 flex items-center gap-2 pb-2 border-b ${
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
                                      : discStatus === "locked"
                                      ? "cursor-default opacity-50"
                                      : "hover:bg-white/5"
                                  }`}
                                  disabled={discStatus === "locked"}
                                >
                                  {statusIcon(discStatus)}
                                  <span
                                    className={`flex-1 leading-snug ${
                                      isSelected ? "text-indigo-200" : "text-slate-300"
                                    }`}
                                  >
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

                {/* Painel inline da disciplina seleccionada (dentro deste ano) */}
                {isExpanded && selectedDiscipline && selectedDiscipline.year === yearData.year && (
                  <DisciplinePanel
                    discipline={selectedDiscipline.discipline}
                    year={selectedDiscipline.year}
                    semester={selectedDiscipline.semester}
                    status={getDisciplineStatus(selectedDiscipline.year, selectedDiscipline.semester)}
                    onClose={() => setSelectedDisciplineId(null)}
                  />
                )}
              </div>
            );
          })}

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[11px] text-slate-500">
            <span className="font-medium text-slate-400">Legenda:</span>
            {(["completed", "current", "upcoming", "locked"] as DisciplineStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                {statusIcon(s)}
                {statusLabel[s]}
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
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs text-amber-300">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              O horário apresentado é uma estrutura de exemplo. O horário real será carregado
              automaticamente após o início do semestre com base nos dados da secretaria.
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DAYS_ORDER.map((day) => {
              const slots = scheduleByDay[day];
              if (slots.length === 0) return null;

              return (
                <div
                  key={day}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 overflow-hidden"
                >
                  <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-sm font-semibold text-slate-200">{day}</p>
                    <p className="text-xs text-slate-500">{slots.length} aula{slots.length !== 1 ? "s" : ""}</p>
                  </div>

                  <div className="space-y-2 p-3">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`rounded-xl border p-3 text-xs ${TYPE_COLORS[slot.type]}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold leading-snug">{slot.discipline}</p>
                          <span className="shrink-0 rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-medium">
                            {slot.type.charAt(0)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] opacity-80">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {slot.startTime} – {slot.endTime}
                          </span>
                          {slot.room && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} />
                              {slot.room}
                            </span>
                          )}
                        </div>
                        {slot.professor && (
                          <p className="mt-1 text-[11px] opacity-60">{slot.professor}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dias sem aulas */}
          {DAYS_ORDER.filter((d) => scheduleByDay[d].length === 0).length > 0 && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-slate-600">
              Sem aulas: {DAYS_ORDER.filter((d) => scheduleByDay[d].length === 0).join(", ")}
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
  discipline,
  year,
  semester,
  status,
  onClose,
}: {
  discipline: Discipline;
  year: number;
  semester: number;
  status: DisciplineStatus;
  onClose: () => void;
}) {
  const statusColors: Record<DisciplineStatus, string> = {
    completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    current:   "bg-blue-500/10 border-blue-500/20 text-blue-300",
    upcoming:  "bg-slate-500/10 border-slate-500/20 text-slate-400",
    locked:    "bg-slate-800/30 border-slate-700/20 text-slate-600",
  };
  const statusLabel: Record<DisciplineStatus, string> = {
    completed: "Concluída",
    current:   "Em curso",
    upcoming:  "Próximo semestre",
    locked:    "Bloqueada",
  };

  return (
    <div className="border-t border-indigo-500/20 bg-indigo-950/30 px-5 py-5">
      {/* Header */}
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
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColors[status]}`}>
            {statusLabel[status]}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
            aria-label="Fechar"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Temas / Capítulos */}
      {discipline.topics && discipline.topics.length > 0 ? (
        <div className="space-y-1.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Temas e Capítulos
          </p>
          {discipline.topics.map((topic, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-600/20 text-[10px] font-bold text-indigo-400">
                {idx + 1}
              </span>
              {topic}
            </div>
          ))}
        </div>
      ) : (
        /* Placeholder — dados virão do Supabase */
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
          <Layers size={24} className="mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">Plano de estudo ainda não disponível</p>
          <p className="mt-1 text-xs text-slate-600">
            Os temas e capítulos serão carregados quando o docente os publicar na plataforma.
          </p>
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
      {/* Aviso */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-4 text-sm text-amber-300">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">Atenção antes de continuar</p>
          <p className="text-xs text-amber-400/80 leading-relaxed">
            A mudança de curso é um processo formal que requer aprovação da Secretaria Académica
            do ISAF. Lê atentamente os requisitos abaixo antes de submeter qualquer pedido.
          </p>
        </div>
      </div>

      {/* Regulamento — informações reais do ISAF */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 overflow-hidden">
        <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
          <h2 className="font-semibold text-slate-100">Requisitos para Mudança de Curso</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Conforme o Regulamento Académico do ISAF
          </p>
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
              desc: "O estudante deve ter aprovação em pelo menos 50% das cadeiras do ano que frequentou. Reprovações por falta podem condicionar o pedido.",
            },
            {
              icon: GraduationCap,
              title: "Equivalências curriculares",
              desc: "As cadeiras comuns entre cursos poderão ser creditadas após análise da Comissão Científica. As cadeiras sem equivalência terão de ser frequentadas.",
            },
            {
              icon: Calendar,
              title: "Prazo de submissão",
              desc: "Os pedidos são aceites apenas no início de cada ano lectivo, durante o período de matrículas (normalmente Fevereiro e Setembro).",
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

      {/* Cursos disponíveis */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 overflow-hidden">
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

      {/* Contactos da Secretaria */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 overflow-hidden">
        <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
          <h2 className="font-semibold text-slate-100">Contactar a Secretaria</h2>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {[
            { icon: Phone, label: "Telefone", value: "+244 222 000 000" },
            { icon: Mail,  label: "Email",    value: "secretaria@isaf.co.ao" },
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
            <RefreshCw size={15} />
            Submeter pedido de mudança
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-600">
            Ao clicar, será redirecionado para o formulário oficial da Secretaria.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   EXEMPLO DE USO — substituir os props pelos dados do Supabase

   import MeuCursoPage, { CourseId } from "@/app/components/MeuCursoPage";
   import { useUser } from "@/app/lib/context/UserContext";

   export default function Page() {
     const { user } = useUser();

     return (
       <MeuCursoPage
         courseId={(user?.academic?.courseId as CourseId) ?? "informatica-gestao-financeira"}
         currentYear={(user?.academic?.year ?? 1) as 1|2|3|4}
         currentSemester={(user?.academic?.semester ?? 1) as 1|2}
         studentName={user?.name ?? ""}
         studentNumber={user?.academic?.studentNumber}
       />
     );
   }
   ================================================================ */
