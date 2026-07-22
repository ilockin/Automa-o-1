# IG DM Automator

Automação de DM do Instagram, sem mensalidade. Comentário com palavra-chave →
resposta privada; resposta de story/DM → boas-vindas; botão → link + lembrete.
Substituto pessoal do ManyChat, rodando em planos grátis (Supabase + Vercel).

> Regra de ouro: só enviamos DM para quem **interagiu** (comentou/respondeu).
> Nada de disparo em massa para base fria — isso derruba a conta.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind** → Vercel
- **Supabase (Postgres)** com service role key (só servidor)
- API **Instagram com Login do Instagram** (`graph.instagram.com`, v25.0)

## Como funciona

1. `app/api/webhook` recebe `comments` e `messages` da Meta (valida a assinatura
   `X-Hub-Signature-256`), grava em `events` e enfileira o que casar as regras.
2. `lib/drain.ts` drena a fila (`~2/s`, teto `~200/h`) com trava atômica
   (`claim_queue_batch` + `FOR UPDATE SKIP LOCKED`) → nunca envia em dobro.
3. `pg_cron` + `pg_net` batem em `/api/drain` a cada minuto e em
   `/api/refresh-token` 1x por semana (Vercel Hobby não tem cron de minuto).
   O webhook também chama a drenagem via `after()` para parecer instantâneo.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. Resumo:

| Var | O que é |
|-----|---------|
| `IG_APP_ID` / `IG_APP_SECRET` | Do produto Instagram na Meta |
| `APP_BASE_URL` | URL pública (sem barra no fim) |
| `WEBHOOK_VERIFY_TOKEN` | Token que você inventa (repete na Meta) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Do projeto Supabase |
| `CRON_SECRET` | Protege `/api/drain` e `/api/refresh-token` |
| `APP_PASSWORD` | Senha do painel (Basic Auth). Vazio = aberto |
| `CONTACT_EMAIL` | E-mail nas páginas de privacidade (opcional) |

## Setup

1. **Banco**: no SQL Editor do Supabase, rode `supabase/migrations/0001_init.sql`.
2. **Env**: preencha as variáveis na Vercel (e em `.env.local` para rodar local).
3. **Deploy**: `vercel` (ou conecte o repo na Vercel) e aponte o domínio.
4. **Meta**: crie o app, cadastre o redirect `APP_BASE_URL/api/oauth/callback`,
   o webhook `APP_BASE_URL/api/webhook` (campos `comments` e `messages`) com o
   `WEBHOOK_VERIFY_TOKEN`, adicione-se como testador e **publique** o app.
5. **Conectar**: abra o painel e clique em **Conectar Instagram**.
6. **Cron**: rode `supabase/cron_setup.sql` (troque os placeholders).

## Rodar local

```bash
npm install
npm run dev      # http://localhost:3000
```

O webhook da Meta não alcança `localhost`; para testar ponta a ponta use o
deploy na Vercel (ou um túnel).

## Rotas

- `GET/POST /api/webhook` — handshake + eventos
- `GET /api/oauth/callback` — login do Instagram
- `POST /api/drain` — worker da fila (Bearer `CRON_SECRET`)
- `POST /api/refresh-token` — renova token (Bearer `CRON_SECRET`)
- `GET /api/media` — posts para o seletor visual
- `/` painel · `/automations/[id]` editor · `/privacidade` · `/exclusao-de-dados`

## Limites reais

- Não dá para **exigir** que a pessoa siga antes do link (a API não verifica
  seguidor) — só dá para pedir na mensagem.
- Não dá para saber se a pessoa **clicou** no link → o lembrete é por tempo.
- Disparo em massa para base fria é proibido.
