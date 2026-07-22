"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAutomation,
  deleteAutomation,
  getAutomation,
  updateAutomation,
} from "@/lib/automations";
import type { Automation } from "@/lib/types";

// Lê os campos do formulário do editor e monta o patch da automação.
function parseForm(form: FormData): Partial<Automation> {
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const bool = (k: string) => form.get(k) === "on" || form.get(k) === "true";
  const list = (k: string) =>
    str(k)
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  const num = (k: string) => {
    const n = parseInt(str(k), 10);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    name: str("name") || "Automação sem nome",
    active: bool("active"),
    triggers: {
      comment: bool("trigger_comment"),
      story: bool("trigger_story"),
      dm: bool("trigger_dm"),
    },
    keywords: list("keywords"),
    match_type: (str("match_type") as Automation["match_type"]) || "contains",
    target_media_id: str("target_media_id") || null,
    public_replies: list("public_replies"),
    welcome_dm: str("welcome_dm"),
    quick_reply_label: str("quick_reply_label") || null,
    link_text: str("link_text") || null,
    link_button_label: str("link_button_label") || null,
    link_url: str("link_url") || null,
    reminder_text: str("reminder_text") || null,
    reminder_delay_seconds: num("reminder_delay_seconds"),
  };
}

export async function createAutomationAction() {
  const a = await createAutomation({ name: "Nova automação", active: false });
  redirect(`/automations/${a.id}`);
}

export async function saveAutomationAction(id: string, form: FormData) {
  const patch = parseForm(form);
  await updateAutomation(id, patch);
  revalidatePath("/");
  revalidatePath(`/automations/${id}`);
  redirect("/?salvo=1");
}

export async function deleteAutomationAction(id: string) {
  await deleteAutomation(id);
  revalidatePath("/");
  redirect("/?removido=1");
}

export async function toggleActiveAction(id: string) {
  const a = await getAutomation(id);
  if (!a) return;
  await updateAutomation(id, { active: !a.active });
  revalidatePath("/");
}
