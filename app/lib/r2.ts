// app/lib/r2.ts
import { S3Client } from "@aws-sdk/client-s3";

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;

  const endpoint  = process.env.R2_ENDPOINT;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error(
      "R2 não configurado. Verifica R2_ENDPOINT, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY no .env.local"
    );
  }

  _client = new S3Client({
    region:      "auto",
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  return _client;
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "bisaf-storage";

export const R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
  "https://pub-9d5adcd0a78f4b3ab94ea93681be0000.r2.dev";

export type UploadFolder =
  | "disciplines/covers"
  | "disciplines/audios"
  | "disciplines/slides"
  | "avatars";

export function getFileKey(
  folder: UploadFolder,
  id: string,
  fileName: string
): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${folder}/${id}/${Date.now()}-${sanitized}`;
}

export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

export type UploadType = "cover" | "audio" | "slide" | "avatar";

export const UPLOAD_FOLDER_MAP: Record<UploadType, UploadFolder> = {
  cover:  "disciplines/covers",
  audio:  "disciplines/audios",
  slide:  "disciplines/slides",
  avatar: "avatars",
};

export const ALLOWED_MIME_TYPES: Record<UploadType, string[]> = {
  cover:  ["image/jpeg", "image/png", "image/webp"],
  audio:  ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav"],
  slide:  ["application/pdf"],
  avatar: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};

export const MAX_FILE_SIZE: Record<UploadType, number> = {
  cover:  5   * 1024 * 1024,
  audio:  100 * 1024 * 1024,
  slide:  50  * 1024 * 1024,
  avatar: 2   * 1024 * 1024,
};