// app/lib/hooks/useBreadcrumbDiscipline.ts
"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

type Result = {
  name: string | null;
  code: string | null;
  isLoading: boolean;
};

// Cache em memória para não fazer fetch repetido durante a sessão
const cache = new Map<string, { name: string; code: string | null }>();

export function useBreadcrumbDiscipline(disciplineId: string | null): Result {
  const { supabase } = useSupabase();
  const [name,      setName]      = useState<string | null>(null);
  const [code,      setCode]      = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!disciplineId) return;

    // Se já está em cache, usa imediatamente
    if (cache.has(disciplineId)) {
      const cached = cache.get(disciplineId)!;
      // O cache em memória evita uma nova consulta ao Supabase.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(cached.name);
      setCode(cached.code);
      return;
    }

    async function fetch() {
      setIsLoading(true);
      try {
        const response = await supabase
          .from("disciplines")
          .select("name, code")
          .eq("id", disciplineId!)
          .single();

        // garantir tipo compatível para TypeScript
        const data = response.data as { name?: string; code?: string | null } | null;

        if (data?.name) {
          const result = { name: data.name, code: data.code?.trim() || null };
          cache.set(disciplineId!, result);
          setName(data.name);
          setCode(result.code);
        }
      } catch {
        // silencioso — o breadcrumb mostra o ID como fallback
      } finally {
        setIsLoading(false);
      }
    }

    void fetch();
  }, [supabase, disciplineId]);

  return { name, code, isLoading };
}