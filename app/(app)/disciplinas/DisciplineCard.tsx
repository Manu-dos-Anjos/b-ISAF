// app/(app)/disciplinas/DisciplineCard.tsx
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Headphones,
  FileText,
  Trophy,
  User,
  Clock,
  MapPin,
  ArrowRight,
  Trash2,
} from "lucide-react";

/* ================================================================
   TIPOS
================================================================ */

export type DisciplineCardData = {
  id:            string;
  title:         string;
  code:          string | null;
  href:          string;
  coverUrl:      string | null;
  progress:      number;
  year:          string;
  semester:      string;
  lessonCount:   number;
  chaptersCount: number;
  contentCounts: { audio: number; slide: number; quiz: number };
};

export type DisciplineScheduleInfo = {
  professor?: string | null;
  nextClass?: {
    day:       string;
    startTime: string;
    endTime:   string;
    room?:     string;
    type:      "Teórica" | "Prática" | "Teórico-Prática";
  } | null;
};

type Props = {
  discipline:    DisciplineCardData;
  scheduleInfo?: DisciplineScheduleInfo | null;
  /** Ex: "Semestre anterior" — mostra um selo discreto sobre a capa */
  badge?:        string;
  /** Se definido, mostra um botão de remover integrado à capa */
  onRemove?:     () => void;
};

/* ================================================================
   CONSTANTES
================================================================ */

const TYPE_DOT: Record<string, string> = {
  "Teórica":         "bg-blue-500",
  "Prática":         "bg-emerald-500",
  "Teórico-Prática": "bg-violet-500",
};

const TYPE_BADGE: Record<string, string> = {
  "Teórica":         "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  "Prática":         "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  "Teórico-Prática": "bg-violet-500/10 text-violet-400 ring-violet-500/20",
};

/* ================================================================
   COMPONENTE PRINCIPAL
================================================================ */

export default function DisciplineCard({ discipline, scheduleInfo, badge, onRemove }: Props) {
  const { contentCounts: counts } = discipline;
  const next       = scheduleInfo?.nextClass;
  const hasContent = counts.audio > 0 || counts.slide > 0 || counts.quiz > 0;

  return (
    <Link
      href={discipline.href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-none dark:hover:border-white/20"
    >
      {/* ══════════════════════════════════════════
    CAPA
══════════════════════════════════════════ */}
<div className="relative aspect-video w-full shrink-0 overflow-hidden bg-slate-100 dark:bg-white/5">
  {discipline.coverUrl ? (
    <Image
      src={discipline.coverUrl}
      alt={`Capa de ${discipline.title}`}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      unoptimized
    />
  ) : (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.35),_transparent_55%)]" />
    </div>
  )}

  {/* Véu suave para dar legibilidade sem escurecer demasiado */}
  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-slate-950/8 to-transparent" />

  {/* ── Badge ano · semestre (topo esquerdo) ── */}
  <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
    <div className="flex items-center gap-1.5 rounded-full bg-slate-950/55 px-2.5 py-1 text-[11px] font-semibold text-white/90 shadow-sm backdrop-blur-sm ring-1 ring-white/10">
      <BookOpen size={11} className="opacity-70" />
      <span>
        {discipline.year} · {discipline.semester}
      </span>
    </div>

    {badge && (
      <span className="rounded-full border border-indigo-500/30 bg-slate-950/55 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-300 backdrop-blur-sm">
        {badge}
      </span>
    )}
  </div>

  {/* ── Progresso circular + remover (topo direito) ── */}
  <div className="absolute right-3 top-3 flex items-center gap-1.5">
    <CircularProgress value={discipline.progress} />

    {onRemove && (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        title="Remover cadeira"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/55 text-slate-300 shadow-sm backdrop-blur-sm ring-1 ring-white/10 transition hover:bg-rose-500/30 hover:text-rose-300"
      >
        <Trash2 size={12} />
      </button>
    )}
  </div>

  {/* ── Título ── */}
  <div className="absolute bottom-3 left-3 right-16">
    <span className="inline-block max-w-full truncate rounded-xl bg-slate-950/55 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm">
      {discipline.title}
    </span>
  </div>
</div>

      {/* ══════════════════════════════════════════
          CORPO
      ══════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col gap-3 p-4">

        {/* Professor */}
        {scheduleInfo?.professor ? (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
              <User size={11} className="text-slate-500 dark:text-slate-400" />
            </div>
            <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
              {scheduleInfo.professor}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5">
              <User size={11} className="text-slate-400 dark:text-slate-600" />
            </div>
            <p className="text-xs italic text-slate-400 dark:text-slate-600">
              Docente não definido
            </p>
          </div>
        )}

        {/* Próxima aula */}
        {next ? (
          <div className={`flex items-start gap-2 rounded-xl px-3 py-2 ring-1 ${TYPE_BADGE[next.type]}`}>
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[next.type]}`} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                Próxima aula · {next.type}
              </p>
              <p className="mt-0.5 text-xs font-medium leading-snug">
                {next.day}, {next.startTime}
                {next.endTime !== next.startTime && (
                  <span className="opacity-70"> – {next.endTime}</span>
                )}
                {next.room && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 opacity-60">
                    <MapPin size={9} />
                    {next.room}
                  </span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
            <Clock size={11} className="shrink-0 text-slate-400" />
            <p className="text-[11px] text-slate-400 dark:text-slate-600">
              Sem aulas agendadas
            </p>
          </div>
        )}

        {/* Separador */}
        <div className="h-px bg-slate-100 dark:bg-white/5" />

        {/* Conteúdos */}
        {hasContent ? (
          <div className="flex items-center gap-2">
            {counts.audio > 0 && (
              <ContentBadge icon={Headphones} count={counts.audio} label="áudio" />
            )}
            {counts.slide > 0 && (
              <ContentBadge icon={FileText} count={counts.slide} label="slide" />
            )}
            {counts.quiz > 0 && (
              <ContentBadge icon={Trophy} count={counts.quiz} label="quiz" />
            )}
            <ArrowRight
              size={13}
              className="ml-auto text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400 dark:text-slate-600">
              {discipline.chaptersCount}{" "}
              {discipline.chaptersCount === 1 ? "capítulo" : "capítulos"} · sem
              conteúdos ainda
            </p>
            <ArrowRight
              size={13}
              className="text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600"
            />
          </div>
        )}

        {/* Barra de progresso */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 dark:text-slate-600">Progresso</p>
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
              {discipline.progress}%
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${discipline.progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ================================================================
   SUB-COMPONENTES
================================================================ */

function ContentBadge({
  icon: Icon,
  count,
  label,
}: {
  icon: React.ElementType;
  count: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
      <Icon size={10} />
      {count} {label}
      {count !== 1 ? "s" : ""}
    </span>
  );
}

function CircularProgress({ value }: { value: number }) {
  const r    = 14;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div className="relative flex h-9 w-9 items-center justify-center">
      <svg className="-rotate-90" width="36" height="36" viewBox="0 0 36 36">
        <circle
          cx="18" cy="18" r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
        />
        <circle
          cx="18" cy="18" r={r}
          fill="none"
          stroke="url(#prog)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
        <defs>
          <linearGradient id="prog" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-[9px] font-bold text-white">
        {value}%
      </span>
    </div>
  );
}