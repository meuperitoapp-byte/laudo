import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuesitosPanel } from "@/features/quesitos/quesitos-panel";

export default async function QuesitosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: processoId } = await params;
  const supabase = await createClient();

  const { data: processo } = await supabase
    .from("processos")
    .select("id, periciando_nome, parte_autora, numero_processo")
    .eq("id", processoId)
    .single();

  if (!processo) {
    notFound();
  }

  const { data: quesitos } = await supabase
    .from("quesitos")
    .select("*")
    .eq("processo_id", processoId)
    .order("ordem", { ascending: true });

  const titulo =
    processo.numero_processo || processo.periciando_nome || processo.parte_autora || "Processo sem identificação";

  return (
    <main className="p-8">
      <Link
        href={`/processos/${processoId}`}
        className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400"
      >
        ← Voltar para o processo
      </Link>
      <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2 mb-1">Quesitos</h1>
      <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mb-6">{titulo}</p>

      <QuesitosPanel processoId={processoId} quesitos={quesitos ?? []} />
    </main>
  );
}
