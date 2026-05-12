// app/actions/parseHorario.ts
"use server";

import "server-only";

export type ParsedSlot = {
  id: string;
  day: "Segunda" | "Terça" | "Quarta" | "Quinta" | "Sexta" | "Sábado";
  startTime: string;
  endTime: string;
  discipline: string;
  room?: string;
  professor?: string;
  type: "Teórica" | "Prática" | "Teórico-Prática";
};

function normalizeDay(raw: string): ParsedSlot["day"] | null {
  const map: Record<string, ParsedSlot["day"]> = {
    segunda: "Segunda",
    terca: "Terça",
    terça: "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta",
    sabado: "Sábado",
    sábado: "Sábado",
  };
  return map[raw.toLowerCase().replace("-feira", "").trim()] ?? null;
}

function normalizeType(raw?: string): ParsedSlot["type"] {
  if (!raw) return "Teórica";
  const types: ParsedSlot["type"][] = ["Teórica", "Prática", "Teórico-Prática"];
  return (
    types.find((t) => t.toLowerCase() === raw.toLowerCase().trim()) ?? "Teórica"
  );
}

function parseScheduleText(text: string): ParsedSlot[] {
  const slots: ParsedSlot[] = [];
  const lines = text.replace(/\r\n/g, "\n").trim().split("\n");
  let currentDay: ParsedSlot["day"] | null = null;
  let idx = 0;

  const dayRegex = /(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado)(-feira)?/i;

  const pipeRegex =
    /(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})\s*\|\s*([^|]+?)(?:\s*\|\s*([^|]*?))?(?:\s*\|\s*([^|]*?))?(?:\s*\|\s*(Teórica|Prática|Teórico-Prática))?\s*$/i;

  const noPipeRegex = /(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})\s{2,}(.+)/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const dayMatch = line.match(dayRegex);
    if (dayMatch) {
      currentDay = normalizeDay(dayMatch[1]);
      continue;
    }

    if (!currentDay) continue;

    const pipeMatch = line.match(pipeRegex);
    if (pipeMatch) {
      const [, start, end, discipline, room, professor, type] = pipeMatch;
      slots.push({
        id: `parsed-${idx++}`,
        day: currentDay,
        startTime: start.trim(),
        endTime: end.trim(),
        discipline: discipline.trim(),
        room: room?.trim() || undefined,
        professor: professor?.trim() || undefined,
        type: normalizeType(type),
      });
      continue;
    }

    const noPipeMatch = line.match(noPipeRegex);
    if (noPipeMatch) {
      const [, start, end, rest] = noPipeMatch;
      const parts = rest.split(/\s{2,}|\t/).map((p) => p.trim()).filter(Boolean);
      slots.push({
        id: `parsed-${idx++}`,
        day: currentDay,
        startTime: start.trim(),
        endTime: end.trim(),
        discipline: parts[0] ?? "",
        room: parts[1] ?? undefined,
        professor: parts[2] ?? undefined,
        type: normalizeType(parts[3]),
      });
    }
  }

  return slots;
}

export async function parseHorarioPDF(
  _prevState: unknown,
  formData: FormData
): Promise<{
  success: boolean;
  slots?: ParsedSlot[];
  error?: string;
  extractedText?: string;
}> {
  try {
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return { success: false, error: "Nenhum ficheiro enviado." };
    }

    if (!file.type.includes("pdf")) {
      return { success: false, error: "O ficheiro deve ser um PDF." };
    }

    // Import dinâmico (melhor compatibilidade com Turbopack)
    const pdfModule = await import("pdf-parse");
    const pdfParse: any = (pdfModule as any).default ?? (pdfModule as any);

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text } = await pdfParse(buffer);

    if (!text?.trim()) {
      return {
        success: false,
        error: "O PDF não contém texto selecionável.",
      };
    }

    const slots = parseScheduleText(text);

    if (slots.length === 0) {
      return {
        success: false,
        error: "Nenhum horário encontrado. Verifica o formato do PDF.",
        extractedText: text,
      };
    }

    return { success: true, slots, extractedText: text };
  } catch (err: any) {
    console.error("parseHorarioPDF error:", err);
    return { success: false, error: `Erro ao processar PDF: ${err.message}` };
  }
}