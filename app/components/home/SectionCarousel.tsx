"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function SectionCarousel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const container = scrollRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
    setTimeout(updateScrollState, 350);
  };

  useEffect(() => {
    updateScrollState();
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [children]);

  return (
    <section className="space-y-4">
      {/* Título com acento lateral */}
      <div className="flex items-center gap-3">
        <span className="h-5 w-1 rounded-full bg-violet-500 dark:bg-violet-400" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h2>
      </div>

      <div className="relative">
        {/* Fade esquerda */}
        <div
          className={`pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-slate-50 to-transparent transition-opacity duration-200 dark:from-[#050816] ${
            canScrollLeft ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Fade direita */}
        <div
          className={`pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-slate-50 to-transparent transition-opacity duration-200 dark:from-[#050816] ${
            canScrollRight ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Arrow esquerda */}
        <button
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className={`absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-200
            ${
              canScrollLeft
                ? "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/90 dark:text-white dark:hover:bg-slate-800"
                : "pointer-events-none opacity-0"
            }
          `}
          aria-label="Scroll para a esquerda"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Arrow direita */}
        <button
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          className={`absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-200
            ${
              canScrollRight
                ? "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/90 dark:text-white dark:hover:bg-slate-800"
                : "pointer-events-none opacity-0"
            }
          `}
          aria-label="Scroll para a direita"
        >
          <ChevronRight size={18} />
        </button>

        {/* Carrossel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth px-1 py-2 scrollbar-none"
        >
          {children}
        </div>
      </div>
    </section>
  );
}