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
      <Link href={`/processos/${processoId}`} className="text-sm underline text-zinc-600 dark:text-zinc-400">
        ← Voltar para o processo
      </Link>
      <h1 className="text-xl font-semibold mt-2 mb-1">Quesitos</h1>
      <p className="text-sm text-zinc-500 mb-6">{titulo}</p>

      <QuesitosPanel processoId={processoId} quesitos={quesitos ?? []} />
    </main>
  );
}
