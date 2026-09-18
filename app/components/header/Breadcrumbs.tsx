// app/components/header/Breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, ChevronRight, MoreHorizontal, Loader2 } from "lucide-react";
import { useBreadcrumbDiscipline } from "@/app/lib/hooks/useBreadcrumbDiscipline";

/* ================================================================
   TIPOS
================================================================ */

type Crumb = {
  label: string;
  href?: string;
  title?: string;
  isEllipsis?: boolean;
  isDynamic?: boolean;
};

/* ================================================================
   HELPERS
================================================================ */

const routeLabels: Record<string, string> = {
  disciplinas: "Disciplinas",
  guardados: "Guardados",
  historico: "Histórico",
  "meu-curso": "Meu Curso",
  avaliacoes: "Avaliações",
  dashboard: "Dashboard",
  eventos: "Eventos",
};

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
  return decoded.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractDisciplineId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (
    segments.length >= 2 &&
    segments[0] === "disciplinas" &&
    isUUID(segments[1]!)
  ) {
    return segments[1]!;
  }
  return null;
}

/* ================================================================
   CLASSES PARTILHADAS DO WRAPPER FIXO
   ----------------------------------------------------------------
   • top-14 (56px)  → o header é h-14 em TODOS os breakpoints,
                      por isso o breadcrumb cola sempre aos 56px
                      (sem brecha no mobile nem no desktop)
   • h-10  (40px)   → altura da barra do breadcrumb
   • md:left-[65px] → no desktop começa onde a sidebar termina,
                      para a linha inferior encostar nela
   • z-30           → abaixo do header (z-40) e da sidebar (z-50)
================================================================ */
const FIXED_WRAPPER =
  "fixed left-0 right-0 top-14 z-30 w-full border-b border-slate-200/70 bg-slate-100/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80 md:left-[65px]";

const NAV_CLS = "flex h-10 items-center px-3 md:px-5 lg:px-7";

/* ================================================================
   COMPONENTE INTERNO
================================================================ */

function BreadcrumbInner({
  safeItems,
  disciplineId,
}: {
  safeItems: Crumb[];
  disciplineId: string | null;
}) {
  const { name: disciplineName, code: disciplineCode, isLoading } =
    useBreadcrumbDiscipline(disciplineId);

  const resolvedItems: Crumb[] = safeItems.map((item) => {
    if (item.isDynamic && disciplineId) {
      return {
        ...item,
        label: disciplineCode ?? disciplineName ?? item.label,
        title: disciplineName ?? undefined,
      };
    }
    return item;
  });

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
        ? "max-w-[110px]"
        : "max-w-[200px] lg:max-w-[280px] xl:max-w-none";

      return (
        <li key={`${item.label}-${index}`} className="flex min-w-0 items-center">
          {index > 0 && (
            <ChevronRight
              size={12}
              className="mx-1.5 shrink-0 text-slate-400 dark:text-slate-600"
            />
          )}

          {item.isEllipsis ? (
            <span className="flex items-center text-slate-400 dark:text-slate-600">
              <MoreHorizontal size={13} />
            </span>
          ) : item.href && !isLast ? (
            <Link
              href={item.href}
              title={item.title}
              className={`truncate ${labelWidthClass} text-xs text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white`}
            >
              {item.label}
            </Link>
          ) : (
            <span
              title={item.title}
              className={`flex items-center gap-1 truncate ${labelWidthClass} text-xs font-semibold text-slate-800 dark:text-slate-100`}
            >
              {isLast && item.isDynamic && isLoading && (
                <Loader2
                  size={10}
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
    <div className={FIXED_WRAPPER}>
      <nav aria-label="Breadcrumb" className={NAV_CLS}>
        <div className="flex min-w-0 items-center gap-1.5 text-xs">
          <FolderOpen
            size={14}
            className="shrink-0 text-slate-600 dark:text-slate-400"
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

  if (pathname === "/") {
    return (
      <div className={FIXED_WRAPPER}>
        <nav aria-label="Breadcrumb" className={NAV_CLS}>
          <div className="flex items-center gap-1.5 text-xs">
            <FolderOpen
              size={14}
              className="shrink-0 text-slate-600 dark:text-slate-400"
            />
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              Início
            </span>
          </div>
        </nav>
      </div>
    );
  }

  const disciplineId = extractDisciplineId(pathname);

  const rawSegments = pathname.split("/").filter(Boolean);

  const rawItems: (Crumb & { segment: string })[] = rawSegments.map(
    (segment, index) => {
      const href = "/" + rawSegments.slice(0, index + 1).join("/");

      if (isUUID(segment)) {
        return { segment, label: "A carregar…", href, isDynamic: true };
      }

      return { segment, label: formatSegmentLabel(segment), href };
    }
  );

  const items: Crumb[] = rawItems
    .filter((item) => !isAcademicYearSemesterSegment(item.segment))
    .map(({ segment: _segment, ...rest }) => rest);

  const safeItems = items.length > 0 ? items : [{ label: "Navegação" }];

  return (
    <BreadcrumbInner safeItems={safeItems} disciplineId={disciplineId} />
  );
}