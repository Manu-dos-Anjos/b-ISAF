// app/(app)/admin/feedback/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquare, Loader2, ShieldAlert, Trash2, Search, Inbox,
  Eye, EyeOff, Mail,
} from "lucide-react";
import { useAdmin } from "@/app/lib/hooks/useAdmin";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

type FeedbackRow = {
  id: string;
  student_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

type Filter = "all" | "unread" | "read";

/* ── Helpers ── */
function fmtWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} d`;
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

const initials = (name?: string | null) =>
  (name ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();

export default function AdminFeedbackPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { supabase } = useSupabase();

  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_feedback")
      .select("id, student_id, message, is_read, created_at, profiles(full_name, email)")
      .order("created_at", { ascending: false });
    setRows((data as FeedbackRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const toggleRead = async (row: FeedbackRow) => {
    setBusyId(row.id);
    await supabase.from("user_feedback").update({ is_read: !row.is_read }).eq("id", row.id);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_read: !r.is_read } : r)));
    setBusyId(null);
  };

  const remove = async (row: FeedbackRow) => {
    if (!confirm("Apagar este feedback definitivamente?")) return;
    setBusyId(row.id);
    await supabase.from("user_feedback").delete().eq("id", row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setBusyId(null);
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const unreadCount = useMemo(() => rows.filter((r) => !r.is_read).length, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (filter === "unread" ? !r.is_read : filter === "read" ? r.is_read : true))
      .filter(
        (r) =>
          !q ||
          r.message.toLowerCase().includes(q) ||
          (r.profiles?.full_name ?? "").toLowerCase().includes(q) ||
          (r.profiles?.email ?? "").toLowerCase().includes(q)
      );
  }, [rows, filter, query]);

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
            <MessageSquare size={18} className="text-indigo-500 dark:text-indigo-400" />
            Feedback dos utilizadores
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {rows.length} mensagem{rows.length !== 1 ? "s" : ""} ·{" "}
            <span className={unreadCount > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
              {unreadCount} por ler
            </span>
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome, email ou texto…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5">
        {([
          { key: "all", label: `Todos (${rows.length})` },
          { key: "unread", label: `Por ler (${unreadCount})` },
          { key: "read", label: `Lidos (${rows.length - unreadCount})` },
        ] as { key: Filter; label: string }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition ${
              filter === t.key
                ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> A carregar feedback…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <Inbox size={28} className="text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {rows.length === 0 ? "Ainda não há feedback." : "Nada corresponde ao filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((row) => {
            const open = expanded.has(row.id);
            const name = row.profiles?.full_name ?? "Utilizador removido";
            const email = row.profiles?.email ?? "—";

            return (
              <article
                key={row.id}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm transition dark:bg-slate-950/40 ${
                  row.is_read
                    ? "border-slate-200 dark:border-white/10"
                    : "border-amber-300 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/[0.04]"
                }`}
              >
                <div className="flex items-start gap-3 p-3.5 sm:p-4">
                  {/* Avatar + indicador por ler */}
                  <div className="relative shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-600/15 dark:text-indigo-300">
                      {initials(row.profiles?.full_name)}
                    </div>
                    {!row.is_read && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-950" />
                    )}
                  </div>

                  {/* Corpo */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Mail size={10} /> {email}
                      </span>
                      <span className="ml-auto shrink-0 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                        {fmtWhen(row.created_at)}
                      </span>
                    </div>

                    <p
                      className={`mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300 ${
                        open ? "" : "line-clamp-2"
                      }`}
                    >
                      {row.message}
                    </p>

                    {row.message.length > 140 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.id)}
                        className="mt-1 text-[11px] font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
                      >
                        {open ? "Ver menos" : "Ler tudo"}
                      </button>
                    )}
                  </div>

                  {/* Acções */}
                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void toggleRead(row)}
                      disabled={busyId === row.id}
                      title={row.is_read ? "Marcar como por ler" : "Marcar como lido"}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      {busyId === row.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : row.is_read ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(row)}
                      disabled={busyId === row.id}
                      title="Apagar feedback"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/15"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}