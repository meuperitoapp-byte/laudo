import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Selo } from "@/components/ui/badge";
import {
  AREA_ROTULOS,
  TIPO_DECISAO_ROTULOS,
  RESULTADO_PARTE_ASSISTIDA_ROTULOS,
  RESULTADO_PERICIA_ROTULOS,
  RESULTADO_SELO_VARIANTE,
} from "@/features/desfecho-judicial/catalogos";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";
import type { DesfechoArea, DesfechoTipoDecisao, DesfechoResultadoParteAssistida, DesfechoResultadoPericia } from "@/types/enums";

function param(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}
function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

const campoClass =
  "rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 px-2 py-1.5 text-sm " +
  "text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";

export default async function BibliotecaDecisoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const fArea = param(sp.area) as DesfechoArea | "";
  const fSubarea = param(sp.subarea).toLowerCase();
  const fTribunal = param(sp.tribunal).toLowerCase();
  const fUf = param(sp.uf).toUpperCase();
  const fTipo = param(sp.tipo_decisao) as DesfechoTipoDecisao | "";
  const fResultado = param(sp.resultado) as DesfechoResultadoParteAssistida | "";
  const fAno = param(sp.ano);
  const fProvaPericial = param(sp.prova_pericial);
  const fResultadoPericia = param(sp.resultado_pericia) as DesfechoResultadoPericia | "";
  const fServico = param(sp.servico).toLowerCase();

  const supabase = await createClient();
  const [{ data: desfechosDb, error }, { data: processosDb }] = await Promise.all([
    supabase.from("desfechos_judiciais").select("*").order("data_decisao", { ascending: false }),
    supabase.from("processos").select("id, numero_processo, periciando_nome, parte_autora"),
  ]);
  if (error) console.error("Biblioteca de Decisões: falha ao listar:", error.message);

  const processoPorId = new Map((processosDb ?? []).map((p) => [p.id, p]));

  const filtrados = (desfechosDb ?? []).filter((d) => {
    if (fArea && d.area !== fArea) return false;
    if (fSubarea && !(d.subarea_demanda ?? "").toLowerCase().includes(fSubarea)) return false;
    if (fTribunal && !(d.tribunal ?? "").toLowerCase().includes(fTribunal)) return false;
    if (fUf && d.uf !== fUf) return false;
    if (fTipo && d.tipo_decisao !== fTipo) return false;
    if (fResultado && d.resultado_parte_assistida !== fResultado) return false;
    if (fAno && d.data_decisao.slice(0, 4) !== fAno) return false;
    if (fProvaPericial === "sim" && d.houve_prova_pericial !== true) return false;
    if (fProvaPericial === "nao" && d.houve_prova_pericial !== false) return false;
    if (fResultadoPericia && d.resultado_pericia !== fResultadoPericia) return false;
    if (fServico && !d.servicos_pericons_no_caso.some((s) => s.toLowerCase().includes(fServico))) return false;
    return true;
  });

  // §24.6 — indicadores internos simples (inteligência técnica, não alegação promocional).
  const totalComDecisao = new Set((desfechosDb ?? []).map((d) => d.processo_id)).size;
  const comProvaPericial = (desfechosDb ?? []).filter((d) => d.houve_prova_pericial === true).length;
  const porResultado = (desfechosDb ?? []).reduce<Record<string, number>>((acc, d) => {
    if (d.resultado_parte_assistida) acc[d.resultado_parte_assistida] = (acc[d.resultado_parte_assistida] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <Link href="/biblioteca-pericial" className="text-sm text-nevoa-500 hover:text-petroleo-600 dark:text-nevoa-400 dark:hover:text-petroleo-400">
          ← Biblioteca Pericial
        </Link>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mt-2">Biblioteca de Decisões PERICONS</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Acervo interno dos desfechos dos próprios casos — inteligência técnica e institucional, não estatística de divulgação.
        </p>
      </div>

      {error && <BannerErroConsulta mensagem="Não consegui carregar as decisões agora." />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-4">
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Casos com decisão</p>
          <p className="text-lg font-semibold text-nevoa-900 dark:text-nevoa-100">{totalComDecisao}</p>
        </div>
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-4">
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Decisões na biblioteca</p>
          <p className="text-lg font-semibold text-nevoa-900 dark:text-nevoa-100">{(desfechosDb ?? []).length}</p>
        </div>
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-4">
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Com prova pericial</p>
          <p className="text-lg font-semibold text-nevoa-900 dark:text-nevoa-100">{comProvaPericial}</p>
        </div>
        <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-4">
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Favoráveis à parte assistida</p>
          <p className="text-lg font-semibold text-nevoa-900 dark:text-nevoa-100">{porResultado.favoravel ?? 0}</p>
        </div>
      </div>

      <form className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <select name="area" defaultValue={fArea} className={campoClass}>
          <option value="">Área — todas</option>
          {Object.entries(AREA_ROTULOS).map(([v, r]) => (
            <option key={v} value={v}>{r}</option>
          ))}
        </select>
        <input name="subarea" defaultValue={param(sp.subarea)} placeholder="Subárea/demanda" className={campoClass} />
        <input name="tribunal" defaultValue={param(sp.tribunal)} placeholder="Tribunal" className={campoClass} />
        <input name="uf" defaultValue={param(sp.uf)} placeholder="UF" maxLength={2} className={campoClass} />
        <select name="tipo_decisao" defaultValue={fTipo} className={campoClass}>
          <option value="">Tipo — todos</option>
          {Object.entries(TIPO_DECISAO_ROTULOS).map(([v, r]) => (
            <option key={v} value={v}>{r}</option>
          ))}
        </select>
        <select name="resultado" defaultValue={fResultado} className={campoClass}>
          <option value="">Resultado — todos</option>
          {Object.entries(RESULTADO_PARTE_ASSISTIDA_ROTULOS).map(([v, r]) => (
            <option key={v} value={v}>{r}</option>
          ))}
        </select>
        <input name="ano" defaultValue={fAno} placeholder="Ano" className={campoClass} />
        <select name="prova_pericial" defaultValue={fProvaPericial} className={campoClass}>
          <option value="">Prova pericial — todas</option>
          <option value="sim">Com perícia</option>
          <option value="nao">Sem perícia</option>
        </select>
        <select name="resultado_pericia" defaultValue={fResultadoPericia} className={campoClass}>
          <option value="">Resultado da perícia — todos</option>
          {Object.entries(RESULTADO_PERICIA_ROTULOS).map(([v, r]) => (
            <option key={v} value={v}>{r}</option>
          ))}
        </select>
        <input name="servico" defaultValue={param(sp.servico)} placeholder="Serviço PERICONS" className={campoClass} />
        <button type="submit" className={`${campoClass} bg-petroleo-600 text-white border-petroleo-600 hover:bg-petroleo-700`}>Filtrar</button>
        <Link href="/biblioteca-pericial/decisoes" className={`${campoClass} text-center text-nevoa-500 dark:text-nevoa-400`}>Limpar</Link>
      </form>

      <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-nevoa-500 dark:text-nevoa-400 border-b border-nevoa-200 dark:border-nevoa-800">
              <th className="py-2.5 px-4 font-medium">Data</th>
              <th className="py-2.5 px-4 font-medium">Caso</th>
              <th className="py-2.5 px-4 font-medium">Área / demanda</th>
              <th className="py-2.5 px-4 font-medium">Tipo</th>
              <th className="py-2.5 px-4 font-medium">Resultado</th>
              <th className="py-2.5 px-4 font-medium">Tribunal/UF</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 px-4 text-center text-nevoa-500 dark:text-nevoa-400">Nenhuma decisão encontrada.</td>
              </tr>
            ) : (
              filtrados.map((d) => {
                const processo = processoPorId.get(d.processo_id);
                return (
                  <tr key={d.id} className="border-b border-nevoa-100 dark:border-nevoa-900 last:border-0 hover:bg-nevoa-25 dark:hover:bg-nevoa-950/40">
                    <td className="py-2.5 px-4 text-nevoa-700 dark:text-nevoa-300">{dataCurta(d.data_decisao)}</td>
                    <td className="py-2.5 px-4">
                      <Link href={`/processos/${d.processo_id}/desfecho-judicial`} className="text-petroleo-600 dark:text-petroleo-400 hover:underline">
                        {processo?.numero_processo || processo?.periciando_nome || processo?.parte_autora || "Processo"}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-nevoa-700 dark:text-nevoa-300">{AREA_ROTULOS[d.area]}{d.subarea_demanda ? ` — ${d.subarea_demanda}` : ""}</td>
                    <td className="py-2.5 px-4 text-nevoa-700 dark:text-nevoa-300">{d.tipo_decisao ? TIPO_DECISAO_ROTULOS[d.tipo_decisao] : "—"}</td>
                    <td className="py-2.5 px-4">
                      {d.resultado_parte_assistida ? <Selo variante={RESULTADO_SELO_VARIANTE[d.resultado_parte_assistida]}>{RESULTADO_PARTE_ASSISTIDA_ROTULOS[d.resultado_parte_assistida]}</Selo> : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-nevoa-500 dark:text-nevoa-400">{[d.tribunal, d.uf].filter(Boolean).join("/") || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
