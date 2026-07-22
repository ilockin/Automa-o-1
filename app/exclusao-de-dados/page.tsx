export const metadata = {
  title: "Exclusão de dados — IG DM Automator",
};

const CONTACT = process.env.CONTACT_EMAIL || "seu-email@exemplo.com";

export default function ExclusaoDeDados() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 text-sm leading-relaxed">
      <h1 className="mb-2 text-2xl font-bold">Exclusão de dados</h1>
      <p className="mb-6 text-neutral-500">
        Como pedir a remoção dos seus dados deste aplicativo.
      </p>

      <p className="mb-4 text-neutral-700 dark:text-neutral-300">
        Este aplicativo pessoal armazena, no máximo, seu identificador e nome de
        usuário do Instagram e o histórico das interações que acionaram uma
        resposta automática. Para solicitar a exclusão completa desses dados:
      </p>

      <ol className="mb-6 list-decimal space-y-2 pl-5 text-neutral-700 dark:text-neutral-300">
        <li>
          Envie um e-mail para{" "}
          <a href={`mailto:${CONTACT}`} className="underline">
            {CONTACT}
          </a>{" "}
          com o assunto <strong>&quot;Exclusão de dados&quot;</strong>.
        </li>
        <li>
          Informe seu <strong>@ do Instagram</strong> usado na interação.
        </li>
        <li>
          Processaremos a exclusão em até <strong>30 dias</strong> e
          confirmaremos por e-mail.
        </li>
      </ol>

      <p className="text-neutral-700 dark:text-neutral-300">
        Após a exclusão, seus dados são removidos permanentemente do banco de
        dados do aplicativo.
      </p>

      <p className="mt-8">
        <a href="/" className="underline">
          ← Voltar
        </a>
      </p>
    </main>
  );
}
