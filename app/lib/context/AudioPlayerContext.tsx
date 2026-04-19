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

type AudioPlayerApi = {
  track: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number; // segundos
  duration: number; // segundos
  volume: number; // 0..1

  play: (track: AudioTrack, opts?: { startAt?: number }) => Promise<void>;
  toggle: () => Promise<void>;
  pause: () => void;
  stop: () => void;

  seek: (time: number) => void;
  setVolume: (v: number) => void;
};

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

const STORAGE_KEY = "b-isaf:miniplayer:v1";

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, _setVolume] = useState(0.9);

  // cria o elemento de áudio 1x e liga listeners
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

    audio.volume = volume;

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // restaura última faixa (opcional)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { track?: AudioTrack; time?: number };
      if (parsed.track?.url) {
        setTrack(parsed.track);
        setCurrentTime(parsed.time ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  // persistência simples
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ track, time: currentTime })
      );
    } catch {
      // ignore
    }
  }, [track, currentTime]);

  const setVolume = (v: number) => {
    const next = Math.min(1, Math.max(0, v));
    _setVolume(next);
    if (audioRef.current) audioRef.current.volume = next;
  };

  const play = async (nextTrack: AudioTrack, opts?: { startAt?: number }) => {
    const audio = audioRef.current;
    if (!audio) return;

    const sameTrack = track?.id === nextTrack.id && track?.url === nextTrack.url;

    // se for a mesma faixa e já está a tocar, apenas "toggle"
    if (sameTrack && !audio.paused) {
      audio.pause();
      return;
    }

    // se for uma faixa nova (ou estava pausado), carrega e toca
    setTrack(nextTrack);

    if (!sameTrack) {
      audio.src = nextTrack.url;
      try {
        // define startAt antes do play
        const startAt = opts?.startAt ?? 0;
        audio.currentTime = startAt;
        setCurrentTime(startAt);
      } catch {
        // alguns browsers podem falhar antes do metadata, ignoramos
      }
    } else {
      // mesma faixa, mas estava pausada
      // mantém currentTime
    }

    try {
      await audio.play();
    } catch {
      // autoplay pode ser bloqueado; o utilizador terá de clicar play
      setIsPlaying(false);
    }
  };

  const pause = () => {
    audioRef.current?.pause();
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!track) return;

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

    const next = Math.min(Math.max(0, time), duration || Number.MAX_SAFE_INTEGER);
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
  if (!ctx) {
    throw new Error("useAudioPlayer deve ser usado dentro de AudioPlayerProvider");
  }
  return ctx;
}