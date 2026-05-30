// app/lib/hooks/useSchedule.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/app/lib/context/SupabaseContext";
import { useUser }     from "@/app/lib/context/UserContext";
import type { WeeklySlot } from "@/app/components/meu-curso/MeuCursoPage";

/* ================================================================
   TIPO RAW — evita depender do Database type
   ================================================================ */
type ScheduleSlotRow = {
  id:              string;
  student_id:      string;
  course_id:       string;
  year:            number;
  semester:        number;
  day:             string;
  start_time:      string;
  end_time:        string;
  discipline:      string;
  discipline_slug: string | null;
  room:            string | null;
  professor:       string | null;
  type:            string;
  created_at:      string;
  updated_at:      string;
};

type ScheduleSlotInsert = {
  student_id:       string;
  course_id:        string;
  year:             number;
  semester:         number;
  day:              string;
  start_time:       string;
  end_time:         string;
  discipline:       string;
  discipline_slug?: string | null;
  room?:            string | null;
  professor?:       string | null;
  type:             string;
  updated_at?:      string;
};

/* ================================================================
   TIPO DE RETORNO
   ================================================================ */
type UseScheduleReturn = {
  schedule:     WeeklySlot[];
  isLoading:    boolean;
  isSaving:     boolean;
  error:        string | null;
  saveSchedule: (slots: WeeklySlot[]) => Promise<void>;
  refetch:      () => void;
};

/* ================================================================
   HOOK
   ================================================================ */
export function useSchedule(): UseScheduleReturn {
  const { supabase, user } = useSupabase();
  const { profile }        = useUser();

  const [schedule,  setSchedule]  = useState<WeeklySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  /* ── LOAD ─────────────────────────────────────────────────── */
  const fetchSchedule = useCallback(async () => {
    if (!user?.id || !profile?.course_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbErr } = await supabase
        .from("schedule_slots")
        .select("*")
        .eq("student_id", user.id)
        .eq("course_id",  profile.course_id)
        .eq("year",       profile.current_year)
        .eq("semester",   profile.current_semester)
        .order("day")
        .order("start_time");

      if (dbErr) throw dbErr;

      // Cast explícito — resolve o never quando o cliente não está tipado
      const rows = (data ?? []) as ScheduleSlotRow[];

      const slots: WeeklySlot[] = rows.map((row) => ({
        id:             row.id,
        day:            row.day            as WeeklySlot["day"],
        startTime:      row.start_time,
        endTime:        row.end_time,
        discipline:     row.discipline,
        disciplineSlug: row.discipline_slug ?? undefined,
        room:           row.room            ?? undefined,
        professor:      row.professor       ?? undefined,
        type:           row.type            as WeeklySlot["type"],
      }));

      setSchedule(slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar horário");
    } finally {
      setIsLoading(false);
    }
  }, [
    supabase,
    user?.id,
    profile?.course_id,
    profile?.current_year,
    profile?.current_semester,
  ]);

  useEffect(() => { void fetchSchedule(); }, [fetchSchedule]);

  /* ── SAVE ─────────────────────────────────────────────────── */
  const saveSchedule = useCallback(async (slots: WeeklySlot[]) => {
    if (!user?.id || !profile?.course_id) return;

    setIsSaving(true);
    setError(null);

    try {
      // 1. Apagar horário anterior
      const { error: delErr } = await supabase
        .from("schedule_slots")
        .delete()
        .eq("student_id", user.id)
        .eq("course_id",  profile.course_id)
        .eq("year",       profile.current_year)
        .eq("semester",   profile.current_semester);

      if (delErr) throw delErr;

      // 2. Inserir novos slots
      if (slots.length > 0) {
        const rows: ScheduleSlotInsert[] = slots.map((slot) => ({
          student_id:      user.id,
          course_id:       profile.course_id!,
          year:            profile.current_year,
          semester:        profile.current_semester,
          day:             slot.day,
          start_time:      slot.startTime,
          end_time:        slot.endTime,
          discipline:      slot.discipline,
          discipline_slug: slot.disciplineSlug ?? null,
          room:            slot.room            ?? null,
          professor:       slot.professor       ?? null,
          type:            slot.type,
          updated_at:      new Date().toISOString(),
        }));

        // Cast to any to avoid strict Table type inference (ScheduleSlotInsert[])
        const { error: insErr } = await supabase
          .from("schedule_slots")
          .insert(rows as unknown as any);

        if (insErr) throw insErr;
      }

      // 3. Actualizar estado local imediatamente
      setSchedule(slots);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar horário");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [
    supabase,
    user?.id,
    profile?.course_id,
    profile?.current_year,
    profile?.current_semester,
  ]);

  return {
    schedule,
    isLoading,
    isSaving,
    error,
    saveSchedule,
    refetch: fetchSchedule,
  };
}