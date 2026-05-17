"use client";

import { SupabaseProvider } from "@/app/lib/context/SupabaseContext";
import { AudioPlayerProvider } from "@/app/lib/context/AudioPlayerContext";
import MiniPlayer from "@/app/components/audio/MiniPlayer";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <AudioPlayerProvider>
        {children}
        <MiniPlayer />
      </AudioPlayerProvider>
    </SupabaseProvider>
  );
}
