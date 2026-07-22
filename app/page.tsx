import Link from "next/link";
import { getConfig, type Config } from "@/lib/config";
import { listAutomations } from "@/lib/automations";
import { authorizeUrl } from "@/lib/ig";
import { formatSP } from "@/lib/time";
import type { Automation } from "@/lib/types";
import {
  createAutomationAction,
  deleteAutomationAction,
  toggleActiveAction,
} from "@/app/actions";

export const dynamic = "force-dynamic";

async function loadData(): Promise<{
  config: Config | null;
  automations: Automation[];
  connectUrl: string | null;
  setupError: string | null;
}> {
  let config: Config | null = null;
  let automations: Automation[] = [];
  let connectUrl: string | null = null;
  let setupError: string | null = null;

  try {
    config = await getConfig();
    automations = await listAutomations();
  } catch (e) {
    setupError =
      e instanceof Error ? e.message : "Erro ao acessar o banco de dados.";
  }
  try {
    connectUrl = authorizeUrl();
  } catch {
    connectUrl = null;
  }
  return { config, automations, connectUrl, setupError };
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { config, automations, connectUrl, setupError } = await loadData();
  const connected = Boolean(config?.ig_access_token && config?.ig_user_id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">IG DM Automator</h1>
        <p className="text-sm text-neutral-500">
          Comentário e resposta de story viram DM automática, sem mensalidade.
        </p>
      </header>

      {/* Mensagens de status vindas dos redirects */}
      {sp.conectado && (
        <Banner tone="ok">Instagram conectado com sucesso! 🎉</Banner>
      )}
      {sp.salvo && <Banner tone="ok">Automação salva.</Banner>}
      {sp.removido && <Banner tone="ok">Automação removida.</Banner>}
      {sp.erro && <Banner tone="err">Erro: {String(sp.erro)}</Banner>}
      {setupError && (
        <Banner tone="err">
          Configuração pendente: {setupError} — confira as variáveis de ambiente.
        </Banner>
      )}

      {/* Conexão com o Instagram */}
      <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-lg font-semibold">Conta conectada</h2>
        {connected ? (
          <div className="flex items-center gap-4">
            {config?.profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.profile_picture_url}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            )}
            <div className="text-sm">
              <div className="font-semibold">@{config?.ig_username}</div>
              {config?.name && (
                <div className="text-neutral-500">{config.name}</div>
              )}
              <div className="text-neutral-500">
                Token válido até: {formatSP(config?.token_expires_at)}
              </div>
            </div>
            <div className="ml-auto">
              {connectUrl && (
                <a
                  href={connectUrl}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Reconectar
                </a>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-neutral-500">
              Ainda não há conta conectada. Conecte o Instagram para começar.
            </p>
            {connectUrl ? (
              <a
                href={connectUrl}
                className="inline-block rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
              >
                Conectar Instagram
              </a>
            ) : (
              <p className="text-sm text-red-600">
                Defina IG_APP_ID / APP_BASE_URL para habilitar a conexão.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Automações */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Automações</h2>
          <form action={createAutomationAction}>
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
            >
              + Nova automação
            </button>
          </form>
        </div>

        {automations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
            Nenhuma automação ainda. Crie a primeira.
          </p>
        ) : (
          <ul className="space-y-3">
            {automations.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{a.name}</span>
                      <StatusBadge active={a.active} />
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Gatilhos: {triggerLabels(a)} · Palavras:{" "}
                      {a.keywords.length ? a.keywords.join(", ") : "—"}
                    </div>
                  </div>
                  <form action={toggleActiveAction.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      {a.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                  <Link
                    href={`/automations/${a.id}`}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    Editar
                  </Link>
                  <form action={deleteAutomationAction.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-10 text-center text-xs text-neutral-400">
        <Link href="/privacidade" className="underline">
          Política de Privacidade
        </Link>{" "}
        ·{" "}
        <Link href="/exclusao-de-dados" className="underline">
          Exclusão de dados
        </Link>
      </footer>
    </main>
  );
}

function triggerLabels(a: Automation): string {
  const t: string[] = [];
  if (a.triggers?.comment) t.push("comentário");
  if (a.triggers?.story) t.push("story");
  if (a.triggers?.dm) t.push("DM");
  return t.length ? t.join(", ") : "—";
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        active
          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
          : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
      }`}
    >
      {active ? "ATIVA" : "INATIVA"}
    </span>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "ok" | "err";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mb-4 rounded-lg px-4 py-2 text-sm ${
        tone === "ok"
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      }`}
    >
      {children}
    </div>
  );
}
