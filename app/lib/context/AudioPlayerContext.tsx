"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
};

type AudioPlayerApi = {
  track: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;

  play: (track: AudioTrack, opts?: { startAt?: number }) => Promise<void>;
  toggle: () => Promise<void>;
  pause: () => void;
  stop: () => void;

  seek: (time: number) => void;
  setVolume: (v: number) => void;
};

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

const STORAGE_KEY = "b-isaf:audio:player:v1";

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, _setVolume] = useState(0.9);
  const [hasRestored, setHasRestored] = useState(false);

  // cria 1 elemento de áudio global
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

  // restore: faixa + tempo + volume + “estava a tocar”
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

      if (parsed.track?.url) {
        setTrack(parsed.track);
        audio.src = parsed.track.url;

        const restoredTime =
          typeof parsed.time === "number" ? Math.max(0, parsed.time) : 0;

        // esperar metadata antes de setar currentTime (mais consistente)
        const setTime = () => {
          try {
            audio.currentTime = restoredTime;
            setCurrentTime(restoredTime);
          } catch {
            // ignore
          }
        };

        // se metadata já carregou, seta já
        if (audio.readyState >= 1) {
          setTime();
        } else {
          audio.addEventListener("loadedmetadata", setTime, { once: true });
        }

        // tentar retomar se estava a tocar
        if (parsed.wasPlaying) {
          // tentativa após um micro delay
          setTimeout(async () => {
            try {
              await audio.play();
            } catch {
              // autoplay pode ser bloqueado -> utilizador clica play
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

  // persistir estado (frequente mas leve)
  useEffect(() => {
    const data: Persisted = {
      track,
      time: currentTime,
      volume,
      wasPlaying: isPlaying,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [track, currentTime, volume, isPlaying]);

  // persistir também no refresh/fechar tab (garante último segundo)
  useEffect(() => {
    const onBeforeUnload = () => {
      const data: Persisted = {
        track,
        time: audioRef.current?.currentTime ?? currentTime,
        volume,
        wasPlaying: !audioRef.current?.paused,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [track, currentTime, volume]);

  const setVolume = (v: number) => {
    const next = clamp(v, 0, 1);
    _setVolume(next);
    if (audioRef.current) audioRef.current.volume = next;
  };

  const play = async (nextTrack: AudioTrack, opts?: { startAt?: number }) => {
    const audio = audioRef.current;
    if (!audio) return;

    const sameTrack = track?.id === nextTrack.id && track?.url === nextTrack.url;

    setTrack(nextTrack);

    if (!sameTrack) {
      audio.src = nextTrack.url;
      const startAt = opts?.startAt ?? 0;

      // set time quando metadata estiver pronta
      const setTime = () => {
        try {
          audio.currentTime = startAt;
          setCurrentTime(startAt);
        } catch {}
      };

      if (audio.readyState >= 1) setTime();
      else audio.addEventListener("loadedmetadata", setTime, { once: true });
    }

    try {
      await audio.play();
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
      play,
      toggle,
      pause,
      stop,
      seek,
      setVolume,
    }),
    [track, isPlaying, currentTime, duration, volume]
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