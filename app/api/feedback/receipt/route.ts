import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const RECEIPT_BUCKET = "donation-receipts";
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

async function getAuthenticatedSupabase() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase();
  if (!user) return NextResponse.json({ error: "Inicia sessão para anexar um recibo." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "O ficheiro do recibo não foi recebido." }, { status: 400 });
  }
  if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "O recibo tem de ser um ficheiro PDF." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_RECEIPT_SIZE) {
    return NextResponse.json({ error: "O recibo PDF deve ter entre 1 byte e 5 MB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = new TextDecoder().decode(bytes.subarray(0, 5));
  if (signature !== "%PDF-") {
    return NextResponse.json({ error: "O conteúdo do ficheiro não parece ser um PDF válido." }, { status: 400 });
  }

  const path = `${user.id}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });

  if (error) {
    return NextResponse.json({ error: "Não foi possível guardar o recibo privado." }, { status: 500 });
  }

  return NextResponse.json({ path });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthenticatedSupabase();
  if (!user) return NextResponse.json({ error: "Inicia sessão para remover o recibo." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { path?: unknown } | null;
  const path = payload?.path;
  if (typeof path !== "string" || !path.startsWith(`${user.id}/`) || !path.endsWith(".pdf") || path.split("/").length !== 2) {
    return NextResponse.json({ error: "Caminho de recibo inválido." }, { status: 400 });
  }

  const { error } = await supabase.storage.from(RECEIPT_BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: "Não foi possível remover o recibo temporário." }, { status: 500 });
  return NextResponse.json({ ok: true });
}