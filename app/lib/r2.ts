// app/lib/r2.ts
// ⚠️ SERVER-ONLY: este módulo usa credenciais privadas do R2.
// Nunca importar em componentes "use client".
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/* ================================================================
   CONFIG
================================================================ */

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;

  if (typeof window !== "undefined") {
    throw new Error("r2.ts é server-only. Não importes este módulo em componentes client.");
  }

  const accountId =
  process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKey || !secretKey) {
  throw new Error(
    "R2 não configurado. Define CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY no .env.local / Vercel."
  );
}

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  return _client;
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "bisaf-storage";

export const R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
  "https://pub-9d5adcd0a78f4b3ab94ea93681be0000.r2.dev";

/* ================================================================
   PASTAS & TIPOS DE UPLOAD
================================================================ */

export type UploadFolder =
  | "disciplines/covers"
  | "disciplines/audios"
  | "disciplines/slides"
  | "events/banners"
  | "avatars";

export type UploadType = "cover" | "audio" | "slide" | "event-banner" | "avatar";

export const UPLOAD_FOLDER_MAP: Record<UploadType, UploadFolder> = {
  cover: "disciplines/covers",
  audio: "disciplines/audios",
  slide: "disciplines/slides",
  "event-banner": "events/banners",
  avatar: "avatars",
};

export const ALLOWED_MIME_TYPES: Record<UploadType, string[]> = {
  cover: ["image/jpeg", "image/png", "image/webp"],
  audio: ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav"],
  slide: ["application/pdf"],
  "event-banner": ["image/jpeg", "image/png", "image/webp"],
  avatar: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};

export const MAX_FILE_SIZE: Record<UploadType, number> = {
  cover: 5 * 1024 * 1024,
  audio: 100 * 1024 * 1024,
  slide: 50 * 1024 * 1024,
  "event-banner": 5 * 1024 * 1024,
  avatar: 2 * 1024 * 1024,
};

/* ================================================================
   HELPERS DE KEY / URL
================================================================ */

export function getFileKey(folder: UploadFolder, id: string, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${folder}/${id}/${Date.now()}-${sanitized}`;
}

export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

/** Extrai a key a partir de uma URL pública do R2 (pass-through se já for key). */
export function extractKeyFromUrl(keyOrUrl: string): string {
  if (keyOrUrl.startsWith("http")) {
    return keyOrUrl.replace(`${R2_PUBLIC_URL}/`, "");
  }
  return keyOrUrl.replace(/^\/+/, "");
}

/* ================================================================
   VALIDAÇÃO
================================================================ */

export type ValidationResult = { ok: true } | { ok: false; error: string };

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Validação leve para usar no UI ANTES de enviar (feedback imediato). */
export function validateFile(file: File | Blob, type: UploadType): ValidationResult {
  const allowed = ALLOWED_MIME_TYPES[type];
  const max = MAX_FILE_SIZE[type];

  if (file.type && !allowed.includes(file.type)) {
    return {
      ok: false,
      error: `Tipo de ficheiro não permitido (${file.type || "desconhecido"}). Aceites: ${allowed.join(", ")}.`,
    };
  }

  if (file.size > max) {
    return { ok: false, error: `Ficheiro demasiado grande. Máximo: ${formatBytes(max)}.` };
  }

  return { ok: true };
}

/* ================================================================
   UPLOAD / DELETE
================================================================ */

export type UploadResult = { key: string; url: string };

/**
 * Valida e faz upload de um ficheiro para o R2.
 * @param file     File/Blob recebido (ex.: via FormData numa API route)
 * @param type     Tipo de upload (define pasta, MIME e tamanho máx.)
 * @param id       Identificador do registo pai (ex.: eventId, disciplineId, userId)
 * @param fileName Nome original (opcional; útil quando o Blob não tem .name)
 */
export async function uploadToR2(
  file: File | Blob,
  type: UploadType,
  id: string,
  fileName?: string
): Promise<UploadResult> {
  const validation = validateFile(file, type);
  if (!validation.ok) throw new Error(validation.error);

  const folder = UPLOAD_FOLDER_MAP[type];
  const name = fileName ?? ("name" in file && file.name ? file.name : `${type}-${id}`);
  const key = getFileKey(folder, id, name);

  const body = Buffer.from(await file.arrayBuffer());

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: file.type || undefined,
    })
  );

  return { key, url: getPublicUrl(key) };
}

/** Apaga um objecto do R2. Aceita key ou URL pública completa. */
export async function deleteFromR2(keyOrUrl: string): Promise<void> {
  const key = extractKeyFromUrl(keyOrUrl);
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })
  );
}