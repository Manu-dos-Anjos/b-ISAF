// app/(app)/admin/utilizadores/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users, Loader2, ShieldAlert, Search, Pencil, UserCheck, UserX, X, Check,
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

/* Roles EXACTOS do check constraint da tabela */
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

export default function AdminUtilizadoresPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { supabase, user: me } = useSupabase();

  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [draft, setDraft] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, student_number, role, current_year, current_semester, is_active, bio, created_at")
      .order("created_at", { ascending: false });
    setRows((data as ProfileRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  /* ── Guardar edição ── */
  const save = async () => {
    if (!draft) return;
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
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setEditing(null);
    setDraft(null);
    void load();
  };

  /* ── Suspender / reactivar rápido ── */
  const toggleActive = async (row: ProfileRow) => {
    setBusyId(row.id);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setBusyId(null);
    if (error) alert(error.message);
    else void load();
  };

  const openEdit = (row: ProfileRow) => {
    setEditing(row);
    setDraft({ ...row });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (roleFilter === "all" ? true : r.role === roleFilter))
      .filter(
        (r) =>
          !q ||
          r.full_name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.student_number ?? "").toLowerCase().includes(q)
      );
  }, [rows, query, roleFilter]);

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

  if (adminLoading) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <ShieldAlert size={32} className="text-rose-500" />
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Área restrita</p>
      </div>
    );
  }

  const isSelf = (id: string) => id === me?.id;

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

      {/* ── Lista ── */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> A carregar utilizadores…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/40">
          {filtered.map((r, i) => (
            <div
              key={r.id}
              className={`flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap ${i > 0 ? "border-t border-slate-100 dark:border-white/5" : ""} ${!r.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-600/15 dark:text-indigo-300">
                {initials(r.full_name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {r.full_name}
                  {isSelf(r.id) && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:bg-white/10 dark:text-slate-400">tu</span>
                  )}
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {r.email}
                  {r.student_number ? ` · Nº ${r.student_number}` : ""}
                  {r.role === "student" ? ` · ${r.current_year}º ano / ${r.current_semester}º sem` : ""}
                </p>
              </div>

              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${ROLE_META[r.role]?.badge ?? ROLE_META.student.badge}`}>
                {ROLE_META[r.role]?.label ?? r.role}
              </span>

              {!r.is_active && (
                <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  Suspenso
                </span>
              )}

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  title="Editar perfil"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Pencil size={14} />
                </button>
                {!isSelf(r.id) && (
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
          ))}
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
                onClick={() => { setEditing(null); setDraft(null); }}
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
                <input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Email (apresentação)</label>
                <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={inputCls} />
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  O email de login altera-se em Supabase → Authentication → Users.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nº de estudante</label>
                  <input value={draft.student_number ?? ""} onChange={(e) => setDraft({ ...draft, student_number: e.target.value })} placeholder="Opcional" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Papel</label>
                  <select
                    value={draft.role}
                    disabled={isSelf(draft.id)}
                    onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                    className={inputCls + " disabled:opacity-50"}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_META[r].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ano</label>
                  <select value={draft.current_year} onChange={(e) => setDraft({ ...draft, current_year: Number(e.target.value) })} className={inputCls}>
                    {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{y}º</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Semestre</label>
                  <select value={draft.current_semester} onChange={(e) => setDraft({ ...draft, current_semester: Number(e.target.value) })} className={inputCls}>
                    {[1, 2].map((s) => <option key={s} value={s}>{s}º</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Bio</label>
                <textarea value={draft.bio ?? ""} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} rows={3} className={inputCls + " resize-y"} />
              </div>

              <label className={`flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 ${isSelf(draft.id) ? "pointer-events-none opacity-50" : ""}`}>
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
                onClick={() => { setEditing(null); setDraft(null); }}
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