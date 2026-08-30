"use client";

import { useMemo } from "react";
import { compile } from "mathjs";

/* ── Tipos ── */

export type GraphExpression = {
  expr: string;
  color?: string;
  domain?: [number, number];
  style?: "solid" | "dashed";
};

export type GraphPoint = {
  x: number;
  y: number;
  color?: string;
  open?: boolean;
};

export type GraphConfig = {
  expressions?: GraphExpression[];
  points?: GraphPoint[];
  verticalAsymptotes?: number[];
  horizontalAsymptotes?: number[];
  xRange?: [number, number];
  yRange?: [number, number];
  height?: number;
};

/* ── Cores predefinidas ── */

const COLOR_MAP: Record<string, string> = {
  blue:   "#3b82f6",
  red:    "#ef4444",
  green:  "#22c55e",
  orange: "#f97316",
  violet: "#8b5cf6",
  pink:   "#ec4899",
  yellow: "#eab308",
  indigo: "#6366f1",
};

function resolveColor(color?: string): string {
  if (!color) return "#3b82f6";
  return COLOR_MAP[color] ?? color;
}

/* ── Conversão de coordenadas ── */

function mapX(x: number, xMin: number, xMax: number, width: number): number {
  return ((x - xMin) / (xMax - xMin)) * width;
}

function mapY(y: number, yMin: number, yMax: number, height: number): number {
  return height - ((y - yMin) / (yMax - yMin)) * height;
}

/* ── Componente ── */

export function GraphSVG({ config }: { config: GraphConfig }) {
  const width = 600;
  const height = config.height ?? 240;

  const xRange = config.xRange ?? [-10, 10];
  const yRange = config.yRange ?? [-10, 10];
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  const compiledExprs = useMemo(() => {
    return (config.expressions ?? []).flatMap((e) => {
      try {
        const node = compile(e.expr);
        const fn = (x: number): number => {
          try {
            const y = node.evaluate({ x });
            return typeof y === "number" && Number.isFinite(y) ? y : NaN;
          } catch {
            return NaN;
          }
        };
        return [{
          fn,
          color: resolveColor(e.color),
          domain: e.domain as [number, number] | undefined,
          style: (e.style ?? "solid") as "solid" | "dashed",
        }];
      } catch {
        return [];
      }
    });
  }, [config.expressions]);

  const ticksX = useMemo(() => {
    const step = (xMax - xMin) / 10;
    return Array.from({ length: 11 }, (_, i) => xMin + i * step);
  }, [xMin, xMax]);

  const ticksY = useMemo(() => {
    const step = (yMax - yMin) / 10;
    return Array.from({ length: 11 }, (_, i) => yMin + i * step);
  }, [yMin, yMax]);

  const curves = useMemo(() => {
    return compiledExprs.map((e) => {
      const [start, end] = e.domain ?? xRange;
      const points: string[] = [];
      const samples = 400;

      for (let i = 0; i <= samples; i++) {
        const x = start + (i / samples) * (end - start);
        const y = e.fn(x);
        if (!Number.isNaN(y) && y >= yMin && y <= yMax) {
          points.push(`${mapX(x, xMin, xMax, width)},${mapY(y, yMin, yMax, height)}`);
        }
      }
      return { ...e, points: points.join(" ") };
    });
  }, [compiledExprs, xMin, xMax, yMin, yMax, width, height]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        style={{ height: `${height}px` }}
      >
        {/* Fundo */}
        <rect x={0} y={0} width={width} height={height} fill="none" />

        {/* Grelha */}
        {ticksX.map((x, i) => (
          <line
            key={`gx-${i}`}
            x1={mapX(x, xMin, xMax, width)}
            y1={0}
            x2={mapX(x, xMin, xMax, width)}
            y2={height}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}
        {ticksY.map((y, i) => (
          <line
            key={`gy-${i}`}
            x1={0}
            y1={mapY(y, yMin, yMax, height)}
            x2={width}
            y2={mapY(y, yMin, yMax, height)}
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}

        {/* Eixos */}
        {yMin <= 0 && yMax >= 0 && (
          <line
            x1={0}
            y1={mapY(0, yMin, yMax, height)}
            x2={width}
            y2={mapY(0, yMin, yMax, height)}
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeWidth={1.5}
          />
        )}
        {xMin <= 0 && xMax >= 0 && (
          <line
            x1={mapX(0, xMin, xMax, width)}
            y1={0}
            x2={mapX(0, xMin, xMax, width)}
            y2={height}
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeWidth={1.5}
          />
        )}

        {/* Assíntotas verticais */}
        {config.verticalAsymptotes?.map((xVal, i) => (
          <line
            key={`va-${i}`}
            x1={mapX(xVal, xMin, xMax, width)}
            y1={0}
            x2={mapX(xVal, xMin, xMax, width)}
            y2={height}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="6 6"
            opacity={0.7}
          />
        ))}

        {/* Assíntotas horizontais */}
        {config.horizontalAsymptotes?.map((yVal, i) => (
          <line
            key={`ha-${i}`}
            x1={0}
            y1={mapY(yVal, yMin, yMax, height)}
            x2={width}
            y2={mapY(yVal, yMin, yMax, height)}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="6 6"
            opacity={0.7}
          />
        ))}

        {/* Curvas */}
        {curves.map((c, i) => (
          <polyline
            key={`curve-${i}`}
            points={c.points}
            fill="none"
            stroke={c.color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={c.style === "dashed" ? "6 6" : undefined}
          />
        ))}

        {/* Pontos */}
        {config.points?.map((p, i) => (
          <circle
            key={`pt-${i}`}
            cx={mapX(p.x, xMin, xMax, width)}
            cy={mapY(p.y, yMin, yMax, height)}
            r={5}
            fill={p.open ? "transparent" : resolveColor(p.color)}
            stroke={p.open ? resolveColor(p.color) : "none"}
            strokeWidth={2}
          />
        ))}
      </svg>
    </div>
  );
}