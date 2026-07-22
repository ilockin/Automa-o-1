-- =====================================================================
-- MOTOR SEM CUSTO: pg_cron + pg_net
-- Rode este script UMA VEZ no SQL Editor do Supabase, DEPOIS do deploy,
-- substituindo os dois placeholders abaixo:
--   {{APP_BASE_URL}}  ex.: https://seu-dominio.com   (sem barra no final)
--   {{CRON_SECRET}}   o mesmo valor da env CRON_SECRET
-- =====================================================================

-- 1) Habilitar as extensões (idempotente)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Remover agendamentos antigos com o mesmo nome (evita duplicar)
select cron.unschedule('drain_queue')    where exists (select 1 from cron.job where jobname = 'drain_queue');
select cron.unschedule('refresh_token')  where exists (select 1 from cron.job where jobname = 'refresh_token');

-- 3) Drenar a fila a cada minuto
select cron.schedule(
  'drain_queue',
  '* * * * *',
  $$
  select net.http_post(
    url     := '{{APP_BASE_URL}}/api/drain',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer {{CRON_SECRET}}'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
  $$
);

-- 4) Renovar o token longo 1x por semana (segunda, 03:00 UTC = 00:00 BRT)
select cron.schedule(
  'refresh_token',
  '0 3 * * 1',
  $$
  select net.http_post(
    url     := '{{APP_BASE_URL}}/api/refresh-token',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer {{CRON_SECRET}}'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
  $$
);

-- 5) Conferir os agendamentos
-- select jobname, schedule, active from cron.job;
