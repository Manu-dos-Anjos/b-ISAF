"use client";

const PENDING_PREFIX = "b-isaf:quiz:pending:";

type PendingQueueRaw = {
  items: {
    result: Record<string, unknown>;
    details: Record<string, unknown>[];
    queuedAt: string;
  }[];
};

function listPendingKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PENDING_PREFIX)) keys.push(k);
  }
  return keys;
}

export function hasPendingSubmissions(): boolean {
  return listPendingKeys().length > 0;
}

/**
 * Percorre TODAS as filas pendentes de quiz (de qualquer contentId/aluno
 * guardado neste dispositivo) e tenta reenviá-las para o Supabase.
 * Idempotente: usa upsert por id, por isso é seguro correr várias vezes
 * e mesmo que o mesmo item já tenha sido inserido antes.
 */
export async function flushAllPendingSubmissions(supabase: any): Promise<void> {
  const keys = listPendingKeys();
  if (keys.length === 0) return;

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    let queue: PendingQueueRaw;
    try {
      queue = JSON.parse(raw);
    } catch {
      localStorage.removeItem(key); // lixo corrompido, não vale a pena manter
      continue;
    }

    if (!queue.items?.length) {
      localStorage.removeItem(key);
      continue;
    }

    const remaining: PendingQueueRaw["items"] = [];

    for (let i = 0; i < queue.items.length; i++) {
      const item = queue.items[i];

      try {
        const { error: resultError } = await supabase
          .from("quiz_results")
          .upsert(item.result, { onConflict: "id" });

        if (resultError) throw resultError;

        const { error: detailsError } = await supabase
          .from("quiz_results_details")
          .upsert(item.details, { onConflict: "id" });

        if (detailsError) throw detailsError;
      } catch (e) {
        console.warn("Falha ao reenviar resultado de quiz pendente:", e);
        // mantém este e todos os seguintes (evita reordenar tentativas)
        remaining.push(...queue.items.slice(i));
        break;
      }
    }

    if (remaining.length === 0) {
      localStorage.removeItem(key);
    } else if (remaining.length !== queue.items.length) {
      localStorage.setItem(key, JSON.stringify({ items: remaining }));
    }
  }
}