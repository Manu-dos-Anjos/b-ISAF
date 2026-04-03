"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Search,
  SlidersHorizontal,
  Bell,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function Header({
  expanded,
  mobileOpen,
  setMobileOpen,
}: {
  expanded: boolean;
  mobileOpen?: boolean;
  setMobileOpen?: (value: boolean) => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <>
      {/* ==================== DESKTOP HEADER ==================== */}
      <header
        className={`fixed top-0 z-40 hidden h-16 transition-all duration-300 md:block
          bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl
          border-b border-gray-200 dark:border-white/10
          shadow-sm
          ${expanded ? "left-56 right-0" : "left-16 right-0"}
        `}
      >
        <div className="flex h-full items-center justify-between gap-6 px-6">
          {/* Título */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col">
              <span className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Biblioteca Virtual
              </span>
            </div>
          </div>

          {/* Barra de Pesquisa */}
          <div className="flex-1 max-w-2xl">
            <div className="relative flex h-10 items-center rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
              <Search
                size={18}
                className="absolute left-4 text-slate-400 dark:text-slate-500"
              />
              <input
                type="text"
                placeholder="Pesquisar disciplinas, temas, áudios..."
                className="w-full bg-transparent py-2.5 pl-12 pr-14 text-sm text-slate-800 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-slate-500"
              />
              <button
                className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                aria-label="Filtrar"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>

          {/* Ações da direita */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 transition-colors hover:bg-slate-100 dark:border-white/10 dark:hover:bg-slate-800"
              aria-label="Mudar tema"
            >
              {mounted && (isDark ? <Sun size={20} /> : <Moon size={20} />)}
            </button>

            <button
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 transition-colors hover:bg-slate-100 dark:border-white/10 dark:hover:bg-slate-800"
              aria-label="Notificações"
            >
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500"></span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================== MOBILE HEADER ==================== */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center gap-2 border-b border-gray-200 bg-white/95 px-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 md:hidden">
        {/* Botão menu */}
        <button
          onClick={() => setMobileOpen?.(!mobileOpen)}
          className="shrink-0 rounded-xl p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>

        {/* Logo + Nome */}
        <div className="flex shrink-0 items-center gap-2">
          <Image
            src="/logo.svg"
            alt="b-ISAF"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            b-ISAF
          </span>
        </div>

        {/* Pesquisa */}
        <div className="min-w-0 flex-1">
          <div className="relative flex h-10 items-center rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-slate-900">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="h-full w-full bg-transparent pl-12 pr-12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
            />
            <button
              className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              aria-label="Filtrar"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Ações mobile */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 transition-colors hover:bg-slate-100 dark:border-white/10 dark:hover:bg-slate-800"
            aria-label="Mudar tema"
          >
            {mounted && (isDark ? <Sun size={20} /> : <Moon size={20} />)}
          </button>

          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 transition-colors hover:bg-slate-100 dark:border-white/10 dark:hover:bg-slate-800"
            aria-label="Notificações"
          >
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500"></span>
          </button>
        </div>
      </header>
    </>
  );
}