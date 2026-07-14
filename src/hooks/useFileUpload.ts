// hooks/useFileUpload.ts
"use client";

import { useState } from "react";
import type { UploadType } from "@/app/lib/r2";

type UploadResult = {
  publicUrl: string;
  key: string;
};

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const upload = async (
    file:          File,
    type:          UploadType = "audio",
    disciplineId = "unknown"
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("file",          file);
      body.append("type",          type);
      body.append("disciplineId",  disciplineId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as any)?.error ?? "Upload falhou.");
      }

      return (await res.json()) as UploadResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
}