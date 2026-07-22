import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { getMedia } from "@/lib/ig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lista os posts/reels da conta para o seletor visual no editor de automação.
export async function GET() {
  const config = await getConfig();
  if (!config?.ig_access_token || !config?.ig_user_id) {
    return NextResponse.json(
      { error: "Instagram não conectado", data: [] },
      { status: 200 }
    );
  }
  try {
    const media = await getMedia(config.ig_user_id, config.ig_access_token);
    return NextResponse.json({ data: media });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, data: [] }, { status: 200 });
  }
}
