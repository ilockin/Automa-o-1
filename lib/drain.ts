import { getSupabaseAdmin } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import {
  buildMessage,
  replyToComment,
  sendMessage,
  type MessagePayload,
} from "@/lib/ig";
import {
  MAX_BATCH,
  MAX_PER_HOUR,
  SEND_SPACING_MS,
  sentInLastHour,
} from "@/lib/queue";

type QueueRow = {
  id: string;
  kind: string;
  recipient_type: "comment_id" | "id" | "comment";
  recipient_value: string;
  payload: Record<string, unknown>;
  window_expires_at: string | null;
  attempts: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_ATTEMPTS = 3;

export type DrainResult = {
  claimed: number;
  sent: number;
  skipped: number;
  failed: number;
  reason?: string;
};

// Drena a fila respeitando: teto de ~200/h, ~2/seg, janela de 24h para
// follow-ups. A trava atômica (claim_queue_batch) impede envio em dobro.
export async function drainQueue(): Promise<DrainResult> {
  const result: DrainResult = { claimed: 0, sent: 0, skipped: 0, failed: 0 };

  const config = await getConfig();
  if (!config?.ig_access_token || !config?.ig_user_id) {
    result.reason = "Instagram não conectado";
    return result;
  }

  const remaining = MAX_PER_HOUR - (await sentInLastHour());
  if (remaining <= 0) {
    result.reason = "Teto de 200/h atingido";
    return result;
  }
  const limit = Math.min(remaining, MAX_BATCH);

  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("claim_queue_batch", { p_limit: limit });
  if (error) throw error;
  const rows = (data as QueueRow[]) ?? [];
  result.claimed = rows.length;
  if (rows.length === 0) return result;

  const token = config.ig_access_token;
  const igUserId = config.ig_user_id;
  const now = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Follow-ups fora da janela de 24h -> pula.
    if (
      (row.kind === "link" || row.kind === "reminder") &&
      row.window_expires_at &&
      new Date(row.window_expires_at).getTime() < now
    ) {
      await mark(db, row.id, "skipped", "Janela de 24h expirada");
      result.skipped++;
      continue;
    }

    try {
      if (row.recipient_type === "comment") {
        // resposta pública no comentário
        const text = String((row.payload as { text?: string }).text ?? "");
        await replyToComment(row.recipient_value, token, text);
      } else {
        const recipient =
          row.recipient_type === "comment_id"
            ? { comment_id: row.recipient_value }
            : { id: row.recipient_value };
        const message = buildMessage(row.payload as unknown as MessagePayload);
        await sendMessage(igUserId, token, recipient, message);
      }
      await mark(db, row.id, "sent", null);
      result.sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (row.attempts < MAX_ATTEMPTS) {
        // devolve para 'pending' com um pequeno backoff
        await db
          .from("queue")
          .update({
            status: "pending",
            last_error: msg,
            send_after: new Date(now + 60_000).toISOString(),
          })
          .eq("id", row.id);
      } else {
        await mark(db, row.id, "failed", msg);
        result.failed++;
      }
    }

    // ~2 por segundo
    if (i < rows.length - 1) await sleep(SEND_SPACING_MS);
  }

  return result;
}

async function mark(
  db: ReturnType<typeof getSupabaseAdmin>,
  id: string,
  status: "sent" | "failed" | "skipped",
  error: string | null
): Promise<void> {
  await db
    .from("queue")
    .update({ status, last_error: error })
    .eq("id", id);
}
