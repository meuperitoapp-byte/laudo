import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { classesBotao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";

const STATUS_ROTULOS: Record<string, string> = {
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  arquivado: "Arquivado",
};

const STATUS_VARIANTE: Record<string, "sucesso" | "atencao" | "neutro"> = {
  em_andamento: "atencao",
  finalizado: "sucesso",
  arquivado: "neutro",
};

const TIPO_TRABALHO_ROTULOS: Record<string, string> = {
  pericia_judicial: "Perícia Judicial",
  assistencia_tecnica: "Assistência Técnica",
};

export default async function ProcessosPage() {
  const supabase = await createClient();

  const [{ data: processos }, { data: tiposLaudo }, { data: partesDb }] = await Promise.all([
    supabase.from("processos").select("*").order("created_at", { ascending: false }),
    supabase.from("tipos_laudo").select("*"),
    supabase.from("processo_partes").select("processo_id, polo, nome, ordem").eq("polo", "ativo").order("ordem"),
  ]);

  // Junção manual em vez de embed do PostgREST — nosso Database ainda não
  // declara as relações (ver src/types/database.ts), então o embed não seria
  // tipado corretamente.
  const nomePorTipoLaudo = new Map((tiposLaudo ?? []).map((t) => [t.id, t.nome]));
  const primeiroNomePoloAtivoPorProcesso = new Map<string, string>();
  for (const parte of partesDb ?? []) {
    if (!primeiroNomePoloAtivoPorProcesso.has(parte.processo_id)) {
      primeiroNomePoloAtivoPorProcesso.set(parte.processo_id, parte.nome);
    }
  }

  return (
    <main className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Processos</h1>
        <Link href="/processos/novo" className={classesBotao("primaria")}>
          Novo processo
        </Link>
      </div>

      {!processos || processos.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum processo cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-nevoa-200 dark:border-nevoa-800">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left bg-nevoa-50 dark:bg-nevoa-900 border-b border-nevoa-200 dark:border-nevoa-800">
                <th className="py-2.5 px-4 font-medium text-nevoa-600 dark:text-nevoa-400">Processo / Periciando(a)</th>
                <th className="py-2.5 px-4 font-medium text-nevoa-600 dark:text-nevoa-400">Tipo de trabalho</th>
                <th className="py-2.5 px-4 font-medium text-nevoa-600 dark:text-nevoa-400">Tipo de laudo</th>
                <th className="py-2.5 px-4 font-medium text-nevoa-600 dark:text-nevoa-400">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-nevoa-900/40">
              {processos.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-nevoa-100 dark:border-nevoa-800 last:border-0 hover:bg-nevoa-50 dark:hover:bg-nevoa-800/60"
                >
                  <td className="py-2.5 px-4">
                    <Link
                      href={`/processos/${p.id}`}
                      className="font-medium text-petroleo-600 hover:underline dark:text-petroleo-400"
                    >
                      {p.numero_processo ||
                        p.periciando_nome ||
                        primeiroNomePoloAtivoPorProcesso.get(p.id) ||
                        p.parte_autora ||
                        "(sem identificação)"}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4 text-nevoa-700 dark:text-nevoa-300">
                    {TIPO_TRABALHO_ROTULOS[p.tipo_trabalho] ?? p.tipo_trabalho}
                  </td>
                  <td className="py-2.5 px-4 text-nevoa-700 dark:text-nevoa-300">
                    {p.tipo_laudo_id ? (nomePorTipoLaudo.get(p.tipo_laudo_id) ?? "—") : "—"}
                  </td>
                  <td className="py-2.5 px-4">
                    <Selo variante={STATUS_VARIANTE[p.status] ?? "neutro"}>
                      {STATUS_ROTULOS[p.status] ?? p.status}
                    </Selo>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
