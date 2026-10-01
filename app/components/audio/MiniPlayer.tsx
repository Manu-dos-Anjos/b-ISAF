// components/audio/MiniPlayer.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  EyeOff,
  GripVertical,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useAudioPlayer } from "@/app/lib/context/AudioPlayerContext";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { saveItem, removeSavedItem } from "@/app/actions/saved";

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const POS_KEY       = "b-isaf:miniplayer:pos:v8";
const MINIMIZED_KEY = "b-isaf:miniplayer:minimized:v8";
const VOLUME_KEY    = "b-isaf:miniplayer:volume:v8";
const HIDDEN_KEY    = "b-isaf:miniplayer:hidden:v8";
const RATE_KEY      = "b-isaf:miniplayer:rate:v8";

const SPEED_OPTIONS = [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3];

type DragState = { offsetX: number; offsetY: number };

type ModernSliderProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (nextValue: number) => void;
  ariaLabel: string;
  keyboardStep?: number;
  disabled?: boolean;
};

function ModernSlider({
  value,
  min = 0,
  max,
  onChange,
  ariaLabel,
  keyboardStep = 5,
  disabled = false,
}: ModernSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const safeMax   = Math.max(min + 0.000001, max);
  const safeValue = clamp(value, min, safeMax);
  const pct       = ((safeValue - min) / (safeMax - min)) * 100;

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect  = el.getBoundingClientRect();
    const x     = clamp(clientX - rect.left, 0, rect.width);
    const ratio = rect.width ? x / rect.width : 0;
    onChange(min + ratio * (safeMax - min));
  };

  return (
    <div
      ref={trackRef}
      className={`relative h-4 w-full select-none ${disabled ? "pointer-events-none opacity-50" : ""}`}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setFromClientX(e.clientX);

        const handleMove = (ev: PointerEvent) => setFromClientX(ev.clientX);
        const handleUp   = () => {
          window.removeEventListener("pointermove",  handleMove);
          window.removeEventListener("pointerup",    handleUp);
          window.removeEventListener("pointercancel", handleUp);
        };

        window.addEventListener("pointermove",  handleMove);
        window.addEventListener("pointerup",    handleUp);
        window.addEventListener("pointercancel", handleUp);
      }}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "ArrowLeft")  onChange(clamp(safeValue - keyboardStep, min, safeMax));
        if (e.key === "ArrowRight") onChange(clamp(safeValue + keyboardStep, min, safeMax));
      }}
    >
      <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-slate-300 dark:bg-white/10" />
      <div
        className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-md ring-2 ring-slate-400 dark:ring-black/30"
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
    playbackRate,
    setPlaybackRate,
    toggle,
    stop,
    seek,
  } = useAudioPlayer();

  const { supabase } = useSupabase();

  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef  = useRef<DragState | null>(null);

  const [position,    setPosition]    = useState({ x: 16, y: 16 });
  const [hasPosition, setHasPosition] = useState(false);
  const [isDragging,  setIsDragging]  = useState(false);

  const [isMinimized,    setIsMinimized]    = useState(false);
  const [isHidden,       setIsHidden]       = useState(false);
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);

  const [isMuted,    setIsMuted]    = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);

  const [studentId,     setStudentId]     = useState<string | null>(null);
  const [isSaved,       setIsSaved]       = useState(false);
  const [isSavingToggle, setIsSavingToggle] = useState(false);

  // ===================== TRACKING DE PROGRESSO DO ÁUDIO =====================
  const saveTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTimeRef = useRef<number>(0);

  const saveAudioProgress = useCallback(async (
    trackId: string,
    currentTimeSec: number,
    durationSec: number,
    sid: string,
  ) => {
    if (!sid || !trackId || durationSec <= 0) return;

    const pct       = Math.min(100, Math.round((currentTimeSec / durationSec) * 100));
    const completed = pct >= 90;

    try {
      await supabase.from("student_progress").upsert(
        {
          student_id:           sid,
          content_id:           trackId,
          progress_percent:     pct,
          last_position_seconds: Math.round(currentTimeSec),
          completed,
          completed_at:  completed ? new Date().toISOString() : null,
          updated_at:    new Date().toISOString(),
        },
        { onConflict: "student_id,content_id" }
      );
      lastSavedTimeRef.current = currentTimeSec;
    } catch (err) {
      console.error("Erro ao guardar progresso do áudio:", err);
    }
  }, [supabase]);

  // Grava quando o utilizador avança 5s, com debounce de 3s
  useEffect(() => {
    if (!track?.id || !isPlaying || duration <= 0 || !studentId) return;

    const diff = Math.abs(currentTime - lastSavedTimeRef.current);
    if (diff < 5) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      void saveAudioProgress(track.id, currentTime, duration, studentId);
    }, 3000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [currentTime, isPlaying, track?.id, duration, studentId, saveAudioProgress]);

  // Grava ao fechar a página
  useEffect(() => {
    if (!track?.id || !studentId || duration <= 0) return;

    const onUnload = () => {
      void saveAudioProgress(track.id, currentTime, duration, studentId);
    };

    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [track?.id, currentTime, duration, studentId, saveAudioProgress]);

  // Reset do lastSavedTime quando muda de faixa
  useEffect(() => {
    lastSavedTimeRef.current = 0;
  }, [track?.id]);
  // =========================================================================

  const safeDuration = Math.max(0, duration || 0);
  const safeCurrent  = clamp(currentTime || 0, 0, safeDuration || 0);
  const timeLeft     = safeDuration ? Math.max(0, safeDuration - safeCurrent) : 0;
  const isBuffering  = !!track && safeDuration === 0;

  const cycleSpeed = () => {
    const idx  = SPEED_OPTIONS.findIndex((s) => Math.abs(s - playbackRate) < 0.001);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length] ?? 1;
    setPlaybackRate(next);
  };

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

  // Obter studentId do Supabase auth
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }: { data: { user: { id?: string } | null } }) => {
      if (!cancelled) setStudentId(data.user?.id ?? null);
    });
    return () => { cancelled = true; };
  }, [supabase]);

  // Verificar se a faixa está guardada
  useEffect(() => {
    if (!track || !studentId) { setIsSaved(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("saved_items")
        .select("id")
        .eq("student_id", studentId)
        .eq("content_id", track.id)
        .maybeSingle();
      if (!cancelled) setIsSaved(!!data?.id);
    })();
    return () => { cancelled = true; };
  }, [track?.id, studentId, supabase]);

  const toggleSave = async () => {
    if (!studentId || !track) return;
    setIsSavingToggle(true);
    try {
      if (isSaved) {
        const { data } = await (supabase as any)
          .from("saved_items")
          .select("id")
          .eq("student_id", studentId)
          .eq("content_id", track.id)
          .maybeSingle();
        if (data?.id) await removeSavedItem(data.id);
        setIsSaved(false);
      } else {
        await saveItem(studentId, track.id);
        setIsSaved(true);
      }
    } finally {
      setIsSavingToggle(false);
    }
  };

  // Carregar preferências
  useEffect(() => {
    if (!track || hasLoadedPrefs) return;
    try {
      const savedMin = localStorage.getItem(MINIMIZED_KEY);
      if (savedMin != null) setIsMinimized(savedMin === "1");

      const savedHidden = localStorage.getItem(HIDDEN_KEY);
      if (savedHidden != null) setIsHidden(savedHidden === "1");

      const savedVol = localStorage.getItem(VOLUME_KEY);
      if (savedVol != null) {
        const v = Number(savedVol);
        if (Number.isFinite(v) && v >= 0 && v <= 1) setVolume(v);
      }

      const savedRate = localStorage.getItem(RATE_KEY);
      if (savedRate != null) {
        const r = Number(savedRate);
        if (Number.isFinite(r) && SPEED_OPTIONS.some((s) => Math.abs(s - r) < 0.001))
          setPlaybackRate(r);
      }
    } catch {
      // ignore
    } finally {
      setHasLoadedPrefs(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, hasLoadedPrefs]);

  // Persistir preferências
  useEffect(() => {
    if (!track || !hasLoadedPrefs) return;
    try { localStorage.setItem(MINIMIZED_KEY, isMinimized ? "1" : "0"); } catch { /* ignore */ }
  }, [track, isMinimized, hasLoadedPrefs]);

  useEffect(() => {
    if (!track || !hasLoadedPrefs) return;
    try { localStorage.setItem(HIDDEN_KEY, isHidden ? "1" : "0"); } catch { /* ignore */ }
  }, [track, isHidden, hasLoadedPrefs]);

  useEffect(() => {
    if (!track || !hasLoadedPrefs) return;
    try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* ignore */ }
  }, [track, volume, hasLoadedPrefs]);

  useEffect(() => {
    if (!track || !hasLoadedPrefs) return;
    try { localStorage.setItem(RATE_KEY, String(playbackRate)); } catch { /* ignore */ }
  }, [track, playbackRate, hasLoadedPrefs]);

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
      const w    = rect?.width  ?? (isMinimized ? 320 : 420);
      const h    = rect?.height ?? (isMinimized ? 72  : 380);
      const x    = Math.max(8, (window.innerWidth - w) / 2);
      const y    = Math.max(8, window.innerHeight - h - 12);
      setPosition({ x, y });
      setHasPosition(true);
    }, 0);

    return () => window.clearTimeout(t);
  }, [track, hasPosition, isMinimized]);

  // Persistir posição
  useEffect(() => {
    if (!track || !hasPosition) return;
    try { localStorage.setItem(POS_KEY, JSON.stringify(position)); } catch { /* ignore */ }
  }, [track, position, hasPosition]);

  // Limitar posição à viewport
  useEffect(() => {
    if (!track) return;
    const clampToViewport = () => {
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      const maxX = window.innerWidth  - rect.width  - 8;
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
      const maxX  = window.innerWidth  - rect.width  - 8;
      const maxY  = window.innerHeight - rect.height - 8;
      setPosition({
        x: clamp(nextX, 8, Math.max(8, maxX)),
        y: clamp(nextY, 8, Math.max(8, maxY)),
      });
    };
    const onUp = () => { setIsDragging(false); dragRef.current = null; };
    window.addEventListener("pointermove",   onMove);
    window.addEventListener("pointerup",     onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove",   onMove);
      window.removeEventListener("pointerup",     onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging]);

  if (!track) return null;

  if (isHidden) {
    return (
      <button
        type="button"
        onClick={() => setIsHidden(false)}
        className="fixed bottom-4 right-4 z-[90] flex items-center gap-2 rounded-full border-2 border-slate-300 bg-white px-3 py-2.5 shadow-2xl shadow-slate-400/50 backdrop-blur-xl transition hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-slate-950/90 dark:shadow-black/40 dark:hover:bg-slate-900/90"
        title="Mostrar leitor de áudio"
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${isPlaying ? "bg-blue-600" : "bg-slate-100 dark:bg-white/10"}`}>
          {isPlaying ? (
            <Pause size={14} className="text-white" />
          ) : (
            <Play size={14} className="ml-0.5 text-slate-600 dark:text-white" />
          )}
        </span>
        <span className="max-w-[140px] truncate text-xs font-medium text-slate-700 dark:text-slate-200">
          {track.title}
        </span>
      </button>
    );
  }

  const glassBtn =
    "rounded-xl bg-slate-100 ring-1 ring-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/5 dark:ring-white/10 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white transition active:scale-[0.97]";

  const iconBtn = `inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center ${glassBtn}`;

  const primaryBtn =
    "inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition active:scale-[0.97]";

  const containerClassName = [
    "fixed z-[90] overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-2xl shadow-slate-400/50 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 dark:shadow-black/40",
    isMinimized
      ? "w-[min(300px,calc(100vw-16px))] sm:w-[min(320px,calc(100vw-16px))]"
      : "w-[min(400px,calc(100vw-16px))] sm:w-[min(420px,calc(100vw-16px))]",
  ].join(" ");

  return (
    <div
      ref={panelRef}
      style={{ left: position.x, top: position.y }}
      className={containerClassName}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-white/10">
        <div
          className="flex min-w-0 flex-1 cursor-move select-none items-center gap-2"
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
          <GripVertical size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-200">
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
          <p className={`flex shrink-0 items-center gap-1 text-[11px] tabular-nums ${isBuffering ? "text-slate-400 dark:text-slate-600" : "text-slate-500 dark:text-slate-400"}`}>
            {isBuffering ? (
              <><Loader2 size={11} className="animate-spin" />A carregar…</>
            ) : (
              <>{formatTime(safeCurrent)}<span className="text-slate-400 dark:text-slate-600">/</span>{formatTime(safeDuration)}</>
            )}
          </p>
        )}

        <button
          type="button"
          onClick={() => void toggleSave()}
          disabled={isSavingToggle || !studentId}
          className={`rounded-xl p-2 transition disabled:opacity-40 ${isSaved ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/15" : "text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-amber-400"}`}
          aria-label={isSaved ? "Remover dos guardados" : "Guardar para mais tarde"}
        >
          {isSavingToggle ? <Loader2 size={16} className="animate-spin" /> : <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />}
        </button>

        <button type="button" onClick={() => setIsHidden(true)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Ocultar">
          <EyeOff size={16} />
        </button>

        <button type="button" onClick={() => setIsMinimized((v) => !v)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white" aria-label={isMinimized ? "Expandir" : "Minimizar"}>
          {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <button type="button" onClick={stop} className="rounded-xl p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-red-400" aria-label="Fechar">
          <X size={16} />
        </button>
      </div>

      {/* MINIMIZADO */}
      {isMinimized ? (
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
              {track.coverUrl ? (
                <Image src={track.coverUrl} alt="" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Volume2 size={16} className="text-slate-400 dark:text-slate-500" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{track.title}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {[track.discipline, track.chapter, track.topic].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button type="button" onClick={cycleSpeed} className="inline-flex h-8 items-center justify-center rounded-xl bg-slate-100 px-2.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-300 transition hover:bg-slate-200 hover:text-slate-900 active:scale-[0.97] dark:bg-white/5 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-white">
              {playbackRate}x
            </button>
            <button type="button" onClick={() => void toggle()} className={iconBtn} aria-label={isPlaying ? "Pausar" : "Reproduzir"}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
          </div>
        </div>
      ) : (
        /* EXPANDIDO */
        <div className="flex flex-col gap-3.5 px-3.5 py-3.5 sm:px-4 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5 sm:h-14 sm:w-14">
              {track.coverUrl ? (
                <Image src={track.coverUrl} alt="" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Volume2 size={20} className="text-slate-400 dark:text-slate-500" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{track.title}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {[track.discipline, track.chapter, track.topic].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] tabular-nums text-slate-500">
              <span>{formatTime(safeCurrent)}</span>
              <span className={`flex items-center gap-1 ${isBuffering ? "text-slate-400 dark:text-slate-600" : ""}`}>
                {isBuffering ? (
                  <><Loader2 size={11} className="animate-spin" />A carregar…</>
                ) : (`-${formatTime(timeLeft)}`)}
              </span>
            </div>
            <ModernSlider
              value={safeCurrent}
              min={0}
              max={Math.max(1, safeDuration)}
              onChange={(v) => seek(v)}
              ariaLabel="Progresso do áudio"
              keyboardStep={5}
              disabled={isBuffering}
            />
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <button type="button" onClick={() => jumpSeconds(-15)} className={iconBtn} disabled={isBuffering} aria-label="Voltar 15 segundos">
              <SkipBack size={18} />
            </button>
            <button type="button" onClick={() => void toggle()} className={primaryBtn} aria-label={isPlaying ? "Pausar" : "Reproduzir"}>
              {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </button>
            <button type="button" onClick={() => jumpSeconds(15)} className={iconBtn} disabled={isBuffering} aria-label="Avançar 15 segundos">
              <SkipForward size={18} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1">
              {SPEED_OPTIONS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  className={[
                    "h-8 min-w-[2.5rem] rounded-xl px-1.5 text-[11px] font-semibold transition active:scale-[0.97]",
                    Math.abs(playbackRate - rate) < 0.001
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20"
                      : "bg-slate-100 text-slate-600 ring-1 ring-slate-300 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-white",
                  ].join(" ")}
                  aria-pressed={Math.abs(playbackRate - rate) < 0.001}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={toggleMute} className="shrink-0 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" aria-label={isMuted || volume === 0 ? "Ativar som" : "Silenciar"}>
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <ModernSlider
              value={isMuted ? 0 : volume}
              min={0}
              max={1}
              onChange={(v) => { setVolume(v); if (v > 0) setIsMuted(false); }}
              ariaLabel="Volume"
              keyboardStep={0.05}
            />
          </div>
        </div>
      )}
    </div>
  );
}