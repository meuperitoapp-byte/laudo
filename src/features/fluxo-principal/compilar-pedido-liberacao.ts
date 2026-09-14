/**
 * Compila o Pedido de Liberação dos Honorários Periciais (nº23 da Biblioteca
 * de Expedientes Periciais) — documento standalone (tipo = 'pedido_liberacao').
 * Fecha o trilho financeiro até liberação (docs/plano-modulo-fluxo-principal.md §5.1/§6).
 *
 * Não tem módulo compartilhado em secoes.ts porque não é um dos 4 módulos da
 * Manifestação Consolidada — mesmo critério do Não Comparecimento (nº17) e
 * do Impossibilidade/Escusa (nº12/13).
 *
 * Exige um laudo principal (tipo='laudo') já protocolado — o modelo
 * pressupõe isso ("Tendo sido apresentado o laudo médico-pericial..."), sem
 * laudo protocolado não há o que liberar.
 *
 * Dados bancários (configuracoes) só entram quando `liberacao_forma ===
 * 'transferencia'` E `confirmarExposicaoDadosBancarios === true` — mesma
 * trava de exposição do módulo de Depósito, campo independente (ver
 * migration 20260915120000).
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoFormal, type CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotPedidoLiberacao } from "@/types/json-fields";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";

export type ResultadoPedidoLiberacao =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotPedidoLiberacao }
  | { status: "erro"; mensagem: string };

const TITULO = "PEDIDO DE LIBERAÇÃO DOS HONORÁRIOS PERICIAIS";

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
function formatarDataPura(data: string | null): string {
  const m = data?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}
function formatarValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

export async function compilarPedidoLiberacao(
  processoId: string,
  confirmarExposicaoDadosBancarios: boolean,
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoPedidoLiberacao> {
  const supabase = await createClient();

  const { data: processo } = await supabase.from("processos").select("*").eq("id", processoId).single();
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };

  const { data: laudoPrincipal } = await supabase
    .from("laudos_gerados")
    .select("protocolo_id, protocolado_em")
    .eq("processo_id", processoId)
    .eq("tipo", "laudo")
    .eq("protocolado", true)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!laudoPrincipal) {
    return {
      status: "erro",
      mensagem: "Este processo ainda não tem o laudo principal protocolado — não há o que pedir liberação.",
    };
  }

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

  const podeExporDadosBancarios =
    processo.liberacao_forma === "transferencia" && confirmarExposicaoDadosBancarios && config !== null;

  const blocos: BlocoConteudo[] = [
    paragrafo(
      `Tendo sido apresentado o laudo médico-pericial em ${formatarDataPura(laudoPrincipal.protocolado_em)}${laudoPrincipal.protocolo_id ? ` (protocolo nº ${laudoPrincipal.protocolo_id})` : ""} e cumprido o encargo técnico até o presente estágio, requer a liberação dos honorários periciais depositados nos autos${processo.deposito_valor != null ? `, no valor de R$ ${formatarValor(processo.deposito_valor)}` : ""}, mediante ${processo.liberacao_forma === "transferencia" ? "transferência" : processo.liberacao_forma === "alvara" ? "alvará" : "a forma que Vossa Excelência determinar"}, conforme dados já cadastrados ou a serem informados na forma determinada pelo Juízo.`,
    ),
  ];

  if (podeExporDadosBancarios) {
    const linhas: [string, string][] = [
      ["Titular", config.dados_bancarios_titular ?? "—"],
      ["CPF/CNPJ", config.dados_bancarios_cpf_cnpj ?? "—"],
      ["Banco", config.dados_bancarios_banco ?? "—"],
      ["Código do banco", config.dados_bancarios_codigo_banco ?? "—"],
      ["Agência", config.dados_bancarios_agencia ?? "—"],
      ["Conta", config.dados_bancarios_conta ?? "—"],
      ["Tipo de conta", config.dados_bancarios_tipo_conta ?? "—"],
      ["Chave PIX", config.dados_bancarios_chave_pix ?? "—"],
    ];
    blocos.push({ tipo: "tabela", colunas: ["Campo", "Informação"], linhas: linhas.map(([campo, valor]) => [campo, valor]) });
  }

  blocos.push(paragrafo("Permanece disponível para eventuais esclarecimentos posteriores."));

  const dataExtenso = formatarDataExtenso(dataAssinaturaIso);
  blocos.push({
    tipo: "assinatura",
    cidadeData: `${VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${dataExtenso}.`,
    nome: `Dra. ${nome}`,
    tituloCrm: `Médica Perita Judicial, CRM ${crm}.`,
  });

  const secoes: SecaoCompilada[] = [
    { secaoId: "pedido-liberacao-i", codigo: "encerramento", titulo: TITULO, ordem: 1, blocos },
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

  const snapshot: SnapshotPedidoLiberacao = {
    tipo: "pedido_liberacao",
    gerado_em: modelo.geradoEm,
    valor: processo.deposito_valor,
    forma: processo.liberacao_forma,
    laudoProtocoloId: laudoPrincipal.protocolo_id,
  };

  return { status: "ok", modelo, snapshot };
}
