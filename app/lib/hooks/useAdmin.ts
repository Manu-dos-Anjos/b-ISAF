// app/lib/hooks/useAdmin.ts
"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";

export type UserRole = "student" | "professor" | "admin" | "superadmin";

const ADMIN_ROLE_SET = new Set<UserRole>(["admin", "superadmin"]);

/**
 * Lê o role do perfil autenticado uma única vez por sessão.
 * Devolve { isAdmin, loading } para gates de UI e rotas admin.
 */
export function useAdmin() {
  const { supabase } = useSupabase();
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setRole(null);
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const nextRole = (data?.role as UserRole | undefined) ?? null;

      if (!cancelled) {
        setRole(nextRole);
        setIsAdmin(nextRole ? ADMIN_ROLE_SET.has(nextRole) : false);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [supabase]);

  return {
    role,
    isAdmin,
    isSuperAdmin: role === "superadmin",
    loading,
    canManageUsers: isAdmin,
    canManageEvents: isAdmin,
    canManageDisciplinas: isAdmin,
    canManageRegulamentos: isAdmin,
    canManageFeedback: isAdmin,
    canManagePermissions: role === "superadmin",
  };
}