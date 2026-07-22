-- =====================================================================
-- IG DM Automator — schema inicial
-- Todas as tabelas com RLS LIGADO e SEM políticas: acesso só pelo
-- servidor via service role key (que ignora RLS). O browser nunca lê.
-- Horários em timestamptz (UTC). Exibição em America/Sao_Paulo é feita na UI.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- config: 1 única linha (singleton) com o token e dados do Instagram
-- ---------------------------------------------------------------------
create table if not exists public.config (
  id                  boolean primary key default true,
  ig_access_token     text,
  ig_user_id          text,
  ig_username         text,
  name                text,
  profile_picture_url text,
  token_expires_at    timestamptz,
  updated_at          timestamptz not null default now(),
  constraint config_singleton check (id = true)
);

-- ---------------------------------------------------------------------
-- automations: cada automação configurada no painel
-- ---------------------------------------------------------------------
create table if not exists public.automations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  active                 boolean not null default true,
  -- gatilhos ligados: {"comment":true,"story":false,"dm":false}
  triggers               jsonb not null default '{"comment":true,"story":false,"dm":false}'::jsonb,
  keywords               text[] not null default '{}',
  match_type             text not null default 'contains'
                           check (match_type in ('contains','exact','any')),
  target_media_id        text,                       -- post/reels específico (opcional)
  public_replies         text[] not null default '{}', -- variações de resposta pública
  welcome_dm             text not null default '',
  quick_reply_label      text,                       -- rótulo do botão de resposta rápida
  link_text              text,
  link_button_label      text,
  link_url               text,
  reminder_text          text,
  reminder_delay_seconds integer not null default 3600,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- followups: sequência de envio derivada da automação
-- ---------------------------------------------------------------------
create table if not exists public.followups (
  id            uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  step_order    integer not null,
  kind          text not null check (kind in ('welcome','link','reminder')),
  payload       jsonb not null default '{}'::jsonb,
  delay_seconds integer not null default 0
);
create index if not exists followups_automation_idx on public.followups(automation_id);

-- ---------------------------------------------------------------------
-- contacts: quem já interagiu (chave = ig_user_id da pessoa)
-- ---------------------------------------------------------------------
create table if not exists public.contacts (
  ig_user_id         text primary key,
  username           text,
  first_seen_at      timestamptz not null default now(),
  last_reply_at      timestamptz,                    -- abre a janela de 24h
  last_automation_id uuid references public.automations(id) on delete set null
);

-- ---------------------------------------------------------------------
-- queue: fila de envio com trava atômica e controle da janela de 24h
-- ---------------------------------------------------------------------
create table if not exists public.queue (
  id                uuid primary key default gen_random_uuid(),
  contact_ig_id     text,
  automation_id     uuid references public.automations(id) on delete set null,
  kind              text not null,   -- private_reply | welcome | link | reminder | public_reply
  recipient_type    text not null check (recipient_type in ('comment_id','id','comment')),
  recipient_value   text not null,
  payload           jsonb not null default '{}'::jsonb,
  status            text not null default 'pending'
                      check (status in ('pending','sending','sent','failed','skipped')),
  claimed_at        timestamptz,
  send_after        timestamptz not null default now(),
  window_expires_at timestamptz,     -- para follow-ups: expira 24h após a resposta
  attempts          integer not null default 0,
  last_error        text,
  dedupe_key        text,            -- garante 1x por comentário
  created_at        timestamptz not null default now()
);
create unique index if not exists queue_dedupe_key_uidx
  on public.queue(dedupe_key) where dedupe_key is not null;
create index if not exists queue_drain_idx
  on public.queue(status, send_after);
create index if not exists queue_sent_recent_idx
  on public.queue(status, claimed_at);

-- ---------------------------------------------------------------------
-- events: log de tudo que chega no webhook
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  raw         jsonb not null,
  received_at timestamptz not null default now(),
  processed   boolean not null default false
);
create index if not exists events_received_idx on public.events(received_at desc);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_config_updated on public.config;
create trigger trg_config_updated before update on public.config
  for each row execute function public.set_updated_at();

drop trigger if exists trg_automations_updated on public.automations;
create trigger trg_automations_updated before update on public.automations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- claim atômico da fila: marca 'sending' e devolve as linhas travadas.
-- FOR UPDATE SKIP LOCKED garante que dois workers nunca peguem o mesmo item.
-- ---------------------------------------------------------------------
create or replace function public.claim_queue_batch(p_limit int)
returns setof public.queue
language plpgsql as $$
begin
  return query
  update public.queue q
     set status = 'sending',
         claimed_at = now(),
         attempts = q.attempts + 1
   where q.id in (
     select id from public.queue
      where status = 'pending'
        and send_after <= now()
      order by send_after asc
      for update skip locked
      limit p_limit
   )
  returning q.*;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS ligado em tudo, sem políticas (só service role acessa)
-- ---------------------------------------------------------------------
alter table public.config      enable row level security;
alter table public.automations enable row level security;
alter table public.followups   enable row level security;
alter table public.contacts    enable row level security;
alter table public.queue       enable row level security;
alter table public.events      enable row level security;
