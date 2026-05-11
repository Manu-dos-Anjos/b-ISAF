"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  url: string;
  rotation: 0 | 90;
  className?: string;
};

export default function SlideViewer({ url, rotation, className }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const hideFallbackRef = useRef<number | null>(null);

  const isRotated = rotation === 90;

  useEffect(() => {
    setIsLoading(true);

    // Fallback para não ficar preso no overlay caso o iframe não dispare onLoad
    if (hideFallbackRef.current) window.clearTimeout(hideFallbackRef.current);
    hideFallbackRef.current = window.setTimeout(() => {
      setIsLoading(false);
    }, 1800);

    return () => {
      if (hideFallbackRef.current) window.clearTimeout(hideFallbackRef.current);
    };
  }, [url, rotation]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-black ${className ?? ""}`}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-xs font-medium text-slate-400">
              A carregar slide...
            </p>
          </div>
        </div>
      )}

      {/* Conteúdo do slide */}
      {!isRotated ? (
        <iframe
          key={url}
          title="Slide"
          src={url}
          allowFullScreen
          loading="eager"
          onLoad={() => setIsLoading(false)}
          className="absolute inset-0 block h-full w-full border-0 bg-black"
        />
      ) : (
        <div className="absolute inset-0 overflow-hidden bg-black">
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: "100vh",
              height: "100vw",
              transform: "translate(-50%, -50%) rotate(90deg)",
              transformOrigin: "center center",
            }}
          >
            <iframe
              key={url}
              title="Slide"
              src={url}
              allowFullScreen
              loading="eager"
              onLoad={() => setIsLoading(false)}
              className="block h-full w-full border-0 bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}