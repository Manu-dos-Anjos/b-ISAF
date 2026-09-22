// app/lib/events/parseWhatsAppEvent.ts
import { classifyCategory, type EventCategory } from "./classifyCategory";

export type EventLinkKind = "map" | "stream" | "info" | "apply";
export type EventLink = { url: string; kind: EventLinkKind };

export type ParsedEvent = {
  title: string;
  category: EventCategory;
  theme: string | null;
  description: string;
  dateLabel: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  timeLabel: string | null;
  location: string | null;
  priceLabel: string | null;
  isFree: boolean | null;
  links: EventLink[];
  warnings: string[];
};

/* ================================================================
   HELPERS BASE
================================================================ */

const MONTHS: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const pad = (v: string) => v.padStart(2, "0");

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const todayStart = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

/* ── Labels ESTRUTURAIS (filtrar da descrição, usados para extrair metadados) ── */
const STRUCTURAL_LABELS =
  /^(data|dia|hor[aá]rio|local|participa[cç][aã]o|investimento|pre[cç]o|link|via|inscri[cç][oõ]es?|plataforma[s]?|formato|lot[aç][aã]o|certificado[s]?|prazo|per[ií]odo|candidatura[s]?|prazo para candidaturas|per[ií]odo de candidatura[s]?|mais informa[cç][oõ]es|edi[tç][aã]o|edital)\s*:/i;

/* ── Labels de CONTEÚDO (manter na descrição, só tiramos o prefixo do label) ── */
const CONTENT_LABELS =
  /^(tema|convidado(?:\s+especial)?|moderador[a]?|mestre de cerim[oó]nia|orador(?:es)?|palestrante|quem se pode candidatar|requisitos(?:\s+previstos.*)?|benef[ií]cios|o programa prev[eê](?:,?\s+entre outros)?|nota(?:\s+importante)?|sugest[aã]o|esclarecimento(?:\s+do\s+\w+)?|oradores)\s*:/i;

/* ── Emojis ESTRUTURAIS (sempre filtrar, mesmo sem label) ── */
const STRUCTURAL_EMOJIS =
  /[📅🗓📆🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛🕜🕝🕞🕟🕠🕡🕢🕣🕤🕥🕦🕧⏰⏱📍🔗💰🎟🎫💻📜]/u;

/* ── Emojis de CONTEÚDO (NÃO filtrar — vão para a descrição) ── */
const CONTENT_EMOJIS = /[📌🎙️🎤🗣️👨‍🎓👩‍🎓💼🔎⚠️ℹ️🎁🏆]/u;

/**
 * Linha de metadado estrutural (filtrar da descrição).
 */
function isStructuralMeta(line: string): boolean {
  const t = line.trim();
  if (STRUCTURAL_LABELS.test(t)) return true;
  if (CONTENT_LABELS.test(t)) return false;
  if (STRUCTURAL_EMOJIS.test(t) && !CONTENT_EMOJIS.test(t)) return true;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+\.[a-z]{2,}(?:\/[^\s]*)?$/i.test(t)) return true;
  return false;
}

/* ================================================================
   TEMA — extração dedicada
================================================================ */

/**
 * Extrai o "Tema" como campo dedicado e remove-o da descrição.
 * Suporta os formatos:
 *   - "Tema: X"
 *   - "**Tema:** X"
 *   - "**Tema**: X"
 *   - "📌 Tema: X" (após stripContentLabel)
 */
function extractTheme(lines: string[]): { theme: string | null; cleaned: string[] } {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Aceita prefixos opcionais: emojis de conteúdo e/ou asteriscos markdown
    const m = l.match(/^[\s📌🎙️🎤🗣️👨‍🎓👩‍🎓💼🔎⚠️ℹ️🎁🏆]*(?:\*\*)?tema(?:\*\*)?\s*:\s*(.+)$/iu);
    if (m) {
      const theme = m[1].trim().replace(/\*\*/g, "").trim();
      const cleaned = [...lines.slice(0, i), ...lines.slice(i + 1)];
      return { theme: theme || null, cleaned };
    }
  }
  return { theme: null, cleaned: lines };
}

/* ================================================================
   DATA
================================================================ */

function parseDateRange(label: string, today: Date): { start: Date | null; end: Date | null } {
  let n = norm(label);
  n = n.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();

  if (/\bhoje\b/.test(n)) return { start: today, end: today };
  if (/\bdepois de amanha\b/.test(n)) { const t = new Date(today); t.setDate(t.getDate() + 2); return { start: t, end: t }; }
  if (/\bamanha\b/.test(n)) { const t = new Date(today); t.setDate(t.getDate() + 1); return { start: t, end: t }; }

  const between = n.match(/entre\s+([a-z]+)\s+(\d{4})(?:\s+(?:e|a)\s+[a-z]+\s+\d{4})?/);
  if (between) {
    const m = MONTHS[between[1]];
    if (m !== undefined) return { start: new Date(+between[2], m, 1), end: new Date(+between[2], m, 1) };
  }

  const range = n.match(/(\d{1,2})\s*(?:a|ate|ao|-|–|—)\s*(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/);
  if (range) {
    const m = MONTHS[range[3]];
    if (m !== undefined) return { start: new Date(+range[4], m, +range[1]), end: new Date(+range[4], m, +range[2]) };
  }

  const rangeNoYear = n.match(/(\d{1,2})\s*(?:a|ate|ao|-|–|—)\s*(\d{1,2})\s+de\s+([a-z]+)/);
  if (rangeNoYear) {
    const m = MONTHS[rangeNoYear[3]];
    if (m !== undefined) {
      let y = today.getFullYear();
      if (new Date(y, m, +rangeNoYear[2]).getTime() < today.getTime() - 86400000) y += 1;
      return { start: new Date(y, m, +rangeNoYear[1]), end: new Date(y, m, +rangeNoYear[2]) };
    }
  }

  const single = n.match(/(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/);
  if (single) {
    const m = MONTHS[single[2]];
    if (m !== undefined) {
      let y = single[3] ? +single[3] : today.getFullYear();
      let d = new Date(y, m, +single[1]);
      if (!single[3] && d.getTime() < today.getTime() - 86400000) d = new Date(y + 1, m, +single[1]);
      return { start: d, end: d };
    }
  }

  const num = n.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (num) {
    let y = num[3] ? (+num[3] < 100 ? 2000 + +num[3] : +num[3]) : today.getFullYear();
    let d = new Date(y, +num[2] - 1, +num[1]);
    if (!num[3] && d.getTime() < today.getTime() - 86400000) d = new Date(y + 1, +num[2] - 1, +num[1]);
    return { start: d, end: d };
  }

  const wd = (["domingo","segunda","terca","quarta","quinta","sexta","sabado"] as const).find(
    (k) => new RegExp(`\\b${k}(-feira)?\\b`).test(n)
  );
  if (wd) {
    const target = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"].indexOf(wd);
    let diff = (target - today.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    const d = new Date(today); d.setDate(d.getDate() + diff);
    return { start: d, end: d };
  }

  return { start: null, end: null };
}

function findDateLine(lines: string[]): string | null {
  return (
    lines.find((l) => /[📅🗓📆]/u.test(l)) ??
    lines.find((l) => /^(data|dia|prazo|prazo para candidaturas|per[ií]odo|per[ií]odo de candidatura[s]?)\s*:/i.test(l.trim())) ??
    lines.find((l) => /\b(segunda|terca|quarta|quinta|sexta|sabado|domingo)(-feira)?,\s*\d{1,2}\s+de\s+/i.test(norm(l))) ??
    lines.find((l) => l.length < 80 && /\b\d{1,2}\s*(a|ate|ao)?\s*\d{0,2}\s*de\s+[a-z]+/i.test(norm(l)) && !/\d{1,2}[h:]\d{2}/.test(l)) ??
    null
  );
}

/* ================================================================
   HORA
================================================================ */

function parseTimeLabel(text: string): string | null {
  const n = norm(text);

  let m = n.match(/das\s+(\d{1,2})(?:[h:](\d{2}))?\s*(?:as|a|ate)\s*(\d{1,2})(?:[h:](\d{2}))?/);
  if (m) return `${pad(m[1])}:${m[2] ?? "00"} – ${pad(m[3])}:${m[4] ?? "00"}`;

  m = n.match(/(\d{1,2})\s*[h:]\s*(\d{2})?\s*(?:–|—|-|a|ate|as)\s*(\d{1,2})\s*[h:]\s*(\d{2})?/);
  if (m) return `${pad(m[1])}:${m[2] ?? "00"} – ${pad(m[3])}:${m[4] ?? "00"}`;

  m = n.match(/(\d{1,2})\s*[h:]\s*(\d{2})?\b/);
  if (m) return `${pad(m[1])}:${m[2] ?? "00"}`;

  if (/\bmanha\b/.test(n)) return "08:00 – 12:00";
  if (/\btarde\b/.test(n)) return "14:00 – 18:00";
  if (/\bnoite\b/.test(n)) return "18:00 – 21:00";
  return null;
}

function findTimeLine(lines: string[]): string | null {
  return (
    lines.find((l) => /[🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛🕜🕝🕞🕟🕠🕡🕢🕣🕤🕥🕦🕧⏰⏱]/u.test(l)) ??
    lines.find((l) => /^hor[aá]rio\s*:/i.test(l.trim())) ??
    lines.find((l) => /\d{1,2}\s*[h:]\s*\d{2}\s*(?:–|—|-)\s*\d{1,2}\s*[h:]\s*\d{2}/.test(l)) ??
    null
  );
}

/* ================================================================
   LOCAL
================================================================ */

function parseLocation(lines: string[], raw: string): string | null {
  const explicit =
    lines.find((l) => /📍/u.test(l)) ??
    lines.find((l) => /^local\s*:/i.test(l.trim()));
  if (explicit) {
    let value = explicit.replace(/📍/g, "").replace(/^local\s*:/i, "").trim();
    const pipeMatch = value.match(/^(.+?)\s*\|\s*https?:\/\//);
    if (pipeMatch) value = pipeMatch[1].trim();
    const bareMatch = value.match(/^(.+?)\s*\|\s*[a-z0-9-]+(?:\.[a-z0-9-]+)+\.[a-z]{2,}/i);
    if (bareMatch) value = bareMatch[1].trim();
    if (value) return value;
  }
  if (/formato\s*:\s*online|\bvia\s+(google\s+)?meet|\bzoom\b|\btransmiss[aã]o|\byoutube\s+live|direto\s+no|plataforma[s]?\s*:\s*(https|www)/i.test(norm(raw))) {
    return "Online";
  }
  return null;
}

/* ================================================================
   LINKS
================================================================ */

function splitLinkSeparators(text: string): string[] {
  return text.split(/[|\n]/).map((s) => s.trim()).filter(Boolean);
}

function extractUrls(text: string): string[] {
  const out: string[] = [];
  const segments = splitLinkSeparators(text);

  for (const seg of segments) {
    const withProto = seg.match(/https?:\/\/[^\s)\],;]+/gi) ?? [];
    out.push(...withProto);

    let rest = seg;
    for (const u of withProto) rest = rest.split(u).join(" ");

    const bare =
      rest.match(/\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|pt|ao|me|app|dev|gl|gg|us|uk|br|gov|edu|in)(?:\/[^\s)\],;]*)?/gi) ?? [];
    for (const b of bare) {
      const idx = rest.indexOf(b);
      if (idx > 0 && rest[idx - 1] === "@") continue;
      out.push(`https://${b}`);
    }
  }

  const seen = new Set<string>();
  return out
    .map((u) => u.replace(/[.,;:!?"]+$/g, ""))
    .filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
}

function classifyLink(url: string): EventLinkKind {
  const n = norm(url);
  if (/maps\.|goo\.gl\/maps|maps\.app|waze/.test(n)) return "map";
  if (/meet\.google|zoom\.us|teams\.|youtube|youtu\.be|fb\.watch|\/live|twitch|instagram\.com\/(live|watch|aurea)/.test(n)) return "stream";
  if (/forms\.|123formbuilder|typeform|google\.com\/forms|lnkd\.in|\/inscricao|\/candidatura|\/apply|\/candidate/.test(n)) return "apply";
  return "info";
}

/* ================================================================
   PREÇO
================================================================ */

function parsePrice(lines: string[], raw: string): { label: string | null; isFree: boolean | null } {
  const nRaw = norm(raw);
  const explicit =
    lines.find((l) => /[💰🎟🎫]/u.test(l)) ??
    lines.find((l) => /^(participacao|investimento|valor|preco|propina|custo)\s*:/i.test(norm(l)));
  if (explicit) {
    let label = explicit.includes(":")
      ? explicit.slice(explicit.indexOf(":") + 1).trim()
      : explicit.replace(/^[💰🎟🎫]\s*/u, "").trim();
    label = label.replace(/\s*\|\s*https?:\/\/\S+.*$/, "").trim();
    return { label, isFree: /gratuit|gratis|livre|sem custo|isento/.test(norm(label)) };
  }
  if (/gratuit|gratis|livre|sem custo/.test(nRaw)) return { label: "Gratuita", isFree: true };
  if (/\d[\d.\s]*(kz|kwanzas|aoa)\b/.test(nRaw)) return { label: null, isFree: false };
  return { label: null, isFree: null };
}

/* ================================================================
   TÍTULO
================================================================ */

function isFillerGreeting(line: string): boolean {
  const n = norm(line);
  return /^(prezad|cordiais saudacoes|cordiais saud|caros|caras|ola a todos|bom dia|boa tarde|boa noite)\b/.test(n);
}

function parseTitle(
  lines: string[],
  firstBlock: string[]
): { title: string; titleLines: string[] } {
  const clean = (s: string) => s.replace(/^[\s\W_]+/u, "").trim();

  const upper = lines.find((l) => {
    const t = l.trim();
    return t.length > 10 && t === t.toUpperCase() && /[A-Z]/.test(t) && !isFillerGreeting(t) && !isStructuralMeta(t);
  });
  if (upper) {
    const pretty = upper.replace(/\s*\|\s*/g, " — ");
    return { title: clean(pretty), titleLines: [upper.trim()] };
  }

  const piped = lines.find(
    (l) => l.includes("|") && l.trim().length > 10 && !/^https?:/.test(l.trim()) && !isStructuralMeta(l)
  );
  if (piped) {
    const pretty = piped.replace(/\s*\|\s*/g, " — ");
    return { title: clean(pretty), titleLines: [piped.trim()] };
  }

  const block = firstBlock.filter((l) => !isStructuralMeta(l) && !isFillerGreeting(l)).slice(0, 2);
  if (block.length > 0) return { title: block.map(clean).join(" — "), titleLines: block };

  const first = lines.find((l) => !isStructuralMeta(l) && !isFillerGreeting(l) && !/^https?:/.test(l.trim()));
  const fallback = first ?? lines[0] ?? "Evento";
  return { title: clean(fallback), titleLines: [fallback.trim()] };
}

/* ================================================================
   DESCRIÇÃO (com extração de tema)
================================================================ */

/** Remove o prefixo "Label: " de uma linha se for label de conteúdo. */
function stripContentLabel(line: string): string {
  const m = line.match(CONTENT_LABELS);
  if (!m) return line;
  const label = m[0].replace(/\s*:\s*$/, "").trim();
  const rest = line.slice(m[0].length).trim();
  const clean = rest.replace(/^[📌🎙️🎤🗣️👨‍🎓👩‍🎓💼🔎⚠️ℹ️🎁🏆\s]+/u, "").trim();
  return `**${label}:** ${clean}`;
}

function parseDescription(
  lines: string[],
  titleLines: Set<string>
): { theme: string | null; description: string } {
  const isFiller = (l: string) => /ler mais|ver mais|leia mais/i.test(l);
  const isSignoff = (l: string) =>
    /^(departamento de actividade|isaf\s*\||academia bai|contamos com a vossa|boa sorte|desejamos boa sorte)/i.test(norm(l));

  // ── Formato antigo: saudação → corpo → "Abaixo, mais detalhes:" ──
  const greetIdx = lines.findIndex((l) => /prezad|cordiais saud/i.test(l));
  if (greetIdx >= 0) {
    const endIdx = lines.findIndex((l, i) => i > greetIdx && /abaixo,?\s*(mais\s*)?detalhes/i.test(l));
    const body = lines
      .slice(greetIdx + 1, endIdx > greetIdx ? endIdx : undefined)
      .map((l) => l.trim())
      .filter((l) => l && !isFiller(l) && !/^cordiais saudacoes\.?$/i.test(l));

    const afterDetails = endIdx > greetIdx ? lines.slice(endIdx + 1) : [];
    const extraContent = afterDetails
      .map((l) => l.trim())
      .filter((l) => l && !isStructuralMeta(l) && !isFiller(l) && !isSignoff(l));

    const all = [...body, ...extraContent].map((l) => stripContentLabel(l));
    const { theme, cleaned } = extractTheme(all);
    return { theme, description: cleaned.join("\n").trim() };
  }

  // ── Formato novo: tudo o que não é título nem metadado estrutural ──
  const processed = lines
    .filter((l) => !titleLines.has(l.trim()))
    .filter((l) => !isStructuralMeta(l))
    .filter((l) => !isFillerGreeting(l))
    .filter((l) => !isSignoff(l))
    .map((l) => l.trim())
    .filter((l) => l && !isFiller(l) && !/^cordiais saudacoes\.?$/i.test(l))
    .map((l) => stripContentLabel(l));

  const { theme, cleaned } = extractTheme(processed);
  return { theme, description: cleaned.join("\n").trim() };
}

/* ================================================================
   PARSER PRINCIPAL
================================================================ */

export function parseWhatsAppEvent(raw: string): ParsedEvent {
  const warnings: string[] = [];
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const today = todayStart();

  const blocks: string[][] = [];
  let current: string[] = [];
  for (const l of raw.split(/\r?\n/)) {
    const t = l.trim();
    if (!t) {
      if (current.length) blocks.push(current);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length) blocks.push(current);

  const { title, titleLines } = parseTitle(lines, blocks[0] ?? []);
  const { category } = classifyCategory(raw);

  const dateLine = findDateLine(lines);
  const { start, end } = dateLine ? parseDateRange(dateLine, today) : { start: null, end: null };
  if (!start) warnings.push("Sem data reconhecida — define manualmente no preview.");

  const timeLine = findTimeLine(lines);
  const timeLabel = timeLine ? parseTimeLabel(timeLine) : null;

  const location = parseLocation(lines, raw);

  const { label: priceLabel, isFree } = parsePrice(lines, raw);

  const links = extractUrls(raw).map((url) => ({ url, kind: classifyLink(url) }));

  const { theme, description } = parseDescription(lines, new Set(titleLines));
  if (!description) warnings.push("Descrição vazia — o parser não encontrou corpo de texto.");

  return {
    title,
    category,
    theme,
    description,
    dateLabel: dateLine ? dateLine.replace(/^[^\p{L}\d]+/u, "").trim() : null,
    dateStart: start ? iso(start) : null,
    dateEnd: end ? iso(end) : null,
    timeLabel,
    location,
    priceLabel,
    isFree,
    links,
    warnings,
  };
}