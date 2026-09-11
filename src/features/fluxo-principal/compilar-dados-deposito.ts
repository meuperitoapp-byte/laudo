/**
 * Compila a Informação de Dados para Depósito dos Honorários — documento
 * standalone (tipo = 'dados_deposito'). Mesmo padrão de
 * `compilar-aceite-pericial.ts`. A seção "meat" (I-IV do modelo) vem de
 * `montarSecaoDeposito` (secoes.ts) — a MESMA função reaproveitada pela
 * Manifestação Consolidada quando ela existir, incluindo a trava de
 * exposição do dado bancário (nunca em conta judicial, só com confirmação
 * explícita — ver secoes.ts).
 *
 * Baseado em `MODELO_INFORMACAO_DE_DADOS_PARA_DEPOSITO_DOS_HONORARIOS.pdf`.
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoFormal, type CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import { montarSecaoDeposito } from "./secoes";

export type ResultadoDadosDeposito =
  | { status: "ok"; modelo: ModeloLaudo }
  | { status: "erro"; mensagem: string };

const TITULO_DEPOSITO = "INFORMAÇÃO DE DADOS PARA DEPÓSITO DOS HONORÁRIOS";

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

function montarParagrafoIntroducao(): string {
  const nome = VALORES_PADRAO_PERITO.nome_perito;
  const crm = VALORES_PADRAO_PERITO.crm_uf;
  return `Dra. ${nome}, médica, CRM/${crm}, perita nomeada por este Juízo nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, para fins de viabilização do pagamento dos honorários periciais, informar os dados a seguir, na forma de ${TITULO_DEPOSITO}.`;
}

function montarSecaoRequerimento(dataAssinaturaIso: string): SecaoCompilada {
  const dataExtenso = formatarDataExtenso(dataAssinaturaIso);
  return {
    secaoId: "deposito-requerimento",
    codigo: "encerramento",
    titulo: "REQUERIMENTO",
    ordem: 2,
    blocos: [
      paragrafo(
        "Diante do exposto, requer a juntada dos dados informados e a adoção das providências necessárias ao depósito dos honorários periciais, conforme determinação judicial e rito aplicável.",
      ),
      {
        tipo: "assinatura",
        cidadeData: `${VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${dataExtenso}.`,
        nome: `Dra. ${VALORES_PADRAO_PERITO.nome_perito}`,
        tituloCrm: `Médica Perita Judicial, CRM ${VALORES_PADRAO_PERITO.crm_uf}.`,
      },
    ],
  };
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

export async function compilarDadosDeposito(
  processoId: string,
  confirmarExposicaoDadosBancarios: boolean,
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoDadosDeposito> {
  const supabase = await createClient();

  const { data: processo } = await supabase.from("processos").select("*").eq("id", processoId).single();
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };

  const { data: partesDb } = await supabase.from("processo_partes").select("*").eq("processo_id", processoId);
  const cabecalhoBase = montarCabecalhoFormal(processo, partesDb ?? []);
  if ("erro" in cabecalhoBase) return { status: "erro", mensagem: cabecalhoBase.erro };

  const { data: config } = await supabase.from("configuracoes").select("*").maybeSingle();

  const cabecalho: CabecalhoFormal = {
    ...cabecalhoBase,
    tituloDocumento: TITULO_DEPOSITO,
    paragrafoIntroducao: montarParagrafoIntroducao(),
  };

  const secoes: SecaoCompilada[] = [
    montarSecaoDeposito(processo, config ?? null, {
      secaoId: "deposito-i",
      ordem: 1,
      confirmarExposicaoDadosBancarios,
    }),
    montarSecaoRequerimento(dataAssinaturaIso),
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

  return { status: "ok", modelo };
}
