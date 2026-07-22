import crypto from "node:crypto";

// Valida a assinatura X-Hub-Signature-256 que a Meta envia no webhook.
// A assinatura é o HMAC-SHA256 do CORPO CRU usando o app secret.
// Comparação em tempo constante para evitar timing attacks.
export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Gera uma string aleatória segura (para o verify token do webhook, CRON_SECRET, etc.)
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
