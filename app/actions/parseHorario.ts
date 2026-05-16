// app/actions/parseHorario.ts
"use server";

import "server-only";

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
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return { success: false, error: "Nenhum ficheiro enviado." };
    }

    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      return { success: false, error: "O ficheiro deve ser um PDF." };
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Import robusto — cobre todas as variantes de export do pdf-parse ──
    let text = "";
    let numpages = 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const fn = typeof pdfParse === "function"
        ? pdfParse
        : typeof pdfParse.default === "function"
        ? pdfParse.default
        : null;

      if (!fn) throw new Error("pdf-parse não exporta uma função");

      const result = await fn(buffer);
      text = result.text ?? "";
      numpages = result.numpages ?? 0;
    } catch (importErr: unknown) {
      const msg = importErr instanceof Error ? importErr.message : String(importErr);
      return {
        success: false,
        error: `Erro ao carregar pdf-parse: ${msg}. Tenta: npm install pdf-parse`,
      };
    }

    if (!text?.trim()) {
      return {
        success: false,
        error: "O PDF não contém texto seleccionável.",
        extractedText: "(vazio)",
      };
    }

    // Devolve o texto para debug
    return {
      success: false,
      error: `PDF com ${numpages} página(s) e ${text.length} caracteres. Copia o texto abaixo.`,
      extractedText: text,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Erro ao processar o PDF: ${msg}`,
      extractedText: msg,
    };
  }
}