/**
 * Compila o Relatório Técnico — mesmo padrão "modelo intermediário único" dos
 * demais compiladores (ver atestados/compilar-pdf.ts). Baseado em
 * MODELO_PADRAO_RELATORIO_TECNICO_PERICONS_COM_RESPOSTAS_PADRAO.pdf.
 *
 * Regra do modelo: "somente blocos e campos marcados para inclusão devem
 * aparecer no documento final" — cada seção só entra se tiver conteúdo
 * (mesma "Regra de exibição crítica" do CLAUDE.md).
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoAssistenciaTecnica } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotRelatorioTecnico } from "@/types/json-fields";
import { DOCUMENTACAO_SUFICIENTE_ROTULOS, CAMPO_COMPLEMENTAR_ROTULOS, type CampoComplementarChave } from "./catalogos";
import type { RelatoriosTecnicosRow } from "@/types/database";

export type ResultadoRelatorioTecnico =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotRelatorioTecnico }
  | { status: "erro"; mensagem: string };

export const TITULO_RELATORIO_TECNICO = "RELATÓRIO TÉCNICO";

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

function montarSecaoObjeto(r: RelatoriosTecnicosRow): SecaoCompilada | null {
  const blocos: BlocoConteudo[] = [];
  if (r.solicitante) blocos.push(paragrafo(`Solicitante: ${r.solicitante}`));
  if (r.objeto_relatorio) blocos.push(paragrafo(r.objeto_relatorio));
  if (r.questao_tecnica_principal) blocos.push(paragrafo(`Questão técnica principal: ${r.questao_tecnica_principal}`));
  if (blocos.length === 0) return null;
  return { secaoId: "rt-i", codigo: "objeto", titulo: "I — OBJETO DO RELATÓRIO", ordem: 1, blocos };
}

function montarSecaoDocumentos(r: RelatoriosTecnicosRow, nomesDocumentos: string[]): SecaoCompilada | null {
  const blocos: BlocoConteudo[] = [];
  if (nomesDocumentos.length > 0) blocos.push(paragrafo(`Foram considerados os seguintes documentos: ${nomesDocumentos.join("; ")}.`));
  if (r.documentacao_suficiente) blocos.push(paragrafo(`Documentação considerada suficiente: ${DOCUMENTACAO_SUFICIENTE_ROTULOS[r.documentacao_suficiente]}.`));
  if (r.documentacao_suficiente_detalhe) blocos.push(paragrafo(r.documentacao_suficiente_detalhe));
  if (blocos.length === 0) return null;
  return { secaoId: "rt-ii", codigo: "documentos_analisados", titulo: "II — DOCUMENTOS ANALISADOS", ordem: 2, blocos };
}

function montarSecaoSintese(r: RelatoriosTecnicosRow): SecaoCompilada | null {
  if (!r.sintese_tecnica_caso) return null;
  return { secaoId: "rt-iii", codigo: "sintese_tecnica", titulo: "III — SÍNTESE TÉCNICA DO CASO", ordem: 3, blocos: [paragrafo(r.sintese_tecnica_caso)] };
}

const CAMPOS_COMPLEMENTARES_CHAVES: CampoComplementarChave[] = [
  "campo_diagnostico_cid", "campo_conduta", "campo_nexo_causal", "campo_dano", "campo_incapacidade", "campo_tratamento", "campo_prognostico",
];

function montarSecaoAnaliseTecnica(r: RelatoriosTecnicosRow): SecaoCompilada | null {
  const blocos: BlocoConteudo[] = [];
  if (r.analise_tecnica) blocos.push(paragrafo(r.analise_tecnica));
  for (const campo of CAMPOS_COMPLEMENTARES_CHAVES) {
    if (!r.campos_complementares.includes(campo)) continue;
    const valor = r[campo];
    if (!valor) continue;
    blocos.push(paragrafo(`${CAMPO_COMPLEMENTAR_ROTULOS[campo]}: ${valor}`));
  }
  if (blocos.length === 0) return null;
  return { secaoId: "rt-iv", codigo: "analise_tecnica", titulo: "IV — ANÁLISE TÉCNICA", ordem: 4, blocos };
}

function montarSecaoConclusao(r: RelatoriosTecnicosRow): SecaoCompilada | null {
  if (!r.conclusao) return null;
  return { secaoId: "rt-v", codigo: "conclusao", titulo: "V — CONCLUSÃO", ordem: 5, blocos: [paragrafo(r.conclusao)] };
}

function montarSecaoDocumentosComplementares(r: RelatoriosTecnicosRow): SecaoCompilada | null {
  if (!r.documentos_complementares_texto) return null;
  return {
    secaoId: "rt-vi",
    codigo: "documentos_complementares",
    titulo: "DOCUMENTOS/PROVIDÊNCIAS COMPLEMENTARES",
    ordem: 6,
    blocos: [paragrafo(r.documentos_complementares_texto)],
  };
}

function montarSecaoEncerramento(r: RelatoriosTecnicosRow): SecaoCompilada {
  const dataIso = r.data_emissao ?? hojeIso();
  return {
    secaoId: "rt-vii",
    codigo: "encerramento",
    titulo: "ENCERRAMENTO",
    ordem: 7,
    blocos: [
      paragrafo("Este relatório foi elaborado com base nos documentos disponibilizados e para a finalidade técnica acima especificada."),
      {
        tipo: "assinatura",
        cidadeData: `${r.local_emissao || VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${formatarDataExtenso(dataIso)}.`,
        nome: `Dra. ${VALORES_PADRAO_PERITO.nome_perito}`,
        tituloCrm: `Médica Perita | Assistente Técnica, CRM ${VALORES_PADRAO_PERITO.crm_uf}.`,
      },
    ],
  };
}

export async function compilarRelatorioTecnico(processoId: string, relatorioId: string): Promise<ResultadoRelatorioTecnico> {
  const supabase = await createClient();

  const [{ data: processo, error: erroProcesso }, { data: relatorio, error: erroRelatorio }, { data: config, error: erroConfig }] =
    await Promise.all([
      supabase.from("processos").select("*").eq("id", processoId).single(),
      supabase.from("relatorios_tecnicos").select("*").eq("id", relatorioId).single(),
      supabase.from("configuracoes").select("*").maybeSingle(),
    ]);
  if (erroProcesso) return { status: "erro", mensagem: erroProcesso.message };
  if (erroRelatorio) return { status: "erro", mensagem: erroRelatorio.message };
  if (erroConfig) return { status: "erro", mensagem: erroConfig.message };

  let nomesDocumentos: string[] = [];
  if (relatorio.documentos_referenciados.length > 0) {
    const { data: docs, error: erroDocs } = await supabase
      .from("documentos")
      .select("id, nome_arquivo")
      .in("id", relatorio.documentos_referenciados);
    if (erroDocs) return { status: "erro", mensagem: erroDocs.message };
    nomesDocumentos = (docs ?? []).map((d) => d.nome_arquivo);
  }

  const cabecalho = {
    ...montarCabecalhoAssistenciaTecnica(processo),
    tituloDocumento: TITULO_RELATORIO_TECNICO,
  };

  const secoes: SecaoCompilada[] = [
    montarSecaoObjeto(relatorio),
    montarSecaoDocumentos(relatorio, nomesDocumentos),
    montarSecaoSintese(relatorio),
    montarSecaoAnaliseTecnica(relatorio),
    montarSecaoConclusao(relatorio),
    montarSecaoDocumentosComplementares(relatorio),
    montarSecaoEncerramento(relatorio),
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

  const snapshot: SnapshotRelatorioTecnico = {
    tipo: "relatorio_tecnico",
    gerado_em: modelo.geradoEm,
    dados: { ...relatorio },
  };

  return { status: "ok", modelo, snapshot };
}
