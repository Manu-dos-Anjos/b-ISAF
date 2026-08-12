"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, RotateCw } from "lucide-react";

type Props = {
  url: string;
  className?: string;
  title?: string;
  zoom?: number;
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

export default function SlideViewer({ url, className, title = "Apresentação", zoom = 1 }: Props) {
  const { src, mode } = resolveViewer(url);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    mode === "empty" ? "error" : "loading"
  );
  const [attempt, setAttempt] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Envia o zoom actual ao iframe (HTML puro apenas — cross-origin é ignorado silenciosamente).
  // Separado em função para ser chamado tanto no `useEffect` como no `onLoad`.
  const sendZoom = (z: number) => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "app-zoom", zoom: z }, "*");
    } catch {
      /* cross-origin — ignorado */
    }
  };

  // Sempre que o zoom muda, reenvia ao iframe (se já estiver carregado).
  // Para iframes cross-origin o postMessage pode falhar silenciosamente — não é problema.
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

    // Envia o zoom actual assim que o iframe termina de carregar.
    // Feito antes da injeção de CSS para garantir que o documento já existe.
    sendZoom(zoom);

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
          {/*
            Wrapper que define a largura real (não visual) da imagem consoante o zoom.
            Ao contrário de `transform: scale()`, isto faz o browser recalcular o
            layout/altura verdadeiros, permitindo que o `overflow-auto` do contentor
            pai gere scroll correcto em X e Y sem cortes nem espaços em branco no fundo.
          */}
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

      {/* Office Online — mantém sandbox por ser domínio externo.
          Zoom não é suportado via postMessage (cross-origin externo),
          mas os controlos ficam visíveis para coerência de UI. */}
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