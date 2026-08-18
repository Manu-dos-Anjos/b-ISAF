// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { Database } from "@/src/types/database";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, bio } = body;

    if (!fullName || fullName.trim().length < 3) {
      return NextResponse.json(
        { error: "Nome deve ter pelo menos 3 caracteres" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {
      full_name: fullName.trim(),
      bio: bio?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(profileUpdate as any)
      .eq("id", user.id)
      .select("id, full_name, bio, avatar_url, email, role")
      .single();

    if (error) {
      console.error("Erro ao atualizar perfil:", error);
      return NextResponse.json(
        { error: "Falha ao atualizar perfil" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: data });
  } catch (err) {
    console.error("Erro geral:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}