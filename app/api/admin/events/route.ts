// app/api/admin/events/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { uploadToR2, deleteFromR2 } from "@/app/lib/r2";

type EventDraftPayload = {
  title: string;
  theme: string | null;
  category: string;
  description: string | null;
  dateLabel: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  timeLabel: string | null;
  location: string | null;
  priceLabel: string | null;
  isFree: boolean | null;
  links: { url: string; kind: "map" | "stream" | "info" }[];
  isFeatured: boolean;
};

const ADMIN_ROLES = new Set(["admin", "superadmin"]);

async function getAdminContext() {
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
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, isAdmin: !!profile?.role && ADMIN_ROLES.has(profile.role) };
}

/* ================================================================
   POST — criar evento (FormData: data=JSON, image=File opcional)
================================================================ */
export async function POST(req: Request) {
  const { supabase, user, isAdmin } = await getAdminContext();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Sem permissão de admin." }, { status: 403 });

  const form = await req.formData();
  const raw = form.get("data");
  const file = form.get("image");

  if (typeof raw !== "string") {
    return NextResponse.json({ error: "Payload em falta." }, { status: 400 });
  }

  let draft: EventDraftPayload;
  try {
    draft = JSON.parse(raw) as EventDraftPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!draft.title?.trim()) {
    return NextResponse.json({ error: "O título é obrigatório." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  let imageUrl: string | null = null;
  let imageKey: string | null = null;

  // Upload do banner para o R2 (se vier imagem)
  if (file instanceof File && file.size > 0) {
    try {
      const up = await uploadToR2(file, "event-banner", id, file.name);
      imageUrl = up.url;
      imageKey = up.key;
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Falha no upload da imagem." },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      id,
      title: draft.title.trim(),
      theme: draft.theme ?? null,
      category: draft.category ?? "comunidade",
      description: draft.description ?? null,
      date_label: draft.dateLabel ?? null,
      date_start: draft.dateStart ?? null,
      date_end: draft.dateEnd ?? null,
      time_label: draft.timeLabel ?? null,
      location: draft.location ?? null,
      price_label: draft.priceLabel ?? null,
      is_free: draft.isFree ?? null,
      links: draft.links ?? [],
      image_url: imageUrl,
      image_key: imageKey,
      is_featured: !!draft.isFeatured,
      is_published: true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    // Se o insert falhar, não deixamos o banner órfão no R2
    if (imageKey) await deleteFromR2(imageKey).catch(() => {});
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

/* ================================================================
   DELETE — apagar evento + banner no R2
================================================================ */
export async function DELETE(req: Request) {
  const { supabase, user, isAdmin } = await getAdminContext();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Sem permissão de admin." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID em falta." }, { status: 400 });

  const { data: event } = await supabase
    .from("events")
    .select("image_key")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (event?.image_key) {
    await deleteFromR2(event.image_key).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}