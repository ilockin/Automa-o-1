import { getSupabaseAdmin } from "@/lib/supabase";
import type { Automation } from "@/lib/types";

export async function listAutomations(): Promise<Automation[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("automations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Automation[]) ?? [];
}

export async function getActiveAutomations(): Promise<Automation[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("automations")
    .select("*")
    .eq("active", true);
  if (error) throw error;
  return (data as Automation[]) ?? [];
}

export async function getAutomation(id: string): Promise<Automation | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("automations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Automation) ?? null;
}

export async function createAutomation(
  patch: Partial<Automation>
): Promise<Automation> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("automations")
    .insert({ name: patch.name ?? "Nova automação", ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as Automation;
}

export async function updateAutomation(
  id: string,
  patch: Partial<Automation>
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("automations").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteAutomation(id: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("automations").delete().eq("id", id);
  if (error) throw error;
}
