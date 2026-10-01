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
  registrationLabel: string | null;
  registrationStart: string | null;
  registrationEnd: string | null;
  images: string[];
  videos: string[];
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
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

const MONTH_NAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length);
const CANONICAL_MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

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

function normalizeLines(raw: string): string[] {
  return raw
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .split(/\r?\n/)
    .map((line) => line
      .replace(/^\s*\[?(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:-|–)\s*[^:]{1,100}:\s*/, "")
      .trim())
    .filter(Boolean);
}

function strictDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

/* ── Labels ESTRUTURAIS (filtrar da descrição, usados para extrair metadados) ── */
const STRUCTURAL_LABELS =
  /^(data|dia|date|data do evento|event date|horario|time|local|location|participacao|investimento|preco|price|link|via|inscricoes?|plataformas?|formato|format|lotacao|certificados?|prazo|deadline|periodo|candidaturas?|prazo de candidaturas?|prazo de inscricao|periodo de candidaturas?|periodo de inscricao|mais informacoes|edicao|edital)\s*:/i;

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
  const t = line.trim()
    .replace(/^[\s>#*_\p{Extended_Pictographic}\uFE0F]+/u, "")
    .replace(/^\*\*(.*?)\*\*\s*/, "$1");
  if (STRUCTURAL_LABELS.test(norm(t))) return true;
  if (CONTENT_LABELS.test(t)) return false;
  if (STRUCTURAL_EMOJIS.test(line.trim()) && !CONTENT_EMOJIS.test(line.trim())) return true;
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

type DateParseResult = { start: Date | null; end: Date | null; label: string | null };

function monthYearLabel(monthName: string, year: number): string {
  const month = MONTHS[monthName];
  if (month === undefined) return `${monthName} ${year}`;
  return `${CANONICAL_MONTHS[month]} ${year}`;
}

function monthYearDate(monthName: string, year: number, lastDay = false): Date | null {
  const month = MONTHS[monthName];
  if (month === undefined) return null;
  return new Date(year, month + (lastDay ? 1 : 0), lastDay ? 0 : 1);
}

function parseDateRange(label: string, today: Date): DateParseResult {
  let n = norm(label);
  n = n.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();

  const isoDate = n.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoDate) {
    const date = strictDate(+isoDate[1], +isoDate[2] - 1, +isoDate[3]);
    if (date) return { start: date, end: date, label: null };
  }

  const monthRange = n.match(new RegExp(`(?:entre\\s+)?(${MONTH_NAMES.join("|")})\\s+(?:de\\s+)?(\\d{4})\\s+(?:e|a|ate|–|—|-)\\s+(${MONTH_NAMES.join("|")})\\s+(?:de\\s+)?(\\d{4})`, "i"));
  if (monthRange) {
    const start = monthYearDate(monthRange[1], +monthRange[2]);
    const end = monthYearDate(monthRange[3], +monthRange[4], true);
    if (start && end) return { start, end, label: `${monthYearLabel(monthRange[1], +monthRange[2])} – ${monthYearLabel(monthRange[3], +monthRange[4])}` };
  }

  const monthYear = n.match(new RegExp(`\\b(${MONTH_NAMES.join("|")})(?:\\s+de)?\\s+(\\d{4})\\b`, "i"));
  if (monthYear) {
    const start = monthYearDate(monthYear[1], +monthYear[2]);
    const end = monthYearDate(monthYear[1], +monthYear[2], true);
    if (start && end) return { start: null, end: null, label: monthYearLabel(monthYear[1], +monthYear[2]) };
  }

  const range = n.match(/(\d{1,2})\s*(?:a|ate|ao|-|–|—)\s*(\d{1,2})\s+(?:de\s+)?([a-z]+)(?:\s+de\s+(\d{4}))?/);
  if (range) {
    const month = MONTHS[range[3]];
    if (month !== undefined) {
      let year = range[4] ? +range[4] : today.getFullYear();
      let start = strictDate(year, month, +range[1]);
      let end = strictDate(year, month, +range[2]);
      if (!range[4] && end && end.getTime() < today.getTime() - 86400000) {
        year += 1;
        start = strictDate(year, month, +range[1]);
        end = strictDate(year, month, +range[2]);
      }
      if (start && end && end >= start) return { start, end, label: null };
    }
  }

  const single = n.match(/\b(\d{1,2})\s*(?:º|o)?\s+(?:de\s+)?([a-z]+)(?:\s+de\s+(\d{4}))?/);
  if (single) {
    const month = MONTHS[single[2]];
    if (month !== undefined) {
      let year = single[3] ? +single[3] : today.getFullYear();
      let date = strictDate(year, month, +single[1]);
      if (date && !single[3] && date.getTime() < today.getTime() - 86400000) {
        year += 1;
        date = strictDate(year, month, +single[1]);
      }
      if (date) return { start: date, end: date, label: null };
    }
  }

  const numeric = n.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/);
  if (numeric) {
    const year = +numeric[3] < 100 ? 2000 + +numeric[3] : +numeric[3];
    const date = strictDate(year, +numeric[2] - 1, +numeric[1]);
    if (date) return { start: date, end: date, label: null };
  }

  const numericWithoutYear = n.match(/\b(\d{1,2})[/.\-](\d{1,2})\b/);
  if (numericWithoutYear) {
    let year = today.getFullYear();
    let date = strictDate(year, +numericWithoutYear[2] - 1, +numericWithoutYear[1]);
    if (date && date.getTime() < today.getTime() - 86400000) {
      year += 1;
      date = strictDate(year, +numericWithoutYear[2] - 1, +numericWithoutYear[1]);
    }
    if (date) return { start: date, end: date, label: null };
  }

  if (/\bhoje\b/.test(n)) return { start: today, end: today, label: null };
  if (/\bdepois de amanha\b/.test(n)) { const t = new Date(today); t.setDate(t.getDate() + 2); return { start: t, end: t, label: null }; }
  if (/\bamanha\b/.test(n)) { const t = new Date(today); t.setDate(t.getDate() + 1); return { start: t, end: t, label: null }; }

  const wd = (["domingo","segunda","terca","quarta","quinta","sexta","sabado"] as const).find(
    (k) => new RegExp(`\\b${k}(-feira)?\\b`).test(n)
  );
  if (wd) {
    const target = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"].indexOf(wd);
    let diff = (target - today.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    const d = new Date(today); d.setDate(d.getDate() + diff);
    return { start: d, end: d, label: null };
  }

  return { start: null, end: null, label: null };
}

function isRegistrationDateLine(line: string): boolean {
  return /\b(inscri[cç][aã]o|candidatura|candidaturas|prazo|deadline|application)\b/i.test(norm(line));
}

function findDateLine(lines: string[], kind: "event" | "registration"): string | null {
  const candidates = lines.filter((line) => {
    const registration = isRegistrationDateLine(line);
    if (kind === "registration" ? !registration : registration) return false;
    const normalized = norm(line).replace(/^[^a-z0-9]+/, "");
    const explicitEvent = /^(data|dia|date|data do evento|event date)\s*:/.test(normalized);
    const explicitRegistration = /^(prazo|periodo|inscricoes?|candidaturas?|deadline|application)\b/.test(normalized);
    const dateShape = new RegExp(`(?:\\b\\d{1,2}\\s*(?:º|o)?\\s*(?:de\\s+)?(?:${MONTH_NAMES.join("|")})\\b|\\b(?:${MONTH_NAMES.join("|")})\\s+(?:de\\s+)?\\d{4}\\b|\\b\\d{1,2}[/.\\-]\\d{1,2}(?:[/.\\-]\\d{2,4})?\\b|\\b\\d{4}-\\d{1,2}-\\d{1,2}\\b)`, "i").test(line);
    return explicitEvent || explicitRegistration || /[📅🗓📆]/u.test(line) || dateShape;
  });
  return candidates.find((line) => {
    const parsed = parseDateRange(line, todayStart());
    return parsed.start !== null || parsed.label !== null;
  }) ?? null;
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

function parseMediaUrls(text: string): { images: string[]; videos: string[] } {
  const urls = extractUrls(text);
  const images: string[] = [];
  const videos: string[] = [];
  for (const url of urls) {
    const pathname = url.split(/[?#]/, 1)[0].toLowerCase();
    if (/\.(png|jpe?g|gif|webp|avif)(?:$|\/)/.test(pathname)) images.push(url);
    else if (/\.(mp4|m4v|mov|webm|3gp)(?:$|\/)/.test(pathname) || /video|watch\?v=|youtu\.be|youtube\.com|vimeo\.com/.test(norm(url))) videos.push(url);
  }
  return { images: [...new Set(images)], videos: [...new Set(videos)] };
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
    let value = explicit.replace(/📍/g, "").trim().replace(/^local\s*:/i, "").trim();
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
  return /^(prezad|cordiais saudacoes|cordiais saud|caros|caras|ola a todos|bom dia|boa tarde|boa noite|dear|greetings)/.test(n);
}

function isSignoff(line: string): boolean {
  return /^(departamento de actividade|departamento de atividades|isaf\s*\||academia bai|contamos com a vossa|contamos com sua|boa sorte|desejamos boa sorte)/i.test(norm(line));
}

function parseTitle(
  lines: string[],
  firstBlock: string[]
): { title: string; titleLines: string[] } {
  const clean = (s: string) => s.replace(/^[\s\W_]+/u, "").trim();

  const upper = lines.find((l) => {
    const t = l.trim();
    return t.length > 10 && t.length < 180 && t === t.toUpperCase() && /[A-Z]/.test(t) && !isFillerGreeting(t) && !isSignoff(t) && !isStructuralMeta(t);
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

  const block = firstBlock.filter((l) => !isStructuralMeta(l) && !isFillerGreeting(l) && !isSignoff(l)).slice(0, 2);
  if (block.length > 0) return { title: block.map(clean).join(" — "), titleLines: block };

  const first = lines.find((l) => !isStructuralMeta(l) && !isFillerGreeting(l) && !isSignoff(l) && !/^https?:/.test(l.trim()));
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
  const detailsHeading = /abaixo,?\s*(mais\s*)?detalhes|more details\s*:?/i;
  const processed = lines
    .filter((l) => !titleLines.has(l.trim()))
    .filter((l) => !isStructuralMeta(l))
    .filter((l) => !isFillerGreeting(l))
    .filter((l) => !isSignoff(l))
    .filter((l) => !detailsHeading.test(l))
    .filter((l) => !/^cordiais sauda[cç][õo]es\.?$/i.test(l.trim()))
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
  const lines = normalizeLines(raw);
  const normalizedRaw = lines.join("\n");
  const today = todayStart();

  const blocks: string[][] = [];
  let current: string[] = [];
  for (const l of normalizedRaw.split(/\r?\n/)) {
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
  const { category } = classifyCategory(normalizedRaw);

  const dateLine = findDateLine(lines, "event");
  const registrationLine = findDateLine(lines, "registration");
  const { start, end, label: eventPeriodLabel } = dateLine
    ? parseDateRange(dateLine, today)
    : { start: null, end: null, label: null };
  const { start: registrationStart, end: registrationEnd, label: registrationPeriodLabel } = registrationLine
    ? parseDateRange(registrationLine, today)
    : { start: null, end: null, label: null };
  if (!start) warnings.push("Sem data reconhecida — define manualmente no preview.");

  const timeLine = findTimeLine(lines);
  const timeLabel = timeLine ? parseTimeLabel(timeLine) : null;

  const location = parseLocation(lines, normalizedRaw);

  const { label: priceLabel, isFree } = parsePrice(lines, normalizedRaw);

  const links = extractUrls(normalizedRaw).map((url) => ({ url, kind: classifyLink(url) }));
  const media = parseMediaUrls(normalizedRaw);

  const { theme, description } = parseDescription(lines, new Set(titleLines));
  if (!description) warnings.push("Descrição vazia — o parser não encontrou corpo de texto.");

  return {
    title,
    category,
    theme,
    description,
    dateLabel: eventPeriodLabel ?? (dateLine ? dateLine.replace(/^[^\p{L}\d]+/u, "").trim() : null),
    dateStart: start ? iso(start) : null,
    dateEnd: end ? iso(end) : null,
    registrationLabel: registrationLine
      ? registrationPeriodLabel ?? registrationLine.replace(/^[^\p{L}\d]+/u, "").trim()
      : null,
    registrationStart: registrationStart ? iso(registrationStart) : null,
    registrationEnd: registrationEnd ? iso(registrationEnd) : null,
    images: media.images,
    videos: media.videos,
    timeLabel,
    location,
    priceLabel,
    isFree,
    links,
    warnings,
  };
}