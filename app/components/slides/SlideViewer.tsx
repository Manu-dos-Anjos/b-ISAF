"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, RotateCw } from "lucide-react";

type Props = {
  url: string;
  className?: string;
  title?: string;
};

type ViewMode = "iframe" | "office" | "image" | "empty";

const LOAD_TIMEOUT_MS = 15000;

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

export default function SlideViewer({ url, className, title = "Apresentação" }: Props) {
  const { src, mode } = resolveViewer(url);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    mode === "empty" ? "error" : "loading"
  );
  const [attempt, setAttempt] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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
    if (mode !== "iframe") return;

    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc || doc.getElementById("__sv_fix__")) return;

      const style = doc.createElement("style");
      style.id = "__sv_fix__";
      style.textContent = `
        /* ── Fix scroll iOS Safari dentro de iframe position:fixed ── */
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
        /* Garante que nenhum elemento filho bloqueia gestos de scroll */
        * {
          touch-action: pan-y pinch-zoom !important;
        }
        /* Excepção: o botão de tema usa touch-action padrão (precisa de tap) */
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
    /* O wrapper externo NÃO tem overflow — o scroll é gerido
       inteiramente pelo body do documento dentro do iframe.
       Colocar overflow-auto aqui criaria "scroll dentro de scroll",
       o que em iOS Safari causa comportamento errático. */
    <div
      className={`relative h-full w-full bg-[#050816] ${className ?? ""}`}
      style={{ touchAction: "pan-y pinch-zoom" }}
    >
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#050816]">
          <Loader2 size={22} className="animate-spin text-indigo-400" />
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
            A carregar…
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#050816] p-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <RotateCw size={12} /> Tentar novamente
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
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
          <img
            key={attempt}
            src={src}
            alt={title}
            className="block w-full h-auto"
            onLoad={markReady}
            onError={markError}
          />
        </div>
      )}

      {/* HTML/CSS/JS puro (o teu caso) e PDF — sem sandbox para não
          bloquear localStorage, scripts nativos e gestos internos */}
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

      {/* Office Online — mantém sandbox por ser domínio externo */}
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