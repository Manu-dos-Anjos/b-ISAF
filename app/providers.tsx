"use client";

import { AudioPlayerProvider } from "@/app/lib/context/AudioPlayerContext";
import MiniPlayer from "@/app/components/audio/MiniPlayer";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AudioPlayerProvider>
      {children}
      <MiniPlayer />
    </AudioPlayerProvider>
  );
}