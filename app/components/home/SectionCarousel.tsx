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
      <h2 className="text-xl font-semibold text-black dark:text-white">
        {title}
      </h2>

      <div className="relative">
        {/* Arrow esquerda */}
        <button
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className={`absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-md backdrop-blur-md transition
            ${
              canScrollLeft
                ? "border-gray-200 bg-white/80 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-slate-900/85 dark:text-white dark:hover:bg-slate-800"
                : "cursor-not-allowed border-gray-200/60 bg-white/40 text-slate-400 opacity-40 dark:border-white/5 dark:bg-slate-900/40 dark:text-slate-600"
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
          className={`absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-md backdrop-blur-md transition
            ${
              canScrollRight
                ? "border-gray-200 bg-white/80 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-slate-900/85 dark:text-white dark:hover:bg-slate-800"
                : "cursor-not-allowed border-gray-200/60 bg-white/40 text-slate-400 opacity-40 dark:border-white/5 dark:bg-slate-900/40 dark:text-slate-600"
            }
          `}
          aria-label="Scroll para a direita"
        >
          <ChevronRight size={18} />
        </button>

        {/* Carrossel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-none"
        >
          {children}
        </div>
      </div>
    </section>
  );
}