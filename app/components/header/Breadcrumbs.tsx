"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, ChevronRight, MoreHorizontal } from "lucide-react";

type Crumb = {
  label: string;
  href?: string;
  isEllipsis?: boolean;
};

const routeLabels: Record<string, string> = {
  disciplinas: "Disciplinas",
  guardados: "Guardados",
  historico: "Histórico",
  "meu-curso": "Meu Curso",
  avaliacoes: "Avaliações",
  dashboard: "Dashboard",

  "1-ano-1-semestre": "1º Ano - 1º Semestre",
  "fundamentos-de-sistemas-de-informacao":
    "Fundamentos de Sistemas de Informação",
};

function formatSegmentLabel(segment: string) {
  const decoded = decodeURIComponent(segment);

  if (routeLabels[decoded]) return routeLabels[decoded];

  return decoded
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (!pathname) return null;

  if (pathname === "/") {
    return (
      <div className="sticky top-16 z-30 w-full border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
        <nav
          aria-label="Breadcrumb"
          className="flex h-8 items-center px-4 md:px-6 lg:px-8"
        >
          <div className="flex ml-1.5 items-center gap-2 text-sm">
            <FolderOpen
              size={15}
              className="shrink-0 text-slate-500 dark:text-slate-400"
            />
            <span className="font-medium text-slate-900 dark:text-slate-100">
              Início
            </span>
          </div>
        </nav>
      </div>
    );
  }

  const segments = pathname.split("/").filter(Boolean);

  const items: Crumb[] = segments.map((segment, index) => ({
    label: formatSegmentLabel(segment),
    href: "/" + segments.slice(0, index + 1).join("/"),
  }));

  const mobileItems: Crumb[] =
    items.length <= 2
      ? items
      : [items[0], { label: "...", isEllipsis: true }, items[items.length - 1]];

  function renderItems(list: Crumb[], mobile = false) {
    return list.map((item, index) => {
      const isLast = index === list.length - 1;
      const labelWidthClass = mobile
        ? "max-w-[120px]"
        : "max-w-[220px] lg:max-w-[320px] xl:max-w-none";

      return (
        <li key={`${item.label}-${index}`} className="flex min-w-0 items-center">
          {index > 0 && (
            <ChevronRight
              size={14}
              className="mx-2 shrink-0 text-slate-400 dark:text-slate-500"
            />
          )}

          {item.isEllipsis ? (
            <span className="flex items-center text-slate-400 dark:text-slate-500">
              <MoreHorizontal size={14} />
            </span>
          ) : item.href && !isLast ? (
            <Link
              href={item.href}
              className={`truncate ${labelWidthClass} text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-white`}
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={`truncate ${labelWidthClass} font-medium text-slate-900 dark:text-slate-100`}
            >
              {item.label}
            </span>
          )}
        </li>
      );
    });
  }

  return (
    <div className="sticky top-16 z-30 w-full border-b border-gray-200 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
      <nav
        aria-label="Breadcrumb"
        className="flex h-11 items-center px-4 md:px-6 lg:px-8"
      >
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <FolderOpen
            size={15}
            className="shrink-0 text-slate-500 dark:text-slate-400"
          />

          {/* Desktop */}
          <ol className="hidden min-w-0 items-center md:flex">
            {renderItems(items)}
          </ol>

          {/* Mobile */}
          <ol className="flex min-w-0 items-center md:hidden">
            {renderItems(mobileItems, true)}
          </ol>
        </div>
      </nav>
    </div>
  );
}