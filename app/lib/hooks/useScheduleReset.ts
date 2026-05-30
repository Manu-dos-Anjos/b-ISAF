// app/lib/hooks/useScheduleReset.ts
"use client";

import { useEffect } from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser }     from "@/app/lib/context/UserContext";

/* ================================================================
   SEMESTRES DO ISAF
   1º Semestre: Outubro → Fevereiro
   2º Semestre: Março   → Setembro
   ================================================================ */

type SemesterPeriod = {
  semester: 1 | 2;
  startMonth: number; // 1-based
};

const SEMESTER_PERIODS: SemesterPeriod[] = [
  { semester: 1, startMonth: 10 }, // Outubro
  { semester: 2, startMonth: 3  }, // Março
];

/**
 * Devolve o início do semestre actual como Date.
 * Exemplo: se hoje é Maio 2025 → semestre 2 começou em Março 2025
 *          se hoje é Novembro 2025 → semestre 1 começou em Outubro 2025
 */
function getCurrentSemesterStart(): Date {
  const now   = new Date();
  const month = now.getMonth() + 1; // 1-based
  const year  = now.getFullYear();

  // Semestre 1: Outubro (10) a Fevereiro (2)
  // Semestre 2: Março (3) a Setembro (9)
  if (month >= 10) {
    // Outubro a Dezembro → semestre 1 começou em Outubro deste ano
    return new Date(year, 9, 1); // mês 9 = Outubro (0-based)
  } else if (month >= 3) {
    // Março a Setembro → semestre 2 começou em Março deste ano
    return new Date(year, 2, 1); // mês 2 = Março (0-based)
  } else {
    // Janeiro e Fevereiro → semestre 1 começou em Outubro do ano anterior
    return new Date(year - 1, 9, 1);
  }
}

/* ================================================================
   HOOK
   ================================================================ */

export function useScheduleReset() {
  const { supabase, user } = useSupabase();
  const { profile, refreshProfile } = useUser();

  useEffect(() => {
    if (!user?.id || !profile) return;

    async function checkAndReset() {
      const semesterStart    = getCurrentSemesterStart();
      const lastReset        = profile!.schedule_reset_at
        ? new Date(profile!.schedule_reset_at)
        : null;

      // Se nunca foi feito reset, ou o último reset foi antes do início
      // do semestre actual → apagar o horário
      const needsReset = !lastReset || lastReset < semesterStart;

      if (!needsReset) return;

      try {
        // 1. Apagar horário do semestre anterior
        const { error: delErr } = await supabase
          .from("schedule_slots")
          .delete()
          .eq("student_id", user!.id);

        if (delErr) {
          console.error("[useScheduleReset] Erro ao apagar horário:", delErr);
          return;
        }

        // 2. Registar a data do reset no perfil
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ schedule_reset_at: new Date().toISOString() })
          .eq("id", user!.id);

        if (updateErr) {
          console.error("[useScheduleReset] Erro ao actualizar perfil:", updateErr);
          return;
        }

        // 3. Actualizar o contexto local
        await refreshProfile?.();

        console.info("[useScheduleReset] Horário do semestre anterior apagado.");
      } catch (err) {
        console.error("[useScheduleReset] Erro inesperado:", err);
      }
    }

    void checkAndReset();
  }, [user?.id, profile?.schedule_reset_at]);
}