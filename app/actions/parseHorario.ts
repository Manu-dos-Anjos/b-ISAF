"use server";

import "server-only";

/* ================================================================
   TIPOS EXPORTADOS
================================================================ */
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

/* ================================================================
   CONSTANTES DO ISAF
================================================================ */
const DAYS_MAP: Record<string, ParsedSlot["day"]> = {
  segunda: "Segunda",
  "segunda-feira": "Segunda",
  terca: "Terça",
  "terca-feira": "Terça",
  terça: "Terça",
  "terça-feira": "Terça",
  quarta: "Quarta",
  "quarta-feira": "Quarta",
  quinta: "Quinta",
  "quinta-feira": "Quinta",
  sexta: "Sexta",
  "sexta-feira": "Sexta",
  sabado: "Sábado",
  sábado: "Sábado",
};

const ISAF_PERIODS: { start: string; end: string }[] = [
  { start: "07:30", end: "08:20" },
  { start: "08:20", end: "09:10" },
  { start: "09:20", end: "10:10" },
  { start: "10:10", end: "11:00" },
  { start: "11:10", end: "12:00" },
  { start: "12:00", end: "12:50" },
  { start: "13:00", end: "13:50" },
  { start: "13:50", end: "14:40" },
  { start: "14:50", end: "15:40" },
  { start: "15:40", end: "16:30" },
  { start: "16:40", end: "17:30" },
  { start: "18:00", end: "18:45" },
  { start: "18:45", end: "19:30" },
  { start: "19:40", end: "20:25" },
  { start: "20:30", end: "21:15" },
  { start: "21:15", end: "22:00" },
  { start: "22:05", end: "22:50" },
];

const TYPE_KEYWORDS: { keywords: string[]; type: ParsedSlot["type"] }[] = [
  {
    keywords: [
      "teórico-prática",
      "teorico-pratica",
      "teórico prática",
      "teorico pratica",
      " tp ",
      "(tp)",
    ],
    type: "Teórico-Prática",
  },
  {
    keywords: ["prática", "pratica", "laboratório", "laboratorio", " lab"],
    type: "Prática",
  },
  {
    keywords: ["teórica", "teorica"],
    type: "Teórica",
  },
];

/* ================================================================
   HELPERS
================================================================ */
function normalizeStr(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseTime(raw: string): string | null {
  const cleaned = raw.replace(/[hH]/g, ":").replace(".", ":");
  const m = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function snapToISAFPeriod(
  start: string,
  end: string
): { start: string; end: string } | null {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const startMin = toMin(start);
  const endMin = toMin(end);

  let best: { start: string; end: string } | null = null;
  let bestDiff = Infinity;

  for (const p of ISAF_PERIODS) {
    const diff =
      Math.abs(toMin(p.start) - startMin) + Math.abs(toMin(p.end) - endMin);
    if (diff < bestDiff && diff <= 10) {
      bestDiff = diff;
      best = p;
    }
  }
  return best;
}

function detectType(text: string): ParsedSlot["type"] {
  const n = normalizeStr(text);
  for (const { keywords, type } of TYPE_KEYWORDS) {
    if (keywords.some((k) => n.includes(normalizeStr(k)))) return type;
  }
  return "Teórica";
}

function detectDay(text: string): ParsedSlot["day"] | null {
  const n = normalizeStr(text);
  for (const [key, day] of Object.entries(DAYS_MAP)) {
    if (n.includes(normalizeStr(key))) return day;
  }
  return null;
}

function extractRoom(text: string): string | undefined {
  const patterns = [
    /\bS\.?\s*(\d{2,3}[A-Z]?)\b/i,
    /\bSala\s+([A-Z0-9]{1,5})\b/i,
    /\bLab\.?\s*(\d{1,3})\b/i,
    /\bAudit[oó]rio\s+([A-Z0-9]{1,5})\b/i,
    /\b([A-Z]\d{2,3})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0].trim();
  }
  return undefined;
}

function cleanDisciplineName(raw: string): string {
  return raw
    .replace(/(\d{1,2}[h:.]\d{2})\s*[-–—]\s*(\d{1,2}[h:.]\d{2})/g, "")
    .replace(new RegExp(Object.keys(DAYS_MAP).join("|"), "gi"), "")
    .replace(/\bS\.?\s*\d{2,3}[A-Z]?\b/gi, "")
    .replace(/\bSala\s+[A-Z0-9]{1,5}\b/gi, "")
    .replace(/\b(Teórico-Prática|Teórica|Prática|TP|T|P)\b/gi, "")
    .replace(/[|\t,;:]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* ================================================================
   ESTRATÉGIA 1 — Tabela estruturada (colunas por dia)
================================================================ */
function parseTableFormat(lines: string[]): ParsedSlot[] {
  const slots: ParsedSlot[] = [];
  let counter = 0;

  let headerIdx = -1;
  const detectedDayOrder: ParsedSlot["day"][] = [];

  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const line = lines[i];
    const days = line
      .split(/[\t|,;]+/)
      .map((cell) => detectDay(cell))
      .filter(Boolean) as ParsedSlot["day"][];

    if (days.length >= 3) {
      headerIdx = i;
      detectedDayOrder.push(...days);
      break;
    }
  }

  if (headerIdx === -1 || detectedDayOrder.length === 0) return [];

  const timeRe = /(\d{1,2}[h:.]\d{2})\s*[-–—]\s*(\d{1,2}[h:.]\d{2})/;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = line.split(/[\t|]+/).map((c) => c.trim());
    if (cells.length < 2) continue;

    const timeMatch = cells[0].match(timeRe);
    if (!timeMatch) continue;

    const rawStart = parseTime(timeMatch[1]);
    const rawEnd = parseTime(timeMatch[2]);
    if (!rawStart || !rawEnd) continue;

    const snapped = snapToISAFPeriod(rawStart, rawEnd);
    const startTime = snapped?.start ?? rawStart;
    const endTime = snapped?.end ?? rawEnd;

    const contentCells = cells.slice(1);

    for (let d = 0; d < detectedDayOrder.length; d++) {
      const dayCell = contentCells[d];
      if (!dayCell || dayCell === "-" || dayCell === "—" || dayCell.length < 3)
        continue;

      const day = detectedDayOrder[d];
      const room = extractRoom(dayCell);
      const type = detectType(dayCell);
      const discipline = cleanDisciplineName(dayCell);

      if (discipline.length < 3) continue;

      slots.push({
        id: `slot-${counter++}`,
        day,
        startTime,
        endTime,
        discipline,
        room,
        type,
      });
    }
  }

  return slots;
}

/* ================================================================
   ESTRATÉGIA 2 — Uma linha por aula
================================================================ */
function parseLineFormat(lines: string[]): ParsedSlot[] {
  const slots: ParsedSlot[] = [];
  let counter = 0;
  const timeRe = /(\d{1,2}[h:.]\d{2})\s*[-–—]\s*(\d{1,2}[h:.]\d{2})/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.length < 10) continue;

    const timeMatch = line.match(timeRe);
    if (!timeMatch) continue;

    const rawStart = parseTime(timeMatch[1]);
    const rawEnd = parseTime(timeMatch[2]);
    if (!rawStart || !rawEnd) continue;

    const day = detectDay(line);
    if (!day) continue;

    const snapped = snapToISAFPeriod(rawStart, rawEnd);
    const startTime = snapped?.start ?? rawStart;
    const endTime = snapped?.end ?? rawEnd;

    const room = extractRoom(line);
    const type = detectType(line);
    const discipline = cleanDisciplineName(line);

    if (discipline.length < 3) continue;

    slots.push({
      id: `slot-${counter++}`,
      day,
      startTime,
      endTime,
      discipline,
      room,
      type,
    });
  }

  return slots;
}

/* ================================================================
   ESTRATÉGIA 3 — Blocos contextuais (várias linhas por aula)
================================================================ */
function parseContextualBlocks(lines: string[]): ParsedSlot[] {
  const slots: ParsedSlot[] = [];
  let counter = 0;
  const timeRe = /(\d{1,2}[h:.]\d{2})\s*[-–—]\s*(\d{1,2}[h:.]\d{2})/;

  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
      continue;
    }
    current.push(line.trim());
    if (current.length >= 6) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length > 0) blocks.push(current);

  for (const block of blocks) {
    const fullText = block.join(" ");
    const timeMatch = fullText.match(timeRe);
    if (!timeMatch) continue;

    const rawStart = parseTime(timeMatch[1]);
    const rawEnd = parseTime(timeMatch[2]);
    if (!rawStart || !rawEnd) continue;

    const day = detectDay(fullText);
    if (!day) continue;

    const snapped = snapToISAFPeriod(rawStart, rawEnd);
    const startTime = snapped?.start ?? rawStart;
    const endTime = snapped?.end ?? rawEnd;

    const room = extractRoom(fullText);
    const type = detectType(fullText);
    const discipline = cleanDisciplineName(fullText);

    if (discipline.length < 3) continue;

    slots.push({
      id: `slot-${counter++}`,
      day,
      startTime,
      endTime,
      discipline,
      room,
      type,
    });
  }

  return slots;
}

/* ================================================================
   ESTRATÉGIA 4 — Texto livre com regex combinada
================================================================ */
function parseFreeText(fullText: string): ParsedSlot[] {
  const slots: ParsedSlot[] = [];
  let counter = 0;

  const combined =
    /(segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado)[- \t]*feira?\s*[:\-]?\s*(\d{1,2}[h:.]\d{2})\s*[-–—]\s*(\d{1,2}[h:.]\d{2})\s*[:\-]?\s*([^\n]{3,80})/gi;

  let m: RegExpExecArray | null;
  while ((m = combined.exec(fullText)) !== null) {
    const day = detectDay(m[1]);
    if (!day) continue;

    const rawStart = parseTime(m[2]);
    const rawEnd = parseTime(m[3]);
    if (!rawStart || !rawEnd) continue;

    const snapped = snapToISAFPeriod(rawStart, rawEnd);
    const startTime = snapped?.start ?? rawStart;
    const endTime = snapped?.end ?? rawEnd;

    const room = extractRoom(m[4]);
    const type = detectType(m[4]);
    const discipline = cleanDisciplineName(m[4]);

    if (discipline.length < 3) continue;

    slots.push({
      id: `slot-${counter++}`,
      day,
      startTime,
      endTime,
      discipline,
      room,
      type,
    });
  }

  return slots;
}

/* ================================================================
   DEDUPLICAÇÃO
================================================================ */
function deduplicateSlots(slots: ParsedSlot[]): ParsedSlot[] {
  const seen = new Set<string>();
  return slots.filter((s) => {
    const key = `${s.day}|${s.startTime}|${normalizeStr(s.discipline).slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ================================================================
   CARREGADOR PDF-PARSE
   — sem require() de caminhos internos (causa build error no Turbopack)
   — usa só o nome do pacote; o Next.js resolve via serverExternalPackages
================================================================ */
async function extractTextFromPDF(
  buffer: Buffer
): Promise<{ text: string; numpages: number }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod: unknown = require("pdf-parse");

  const fn =
    typeof mod === "function"
      ? (mod as (b: Buffer) => Promise<{ text: string; numpages: number }>)
      : typeof (mod as Record<string, unknown>)["default"] === "function"
      ? ((mod as Record<string, unknown>)["default"] as (
          b: Buffer
        ) => Promise<{ text: string; numpages: number }>)
      : null;

  if (!fn) {
    throw new Error(
      "pdf-parse não exporta uma função. Verifique a instalação: npm install pdf-parse"
    );
  }

  const result = await fn(buffer);
  return {
    text: result?.text ?? "",
    numpages: result?.numpages ?? 0,
  };
}

/* ================================================================
   SERVER ACTION PRINCIPAL
================================================================ */
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
    /* ── 1. Validação ── */
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return { success: false, error: "Nenhum ficheiro enviado." };
    }
    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      return { success: false, error: "O ficheiro deve ser um PDF." };
    }
    if (file.size > 20 * 1024 * 1024) {
      return {
        success: false,
        error: "Ficheiro demasiado grande (máx. 20 MB).",
      };
    }

    /* ── 2. Extracção do texto ── */
    const buffer = Buffer.from(await file.arrayBuffer());

    let text = "";
    let numpages = 0;

    try {
      const result = await extractTextFromPDF(buffer);
      text = result.text;
      numpages = result.numpages;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg };
    }

    if (!text.trim()) {
      return {
        success: false,
        error:
          "O PDF não contém texto seleccionável. Pode ser uma imagem digitalizada.",
        extractedText: "(vazio)",
      };
    }

    /* ── 3. Parse em cascata ── */
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let slots: ParsedSlot[] =
      parseTableFormat(lines).length > 0
        ? parseTableFormat(lines)
        : parseLineFormat(lines).length > 0
        ? parseLineFormat(lines)
        : parseContextualBlocks(lines).length > 0
        ? parseContextualBlocks(lines)
        : parseFreeText(text);

    slots = deduplicateSlots(slots);

    /* ── 4. Resultado ── */
    if (slots.length === 0) {
      return {
        success: false,
        error: `Nenhuma aula reconhecida (${numpages} pág., ${text.length} chars). Verifica se o PDF contém dias e horários visíveis.`,
        extractedText: text.slice(0, 3000),
      };
    }

    return {
      success: true,
      slots,
      extractedText: text.slice(0, 1000),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Erro inesperado: ${msg}`,
    };
  }
}