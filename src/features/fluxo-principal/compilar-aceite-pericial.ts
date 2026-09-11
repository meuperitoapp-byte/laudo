/**
 * Compila a Manifestação de Aceite do Encargo Pericial — documento standalone
 * (tipo = 'aceite_pericial'). Mesmo padrão de `pos-laudo/compilar-retificacao.ts`:
 * busca no banco, monta um `ModeloLaudo` real (reusando `renderizarPdf`/
 * `renderizarDocx` sem motor novo), devolve status ok/erro/bloqueado.
 *
 * Baseado em `MODELO_MANIFESTACAO_DE_ACEITE_DO_ENCARGO_PERICIAL.pdf`.
 * A seção "meat" (I-III do modelo) vem de `montarSecaoAceite` (secoes.ts) —
 * a MESMA função reaproveitada pela Manifestação Consolidada quando ela
 * existir. Este arquivo só acrescenta o que é específico do documento
 * standalone: cabeçalho com parágrafo de introdução próprio, requerimento
 * (seção IV do modelo) e encerramento/assinatura.
 *
 * Documento de processo (não de ciclo de pós-laudo) — sem `pos_laudo_ciclo_id`,
 * sem snapshot próprio ainda (`snapshot_respostas` grava null; o conteúdo vem
 * direto de `processos`, sem forma de respostas editável à parte que precise
 * de snapshot pra não retroagir).
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoFormal, type CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import { montarSecaoAceite } from "./secoes";
import { verificarTravaAceite } from "./regras";

export type ResultadoAceitePericial =
  | { status: "ok"; modelo: ModeloLaudo }
  | { status: "erro"; mensagem: string }
  | { status: "bloqueado"; motivo: string };

const TITULO_ACEITE = "MANIFESTAÇÃO DE ACEITE DO ENCARGO PERICIAL";

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

function montarParagrafoIntroducao(nomeacaoId: string | null): string {
  const nome = VALORES_PADRAO_PERITO.nome_perito;
  const crm = VALORES_PADRAO_PERITO.crm_uf;
  let frase = `Dra. ${nome}, médica, CRM/${crm}, perita nomeada por este Juízo nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência`;
  frase += nomeacaoId ? `, em atenção à nomeação de ID ${nomeacaoId}, apresentar sua ` : ", apresentar sua ";
  frase += TITULO_ACEITE + ".";
  return frase;
}

function montarSecaoRequerimento(dataAssinaturaIso: string): SecaoCompilada {
  const dataExtenso = formatarDataExtenso(dataAssinaturaIso);
  return {
    secaoId: "aceite-requerimento",
    codigo: "encerramento",
    titulo: "REQUERIMENTO",
    ordem: 2,
    blocos: [
      paragrafo(
        "Diante do exposto, requer seja recebida a presente manifestação de aceite, prosseguindo-se com as providências necessárias à realização da prova pericial.",
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

/** "YYYY-MM-DD" de hoje — só default pra preview fora do fluxo de geração. */
function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

export async function compilarAceitePericial(
  processoId: string,
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoAceitePericial> {
  const supabase = await createClient();

  const { data: processo } = await supabase.from("processos").select("*").eq("id", processoId).single();
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };

  const { data: partesDb } = await supabase.from("processo_partes").select("*").eq("processo_id", processoId);
  const cabecalhoBase = montarCabecalhoFormal(processo, partesDb ?? []);
  if ("erro" in cabecalhoBase) return { status: "erro", mensagem: cabecalhoBase.erro };

  const trava = verificarTravaAceite(processo);
  if (!trava.ok) return { status: "bloqueado", motivo: trava.motivo };

  const { data: config } = await supabase.from("configuracoes").select("*").maybeSingle();

  const cabecalho: CabecalhoFormal = {
    ...cabecalhoBase,
    tituloDocumento: TITULO_ACEITE,
    paragrafoIntroducao: montarParagrafoIntroducao(processo.nomeacao_id),
  };

  const secoes: SecaoCompilada[] = [
    montarSecaoAceite(processo, { secaoId: "aceite-i", ordem: 1 }),
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
