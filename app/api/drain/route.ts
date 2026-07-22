import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { drainQueue } from "@/lib/drain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Chamado pelo pg_cron (Supabase) a cada minuto. Protegido pelo CRON_SECRET,
// aceito via header Authorization: Bearer <secret> ou ?secret=<secret>.
function authorized(req: NextRequest): boolean {
  const secret = env.cronSecret();
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const result = await drainQueue();
  return NextResponse.json(result);
}

// Permite acionar manualmente pelo navegador durante os testes.
export async function GET(req: NextRequest) {
  return POST(req);
}
