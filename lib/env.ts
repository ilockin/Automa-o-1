// Leitura centralizada das variáveis de ambiente (só servidor).
// Falha cedo e com mensagem clara se algo obrigatório faltar.

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  igAppId: () => required("IG_APP_ID"),
  igAppSecret: () => required("IG_APP_SECRET"),
  appBaseUrl: () => required("APP_BASE_URL").replace(/\/+$/, ""),
  webhookVerifyToken: () => required("WEBHOOK_VERIFY_TOKEN"),
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  cronSecret: () => required("CRON_SECRET"),
  // Opcional: rótulo de callback OAuth (default /api/oauth/callback)
  oauthRedirectUri: () =>
    (optional("OAUTH_REDIRECT_URI") ||
      `${required("APP_BASE_URL").replace(/\/+$/, "")}/api/oauth/callback`),
};

export const IG_GRAPH = "https://graph.instagram.com";
export const IG_API = "https://api.instagram.com";
export const IG_VERSION = "v25.0";
