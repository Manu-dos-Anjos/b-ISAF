"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, MessageSquare, X } from "lucide-react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser } from "@/app/lib/context/UserContext";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

export default function FeedbackClient() {
  const { supabase } = useSupabase();
  const { profile, isLoading: profileLoading } = useUser();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDonationConfirmation, setIsDonationConfirmation] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [noReceipt, setNoReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.location.hash !== "#doacao") return;
    const timeoutId = window.setTimeout(() => {
      setIsDonationConfirmation(true);
      setMessage("Confirmação de doação voluntária\nData aproximada da transferência: \nValor (opcional): ");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();

    if (trimmedMessage.length < 3) {
      setError("Escreve pelo menos uma frase para podermos analisar o teu feedback.");
      return;
    }

    if (!profile?.id) {
      setError("Não foi possível identificar o teu utilizador. Actualiza a página e tenta novamente.");
      return;
    }

    if (isDonationConfirmation && !receipt && !noReceipt) {
      setError("Anexa o recibo PDF ou assinala que não o tens agora.");
      return;
    }

    setIsSending(true);
    setError(null);

    let attachmentPath: string | null = null;
    try {
      if (receipt) {
        const formData = new FormData();
        formData.append("file", receipt);
        const uploadResponse = await fetch("/api/feedback/receipt", { method: "POST", body: formData });
        const uploadResult = await uploadResponse.json().catch(() => ({})) as { path?: string; error?: string };
        if (!uploadResponse.ok || !uploadResult.path) {
          throw new Error(uploadResult.error ?? "Não foi possível enviar o recibo PDF.");
        }
        attachmentPath = uploadResult.path;
      }

      const { error: insertError } = await supabase.from("user_feedback").insert({
        student_id: profile.id,
        message: trimmedMessage,
        attachment_path: attachmentPath,
        feedback_type: isDonationConfirmation ? "donation" : "platform",
        donation_status: isDonationConfirmation ? "pending" : null,
      });
      if (insertError) throw insertError;

      setMessage("");
      setReceipt(null);
      setNoReceipt(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
      setSent(true);
    } catch {
      if (attachmentPath) {
        await fetch("/api/feedback/receipt", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: attachmentPath }),
        });
      }
      setError("Não foi possível enviar a mensagem e o recibo. Tenta novamente dentro de instantes.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl md:max-w-[37.5rem]">
      <div className="rounded-3xl md:rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:p-8 md:p-7">
        <div className="flex h-12 w-12 md:h-11 md:w-11 items-center justify-center rounded-2xl md:rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          <MessageSquare size={23} className="md:h-5 md:w-5" />
        </div>

        <h1 className="mt-5 md:mt-4 text-2xl md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          A tua opinião importa
        </h1>
        <p className="mt-2 md:mt-1.5 text-sm md:text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {isDonationConfirmation
            ? "Confirma a doação voluntária para análise manual da administração."
            : "Partilha sugestões construtivas para melhorar a plataforma."}
        </p>

        {isDonationConfirmation && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            Antes de transferir, confirma no ecrã do Multicaixa Express que o número é <strong>928 644 708</strong> e que o nome do destinatário está correto. Se algum dado divergir, cancela. Depois do pagamento, volta ao b-ISAF e envia esta confirmação; a administração fará a verificação manual. Nunca partilhes PIN ou código OTP.
          </div>
        )}

        {sent ? (
          <div className="mt-6 md:mt-5 rounded-2xl md:rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="flex items-center gap-2 md:gap-1.5 text-sm md:text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={18} className="md:h-4 md:w-4" />
              {isDonationConfirmation
                ? "Confirmação recebida. A administração irá verificar a transferência manualmente; este envio não confirma o pagamento."
                : "Feedback enviado. Obrigado por ajudar a melhorar a plataforma."}
            </div>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-3 md:mt-2.5 text-xs md:text-[11px] font-semibold text-emerald-700 underline underline-offset-2 dark:text-emerald-300"
            >
              Enviar outra mensagem
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 md:mt-5 space-y-4 md:space-y-3.5">
            <label className="block">
              <span className="mb-2 md:mb-1.5 block text-sm md:text-xs font-semibold text-slate-800 dark:text-slate-200">
                Mensagem
              </span>
              <textarea
                required
                minLength={3}
                maxLength={MAX_MESSAGE_LENGTH}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="O que está a funcionar bem? O que deveríamos melhorar?"
                rows={7}
                className="w-full resize-y rounded-2xl md:rounded-xl border border-slate-300 bg-slate-50 px-4 md:px-3.5 py-3 md:py-2.5 text-sm md:text-xs leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
              />
              <span className="mt-1.5 md:mt-1 block text-right text-[11px] md:text-[10px] text-slate-400 dark:text-slate-500">
                {message.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </label>

            {isDonationConfirmation && (
              <div>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  id="donation-receipt"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null;
                    if (selected && (selected.type !== "application/pdf" || selected.size > MAX_RECEIPT_SIZE)) {
                      setReceipt(null);
                      event.target.value = "";
                      setError(selected.type !== "application/pdf" ? "O recibo deve estar em formato PDF." : "O recibo PDF deve ter no máximo 5 MB.");
                      return;
                    }
                    setError(null);
                    setReceipt(selected);
                    setNoReceipt(false);
                  }}
                />
                <label htmlFor="donation-receipt" className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]">
                  <FileText size={15} />
                  {receipt ? "Substituir comprovativo PDF" : "Anexar comprovativo Multicaixa Express (PDF, opcional)"}
                </label>
                {receipt && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-white/10">
                    <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{receipt.name}</span>
                    <button type="button" onClick={() => { setReceipt(null); setNoReceipt(false); if (receiptInputRef.current) receiptInputRef.current.value = ""; }} aria-label="Remover recibo" className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X size={14} /></button>
                  </div>
                )}
                {!receipt && (
                  <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={noReceipt}
                      onChange={(event) => { setNoReceipt(event.target.checked); setError(null); }}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Não tenho o comprovativo PDF agora; envio a confirmação para validação manual.
                  </label>
                )}
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">Usa o comprovativo de transferência do Express, com operação, data, montante e destinatário visíveis. PDF até 5 MB; fica privado e acessível apenas a ti e à administração.</p>
              </div>
            )}

            {error && (
              <p className="text-sm md:text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSending || profileLoading}
              className="flex w-full items-center justify-center gap-2 md:gap-1.5 rounded-2xl md:rounded-xl bg-indigo-600 px-4 md:px-3.5 py-3 md:py-2.5 text-sm md:text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 size={16} className="animate-spin md:h-3.5 md:w-3.5" />
              ) : (
                <MessageSquare size={16} className="md:h-3.5 md:w-3.5" />
              )}
              {isSending ? "A enviar…" : "Enviar feedback"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}