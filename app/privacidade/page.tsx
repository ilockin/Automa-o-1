export const metadata = {
  title: "Política de Privacidade — IG DM Automator",
};

const CONTACT = process.env.CONTACT_EMAIL || "seu-email@exemplo.com";

export default function Privacidade() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 text-sm leading-relaxed">
      <h1 className="mb-2 text-2xl font-bold">Política de Privacidade</h1>
      <p className="mb-6 text-neutral-500">
        Última atualização: {new Date().getFullYear()}
      </p>

      <Section title="Quem somos">
        Este é um aplicativo pessoal de automação de mensagens do Instagram,
        operado exclusivamente pelo titular da conta do Instagram conectada. Ele
        responde automaticamente a comentários e mensagens com um link
        configurado pelo próprio titular.
      </Section>

      <Section title="Quais dados tratamos">
        Ao interagir (comentar uma palavra-chave, responder um story ou enviar
        uma mensagem), podemos armazenar: seu identificador do Instagram, seu
        nome de usuário público, o conteúdo da interação que acionou a
        automação e a data/hora. Também guardamos o token de acesso da conta do
        titular, usado apenas para enviar as respostas automáticas.
      </Section>

      <Section title="Para que usamos">
        Usamos esses dados unicamente para enviar a resposta automática
        solicitada por você (por exemplo, o link pedido) e para respeitar os
        limites da plataforma (como a janela de 24 horas e limites de envio).
        Não vendemos, alugamos nem compartilhamos seus dados com terceiros.
      </Section>

      <Section title="Base legal e consentimento">
        As mensagens automáticas só são enviadas após uma ação sua (comentar,
        responder ou mandar mensagem). Não enviamos mensagens em massa para
        pessoas que não interagiram.
      </Section>

      <Section title="Retenção">
        Mantemos os dados apenas pelo tempo necessário para operar a automação.
        Você pode solicitar a exclusão a qualquer momento (veja abaixo).
      </Section>

      <Section title="Seus direitos e exclusão de dados">
        Você pode solicitar acesso ou exclusão dos seus dados escrevendo para{" "}
        <a href={`mailto:${CONTACT}`} className="underline">
          {CONTACT}
        </a>
        . Consulte também a página{" "}
        <a href="/exclusao-de-dados" className="underline">
          Exclusão de dados
        </a>
        .
      </Section>

      <Section title="Contato">
        Dúvidas sobre esta política:{" "}
        <a href={`mailto:${CONTACT}`} className="underline">
          {CONTACT}
        </a>
        .
      </Section>

      <p className="mt-8">
        <a href="/" className="underline">
          ← Voltar
        </a>
      </p>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <p className="text-neutral-700 dark:text-neutral-300">{children}</p>
    </section>
  );
}
