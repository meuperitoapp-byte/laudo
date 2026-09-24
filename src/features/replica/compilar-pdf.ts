/**
 * Compila a Orientação Técnico-Pericial para Elaboração da Réplica — mesmo
 * padrão "modelo intermediário único" dos demais compiladores (ver
 * atestados/compilar-pdf.ts). Baseado em
 * MODELO_ORIENTACAO_TECNICO_PERICIAL_PARA_REPLICA_PERICONS.pdf.
 *
 * Regra do modelo: "deve ser gerado prioritariamente a partir da janela
 * ANÁLISE DA CONTESTAÇÃO" — os "pontos que merecem atenção" (§4) vêm direto
 * de contestacao_argumentos.incluir_na_replica = true, sem redigitação.
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoAssistenciaTecnica } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotOrientacaoReplica } from "@/types/json-fields";
import type { ReplicasRow, ContestacaoArgumentosRow } from "@/types/database";

export type ResultadoReplica =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotOrientacaoReplica }
  | { status: "erro"; mensagem: string };

export const TITULO_REPLICA = "ORIENTAÇÃO TÉCNICO-PERICIAL PARA ELABORAÇÃO DA RÉPLICA";

function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
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

/** Quebra um texto multi-linha em blocos-parágrafo, um por linha não-vazia (listas digitadas livremente). */
function linhas(texto: string | null): BlocoConteudo[] {
  if (!texto) return [];
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => paragrafo(`• ${l}`));
}

function montarSecaoFinalidade(): SecaoCompilada {
  return {
    secaoId: "replica-ii",
    codigo: "finalidade",
    titulo: "II — FINALIDADE",
    ordem: 2,
    blocos: [
      paragrafo(
        "O presente documento tem por finalidade fornecer ao patrono subsídios técnico-periciais para elaboração da réplica, a partir da análise da contestação e dos documentos disponíveis no caso.",
      ),
      paragrafo(
        "São destacados os argumentos da defesa que possuem repercussão médica, científica, documental, causal, funcional ou pericial, bem como os respectivos elementos técnicos que merecem atenção na construção da manifestação processual.",
      ),
      paragrafo(
        "As orientações apresentadas possuem natureza técnico-pericial, permanecendo a definição da estratégia jurídica e processual sob responsabilidade do patrono.",
      ),
    ],
  };
}

function montarSecaoSintese(pontos: ContestacaoArgumentosRow[]): SecaoCompilada | null {
  if (pontos.length === 0) return null;
  return {
    secaoId: "replica-iii",
    codigo: "sintese_contestacao",
    titulo: "III — SÍNTESE DA CONTESTAÇÃO SOB A PERSPECTIVA TÉCNICO-PERICIAL",
    ordem: 3,
    blocos: [
      paragrafo("Sob perspectiva técnico-pericial, a contestação concentra sua argumentação nos seguintes pontos:"),
      ...pontos.map((p, i) => paragrafo(`${i + 1}. ${p.argumento}`)),
    ],
  };
}

function montarSecaoPontosAtencao(pontos: ContestacaoArgumentosRow[]): SecaoCompilada | null {
  if (pontos.length === 0) return null;
  const blocos: BlocoConteudo[] = [];
  pontos.forEach((p, i) => {
    blocos.push(paragrafo(`PONTO ${String(i + 1).padStart(2, "0")}`));
    blocos.push(paragrafo(`O que a defesa sustenta: ${p.argumento}`));
    if (p.analise_tecnica) blocos.push(paragrafo(`O que a análise técnica identificou: ${p.analise_tecnica}`));
    if (p.evidencia_documento) blocos.push(paragrafo(`Elementos/documentos relevantes: ${p.evidencia_documento}`));
    if (p.orientacao) blocos.push(paragrafo(`Orientação ao advogado para a réplica: ${p.orientacao}`));
  });
  return {
    secaoId: "replica-iv",
    codigo: "pontos_atencao",
    titulo: "IV — PONTOS QUE MERECEM ATENÇÃO NA RÉPLICA",
    ordem: 4,
    blocos,
  };
}

function montarSecaoDocumentosNaoConsiderados(replica: ReplicasRow): SecaoCompilada | null {
  const blocos = linhas(replica.documentos_nao_considerados);
  if (blocos.length === 0) return null;
  return {
    secaoId: "replica-vii",
    codigo: "documentos_nao_considerados",
    titulo: "VII — DOCUMENTOS NÃO CONSIDERADOS OU NÃO ADEQUADAMENTE VALORIZADOS PELA DEFESA",
    ordem: 7,
    blocos,
  };
}

function montarSecaoPontosPreservados(replica: ReplicasRow): SecaoCompilada | null {
  const blocos = linhas(replica.pontos_preservados_pericia);
  if (blocos.length === 0) return null;
  return {
    secaoId: "replica-x",
    codigo: "pontos_preservados_pericia",
    titulo: "X — PONTOS QUE DEVEM SER PRESERVADOS PARA A PROVA PERICIAL",
    ordem: 10,
    blocos,
  };
}

function montarSecaoConclusao(replica: ReplicasRow): SecaoCompilada | null {
  if (!replica.conclusao_tecnica) return null;
  return {
    secaoId: "replica-xiii",
    codigo: "conclusao_tecnica",
    titulo: "XIII — CONCLUSÃO TÉCNICO-PERICIAL",
    ordem: 13,
    blocos: [paragrafo(replica.conclusao_tecnica)],
  };
}

function montarSecaoEncerramento(replica: ReplicasRow): SecaoCompilada {
  const dataIso = replica.data_emissao ?? hojeIso();
  return {
    secaoId: "replica-xiv",
    codigo: "encerramento",
    titulo: "XIV — ASSINATURA",
    ordem: 14,
    blocos: [
      paragrafo(
        "As presentes orientações restringem-se aos aspectos técnico-periciais identificados, permanecendo a definição da estratégia jurídica e processual sob responsabilidade do patrono.",
      ),
      {
        tipo: "assinatura",
        cidadeData: `${replica.local_emissao || VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${formatarDataExtenso(dataIso)}.`,
        nome: `Dra. ${VALORES_PADRAO_PERITO.nome_perito}`,
        tituloCrm: `Médica Perita, CRM ${VALORES_PADRAO_PERITO.crm_uf}.`,
      },
    ],
  };
}

export async function compilarReplica(processoId: string, replicaId: string): Promise<ResultadoReplica> {
  const supabase = await createClient();

  const [{ data: processo, error: erroProcesso }, { data: replica, error: erroReplica }, { data: config, error: erroConfig }, { data: analise, error: erroAnalise }] =
    await Promise.all([
      supabase.from("processos").select("*").eq("id", processoId).single(),
      supabase.from("replicas").select("*").eq("id", replicaId).single(),
      supabase.from("configuracoes").select("*").maybeSingle(),
      supabase.from("analises_contestacao").select("id").eq("processo_id", processoId).maybeSingle(),
    ]);
  if (erroProcesso) return { status: "erro", mensagem: erroProcesso.message };
  if (erroReplica) return { status: "erro", mensagem: erroReplica.message };
  if (erroConfig) return { status: "erro", mensagem: erroConfig.message };
  if (erroAnalise) return { status: "erro", mensagem: erroAnalise.message };

  let pontos: ContestacaoArgumentosRow[] = [];
  if (analise) {
    const { data: pontosDb, error: erroPontos } = await supabase
      .from("contestacao_argumentos")
      .select("*")
      .eq("analise_id", analise.id)
      .eq("incluir_na_replica", true)
      .order("ordem", { ascending: true });
    if (erroPontos) return { status: "erro", mensagem: erroPontos.message };
    pontos = pontosDb ?? [];
  }

  const cabecalho = {
    ...montarCabecalhoAssistenciaTecnica(processo),
    tituloDocumento: TITULO_REPLICA,
  };

  const secoes: SecaoCompilada[] = [
    montarSecaoFinalidade(),
    montarSecaoSintese(pontos),
    montarSecaoPontosAtencao(pontos),
    montarSecaoDocumentosNaoConsiderados(replica),
    montarSecaoPontosPreservados(replica),
    montarSecaoConclusao(replica),
    montarSecaoEncerramento(replica),
  ].filter((s): s is SecaoCompilada => s !== null);

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

  const snapshot: SnapshotOrientacaoReplica = {
    tipo: "orientacao_replica",
    gerado_em: modelo.geradoEm,
    dados: { replica, pontos },
  };

  return { status: "ok", modelo, snapshot };
}
