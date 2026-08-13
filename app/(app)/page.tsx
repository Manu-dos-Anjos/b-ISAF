// app/(app)/page.tsx
"use client";

import { useMemo, useState, type ReactNode } from "react"; // ✅ useState incluído
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useUser } from "@/app/lib/context/UserContext";
import { useHomeHistory } from "@/app/lib/hooks/useHomeHistory";
import { useAudioPlayer } from "@/app/lib/context/AudioPlayerContext"; // ✅ novo
import type { UserQuizHistory } from "@/app/lib/data/homeHistory";

// ===================== COLLAPSE MOBILE =====================
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
  const [open, setOpen] = useState(false); // ✅ agora funciona

  return (
    <section
      className={`sm:hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-violet-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-violet-300">
            <Icon size={18} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {title}
              </h3>
              {badge && (
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="mt-0.5 line-clamp-1 text-sm text-slate-600 dark:text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span>{open ? "Recolher" : "Expandir"}</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-200 p-4 dark:border-white/10">
          {children}
        </div>
      )}
    </section>
  );
}

// ===================== SUMMARY PANEL =====================
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-500">
                Último quiz
              </p>
              <h3 className="mt-1 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">
                {latestQuiz.tituloQuiz}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {latestQuiz.disciplina}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-right dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {latestQuizPct}%
              </p>
            </div>
          </div>
          {latestQuiz.dataConclusao && (
            <p className="mt-3 text-[11px] text-slate-600 dark:text-slate-500">
              Concluído {latestQuiz.dataConclusao}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-500">
            Áudios
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {audioAvgProgress}%
          </p>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-500">
            média de progresso
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-500">
            Slides
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {slideAvgProgress}%
          </p>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-500">
            média visualizada
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-500">
          Últimos questionários
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
              {totalQuizzes}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
              histórico recente
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
            <BarChart3 size={14} />
            Sempre atualizado
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== BANNERS =====================
function ProfileBannerBody() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/20">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Completa o teu perfil
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-700 dark:text-slate-400">
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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
          <Sparkles size={12} />
          Tutor IA
        </div>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
          Tira dúvidas, revisa conceitos e acelera o estudo
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-400">
          Escolhe uma disciplina e um tema. O Tutor IA ajuda-te a compreender o
          conteúdo, destaca o essencial e acompanha o teu ritmo.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {["Perguntas rápidas", "Explicações por tema", "Foco no exame"].map(
            (item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:shadow-none"
              >
                {item}
              </div>
            )
          )}
        </div>
      </div>
      <Link
        href="/disciplinas"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
      >
        <Sparkles size={15} />
        Começar
      </Link>
    </div>
  );
}

// ===================== HOME PAGE =====================
export default function HomePage() {
  const router = useRouter();
  const userContext = useUser();
  const { user, profile } = userContext;
  const userLoading =
    (userContext as any).loading ?? (userContext as any).isLoading ?? false;

  const { play } = useAudioPlayer(); // ✅ player real

  const {
    audios: historicoAudios,
    slides: historicoSlides,
    quizzes: historicoQuizzes,
    loading,
  } = useHomeHistory();

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
    historicoSlides.reduce((sum, item) => sum + (item.progress ?? 0), 0) /
      historicoSlides.length
  );
}, [historicoSlides]);

  const totalRecentItems =
    historicoAudios.length + historicoSlides.length + historicoQuizzes.length;

  const latestQuiz = historicoQuizzes[0] ?? null;

  const DEFAULT_THUMBNAIL = "/images/disciplinas/default.jpg";

  const quickActions = [
    {
      href: "/disciplinas",
      title: "Disciplinas",
      desc: "Capítulos, slides e áudios",
      icon: BookOpen,
      mobileClass:
        "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20",
      desktopClass:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20 dark:hover:bg-slate-800",
      iconClass: "text-blue-600 dark:text-blue-400",
    },
    {
      href: "/avaliacoes",
      title: "Avaliações",
      desc: "Quizzes e estatísticas",
      icon: ClipboardList,
      mobileClass:
        "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20",
      desktopClass:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20 dark:hover:bg-slate-800",
      iconClass: "text-amber-600 dark:text-amber-400",
    },
    {
      href: "/meu-curso",
      title: "Meu curso",
      desc: "Plano, semestre e cadeiras",
      icon: GraduationCap,
      mobileClass:
        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
      desktopClass:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20 dark:hover:bg-slate-800",
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  if (userLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            A carregar...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 md:space-y-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[24px] border border-slate-300 bg-white shadow-md shadow-slate-200/70 dark:border-white/10 dark:bg-slate-950 dark:shadow-none">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,197,94,0.05),transparent_45%)]" />

        {/* MOBILE */}
        <div className="relative p-4 lg:hidden">
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                <Sparkles size={11} />
                Biblioteca Virtual
              </div>
              <h1 className="mt-3 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Olá,{" "}
                <span className="text-indigo-600 dark:text-indigo-400">
                  {userName}
                </span>{" "}
                👋
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Acede rapidamente aos teus conteúdos sem ocupar demasiado ecrã.
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20">
              <Sparkles size={18} />
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`inline-flex min-w-max items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${action.mobileClass}`}
                >
                  <Icon size={13} className={`shrink-0 ${action.iconClass}`} />
                  {action.title}
                </Link>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-400">
            <Flame size={13} className="text-amber-500" />
            <span>{totalRecentItems} conteúdos recentes</span>
            <span className="mx-1 h-3 w-px bg-slate-200 dark:bg-white/10" />
            <span>
              {quizAveragePct !== null
                ? `${quizAveragePct}% média nos quizzes`
                : "Sem média ainda"}
            </span>
          </div>
        </div>

        {/* DESKTOP */}
        <div className="relative hidden gap-6 p-4 lg:grid xl:grid-cols-[1.2fr_0.8fr] xl:p-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Sparkles size={12} />
              Biblioteca Virtual
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">
                Olá, {userName} 👋
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-400">
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
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
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
                  color: "text-blue-600 dark:text-blue-300",
                  bg: "bg-blue-50 dark:bg-blue-500/10",
                },
                {
                  label: "Áudios",
                  value: `${historicoAudios.length}`,
                  icon: Headphones,
                  color: "text-cyan-600 dark:text-cyan-300",
                  bg: "bg-cyan-50 dark:bg-cyan-500/10",
                },
                {
                  label: "Slides",
                  value: `${historicoSlides.length}`,
                  icon: BookOpen,
                  color: "text-violet-600 dark:text-violet-300",
                  bg: "bg-violet-50 dark:bg-violet-500/10",
                },
                {
                  label: "Média quizzes",
                  value: quizAveragePct !== null ? `${quizAveragePct}%` : "—",
                  icon: Trophy,
                  color:
                    quizAveragePct !== null && quizAveragePct >= 50
                      ? "text-emerald-600 dark:text-emerald-300"
                      : "text-amber-600 dark:text-amber-300",
                  bg:
                    quizAveragePct !== null && quizAveragePct >= 50
                      ? "bg-emerald-50 dark:bg-emerald-500/10"
                      : "bg-amber-50 dark:bg-amber-500/10",
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/60 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none sm:p-4"
                >
                  <div
                    className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}
                  >
                    <Icon size={16} className={color} />
                  </div>
                  <p className={`text-center text-lg font-black tabular-nums ${color}`}>
                    {value}
                  </p>
                  <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-500">
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
                    className={`group rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${action.desktopClass}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 dark:bg-white/[0.04]">
                          <Icon size={18} className={action.iconClass} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {action.title}
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-400">
                            {action.desc}
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className="mt-1 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-white"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* PAINEL DIREITO */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/60 dark:shadow-none sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-500">
                  Resumo do momento
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  O teu progresso
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
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

      {/* RESUMO MOBILE */}
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

          <section className="hidden rounded-[24px] border border-amber-200 bg-amber-50 p-4 shadow-sm shadow-amber-100/60 sm:block sm:p-5 dark:border-amber-500/20 dark:bg-amber-500/5 dark:shadow-none">
            <ProfileBannerBody />
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

        <section className="hidden rounded-[24px] border border-violet-200 bg-white p-4 shadow-sm shadow-violet-100/60 backdrop-blur-sm sm:block sm:p-5 dark:border-violet-500/20 dark:bg-slate-900/80 dark:shadow-none">
          <TutorBannerBody />
        </section>
      </>

      {/* ===================== CARROSSEIS ===================== */}

      {/* ÁUDIOS */}
      <SectionCarousel title="Continuar a ouvir">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm font-medium text-slate-600">
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
              thumbnail={item.thumbnail ?? DEFAULT_THUMBNAIL}
              progress={item.progress}
              onClick={() => {
                if (!item.fileUrl) {
                  console.warn("Áudio sem URL:", item.contentId);
                  return;
                }
                play({
                  id: item.contentId,
                  title: item.tema,
                  url: item.fileUrl,           // ✅ campo correto do AudioTrack
                  discipline: item.disciplina,
                  coverUrl: item.thumbnail ?? DEFAULT_THUMBNAIL, // ✅ campo correto
                });
              }}
            />
          ))
        ) : (
          <p className="py-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            Nenhum áudio no histórico.
          </p>
        )}
      </SectionCarousel>

      {/* SLIDES */}
      <SectionCarousel title="Slides lidos recentemente">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm font-medium text-slate-600">
            <Loader2 size={16} className="animate-spin" />
            A carregar slides...
          </div>
        ) : historicoSlides.length > 0 ? (
          historicoSlides.map((item) => (
            <SlideCard
              key={item.id}
              id={item.contentId}
              disciplinaId={item.disciplinaId}
              disciplina={item.disciplina}
              tituloSlide={item.tituloSlide}
              ultimaVisualizacao={item.ultimaVisualizacao}
              thumbnail={item.thumbnail ?? DEFAULT_THUMBNAIL}
              progress={item.progress}
            />
          ))
        ) : (
          <p className="py-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            Ainda não leste nenhum slide.
          </p>
        )}
      </SectionCarousel>

      {/* QUIZZES */}
      <SectionCarousel title="Questionários em andamento">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm font-medium text-slate-600">
            <Loader2 size={16} className="animate-spin" />
            A carregar questionários...
          </div>
        ) : historicoQuizzes.length > 0 ? (
          historicoQuizzes.map((item) => (
            <QuizCard
              key={item.id}
              id={item.contentId}
              disciplina={item.disciplina}
              tituloQuiz={item.tituloQuiz}
              pontuacao={item.pontuacao}
              acertos={item.pontuacao}
              totalPerguntas={item.totalPerguntas}
              dataConclusao={item.dataConclusao}
              thumbnail={item.thumbnail ?? DEFAULT_THUMBNAIL}
              onClick={() =>
  router.push(`/disciplinas/${item.disciplinaId}?openQuiz=${item.contentId}`) // ✅
}
            />
          ))
        ) : (
          <p className="py-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            Ainda não fizeste nenhum questionário.
          </p>
        )}
      </SectionCarousel>
    </div>
  );
}