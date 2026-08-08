"use client";

import { useCallback, useEffect, useState } from "react";

/* ================================================================
   TEMA (claro / escuro)
   Fonte da verdade: classe "dark" em <html> + localStorage.
   Funciona porque globals.css define:
     @custom-variant dark (&:where(.dark, .dark *));
   ...que faz o Tailwind basear o `dark:` nesta classe, em vez de
   depender só do prefers-color-scheme do sistema.
================================================================ */
const THEME_STORAGE_KEY = "theme";
export type ThemeMode = "light" | "dark";

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [themeReady, setThemeReady] = useState(false);

  // Na primeira montagem, o <script> inline do layout.tsx já aplicou a
  // classe correta antes da pintura — aqui só sincronizamos o estado
  // React com o que já está no DOM, sem causar flash.
  useEffect(() => {
    const initial = getPreferredTheme();
    setTheme(initial);
    applyTheme(initial);
    setThemeReady(true);

    // Segue o sistema apenas enquanto o utilizador não escolher manualmente
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!window.localStorage.getItem(THEME_STORAGE_KEY)) {
        const next: ThemeMode = e.matches ? "dark" : "light";
        setTheme(next);
        applyTheme(next);
      }
    };
    mql.addEventListener("change", handleSystemChange);
    return () => mql.removeEventListener("change", handleSystemChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggleTheme, themeReady };
}