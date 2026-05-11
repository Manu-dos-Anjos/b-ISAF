"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
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

const POS_KEY = "b-isaf:miniplayer:pos:v8";
const MINIMIZED_KEY = "b-isaf:miniplayer:minimized:v8";

type DragState = { offsetX: number; offsetY: number };

type ModernSliderProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (nextValue: number) => void;
  ariaLabel: string;
  keyboardStep?: number;
};

function ModernSlider({
  value,
  min = 0,
  max,
  onChange,
  ariaLabel,
  keyboardStep = 5,
}: ModernSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const safeMax = Math.max(min + 0.000001, max);
  const safeValue = clamp(value, min, safeMax);
  const pct = ((safeValue - min) / (safeMax - min)) * 100;

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const ratio = rect.width ? x / rect.width : 0;
    onChange(min + ratio * (safeMax - min));
  };

  return (
    <div
      ref={trackRef}
      className="relative h-4 w-full select-none"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
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
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onChange(clamp(safeValue - keyboardStep, min, safeMax));
        if (e.key === "ArrowRight") onChange(clamp(safeValue + keyboardStep, min, safeMax));
      }}
    >
      <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/10" />
      <div
        className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
        style={{ width: `${pct}%` }}
      />
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
    volume,
    setVolume,
    toggle,
    stop,
    seek,
  } = useAudioPlayer();

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [hasPosition, setHasPosition] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [isMinimized, setIsMinimized] = useState(false);
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);

  const safeDuration = Math.max(0, duration || 0);
  const safeCurrent = clamp(currentTime || 0, 0, safeDuration || 0);
  const timeLeft = safeDuration ? Math.max(0, safeDuration - safeCurrent) : 0;

  const jumpSeconds = (delta: number) => {
    if (!safeDuration) return;
    seek(clamp(safeCurrent + delta, 0, safeDuration));
  };

  const toggleMute = () => {
    if (isMuted || volume === 0) {
      setVolume(prevVolume || 0.7);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Carregar preferências
  useEffect(() => {
    if (!track || hasLoadedPrefs) return;

    try {
      const savedMin = localStorage.getItem(MINIMIZED_KEY);
      if (savedMin != null) setIsMinimized(savedMin === "1");
    } catch {
      // ignore
    } finally {
      setHasLoadedPrefs(true);
    }
  }, [track, hasLoadedPrefs]);

  // Persistir preferências
  useEffect(() => {
    if (!track || !hasLoadedPrefs) return;
    try {
      localStorage.setItem(MINIMIZED_KEY, isMinimized ? "1" : "0");
    } catch {
      // ignore
    }
  }, [track, isMinimized, hasLoadedPrefs]);

  // Restaurar posição
  useEffect(() => {
    if (!track || hasPosition) return;

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
      const w = rect?.width ?? (isMinimized ? 320 : 420);
      const h = rect?.height ?? (isMinimized ? 72 : 380);

      const x = Math.max(8, (window.innerWidth - w) / 2);
      const y = Math.max(8, window.innerHeight - h - 12);

      setPosition({ x, y });
      setHasPosition(true);
    }, 0);

    return () => window.clearTimeout(t);
  }, [track, hasPosition, isMinimized]);

  // Persistir posição
  useEffect(() => {
    if (!track || !hasPosition) return;
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(position));
    } catch {
      // ignore
    }
  }, [track, position, hasPosition]);

  // Limitar posição à viewport
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
  }, [track, isMinimized]);

  // Drag
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      if (!panelRef.current || !dragRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();

      const nextX = e.clientX - dragRef.current.offsetX;
      const nextY = e.clientY - dragRef.current.offsetY;

      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;

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

  const glassBtn =
    "rounded-xl bg-white/5 ring-1 ring-white/10 text-slate-200 hover:bg-white/10 transition active:scale-[0.97]";
  const iconBtn = `inline-flex h-10 w-10 items-center justify-center ${glassBtn}`;
  const primaryBtn =
    "inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition active:scale-[0.97]";

  const containerStyle = {
    left: position.x,
    top: position.y,
  };

  const containerClassName = [
    "fixed z-[90] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl",
    "w-[min(420px,calc(100vw-16px))]",
    isMinimized ? "w-[min(320px,calc(100vw-16px))]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={panelRef} style={containerStyle} className={containerClassName}>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div
          className="flex min-w-0 flex-1 items-center gap-2 select-none cursor-move"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            if (e.button !== 0 || !panelRef.current) return;
            const rect = panelRef.current.getBoundingClientRect();
            dragRef.current = {
              offsetX: e.clientX - rect.left,
              offsetY: e.clientY - rect.top,
            };
            setIsDragging(true);
          }}
        >
          <GripVertical size={16} className="shrink-0 text-slate-500" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-200">
              {track.title}
            </p>
            {!isMinimized && (
              <p className="truncate text-[10px] text-slate-500">
                {[track.discipline, track.chapter, track.topic].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {!isMinimized && (
          <p className="shrink-0 text-[11px] tabular-nums text-slate-400">
            {formatTime(safeCurrent)}
            <span className="text-slate-600">/</span>
            {safeDuration ? formatTime(safeDuration) : "--:--"}
          </p>
        )}

        <button
          type="button"
          onClick={() => setIsMinimized((v) => !v)}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label={isMinimized ? "Expandir" : "Minimizar"}
          title={isMinimized ? "Expandir" : "Minimizar"}
        >
          {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <button
          type="button"
          onClick={stop}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-red-400"
          aria-label="Fechar"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Minimized */}
      {isMinimized ? (
        <div className="px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
              {track.coverUrl ? (
                <Image src={track.coverUrl} alt="" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Volume2 size={18} className="text-slate-500" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{track.title}</p>
              <p className="truncate text-xs text-slate-400">
                {[track.discipline, track.chapter, track.topic].filter(Boolean).join(" · ")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void toggle()}
              className={iconBtn}
              aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
          </div>
        </div>
      ) : (
        /* Expanded */
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
              {track.coverUrl ? (
                <Image src={track.coverUrl} alt="" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Volume2 size={20} className="text-slate-500" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{track.title}</p>
              <p className="truncate text-xs text-slate-400">
                {[track.discipline, track.chapter, track.topic].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] tabular-nums text-slate-500">
              <span>{formatTime(safeCurrent)}</span>
              <span>-{safeDuration ? formatTime(timeLeft) : "--:--"}</span>
            </div>

            <ModernSlider
              value={safeCurrent}
              min={0}
              max={Math.max(1, safeDuration)}
              onChange={(v) => seek(v)}
              ariaLabel="Progresso do áudio"
              keyboardStep={5}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => jumpSeconds(-15)}
              className={iconBtn}
              aria-label="Voltar 15 segundos"
              title="Voltar 15 segundos"
            >
              <SkipBack size={18} />
            </button>

            <button
              type="button"
              onClick={() => void toggle()}
              className={primaryBtn}
              aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => jumpSeconds(15)}
              className={iconBtn}
              aria-label="Avançar 15 segundos"
              title="Avançar 15 segundos"
            >
              <SkipForward size={18} />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleMute}
              className="shrink-0 text-slate-400 transition hover:text-white"
              aria-label={isMuted || volume === 0 ? "Ativar som" : "Silenciar"}
              title={isMuted || volume === 0 ? "Ativar som" : "Silenciar"}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <ModernSlider
              value={isMuted ? 0 : volume}
              min={0}
              max={1}
              onChange={(v) => {
                setVolume(v);
                if (v > 0) setIsMuted(false);
              }}
              ariaLabel="Volume"
              keyboardStep={0.05}
            />
          </div>
        </div>
      )}
    </div>
  );
}