// app/lib/hooks/useAdmin.ts
"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

/**
 * Lê o role do perfil autenticado uma única vez por sessão.
 * Devolve { isAdmin, loading } para gates de UI e rotas admin.
 */
export function useAdmin() {
  const { supabase } = useSupabase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) { setIsAdmin(false); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) {
           setIsAdmin(data?.role === "admin" || data?.role === "superadmin");
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [supabase]);

  return { isAdmin, loading };
}