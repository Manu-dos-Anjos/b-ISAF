// app/page.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Headphones,
  Flame,
  Loader2,
  Sparkles,
  Trophy,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";

import AudioCard from "@/app/components/home/AudioCard";
import SlideCard from "@/app/components/home/SlideCard";
import QuizCard from "@/app/components/home/QuizCard";
import SectionCarousel from "@/app/components/home/SectionCarousel";
import { disciplinaImages } from "@/data/disciplinaImages";
import { useUser } from "@/app/lib/context/UserContext";

// ===================== TIPOS =====================
type UserAudioHistory = {
  id: string | number;
  disciplina: string;
  tema: string;
  duracao: string;
  progress?: number;
};

type UserSlideHistory = {
  id: string | number;
  disciplina: string;
  tituloSlide: string;
  slidesVistos: number;
  totalSlides?: number;
  ultimaVisualizacao?: string;
  progress?: number;
};

type UserQuizHistory = {
  id: string | number;
  disciplina: string;
  tituloQuiz: string;
  pontuacao: number;
  totalPerguntas: number;
  dataConclusao?: string;
};

type MobileInfoCollapseProps = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  className?: string;
  children: ReactNode;
};

function MobileInfoCollapse({
  title,
  subtitle,
  icon: Icon,
  badge,
  className = "",
  children,
}: MobileInfoCollapseProps) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={`sm:hidden rounded-[24px] border border-white/10 bg-white/[0.04] ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-indigo-300">
            <Icon size={18} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-white">
                {title}
              </h3>
              {badge && (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  {badge}
                </span>
              )}
            </div>

            {subtitle && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-slate-400">
          <span>{open ? "Recolher" : "Expandir"}</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && <div className="border-t border-white/10 p-4">{children}</div>}
    </section>
  );
}

type SummaryPanelBodyProps = {
  latestQuiz: UserQuizHistory | null;
  audioAvgProgress: number;
  slideAvgProgress: number;
  totalQuizzes: number;
};

function SummaryPanelBody({
  latestQuiz,
  audioAvgProgress,
  slideAvgProgress,
  totalQuizzes,
}: SummaryPanelBodyProps) {
  const latestQuizPct = latestQuiz
    ? Math.round(
        (latestQuiz.pontuacao / Math.max(1, latestQuiz.totalPerguntas)) * 100
      )
    : null;

  return (
    <div className="space-y-3">
      {latestQuiz && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Último quiz
              </p>
              <h3 className="mt-1 line-clamp-2 text-sm font-bold text-white">
                {latestQuiz.tituloQuiz}
              </h3>
              <p className="mt-1 text-xs text-slate-500">{latestQuiz.disciplina}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-right">
              <p className="text-lg font-black text-white">{latestQuizPct}%</p>
            </div>
          </div>

          {latestQuiz.dataConclusao && (
            <p className="mt-3 text-[11px] text-slate-500">
              Concluído {latestQuiz.dataConclusao}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-[11px] uppercase tracking-widest text-slate-500">
            Áudios
          </p>
          <p className="mt-2 text-2xl font-black text-white tabular-nums">
            {audioAvgProgress}%
          </p>
          <p className="mt-1 text-[11px] text-slate-500">média de progresso</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <p className="text-[11px] uppercase tracking-widest text-slate-500">
            Slides
          </p>
          <p className="mt-2 text-2xl font-black text-white tabular-nums">
            {slideAvgProgress}%
          </p>
          <p className="mt-1 text-[11px] text-slate-500">média visualizada</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <p className="text-[11px] uppercase tracking-widest text-slate-500">
          Últimos questionários
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-black text-white tabular-nums">
              {totalQuizzes}
            </p>
            <p className="mt-1 text-xs text-slate-500">histórico recente</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
            <BarChart3 size={14} />
            Sempre atualizado
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileBannerBody() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
          <Sparkles size={20} className="text-amber-400" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-white">Completa o teu perfil</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Adiciona o teu curso e ano para personalizarmos a tua experiência.
          </p>
        </div>
      </div>

      <Link
        href="/perfil"
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500"
      >
        Ir para o perfil
      </Link>
    </div>
  );
}

function TutorBannerBody() {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-violet-300">
          <Sparkles size={12} />
          Tutor IA
        </div>

        <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">
          Tira dúvidas, revisa conceitos e acelera o estudo
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Escolhe uma disciplina e um tema. O Tutor IA ajuda-te a compreender
          o conteúdo, destaca o essencial e acompanha o teu ritmo.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {["Perguntas rápidas", "Explicações por tema", "Foco no exame"].map(
            (item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300"
              >
                {item}
              </div>
            )
          )}
        </div>
      </div>

      <Link
        href="/disciplinas"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
      >
        <Sparkles size={15} />
        Começar
      </Link>
    </div>
  );
}

// ===================== HOME PAGE =====================
export default function HomePage() {
  const userContext = useUser();
  const { user, profile } = userContext;
  const userLoading =
    (userContext as any).loading ?? (userContext as any).isLoading ?? false;

  const [historicoAudios, setHistoricoAudios] = useState<UserAudioHistory[]>([]);
  const [historicoSlides, setHistoricoSlides] = useState<UserSlideHistory[]>([]);
  const [historicoQuizzes, setHistoricoQuizzes] = useState<UserQuizHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const getThumbnail = (disciplina: string): string => {
    return (
      disciplinaImages[disciplina as keyof typeof disciplinaImages] ||
      disciplinaImages.default ||
      "/images/disciplinas/default.jpg"
    );
  };

  useEffect(() => {
    const loadUserHistory = async () => {
      if (userLoading) return;

      setLoading(true);
      try {
        const mockAudios: UserAudioHistory[] = [
          {
            id: 1,
            disciplina: "Fundamentos de Sistemas de Informação",
            tema: "Introdução aos Sistemas de Informação",
            duracao: "14:32",
            progress: 45,
          },
          {
            id: 2,
            disciplina: "Metodologias de Investigação Científica",
            tema: "Ciência e Pesquisa",
            duracao: "22:10",
            progress: 80,
          },
          {
            id: 3,
            disciplina: "Comunicação Pessoal e Empresarial",
            tema: "Comunicação Assertiva",
            duracao: "08:45",
            progress: 30,
          },
          {
            id: 4,
            disciplina: "Matemática I",
            tema: "Funções e Gráficos",
            duracao: "22:10",
            progress: 80,
          },
          {
            id: 5,
            disciplina: "Inglês I",
            tema: "The verbs 'to be' and 'to have'",
            duracao: "08:45",
            progress: 30,
          },
        ];

        const mockSlides: UserSlideHistory[] = [
          {
            id: 101,
            disciplina: "Fundamentos de Sistemas de Informação",
            tituloSlide: "Introdução aos Sistemas de Informação",
            slidesVistos: 12,
            totalSlides: 25,
            ultimaVisualizacao: "2 dias atrás",
          },
          {
            id: 102,
            disciplina: "Inglês I",
            tituloSlide: "Adjetivos e Advérbios",
            slidesVistos: 25,
            totalSlides: 25,
            ultimaVisualizacao: "Há 5 horas",
          },
          {
            id: 103,
            disciplina: "Comunicação Pessoal e Empresarial",
            tituloSlide: "Comunicação Assertiva",
            slidesVistos: 8,
            totalSlides: 18,
            ultimaVisualizacao: "Ontem",
          },
          {
            id: 104,
            disciplina: "Metodologias de Investigação Científica",
            tituloSlide: "Pesquisa Bibliográfica",
            slidesVistos: 25,
            totalSlides: 25,
            ultimaVisualizacao: "Há 5 horas",
          },
          {
            id: 105,
            disciplina: "Matemática I",
            tituloSlide: "Matrizes e Determinantes",
            slidesVistos: 8,
            totalSlides: 18,
            ultimaVisualizacao: "Ontem",
          },
        ];

        const mockQuizzes: UserQuizHistory[] = [
          {
            id: 201,
            disciplina: "Inglês I",
            tituloQuiz: "Teste 1 - Composição de Frases",
            pontuacao: 14,
            totalPerguntas: 15,
            dataConclusao: "3 dias atrás",
          },
          {
            id: 202,
            disciplina: "Matemática I",
            tituloQuiz: "Teste 2 - Matrizes e Determinantes",
            pontuacao: 9,
            totalPerguntas: 12,
            dataConclusao: "1 semana atrás",
          },
          {
            id: 203,
            disciplina: "Metodologias de Investigação Científica",
            tituloQuiz: "Teste 1 - Recolha de Dados",
            pontuacao: 14,
            totalPerguntas: 15,
            dataConclusao: "3 dias atrás",
          },
          {
            id: 204,
            disciplina: "Fundamentos de Sistemas de Informação",
            tituloQuiz: "Teste 3 - Componentes de um SI",
            pontuacao: 9,
            totalPerguntas: 12,
            dataConclusao: "1 semana atrás",
          },
          {
            id: 205,
            disciplina: "Comunicação Pessoal e Empresarial",
            tituloQuiz: "Teste 2 - Estilos de comunicação",
            pontuacao: 14,
            totalPerguntas: 15,
            dataConclusao: "3 dias atrás",
          },
        ];

        setHistoricoAudios(mockAudios);
        setHistoricoSlides(mockSlides);
        setHistoricoQuizzes(mockQuizzes);
      } catch (error) {
        console.error("Erro ao carregar histórico:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserHistory();
  }, [userLoading]);

  const userName =
    profile?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Estudante";

  const quizAveragePct = useMemo(() => {
    if (!historicoQuizzes.length) return null;

    const values = historicoQuizzes
      .filter((q) => q.totalPerguntas > 0)
      .map((q) => Math.round((q.pontuacao / q.totalPerguntas) * 100));

    if (!values.length) return null;

    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [historicoQuizzes]);

  const audioAvgProgress = useMemo(() => {
    if (!historicoAudios.length) return 0;
    return Math.round(
      historicoAudios.reduce((sum, item) => sum + (item.progress ?? 0), 0) /
        historicoAudios.length
    );
  }, [historicoAudios]);

  const slideAvgProgress = useMemo(() => {
    if (!historicoSlides.length) return 0;

    return Math.round(
      historicoSlides.reduce((sum, item) => {
        const pct =
          item.totalSlides && item.totalSlides > 0
            ? (item.slidesVistos / item.totalSlides) * 100
            : 0;
        return sum + pct;
      }, 0) / historicoSlides.length
    );
  }, [historicoSlides]);

  const totalRecentItems =
    historicoAudios.length + historicoSlides.length + historicoQuizzes.length;

  const latestQuiz = historicoQuizzes[0] ?? null;

  const quickActions = [
    {
      href: "/disciplinas",
      title: "Disciplinas",
      desc: "Explorar capítulos, slides e áudios",
      icon: BookOpen,
    },
    {
      href: "/avaliacoes",
      title: "Avaliações",
      desc: "Ver quizzes, revisão e estatísticas",
      icon: ClipboardList,
    },
    {
      href: "/meu-curso",
      title: "Meu curso",
      desc: "Ver plano, semestre e cadeiras",
      icon: GraduationCap,
    },
  ];

  // ✅ loading só depois de todos os hooks
  if (userLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <p className="text-sm text-slate-400">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 md:space-y-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-indigo-950/70 via-slate-950 to-slate-950 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.16),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,197,94,0.08),transparent_48%)]" />

        <div className="relative grid gap-6 p-4 sm:p-6 xl:grid-cols-[1.2fr_0.8fr] xl:p-8">
          {/* ESQUERDA */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-300">
              <Sparkles size={12} />
              Biblioteca Virtual
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                Olá, {userName} 👋
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                Organiza o teu estudo, retoma os conteúdos mais recentes e
                acompanha o teu progresso com uma visão clara de áudio, slides e
                avaliações.
              </p>
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Link
                href="/disciplinas"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                <BookOpen size={15} />
                Ver disciplinas
              </Link>

              <Link
                href="/avaliacoes"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
              >
                <ClipboardList size={15} />
                Avaliações
              </Link>
            </div>

            {/* MÉTRICAS */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Conteúdos",
                  value: totalRecentItems,
                  icon: BarChart3,
                  color: "text-blue-300",
                  bg: "bg-blue-500/10",
                },
                {
                  label: "Áudios",
                  value: `${historicoAudios.length}`,
                  icon: Headphones,
                  color: "text-cyan-300",
                  bg: "bg-cyan-500/10",
                },
                {
                  label: "Slides",
                  value: `${historicoSlides.length}`,
                  icon: BookOpen,
                  color: "text-violet-300",
                  bg: "bg-violet-500/10",
                },
                {
                  label: "Média quizzes",
                  value: quizAveragePct !== null ? `${quizAveragePct}%` : "—",
                  icon: Trophy,
                  color:
                    quizAveragePct !== null && quizAveragePct >= 50
                      ? "text-emerald-300"
                      : "text-amber-300",
                  bg:
                    quizAveragePct !== null && quizAveragePct >= 50
                      ? "bg-emerald-500/10"
                      : "bg-amber-500/10",
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm sm:p-4"
                >
                  <div
                    className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}
                  >
                    <Icon size={16} className={color} />
                  </div>
                  <p
                    className={`text-center text-lg font-black tabular-nums ${color}`}
                  >
                    {value}
                  </p>
                  <p className="text-center text-[10px] uppercase tracking-widest text-slate-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* AÇÕES RÁPIDAS */}
            <div className="grid gap-3 sm:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                          <Icon size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {action.title}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {action.desc}
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="mt-1 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* PAINEL DIREITO DESKTOP */}
          <div className="hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm sm:block sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Resumo do momento
                </p>
                <h2 className="mt-1 text-lg font-bold text-white">
                  O teu progresso
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                <Flame size={18} />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <SummaryPanelBody
                latestQuiz={latestQuiz}
                audioAvgProgress={audioAvgProgress}
                slideAvgProgress={slideAvgProgress}
                totalQuizzes={historicoQuizzes.length}
              />
            </div>
          </div>
        </div>
      </section>

      {/* RESUMO DO MOMENTO MOBILE */}
      <MobileInfoCollapse
        className="mt-4"
        title="Resumo do momento"
        subtitle="Toque para ver o teu progresso"
        icon={Flame}
        badge="Resumo"
      >
        <SummaryPanelBody
          latestQuiz={latestQuiz}
          audioAvgProgress={audioAvgProgress}
          slideAvgProgress={slideAvgProgress}
          totalQuizzes={historicoQuizzes.length}
        />
      </MobileInfoCollapse>

      {/* PERFIL INCOMPLETO */}
      {user && (!profile?.full_name || !profile?.course_id) && (
        <>
          <MobileInfoCollapse
            className="mt-4"
            title="Completa o teu perfil"
            subtitle="Adiciona curso e ano para personalizar"
            icon={Sparkles}
            badge="Perfil"
          >
            <ProfileBannerBody />
          </MobileInfoCollapse>

          <section className="hidden rounded-[24px] border border-amber-500/20 bg-amber-500/5 p-4 sm:block sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                  <Sparkles size={20} className="text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-white">Completa o teu perfil</h2>
                  <p className="mt-0.5 text-sm text-slate-400">
                    Adiciona o teu curso e ano para personalizarmos a tua
                    experiência.
                  </p>
                </div>
              </div>

              <Link
                href="/perfil"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500"
              >
                Ir para o perfil
              </Link>
            </div>
          </section>
        </>
      )}

      {/* TUTOR IA */}
      <>
        <MobileInfoCollapse
          className="mt-4"
          title="Tutor IA"
          subtitle="Expande para usar o assistente"
          icon={Sparkles}
          badge="IA"
        >
          <TutorBannerBody />
        </MobileInfoCollapse>

        <section className="hidden rounded-[24px] border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-slate-950 p-4 sm:block sm:p-5">
          <TutorBannerBody />
        </section>
      </>

      {/* CARROSSEIS */}
      <SectionCarousel title="Continuar a ouvir">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            A carregar áudios...
          </div>
        ) : historicoAudios.length > 0 ? (
          historicoAudios.map((item) => (
            <AudioCard
              key={item.id}
              disciplina={item.disciplina}
              tema={item.tema}
              duracao={item.duracao}
              thumbnail={getThumbnail(item.disciplina)}
              progress={item.progress}
            />
          ))
        ) : (
          <p className="py-8 text-sm text-slate-400">
            Nenhum áudio no histórico.
          </p>
        )}
      </SectionCarousel>

      <SectionCarousel title="Slides lidos recentemente">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            A carregar slides...
          </div>
        ) : historicoSlides.length > 0 ? (
          historicoSlides.map((item) => (
            <SlideCard
              key={item.id}
              id={item.id}
              disciplina={item.disciplina}
              tituloSlide={item.tituloSlide}
              slidesVistos={item.slidesVistos}
              totalSlides={item.totalSlides}
              ultimaVisualizacao={item.ultimaVisualizacao}
              thumbnail={getThumbnail(item.disciplina)}
              progress={item.progress}
            />
          ))
        ) : (
          <p className="py-8 text-sm text-slate-400">
            Ainda não leste nenhum slide.
          </p>
        )}
      </SectionCarousel>

      <SectionCarousel title="Questionários em andamento">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            A carregar questionários...
          </div>
        ) : historicoQuizzes.length > 0 ? (
          historicoQuizzes.map((item) => (
            <QuizCard
              key={item.id}
              id={item.id}
              disciplina={item.disciplina}
              tituloQuiz={item.tituloQuiz}
              pontuacao={item.pontuacao}
              totalPerguntas={item.totalPerguntas}
              dataConclusao={item.dataConclusao}
              thumbnail={getThumbnail(item.disciplina)} acertos={0}            />
          ))
        ) : (
          <p className="py-8 text-sm text-slate-400">
            Ainda não fizeste nenhum questionário.
          </p>
        )}
      </SectionCarousel>
    </div>
  );
}