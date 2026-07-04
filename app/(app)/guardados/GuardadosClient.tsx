"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Search,
  Filter,
  BookOpen,
  Headphones,
  FileText,
  Trophy,
  PlayCircle,
  ChevronRight,
  ChevronDown,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { Profile } from "@/src/types/database";
import { removeSavedItem, type SavedItem } from "@/app/actions/saved";

type Discipline = { id: string; name: string };

type Props = {
  profile: Profile;
  savedItems: SavedItem[];
  disciplines: Discipline[];
};

const SCROLLBAR_X = [
  "scrollbar-thin",
  "scrollbar-track-transparent",
  "[&::-webkit-scrollbar]:h-1",
  "[&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-slate-700/40",
  "hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/60",
].join(" ");

const CONTENT_META: Record<
  SavedItem["type"],
  { icon: typeof Headphones; label: string; colorClasses: string }
> = {
  audio: {
    icon: Headphones,
    label: "Áudio",
    colorClasses: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  },
  slide: {
    icon: FileText,
    label: "Slide",
    colorClasses: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  quiz: {
    icon: Trophy,
    label: "Quiz",
    colorClasses: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  interactive: {
    icon: PlayCircle,
    label: "Interativo",
    colorClasses: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  },
};

export default function GuardadosClient({
  profile,
  savedItems: initialItems,
  disciplines,
}: Props) {
  const router = useRouter();

  const [items, setItems]               = useState<SavedItem[]>(initialItems);
  const [search, setSearch]             = useState("");
  const [filterDisc, setFilterDisc]     = useState<string>("all");
  const [filterType, setFilterType]     = useState<string>("all");
  const [removingId, setRemovingId]     = useState<string | null>(null);
  const [expandedDisc, setExpandedDisc] = useState<Record<string, boolean>>({});

  const firstName = profile.full_name?.trim().split(/\s+/)[0] ?? "Aluno";

  const handleRemove = useCallback(async (savedId: string) => {
    setRemovingId(savedId);
    await removeSavedItem(savedId);
    setItems((prev) => prev.filter((i) => i.savedId !== savedId));
    setRemovingId(null);
  }, []);

  const isDiscOpen = (discId: string, index: number) =>
    expandedDisc[discId] ?? index === 0;

  const toggleDisc = (id: string, index: number) =>
    setExpandedDisc((prev) => ({ ...prev, [id]: !isDiscOpen(id, index) }));

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = search.trim().toLowerCase();
      if (
        term &&
        !item.title.toLowerCase().includes(term) &&
        !item.chapterTitle.toLowerCase().includes(term)
      )
        return false;
      if (filterDisc !== "all" && item.disciplineId !== filterDisc) return false;
      if (filterType !== "all" && item.type !== filterType) return false;
      return true;
    });
  }, [items, search, filterDisc, filterType]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { discipline: Discipline; chapters: Map<string, SavedItem[]> }
    >();
    for (const item of filteredItems) {
      if (!map.has(item.disciplineId)) {
        map.set(item.disciplineId, {
          discipline: { id: item.disciplineId, name: item.disciplineName },
          chapters: new Map(),
        });
      }
      const group = map.get(item.disciplineId)!;
      const ch    = item.chapterTitle?.trim() || "Sem capítulo";
      if (!group.chapters.has(ch)) group.chapters.set(ch, []);
      group.chapters.get(ch)!.push(item);
    }
    return Array.from(map.values());
  }, [filteredItems]);

  const disciplinesWithItems = useMemo(() => {
    const ids = new Set(items.map((i) => i.disciplineId));
    return disciplines.filter((d) => ids.has(d.id));
  }, [disciplines, items]);

  const typeCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
    return counts;
  }, [items]);

  const typeOptions = [
    { key: "all",         label: "Todos"       },
    { key: "audio",       label: "Áudios"      },
    { key: "slide",       label: "Slides"      },
    { key: "quiz",        label: "Quizzes"     },
    { key: "interactive", label: "Interativos" },
  ];

  return (
    <div className="pb-24">

      {/* ══════════════════════════════════════════
          HERO
          — sem px próprio: o AppShell já fornece
            px-4 md:px-4 lg:px-6
      ══════════════════════════════════════════ */}
      <section>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-5 md:p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-slate-950/80 to-slate-950" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.18),transparent_45%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,197,94,0.08),transparent_50%)]" />

          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* esquerda */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-300">
                <Bookmark size={12} />
                Guardados
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  Os teus guardados,{" "}
                  <span className="text-indigo-300">{firstName}</span>
                </h1>
                <p className="mt-1 max-w-lg text-sm text-slate-400">
                  Acede rapidamente aos áudios, slides e quizzes que guardaste
                  para rever mais tarde. Tudo organizado por disciplina e capítulo.
                </p>
              </div>
            </div>

            {/* direita — stat cards */}
            <div className="flex shrink-0 flex-wrap gap-2">
              {[
                { label: "Total",       value: items.length,                  color: "text-white"       },
                { label: "Disciplinas", value: disciplinesWithItems.length,   color: "text-indigo-300"  },
                { label: "Áudios",      value: typeCount["audio"]     ?? 0,   color: "text-blue-300"    },
                { label: "Slides",      value: typeCount["slide"]     ?? 0,   color: "text-emerald-300" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center backdrop-blur-sm"
                >
                  <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FILTROS STICKY
          — sticky usa posição fixa, não herda px
            do AppShell, por isso mantemos px aqui
            mas igual ao valor do AppShell
      ══════════════════════════════════════════ */}
      <section className="sticky top-0 z-20 border-b border-white/10 bg-[#050816]/95 py-3 backdrop-blur-xl">
        <div className="space-y-3">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar guardados..."
              className="min-h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>

          <div className={`flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible ${SCROLLBAR_X}`}>
            <span className="mr-1 hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 sm:inline-flex">
              <Filter size={12} />
              Filtrar
            </span>

            {typeOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  filterType === key
                    ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}

            <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

            <button
              onClick={() => setFilterDisc("all")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                filterDisc === "all"
                  ? "border-blue-500/30 bg-blue-500/15 text-blue-200"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
              }`}
            >
              Todas as disciplinas
            </button>

            {disciplinesWithItems.map((d) => (
              <button
                key={d.id}
                onClick={() => setFilterDisc(d.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  filterDisc === d.id
                    ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CONTEÚDO
      ══════════════════════════════════════════ */}
      <section className="py-6">
        {grouped.length === 0 ? (
          <div className="flex min-h-[38vh] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center sm:min-h-[42vh] sm:p-10">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04]">
              <Bookmark size={28} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Nenhum item guardado</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {items.length === 0
                ? "Ainda não guardaste nenhum conteúdo. Usa o ícone de marcador nas disciplinas para guardar áudios, slides e quizzes."
                : "Nenhum item corresponde aos filtros selecionados."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group, index) => {
              const discId     = group.discipline.id;
              const isOpen     = isDiscOpen(discId, index);
              const totalItems = Array.from(group.chapters.values()).flat().length;

              return (
                <div
                  key={discId}
                  className={`overflow-hidden rounded-2xl border transition-all ${
                    isOpen
                      ? "border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                      : "border-white/10"
                  }`}
                >
                  {/* cabeçalho acordeão */}
                  <button
                    onClick={() => toggleDisc(discId, index)}
                    className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition ${
                      isOpen
                        ? "bg-indigo-950/60 hover:bg-indigo-950/70"
                        : "bg-slate-950/40 hover:bg-slate-950/50"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                          isOpen ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400"
                        }`}
                      >
                        <BookOpen size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate font-semibold ${isOpen ? "text-white" : "text-slate-300"}`}>
                          {group.discipline.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {totalItems} {totalItems === 1 ? "item guardado" : "itens guardados"}
                        </p>
                      </div>
                    </div>

                    {isOpen
                      ? <ChevronDown size={16} className="shrink-0 text-slate-400" />
                      : <ChevronRight size={16} className="shrink-0 text-slate-400" />
                    }
                  </button>

                  {/* corpo */}
                  {isOpen && (
                    <div className="divide-y divide-white/5 bg-slate-950/30">
                      {Array.from(group.chapters.entries()).map(([chTitle, chItems]) => (
                        <div key={chTitle} className="p-4">
                          <div className="mb-3 flex items-center gap-2 border-b border-white/5 pb-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              {chTitle}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            {chItems.map((item) => {
                              const meta = CONTENT_META[item.type];
                              const Icon = meta.icon;
                              return (
                                <div
                                  key={item.savedId}
                                  className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition hover:bg-white/5"
                                >
                                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.colorClasses}`}>
                                    <Icon size={13} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm leading-snug text-slate-300">
                                      {item.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">{meta.label}</p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <button
                                      onClick={() => router.push(`/disciplinas/${item.disciplineId}`)}
                                      title="Abrir disciplina"
                                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                                    >
                                      <ExternalLink size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleRemove(item.savedId)}
                                      disabled={removingId === item.savedId}
                                      title="Remover dos guardados"
                                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                                    >
                                      {removingId === item.savedId
                                        ? <Loader2 size={13} className="animate-spin" />
                                        : <Trash2 size={13} />
                                      }
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}