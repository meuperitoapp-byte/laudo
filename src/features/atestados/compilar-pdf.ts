/**
 * Compila o Atestado/Declaração médico-pericial — mesmo padrão dos demais
 * compiladores "modelo intermediário único" (ver compilar-parecer-at.ts,
 * viabilidade/compilar-pdf.ts): busca no banco, monta um `ModeloLaudo` de
 * verdade (reaproveita renderizarPdf/renderizarDocx sem duplicar motor),
 * devolve status ok/erro.
 *
 * Baseado em MODELO_PADRAO_ATESTADO_MEDICO_PERICIAL_PERICONS.pdf. Regra do
 * modelo: "documento final curto (1-2 páginas), só com os elementos
 * necessários à finalidade selecionada" — cada seção só entra se tiver
 * conteúdo (mesma "Regra de exibição crítica" do CLAUDE.md).
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoAssistenciaTecnica } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotAtestado } from "@/types/json-fields";
import { TITULO_TIPO_DOCUMENTO, FINALIDADE_ROTULOS, CONCLUSAO_MODELO_ROTULOS, CC_ROTULOS } from "./catalogos";
import type { AtestadosRow } from "@/types/database";
import type { AtestadoFinalidade } from "@/types/enums";

export type ResultadoAtestado = { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotAtestado } | { status: "erro"; mensagem: string };

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
function formatarDataPura(data: string | null): string {
  const m = data?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

function montarSecaoIdentificacao(
  periciandoNome: string, periciandoCpf: string | null, periciandoDataNascimento: string | null, a: AtestadosRow,
): SecaoCompilada {
  const blocos: BlocoConteudo[] = [
    paragrafo(`Paciente/Periciado(a): ${periciandoNome}`),
  ];
  if (periciandoCpf) blocos.push(paragrafo(`CPF: ${periciandoCpf}`));
  if (periciandoDataNascimento) blocos.push(paragrafo(`Data de nascimento: ${formatarDataPura(periciandoDataNascimento)}`));
  if (a.data_avaliacao) blocos.push(paragrafo(`Data da avaliação: ${formatarDataPura(a.data_avaliacao)}`));
  blocos.push(paragrafo(`Médico responsável: Dra. ${VALORES_PADRAO_PERITO.nome_perito} — CRM ${VALORES_PADRAO_PERITO.crm_uf}`));
  return { secaoId: "at-i", codigo: "identificacao", titulo: "1 — IDENTIFICAÇÃO", ordem: 1, blocos };
}

function montarSecaoFinalidade(finalidades: AtestadoFinalidade[], outraDescricao: string | null, periciandoNome: string): SecaoCompilada | null {
  if (finalidades.length === 0) return null;
  const rotulos = finalidades.map((f) => (f === "outra" && outraDescricao ? outraDescricao : FINALIDADE_ROTULOS[f]));
  return {
    secaoId: "at-ii",
    codigo: "finalidade",
    titulo: "2 — FINALIDADE",
    ordem: 2,
    blocos: [
      paragrafo(`Finalidade: ${rotulos.join("; ")}.`),
      paragrafo(
        `O presente documento é emitido com a finalidade de informar, de forma objetiva, a condição médico-funcional de ${periciandoNome}, considerando a avaliação realizada e os elementos médico-documentais disponibilizados.`,
      ),
    ],
  };
}

function montarSecaoElementosAnalisados(nomesDocumentos: string[]): SecaoCompilada | null {
  if (nomesDocumentos.length === 0) return null;
  return {
    secaoId: "at-iii",
    codigo: "elementos_analisados",
    titulo: "3 — ELEMENTOS MÉDICOS ANALISADOS",
    ordem: 3,
    blocos: [paragrafo(`Foram considerados os seguintes elementos: ${nomesDocumentos.join("; ")}.`)],
  };
}

function montarSecaoCondicaoMedica(a: AtestadosRow): SecaoCompilada | null {
  const blocos: BlocoConteudo[] = [];
  if (a.diagnostico) blocos.push(paragrafo(`Diagnóstico: ${a.diagnostico}${a.cid ? ` (CID ${a.cid})` : ""}`));
  if (a.condicao_atual) blocos.push(paragrafo(`Condição atual: ${a.condicao_atual}`));
  if (a.repercussao_funcional) blocos.push(paragrafo(`Repercussão funcional: ${a.repercussao_funcional}`));
  if (blocos.length === 0) return null;
  return { secaoId: "at-iv", codigo: "condicao_medica", titulo: "4 — CONDIÇÃO MÉDICA", ordem: 4, blocos };
}

function montarSecaoConclusao(a: AtestadosRow): SecaoCompilada | null {
  if (!a.conclusao_texto) return null;
  const blocos: BlocoConteudo[] = [];
  if (a.conclusao_modelo) blocos.push(paragrafo(CONCLUSAO_MODELO_ROTULOS[a.conclusao_modelo]));
  blocos.push(paragrafo(a.conclusao_texto));
  return { secaoId: "at-v", codigo: "conclusao_medico_pericial", titulo: "5 — CONCLUSÃO MÉDICO-PERICIAL", ordem: 5, blocos };
}

function montarSecaoCapacidadeCivil(a: AtestadosRow, finalidades: AtestadoFinalidade[]): SecaoCompilada | null {
  if (!finalidades.includes("capacidade_civil")) return null;
  const blocos: BlocoConteudo[] = [];
  const campos: (keyof typeof CC_ROTULOS)[] = [
    "cc_consciencia", "cc_orientacao", "cc_memoria", "cc_compreensao",
    "cc_juizo_critico", "cc_capacidade_decisoria", "cc_comunicacao", "cc_autonomia_avd",
  ];
  const avaliacao = campos
    .map((c) => (a[c] ? `${CC_ROTULOS[c]}: ${a[c]}` : null))
    .filter((v): v is string => Boolean(v));
  if (avaliacao.length > 0) blocos.push(paragrafo(avaliacao.join(". ") + "."));
  if (a.cc_necessidade_terceiros) {
    const rotulo = { sim: "Sim", nao: "Não", parcial: "Parcial" }[a.cc_necessidade_terceiros];
    blocos.push(paragrafo(`Necessidade de terceiros: ${rotulo}.`));
  }
  if (a.capacidade_civil_texto) blocos.push(paragrafo(a.capacidade_civil_texto));
  if (blocos.length === 0) return null;
  return {
    secaoId: "at-vi",
    codigo: "capacidade_civil",
    titulo: "6 — CAPACIDADE CIVIL / AUTONOMIA PARA ATOS DA VIDA CIVIL",
    ordem: 6,
    blocos,
  };
}

function montarSecaoConclusaoFinal(a: AtestadosRow, periciandoNome: string): SecaoCompilada | null {
  if (!a.conclusao_final) return null;
  const blocos: BlocoConteudo[] = [paragrafo(a.conclusao_final)];
  if (a.complemento_reavaliacao_periodo) blocos.push(paragrafo(`Recomenda-se reavaliação em ${a.complemento_reavaliacao_periodo}.`));
  if (a.complemento_condicao_na_data) blocos.push(paragrafo("A presente conclusão refere-se à condição identificada na data da avaliação."));
  if (a.complemento_limitada_elementos) blocos.push(paragrafo("A conclusão encontra-se limitada aos elementos disponibilizados até a presente data."));
  return { secaoId: "at-vii", codigo: "conclusao_final", titulo: "7 — CONCLUSÃO FINAL", ordem: 7, blocos: [paragrafo(`Diante dos elementos clínicos e médico-documentais avaliados, atesto que ${periciandoNome}:`), ...blocos] };
}

function montarSecaoEncerramento(a: AtestadosRow): SecaoCompilada {
  const dataIso = a.data_emissao ?? hojeIso();
  return {
    secaoId: "at-viii",
    codigo: "encerramento",
    titulo: "8 — LOCAL, DATA E ASSINATURA",
    ordem: 8,
    blocos: [
      {
        tipo: "assinatura",
        cidadeData: `${a.local_emissao || VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${formatarDataExtenso(dataIso)}.`,
        nome: `Dra. ${VALORES_PADRAO_PERITO.nome_perito}`,
        tituloCrm: `Médica Perita, CRM ${VALORES_PADRAO_PERITO.crm_uf}.`,
      },
    ],
  };
}

export async function compilarAtestado(processoId: string, atestadoId: string): Promise<ResultadoAtestado> {
  const supabase = await createClient();

  const [{ data: processo, error: erroProcesso }, { data: atestado, error: erroAtestado }, { data: config, error: erroConfig }] =
    await Promise.all([
      supabase.from("processos").select("*").eq("id", processoId).single(),
      supabase.from("atestados").select("*").eq("id", atestadoId).single(),
      supabase.from("configuracoes").select("*").maybeSingle(),
    ]);
  if (erroProcesso) return { status: "erro", mensagem: erroProcesso.message };
  if (erroAtestado) return { status: "erro", mensagem: erroAtestado.message };
  if (erroConfig) return { status: "erro", mensagem: erroConfig.message };

  let nomesDocumentos: string[] = [];
  if (atestado.documentos_referenciados.length > 0) {
    const { data: docs, error: erroDocs } = await supabase
      .from("documentos")
      .select("id, nome_arquivo")
      .in("id", atestado.documentos_referenciados);
    if (erroDocs) return { status: "erro", mensagem: erroDocs.message };
    nomesDocumentos = (docs ?? []).map((d) => d.nome_arquivo);
  }

  const periciandoNome = processo.periciando_nome || "o(a) periciando(a)";
  const finalidades = atestado.finalidades as AtestadoFinalidade[];

  const cabecalho = {
    ...montarCabecalhoAssistenciaTecnica(processo),
    tituloDocumento: TITULO_TIPO_DOCUMENTO[atestado.tipo_documento].toUpperCase(),
  };

  const secoes: SecaoCompilada[] = [
    montarSecaoIdentificacao(periciandoNome, processo.periciando_cpf, processo.periciando_data_nascimento, atestado),
    montarSecaoFinalidade(finalidades, atestado.finalidade_outra_descricao, periciandoNome),
    montarSecaoElementosAnalisados(nomesDocumentos),
    montarSecaoCondicaoMedica(atestado),
    montarSecaoConclusao(atestado),
    montarSecaoCapacidadeCivil(atestado, finalidades),
    montarSecaoConclusaoFinal(atestado, periciandoNome),
    montarSecaoEncerramento(atestado),
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

  const snapshot: SnapshotAtestado = {
    tipo: atestado.tipo_documento,
    gerado_em: modelo.geradoEm,
    dados: { ...atestado },
  };

  return { status: "ok", modelo, snapshot };
}
