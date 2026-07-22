import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Cliente admin (service role) — SÓ no servidor. Ignora RLS.
// Criado de forma preguiçosa para não quebrar o build quando as envs
// ainda não estão definidas.
let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
