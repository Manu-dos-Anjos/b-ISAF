import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function PATCH(request: NextRequest) {
	try {
		const { avatarUrl } = await request.json();

		if (typeof avatarUrl !== "string" || !avatarUrl.trim()) {
			return NextResponse.json(
				{ error: "URL do avatar inválida" },
				{ status: 400 }
			);
		}

		const supabase = await createClient() as any;
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ error: "Não autenticado" },
				{ status: 401 }
			);
		}

		const { data, error } = await supabase
			.from("profiles")
			.update({
				avatar_url: avatarUrl.trim(),
				updated_at: new Date().toISOString(),
			})
			.eq("id", user.id)
			.select("id, avatar_url")
			.single();

		if (error) {
			console.error("Erro ao atualizar avatar:", error);
			return NextResponse.json(
				{ error: "Falha ao atualizar avatar" },
				{ status: 500 }
			);
		}

		return NextResponse.json({ profile: data });
	} catch (error) {
		console.error("Erro geral ao atualizar avatar:", error);
		return NextResponse.json(
			{ error: "Erro interno" },
			{ status: 500 }
		);
	}
}
