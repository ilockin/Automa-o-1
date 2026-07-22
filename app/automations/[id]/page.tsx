import { notFound } from "next/navigation";
import { getAutomation } from "@/lib/automations";
import { getConfig } from "@/lib/config";
import { saveAutomationAction, deleteAutomationAction } from "@/app/actions";
import AutomationForm from "@/components/AutomationForm";

export const dynamic = "force-dynamic";

export default async function EditAutomation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const automation = await getAutomation(id);
  if (!automation) notFound();

  let connected = false;
  try {
    const config = await getConfig();
    connected = Boolean(config?.ig_access_token && config?.ig_user_id);
  } catch {
    connected = false;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6">
        <a href="/" className="text-sm text-neutral-500 hover:underline">
          ← Voltar
        </a>
        <h1 className="mt-2 text-xl font-bold">Editar automação</h1>
      </header>
      <AutomationForm
        automation={automation}
        connected={connected}
        saveAction={saveAutomationAction.bind(null, id)}
        deleteAction={deleteAutomationAction.bind(null, id)}
      />
    </main>
  );
}
