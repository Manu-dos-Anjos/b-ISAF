"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  GripVertical,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useAudioPlayer } from "@/app/lib/context/AudioPlayerContext";

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const POS_KEY = "b-isaf:miniplayer:pos:v4";
const COLLAPSE_KEY = "b-isaf:miniplayer:collapsed:v4";

type DragState = { offsetX: number; offsetY: number };

type ProgressSliderProps = {
  value: number; // seconds
  max: number; // seconds
  onChange: (nextValue: number) => void;
};

/**
 * Slider moderno (track fina + thumb pequeno + fill em gradiente)
 * - Sem <input range> para conseguir um look consistente em todos os browsers.
 */
function ProgressSlider({ value, max, onChange }: ProgressSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const safeMax = Math.max(1, max || 1);
  const safeValue = clamp(value || 0, 0, safeMax);
  const pct = (safeValue / safeMax) * 100;

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const ratio = rect.width ? x / rect.width : 0;
    onChange(ratio * safeMax);
  };

  return (
    <div
      ref={trackRef}
      className="relative h-1 w-full rounded-full bg-white/10"
      onPointerDown={(e) => {
        // permite arrastar no mobile/desktop
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setFromClientX(e.clientX);

        const handleMove = (ev: PointerEvent) => setFromClientX(ev.clientX);
        const handleUp = () => {
          window.removeEventListener("pointermove", handleMove);
          window.removeEventListener("pointerup", handleUp);
          window.removeEventListener("pointercancel", handleUp);
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);
        window.addEventListener("pointercancel", handleUp);
      }}
      role="slider"
      aria-label="Progresso do áudio"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      tabIndex={0}
      onKeyDown={(e) => {
        // acessibilidade básica via teclado
        if (e.key === "ArrowLeft") onChange(clamp(safeValue - 5, 0, safeMax));
        if (e.key === "ArrowRight") onChange(clamp(safeValue + 5, 0, safeMax));
      }}
    >
      {/* Fill */}
      <div
        className="absolute left-0 top-0 h-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
        style={{ width: `${pct}%` }}
      />
      {/* Thumb */}
      <div
        className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-md ring-1 ring-black/30"
        style={{ left: `calc(${pct}% - 7px)` }}
      />
    </div>
  );
}

export default function MiniPlayer() {
  const {
    track,
    isPlaying,
    currentTime,
    duration,
    toggle,
    stop,
    seek,
  } = useAudioPlayer();

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [hasPosition, setHasPosition] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [collapsed, setCollapsed] = useState(false);
  const [hasCollapsedPref, setHasCollapsedPref] = useState(false);

  const safeDuration = Math.max(0, duration || 0);
  const safeCurrent = clamp(currentTime || 0, 0, safeDuration || 0);
  const timeLeft = safeDuration ? Math.max(0, safeDuration - safeCurrent) : 0;

  const jumpSeconds = (delta: number) => {
    if (!safeDuration) return;
    seek(clamp(safeCurrent + delta, 0, safeDuration));
  };

  // Restore collapsed
  useEffect(() => {
    if (!track) return;
    if (hasCollapsedPref) return;

    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved != null) setCollapsed(saved === "1");
    } catch {
      // ignore
    } finally {
      setHasCollapsedPref(true);
    }
  }, [track, hasCollapsedPref]);

  // Persist collapsed
  useEffect(() => {
    if (!track) return;
    if (!hasCollapsedPref) return;
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [track, collapsed, hasCollapsedPref]);

  // Restore position
  useEffect(() => {
    if (!track) return;
    if (hasPosition) return;

    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
          setPosition(parsed);
          setHasPosition(true);
          return;
        }
      }
    } catch {
      // ignore
    }

    const t = window.setTimeout(() => {
      const rect = panelRef.current?.getBoundingClientRect();
      const w = rect?.width ?? (collapsed ? 340 : 380);
      const h = rect?.height ?? (collapsed ? 84 : 440);

      const x = Math.max(8, (window.innerWidth - w) / 2);
      const y = Math.max(8, window.innerHeight - h - 12);

      setPosition({ x, y });
      setHasPosition(true);
    }, 0);

    return () => window.clearTimeout(t);
  }, [track, hasPosition, collapsed]);

  // Persist position
  useEffect(() => {
    if (!track) return;
    if (!hasPosition) return;
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(position));
    } catch {
      // ignore
    }
  }, [track, position, hasPosition]);

  // Clamp on collapse/expand and resize
  useEffect(() => {
    if (!track) return;

    const clampToViewport = () => {
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;

      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;

      setPosition((p) => ({
        x: clamp(p.x, 8, Math.max(8, maxX)),
        y: clamp(p.y, 8, Math.max(8, maxY)),
      }));
    };

    const t = window.setTimeout(clampToViewport, 0);
    window.addEventListener("resize", clampToViewport);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", clampToViewport);
    };
  }, [collapsed, track]);

  // Drag
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      if (!panelRef.current || !dragRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      const nextX = e.clientX - dragRef.current.offsetX;
      const nextY = e.clientY - dragRef.current.offsetY;

      const maxX = window.innerWidth - w - 8;
      const maxY = window.innerHeight - h - 8;

      setPosition({
        x: clamp(nextX, 8, Math.max(8, maxX)),
        y: clamp(nextY, 8, Math.max(8, maxY)),
      });
    };

    const onUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging]);

  if (!track) return null;

  const iconStroke = 2.2;

  const glassBtn =
    "rounded-2xl bg-white/5 ring-1 ring-white/10 text-slate-200 hover:bg-white/10 transition active:scale-[0.98]";
  const iconBtn =
    "inline-flex items-center justify-center h-10 w-10 " + glassBtn;
  const primaryBtn =
    "inline-flex items-center justify-center h-14 w-14 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15 hover:from-blue-500 hover:to-indigo-500 transition active:scale-[0.98]";

  return (
    <div
      ref={panelRef}
      style={{ left: position.x, top: position.y }}
      className={[
        "fixed z-[90] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-2xl",
        collapsed
          ? "w-[340px] max-w-[calc(100vw-24px)]"
          : "w-[390px] max-w-[calc(100vw-24px)]",
      ].join(" ")}
    >
      {/* Top bar (drag + tempo + colapsar + fechar) */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div
          className="flex min-w-0 flex-1 items-center gap-2 select-none cursor-move"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            if (!panelRef.current) return;

            const rect = panelRef.current.getBoundingClientRect();
            dragRef.current = {
              offsetX: e.clientX - rect.left,
              offsetY: e.clientX ? e.clientY - rect.top : 0,
            };
            setIsDragging(true);
          }}
        >
          <GripVertical size={16} className="text-slate-500" />
          <p className="truncate text-xs text-slate-300">A reproduzir</p>
        </div>

        {/* minutos mesmo colapsado */}
        <p className="text-[11px] tabular-nums text-slate-400">
          {formatTime(safeCurrent)} /{" "}
          {safeDuration ? formatTime(safeDuration) : "--:--"}
        </p>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white active:scale-[0.98]"
          aria-label={collapsed ? "Expandir" : "Colapsar"}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          <ChevronDown
            size={18}
            className={collapsed ? "rotate-180 transition-transform" : "transition-transform"}
          />
        </button>

        <button
          type="button"
          onClick={stop}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white active:scale-[0.98]"
          aria-label="Fechar"
          title="Fechar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Collapsed */}
      {collapsed ? (
        <div className="px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {track.coverUrl ? (
                <Image src={track.coverUrl} alt="" fill className="object-cover" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {track.title}
              </p>
              <p className="truncate text-xs text-slate-400">
                {[track.discipline, track.chapter, track.topic]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void toggle()}
              className={iconBtn}
              aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? (
                <Pause size={18} strokeWidth={iconStroke} />
              ) : (
                <Play size={18} strokeWidth={iconStroke} className="ml-0.5" />
              )}
            </button>
          </div>

          <div className="mt-3">
            <ProgressSlider
              value={safeCurrent}
              max={Math.max(1, safeDuration)}
              onChange={(v) => seek(v)}
            />
            <div className="mt-1 flex items-center justify-between text-[11px] tabular-nums text-slate-400">
              <span>{formatTime(safeCurrent)}</span>
              <span>-{safeDuration ? formatTime(timeLeft) : "--:--"}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Expanded - estilo Apple Music */
        <div className="px-5 py-5">
          <div className="mx-auto w-full max-w-[220px]">
            <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg">
              {track.coverUrl ? (
                <Image src={track.coverUrl} alt="" fill className="object-cover" />
              ) : null}
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="truncate text-base font-semibold text-white">
              {track.title}
            </p>
            <p className="truncate text-sm text-slate-400">
              {[track.discipline, track.chapter, track.topic]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div className="mt-5">
            <ProgressSlider
              value={safeCurrent}
              max={Math.max(1, safeDuration)}
              onChange={(v) => seek(v)}
            />
            <div className="mt-1 flex items-center justify-between text-[11px] tabular-nums text-slate-400">
              <span>{formatTime(safeCurrent)}</span>
              <span>-{safeDuration ? formatTime(timeLeft) : "--:--"}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => jumpSeconds(-15)}
              className={iconBtn}
              aria-label="Voltar 15s"
              title="Voltar 15s"
            >
              <SkipBack size={20} strokeWidth={iconStroke} />
            </button>

            <button
              type="button"
              onClick={() => void toggle()}
              className={primaryBtn}
              aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? (
                <Pause size={22} strokeWidth={iconStroke} />
              ) : (
                <Play size={22} strokeWidth={iconStroke} className="ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => jumpSeconds(15)}
              className={iconBtn}
              aria-label="Avançar 15s"
              title="Avançar 15s"
            >
              <SkipForward size={20} strokeWidth={iconStroke} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}