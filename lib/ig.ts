import { IG_API, IG_GRAPH, IG_VERSION, env } from "@/lib/env";

// ---------------------------------------------------------------------
// Tipos de mensagem que sabemos montar
// ---------------------------------------------------------------------
export type IgRecipient = { id: string } | { comment_id: string };

export type QuickReply = { title: string; payload: string };
export type UrlButton = { url: string; title: string };

export type MessagePayload =
  | { kind: "text"; text: string }
  | { kind: "quick_replies"; text: string; quickReplies: QuickReply[] }
  | { kind: "button"; text: string; buttons: UrlButton[] };

// Monta o objeto "message" no formato da API a partir do nosso payload.
export function buildMessage(p: MessagePayload): Record<string, unknown> {
  if (p.kind === "text") {
    return { text: p.text };
  }
  if (p.kind === "quick_replies") {
    return {
      text: p.text,
      quick_replies: p.quickReplies.map((q) => ({
        content_type: "text",
        title: q.title,
        payload: q.payload,
      })),
    };
  }
  // button template
  return {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: p.text,
        buttons: p.buttons.map((b) => ({
          type: "web_url",
          url: b.url,
          title: b.title,
        })),
      },
    },
  };
}

// ---------------------------------------------------------------------
// Helper de fetch com tratamento de erro da Graph API
// ---------------------------------------------------------------------
async function igFetch(
  url: string,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = (json?.error as { message?: string })?.message || text || res.statusText;
    throw new Error(`IG API ${res.status}: ${err}`);
  }
  return json;
}

function graph(path: string): string {
  return `${IG_GRAPH}/${IG_VERSION}/${path.replace(/^\/+/, "")}`;
}

// ---------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------

// URL para onde mandamos o usuário logar / autorizar.
export function authorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: env.igAppId(),
    redirect_uri: env.oauthRedirectUri(),
    response_type: "code",
    scope:
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments",
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

// Troca o "code" por um token de curta duração (+ o user_id).
export async function exchangeCodeForShortToken(
  code: string
): Promise<{ access_token: string; user_id: string }> {
  const body = new URLSearchParams({
    client_id: env.igAppId(),
    client_secret: env.igAppSecret(),
    grant_type: "authorization_code",
    redirect_uri: env.oauthRedirectUri(),
    code,
  });
  const json = await igFetch(`${IG_API}/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return {
    access_token: String(json.access_token),
    user_id: String(json.user_id),
  };
}

// Troca o token curto por um token longo (~60 dias).
export async function exchangeShortForLongToken(
  shortToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: env.igAppSecret(),
    access_token: shortToken,
  });
  const json = await igFetch(`${IG_GRAPH}/access_token?${params.toString()}`);
  return {
    access_token: String(json.access_token),
    expires_in: Number(json.expires_in ?? 5184000),
  };
}

// Renova (estende) o token longo. Deve rodar semanalmente.
export async function refreshLongToken(
  token: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: token,
  });
  const json = await igFetch(
    `${IG_GRAPH}/refresh_access_token?${params.toString()}`
  );
  return {
    access_token: String(json.access_token),
    expires_in: Number(json.expires_in ?? 5184000),
  };
}

// ---------------------------------------------------------------------
// Perfil / assinatura / mídia
// ---------------------------------------------------------------------

export async function getProfile(token: string): Promise<{
  user_id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}> {
  const params = new URLSearchParams({
    fields: "user_id,username,name,profile_picture_url",
    access_token: token,
  });
  const json = await igFetch(`${IG_GRAPH}/me?${params.toString()}`);
  return {
    user_id: String(json.user_id),
    username: String(json.username),
    name: json.name ? String(json.name) : undefined,
    profile_picture_url: json.profile_picture_url
      ? String(json.profile_picture_url)
      : undefined,
  };
}

// Assina os webhooks da conta (comments + messages). Feito no callback do login.
export async function subscribeApp(
  igUserId: string,
  token: string
): Promise<void> {
  const params = new URLSearchParams({
    subscribed_fields: "comments,messages",
    access_token: token,
  });
  await igFetch(`${graph(`${igUserId}/subscribed_apps`)}?${params.toString()}`, {
    method: "POST",
  });
}

export type IgMedia = {
  id: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  permalink?: string;
};

// Lista os posts/reels da conta (para o seletor visual de posts no painel).
export async function getMedia(
  igUserId: string,
  token: string,
  limit = 24
): Promise<IgMedia[]> {
  const params = new URLSearchParams({
    fields: "id,media_type,media_url,thumbnail_url,caption,permalink",
    limit: String(limit),
    access_token: token,
  });
  const json = await igFetch(
    `${graph(`${igUserId}/media`)}?${params.toString()}`
  );
  return (json.data as IgMedia[]) ?? [];
}

// ---------------------------------------------------------------------
// Envio de mensagens e resposta pública
// ---------------------------------------------------------------------

// Envia uma mensagem (DM normal ou resposta privada a comentário).
export async function sendMessage(
  igUserId: string,
  token: string,
  recipient: IgRecipient,
  message: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return igFetch(
    `${graph(`${igUserId}/messages`)}?access_token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipient, message }),
    }
  );
}

// Publica uma resposta pública no comentário (opcional).
export async function replyToComment(
  commentId: string,
  token: string,
  message: string
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ message, access_token: token });
  return igFetch(
    `${graph(`${commentId}/replies`)}?${params.toString()}`,
    { method: "POST" }
  );
}
