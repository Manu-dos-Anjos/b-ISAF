"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { FileText, Loader2 } from "lucide-react";

type SlideViewerProps = {
  url: string;
  rotation?: 0 | 90;
  className?: string;
};

export default function SlideViewer({
  url,
  rotation = 0,
  className,
}: SlideViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bootstrappedRef = useRef(false);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [frameReady, setFrameReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [viewerNonce, setViewerNonce] = useState(0);

  // Reset quando url ou rotation mudam
  useEffect(() => {
    setFrameReady(false);
    setHasError(false);
  }, [url, rotation]);

  // Mede o container com ResizeObserver + força remount inicial
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = 0;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const nextW = Math.round(rect.width);
      const nextH = Math.round(rect.height);

      setSize((prev) => {
        if (
          Math.abs(prev.width - nextW) <= 1 &&
          Math.abs(prev.height - nextH) <= 1
        ) {
          return prev;
        }
        return { width: nextW, height: nextH };
      });

      if (!bootstrappedRef.current && nextW > 0 && nextH > 0) {
        bootstrappedRef.current = true;
        setViewerNonce((n) => n + 1);
      }
    };

    measure();
    raf = window.requestAnimationFrame(measure);

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(measure);
    });

    observer.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  // Quando a rotation muda, força novo remount do iframe
  // para que ele recarregue com as dimensões corretas
  useEffect(() => {
    bootstrappedRef.current = false;
    setViewerNonce((n) => n + 1);
  }, [rotation]);

  const hasSize = size.width > 0 && size.height > 0;
  const isRotated = rotation === 90;

  // Quando está rodado (mobile sem fullscreen real do browser),
  // trocamos width/height e aplicamos rotate.
  // Se o container já estiver em fullscreen landscape (via browser),
  // o iframe simplesmente ocupa 100%x100% sem rotate.
  const isLandscapeContainer = size.width > size.height;

  const iframeWrapperStyle: CSSProperties = (() => {
    if (!isRotated) {
      // vertical normal — ocupa tudo
      return { width: "100%", height: "100%" };
    }

    if (isLandscapeContainer) {
      // o container já está em landscape (fullscreen real)
      // não precisa de rotate CSS
      return { width: "100%", height: "100%" };
    }

    // container ainda está em portrait mas queremos landscape:
    // trocamos dimensões e rodamos
    return {
      width: `${size.height}px`,
      height: `${size.width}px`,
      transform: "rotate(90deg)",
      transformOrigin: "center center",
      position: "absolute" as const,
      top: "50%",
      left: "50%",
      marginTop: `-${size.width / 2}px`,
      marginLeft: `-${size.height / 2}px`,
    };
  })();

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-black ${className ?? ""}`}
    >
      {/* Loader enquanto o container não tem tamanho */}
      {!hasSize && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-xs font-medium text-slate-500">
              A preparar o slide…
            </p>
          </div>
        </div>
      )}

      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black p-6">
          <div className="max-w-sm rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
              <FileText size={22} />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              Não foi possível abrir o slide
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Verifica se a URL está correta e se o ficheiro permite
              incorporação no browser.
            </p>
          </div>
        </div>
      ) : (
        hasSize && (
          <div
            className="absolute inset-0"
            style={
              isRotated && !isLandscapeContainer
                ? { overflow: "hidden" }
                : { display: "flex", alignItems: "stretch" }
            }
          >
            <div
              className="relative overflow-hidden bg-white"
              style={iframeWrapperStyle}
            >
              <iframe
                key={viewerNonce}
                src={url}
                title="Slide viewer"
                className="block h-full w-full border-0 bg-white"
                loading="eager"
                allow="fullscreen"
                onLoad={() => setFrameReady(true)}
                onError={() => setHasError(true)}
              />

              {!frameReady && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/5">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}