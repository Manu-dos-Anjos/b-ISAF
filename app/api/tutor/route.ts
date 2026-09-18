import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/app/lib/supabase/server";

type TutorHistoryMessage = {
  role: "user" | "model";
  text: string;
};

type TutorRequest = {
  message?: unknown;
  context?: {
    discipline?: unknown;
    chapter?: unknown;
    topic?: unknown;
  };
  history?: unknown;
  resources?: unknown;
};

type TutorResource = {
  type: "audio" | "slide" | "quiz";
  title: string;
  url?: string;
};

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_RESOURCES = 30;
const MAX_RESOURCE_TEXT = 12000;
const MAX_AUDIO_RESOURCES = 3;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const DAILY_REQUEST_LIMIT = 20;
const MINUTE_REQUEST_LIMIT = 5;

type TutorUsage = {
  day: string;
  dailyCount: number;
  minuteStartedAt: number;
  minuteCount: number;
};

const tutorUsage = new Map<string, TutorUsage>();

function isHistoryMessage(value: unknown): value is TutorHistoryMessage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    (item.role === "user" || item.role === "model") &&
    typeof item.text === "string" &&
    item.text.trim().length > 0
  );
}

function isTutorResource(value: unknown): value is TutorResource {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    (item.type === "audio" || item.type === "slide" || item.type === "quiz") &&
    typeof item.title === "string" &&
    (item.url === undefined || typeof item.url === "string")
  );
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_RESOURCE_TEXT);
}

function checkRateLimit(userId: string) {
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const current = tutorUsage.get(userId);
  const usage: TutorUsage = current?.day === day
    ? current
    : { day, dailyCount: 0, minuteStartedAt: now, minuteCount: 0 };

  if (now - usage.minuteStartedAt >= 60_000) {
    usage.minuteStartedAt = now;
    usage.minuteCount = 0;
  }

  if (usage.dailyCount >= DAILY_REQUEST_LIMIT) {
    tutorUsage.set(userId, usage);
    return { allowed: false, retryAfter: 86_400 };
  }

  if (usage.minuteCount >= MINUTE_REQUEST_LIMIT) {
    tutorUsage.set(userId, usage);
    return { allowed: false, retryAfter: Math.ceil((60_000 - (now - usage.minuteStartedAt)) / 1000) };
  }

  usage.dailyCount += 1;
  usage.minuteCount += 1;
  tutorUsage.set(userId, usage);
  return { allowed: true, retryAfter: 0 };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TutorRequest;
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ error: "Escreve uma pergunta." }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `A pergunta não pode ultrapassar ${MAX_MESSAGE_LENGTH} caracteres.` },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "O Tutor IA ainda não está configurado. Adiciona GEMINI_API_KEY ao ambiente." },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Inicia sessão para usar o Tutor IA." }, { status: 401 });
    }

    const rate = checkRateLimit(user.id);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: rate.retryAfter > 60 ? "Atingiste o limite diário de 20 perguntas. Tenta novamente amanhã." : "Atingiste o limite de 5 perguntas por minuto. Aguarda um pouco e tenta novamente." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
      );
    }

    const context = body.context ?? {};
    const discipline = typeof context.discipline === "string" ? context.discipline : "não indicada";
    const chapter = typeof context.chapter === "string" ? context.chapter : "não indicado";
    const topic = typeof context.topic === "string" ? context.topic : "não indicado";
    const history = Array.isArray(body.history)
      ? body.history.filter(isHistoryMessage).slice(-MAX_HISTORY_MESSAGES)
      : [];
    while (history[0]?.role === "model") history.shift();
    const resources = Array.isArray(body.resources)
      ? body.resources.filter(isTutorResource).slice(0, MAX_RESOURCES)
      : [];

    const audioResources = resources
      .filter((resource) => resource.type === "audio" && resource.url)
      .slice(0, MAX_AUDIO_RESOURCES);
    const resourceParts = await Promise.all(resources.map(async (resource) => {
      if (!resource.url || resource.type === "audio") {
        return resource.type === "audio"
          ? `[áudio] ${resource.title} (o áudio será enviado diretamente ao modelo)`
          : `[${resource.type}] ${resource.title}${resource.url ? `\nURL: ${resource.url}` : ""}`;
      }

      try {
        const response = await fetch(resource.url, { signal: AbortSignal.timeout(5000) });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.includes("text/html")) {
          return `[${resource.type}] ${resource.title}\nURL: ${resource.url}`;
        }
        const text = stripHtml(await response.text());
        return `[${resource.type}] ${resource.title}\n${text || `URL: ${resource.url}`}`;
      } catch {
        return `[${resource.type}] ${resource.title}\nURL: ${resource.url}`;
      }
    }));

    const audioParts = await Promise.all(audioResources.map(async (resource) => {
      try {
        const response = await fetch(resource.url!, { signal: AbortSignal.timeout(10000) });
        const contentType = response.headers.get("content-type") ?? "audio/mpeg";
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!response.ok || bytes.byteLength === 0 || bytes.byteLength > MAX_AUDIO_BYTES) return null;
        return {
          inlineData: {
            mimeType: contentType.split(";")[0] || "audio/mpeg",
            data: Buffer.from(bytes).toString("base64"),
          },
        };
      } catch {
        return null;
      }
    }));

    const configuredModel = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
    const modelName = configuredModel === "gemini-2.5-flash-lite"
      ? "gemini-3.5-flash-lite"
      : configuredModel;
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: modelName,
      systemInstruction: `És o Tutor IA da biblioteca virtual do ISAF. Responde em português natural, simples e objetivo. Começa diretamente pela resposta, sem saudações, apresentações ou frases como "com base no material". Usa parágrafos curtos e listas Markdown apenas quando ajudam. Normalmente responde em 2 a 5 parágrafos.\n\nContexto: disciplina: ${discipline}; capítulo: ${chapter}; tema: ${topic}.\n\nUsa primeiro o material interno abaixo. Se recorreres a conhecimento geral, indica isso apenas numa frase curta. Não inventes informações. Os áudios enviados podem ser analisados diretamente; não digas que estão apenas pendentes de transcrição. Se não houver informação suficiente, diz objetivamente o que falta.\n\nMATERIAL INTERNO:\n${resourceParts.join("\n\n") || "Nenhum material interno foi enviado."}`,
    });

    const chat = model.startChat({
      history: history.map((item) => ({
        role: item.role,
        parts: [{ text: item.text }],
      })),
    });

    const audioInputs = audioParts.filter((part): part is NonNullable<typeof part> => part !== null);
    const result = await chat.sendMessage([
      ...audioInputs,
      { text: message },
    ]);
    const text = result.response.text().trim();

    return NextResponse.json({ text: text || "Não consegui gerar uma resposta agora." });
  } catch (error) {
    console.error("Erro no Tutor IA:", error);
    return NextResponse.json(
      { error: "Não foi possível obter uma resposta do Tutor IA agora." },
      { status: 500 }
    );
  }
}
