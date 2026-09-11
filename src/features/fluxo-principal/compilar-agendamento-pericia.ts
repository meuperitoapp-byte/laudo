/**
 * Compila a Comunicação de Agendamento da Perícia — documento standalone
 * (tipo = 'agendamento_pericia'). Mesmo padrão de `compilar-aceite-pericial.ts`.
 * A seção "meat" vem de `montarSecaoAgendamento` (secoes.ts) — reaproveitada
 * pela Manifestação Consolidada quando ela existir.
 *
 * A trava do plano §4.2 (`verificarAlertaAgendamento`) é um ALERTA
 * reversível, não um bloqueio — por isso NÃO é checada aqui dentro. Quem
 * decide se o alerta impede ou não a geração é a camada de ação
 * (`gerarAgendamentoPericia`, actions.ts): mostra o aviso e só chama este
 * compilador depois de uma confirmação explícita, quando o aviso existir.
 * Este arquivo sempre monta o documento quando os dados básicos existem.
 *
 * Baseado em `MODELO_COMUNICACAO_DE_AGENDAMENTO_DA_PERICIA.pdf`.
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoFormal, type CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import { montarSecaoAgendamento } from "./secoes";

export type ResultadoAgendamentoPericia =
  | { status: "ok"; modelo: ModeloLaudo }
  | { status: "erro"; mensagem: string };

const TITULO_AGENDAMENTO = "COMUNICAÇÃO DE AGENDAMENTO DA PERÍCIA";

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
  return `Dra. ${nome}, médica, CRM/${crm}, perita nomeada por este Juízo nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, em atenção ao regular prosseguimento da prova pericial, informar a ${TITULO_AGENDAMENTO}.`;
}

function montarSecaoRequerimento(dataAssinaturaIso: string): SecaoCompilada {
  const dataExtenso = formatarDataExtenso(dataAssinaturaIso);
  return {
    secaoId: "agendamento-requerimento",
    codigo: "encerramento",
    titulo: "REQUERIMENTOS",
    ordem: 2,
    blocos: [
      paragrafo(
        "Diante do exposto, requer a ciência do Juízo quanto ao agendamento e a intimação das partes acerca da data, horário, local e orientações pertinentes à realização da perícia.",
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

export async function compilarAgendamentoPericia(
  processoId: string,
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoAgendamentoPericia> {
  const supabase = await createClient();

  const { data: processo } = await supabase.from("processos").select("*").eq("id", processoId).single();
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };

  if (!processo.agendamento_data) {
    return { status: "erro", mensagem: "Preencha ao menos a data do agendamento antes de gerar o documento." };
  }

  const { data: partesDb } = await supabase.from("processo_partes").select("*").eq("processo_id", processoId);
  const cabecalhoBase = montarCabecalhoFormal(processo, partesDb ?? []);
  if ("erro" in cabecalhoBase) return { status: "erro", mensagem: cabecalhoBase.erro };

  const { data: config } = await supabase.from("configuracoes").select("*").maybeSingle();

  const cabecalho: CabecalhoFormal = {
    ...cabecalhoBase,
    tituloDocumento: TITULO_AGENDAMENTO,
    paragrafoIntroducao: montarParagrafoIntroducao(),
  };

  const secoes: SecaoCompilada[] = [
    montarSecaoAgendamento(processo, { secaoId: "agendamento-i", ordem: 1 }),
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
