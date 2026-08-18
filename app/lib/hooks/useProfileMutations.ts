// app/lib/hooks/useProfileMutations.ts
"use client";

import { useCallback } from "react";

export function useProfileMutations() {
  const handleProfileSave = useCallback(async (payload: {
    fullName: string;
    bio?: string | null;
  }) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Falha ao atualizar perfil");
    }

    return res.json();
  }, []);

  const handleAvatarUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "avatar");
    formData.append("disciplineId", "profile");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Falha no upload");
    }

    const data = await res.json();
    
    // Atualizar o perfil no Supabase com a nova URL
    const profileRes = await fetch("/api/profile/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: data.publicUrl }),
    });

    if (!profileRes.ok) {
      throw new Error("Falha ao atualizar avatar no perfil");
    }

    return data.publicUrl;
  }, []);

  return { handleProfileSave, handleAvatarUpload };
}