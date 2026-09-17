"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, RotateCw } from "lucide-react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { writeProgressPayload, flushProgressQueue } from "@/app/lib/progressPendingSync";

type Props = {
  url: string;
  className?: string;
  title?: string;
  zoom?: number;
  contentId?: string;
  estimatedDurationSeconds?: number;
};

type ViewMode = "iframe" | "office" | "image" | "empty";

const LOAD_TIMEOUT_MS = 15000;
const SAVE_INTERVAL_MS = 10_000;
const DEFAULT_DURATION_SECONDS = 300;
const COMPLETE_THRESHOLD_PCT = 80;

function resolveViewer(url: string): { src: string; mode: ViewMode } {
  if (!url) return { src: "", mode: "empty" };
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".pdf")) return { src: url, mode: "iframe" };
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(clean)) return { src: url, mode: "image" };
  if (/\.(pptx?|docx?|xlsx?)$/i.test(clean))
    return {
      src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`,
      mode: "office",
    };
  return { src: url, mode: "iframe" };
}

export default function SlideViewer({
  url,
  className,
  title = "Apresentação",
  zoom = 1,
  contentId,
  estimatedDurationSeconds,
}: Props) {
  const { src, mode } = resolveViewer(url);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    mode === "empty" ? "error" : "loading"
  );
  const [attempt, setAttempt] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const { supabase } = useSupabase();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({
      data,
    }: { data: { user: { id: string } | null } | null }) => {
      if (data?.user?.id) {
        setUserId(data.user.id);
      }
    });
  }, [supabase]);

  const durationSeconds = estimatedDurationSeconds ?? DEFAULT_DURATION_SECONDS;
  const savedSecondsRef = useRef(0);
  const sessionSecondsRef = useRef(0);
  const hasLoadedInitialRef = useRef(false);
  const scrollPctRef = useRef<number | null>(null);

  // Carrega progresso anterior
  useEffect(() => {
    if (!contentId || !userId || hasLoadedInitialRef.current) return;
    hasLoadedInitialRef.current = true;

    supabase
      .from("student_progress")
      .select("last_position_seconds")
      .eq("student_id", userId)
      .eq("content_id", contentId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.last_position_seconds) {
          savedSecondsRef.current = data.last_position_seconds;
        }
      })
      .catch((err: unknown) => {
        console.error("Erro ao carregar progresso anterior do slide:", err);
      });
  }, [contentId, userId, supabase]);

  // Listener de mensagens do iframe para capturar scroll %
  useEffect(() => {
    if (!contentId || mode !== "iframe") return;

    const onMessage = (e: MessageEvent) => {
      try {
        if (e.data?.type !== "slide-progress") return;
        const pct = e.data.pct;
        if (typeof pct === "number") {
          scrollPctRef.current = pct;
        }
      } catch (err) {
        console.error("Erro ao processar mensagem de progresso do slide:", err);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [contentId, mode]);

  // Contabiliza tempo apenas quando visivel e carregado
  useEffect(() => {
    if (!contentId || !userId || status !== "ready") return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        sessionSecondsRef.current += 1;
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [contentId, userId, status]);

  // Prioriza scroll %, fallback por tempo. Usa a fila partilhada de
  // retentativas para nunca perder progresso por falha de rede.
  const saveProgress = useCallback(async () => {
    if (!contentId || !userId) return;

    let pct: number;

    if (scrollPctRef.current !== null) {
      pct = scrollPctRef.current;
    } else {
      const totalSeconds = savedSecondsRef.current + sessionSecondsRef.current;
      pct = Math.min(100, Math.round((totalSeconds / durationSeconds) * 100));
    }

    const completed = pct >= COMPLETE_THRESHOLD_PCT;

    await writeProgressPayload(supabase, {
      student_id: userId,
      content_id: contentId,
      progress_percent: pct,
      last_position_seconds: savedSecondsRef.current + sessionSecondsRef.current,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });
  }, [contentId, userId, durationSeconds, supabase]);

  const saveProgressRef = useRef(saveProgress);
  useEffect(() => { saveProgressRef.current = saveProgress; }, [saveProgress]);

  // Grava periodicamente + ao sair da pagina
  useEffect(() => {
    if (!contentId || !userId) return;

    const interval = window.setInterval(() => saveProgressRef.current?.(), SAVE_INTERVAL_MS);
    const onBeforeUnload = () => saveProgressRef.current?.();

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", onBeforeUnload);
      saveProgressRef.current?.();
    };
  }, [contentId, userId]);

  // Grava tambem ao esconder a aba, e reenvia a fila pendente
  // quando a ligacao volta ou o utilizador fica disponivel.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveProgressRef.current?.();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!userId) return;

    flushProgressQueue(supabase);

    const interval = setInterval(() => flushProgressQueue(supabase), 30000);
    const onOnline = () => flushProgressQueue(supabase);
    window.addEventListener("online", onOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
    };
  }, [userId, supabase]);

  // ===================== LOGICA ORIGINAL (inalterada) =====================

  const sendZoom = (z: number) => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "app-zoom", zoom: z }, "*");
    } catch {
      /* cross-origin — ignorado */
    }
  };

  useEffect(() => {
    if (mode !== "iframe" || status !== "ready") return;
    sendZoom(zoom);
  }, [zoom, mode, status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode === "empty") { setStatus("error"); return; }
    setStatus("loading");
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setStatus((s) => (s === "loading" ? "error" : s));
    }, LOAD_TIMEOUT_MS);
    return () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); };
  }, [src, attempt, mode]); // eslint-disable-line

  const markReady = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setStatus("ready");
  };

  const markError = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setStatus("error");
  };

  const reload = () => { setAttempt((a) => a + 1); setStatus("loading"); };

  const handleIframeLoad = () => {
    markReady();
    sendZoom(zoom);

    if (mode !== "iframe") return;

    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc || doc.getElementById("__sv_fix__")) return;

      const style = doc.createElement("style");
      style.id = "__sv_fix__";
      style.textContent = `
        html {
          height: 100%;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }
        body {
          min-height: 100%;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          touch-action: pan-y pinch-zoom !important;
        }
        * {
          touch-action: pan-y pinch-zoom !important;
        }
        .theme-toggle {
          touch-action: auto !important;
        }
      `;
      doc.head.appendChild(style);
    } catch {
      /* cross-origin — não é possível injetar CSS */
    }
  };

  return (
    <div
      className={`relative h-full w-full bg-slate-100 dark:bg-[#050816] ${className ?? ""}`}
      style={{ touchAction: "pan-y pinch-zoom" }}
    >
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-[#050816]">
          <Loader2 size={22} className="animate-spin text-indigo-500 dark:text-indigo-400" />
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
            A carregar…
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-[#050816] p-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {mode === "empty" ? "Sem conteúdo disponível" : "Não foi possível carregar este conteúdo"}
            </p>
            {mode !== "empty" && (
              <p className="mt-0.5 max-w-[220px] text-[11px] text-slate-500">
                Verifica a tua ligação ou tenta abrir noutro separador.
              </p>
            )}
          </div>
          {mode !== "empty" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reload}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <RotateCw size={12} /> Tentar novamente
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
              >
                <ExternalLink size={12} /> Abrir noutro separador
              </a>
            </div>
          )}
        </div>
      )}

      {mode === "image" && (
        <div
          className="h-full w-full overflow-auto"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y pinch-zoom" }}
        >
          <div
            style={{
              width: `${zoom * 100}%`,
              margin: zoom <= 1 ? "0 auto" : undefined,
            }}
          >
            <img
              key={attempt}
              src={src}
              alt={title}
              className="block h-auto w-full"
              onLoad={markReady}
              onError={markError}
            />
          </div>
        </div>
      )}

      {mode === "iframe" && (
        <iframe
          key={attempt}
          ref={iframeRef}
          src={src}
          title={title}
          className="h-full w-full"
          style={{ border: "none", display: "block", touchAction: "pan-y pinch-zoom" }}
          allowFullScreen
          onLoad={handleIframeLoad}
        />
      )}

      {mode === "office" && (
        <iframe
          key={attempt}
          src={src}
          title={title}
          className="h-full w-full"
          style={{ border: "none", display: "block" }}
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-modals"
          onLoad={markReady}
        />
      )}
    </div>
  );
}