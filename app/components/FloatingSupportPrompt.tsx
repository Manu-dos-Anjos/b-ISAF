"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Heart, X } from "lucide-react";
import { useUser } from "@/app/lib/context/UserContext";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { OPEN_SUPPORT_PROMPT_EVENT } from "@/app/lib/supportPrompt";
import { shouldShowSupportPrompt } from "@/app/lib/supportPromptSchedule";

const EXPRESS_NUMBER = "928644708";

export default function FloatingSupportPrompt() {
  const { profile, isLoading } = useUser();
  const { supabase } = useSupabase();
  const canOpenPromptRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingDonation, setPendingDonation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const accountCreatedAt = profile?.created_at;

  useEffect(() => {
    if (isLoading || !profile?.id || !accountCreatedAt) return;

    let cancelled = false;
    const refreshDonationStatus = async () => {
      const { data, error } = await supabase
        .from("user_feedback")
        .select("donation_status, donation_validated_at")
        .eq("student_id", profile.id)
        .eq("feedback_type", "donation")
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled || error) return;

      const latestDonation = data?.[0];
      const latestStatus = latestDonation?.donation_status ?? null;
      const isPending = latestStatus === "pending";
      const shouldShow = shouldShowSupportPrompt(
        accountCreatedAt,
        Date.now(),
        latestDonation ? { status: latestStatus, validatedAt: latestDonation.donation_validated_at } : null
      );
      canOpenPromptRef.current = shouldShow;
      setPendingDonation(isPending);
      setVisible(shouldShow);
      if (!shouldShow) setOpen(false);
    };

    const initialTimeout = window.setTimeout(() => void refreshDonationStatus(), 0);
    const refreshInterval = window.setInterval(() => void refreshDonationStatus(), 60_000);
    const channel = supabase
      .channel(`donation-status-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_feedback", filter: `student_id=eq.${profile.id}` }, () => {
        void refreshDonationStatus();
      })
      .subscribe();
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void refreshDonationStatus();
    };
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      cancelled = true;
      window.clearTimeout(initialTimeout);
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      void supabase.removeChannel(channel);
    };
  }, [isLoading, profile?.id, accountCreatedAt, supabase]);

  useEffect(() => {
    const openFromNotification = () => {
      if (!canOpenPromptRef.current) return;
      setVisible(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_SUPPORT_PROMPT_EVENT, openFromNotification);
    return () => window.removeEventListener(OPEN_SUPPORT_PROMPT_EVENT, openFromNotification);
  }, []);

  const dismiss = () => {
    setOpen(false);
  };

  const copyExpressNumber = async () => {
    try {
      await navigator.clipboard.writeText(EXPRESS_NUMBER);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  if (!visible) return null;

  return (
    <aside className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-3 z-[60] flex flex-col items-end gap-2 md:bottom-5 md:right-5">
      {open && (
        <section
          id="platform-support-panel"
          aria-label="Apoio voluntário à plataforma"
          className="w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-rose-200 bg-white p-4 shadow-xl dark:border-rose-500/20 dark:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                <Heart size={16} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Apoie o b-ISAF</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Uma doação voluntária pode ajudar a plataforma a crescer e chegar a mais estudantes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Fechar convite de apoio"
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Transferência manual · Multicaixa Express
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              No Multicaixa Express, transfira o valor que desejar para este número:
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-amber-800 dark:text-amber-300">
              Antes de confirmar, verifica que o número e o destinatário apresentados no Express correspondem. Se divergirem, cancela.
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="select-all text-base font-bold tabular-nums text-slate-900 dark:text-white">
                {EXPRESS_NUMBER}
              </span>
              <button
                type="button"
                onClick={() => void copyExpressNumber()}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copiado" : "Copiar número"}
              </button>
            </div>
            {copyError && <p role="status" className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">Não foi possível copiar. Seleccione o número para o copiar manualmente.</p>}
          </div>
          {pendingDonation ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              Recebemos a tua confirmação. A administração está a verificar o pagamento; não precisas de enviar outra confirmação.
            </p>
          ) : (
            <ol className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              <li><strong>1.</strong> Confirma o número e o nome do destinatário no Express.</li>
              <li><strong>2.</strong> Faz a transferência e aguarda a confirmação no Express.</li>
              <li><strong>3.</strong> Volta ao b-ISAF e escolhe “Já fiz uma doação”.</li>
              <li><strong>4.</strong> Envia o recibo PDF ou informa que não o tens agora; a administração fará a conferência manual.</li>
            </ol>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
            Nunca partilhes PIN, código SMS/OTP, senha ou dados completos do cartão.
          </p>
          {!pendingDonation && (
            <Link
              href="/feedback#doacao"
              onClick={dismiss}
              className="mt-3 flex min-h-9 w-full items-center justify-center rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              Já fiz uma doação
            </Link>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            Fechar
          </button>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="platform-support-panel"
        aria-label={open ? "Fechar apoio à plataforma" : "Apoiar a plataforma"}
        title="Apoiar a plataforma"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-rose-200 bg-white px-4 text-xs font-semibold text-rose-700 shadow-lg transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
      >
        <Heart size={15} />
        <span>Apoiar</span>
      </button>
    </aside>
  );
}
