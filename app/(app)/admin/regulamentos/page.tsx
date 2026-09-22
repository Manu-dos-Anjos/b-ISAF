// app/(app)/admin/regulamentos/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ScrollText, Loader2, ShieldAlert, Plus, Download, Save, Trash2, RefreshCw,
} from "lucide-react";
import { useAdmin } from "@/app/lib/hooks/useAdmin";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import {
  ALL_REGULATIONS,
  type RegulationDocument,
  type RegulationCategory,
} from "@/app/components/meu-curso/MeuCursoPage";

type RegRow = RegulationDocument & { is_published: boolean; updated_at: string };

const CATEGORY_LABEL: Record<RegulationCategory, string> = {
  academico: "Regime Académico",
  avaliacao: "Avaliação & Exames",
  disciplinar: "Regime Disciplinar",
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-white";
const labelCls =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";
const monoCls =
  "w-full rounded-lg border border-slate-300 bg-slate-900 px-3 py-2 font-mono text-[11px] leading-relaxed text-emerald-300 outline-none focus:border-indigo-500 dark:border-white/10";

export default function AdminRegulamentosPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { supabase } = useSupabase();

  const [rows, setRows] = useState<RegRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RegulationDocument | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [json, setJson] = useState({ intro: "", chapters: "", closing: "", signature: "" });
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("regulations")
        .select("*")
        .order("title");
      if (error) throw error;
      setRows((data as RegRow[]) ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar regulamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Docs na BD (fonte de verdade para quem tem id na BD) ── */
  const dbById = useMemo(
    () => new Map(rows.map((r) => [r.id, r])),
    [rows]
  );

  /* ── Docs do código que ainda NÃO estão na BD ── */
  const codeOnly = useMemo(
    () => ALL_REGULATIONS.filter((d) => !dbById.has(d.id)),
    [dbById]
  );

  /* ── Todos os docs visíveis (BD + código) ── */
  const allVisible = useMemo(() => {
    const merged = new Map<string, { doc: RegulationDocument; source: "db" | "code"; isPublished?: boolean }>();
    // BD primeiro
    for (const r of rows) {
      merged.set(r.id, { doc: r, source: "db", isPublished: r.is_published });
    }
    // Código só onde não há na BD
    for (const d of codeOnly) {
      merged.set(d.id, { doc: d, source: "code" });
    }
    return Array.from(merged.values()).sort((a, b) =>
      a.doc.title.localeCompare(b.doc.title)
    );
  }, [rows, codeOnly]);

  /* ── Contagens ── */
  const stats = useMemo(() => {
    const byCategory = (c: RegulationCategory) => ({
      db: rows.filter((r) => r.category === c).length,
      code: ALL_REGULATIONS.filter((d) => d.category === c && !dbById.has(d.id)).length,
    });
    return {
      total: rows.length + codeOnly.length,
      inDb: rows.length,
      inCode: codeOnly.length,
      published: rows.filter((r) => r.is_published).length,
      drafts: rows.filter((r) => !r.is_published).length,
      byCategory: {
        academico: byCategory("academico"),
        avaliacao: byCategory("avaliacao"),
        disciplinar: byCategory("disciplinar"),
      },
    };
  }, [rows, codeOnly, dbById]);

  const openDoc = (entry: { doc: RegulationDocument; source: "db" | "code"; isPublished?: boolean }) => {
    setSelectedId(entry.doc.id);
    setDraft({ ...entry.doc });
    setIsPublished(entry.isPublished ?? true);
    setJson({
      intro: JSON.stringify(entry.doc.intro ?? [], null, 2),
      chapters: JSON.stringify(entry.doc.chapters ?? [], null, 2),
      closing: JSON.stringify(entry.doc.closing ?? [], null, 2),
      signature: JSON.stringify(entry.doc.signature ?? [], null, 2),
    });
    setJsonError(null);
    setSaved(false);
  };

  const createNew = () => {
    const newDoc: RegulationDocument = {
      id: `reg-${Date.now()}`,
      category: "academico",
      title: "Novo regulamento",
      chapters: [],
    };
    openDoc({ doc: newDoc, source: "db", isPublished: false });
  };

  const save = async () => {
    if (!draft) return;
    setJsonError(null);
    try {
      const intro = JSON.parse(json.intro || "null");
      const chapters = JSON.parse(json.chapters || "[]");
      const closing = JSON.parse(json.closing || "null");
      const signature = JSON.parse(json.signature || "null");
      if (!Array.isArray(chapters)) throw new Error('"chapters" deve ser um array.');
      setSaving(true);
      const { error } = await supabase.from("regulations").upsert({
        id: draft.id,
        category: draft.category,
        title: draft.title,
        subtitle: draft.subtitle ?? null,
        meta: draft.meta ?? null,
        intro,
        chapters,
        closing,
        signature,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      });
      setSaving(false);
      if (error) {
        alert(error.message);
        return;
      }
      setSaved(true);
      await load();
    } catch (e) {
      setSaving(false);
      setJsonError(e instanceof Error ? e.message : "JSON inválido.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Apagar este regulamento da base de dados? Se existir no código, continuará visível como fallback.")) return;
    const { error } = await supabase.from("regulations").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    if (selectedId === id) {
      setSelectedId(null);
      setDraft(null);
    }
    await load();
  };

  const importFromCode = async (doc: RegulationDocument) => {
    setSaving(true);
    const { error } = await supabase.from("regulations").upsert({
      id: doc.id,
      category: doc.category,
      title: doc.title,
      subtitle: doc.subtitle ?? null,
      meta: doc.meta ?? null,
      intro: doc.intro ?? null,
      chapters: doc.chapters ?? [],
      closing: doc.closing ?? null,
      signature: doc.signature ?? null,
      is_published: true,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    await load();
    // Abre o documento recém-importado
    const fresh = await supabase.from("regulations").select("*").eq("id", doc.id).maybeSingle();
    if (fresh.data) {
      openDoc({ doc: fresh.data as RegRow, source: "db", isPublished: true });
    }
  };

  if (adminLoading) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert size={32} className="text-rose-500" />
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Área restrita</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Cabeçalho ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
            <ScrollText size={18} className="text-indigo-500 dark:text-indigo-400" /> Regulamentos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.total} total · {stats.inDb} na BD ({stats.published} publicados, {stats.drafts} rascunhos) · {stats.inCode} por importar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
          <button
            type="button"
            onClick={createNew}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
          >
            <Plus size={13} /> Novo documento
          </button>
        </div>
      </div>

      {/* ── Stats por categoria ── */}
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(CATEGORY_LABEL) as RegulationCategory[]).map((cat) => (
          <div
            key={cat}
            className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/40"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {CATEGORY_LABEL[cat]}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                {stats.byCategory[cat].db}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">na BD</span>
              {stats.byCategory[cat].code > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  +{stats.byCategory[cat].code} por importar
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Erro de carregamento ── */}
      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <p className="font-semibold">Erro ao carregar regulamentos</p>
          <p className="mt-1 text-xs">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-rose-50 dark:border-rose-500/30 dark:bg-transparent dark:hover:bg-rose-500/10"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Grid: lista + editor ── */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* ═══ Lista ═══ */}
        <div className="space-y-4">
          {/* Na BD */}
          <div>
            <p className={labelCls}>Na base de dados ({rows.length})</p>
            {loading ? (
              <p className="flex items-center gap-2 py-6 text-xs text-slate-500">
                <Loader2 size={13} className="animate-spin" /> A carregar…
              </p>
            ) : rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-[11px] text-slate-500 dark:border-white/10">
                Ainda não há regulamentos na BD.
              </p>
            ) : (
              <div className="space-y-1.5">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                      selectedId === r.id
                        ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-950/40"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-white/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => openDoc({ doc: r, source: "db", isPublished: r.is_published })}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {r.title}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {CATEGORY_LABEL[r.category]} · {r.is_published ? "publicado" : "rascunho"}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(r.id)}
                      title="Apagar da BD"
                      className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* No código (importáveis) */}
          <div>
            <p className={labelCls}>No código (importáveis)</p>
            <div className="space-y-1.5">
              {codeOnly.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">{d.title}</p>
                    <p className="text-[10px] text-slate-500">{CATEGORY_LABEL[d.category]}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void importFromCode(d)}
                    disabled={saving}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  >
                    <Download size={11} /> Importar
                  </button>
                </div>
              ))}
              {codeOnly.length === 0 && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-center text-[11px] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Todos os documentos do código já foram importados.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ═══ Editor ═══ */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/40">
          {!draft ? (
            <p className="py-16 text-center text-xs text-slate-500">
              Selecciona um regulamento à esquerda, importa um do código ou cria um novo.
            </p>
          ) : (
            <>
              {/* Estado do documento */}
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-500 dark:bg-white/[0.02] dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wider">ID:</span>
                <code className="font-mono text-[10px]">{draft.id}</code>
                <span className="ml-auto">
                  {dbById.has(draft.id) ? "📁 Na BD" : "💻 Só no código"}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Título</label>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Categoria</label>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value as RegulationCategory })}
                    className={inputCls}
                  >
                    {(Object.keys(CATEGORY_LABEL) as RegulationCategory[]).map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Subtítulo</label>
                  <input
                    value={draft.subtitle ?? ""}
                    onChange={(e) => setDraft({ ...draft, subtitle: e.target.value || undefined })}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Meta (datas / versão)</label>
                  <input
                    value={draft.meta ?? ""}
                    onChange={(e) => setDraft({ ...draft, meta: e.target.value || undefined })}
                    className={inputCls}
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Publicado (visível para estudantes em Meu Curso → Regulamentos)
              </label>

              <div>
                <label className={labelCls}>Intro (JSON array de blocos)</label>
                <textarea value={json.intro} onChange={(e) => setJson({ ...json, intro: e.target.value })} rows={4} className={monoCls} />
              </div>
              <div>
                <label className={labelCls}>Capítulos (JSON array)</label>
                <textarea value={json.chapters} onChange={(e) => setJson({ ...json, chapters: e.target.value })} rows={14} className={monoCls} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Closing (JSON)</label>
                  <textarea value={json.closing} onChange={(e) => setJson({ ...json, closing: e.target.value })} rows={4} className={monoCls} />
                </div>
                <div>
                  <label className={labelCls}>Assinaturas (JSON)</label>
                  <textarea value={json.signature} onChange={(e) => setJson({ ...json, signature: e.target.value })} rows={4} className={monoCls} />
                </div>
              </div>

              {jsonError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  ⚠️ {jsonError}
                </p>
              )}
              {saved && !jsonError && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  ✅ Guardado com sucesso. Estudantes verão a versão atualizada ao recarregar.
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedId(null); setDraft(null); }}
                  className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  Fechar editor
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || !draft.title.trim()}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}