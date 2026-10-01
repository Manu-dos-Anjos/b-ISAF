import { createClient } from "@supabase/supabase-js";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME ?? "bisaf-storage";
const r2 = accountId && accessKeyId && secretAccessKey
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

async function cleanupExpiredNotices() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  let removed = 0;

  while (true) {
    const { data: candidates, error: selectError } = await supabase
      .from("events")
      .select("id, image_key")
      .is("date_start", null)
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(200);

    if (selectError) throw selectError;
    if (!candidates?.length) break;

    const { data: deleted, error: deleteError } = await supabase
      .from("events")
      .delete()
      .in("id", candidates.map((event) => event.id))
      .is("date_start", null)
      .lt("created_at", cutoff)
      .select("id, image_key");

    if (deleteError) throw deleteError;

    for (const event of deleted ?? []) {
      if (!event.image_key) continue;
      if (!r2) {
        console.warn(`Banner não removido do R2 (credenciais ausentes): ${event.id}`);
        continue;
      }
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: event.image_key }));
      } catch (error) {
        console.warn(`Falha ao remover banner do R2 para ${event.id}:`, error.message);
      }
    }

    removed += deleted?.length ?? 0;
    if (!deleted?.length) break;
  }

  console.log(`Avisos sem data removidos: ${removed} (limite: ${cutoff}).`);
}

cleanupExpiredNotices().catch((error) => {
  console.error("Falha na limpeza de avisos expirados:", error.message);
  process.exitCode = 1;
});