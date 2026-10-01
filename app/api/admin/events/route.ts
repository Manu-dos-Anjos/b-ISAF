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
  registrationLabel: string | null;
  registrationStart: string | null;
  registrationEnd: string | null;
  mediaImages: string[];
  mediaVideos: string[];
  links: { url: string; kind: "map" | "stream" | "info" | "apply" }[];
  timeLabel: string | null;
  location: string | null;
  priceLabel: string | null;
  isFree: boolean | null;
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
  const mediaFiles = form.getAll("mediaFiles").filter((item): item is File => item instanceof File && item.size > 0);

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
  if (mediaFiles.length > 12) {
    return NextResponse.json({ error: "Anexa no máximo 12 imagens/vídeos por evento." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  let imageUrl: string | null = null;
  let imageKey: string | null = null;
  const uploadedMedia: { url: string; key: string; kind: "image" | "video" }[] = [];
  const mediaLinks = [
    ...(Array.isArray(draft.mediaImages) ? draft.mediaImages.map((url) => ({ url, kind: "image" as const, key: null })) : []),
    ...(Array.isArray(draft.mediaVideos) ? draft.mediaVideos.map((url) => ({ url, kind: "video" as const, key: null })) : []),
  ].filter((media) => /^https:\/\//i.test(media.url));

  // Upload do banner para o R2 (se vier imagem)
  if (file instanceof File && file.size > 0) {
    try {
      const up = await uploadToR2(file, "event-banner", id, file.name);
      imageUrl = up.url;
      imageKey = up.key;
      uploadedMedia.push({ url: up.url, key: up.key, kind: "image" });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Falha no upload da imagem." },
        { status: 400 }
      );
    }
  }

  try {
    for (const mediaFile of mediaFiles) {
      const kind = mediaFile.type.startsWith("video/") ? "video" : "image";
      const upload = await uploadToR2(mediaFile, kind === "video" ? "event-video" : "event-banner", id, mediaFile.name);
      uploadedMedia.push({ url: upload.url, key: upload.key, kind });
    }
  } catch (e) {
    await Promise.all(uploadedMedia.map((media) => deleteFromR2(media.key).catch(() => {})));
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha no upload de mídia." },
      { status: 400 }
    );
  }

  if (!imageUrl) imageUrl = uploadedMedia.find((media) => media.kind === "image")?.url ?? draft.mediaImages?.[0] ?? null;
  const media = [...mediaLinks, ...uploadedMedia];

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
      registration_label: draft.registrationLabel ?? null,
      registration_start: draft.registrationStart ?? null,
      registration_end: draft.registrationEnd ?? null,
      time_label: draft.timeLabel ?? null,
      location: draft.location ?? null,
      price_label: draft.priceLabel ?? null,
      is_free: draft.isFree ?? null,
      links: draft.links ?? [],
      image_url: imageUrl,
      image_key: imageKey,
      media,
      is_featured: !!draft.isFeatured,
      is_published: true,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    await Promise.all(uploadedMedia.map((item) => deleteFromR2(item.key).catch(() => {})));
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
    .select("image_key, media")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mediaKeys = Array.isArray(event?.media)
    ? event.media
        .map((item) => item as { key?: unknown })
        .map((item) => item.key)
        .filter((key): key is string => typeof key === "string")
    : [];
  const keys = [...new Set([event?.image_key, ...mediaKeys].filter((key): key is string => typeof key === "string" && key.length > 0))];
  await Promise.all(keys.map((key) => deleteFromR2(key).catch(() => {})));

  return NextResponse.json({ ok: true });
}