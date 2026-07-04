// app/components/Breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, ChevronRight, MoreHorizontal, Loader2 } from "lucide-react";
import { useBreadcrumbDiscipline } from "@/app/lib/hooks/useBreadcrumbDiscipline";

/* ================================================================
   TIPOS
   ================================================================ */

type Crumb = {
  label:       string;
  href?:       string;
  isEllipsis?: boolean;
  isDynamic?:  boolean; // marcador para substituição dinâmica
};

/* ================================================================
   HELPERS
   ================================================================ */

const routeLabels: Record<string, string> = {
  disciplinas:  "Disciplinas",
  guardados:    "Guardados",
  historico:    "Histórico",
  "meu-curso":  "Meu Curso",
  avaliacoes:   "Avaliações",
  dashboard:    "Dashboard",
  eventos:      "Eventos",
};

// UUID v4 — detecta se um segmento é um UUID
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(segment: string): boolean {
  return UUID_REGEX.test(segment);
}

function isAcademicYearSemesterSegment(segment: string): boolean {
  return /^\d{1,2}-ano-\d{1,2}-semestre$/.test(segment);
}

function formatSegmentLabel(segment: string): string {
  const decoded = decodeURIComponent(segment);
  if (routeLabels[decoded]) return routeLabels[decoded];
  return decoded
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ================================================================
   DETECTAR SE ESTAMOS EM /disciplinas/[uuid]
   ================================================================ */

function extractDisciplineId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  // /disciplinas/[uuid]
  if (segments.length >= 2 && segments[0] === "disciplinas" && isUUID(segments[1]!)) {
    return segments[1]!;
  }
  return null;
}

/* ================================================================
   COMPONENTE INTERNO — com acesso ao hook dinâmico
   ================================================================ */

function BreadcrumbInner({
  safeItems,
  disciplineId,
}: {
  safeItems: Crumb[];
  disciplineId: string | null;
}) {
  const { name: disciplineName, isLoading } = useBreadcrumbDiscipline(disciplineId);

  // Substituir o label dinâmico pelo nome real da disciplina
  const resolvedItems: Crumb[] = safeItems.map((item) => {
    if (item.isDynamic && disciplineId) {
      return {
        ...item,
        label: disciplineName ?? item.label,
      };
    }
    return item;
  });

  // Mobile compactado
  const mobileItems: Crumb[] =
    resolvedItems.length <= 2
      ? resolvedItems
      : [
          resolvedItems[0]!,
          { label: "...", isEllipsis: true },
          resolvedItems[resolvedItems.length - 1]!,
        ];

  function renderItems(list: Crumb[], mobile = false) {
    return list.map((item, index) => {
      const isLast = index === list.length - 1;
      const labelWidthClass = mobile
        ? "max-w-[120px]"
        : "max-w-[220px] lg:max-w-[320px] xl:max-w-none";

      return (
        <li
          key={`${item.label}-${index}`}
          className="flex min-w-0 items-center"
        >
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
              className={`flex items-center gap-1.5 truncate ${labelWidthClass} font-medium text-slate-900 dark:text-slate-100`}
            >
              {/* Loading enquanto busca o nome */}
              {isLast && item.isDynamic && isLoading && (
                <Loader2
                  size={11}
                  className="shrink-0 animate-spin text-slate-400"
                />
              )}
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
            {renderItems(resolvedItems)}
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

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */

export default function Breadcrumbs() {
  const pathname = usePathname();
  if (!pathname) return null;

  /* ── Página inicial ── */
  if (pathname === "/") {
    return (
      <div className="sticky top-16 z-30 w-full border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
        <nav
          aria-label="Breadcrumb"
          className="flex h-11 items-center px-4 md:px-6 lg:px-8"
        >
          <div className="ml-1.5 flex items-center gap-2 text-sm">
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

  /* ── Detectar UUID de disciplina ── */
  const disciplineId = extractDisciplineId(pathname);

  /* ── Construir crumbs ── */
  const rawSegments = pathname.split("/").filter(Boolean);

  const rawItems: (Crumb & { segment: string })[] = rawSegments.map(
    (segment, index) => {
      const href = "/" + rawSegments.slice(0, index + 1).join("/");

      if (isUUID(segment)) {
        return {
          segment,
          label:     "A carregar…",
          href,
          isDynamic: true,
        };
      }

      return {
        segment,
        label: formatSegmentLabel(segment),
        href,
      };
    }
  );

  const items: Crumb[] = rawItems
    .filter((item) => !isAcademicYearSemesterSegment(item.segment))
    .map(({ segment: _segment, ...rest }) => rest);

  const safeItems = items.length > 0 ? items : [{ label: "Navegação" }];

  return (
    <BreadcrumbInner
      safeItems={safeItems}
      disciplineId={disciplineId}
    />
  );
}