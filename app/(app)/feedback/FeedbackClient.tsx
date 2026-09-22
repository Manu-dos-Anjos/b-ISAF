"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser } from "@/app/lib/context/UserContext";

const MAX_MESSAGE_LENGTH = 2000;

export default function FeedbackClient() {
  const { supabase } = useSupabase();
  const { profile, isLoading: profileLoading } = useUser();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setIsSending(true);
    setError(null);

    const { error: insertError } = await supabase.from("user_feedback").insert({
      student_id: profile.id,
      message: trimmedMessage,
    });

    setIsSending(false);

    if (insertError) {
      setError("Não foi possível enviar o feedback. Tenta novamente dentro de instantes.");
      return;
    }

    setMessage("");
    setSent(true);
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
          Conta-nos o que achas da plataforma e o que deveríamos melhorar.
        </p>

        {sent ? (
          <div className="mt-6 md:mt-5 rounded-2xl md:rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="flex items-center gap-2 md:gap-1.5 text-sm md:text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={18} className="md:h-4 md:w-4" />
              Feedback enviado. Obrigado por ajudar a melhorar a plataforma.
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