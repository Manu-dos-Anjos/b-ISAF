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
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { useSupabase } from "@/app/lib/context/SupabaseContext";

import {
  isValidPersisted,
  PERSISTED_VERSION,
  type Persisted,
} from "@/app/lib/audioPersistedSchema";

import {
  safeGet,
  safeSet,
  purgeLegacyKeys,
} from "@/app/lib/safeLocalStorage";

import {
  writeProgressPayload,
  flushProgressQueue,
  type ProgressPayload,
} from "@/app/lib/progressPendingSync";

/* =========================================================
   TIPOS
========================================================= */

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
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;

  play: (
    track: AudioTrack,
    opts?: { startAt?: number }
  ) => Promise<void>;

  toggle: () => Promise<void>;

  pause: () => void;

  stop: () => void;

  seek: (time: number) => void;

  setVolume: (v: number) => void;

  setPlaybackRate: (rate: number) => void;
};

const AudioPlayerContext =
  createContext<AudioPlayerApi | null>(null);

/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "b-isaf:audio:player:v2";

const LEGACY_KEY_PREFIXES = [
  "b-isaf:audio:player:",
];

/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const MIN_RATE = 0.7;
const MAX_RATE = 1.3;

const PROGRESS_SAVE_INTERVAL = 5;

const PROGRESS_RETRY_DELAY = 1000;

const MAX_PROGRESS_RETRIES = 5;

/* =========================================================
   HELPERS
========================================================= */

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizeTrack(
  t: AudioTrack
): AudioTrack {
  return {
    ...t,

    discipline: t.discipline?.trim()
      ? t.discipline.trim()
      : undefined,

    chapter: t.chapter?.trim()
      ? t.chapter.trim()
      : undefined,

    topic: t.topic?.trim()
      ? t.topic.trim()
      : undefined,
  };
}

/* =========================================================
   PROVIDER
========================================================= */

export function AudioPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  const { supabase } = useSupabase();

  /* =======================================================
     USER / AUTH
  ======================================================= */

  const [userId, setUserId] =
    useState<string | null>(null);

  const [authReady, setAuthReady] =
    useState(false);

  /**
   * Obtém a sessão sem lançar
   * AuthSessionMissingError.
   *
   * getSession() retorna:
   *
   * { session: null }
   *
   * quando o utilizador ainda não está autenticado.
   */
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn(
            "⚠️ Não foi possível obter a sessão:",
            error.message
          );

          if (mounted) {
            setUserId(null);
            setAuthReady(true);
          }

          return;
        }

        if (!mounted) {
          return;
        }

        const uid =
          data.session?.user?.id ?? null;

        setUserId(uid);
        setAuthReady(true);
      } catch (error) {
        /**
         * Não deixamos um problema de autenticação
         * derrubar o AudioPlayer.
         */
        console.warn(
          "⚠️ Erro ao carregar sessão:",
          error
        );

        if (mounted) {
          setUserId(null);
          setAuthReady(true);
        }
      }
    };

    loadSession();

    /**
     * Mantém o userId sincronizado com
     * login/logout/refresh da sessão.
     */
    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          if (!mounted) {
            return;
          }

          const uid =
            session?.user?.id ?? null;

          setUserId(uid);
          setAuthReady(true);
        }
      );

    return () => {
      mounted = false;

      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  /* =======================================================
     STATE
  ======================================================= */

  const [track, setTrack] =
    useState<AudioTrack | null>(null);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const [volume, _setVolume] =
    useState(0.9);

  const [playbackRate, _setPlaybackRate] =
    useState(1);

  const [hasRestored, setHasRestored] =
    useState(false);

  /* =======================================================
     REFS
  ======================================================= */

  const userIdRef =
    useRef<string | null>(null);

  const trackRef =
    useRef<AudioTrack | null>(null);

  const lastSavedTimeRef =
    useRef(0);

  const retryTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const retryCountRef =
    useRef(0);

  const saveProgressRef =
    useRef<() => Promise<void>>(
      async () => {}
    );

  /* =======================================================
     SINCRONIZAÇÃO DOS REFS
  ======================================================= */

  useEffect(() => {
    userIdRef.current = userId;

    /**
     * Quando fazemos logout, cancelamos
     * qualquer retry pendente.
     */
    if (!userId) {
      retryCountRef.current = 0;

      if (retryTimerRef.current) {
        clearTimeout(
          retryTimerRef.current
        );

        retryTimerRef.current = null;
      }
    }
  }, [userId]);

  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  /* =======================================================
     BUILD PAYLOAD
  ======================================================= */

  const buildPayload =
    useCallback((): ProgressPayload | null => {
      const audio =
        audioRef.current;

      const uid =
        userIdRef.current;

      const currentTrack =
        trackRef.current;

      /**
       * Sem utilizador não há nada para guardar.
       *
       * IMPORTANTE:
       * Não fazemos retry neste caso.
       */
      if (!uid) {
        return null;
      }

      if (!audio) {
        return null;
      }

      if (!currentTrack?.id) {
        return null;
      }

      const audioDuration =
        audio.duration;

      if (
        !Number.isFinite(audioDuration) ||
        audioDuration <= 0
      ) {
        return null;
      }

      const current =
        Number.isFinite(
          audio.currentTime
        )
          ? Math.max(
              0,
              audio.currentTime
            )
          : 0;

      const progressPercent =
        clamp(
          Math.round(
            (current /
              audioDuration) *
              100
          ),
          0,
          100
        );

      const completed =
        progressPercent >= 100;

      return {
        student_id: uid,

        content_id:
          currentTrack.id,

        progress_percent:
          progressPercent,

        last_position_seconds:
          Math.floor(current),

        completed,

        completed_at: completed
          ? new Date().toISOString()
          : null,

        updated_at:
          new Date().toISOString(),
      };
    }, []);

  /* =======================================================
     RETRY
  ======================================================= */

  const scheduleProgressRetry =
    useCallback(() => {
      /**
       * Sem utilizador não fazemos retry.
       *
       * O onAuthStateChange vai atualizar o
       * userId quando a sessão aparecer.
       */
      if (!userIdRef.current) {
        return;
      }

      if (retryTimerRef.current) {
        return;
      }

      if (
        retryCountRef.current >=
        MAX_PROGRESS_RETRIES
      ) {
        console.warn(
          "⚠️ Número máximo de retries de progresso atingido."
        );

        retryCountRef.current = 0;

        return;
      }

      retryCountRef.current += 1;

      retryTimerRef.current =
        setTimeout(() => {
          retryTimerRef.current =
            null;

          saveProgressRef.current?.();
        }, PROGRESS_RETRY_DELAY);
    }, []);

  /* =======================================================
     SAVE PROGRESS
  ======================================================= */

  const saveProgress =
    useCallback(async () => {
      /**
       * Sem autenticação não tentamos guardar.
       */
      if (!userIdRef.current) {
        return;
      }

      const payload =
        buildPayload();

      if (!payload) {
        /**
         * Só fazemos retry se houver utilizador.
         */
        scheduleProgressRetry();

        return;
      }

      retryCountRef.current = 0;

      try {
        const success =
          await writeProgressPayload(
            supabase,
            payload
          );

        if (!success) {
          console.warn(
            "⚠️ Progresso não foi guardado. Foi colocado na fila."
          );
        }
      } catch (error) {
        console.error(
          "❌ Erro inesperado ao guardar progresso:",
          error
        );
      }
    }, [
      buildPayload,
      scheduleProgressRetry,
      supabase,
    ]);

  useEffect(() => {
    saveProgressRef.current =
      saveProgress;
  }, [saveProgress]);

  /* =======================================================
     FLUSH DA FILA
  ======================================================= */

  useEffect(() => {
    if (!authReady || !userId) {
      return;
    }

    flushProgressQueue(supabase);

    const interval =
      setInterval(() => {
        flushProgressQueue(supabase);
      }, 30000);

    const onOnline = () => {
      flushProgressQueue(supabase);
    };

    window.addEventListener(
      "online",
      onOnline
    );

    return () => {
      clearInterval(interval);

      window.removeEventListener(
        "online",
        onOnline
      );
    };
  }, [
    authReady,
    userId,
    supabase,
  ]);

  /* =======================================================
     SETUP DO AUDIO
  ======================================================= */

  useEffect(() => {
    const audio =
      new Audio();

    audio.preload =
      "metadata";

    audioRef.current =
      audio;

    /* ---------------------------------------------------
       GUARD
    --------------------------------------------------- */

    const guarded =
      (fn: () => void) =>
      () => {
        try {
          fn();
        } catch (error) {
          console.error(
            "❌ Erro num listener do audio player:",
            error
          );
        }
      };

    /* ---------------------------------------------------
       TIME UPDATE
    --------------------------------------------------- */

    const onTime = () => {
      const time =
        Number.isFinite(
          audio.currentTime
        )
          ? audio.currentTime
          : 0;

      setCurrentTime(time);

      const elapsedSinceLastSave =
        time -
        lastSavedTimeRef.current;

      if (
        time > 0 &&
        elapsedSinceLastSave >=
          PROGRESS_SAVE_INTERVAL
      ) {
        lastSavedTimeRef.current =
          time;

        saveProgressRef.current?.();
      }
    };

    /* ---------------------------------------------------
       METADATA
    --------------------------------------------------- */

    const onMeta = () => {
      const d =
        audio.duration;

      if (
        Number.isFinite(d) &&
        d > 0
      ) {
        setDuration(d);

        if (
          audio.currentTime > 0
        ) {
          saveProgressRef.current?.();
        }
      }
    };

    /* ---------------------------------------------------
       PLAY
    --------------------------------------------------- */

    const onPlay = () => {
      setIsPlaying(true);
    };

    /* ---------------------------------------------------
       PAUSE
    --------------------------------------------------- */

    const onPause = () => {
      setIsPlaying(false);

      saveProgressRef.current?.();
    };

    /* ---------------------------------------------------
       ENDED
    --------------------------------------------------- */

    const onEnded = () => {
      setIsPlaying(false);
    };

    /* ---------------------------------------------------
       LISTENERS
    --------------------------------------------------- */

    audio.addEventListener(
      "timeupdate",
      guarded(onTime)
    );

    audio.addEventListener(
      "loadedmetadata",
      guarded(onMeta)
    );

    audio.addEventListener(
      "play",
      guarded(onPlay)
    );

    audio.addEventListener(
      "pause",
      guarded(onPause)
    );

    audio.addEventListener(
      "ended",
      guarded(onEnded)
    );

    /* ---------------------------------------------------
       CLEANUP
    --------------------------------------------------- */

    return () => {
      audio.pause();

      audio.removeAttribute(
        "src"
      );

      audio.load();

      if (
        retryTimerRef.current
      ) {
        clearTimeout(
          retryTimerRef.current
        );

        retryTimerRef.current =
          null;
      }

      audioRef.current =
        null;
    };
  }, []);

  /* =======================================================
     RESTAURAÇÃO DO PLAYER
  ======================================================= */

  useEffect(() => {
    if (hasRestored) {
      return;
    }

    const audio =
      audioRef.current;

    if (!audio) {
      return;
    }

    purgeLegacyKeys(
      STORAGE_KEY,
      LEGACY_KEY_PREFIXES
    );

    const raw =
      safeGet(STORAGE_KEY);

    if (
      !raw ||
      !isValidPersisted(raw)
    ) {
      setHasRestored(true);
      return;
    }

    const parsed =
      raw as Persisted;

    try {
      /* -------------------------------------------------
         VOLUME
      ------------------------------------------------- */

      const restoredVolume =
        clamp(
          parsed.volume,
          0,
          1
        );

      _setVolume(
        restoredVolume
      );

      audio.volume =
        restoredVolume;

      /* -------------------------------------------------
         PLAYBACK RATE
      ------------------------------------------------- */

      const restoredRate =
        clamp(
          parsed.playbackRate ??
            1,
          MIN_RATE,
          MAX_RATE
        );

      _setPlaybackRate(
        restoredRate
      );

      audio.playbackRate =
        restoredRate;

      /* -------------------------------------------------
         TRACK
      ------------------------------------------------- */

      if (parsed.track) {
        const cleanTrack =
          sanitizeTrack(
            parsed.track
          );

        setTrack(
          cleanTrack
        );

        trackRef.current =
          cleanTrack;

        audio.src =
          cleanTrack.url;

        const restoredTime =
          Math.max(
            0,
            parsed.time
          );

        const setTime =
          () => {
            try {
              audio.currentTime =
                restoredTime;

              setCurrentTime(
                restoredTime
              );

              audio.playbackRate =
                restoredRate;

              lastSavedTimeRef.current =
                restoredTime;
            } catch {
              // ignore
            }
          };

        if (
          audio.readyState >=
          1
        ) {
          setTime();
        } else {
          audio.addEventListener(
            "loadedmetadata",
            setTime,
            {
              once: true,
            }
          );
        }

        /* -----------------------------------------------
           RESTAURAR PLAY
        ----------------------------------------------- */

        if (
          parsed.wasPlaying
        ) {
          setTimeout(
            async () => {
              try {
                await audio.play();

                audio.playbackRate =
                  restoredRate;
              } catch {
                setIsPlaying(
                  false
                );
              }
            },
            150
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ Erro ao restaurar estado do player:",
        error
      );

      safeSet(
        STORAGE_KEY,
        null
      );
    } finally {
      setHasRestored(true);
    }
  }, [hasRestored]);

  /* =======================================================
     PERSISTÊNCIA LOCAL
  ======================================================= */

  useEffect(() => {
    const data: Persisted = {
      version:
        PERSISTED_VERSION,

      track,

      time:
        currentTime,

      volume,

      wasPlaying:
        isPlaying,

      playbackRate,
    };

    safeSet(
      STORAGE_KEY,
      data
    );
  }, [
    track,
    currentTime,
    volume,
    isPlaying,
    playbackRate,
  ]);

  /* =======================================================
     BEFORE UNLOAD
  ======================================================= */

  useEffect(() => {
    const onBeforeUnload =
      () => {
        const data: Persisted = {
          version:
            PERSISTED_VERSION,

          track,

          time:
            audioRef.current
              ?.currentTime ??
            currentTime,

          volume,

          wasPlaying:
            !audioRef.current
              ?.paused,

          playbackRate,
        };

        safeSet(
          STORAGE_KEY,
          data
        );

        /**
         * Apenas tenta guardar se
         * houver utilizador autenticado.
         */
        if (userIdRef.current) {
          saveProgressRef.current?.();
        }
      };

    window.addEventListener(
      "beforeunload",
      onBeforeUnload
    );

    return () =>
      window.removeEventListener(
        "beforeunload",
        onBeforeUnload
      );
  }, [
    track,
    currentTime,
    volume,
    playbackRate,
  ]);

  /* =======================================================
     VISIBILITY CHANGE
  ======================================================= */

  useEffect(() => {
    const onVisibility =
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          if (userIdRef.current) {
            saveProgressRef.current?.();
          }
        }
      };

    document.addEventListener(
      "visibilitychange",
      onVisibility
    );

    return () =>
      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );
  }, []);

  /* =======================================================
     PAGEHIDE
  ======================================================= */

  useEffect(() => {
    const onPageHide =
      () => {
        if (userIdRef.current) {
          saveProgressRef.current?.();
        }
      };

    window.addEventListener(
      "pagehide",
      onPageHide
    );

    return () =>
      window.removeEventListener(
        "pagehide",
        onPageHide
      );
  }, []);

  /* =======================================================
     ENDED — GRAVA 100%
  ======================================================= */

  useEffect(() => {
    if (
      !track?.id ||
      !userId
    ) {
      return;
    }

    const audio =
      audioRef.current;

    if (!audio) {
      return;
    }

    const onEnded =
      async () => {
        const uid =
          userIdRef.current;

        const currentTrack =
          trackRef.current;

        const currentAudio =
          audioRef.current;

        if (
          !uid ||
          !currentTrack?.id ||
          !currentAudio
        ) {
          return;
        }

        const audioDuration =
          Number.isFinite(
            currentAudio.duration
          )
            ? currentAudio.duration
            : 0;

        if (
          audioDuration <= 0
        ) {
          return;
        }

        const payload: ProgressPayload =
          {
            student_id:
              uid,

            content_id:
              currentTrack.id,

            progress_percent:
              100,

            last_position_seconds:
              Math.floor(
                audioDuration
              ),

            completed:
              true,

            completed_at:
              new Date().toISOString(),

            updated_at:
              new Date().toISOString(),
          };

        await writeProgressPayload(
          supabase,
          payload
        );

        lastSavedTimeRef.current =
          audioDuration;
      };

    audio.addEventListener(
      "ended",
      onEnded
    );

    return () => {
      audio.removeEventListener(
        "ended",
        onEnded
      );
    };
  }, [
    track?.id,
    userId,
    supabase,
  ]);

  /* =======================================================
     SET VOLUME
  ======================================================= */

  const setVolume =
    (value: number) => {
      const next =
        clamp(
          value,
          0,
          1
        );

      _setVolume(next);

      if (
        audioRef.current
      ) {
        audioRef.current.volume =
          next;
      }
    };

  /* =======================================================
     SET PLAYBACK RATE
  ======================================================= */

  const setPlaybackRate =
    (rate: number) => {
      const next =
        clamp(
          rate,
          MIN_RATE,
          MAX_RATE
        );

      _setPlaybackRate(
        next
      );

      if (
        audioRef.current
      ) {
        audioRef.current.playbackRate =
          next;
      }
    };

  /* =======================================================
     PLAY
  ======================================================= */

  const play =
    async (
      nextTrack: AudioTrack,
      opts?: {
        startAt?: number;
      }
    ) => {
      const audio =
        audioRef.current;

      if (!audio) {
        return;
      }

      const cleanTrack =
        sanitizeTrack(
          nextTrack
        );

      const previousTrack =
        trackRef.current;

      const sameTrack =
        previousTrack?.id ===
          cleanTrack.id &&
        previousTrack?.url ===
          cleanTrack.url;

      /* ---------------------------------------------------
         NOVO TRACK
      --------------------------------------------------- */

      if (!sameTrack) {
        /**
         * IMPORTANTE:
         *
         * Guardamos primeiro o áudio anterior.
         *
         * Antes havia um bug onde:
         *
         * setTrack(cleanTrack)
         * trackRef.current = cleanTrack
         *
         * aconteciam antes do saveProgress().
         *
         * Isso fazia o save olhar para o NOVO áudio.
         */
        if (
          previousTrack?.id
        ) {
          await saveProgressRef.current?.();
        }

        audio.pause();

        audio.src =
          cleanTrack.url;

        audio.preload =
          "metadata";

        audio.playbackRate =
          playbackRate;

        setTrack(
          cleanTrack
        );

        trackRef.current =
          cleanTrack;

        setDuration(0);

        const startAt =
          Math.max(
            0,
            opts?.startAt ??
              0
          );

        lastSavedTimeRef.current =
          startAt;

        retryCountRef.current =
          0;

        if (
          retryTimerRef.current
        ) {
          clearTimeout(
            retryTimerRef.current
          );

          retryTimerRef.current =
            null;
        }

        const setTime =
          () => {
            try {
              if (
                Number.isFinite(
                  audio.duration
                ) &&
                audio.duration > 0
              ) {
                audio.currentTime =
                  Math.min(
                    startAt,
                    audio.duration
                  );
              } else {
                audio.currentTime =
                  startAt;
              }

              setCurrentTime(
                audio.currentTime
              );

              audio.playbackRate =
                playbackRate;
            } catch (error) {
              console.warn(
                "⚠️ Não foi possível definir posição inicial:",
                error
              );
            }
          };

        if (
          audio.readyState >=
          1
        ) {
          setTime();
        } else {
          audio.addEventListener(
            "loadedmetadata",
            setTime,
            {
              once: true,
            }
          );
        }
      }

      /* ---------------------------------------------------
         PLAY
      --------------------------------------------------- */

      try {
        await audio.play();

        audio.playbackRate =
          playbackRate;

        setIsPlaying(true);

        /**
         * Tentativa inicial de guardar.
         *
         * Se a sessão já existir, funciona.
         * Caso contrário, simplesmente não faz nada.
         */
        setTimeout(() => {
          if (userIdRef.current) {
            saveProgressRef.current?.();
          }
        }, 3000);
      } catch (error) {
        console.error(
          "❌ Erro ao iniciar áudio:",
          error
        );

        setIsPlaying(false);
      }
    };

  /* =======================================================
     PAUSE
  ======================================================= */

  const pause =
    () => {
      audioRef.current?.pause();
    };

  /* =======================================================
     TOGGLE
  ======================================================= */

  const toggle =
    async () => {
      const audio =
        audioRef.current;

      if (
        !audio ||
        !track
      ) {
        return;
      }

      if (
        audio.paused
      ) {
        try {
          await audio.play();

          audio.playbackRate =
            playbackRate;

          setIsPlaying(true);
        } catch (error) {
          console.error(
            "❌ Erro ao retomar áudio:",
            error
          );
        }
      } else {
        audio.pause();
      }
    };

  /* =======================================================
     STOP
  ======================================================= */

  const stop =
    () => {
      const audio =
        audioRef.current;

      if (!audio) {
        return;
      }

      /**
       * Guarda o áudio atual antes de
       * limpar o track.
       */
      if (userIdRef.current) {
        saveProgressRef.current?.();
      }

      audio.pause();

      audio.removeAttribute(
        "src"
      );

      audio.load();

      setTrack(null);

      trackRef.current =
        null;

      setCurrentTime(0);

      setDuration(0);

      setIsPlaying(false);

      lastSavedTimeRef.current =
        0;

      retryCountRef.current =
        0;

      if (
        retryTimerRef.current
      ) {
        clearTimeout(
          retryTimerRef.current
        );

        retryTimerRef.current =
          null;
      }
    };

  /* =======================================================
     SEEK
  ======================================================= */

  const seek =
    (time: number) => {
      const audio =
        audioRef.current;

      if (!audio) {
        return;
      }

      const next =
        Math.max(
          0,
          time
        );

      try {
        audio.currentTime =
          next;

        setCurrentTime(
          next
        );
      } catch {
        // ignore
      }
    };

  /* =======================================================
     API
  ======================================================= */

  const value =
    useMemo<AudioPlayerApi>(
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
      [
        track,
        isPlaying,
        currentTime,
        duration,
        volume,
        playbackRate,
      ]
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AudioPlayerContext.Provider
      value={value}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useAudioPlayer() {
  const ctx =
    useContext(
      AudioPlayerContext
    );

  if (!ctx) {
    throw new Error(
      "useAudioPlayer deve ser usado dentro de AudioPlayerProvider"
    );
  }

  return ctx;
}