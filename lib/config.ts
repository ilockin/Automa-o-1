import { getSupabaseAdmin } from "@/lib/supabase";

export type Config = {
  id: boolean;
  ig_access_token: string | null;
  ig_user_id: string | null;
  ig_username: string | null;
  name: string | null;
  profile_picture_url: string | null;
  token_expires_at: string | null;
  updated_at: string;
};

// Lê a linha única de config (ou null se ainda não conectou o Instagram).
export async function getConfig(): Promise<Config | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("config")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return (data as Config) ?? null;
}

// Grava/atualiza a config (upsert na linha única).
export async function upsertConfig(patch: Partial<Config>): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("config")
    .upsert({ id: true, ...patch }, { onConflict: "id" });
  if (error) throw error;
}
