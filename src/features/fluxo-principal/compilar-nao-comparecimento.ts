/**
 * Compila a Comunicação de Não Comparecimento ao Ato Pericial (nº17 da
 * Biblioteca de Expedientes Periciais) — documento standalone (tipo =
 * 'nao_comparecimento'). Mesmo padrão de `compilar-impossibilidade-assumir.ts`.
 *
 * Campos (data/horário do ato, horário de chegada do perito, tempo de
 * espera, pessoas presentes) são digitados na hora de gerar — NÃO viram
 * coluna em `processos`, só ficam no snapshot desta versão. Em especial,
 * gerar este documento NÃO altera `agendamento_data`/`agendamento_horario`
 * do processo: a perícia que não aconteceu continua registrada com a data
 * original (plano §5, "mantém a data original na linha do tempo").
 *
 * `data`/`horario` vêm pré-preenchidos na tela a partir do agendamento já
 * salvo, mas são digitados de novo aqui (podem divergir — ex.: o perito
 * esperou além do horário marcado) e não são lidos de volta de `processos`
 * dentro deste compilador.
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoFormal, type CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotNaoComparecimento } from "@/types/json-fields";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";

export type ResultadoNaoComparecimento =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotNaoComparecimento }
  | { status: "erro"; mensagem: string };

const TITULO = "COMUNICAÇÃO DE NÃO COMPARECIMENTO AO ATO PERICIAL";

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
function formatarDataPura(data: string): string {
  const m = data.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : data;
}
function formatarHorario(horario: string): string {
  const m = horario.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : horario;
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

export async function compilarNaoComparecimento(
  processoId: string,
  input: {
    data: string;
    horario: string;
    horarioChegadaPerito: string | null;
    tempoEspera: string | null;
    pessoasPresentes: string | null;
  },
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoNaoComparecimento> {
  if (!input.data || !input.horario) {
    return { status: "erro", mensagem: "Informe a data e o horário do ato pericial." };
  }

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
  const blocos: BlocoConteudo[] = [
    paragrafo(
      `Na data de ${formatarDataPura(input.data)}, às ${formatarHorario(input.horario)}, no local previamente designado, o(a) Perito(a) encontrava-se disponível para realização da perícia. Contudo, o(a) periciando(a) não compareceu ao ato.`,
    ),
  ];
  const detalhes: string[] = [];
  if (input.horarioChegadaPerito?.trim()) detalhes.push(`Horário de chegada do perito: ${input.horarioChegadaPerito.trim()}`);
  if (input.tempoEspera?.trim()) detalhes.push(`Tempo de espera: ${input.tempoEspera.trim()}`);
  if (input.pessoasPresentes?.trim()) detalhes.push(`Pessoas presentes: ${input.pessoasPresentes.trim()}`);
  if (detalhes.length > 0) blocos.push(paragrafo(detalhes.join(". ") + "."));
  blocos.push(
    paragrafo("Diante da impossibilidade de realização do exame, comunica o ocorrido ao Juízo para as providências que entender cabíveis."),
  );
  blocos.push({
    tipo: "assinatura",
    cidadeData: `${VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${dataExtenso}.`,
    nome: `Dra. ${nome}`,
    tituloCrm: `Médica Perita Judicial, CRM ${crm}.`,
  });

  const secoes: SecaoCompilada[] = [
    { secaoId: "nao-comparecimento-i", codigo: "encerramento", titulo: TITULO, ordem: 1, blocos },
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

  const snapshot: SnapshotNaoComparecimento = {
    tipo: "nao_comparecimento",
    gerado_em: modelo.geradoEm,
    data: input.data,
    horario: input.horario,
    horarioChegadaPerito: input.horarioChegadaPerito?.trim() || null,
    tempoEspera: input.tempoEspera?.trim() || null,
    pessoasPresentes: input.pessoasPresentes?.trim() || null,
  };

  return { status: "ok", modelo, snapshot };
}
