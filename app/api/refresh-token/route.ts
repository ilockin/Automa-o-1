import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getConfig, upsertConfig } from "@/lib/config";
import { refreshLongToken } from "@/lib/ig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = env.cronSecret();
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

// Chamado pelo pg_cron 1x por semana. Renova o token longo (~60 dias).
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const config = await getConfig();
  if (!config?.ig_access_token) {
    return NextResponse.json({ ok: false, reason: "Sem token" }, { status: 200 });
  }

  try {
    const { access_token, expires_in } = await refreshLongToken(
      config.ig_access_token
    );
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
    await upsertConfig({
      ig_access_token: access_token,
      token_expires_at: expiresAt,
    });
    return NextResponse.json({ ok: true, token_expires_at: expiresAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
