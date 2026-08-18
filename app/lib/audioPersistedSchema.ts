export type Persisted = {
  version: number;
  track: {
    id: string;
    title: string;
    url: string;
    discipline?: string;
    chapter?: string;
    topic?: string;
    coverUrl?: string;
  } | null;
  time: number;
  volume: number;
  wasPlaying: boolean;
  playbackRate?: number;
};

export const PERSISTED_VERSION = 2;

function isValidTrack(t: unknown): t is NonNullable<Persisted["track"]> {
  if (!t || typeof t !== "object") return false;
  const track = t as Record<string, unknown>;
  return (
    typeof track.id === "string" &&
    track.id.length > 0 &&
    typeof track.title === "string" &&
    typeof track.url === "string" &&
    /^https?:\/\//.test(track.url)
  );
}

export function isValidPersisted(data: unknown): data is Persisted {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  if (d.version !== PERSISTED_VERSION) return false;
  if (d.track !== null && !isValidTrack(d.track)) return false;
  if (typeof d.time !== "number" || d.time < 0 || !Number.isFinite(d.time)) return false;
  if (typeof d.volume !== "number" || d.volume < 0 || d.volume > 1) return false;
  if (typeof d.wasPlaying !== "boolean") return false;
  if (
    d.playbackRate !== undefined &&
    (typeof d.playbackRate !== "number" || d.playbackRate < 0.5 || d.playbackRate > 2)
  ) {
    return false;
  }
  return true;
}