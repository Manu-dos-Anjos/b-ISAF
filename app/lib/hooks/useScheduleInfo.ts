// app/lib/hooks/useScheduleInfo.ts
"use client";

import { useMemo } from "react";
import type { DisciplineRow }         from "@/app/lib/hooks/useDisciplines";
import type { DisciplineScheduleInfo } from "@/app/(app)/disciplinas/DisciplineCard";
import type { WeeklySlot }            from "@/app/components/meu-curso/MeuCursoPage";

const DAYS_ORDER = [
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
] as const;

type Day = (typeof DAYS_ORDER)[number];

const DAY_INDEX: Record<Day, number> = {
  Segunda: 0,
  Terça:   1,
  Quarta:  2,
  Quinta:  3,
  Sexta:   4,
  Sábado:  5,
};

/* ================================================================
   HELPERS
   ================================================================ */

function normalizeText(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function disciplineNamesMatch(a: string, b: string) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/* ================================================================
   AGRUPAR SLOTS CONSECUTIVOS
   ================================================================ */

type SlotBlock = {
  day:       string;
  startTime: string;
  endTime:   string;
  room?:     string;
  type:      WeeklySlot["type"];
};

function groupConsecutiveSlots(slots: WeeklySlot[]): SlotBlock[] {
  if (slots.length === 0) return [];

  const sorted = [...slots].sort((a, b) => {
    const da = DAY_INDEX[a.day as Day] ?? 0;
    const db = DAY_INDEX[b.day as Day] ?? 0;
    if (da !== db) return da - db;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  const blocks: SlotBlock[] = [];
  let current   = sorted[0]!;
  let blockStart = current.startTime;
  let blockEnd   = current.endTime;
  let blockDay   = current.day;
  let blockRoom  = current.room;
  let blockType  = current.type;

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]!;

    const sameDay       = next.day === blockDay;
    const gapMinutes    = timeToMinutes(next.startTime) - timeToMinutes(blockEnd);
    const isConsecutive = sameDay && gapMinutes >= 0 && gapMinutes <= 10;

    if (isConsecutive) {
      blockEnd = next.endTime;
    } else {
      blocks.push({
        day:       blockDay,
        startTime: blockStart,
        endTime:   blockEnd,
        room:      blockRoom,
        type:      blockType,
      });
      blockStart = next.startTime;
      blockEnd   = next.endTime;
      blockDay   = next.day;
      blockRoom  = next.room;
      blockType  = next.type;
    }

    current = next;
  }

  blocks.push({
    day:       blockDay,
    startTime: blockStart,
    endTime:   blockEnd,
    room:      blockRoom,
    type:      blockType,
  });

  return blocks;
}

/* ================================================================
   PRÓXIMA AULA
   ================================================================ */

function getNextClass(slots: WeeklySlot[]): DisciplineScheduleInfo["nextClass"] {
  if (slots.length === 0) return null;

  const blocks = groupConsecutiveSlots(slots);

  const now        = new Date();
  const todayJs    = now.getDay();
  const todayIdx   = todayJs === 0 ? 6 : todayJs - 1;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const sortedBlocks = [...blocks].sort((a, b) => {
    const da = DAY_INDEX[a.day as Day] ?? 0;
    const db = DAY_INDEX[b.day as Day] ?? 0;
    if (da !== db) return da - db;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  for (const block of sortedBlocks) {
    const di         = DAY_INDEX[block.day as Day] ?? 0;
    const blockStart = timeToMinutes(block.startTime);

    if (di === todayIdx && blockStart > nowMinutes) {
      return {
        day:       block.day,
        startTime: block.startTime,
        endTime:   block.endTime,
        room:      block.room,
        type:      block.type,
      };
    }

    if (di > todayIdx) {
      return {
        day:       block.day,
        startTime: block.startTime,
        endTime:   block.endTime,
        room:      block.room,
        type:      block.type,
      };
    }
  }

  // Wraparound — próxima semana
  const first = sortedBlocks[0];
  if (first) {
    return {
      day:       first.day,
      startTime: first.startTime,
      endTime:   first.endTime,
      room:      first.room,
      type:      first.type,
    };
  }

  return null;
}

/* ================================================================
   HOOK PRINCIPAL
   ================================================================ */

export function useScheduleInfo(
  disciplines: DisciplineRow[],
  schedule:    WeeklySlot[]
): Map<string, DisciplineScheduleInfo> {
  return useMemo(() => {
    const map = new Map<string, DisciplineScheduleInfo>();

    for (const disc of disciplines) {
      // Filtrar slots desta disciplina
      const slots = schedule.filter((slot) =>
        disciplineNamesMatch(slot.discipline, disc.name)
      );

      // Só exibe docentes informados no horário do estudante.
      // O professor cadastrado na disciplina pode estar desatualizado.
      const professorFromSchedule =
        slots.find((s) => s.professor?.trim())?.professor?.trim() ?? null;

      const professor = professorFromSchedule;

      // Próxima aula
      const nextClass = getNextClass(slots);

      map.set(disc.id, { professor, nextClass });
    }

    return map;
  }, [disciplines, schedule]);
}