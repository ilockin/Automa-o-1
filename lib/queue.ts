import { getSupabaseAdmin } from "@/lib/supabase";
import type { MessagePayload } from "@/lib/ig";
import type { Automation, QueueKind, RecipientType } from "@/lib/types";

// Limites de taxa (regra prática da Meta para DM automática):
export const MAX_PER_HOUR = 200; // ~200 DMs automáticas por hora
export const SEND_SPACING_MS = 500; // ~2 por segundo
export const MAX_BATCH = 20; // teto por rodada do worker
const WINDOW_MS = 24 * 60 * 60 * 1000; // janela de 24h

type EnqueueArgs = {
  contactIgId?: string | null;
  automationId?: string | null;
  kind: QueueKind;
  recipientType: RecipientType;
  recipientValue: string;
  payload: MessagePayload | { text: string }; // public_reply usa {text}
  sendAfter?: Date;
  windowExpiresAt?: Date | null;
  dedupeKey?: string | null;
};

// Insere um item na fila. Se houver dedupeKey duplicada, o insert é ignorado
// (garante 1x por comentário) graças ao índice único parcial.
export async function enqueue(args: EnqueueArgs): Promise<void> {
  const db = getSupabaseAdmin();
  const row = {
    contact_ig_id: args.contactIgId ?? null,
    automation_id: args.automationId ?? null,
    kind: args.kind,
    recipient_type: args.recipientType,
    recipient_value: args.recipientValue,
    payload: args.payload,
    status: "pending",
    send_after: (args.sendAfter ?? new Date()).toISOString(),
    window_expires_at: args.windowExpiresAt
      ? args.windowExpiresAt.toISOString()
      : null,
    dedupe_key: args.dedupeKey ?? null,
  };
  const { error } = await db.from("queue").insert(row);
  // 23505 = unique_violation (dedupe): tratamos como sucesso silencioso.
  if (error && error.code !== "23505") throw error;
}

// Monta o payload da mensagem de boas-vindas, com botão de resposta rápida
// se a automação definir um rótulo. O payload do quick reply carrega o id da
// automação para sabermos quais follow-ups enfileirar quando a pessoa tocar.
export function welcomePayload(a: Automation): MessagePayload {
  const text = a.welcome_dm || "Oi! Obrigado pela mensagem 🙌";
  if (a.quick_reply_label) {
    return {
      kind: "quick_replies",
      text,
      quickReplies: [
        { title: a.quick_reply_label, payload: `GETLINK:${a.id}` },
      ],
    };
  }
  return { kind: "text", text };
}

// Enfileira a resposta privada a um comentário (fura a janela de 24h).
// dedupeKey garante que cada comentário gere no máximo uma DM.
export async function enqueuePrivateReply(
  a: Automation,
  commentId: string,
  contactIgId: string | null
): Promise<void> {
  await enqueue({
    contactIgId,
    automationId: a.id,
    kind: "private_reply",
    recipientType: "comment_id",
    recipientValue: commentId,
    payload: welcomePayload(a),
    dedupeKey: `private_reply:${commentId}`,
  });
}

// Enfileira uma resposta pública no comentário (sorteia entre variações).
export async function enqueuePublicReply(
  a: Automation,
  commentId: string
): Promise<void> {
  const variants = (a.public_replies || []).filter((s) => s.trim());
  if (variants.length === 0) return;
  const text = variants[Math.floor(Math.random() * variants.length)];
  await enqueue({
    automationId: a.id,
    kind: "public_reply",
    recipientType: "comment",
    recipientValue: commentId,
    payload: { text },
    dedupeKey: `public_reply:${commentId}`,
  });
}

// Enfileira a DM de boas-vindas direta (story reply ou DM — conversa já aberta).
export async function enqueueWelcomeDM(
  a: Automation,
  igUserIdOfPerson: string
): Promise<void> {
  await enqueue({
    contactIgId: igUserIdOfPerson,
    automationId: a.id,
    kind: "welcome",
    recipientType: "id",
    recipientValue: igUserIdOfPerson,
    payload: welcomePayload(a),
  });
}

// Quando a pessoa toca no botão (abre a janela de 24h): enfileira o link e,
// depois do atraso, o lembrete. Ambos respeitam a janela de 24h.
export async function enqueueFollowups(
  a: Automation,
  igUserIdOfPerson: string
): Promise<void> {
  const now = Date.now();
  const windowExpires = new Date(now + WINDOW_MS);

  // 1) DM com o link (botão que abre a URL)
  if (a.link_url) {
    await enqueue({
      contactIgId: igUserIdOfPerson,
      automationId: a.id,
      kind: "link",
      recipientType: "id",
      recipientValue: igUserIdOfPerson,
      payload: {
        kind: "button",
        text: a.link_text || "Aqui está o seu link 👇",
        buttons: [
          {
            url: a.link_url,
            title: a.link_button_label || "Abrir",
          },
        ],
      },
      sendAfter: new Date(now),
      windowExpiresAt: windowExpires,
    });
  }

  // 2) Lembrete (por tempo — não dá para saber se clicou)
  if (a.reminder_text) {
    await enqueue({
      contactIgId: igUserIdOfPerson,
      automationId: a.id,
      kind: "reminder",
      recipientType: "id",
      recipientValue: igUserIdOfPerson,
      payload: { kind: "text", text: a.reminder_text },
      sendAfter: new Date(now + (a.reminder_delay_seconds || 0) * 1000),
      windowExpiresAt: windowExpires,
    });
  }
}

// Registra/atualiza o contato e abre a janela de 24h (last_reply_at = agora).
export async function touchContactReply(
  igUserId: string,
  username: string | null,
  automationId: string | null
): Promise<void> {
  const db = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { error } = await db.from("contacts").upsert(
    {
      ig_user_id: igUserId,
      username,
      last_reply_at: nowIso,
      last_automation_id: automationId,
    },
    { onConflict: "ig_user_id" }
  );
  if (error) throw error;
}

// Quantas DMs foram enviadas na última hora (para respeitar o teto).
export async function sentInLastHour(): Promise<number> {
  const db = getSupabaseAdmin();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from("queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("claimed_at", since);
  if (error) throw error;
  return count ?? 0;
}
