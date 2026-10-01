// app/(app)/admin/utilizadores/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users, Loader2, ShieldAlert, Search, Pencil, UserCheck, UserX, X, Check,
  CalendarClock, CheckSquare, Square, AlertCircle,
} from "lucide-react";
import { useAdmin } from "@/app/lib/hooks/useAdmin";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  student_number: string | null;
  role: string;
  current_year: number;
  current_semester: number;
  is_active: boolean;
  bio: string | null;
  created_at: string;
};

const ROLES = ["student", "professor", "admin", "superadmin"] as const;

const ROLE_META: Record<string, { label: string; badge: string }> = {
  student:    { label: "Estudante",   badge: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300" },
  professor:  { label: "Professor",   badge: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300" },
  admin:      { label: "Admin",       badge: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" },
  superadmin: { label: "Super Admin", badge: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300" },
};

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-white";
const labelCls =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

/* ── Regra de transição: avança semestre (e ano se for 2º sem) ── */
function advance(row: ProfileRow): { year: number; semester: 1 | 2 } {
  if (row.current_semester === 2) {
    return { year: row.current_year + 1, semester: 1 };
  }
  return { year: row.current_year, semester: 2 };
}

export default function AdminUtilizadoresPage() {
  const { isAdmin, isSuperAdmin, loading: adminLoading } = useAdmin();
  const { supabase, user: me } = useSupabase();

  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [draft, setDraft] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── Seleção múltipla ── */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ ok: number; fail: string[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, student_number, role, current_year, current_semester, is_active, bio, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data as ProfileRow[]) ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os utilizadores.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!isAdmin) return;
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isAdmin, load]);

  /* ── Guardar edição individual ── */
  const save = async () => {
    if (!draft || !editing) return;
    if (!isSuperAdmin && (draft.role !== editing.role || ["admin", "superadmin"].includes(editing.role))) {
      setNotice({ type: "error", text: "Só um Super Admin pode gerir contas administrativas ou alterar permissões." });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: draft.full_name.trim(),
        email: draft.email.trim(),
        student_number: draft.student_number?.trim() || null,
        role: draft.role,
        current_year: draft.current_year,
        current_semester: draft.current_semester,
        is_active: draft.is_active,
        bio: draft.bio?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id);
    if (error) {
      setNotice({ type: "error", text: error.message });
      setSaving(false);
      return;
    }
    setRows((previous) => previous.map((row) => row.id === draft.id ? draft : row));
    setNotice({ type: "success", text: `Perfil de ${draft.full_name} atualizado.` });
    setSaving(false);
    setEditing(null);
    setDraft(null);
  };

  /* ── Suspender / reactivar rápido ── */
  const toggleActive = async (row: ProfileRow) => {
    if (isSelf(row.id) || (!isSuperAdmin && ["admin", "superadmin"].includes(row.role))) return;
    setBusyId(row.id);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setBusyId(null);
    if (error) setNotice({ type: "error", text: error.message });
    else {
      setRows((previous) => previous.map((item) => item.id === row.id ? { ...item, is_active: !row.is_active } : item));
      setNotice({ type: "success", text: `${row.full_name} ${row.is_active ? "suspenso" : "reactivado"}.` });
    }
  };

  const openEdit = (row: ProfileRow) => {
    setEditing(row);
    setDraft({ ...row });
  };

  /* ── BULK: avançar semestre ── */
  const bulkAdvanceSemester = async () => {
    if (selected.size === 0) return;

    const targets = rows.filter((r) => selected.has(r.id) && r.role === "student");
    if (targets.length === 0) {
      alert("Só estudantes podem ser avançados. Remove os admins/professores da seleção.");
      return;
    }

    if (
      !confirm(
        `Avançar ${targets.length} estudante${targets.length !== 1 ? "s" : ""} para o próximo semestre?\n\n` +
          "Quem está no 2º semestre passa para o 1º semestre do ano seguinte."
      )
    )
      return;

    setBulkUpdating(true);
    setBulkResult(null);

    const results = await Promise.all(
      targets.map(async (r) => {
        const next = advance(r);
        const { error } = await supabase
          .from("profiles")
          .update({
            current_year: next.year,
            current_semester: next.semester,
            updated_at: new Date().toISOString(),
          })
          .eq("id", r.id);
        return { id: r.id, name: r.full_name, error };
      })
    );

    const ok = results.filter((r) => !r.error).length;
    const fail = results.filter((r) => r.error).map((r) => `${r.name}: ${r.error?.message ?? "erro"}`);

    setBulkResult({ ok, fail });
    setBulkUpdating(false);
    setSelected(new Set());
    void load();
  };

  /* ── Seleção ── */
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    setBulkResult(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (roleFilter === "all" ? true : r.role === roleFilter))
      .filter((r) => statusFilter === "all" || r.is_active === (statusFilter === "active"))
      .filter(
        (r) =>
          !q ||
          r.full_name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.student_number ?? "").toLowerCase().includes(q)
      );
  }, [rows, query, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const by = (role: string) => rows.filter((r) => r.role === role).length;
    return {
      total: rows.length,
      students: by("student"),
      professors: by("professor"),
      admins: by("admin") + by("superadmin"),
      suspended: rows.filter((r) => !r.is_active).length,
    };
  }, [rows]);

  const isSelf = (id: string) => id === me?.id;
  const isPrivileged = (role: string) => role === "admin" || role === "superadmin";
  const canManageRow = (row: ProfileRow) => isSuperAdmin || isSelf(row.id) || !isPrivileged(row.role);

  /* ── Estudantes seleccionáveis (não-admins, não-próprio) ── */
  const selectableIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of filtered) {
      if (r.role === "student" && r.id !== me?.id) set.add(r.id);
    }
    return set;
  }, [filtered, me?.id]);

  const allSelectableSelected =
    selectableIds.size > 0 && Array.from(selectableIds).every((id) => selected.has(id));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of selectableIds) next.delete(id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of selectableIds) next.add(id);
        return next;
      });
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
      {/* ── Cabeçalho + stats ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
            <Users size={18} className="text-indigo-500 dark:text-indigo-400" /> Utilizadores
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.total} contas · {stats.students} estudantes · {stats.professors} professores ·{" "}
            {stats.admins} admins · {stats.suspended} suspensos
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome, email ou nº…"
            className={inputCls + " pl-9"}
          />
        </div>
      </div>

      {notice && (
        <div role="status" className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"}`}>
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

      {/* ── Filtro por role ── */}
      <div className="flex flex-wrap gap-1.5">
        {["all", ...ROLES].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
              roleFilter === r
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-200"
                : "border-slate-300 bg-white text-slate-500 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {r === "all" ? "Todos" : ROLE_META[r].label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Estado</span>
        {([
          { key: "all", label: `Todos (${stats.total})` },
          { key: "active", label: `Ativos (${stats.total - stats.suspended})` },
          { key: "suspended", label: `Suspensos (${stats.suspended})` },
        ] as const).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setStatusFilter(item.key)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${statusFilter === item.key ? "border-slate-400 bg-slate-100 text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-white" : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400 dark:hover:text-white"}`}
          >
            {item.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-400">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Toolbar de seleção (visível quando há algo seleccionado) ── */}
      {selected.size > 0 && (
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:shadow-none">
          <div className="flex items-center gap-2 text-xs">
            <CheckSquare size={14} className="text-indigo-600 dark:text-indigo-300" />
            <span className="font-semibold text-slate-900 dark:text-white">
              {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="mx-1 h-4 w-px bg-indigo-200 dark:bg-indigo-500/30" />
          <button
            type="button"
            onClick={() => void bulkAdvanceSemester()}
            disabled={bulkUpdating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {bulkUpdating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <CalendarClock size={13} />
            )}
            Avançar semestre
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={bulkUpdating}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <X size={12} /> Limpar
          </button>
          {bulkResult && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              {bulkResult.ok > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <Check size={11} /> {bulkResult.ok} atualizado{bulkResult.ok !== 1 ? "s" : ""}
                </span>
              )}
              {bulkResult.fail.length > 0 && (
                <span
                  className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                  title={bulkResult.fail.join("\n")}
                >
                  <AlertCircle size={11} /> {bulkResult.fail.length} falha{bulkResult.fail.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Lista ── */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> A carregar utilizadores…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40">
          {/* Header com checkbox "seleccionar todos" */}
          {selectableIds.size > 0 && (
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 dark:border-white/5 dark:bg-white/[0.02]">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-[11px] font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                {allSelectableSelected ? (
                  <CheckSquare size={14} className="text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Square size={14} className="text-slate-400" />
                )}
                Selecionar todos os estudantes visíveis
              </button>
            </div>
          )}

          {filtered.map((r, i) => {
            const canSelect = r.role === "student" && !isSelf(r.id);
            const canToggleActive = !isSelf(r.id) && (isSuperAdmin || !isPrivileged(r.role));
            const isSelected = selected.has(r.id);
            return (
              <div
                key={r.id}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap ${
                  i > 0 ? "border-t border-slate-100 dark:border-white/5" : ""
                } ${!r.is_active ? "opacity-60" : ""} ${
                  isSelected ? "bg-indigo-50/50 dark:bg-indigo-500/[0.06]" : ""
                }`}
              >
                {canSelect ? (
                  <button
                    type="button"
                    onClick={() => toggleSelect(r.id)}
                    aria-label={isSelected ? "Desmarcar" : "Selecionar"}
                    className="shrink-0 text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                ) : (
                  <div className="w-4 shrink-0" />
                )}

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-600/15 dark:text-indigo-300">
                  {initials(r.full_name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {r.full_name}
                    {isSelf(r.id) && (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:bg-white/10 dark:text-slate-400">
                        tu
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {r.email}
                    {r.student_number ? ` · Nº ${r.student_number}` : ""}
                    {r.role === "student" ? ` · ${r.current_year}º ano / ${r.current_semester}º sem` : ""}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    ROLE_META[r.role]?.badge ?? ROLE_META.student.badge
                  }`}
                >
                  {ROLE_META[r.role]?.label ?? r.role}
                </span>

                {!r.is_active && (
                  <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                    Suspenso
                  </span>
                )}

                <div className="flex shrink-0 items-center gap-1">
                  {canManageRow(r) && <button
                    type="button"
                    onClick={() => openEdit(r)}
                    title="Editar perfil"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <Pencil size={14} />
                  </button>}
                  {canToggleActive && (
                    <button
                      type="button"
                      onClick={() => void toggleActive(r)}
                      disabled={busyId === r.id}
                      title={r.is_active ? "Suspender conta" : "Reactivar conta"}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/15"
                    >
                      {busyId === r.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : r.is_active ? (
                        <UserX size={14} />
                      ) : (
                        <UserCheck size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-10 text-center text-xs text-slate-500">Nenhum utilizador encontrado.</p>
          )}
        </div>
      )}

      {/* ── Modal de edição ── */}
      {editing && draft && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Editar: {editing.full_name}</p>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDraft(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {isSelf(draft.id) && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  Este é o teu próprio perfil: papel e estado ficam bloqueados para evitares bloqueares-te a ti próprio.
                </p>
              )}

              <div>
                <label className={labelCls}>Nome completo</label>
                <input
                  value={draft.full_name}
                  onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Email (apresentação)</label>
                <input
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  className={inputCls}
                />
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  O email de login altera-se em Supabase → Authentication → Users.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nº de estudante</label>
                  <input
                    value={draft.student_number ?? ""}
                    onChange={(e) => setDraft({ ...draft, student_number: e.target.value })}
                    placeholder="Opcional"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Papel</label>
                  <select
                    value={draft.role}
                    disabled={isSelf(draft.id) || !isSuperAdmin}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                    className={inputCls + " disabled:opacity-50"}
                  >
                    {(isSuperAdmin ? ROLES : [draft.role as typeof ROLES[number]]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_META[r].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ano</label>
                  <select
                    value={draft.current_year}
                    onChange={(e) => setDraft({ ...draft, current_year: Number(e.target.value) })}
                    className={inputCls}
                  >
                    {[1, 2, 3, 4, 5, 6].map((y) => (
                      <option key={y} value={y}>
                        {y}º
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Semestre</label>
                  <select
                    value={draft.current_semester}
                    onChange={(e) => setDraft({ ...draft, current_semester: Number(e.target.value) as 1 | 2 })}
                    className={inputCls}
                  >
                    {[1, 2].map((s) => (
                      <option key={s} value={s}>
                        {s}º
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Bio</label>
                <textarea
                  value={draft.bio ?? ""}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  rows={3}
                  className={inputCls + " resize-y"}
                />
              </div>

              <label
                className={`flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 ${
                  isSelf(draft.id) ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Conta activa (desmarcar = suspender)
              </label>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-slate-200 p-3 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDraft(null);
                }}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || !draft.full_name.trim() || !draft.email.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}