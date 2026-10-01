// app/(app)/admin/disciplinas/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen, ChevronDown, ChevronRight, ExternalLink, Loader2, Plus,
  ShieldAlert, Trash2, FileText, Headphones, Trophy, PlayCircle,
  Pencil, Check, X, ListTree, FileStack, Search, RefreshCw,
} from "lucide-react";
import { useAdmin } from "@/app/lib/hooks/useAdmin";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

type ContentRow = { id: string; type: string; title: string; file_url: string | null };
type TopicRow = { id: string; title: string; contents: ContentRow[] };
type ChapterRow = { id: string; title: string; topics: TopicRow[] };
type DisciplineRow = { id: string; name: string; chapters: ChapterRow[] };

type TargetKind = "discipline" | "chapter" | "topic" | "content";
type EditTarget = { kind: TargetKind; id: string };
type AddTarget  = { kind: TargetKind; id: string | null };

const CONTENT_ICON: Record<string, typeof FileText> = {
  slide: FileText, audio: Headphones, quiz: Trophy,
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-white";

const LEVEL_COLORS = {
  discipline: { bg: "bg-indigo-600", text: "text-white", border: "border-indigo-300 dark:border-indigo-500/40" },
  chapter:    { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-300 dark:border-emerald-500/40" },
  topic:      { bg: "bg-amber-600", text: "text-white", border: "border-amber-300 dark:border-amber-500/40" },
  content:    { bg: "bg-slate-600", text: "text-white", border: "border-slate-300 dark:border-white/10" },
};

export default function AdminDisciplinasPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { supabase } = useSupabase();

  const [tree, setTree] = useState<DisciplineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [openDisc, setOpenDisc] = useState<Set<string>>(new Set());
  const [openChap, setOpenChap] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [editText, setEditText] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const [adding, setAdding] = useState<AddTarget | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [addType, setAddType] = useState<"audio" | "slide" | "quiz">("slide");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("disciplines")
        .select("id, name, chapters(id, title, topics(id, title, contents(id, type, title, file_url)))")
        .order("name");
      if (error) throw error;
      setTree((data as DisciplineRow[]) ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar as disciplinas.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!isAdmin) return;
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isAdmin, load]);

  const visibleTree = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return tree;

    const matches = (value: string) => value.toLocaleLowerCase().includes(term);
    return tree.flatMap((discipline) => {
      if (matches(discipline.name)) return [discipline];

      const chapters = discipline.chapters.flatMap((chapter) => {
        if (matches(chapter.title)) return [chapter];

        const topics = chapter.topics.flatMap((topic) => {
          if (matches(topic.title)) return [topic];
          const contents = topic.contents.filter((content) =>
            matches(`${content.title} ${content.type}`)
          );
          return contents.length ? [{ ...topic, contents }] : [];
        });
        return topics.length ? [{ ...chapter, topics }] : [];
      });

      return chapters.length ? [{ ...discipline, chapters }] : [];
    });
  }, [tree, query]);

  const expandAll = () => {
    setOpenDisc(new Set(tree.map((discipline) => discipline.id)));
    setOpenChap(new Set(tree.flatMap((discipline) => discipline.chapters.map((chapter) => chapter.id))));
  };

  const collapseAll = () => {
    setOpenDisc(new Set());
    setOpenChap(new Set());
  };

  const toggle = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  };

  /* ── CRUD ── */
  const remove = async (
    fn: "admin_delete_discipline" | "admin_delete_chapter" | "admin_delete_topic" | "admin_delete_content",
    id: string, label: string
  ) => {
    if (!confirm(`Apagar "${label}" e tudo o que está dentro? Esta ação é irreversível.`)) return;
    setBusyId(id);
    setNotice(null);
    try {
      const { error } = await supabase.rpc(fn, { p_id: id });
      if (error) throw error;
      setNotice({ type: "success", text: `“${label}” foi removido.` });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível remover este item." });
    } finally {
      setBusyId(null);
    }
  };

 const startAdd = (kind: TargetKind, id: string | null) => {
  setAdding({ kind, id }); setAddTitle(""); setAddType("slide");
};


  const confirmAdd = async () => {
    if (!adding || !addTitle.trim()) return;
    setBusyId(adding.id ?? "new");
    setNotice(null);
    try {
      let error: { message: string } | null = null;
      if (adding.kind === "discipline") {
        ({ error } = await supabase.from("disciplines").insert({ name: addTitle.trim() }));
      } else if (adding.kind === "chapter") {
        ({ error } = await supabase.from("chapters").insert({ discipline_id: adding.id, title: addTitle.trim() }));
      } else if (adding.kind === "topic") {
        ({ error } = await supabase.from("topics").insert({ chapter_id: adding.id, title: addTitle.trim() }));
      } else if (adding.kind === "content") {
        ({ error } = await supabase.from("contents").insert({
          topic_id: adding.id, type: addType, title: addTitle.trim(), file_url: null, is_active: true,
        }));
      }
      if (error) throw error;
      setNotice({ type: "success", text: "Item criado com sucesso." });
      setAdding(null);
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível criar este item." });
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (t: EditTarget, current: string, url?: string | null) => {
  setEditing(t); setEditText(current); setEditUrl(url ?? "");
};

  const confirmEdit = async () => {
    if (!editing || !editText.trim()) return;
    setBusyId(editing.id);
    setNotice(null);
    try {
      let error: { message: string } | null = null;
      if (editing.kind === "discipline") {
        ({ error } = await supabase.from("disciplines").update({ name: editText.trim() }).eq("id", editing.id));
      } else if (editing.kind === "chapter") {
        ({ error } = await supabase.from("chapters").update({ title: editText.trim() }).eq("id", editing.id));
      } else if (editing.kind === "topic") {
        ({ error } = await supabase.from("topics").update({ title: editText.trim() }).eq("id", editing.id));
      } else if (editing.kind === "content") {
        ({ error } = await supabase.from("contents")
          .update({ title: editText.trim(), file_url: editUrl.trim() || null })
          .eq("id", editing.id));
      }
      if (error) throw error;
      setNotice({ type: "success", text: "Item atualizado com sucesso." });
      setEditing(null);
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Não foi possível atualizar este item." });
    } finally {
      setBusyId(null);
    }
  };

  /* ── Linha de adicionar inline ── */
  const addRow = (kind: TargetKind, parentId: string | null, placeholder: string) =>
  adding !== null && adding.kind === kind && adding.id === parentId ? (
      <div className="flex items-center gap-1.5 py-1.5">
        <input autoFocus value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder={placeholder} className={inputCls} />
        {kind === "content" && (
          <select value={addType} onChange={(e) => setAddType(e.target.value as typeof addType)} className={`${inputCls} w-24`}>
            <option value="slide">Slide</option>
            <option value="audio">Áudio</option>
            <option value="quiz">Quiz</option>
          </select>
        )}
        <button onClick={() => void confirmAdd()} disabled={busyId !== null} className="rounded-lg bg-indigo-600 p-1.5 text-white transition hover:bg-indigo-500 disabled:opacity-50">
          <Check size={12} />
        </button>
        <button onClick={() => setAdding(null)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10">
          <X size={12} />
        </button>
      </div>
    ) : (
      <button onClick={() => startAdd(kind, parentId)} className="flex items-center gap-1 py-1.5 text-[11px] font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400">
        <Plus size={11} />
        {kind === "discipline" ? "Nova disciplina" : kind === "chapter" ? "Novo capítulo" : kind === "topic" ? "Novo tema" : "Novo conteúdo"}
      </button>
    );

  /* ── Linha de edição inline ── */
const editRow = (kind: TargetKind, id: string) =>
  editing !== null && editing.kind === kind && editing.id === id ? (
      <div className="flex flex-1 items-center gap-1.5">
        <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} className={inputCls} />
        {kind === "content" && (
          <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL (R2)" className={inputCls} />
        )}
        <button onClick={() => void confirmEdit()} disabled={busyId !== null} className="rounded-lg bg-emerald-600 p-1.5 text-white transition hover:bg-emerald-500 disabled:opacity-50">
          <Check size={12} />
        </button>
        <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10">
          <X size={12} />
        </button>
      </div>
    ) : null;

  /* ── Helpers de contagem ── */
  const countChapters = (disc: DisciplineRow) => disc.chapters.length;
  const countTopics = (disc: DisciplineRow) => disc.chapters.reduce((acc, ch) => acc + ch.topics.length, 0);
  const countContents = (disc: DisciplineRow) =>
    disc.chapters.reduce((acc, ch) => acc + ch.topics.reduce((a, t) => a + t.contents.length, 0), 0);

  if (adminLoading) return <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> A verificar…</div>;
  if (!isAdmin) return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <ShieldAlert size={32} className="text-rose-500" />
      <p className="text-sm font-semibold text-slate-900 dark:text-white">Área restrita</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Cabeçalho ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">Disciplinas & Conteúdos</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Criar, renomear, adicionar filhos e apagar em qualquer nível.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-[220px] flex-1 sm:w-64 sm:flex-none">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar disciplina, capítulo, tema ou conteúdo"
              aria-label="Buscar na árvore de disciplinas"
              className={`${inputCls} w-full py-2 pl-9 pr-3`}
            />
          </div>
          <button type="button" onClick={expandAll} disabled={tree.length === 0} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            Expandir tudo
          </button>
          <button type="button" onClick={collapseAll} disabled={openDisc.size === 0 && openChap.size === 0} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            Recolher
          </button>
          <button type="button" onClick={() => void load()} disabled={loading} title="Atualizar árvore" aria-label="Atualizar árvore" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {notice && (
        <div role={notice.type === "error" ? "alert" : "status"} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"}`}>
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso" className="rounded p-1 opacity-70 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <span>{loadError}</span>
          <button type="button" onClick={() => void load()} className="font-semibold underline">Tentar novamente</button>
        </div>
      )}

      {/* ── Legenda de níveis ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] dark:border-white/10 dark:bg-white/[0.02]">
        <span className="font-semibold text-slate-600 dark:text-slate-400">Níveis:</span>
        {Object.entries(LEVEL_COLORS).map(([key, val]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded ${val.bg}`} />
            <span className="capitalize text-slate-600 dark:text-slate-300">{key}</span>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> A carregar…</div>
      ) : (
        <div className="space-y-3">
          {/* ══════════════════════════════════════════
              SECÇÃO: DISCIPLINAS
          ══════════════════════════════════════════ */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/40">
            <div className="flex items-center justify-between border-b border-slate-200 bg-indigo-50 px-4 py-3 dark:border-white/10 dark:bg-indigo-950/30">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${LEVEL_COLORS.discipline.bg}`}>
                  <BookOpen size={16} className={LEVEL_COLORS.discipline.text} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Disciplinas</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{tree.length} disciplina{tree.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <button
                onClick={() => startAdd("discipline", null)}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-indigo-500"
              >
                <Plus size={12} /> Nova
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {/* Formulário inline para nova disciplina */}
              {adding?.kind === "discipline" && adding.id === null && (
                <div className="border-b border-slate-100 bg-indigo-50/50 px-4 py-3 dark:border-white/5 dark:bg-indigo-950/20">
                  {addRow("discipline", null, "Nome da nova disciplina…")}
                </div>
              )}

              {visibleTree.map((disc) => {
                const discOpen = openDisc.has(disc.id) || query.trim().length > 0;
                return (
                  <div key={disc.id}>
                    {/* Linha da disciplina */}
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button
                        onClick={() => toggle(openDisc, disc.id, setOpenDisc)}
                        className="flex shrink-0 items-center gap-2"
                      >
                        {discOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                        <span className={`flex h-6 w-6 items-center justify-center rounded ${LEVEL_COLORS.discipline.bg}`}>
                          <BookOpen size={12} className={LEVEL_COLORS.discipline.text} />
                        </span>
                      </button>

                      {editRow("discipline", disc.id) ?? (
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{disc.name}</span>
                      )}

                      <div className="flex shrink-0 items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{countChapters(disc)} cap.</span>
                        <span>·</span>
                        <span>{countTopics(disc)} temas</span>
                        <span>·</span>
                        <span>{countContents(disc)} cont.</span>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <Link href={`/disciplinas/${disc.id}`} title="Ver página pública" className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10">
                          <ExternalLink size={12} />
                        </Link>
                        <button onClick={() => startEdit({ kind: "discipline", id: disc.id }, disc.name)} title="Renomear" className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => void remove("admin_delete_discipline", disc.id, disc.name)} disabled={busyId === disc.id} title="Apagar disciplina" className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/15">
                          {busyId === disc.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* ══════════════════════════════════════════
                        SECÇÃO: CAPÍTULOS (dentro da disciplina)
                    ══════════════════════════════════════════ */}
                    {discOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/60 dark:border-white/5 dark:bg-slate-950/30">
                        <div className="px-4 py-2.5 pl-12">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`flex h-5 w-5 items-center justify-center rounded ${LEVEL_COLORS.chapter.bg}`}>
                                <FileStack size={10} className={LEVEL_COLORS.chapter.text} />
                              </span>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Capítulos</p>
                            </div>
                            <button
                              onClick={() => startAdd("chapter", disc.id)}
                              className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 transition hover:text-emerald-500 dark:text-emerald-400"
                            >
                              <Plus size={10} /> Adicionar
                            </button>
                          </div>

                          {/* Formulário inline para novo capítulo */}
                          {adding?.kind === "chapter" && adding.id === disc.id && (
                            <div className="mb-2">
                              {addRow("chapter", disc.id, "Título do novo capítulo…")}
                            </div>
                          )}

                          {disc.chapters.length === 0 && adding?.kind !== "chapter" ? (
                            <p className="py-2 text-[11px] italic text-slate-400">Sem capítulos ainda.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {disc.chapters.map((chap) => {
                                const chapOpen = openChap.has(chap.id) || query.trim().length > 0;
                                return (
                                  <div key={chap.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40">
                                    {/* Linha do capítulo */}
                                    <div className="flex items-center gap-2 px-3 py-2">
                                      <button onClick={() => toggle(openChap, chap.id, setOpenChap)} className="flex shrink-0 items-center gap-1.5">
                                        {chapOpen ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
                                        <span className={`flex h-5 w-5 items-center justify-center rounded ${LEVEL_COLORS.chapter.bg}`}>
                                          <FileStack size={10} className={LEVEL_COLORS.chapter.text} />
                                        </span>
                                      </button>

                                      {editRow("chapter", chap.id) ?? (
                                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-300">{chap.title}</span>
                                      )}

                                      <span className="shrink-0 text-[10px] text-slate-400">{chap.topics.length} temas</span>

                                      <div className="flex shrink-0 items-center gap-0.5">
                                        <button onClick={() => startEdit({ kind: "chapter", id: chap.id }, chap.title)} title="Renomear" className="rounded p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10">
                                          <Pencil size={10} />
                                        </button>
                                        <button onClick={() => void remove("admin_delete_chapter", chap.id, chap.title)} disabled={busyId === chap.id} title="Apagar capítulo" className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/15">
                                          {busyId === chap.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                                        </button>
                                      </div>
                                    </div>

                                    {/* ══════════════════════════════════════════
                                        SECÇÃO: TEMAS (dentro do capítulo)
                                    ══════════════════════════════════════════ */}
                                    {chapOpen && (
                                      <div className="border-t border-slate-100 bg-slate-50/40 px-3 py-2.5 dark:border-white/5 dark:bg-slate-950/20">
                                        <div className="mb-2 flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className={`flex h-4 w-4 items-center justify-center rounded ${LEVEL_COLORS.topic.bg}`}>
                                              <ListTree size={9} className={LEVEL_COLORS.topic.text} />
                                            </span>
                                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Temas</p>
                                          </div>
                                          <button
                                            onClick={() => startAdd("topic", chap.id)}
                                            className="flex items-center gap-1 text-[9px] font-medium text-amber-600 transition hover:text-amber-500 dark:text-amber-400"
                                          >
                                            <Plus size={9} /> Adicionar
                                          </button>
                                        </div>

                                        {/* Formulário inline para novo tema */}
                                        {adding?.kind === "topic" && adding.id === chap.id && (
                                          <div className="mb-2">
                                            {addRow("topic", chap.id, "Título do novo tema…")}
                                          </div>
                                        )}

                                        {chap.topics.length === 0 && adding?.kind !== "topic" ? (
                                          <p className="py-1.5 text-[10px] italic text-slate-400">Sem temas ainda.</p>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {chap.topics.map((topic) => (
                                              <div key={topic.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40">
                                                {/* Linha do tema */}
                                                <div className="flex items-center gap-2 px-2.5 py-2">
                                                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${LEVEL_COLORS.topic.bg}`}>
                                                    <ListTree size={9} className={LEVEL_COLORS.topic.text} />
                                                  </span>

                                                  {editRow("topic", topic.id) ?? (
                                                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">{topic.title}</span>
                                                  )}

                                                  <span className="shrink-0 text-[9px] text-slate-400">{topic.contents.length} cont.</span>

                                                  <div className="flex shrink-0 items-center gap-0.5">
                                                    <button onClick={() => startEdit({ kind: "topic", id: topic.id }, topic.title)} title="Renomear" className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10">
                                                      <Pencil size={9} />
                                                    </button>
                                                    <button onClick={() => void remove("admin_delete_topic", topic.id, topic.title)} disabled={busyId === topic.id} title="Apagar tema" className="rounded p-0.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/15">
                                                      {busyId === topic.id ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />}
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* ══════════════════════════════════════════
                                                    SECÇÃO: CONTEÚDOS (dentro do tema)
                                                ══════════════════════════════════════════ */}
                                                <div className="border-t border-slate-100 bg-slate-50/30 px-2.5 py-2 dark:border-white/5 dark:bg-slate-950/15">
                                                  <div className="mb-1.5 flex items-center justify-between">
                                                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Conteúdos</p>
                                                    <button
                                                      onClick={() => startAdd("content", topic.id)}
                                                      className="flex items-center gap-0.5 text-[8px] font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                                    >
                                                      <Plus size={8} /> Adicionar
                                                    </button>
                                                  </div>

                                                  {/* Formulário inline para novo conteúdo */}
                                                  {adding?.kind === "content" && adding.id === topic.id && (
                                                    <div className="mb-1.5">
                                                      {addRow("content", topic.id, "Título do conteúdo…")}
                                                    </div>
                                                  )}

                                                  {topic.contents.length === 0 && adding?.kind !== "content" ? (
                                                    <p className="py-1 text-[9px] italic text-slate-400">Sem conteúdos.</p>
                                                  ) : (
                                                    <div className="space-y-0.5">
                                                      {topic.contents.map((c) => {
                                                        const Icon = CONTENT_ICON[c.type] ?? PlayCircle;
                                                        return (
                                                          <div key={c.id} className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-slate-950/40">
                                                            <Icon size={10} className="shrink-0 text-slate-400" />

                                                            {editRow("content", c.id) ?? (
                                                              <>
                                                                <span className="min-w-0 flex-1 truncate text-[10px] text-slate-600 dark:text-slate-400">{c.title}</span>
                                                                <span className="shrink-0 rounded bg-slate-200 px-1 py-px text-[8px] font-semibold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">{c.type}</span>
                                                                <div className="flex shrink-0 items-center gap-0.5">
                                                                  <button onClick={() => startEdit({ kind: "content", id: c.id }, c.title, c.file_url)} title="Editar" className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10">
                                                                    <Pencil size={8} />
                                                                  </button>
                                                                  <button onClick={() => void remove("admin_delete_content", c.id, c.title)} disabled={busyId === c.id} title="Apagar" className="rounded p-0.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/15">
                                                                    {busyId === c.id ? <Loader2 size={8} className="animate-spin" /> : <Trash2 size={8} />}
                                                                  </button>
                                                                </div>
                                                              </>
                                                            )}
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {visibleTree.length === 0 && (
                <p className="py-8 text-center text-xs text-slate-500">
                  {query.trim() ? "Nenhum resultado para esta pesquisa." : "Nenhuma disciplina encontrada."}
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}