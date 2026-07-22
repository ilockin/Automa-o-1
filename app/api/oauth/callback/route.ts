import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  exchangeCodeForShortToken,
  exchangeShortForLongToken,
  getProfile,
  subscribeApp,
} from "@/lib/ig";
import { upsertConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Callback do login do Instagram: troca o code por token longo, grava a config
// e assina os webhooks (comments + messages) da conta.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const error = sp.get("error");
  const base = env.appBaseUrl();

  if (error) {
    const desc = sp.get("error_description") ?? error;
    return NextResponse.redirect(
      `${base}/?erro=${encodeURIComponent(desc)}`
    );
  }
  if (!code) {
    return NextResponse.redirect(`${base}/?erro=sem_code`);
  }

  try {
    // 1) code -> token curto (+ user_id)
    const short = await exchangeCodeForShortToken(code);
    // 2) token curto -> token longo (~60 dias)
    const long = await exchangeShortForLongToken(short.access_token);
    // 3) perfil
    const profile = await getProfile(long.access_token);
    // 4) grava a config
    const expiresAt = new Date(
      Date.now() + long.expires_in * 1000
    ).toISOString();
    await upsertConfig({
      ig_access_token: long.access_token,
      ig_user_id: profile.user_id,
      ig_username: profile.username,
      name: profile.name ?? null,
      profile_picture_url: profile.profile_picture_url ?? null,
      token_expires_at: expiresAt,
    });
    // 5) assina os webhooks da conta
    try {
      await subscribeApp(profile.user_id, long.access_token);
    } catch (e) {
      console.error("Falha ao assinar webhooks:", e);
    }

    return NextResponse.redirect(`${base}/?conectado=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(`${base}/?erro=${encodeURIComponent(msg)}`);
  }
}
