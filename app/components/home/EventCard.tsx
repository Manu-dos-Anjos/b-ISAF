// app/components/home/EventCard.tsx
"use client";

import { Calendar, Clock, MapPin, Star } from "lucide-react";

type EventCardProps = {
  title: string;
  theme?: string | null;
  categoryLabel: string;
  dotClass: string;
  dateLabel: string;
  timeLabel?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  dayNum?: string | null;
  monthShort?: string | null;
  status?: { label: string; className: string } | null;
  onClick: () => void;
};

export default function EventCard({
  title,
  theme,
  categoryLabel,
  dotClass,
  dateLabel,
  timeLabel,
  location,
  imageUrl,
  dayNum,
  monthShort,
  status,
  onClick,
}: EventCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-64 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20"
    >
      {/* Banner */}
      <div className="relative h-24 w-full overflow-hidden bg-slate-100 dark:bg-white/5">
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-100 via-slate-50 to-violet-100 dark:from-indigo-950/40 dark:via-slate-950/60 dark:to-violet-950/30">
            <Calendar size={20} className="text-indigo-300 dark:text-indigo-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />

        {dayNum && (
          <div className="absolute bottom-1.5 left-1.5 flex flex-col items-center rounded-md bg-white/95 px-1.5 py-1 shadow-sm backdrop-blur dark:bg-slate-900/95">
            <span className="text-sm font-bold leading-none tabular-nums text-slate-900 dark:text-white">
              {dayNum}
            </span>
            <span className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {monthShort}
            </span>
          </div>
        )}

        {status && (
          <span
            className={`absolute bottom-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white shadow-sm ${status.className}`}
          >
            {status.label}
          </span>
        )}

        <Star size={12} className="absolute right-1.5 top-1.5 text-amber-400 drop-shadow" fill="currentColor" />
      </div>

      {/* Corpo */}
      <div className="space-y-1 p-2.5">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
          <span className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {categoryLabel}
          </span>
        </div>

        <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-900 dark:text-white">
          {title}
        </p>

        {theme && (
          <p className="line-clamp-1 text-[10px] italic leading-snug text-slate-600 dark:text-slate-400">
            {theme}
          </p>
        )}

        <div className="space-y-0.5 pt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
          <p className="flex items-center gap-1 tabular-nums">
            <Calendar size={10} className="shrink-0" /> {dateLabel}
          </p>
          {timeLabel && (
            <p className="flex items-center gap-1 tabular-nums">
              <Clock size={10} className="shrink-0" /> {timeLabel}
            </p>
          )}
          {location && (
            <p className="flex items-center gap-1">
              <MapPin size={10} className="shrink-0" />
              <span className="truncate">{location}</span>
            </p>
          )}
        </div>
      </div>
    </button>
  );
}