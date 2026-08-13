"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

export type AudioTrack = {
  id: string;
  title: string;
  url: string;
  discipline?: string;
  chapter?: string;
  topic?: string;
  coverUrl?: string;
};

type Persisted = {
  track: AudioTrack | null;
  time: number;
  volume: number;
  wasPlaying: boolean;
  playbackRate?: number;
};

type AudioPlayerApi = {
  track: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;

  play: (track: AudioTrack, opts?: { startAt?: number }) => Promise<void>;
  toggle: () => Promise<void>;
  pause: () => void;
  stop: () => void;

  seek: (time: number) => void;
  setVolume: (v: number) => void;
  setPlaybackRate: (rate: number) => void;
};

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

const STORAGE_KEY = "b-isaf:audio:player:v1";

const MIN_RATE = 0.7;
const MAX_RATE = 1.3;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function sanitizeTrack(t: AudioTrack): AudioTrack {
  return {
    ...t,
    discipline: t.discipline?.trim() ? t.discipline.trim() : undefined,
    chapter: t.chapter?.trim() ? t.chapter.trim() : undefined,
    topic: t.topic?.trim() ? t.topic.trim() : undefined,
  };
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { supabase } = useSupabase();
  const [userId, setUserId] = useState<string | null>(null);

  // Busca o userId diretamente do Supabase Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        setUserId(data.user.id);
        console.log("✅ AudioPlayer: userId obtido:", data.user.id);
      } else {
        console.warn("⚠️ AudioPlayer: sem user autenticado");
      }
    });
  }, [supabase]);

  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, _setVolume] = useState(0.9);
  const [playbackRate, _setPlaybackRate] = useState(1);
  const [hasRestored, setHasRestored] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hasRestored) return;
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHasRestored(true);
        return;
      }

      const parsed = JSON.parse(raw) as Persisted;

      const restoredVolume =
        typeof parsed.volume === "number" ? clamp(parsed.volume, 0, 1) : 0.9;

      _setVolume(restoredVolume);
      audio.volume = restoredVolume;

      const restoredRate =
        typeof parsed.playbackRate === "number"
          ? clamp(parsed.playbackRate, MIN_RATE, MAX_RATE)
          : 1;

      _setPlaybackRate(restoredRate);
      audio.playbackRate = restoredRate;

      if (parsed.track?.url) {
        const cleanTrack = sanitizeTrack(parsed.track);

        setTrack(cleanTrack);
        audio.src = cleanTrack.url;
        audio.playbackRate = restoredRate;

        const restoredTime =
          typeof parsed.time === "number" ? Math.max(0, parsed.time) : 0;

        const setTime = () => {
          try {
            audio.currentTime = restoredTime;
            setCurrentTime(restoredTime);
            audio.playbackRate = restoredRate;
          } catch {
            // ignore
          }
        };

        if (audio.readyState >= 1) {
          setTime();
        } else {
          audio.addEventListener("loadedmetadata", setTime, { once: true });
        }

        if (parsed.wasPlaying) {
          setTimeout(async () => {
            try {
              await audio.play();
              audio.playbackRate = restoredRate;
            } catch {
              setIsPlaying(false);
            }
          }, 150);
        }
      }
    } catch {
      // ignore
    } finally {
      setHasRestored(true);
    }
  }, [hasRestored]);

  useEffect(() => {
    const data: Persisted = {
      track,
      time: currentTime,
      volume,
      wasPlaying: isPlaying,
      playbackRate,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [track, currentTime, volume, isPlaying, playbackRate]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const data: Persisted = {
        track,
        time: audioRef.current?.currentTime ?? currentTime,
        volume,
        wasPlaying: !audioRef.current?.paused,
        playbackRate,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [track, currentTime, volume, playbackRate]);

  // Gravar progresso a cada 10 segundos
  useEffect(() => {
    if (!track?.id || !userId || !isPlaying) return;

    const interval = setInterval(async () => {
      const audio = audioRef.current;

      console.log("🎵 AudioPlayer.saveProgress chamado:", {
        hasAudio: !!audio,
        trackId: track?.id,
        userId,
        currentTime: audio?.currentTime,
        duration: audio?.duration,
      });

      if (!audio || !audio.duration || audio.duration <= 0) {
        console.warn("⚠️ AudioPlayer: condições não cumpridas para gravar");
        return;
      }

      const progressPercent = Math.min(
        100,
        Math.round((audio.currentTime / audio.duration) * 100)
      );
      const completed = progressPercent >= 80;

      try {
        await supabase.from("student_progress").upsert(
          {
            student_id: userId,
            content_id: track.id,
            progress_percent: progressPercent,
            last_position_seconds: Math.floor(audio.currentTime),
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,content_id" }
        );
        console.log("✅ Progresso do áudio gravado com sucesso!");
      } catch (err) {
        console.error("❌ Erro ao gravar progresso do áudio:", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [track?.id, userId, isPlaying, supabase]);

  // Gravar quando o áudio termina
  useEffect(() => {
    if (!track?.id || !userId) return;

    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = async () => {
      try {
        await supabase.from("student_progress").upsert(
          {
            student_id: userId,
            content_id: track.id,
            progress_percent: 100,
            last_position_seconds: Math.floor(audio.duration || 0),
            completed: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,content_id" }
        );
        console.log("✅ Conclusão do áudio gravada com sucesso!");
      } catch (err) {
        console.error("❌ Erro ao gravar conclusão do áudio:", err);
      }
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [track?.id, userId, supabase]);

  const setVolume = (v: number) => {
    const next = clamp(v, 0, 1);
    _setVolume(next);
    if (audioRef.current) audioRef.current.volume = next;
  };

  const setPlaybackRate = (rate: number) => {
    const next = clamp(rate, MIN_RATE, MAX_RATE);
    _setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const play = async (nextTrack: AudioTrack, opts?: { startAt?: number }) => {
    const audio = audioRef.current;
    if (!audio) return;

    const cleanTrack = sanitizeTrack(nextTrack);
    const sameTrack = track?.id === cleanTrack.id && track?.url === cleanTrack.url;

    setTrack(cleanTrack);

    if (!sameTrack) {
      audio.src = cleanTrack.url;
      audio.playbackRate = playbackRate;
      const startAt = opts?.startAt ?? 0;

      const setTime = () => {
        try {
          audio.currentTime = startAt;
          setCurrentTime(startAt);
          audio.playbackRate = playbackRate;
        } catch {}
      };

      if (audio.readyState >= 1) setTime();
      else audio.addEventListener("loadedmetadata", setTime, { once: true });
    }

    try {
      await audio.play();
      audio.playbackRate = playbackRate;
    } catch {
      setIsPlaying(false);
    }
  };

  const pause = () => {
    audioRef.current?.pause();
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    if (audio.paused) {
      try {
        await audio.play();
        audio.playbackRate = playbackRate;
      } catch {
        // ignore
      }
    } else {
      audio.pause();
    }
  };

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.src = "";
    setTrack(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const next = Math.max(0, time);
    try {
      audio.currentTime = next;
      setCurrentTime(next);
    } catch {
      // ignore
    }
  };

  const value = useMemo<AudioPlayerApi>(
    () => ({
      track,
      isPlaying,
      currentTime,
      duration,
      volume,
      playbackRate,
      play,
      toggle,
      pause,
      stop,
      seek,
      setVolume,
      setPlaybackRate,
    }),
    [track, isPlaying, currentTime, duration, volume, playbackRate]
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer deve ser usado dentro de AudioPlayerProvider");
  return ctx;
}