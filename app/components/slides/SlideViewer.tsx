"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  url: string;
  rotation: 0 | 90;
  className?: string; // define a altura no pai (h-72, h-[calc(...)], etc.)
};

export default function SlideViewer({ url, rotation, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isRotated = rotation === 90;

  // Se ainda não medimos o container, renderiza normal (evita flicker)
  if (size.w === 0 || size.h === 0) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black ${className ?? ""}`}
      >
        <iframe
          title="Slide"
          src={url}
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  // Quando roda 90°, precisamos “trocar” largura/altura
  const innerW = isRotated ? size.h : size.w;
  const innerH = isRotated ? size.w : size.h;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black ${className ?? ""}`}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: innerW,
          height: innerH,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          transformOrigin: "center",
        }}
      >
        <iframe
          title="Slide"
          src={url}
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </div>
  );
}