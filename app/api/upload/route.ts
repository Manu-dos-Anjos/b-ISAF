// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import * as mm from "music-metadata"; // ✅ NOVO
import {
  getR2Client,
  R2_BUCKET,
  UPLOAD_FOLDER_MAP,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  getFileKey,
  getPublicUrl,
} from "@/app/lib/r2";
import type { UploadType } from "@/app/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file  = formData.get("file") as File | null;
    const type  = (formData.get("type") as UploadType) ?? "audio";
    const disciplineId = (formData.get("disciplineId") as string) ?? "unknown";

    if (!file) {
      return NextResponse.json({ error: "Nenhum ficheiro enviado." }, { status: 400 });
    }

    // ── Validações ──
    const allowed = ALLOWED_MIME_TYPES[type];
    if (allowed && !allowed.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de ficheiro não permitido para ${type}.` },
        { status: 400 }
      );
    }

    const maxSize = MAX_FILE_SIZE[type];
    if (maxSize && file.size > maxSize) {
      const mb = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { error: `O ficheiro excede o limite de ${mb} MB.` },
        { status: 400 }
      );
    }

    const folder = UPLOAD_FOLDER_MAP[type];
    const key    = getFileKey(folder, disciplineId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    // ── NOVO: extrair duração do áudio antes do upload ──
    let durationSeconds: number | null = null;

    if (type === "audio") {
      try {
        const metadata = await mm.parseBuffer(buffer, file.type);
        durationSeconds = metadata.format.duration
          ? Math.round(metadata.format.duration)
          : null;
      } catch (error) {
        console.warn("Não foi possível extrair a duração do áudio:", error);
        durationSeconds = null;
      }
    }

    const client = getR2Client();

    await client.send(
      new PutObjectCommand({
        Bucket:      R2_BUCKET,
        Key:         key,
        Body:        buffer,
        ContentType: file.type,
      })
    );

    const publicUrl = getPublicUrl(key);

    return NextResponse.json({
      publicUrl,
      key,
      type,
      disciplineId,
      durationSeconds, // ✅ NOVO
    });
  } catch (err) {
    console.error("Erro no upload:", err);
    return NextResponse.json(
      { error: "Falha no upload." },
      { status: 500 }
    );
  }
}