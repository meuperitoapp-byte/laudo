/**
 * Compila a Impossibilidade de Assumir o Encargo (nº12 da Biblioteca de
 * Expedientes Periciais) — um dos 2 destinos reais da trava do Aceite
 * (§4.1), usado quando ela ainda NÃO aceitou o encargo (`aceitou_nomeacao`
 * ainda não é 'sim'). O outro destino, pra quando ela JÁ tinha aceitado, é
 * `compilar-escusa-declinio.ts` — a tela decide qual mostrar (ver
 * aceite-panel.tsx).
 *
 * Documento pequeno: um parágrafo fixo com um único campo livre (o motivo),
 * que NÃO é persistido em `processos` — é digitado na hora de gerar e fica
 * congelado só no snapshot desta versão. Gerar este documento NÃO altera
 * `aceitou_nomeacao` nem nenhum outro campo do processo — se algo deveria
 * mudar, é uma decisão de protocolar, separada desta função.
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoFormal, type CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotImpossibilidadeAssumir } from "@/types/json-fields";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";

export type ResultadoImpossibilidadeAssumir =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotImpossibilidadeAssumir }
  | { status: "erro"; mensagem: string };

const TITULO = "IMPOSSIBILIDADE DE ASSUMIR O ENCARGO";

function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
}

const MESES_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
function formatarDataExtenso(dataIso: string): string {
  const m = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dataIso;
  const [, ano, mes, dia] = m;
  return `${parseInt(dia, 10)} de ${MESES_EXTENSO[parseInt(mes, 10) - 1]} de ${ano}`;
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

export async function compilarImpossibilidadeAssumir(
  processoId: string,
  motivo: string,
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoImpossibilidadeAssumir> {
  if (!motivo.trim()) return { status: "erro", mensagem: "Informe o motivo objetivo da impossibilidade." };

  const supabase = await createClient();
  const { data: processo } = await supabase.from("processos").select("*").eq("id", processoId).single();
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };

  const { data: partesDb } = await supabase.from("processo_partes").select("*").eq("processo_id", processoId);
  const cabecalhoBase = montarCabecalhoFormal(processo, partesDb ?? []);
  if ("erro" in cabecalhoBase) return { status: "erro", mensagem: cabecalhoBase.erro };

  const { data: config } = await supabase.from("configuracoes").select("*").maybeSingle();

  const nome = VALORES_PADRAO_PERITO.nome_perito;
  const crm = VALORES_PADRAO_PERITO.crm_uf;
  const cabecalho: CabecalhoFormal = {
    ...cabecalhoBase,
    tituloDocumento: TITULO,
    paragrafoIntroducao: `Dra. ${nome}, médica, CRM/${crm}, perita nomeada por este Juízo nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, apresentar a seguinte manifestação:`,
  };

  const dataExtenso = formatarDataExtenso(dataAssinaturaIso);
  const secoes: SecaoCompilada[] = [
    {
      secaoId: "impossibilidade-i",
      codigo: "encerramento",
      titulo: TITULO,
      ordem: 1,
      blocos: [
        paragrafo(
          `O(a) profissional agradece a confiança decorrente da nomeação, porém informa impossibilidade de assumir o presente encargo em razão de ${motivo.trim()}, circunstância que inviabiliza a execução adequada da prova nas condições necessárias.`,
        ),
        paragrafo(
          "A comunicação é realizada tão logo identificada a impossibilidade, a fim de evitar prejuízo ao regular andamento processual.",
        ),
        paragrafo("Requer, portanto, seja dispensado(a) da nomeação, com a designação de outro profissional."),
        {
          tipo: "assinatura",
          cidadeData: `${VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${dataExtenso}.`,
          nome: `Dra. ${nome}`,
          tituloCrm: `Médica Perita Judicial, CRM ${crm}.`,
        },
      ],
    },
  ];

  const modelo: ModeloLaudo = {
    processoId,
    tipoTrabalho: processo.tipo_trabalho,
    rodapeTexto: rodapeTexto(config ?? null, processo.tipo_trabalho),
    tipoLaudoCodigo: "",
    tipoLaudoNome: "",
    geradoEm: new Date().toISOString(),
    cabecalho,
    apresentacao: "",
    secoes,
    imagensPericia: [],
  };

  const snapshot: SnapshotImpossibilidadeAssumir = {
    tipo: "impossibilidade_assumir",
    gerado_em: modelo.geradoEm,
    motivo: motivo.trim(),
  };

  return { status: "ok", modelo, snapshot };
}
