import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_ROTULOS: Record<string, string> = {
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  arquivado: "Arquivado",
};

const TIPO_TRABALHO_ROTULOS: Record<string, string> = {
  pericia_judicial: "Perícia Judicial",
  assistencia_tecnica: "Assistência Técnica",
};

export default async function ProcessosPage() {
  const supabase = await createClient();

  const [{ data: processos }, { data: tiposLaudo }] = await Promise.all([
    supabase.from("processos").select("*").order("created_at", { ascending: false }),
    supabase.from("tipos_laudo").select("*"),
  ]);

  // Junção manual em vez de embed do PostgREST — nosso Database ainda não
  // declara as relações (ver src/types/database.ts), então o embed não seria
  // tipado corretamente.
  const nomePorTipoLaudo = new Map((tiposLaudo ?? []).map((t) => [t.id, t.nome]));

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Processos</h1>
        <Link
          href="/processos/novo"
          className="rounded bg-foreground text-background px-4 py-2 text-sm font-medium"
        >
          Novo processo
        </Link>
      </div>

      {!processos || processos.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          Nenhum processo cadastrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 pr-4">Processo / Periciando(a)</th>
                <th className="py-2 pr-4">Tipo de trabalho</th>
                <th className="py-2 pr-4">Tipo de laudo</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {processos.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <td className="py-2 pr-4">
                    <Link href={`/processos/${p.id}`} className="underline">
                      {p.numero_processo || p.periciando_nome || p.parte_autora || "(sem identificação)"}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    {TIPO_TRABALHO_ROTULOS[p.tipo_trabalho] ?? p.tipo_trabalho}
                  </td>
                  <td className="py-2 pr-4">
                    {p.tipo_laudo_id ? nomePorTipoLaudo.get(p.tipo_laudo_id) ?? "—" : "—"}
                  </td>
                  <td className="py-2 pr-4">{STATUS_ROTULOS[p.status] ?? p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
