import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { env } from "@/lib/env";
import { verifySignature } from "@/lib/crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getConfig } from "@/lib/config";
import { getActiveAutomations } from "@/lib/automations";
import { matchKeyword } from "@/lib/matching";
import {
  enqueuePrivateReply,
  enqueuePublicReply,
  enqueueWelcomeDM,
  enqueueFollowups,
  touchContactReply,
} from "@/lib/queue";
import { drainQueue } from "@/lib/drain";
import type { Automation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -------- GET: handshake de verificação do webhook --------
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");
  const expected = env.webhookVerifyToken();
  const ok = mode === "subscribe" && token === expected;

  // Registro de diagnóstico: guarda toda tentativa de verificação para depuração.
  try {
    const db = getSupabaseAdmin();
    await db.from("events").insert({
      type: "webhook_verify",
      raw: {
        mode,
        challenge,
        token_matches: token === expected,
        token_len: token ? token.length : 0,
        result: ok ? 200 : 403,
        at: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("Falha ao registrar verificação:", e);
  }

  if (ok) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// -------- POST: eventos (comments + messages) --------
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifySignature(raw, signature, env.igAppSecret())) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  // Grava o evento cru e processa. Respondemos 200 rápido; o processamento
  // pesado roda, mas mantemos aqui de forma direta (é leve: só enfileira).
  const db = getSupabaseAdmin();
  await db.from("events").insert({ type: body.object ?? "unknown", raw: body });

  try {
    await processBody(body);
  } catch (e) {
    // Nunca devolvemos erro para a Meta (senão ela reenvia). Só logamos.
    console.error("Erro processando webhook:", e);
  }

  // Dispara a drenagem da fila em background para o envio parecer instantâneo.
  // A trava atômica garante que nunca envie em dobro mesmo com o cron rodando.
  after(async () => {
    try {
      await drainQueue();
    } catch (e) {
      console.error("Erro drenando fila (after):", e);
    }
  });

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------
// Processamento
// ---------------------------------------------------------------------

async function processBody(body: WebhookBody): Promise<void> {
  const config = await getConfig();
  const myId = config?.ig_user_id ?? null;
  const automations = await getActiveAutomations();
  if (automations.length === 0) return;

  for (const entry of body.entry ?? []) {
    // ----- Comentários -----
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      await handleComment(change.value, myId, automations);
    }
    // ----- Mensagens (DM, story reply, quick reply) -----
    for (const m of entry.messaging ?? []) {
      await handleMessaging(m, myId, automations);
    }
  }
}

// Comentário casou keyword -> resposta privada (fura janela 24h) + resposta pública opcional
async function handleComment(
  value: CommentValue | undefined,
  myId: string | null,
  automations: Automation[]
): Promise<void> {
  if (!value) return;
  const commentId = value.id;
  const text = value.text ?? "";
  const fromId = value.from?.id ?? null;
  const mediaId = value.media?.id ?? null;

  // Ignora comentários da própria conta.
  if (myId && fromId && fromId === myId) return;
  if (!commentId) return;

  for (const a of automations) {
    if (!a.triggers?.comment) continue;
    if (a.target_media_id && mediaId && a.target_media_id !== mediaId) continue;
    if (!matchKeyword(text, a.keywords, a.match_type)) continue;

    await enqueuePrivateReply(a, commentId, fromId);
    await enqueuePublicReply(a, commentId);
    break; // primeira automação que casar vence
  }
}

// Mensagens: quick reply (botão) abre janela e dispara follow-ups;
// story reply / DM comum -> welcome se casar keyword.
async function handleMessaging(
  m: MessagingItem,
  myId: string | null,
  automations: Automation[]
): Promise<void> {
  if (m.message?.is_echo) return; // mensagem enviada por nós
  const senderId = m.sender?.id ?? null;
  if (!senderId) return;
  if (myId && senderId === myId) return;

  const msg = m.message;
  if (!msg) return;

  // 1) Pessoa tocou no botão de resposta rápida (payload GETLINK:<automationId>)
  const qrPayload = msg.quick_reply?.payload ?? null;
  if (qrPayload && qrPayload.startsWith("GETLINK:")) {
    const automationId = qrPayload.slice("GETLINK:".length);
    const a = automations.find((x) => x.id === automationId);
    if (a) {
      await touchContactReply(senderId, null, a.id); // abre a janela de 24h
      await enqueueFollowups(a, senderId);
    }
    return;
  }

  const text = msg.text ?? "";
  const isStoryReply = Boolean(msg.reply_to?.story);

  for (const a of automations) {
    const triggerOn = isStoryReply ? a.triggers?.story : a.triggers?.dm;
    if (!triggerOn) continue;
    if (!matchKeyword(text, a.keywords, a.match_type)) continue;

    // Conversa já aberta -> welcome direto permitido.
    await touchContactReply(senderId, null, a.id);
    await enqueueWelcomeDM(a, senderId);
    break;
  }
}

// ---------------------------------------------------------------------
// Tipos do payload do webhook (parcial, só o que usamos)
// ---------------------------------------------------------------------
type WebhookBody = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    changes?: Array<{ field?: string; value?: CommentValue }>;
    messaging?: MessagingItem[];
  }>;
};

type CommentValue = {
  id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string };
  parent_id?: string;
};

type MessagingItem = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    quick_reply?: { payload?: string };
    reply_to?: { story?: { id?: string; url?: string }; mid?: string };
  };
};
