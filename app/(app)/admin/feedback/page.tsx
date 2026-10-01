// app/(app)/admin/feedback/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquare, Loader2, ShieldAlert, Trash2, Search, Inbox,
  Eye, EyeOff, Mail, FileText, ExternalLink, CheckCircle2,
} from "lucide-react";
import { useAdmin } from "@/app/lib/hooks/useAdmin";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

type FeedbackRow = {
  id: string;
  student_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  attachment_path: string | null;
  feedback_type: "platform" | "donation";
  donation_status: "pending" | "confirmed" | null;
  donation_validated_at: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
};

type Filter = "all" | "unread" | "read";
type FeedbackKind = "platform" | "donation";

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
  const [kindFilter, setKindFilter] = useState<FeedbackKind>("platform");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_feedback")
      .select("id, student_id, message, is_read, created_at, attachment_path, feedback_type, donation_status, donation_validated_at, profiles(full_name, email)")
      .order("created_at", { ascending: false });
    setRows((data as FeedbackRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!isAdmin) return;
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isAdmin, load]);

  useEffect(() => {
    if (window.location.hash !== "#doacoes") return;
    const timeoutId = window.setTimeout(() => setKindFilter("donation"), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const toggleRead = async (row: FeedbackRow) => {
    setBusyId(row.id);
    await supabase.from("user_feedback").update({ is_read: !row.is_read }).eq("id", row.id);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_read: !r.is_read } : r)));
    setBusyId(null);
  };

  const remove = async (row: FeedbackRow) => {
    if (!confirm("Apagar este feedback definitivamente?")) return;
    setBusyId(row.id);
    if (row.attachment_path) {
      const { error: receiptError } = await supabase.storage
        .from("donation-receipts")
        .remove([row.attachment_path]);
      if (receiptError) {
        alert(`Não foi possível apagar o recibo: ${receiptError.message}`);
        setBusyId(null);
        return;
      }
    }
    const { error } = await supabase.from("user_feedback").delete().eq("id", row.id);
    if (error) {
      alert(error.message);
      setBusyId(null);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setBusyId(null);
  };

  const openReceipt = async (row: FeedbackRow) => {
    if (!row.attachment_path) return;
    const receiptWindow = window.open("about:blank", "_blank");
    if (!receiptWindow) {
      alert("Permite janelas pop-up para abrir o recibo privado.");
      return;
    }
    receiptWindow.opener = null;
    setReceiptBusyId(row.id);
    const { data, error } = await supabase.storage
      .from("donation-receipts")
      .createSignedUrl(row.attachment_path, 60);
    setReceiptBusyId(null);
    if (error || !data?.signedUrl) {
      receiptWindow.close();
      alert(error?.message ?? "Não foi possível abrir o recibo.");
      return;
    }
    receiptWindow.location.href = data.signedUrl;
  };

  const confirmDonation = async (row: FeedbackRow) => {
    if (row.feedback_type !== "donation" || row.donation_status !== "pending") return;
    if (!confirm("Confirmaste no Multicaixa Express que esta transferência foi recebida? Só confirma depois de verificares o pagamento.")) return;
    setBusyId(row.id);
    const validatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("user_feedback")
      .update({ donation_status: "confirmed", donation_validated_at: validatedAt, is_read: true })
      .eq("id", row.id)
      .eq("donation_status", "pending");
    if (error) {
      alert(`Não foi possível confirmar: ${error.message}`);
      setBusyId(null);
      return;
    }
    setRows((previous) => previous.map((item) => item.id === row.id
      ? { ...item, donation_status: "confirmed", donation_validated_at: validatedAt, is_read: true }
      : item));
    setBusyId(null);
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const unreadCount = useMemo(() => rows.filter((r) => !r.is_read).length, [rows]);
  const platformCount = useMemo(() => rows.filter((row) => row.feedback_type === "platform").length, [rows]);
  const donationCount = useMemo(() => rows.filter((row) => row.feedback_type === "donation").length, [rows]);
  const pendingDonationCount = useMemo(() => rows.filter((row) => row.feedback_type === "donation" && row.donation_status === "pending").length, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => row.feedback_type === kindFilter)
      .filter((r) => (filter === "unread" ? !r.is_read : filter === "read" ? r.is_read : true))
      .filter(
        (r) =>
          !q ||
          r.message.toLowerCase().includes(q) ||
          (r.profiles?.full_name ?? "").toLowerCase().includes(q) ||
          (r.profiles?.email ?? "").toLowerCase().includes(q)
      );
  }, [rows, filter, kindFilter, query]);

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
            Caixa de entrada
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {rows.length} mensagem{rows.length !== 1 ? "s" : ""} ·{" "}
            <span className={unreadCount > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
              {unreadCount} por ler
            </span>
            {kindFilter === "donation" && <> · {pendingDonationCount} por validar</>}
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

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5">
        {([
          { key: "platform", label: `Plataforma (${platformCount})` },
          { key: "donation", label: `Doações (${donationCount})` },
        ] as const).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => { setKindFilter(item.key); setFilter("all"); }}
            className={`rounded-md py-2 text-[11px] font-semibold transition ${kindFilter === item.key ? item.key === "donation" ? "bg-amber-100 text-amber-900 shadow-sm dark:bg-amber-500/15 dark:text-amber-200" : "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
          >
            {item.label}
          </button>
        ))}
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
            {rows.length === 0 ? "Ainda não há mensagens." : kindFilter === "donation" ? "Ainda não há confirmações de doação." : "Ainda não há sugestões da plataforma para este filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((row) => {
            const open = expanded.has(row.id);
            const isDonationConfirmation = row.feedback_type === "donation";
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
                      {isDonationConfirmation && (
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${row.donation_status === "confirmed" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                          {row.donation_status === "confirmed" ? "Pagamento confirmado" : "Doação para validar"}
                        </span>
                      )}
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

                    {row.attachment_path && (
                      <div className="mt-2 space-y-2">
                        <button
                          type="button"
                          onClick={() => void openReceipt(row)}
                          disabled={receiptBusyId === row.id}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                        >
                          {receiptBusyId === row.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                          Abrir comprovativo PDF
                          <ExternalLink size={10} />
                        </button>
                        {isDonationConfirmation && row.donation_status === "pending" && (
                          <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                            No modelo Express, confira operação/transferência, data, montante, destinatário e sucesso da operação. Confirme o pagamento no painel do Express antes de validar aqui.
                          </p>
                        )}
                      </div>
                    )}
                    {isDonationConfirmation && !row.attachment_path && (
                      <p className="mt-2 text-[10px] font-medium text-amber-700 dark:text-amber-300">Sem recibo anexado; conferir manualmente.</p>
                    )}
                    {isDonationConfirmation && row.donation_status === "confirmed" && row.donation_validated_at && (
                      <p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-300">Validado em {new Date(row.donation_validated_at).toLocaleString("pt-PT")}</p>
                    )}

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
                    {isDonationConfirmation && row.donation_status === "pending" && (
                      <button
                        type="button"
                        onClick={() => void confirmDonation(row)}
                        disabled={busyId === row.id}
                        title="Confirmar depois de verificar no Multicaixa Express"
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2 text-[10px] font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {busyId === row.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Confirmar pagamento
                      </button>
                    )}
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