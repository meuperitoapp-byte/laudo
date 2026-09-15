// Shim de teste — substitui @/lib/supabase/server (que depende de next/headers,
// só disponível dentro de uma requisição Next.js real) por um client com a
// service role key, direto do .env.local. Usado SÓ pelo script de verificação
// do anti-join (scripts/antijoin-check/run.ts), nunca pelo app em si.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { Database } from "@/types/database";

function carregarEnvLocal() {
  const raiz = join(fileURLToPath(import.meta.url), "..", "..", "..", "..");
  const conteudo = readFileSync(join(raiz, ".env.local"), "utf8");
  for (const linha of conteudo.split("\n")) {
    const i = linha.indexOf("=");
    if (i === -1) continue;
    const chave = linha.slice(0, i).trim();
    if (!chave || process.env[chave]) continue;
    process.env[chave] = linha.slice(i + 1).trim();
  }
}
carregarEnvLocal();

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
