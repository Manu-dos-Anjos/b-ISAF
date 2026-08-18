import type { SupabaseClient } from "@supabase/supabase-js";

export type ProgressPayload = {
  student_id: string;
  content_id: string;
  progress_percent: number;
  last_position_seconds: number;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
};

const QUEUE_KEY = "b-isaf:audio:progress-queue:v1";
const MAX_QUEUE_SIZE = 20;

function readQueue(): ProgressPayload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: ProgressPayload[]): void {
  try {
    const deduplicated = Array.from(
      new Map(queue.map((p) => [p.content_id, p])).values()
    );
    localStorage.setItem(QUEUE_KEY, JSON.stringify(deduplicated.slice(-MAX_QUEUE_SIZE)));
  } catch {
    // ignore
  }
}

function enqueueFailedWrite(payload: ProgressPayload): void {
  const queue = readQueue();
  const filtered = queue.filter((p) => p.content_id !== payload.content_id);
  filtered.push(payload);
  writeQueue(filtered);
}

function clearQueueEntry(contentId: string): void {
  const queue = readQueue().filter((p) => p.content_id !== contentId);
  writeQueue(queue);
}

export async function writeProgressPayload(
  supabase: SupabaseClient,
  payload: ProgressPayload
): Promise<boolean> {
  console.log("📦 writeProgressPayload chamado:", payload);
  try {
    const { error } = await supabase.from("student_progress").upsert(payload, {
      onConflict: "student_id,content_id",
    });
    if (error) {
      console.error("❌ Upsert falhou:", error);
      throw error;
    }
    console.log("✅ Upsert bem-sucedido para", payload.content_id);
    clearQueueEntry(payload.content_id);
    return true;
  } catch (err) {
    console.error("Falha ao gravar progresso do audio, colocado em fila:", err);
    enqueueFailedWrite(payload);
    return false;
  }
}

export async function flushProgressQueue(supabase: SupabaseClient): Promise<void> {
  const pending = readQueue();
  if (pending.length === 0) return;

  console.log("🔄 A processar fila de progresso:", pending.length, "itens");

  for (const payload of pending) {
    await writeProgressPayload(supabase, payload);
  }
}