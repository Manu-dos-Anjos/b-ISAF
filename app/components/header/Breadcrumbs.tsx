"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, ChevronRight, MoreHorizontal } from "lucide-react";

type Crumb = {
  label: string;
  href?: string;
  isEllipsis?: boolean;
};

// Labels "bonitos" para slugs conhecidos
const routeLabels: Record<string, string> = {
  disciplinas: "Disciplinas",
  guardados: "Guardados",
  historico: "Histórico",
  "meu-curso": "Meu Curso",
  avaliacoes: "Avaliações",
  dashboard: "Dashboard",

  // Exemplo de disciplina:
  "fundamentos-de-sistemas-de-informacao": "Fundamentos de Sistemas de Informação",
};

// Formata um segmento qualquer
function formatSegmentLabel(segment: string) {
  const decoded = decodeURIComponent(segment);

  if (routeLabels[decoded]) return routeLabels[decoded];

  return decoded
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Detecta segmentos académicos como:
 *  - "1-ano-1-semestre"
 *  - "2-ano-2-semestre"
 * para não aparecerem no breadcrumb.
 */
function isAcademicYearSemesterSegment(segment: string) {
  // Ajusta se no futuro mudares o formato do slug
  return /^\d{1,2}-ano-\d{1,2}-semestre$/.test(segment);
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  if (!pathname) return null;

  // Página inicial
  if (pathname === "/") {
    return (
      <div className="sticky top-16 z-30 w-full border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
        <nav aria-label="Breadcrumb" className="flex h-11 items-center px-4 md:px-6 lg:px-8">
          <div className="ml-1.5 flex items-center gap-2 text-sm">
            <FolderOpen size={15} className="shrink-0 text-slate-500 dark:text-slate-400" />
            <span className="font-medium text-slate-900 dark:text-slate-100">Início</span>
          </div>
        </nav>
      </div>
    );
  }

  // Segmentos reais do pathname
  const rawSegments = pathname.split("/").filter(Boolean);

  // Cria crumbs com href (mesmo para os segmentos que depois ocultamos)
  const rawItems: (Crumb & { segment: string })[] = rawSegments.map((segment, index) => ({
    segment,
    label: formatSegmentLabel(segment),
    href: "/" + rawSegments.slice(0, index + 1).join("/"),
  }));

  // Filtra fora o "ano/semestre"
  const items: Crumb[] = rawItems
    .filter((item) => !isAcademicYearSemesterSegment(item.segment))
    .map(({ segment: _segment, ...rest }) => rest);

  // Se por algum motivo só sobrar 1 item, não quebra
  const safeItems = items.length > 0 ? items : [{ label: "Navegação" }];

  // Mobile compactado
  const mobileItems: Crumb[] =
    safeItems.length <= 2
      ? safeItems
      : [safeItems[0], { label: "...", isEllipsis: true }, safeItems[safeItems.length - 1]];

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
      <nav aria-label="Breadcrumb" className="flex h-11 items-center px-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <FolderOpen size={15} className="shrink-0 text-slate-500 dark:text-slate-400" />

          {/* Desktop */}
          <ol className="hidden min-w-0 items-center md:flex">
            {renderItems(safeItems)}
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