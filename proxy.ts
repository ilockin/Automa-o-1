import { NextRequest, NextResponse } from "next/server";

// Next 16: o antigo middleware.ts virou proxy.ts (exporta a função `proxy`).
// Protege o PAINEL com uma senha simples (Basic Auth) definida em APP_PASSWORD.
// Se APP_PASSWORD não estiver definida, o painel fica aberto (modo dev).
//
// Rotas SEMPRE públicas (a Meta e o cron precisam alcançá-las sem senha):
//   /api/webhook, /api/oauth, /api/drain, /api/refresh-token,
//   /privacidade, /exclusao-de-dados

const PUBLIC_PREFIXES = [
  "/api/webhook",
  "/api/oauth",
  "/api/drain",
  "/api/refresh-token",
  "/privacidade",
  "/exclusao-de-dados",
];

export function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  // Sem senha configurada -> não protege nada.
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6)); // "user:senha"
      const pass = decoded.slice(decoded.indexOf(":") + 1);
      if (pass === password) return NextResponse.next();
    } catch {
      // cai no 401
    }
  }

  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Painel", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
