"use client";

import { useEffect, useState } from "react";
import type { Automation } from "@/lib/types";

type IgMedia = {
  id: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  permalink?: string;
};

const field =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900";
const labelCls = "mb-1 block text-sm font-medium";
const hint = "mt-1 text-xs text-neutral-500";

export default function AutomationForm({
  automation,
  saveAction,
  deleteAction,
  connected,
}: {
  automation: Automation;
  saveAction: (form: FormData) => void | Promise<void>;
  deleteAction: (form: FormData) => void | Promise<void>;
  connected: boolean;
}) {
  const a = automation;
  const [targetMediaId, setTargetMediaId] = useState<string>(
    a.target_media_id ?? ""
  );

  return (
    <form action={saveAction} className="space-y-6">
      {/* Nome + ativa */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <label className={labelCls}>Nome da automação</label>
        <input name="name" defaultValue={a.name} className={field} />
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={a.active}
            className="h-4 w-4"
          />
          Ativa (só automações ativas disparam)
        </label>
      </div>

      {/* Gatilhos */}
      <fieldset className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <legend className="px-1 text-sm font-semibold">Gatilhos</legend>
        <p className={hint}>Quando esta automação deve disparar?</p>
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="trigger_comment"
              defaultChecked={a.triggers?.comment}
              className="h-4 w-4"
            />
            Comentário em post/reels (envia resposta privada)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="trigger_story"
              defaultChecked={a.triggers?.story}
              className="h-4 w-4"
            />
            Resposta a story
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="trigger_dm"
              defaultChecked={a.triggers?.dm}
              className="h-4 w-4"
            />
            DM direta
          </label>
        </div>
      </fieldset>

      {/* Palavras-chave */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <label className={labelCls}>Palavras-chave</label>
        <textarea
          name="keywords"
          defaultValue={a.keywords.join(", ")}
          rows={2}
          className={field}
          placeholder="ex: EBOOK, quero, link"
        />
        <p className={hint}>Separe por vírgula ou quebra de linha.</p>

        <label className={`${labelCls} mt-4`}>Tipo de correspondência</label>
        <select
          name="match_type"
          defaultValue={a.match_type}
          className={field}
        >
          <option value="contains">Contém a palavra</option>
          <option value="exact">Exatamente igual</option>
          <option value="any">Qualquer texto (ignora palavras)</option>
        </select>
      </div>

      {/* Seletor de post (só relevante para comentário) */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <label className={labelCls}>Post específico (opcional)</label>
        <p className={hint}>
          Vazio = vale para qualquer post. Escolha um post para restringir os
          comentários que disparam.
        </p>
        <input type="hidden" name="target_media_id" value={targetMediaId} />
        <MediaPicker
          connected={connected}
          selectedId={targetMediaId}
          onSelect={setTargetMediaId}
        />
      </div>

      {/* Mensagem de boas-vindas + botão */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <label className={labelCls}>DM de boas-vindas</label>
        <textarea
          name="welcome_dm"
          defaultValue={a.welcome_dm}
          rows={3}
          className={field}
          placeholder="Oi! Que bom que você comentou 🙌 Toque no botão abaixo para receber o link."
        />
        <label className={`${labelCls} mt-4`}>
          Rótulo do botão de resposta rápida
        </label>
        <input
          name="quick_reply_label"
          defaultValue={a.quick_reply_label ?? ""}
          className={field}
          placeholder="ex: Quero o link!"
        />
        <p className={hint}>
          Quando a pessoa tocar neste botão, abre a janela de 24h e enviamos o
          link + lembrete.
        </p>
      </div>

      {/* Link + lembrete (follow-ups) */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <label className={labelCls}>Mensagem do link</label>
        <textarea
          name="link_text"
          defaultValue={a.link_text ?? ""}
          rows={2}
          className={field}
          placeholder="Aqui está o seu link 👇 (dica: siga o perfil para não perder nada!)"
        />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Rótulo do botão do link</label>
            <input
              name="link_button_label"
              defaultValue={a.link_button_label ?? ""}
              className={field}
              placeholder="Abrir"
            />
          </div>
          <div>
            <label className={labelCls}>URL do link</label>
            <input
              name="link_url"
              type="url"
              defaultValue={a.link_url ?? ""}
              className={field}
              placeholder="https://..."
            />
          </div>
        </div>

        <label className={`${labelCls} mt-4`}>Mensagem de lembrete</label>
        <textarea
          name="reminder_text"
          defaultValue={a.reminder_text ?? ""}
          rows={2}
          className={field}
          placeholder="Passando para lembrar do seu link 😉"
        />
        <label className={`${labelCls} mt-4`}>
          Atraso do lembrete (segundos)
        </label>
        <input
          name="reminder_delay_seconds"
          type="number"
          min={0}
          defaultValue={a.reminder_delay_seconds}
          className={field}
        />
        <p className={hint}>
          Ex.: 3600 = 1 hora, 86400 = 24 horas. O lembrete só sai dentro da
          janela de 24h após a resposta.
        </p>
      </div>

      {/* Respostas públicas */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <label className={labelCls}>Respostas públicas no comentário (opcional)</label>
        <textarea
          name="public_replies"
          defaultValue={a.public_replies.join("\n")}
          rows={3}
          className={field}
          placeholder={"Uma por linha. Sorteamos entre elas.\nEx: Te mandei no direct! 💌\nEx: Corre lá no seu direct 👀"}
        />
        <p className={hint}>Uma variação por linha. Enviamos uma aleatória.</p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-700"
        >
          Salvar automação
        </button>
        <button
          type="submit"
          formAction={deleteAction}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
        >
          Excluir
        </button>
        <a
          href="/"
          className="ml-auto rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Voltar
        </a>
      </div>
    </form>
  );
}

function MediaPicker({
  connected,
  selectedId,
  onSelect,
}: {
  connected: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<IgMedia[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || media.length > 0) return;
    setLoading(true);
    fetch("/api/media")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        setMedia(j.data ?? []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [open, media.length]);

  const selected = media.find((m) => m.id === selectedId);

  if (!connected) {
    return (
      <p className="mt-3 text-sm text-neutral-500">
        Conecte o Instagram para escolher um post.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {open ? "Fechar" : "Escolher post"}
        </button>
        {selectedId ? (
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            Selecionado: {selectedId}
          </span>
        ) : (
          <span className="text-sm text-neutral-500">Qualquer post</span>
        )}
        {selectedId && (
          <button
            type="button"
            onClick={() => onSelect("")}
            className="text-sm text-red-600 underline"
          >
            limpar
          </button>
        )}
      </div>

      {selected?.thumbnail_url || selected?.media_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={selected.thumbnail_url || selected.media_url}
          alt=""
          className="mt-3 h-24 w-24 rounded-lg object-cover"
        />
      ) : null}

      {open && (
        <div className="mt-3">
          {loading && <p className="text-sm text-neutral-500">Carregando…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {media.map((m) => {
              const src = m.thumbnail_url || m.media_url;
              const isSel = m.id === selectedId;
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => {
                    onSelect(m.id);
                    setOpen(false);
                  }}
                  className={`overflow-hidden rounded-lg border-2 ${
                    isSel ? "border-pink-600" : "border-transparent"
                  }`}
                  title={m.caption ?? m.id}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-neutral-200 text-[10px] dark:bg-neutral-700">
                      {m.media_type}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {!loading && !error && media.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhum post encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
