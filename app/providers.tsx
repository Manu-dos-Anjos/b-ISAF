"use client";

import { SupabaseProvider } from "@/app/lib/context/SupabaseContext";
import { UserProvider } from "@/app/lib/context/UserContext";
import { AudioPlayerProvider } from "@/app/lib/context/AudioPlayerContext";
import MiniPlayer from "@/app/components/audio/MiniPlayer";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <UserProvider>                  {/* ✅ NOVO — tem de vir antes do AudioPlayerProvider */}
        <AudioPlayerProvider>
          {children}
          <MiniPlayer />
        </AudioPlayerProvider>
      </UserProvider>
    </SupabaseProvider>
  );
}