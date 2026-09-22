// app/lib/events/classifyCategory.ts
export type EventCategory =
  | "formacao"
  | "palestra"
  | "financas"
  | "empregabilidade"
  | "academico"
  | "cultural"
  | "desporto"
  | "comunidade";

export const CATEGORY_META: Record<EventCategory, { label: string; chipClasses: string }> = {
  formacao: {
    label: "Formação & Capacitação",
    chipClasses: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  },
  palestra: {
    label: "Palestras & Conferências",
    chipClasses: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
  },
  financas: {
    label: "Finanças & Mercados",
    chipClasses: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  empregabilidade: {
    label: "Empregabilidade & Carreira",
    chipClasses: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  },
  academico: {
    label: "Académico & Institucional",
    chipClasses: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300",
  },
  cultural: {
    label: "Cultural & Social",
    chipClasses: "border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-300",
  },
  desporto: {
    label: "Desporto",
    chipClasses: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
  },
  comunidade: {
    label: "Comunidade",
    chipClasses: "border-slate-300 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
  },
};

const KEYWORDS: Record<Exclude<EventCategory, "comunidade">, string[]> = {
  formacao: [
    "formacao", "capacitacao", "workshop", "masterclass", "curso", "treino",
    "certificacao", "sessao informativa", "sessao formativa",
  ],
  palestra: [
    "palestra", "conferencia", "seminario", "coloquio", "painel", "convidado",
    "palestrante", "moderador", "live", "conhecer para investir", "webinar",
  ],
  financas: [
    "investimento", "obrigacoes", "accoes", "acoes", "bolsa", "mercado de capitais",
    "literacia financeira", "financas", "banca", "seguros", "juros", "rendibilidade",
    "dividendos", "poupanca", "poupar", "oferta publica", "sdvm",
  ],
  empregabilidade: [
    "empregabilidade", "recrutamento", "estagio", "curriculo", "entrevista",
    "feira de emprego", "emprego", "carreira", "vagas", "startup", "pitch",
    "navegadores", "investment readiness",
  ],
  academico: [
    "matricula", "inscricao", "exame", "epoca", "calendario", "cerimonia",
    "graduacao", "propina", "semestre", "bolsa de estudo", "bolsas de estudo",
    "chevening", "erasmus", "erasmus mundus", "mestrado", "mobilidade",
  ],
  cultural: ["cultural", "cultura", "festa", "convivio", "semana academica", "teatro", "musica", "festival", "gala", "show"],
  desporto: ["torneio", "campeonato", "jogo", "desporto", "corrida", "maratona", "ginasio"],
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function classifyCategory(text: string): {
  category: EventCategory;
  scores: Partial<Record<EventCategory, number>>;
} {
  const n = norm(text);
  const scores: Partial<Record<EventCategory, number>> = {};
  let best: EventCategory = "comunidade";
  let bestScore = 0;

  (Object.keys(KEYWORDS) as Exclude<EventCategory, "comunidade">[]).forEach((cat) => {
    let s = 0;
    for (const kw of KEYWORDS[cat]) {
      const count = n.split(kw).length - 1;
      if (count > 0) s += count;
    }
    scores[cat] = s;
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  });

  return { category: best, scores };
}