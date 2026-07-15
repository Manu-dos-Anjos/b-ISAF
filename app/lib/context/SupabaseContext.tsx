// app/lib/context/SupabaseContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/client";

/* ================================================================
   TIPOS
   ================================================================ */

type SupabaseContextValue = {
  supabase:  any;
  user:      User    | null;
  session:   Session | null;
  isLoading: boolean;
};

/* ================================================================
   CONTEXTO
   ================================================================ */

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

/* ================================================================
   PROVIDER
   ================================================================ */

export function SupabaseProvider({ children }: { children: ReactNode }) {
  // Cliente criado uma única vez por render do Provider
  const [supabase] = useState(() => createClient());

  const [user,      setUser]      = useState<User    | null>(null);
  const [session,   setSession]   = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carregar sessão actual ao montar
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const { session } = data;
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listener para mudanças de auth (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={{ supabase, user, session, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

/* ================================================================
   HOOK
   ================================================================ */

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error("useSupabase() deve ser usado dentro de <SupabaseProvider>");
  return ctx;
}
