// app/guardados/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { Database, Profile } from "@/src/types/database";
import GuardadosClient from "./GuardadosClient";
import { getSavedItems } from "@/app/actions/saved";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guardados | B-ISAF" };

export default async function GuardadosPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  const savedItems = await getSavedItems(profile.id);

  const discMap = new Map<string, { id: string; name: string }>();
  for (const item of savedItems) {
    if (!discMap.has(item.disciplineId)) {
      discMap.set(item.disciplineId, { id: item.disciplineId, name: item.disciplineName });
    }
  }

  return (
    <GuardadosClient
      profile={profile as Profile}
      savedItems={savedItems}
      disciplines={Array.from(discMap.values())}
    />
  );
}