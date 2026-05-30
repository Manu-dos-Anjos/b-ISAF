// app/lib/hooks/useBreadcrumbDiscipline.ts
"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

type Result = {
  name: string | null;
  isLoading: boolean;
};

// Cache em memória para não fazer fetch repetido durante a sessão
const cache = new Map<string, string>();

export function useBreadcrumbDiscipline(disciplineId: string | null): Result {
  const { supabase } = useSupabase();
  const [name,      setName]      = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!disciplineId) return;

    // Se já está em cache, usa imediatamente
    if (cache.has(disciplineId)) {
      setName(cache.get(disciplineId)!);
      return;
    }

    async function fetch() {
      setIsLoading(true);
      try {
        const response = await supabase
          .from("disciplines")
          .select("name")
          .eq("id", disciplineId!)
          .single();

        // garantir tipo compatível para TypeScript
        const data = response.data as { name?: string } | null;

        if (data?.name) {
          cache.set(disciplineId!, data.name);
          setName(data.name);
        }
      } catch {
        // silencioso — o breadcrumb mostra o ID como fallback
      } finally {
        setIsLoading(false);
      }
    }

    void fetch();
  }, [supabase, disciplineId]);

  return { name, isLoading };
}