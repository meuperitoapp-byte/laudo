"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_DOCUMENTOS, TAMANHO_MAXIMO_BYTES } from "@/features/documentos/constants";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import { buscarAtivosGlobais } from "@/features/geracao-laudo/ativos-globais";
import { renderizarDocx } from "@/features/geracao-laudo/renderizar-docx";
import { renderizarPdfComPaginas } from "@/features/geracao-laudo/renderizar-pdf";
import type {
  DocumentosInsert,
  LaudosGeradosInsert,
  PosLaudoAtAnaliseInsert,
  PosLaudoCiclosInsert,
  PosLaudoComplementacaoInsert,
  PosLaudoConclusoesVigentesInsert,
  PosLaudoDocumentosInsert,
  PosLaudoPontosInsert,
  PosLaudoQuesitosInsert,
  PosLaudoRetificacaoItensInsert,
} from "@/types/database";
import type {
  LaudoGeradoTipo,
  PosLaudoAtModalidade,
  PosLaudoClassificacaoGlobal,
  PosLaudoClassificacaoTriagem,
  PosLaudoComplementacaoImpacto,
  PosLaudoComplementacaoMotivo,
  PosLaudoConclusaoOrigem,
  PosLaudoDocumentoPapel,
  PosLaudoDocumentoRelevancia,
  PosLaudoElementoCentralSituacao,
  PosLaudoFluxo,
  PosLaudoNatureza,
  PosLaudoNaturezaErro,
  PosLaudoOrigem,
  PosLaudoOrigemIdentificacao,
  PosLaudoPotencialConclusao,
  PosLaudoProvidenciaAt,
  PosLaudoQuesitoOrigemParte,
  PosLaudoQuesitoTipo,
  PosLaudoRepercussaoLaudo,
  PosLaudoRepercussaoPonto,
} from "@/types/enums";
import type { ComplementacaoElementosCentrais, SnapshotPosLaudo } from "@/types/json-fields";
import { conclusaoVigenteAtual } from "@/features/pos-laudo/consultas";
import { compilarEsclarecimentos } from "@/features/pos-laudo/compilar-esclarecimentos";
import { compilarRetificacao } from "@/features/pos-laudo/compilar-retificacao";
import { compilarComplementacao } from "@/features/pos-laudo/compilar-complementacao";
import { compilarParecerAt } from "@/features/pos-laudo/compilar-parecer-at";
import { compilarQuesitosAt, TITULO_QUESITOS_AT } from "@/features/pos-laudo/compilar-quesitos-at";
import { AT_ANALISE_EIXO_ORDEM } from "@/features/pos-laudo/rotulos";

type ActionResult = { error: string } | { success: true };

const ORIGEM_VALIDAS: readonly PosLaudoOrigem[] = ["autor", "reu", "ambos", "juizo", "mp", "outro"];
const NATUREZA_VALIDAS: readonly PosLaudoNatureza[] = [
  "concordancia",
  "impugnacao",
  "esclarecimentos",
  "quesitos_suplementares",
  "complementacao",
  "documento_novo",
  "nova_pericia",
  "determinacao_judicial",
  "outra",
];

/** Um ciclo está "vazio" (rascunho — Registro da Demanda ainda não preenchido). */
function registroVazio(c: {
  data_intimacao: string | null;
  prazo: string | null;
  origem: string | null;
  natureza: string[] | null;
  documento_intimacao_id: string | null;
}): boolean {
  return (
    c.data_intimacao === null &&
    c.prazo === null &&
    c.origem === null &&
    (c.natureza === null || c.natureza.length === 0) &&
    c.documento_intimacao_id === null
  );
}

/**
 * Abre um novo ciclo de pós-laudo — ou, se já houver um ciclo `status =
 * 'aberto'` com o Registro da Demanda ainda em branco, leva pra ele em vez de
 * criar outro. Dois cliques no botão não podem virar dois ciclos vazios.
 *
 * `fluxo` NUNCA é escolha do usuário: nasce derivado de
 * processos.tipo_trabalho (judicial / assistencia_tecnica), pra não pedir uma
 * informação que o sistema já tem e não gerar documento com cabeçalho errado.
 *
 * `laudo_base_id` = a MAIOR `versao` entre as linhas `tipo = 'laudo'` E
 * `protocolado = true` desse processo. O filtro de `tipo` é explícito de
 * propósito: quando esclarecimentos/complementações povoarem `laudos_gerados`,
 * "a versão mais recente" sem esse filtro passaria a apontar pro documento
 * errado.
 */
export async function abrirCicloPosLaudo(processoId: string): Promise<{ error: string }> {
  const supabase = await createClient();

  const { data: processo, error: erroProc } = await supabase
    .from("processos")
    .select("tipo_trabalho")
    .eq("id", processoId)
    .single();
  if (erroProc || !processo) {
    return { error: erroProc?.message ?? "Processo não encontrado." };
  }

  const fluxo: PosLaudoFluxo =
    processo.tipo_trabalho === "assistencia_tecnica" ? "assistencia_tecnica" : "judicial";

  // Âncora do ciclo (só judicial). No fluxo AT o laudo analisado é do perito
  // JUDICIAL — documento externo anexado DENTRO do ciclo (pos_laudo_documentos.
  // papel = 'laudo_analisado'), então não dá pra exigir antes de o ciclo
  // existir; e não há conclusão vigente própria (a perita não escreveu laudo).
  // Análise de laudo em AT pode ser avulsa (resposta (e) da Dra.).
  let laudoBaseId: string | null = null;
  if (fluxo === "judicial") {
    const { data: laudoBase, error: erroLaudo } = await supabase
      .from("laudos_gerados")
      .select("id")
      .eq("processo_id", processoId)
      .eq("tipo", "laudo")
      .eq("protocolado", true)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (erroLaudo) {
      return { error: erroLaudo.message };
    }
    if (!laudoBase) {
      return {
        error: "O laudo precisa estar marcado como protocolado antes de abrir um ciclo de pós-laudo.",
      };
    }
    laudoBaseId = laudoBase.id;

    // Gate da conclusão vigente: um ciclo mede a repercussão sobre uma conclusão
    // que precisa já existir como referência. Ela NÃO é semeada retroativamente —
    // a perita a confirma uma vez, na tela do laudo final.
    const vigente = await conclusaoVigenteAtual(supabase, processoId);
    if (!vigente) {
      return {
        error:
          "Antes de abrir um ciclo, confirme a conclusão vigente do laudo na tela do laudo final (aba Laudo → bloco “Conclusão vigente”).",
      };
    }
  }

  // Dedup: reaproveita um ciclo 'aberto' ainda em branco, se houver.
  const { data: abertos, error: erroAbertos } = await supabase
    .from("pos_laudo_ciclos")
    .select("id, data_intimacao, prazo, origem, natureza, documento_intimacao_id")
    .eq("processo_id", processoId)
    .eq("status", "aberto");
  if (erroAbertos) {
    return { error: erroAbertos.message };
  }
  const emBranco = (abertos ?? []).find(registroVazio);
  if (emBranco) {
    redirect(`/processos/${processoId}/pos-laudo/${emBranco.id}`);
  }

  // numero_ciclo = maior já usado no processo + 1
  const { data: ultimo, error: erroUltimo } = await supabase
    .from("pos_laudo_ciclos")
    .select("numero_ciclo")
    .eq("processo_id", processoId)
    .order("numero_ciclo", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) {
    return { error: erroUltimo.message };
  }

  const insert: PosLaudoCiclosInsert = {
    processo_id: processoId,
    numero_ciclo: (ultimo?.numero_ciclo ?? 0) + 1,
    fluxo,
    laudo_base_id: laudoBaseId,
  };
  const { data: novo, error: erroInsert } = await supabase
    .from("pos_laudo_ciclos")
    .insert(insert)
    .select("id")
    .single();
  if (erroInsert || !novo) {
    return { error: erroInsert?.message ?? "Erro ao abrir o ciclo." };
  }

  revalidatePath(`/processos/${processoId}/pos-laudo`);
  redirect(`/processos/${processoId}/pos-laudo/${novo.id}`);
}

/**
 * Salva o Registro da Demanda de um ciclo (data da intimação, prazo, origem,
 * natureza, documento da intimação). NÃO mexe no `status` do ciclo — o avanço
 * de "aberto" pra "triagem" é matéria da fatia seguinte.
 */
export async function salvarRegistroDemanda(input: {
  cicloId: string;
  processoId: string;
  dataIntimacao: string | null;
  prazo: string | null;
  origem: string | null;
  natureza: string[];
  documentoIntimacaoId: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const origem: PosLaudoOrigem | null =
    input.origem && (ORIGEM_VALIDAS as readonly string[]).includes(input.origem)
      ? (input.origem as PosLaudoOrigem)
      : null;
  const natureza = input.natureza.filter((n): n is PosLaudoNatureza =>
    (NATUREZA_VALIDAS as readonly string[]).includes(n),
  );

  const { error } = await supabase
    .from("pos_laudo_ciclos")
    .update({
      data_intimacao: input.dataIntimacao,
      prazo: input.prazo,
      origem,
      natureza,
      documento_intimacao_id: input.documentoIntimacaoId,
    })
    .eq("id", input.cicloId)
    .eq("processo_id", input.processoId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/processos/${input.processoId}/pos-laudo`);
  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

// ==========================================================================
// Fluxo Assistência Técnica (fatia 10)
// ==========================================================================

const CLASSIFICACAO_GLOBAL_VALIDAS: readonly string[] = [
  "favoravel",
  "parc_favoravel",
  "neutro",
  "parc_desfavoravel",
  "desfavoravel",
];
const PROVIDENCIA_AT_VALIDAS: readonly PosLaudoProvidenciaAt[] = [
  "nenhuma",
  "concordancia",
  "quesitos_esclarecimento",
  "quesitos_suplementares",
  "manifestacao_tecnica",
  "impugnacao_tecnica",
  "solicitacao_complementacao",
  "pedido_nova_pericia",
  "parecer_divergente",
  "outro",
];

/**
 * Campos de nível de ciclo específicos do fluxo AT (colunas da migration
 * 20260910120000): objeto da análise, tese da parte assistida, classificação
 * global do laudo (obrigatória no AT — cobrada como pendência de geração na
 * fatia 10c, não aqui) e providência recomendada. Não mexe no `status`.
 */
export async function salvarRegistroDemandaAt(input: {
  cicloId: string;
  processoId: string;
  objetoAnalise: string | null;
  teseAssistida: string | null;
  classificacaoGlobal: string | null;
  providenciaRecomendada: string[];
  posicaoPericonsSintese: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const classificacaoGlobal: PosLaudoClassificacaoGlobal | null =
    input.classificacaoGlobal && CLASSIFICACAO_GLOBAL_VALIDAS.includes(input.classificacaoGlobal)
      ? (input.classificacaoGlobal as PosLaudoClassificacaoGlobal)
      : null;
  const providencia = input.providenciaRecomendada.filter((p): p is PosLaudoProvidenciaAt =>
    (PROVIDENCIA_AT_VALIDAS as readonly string[]).includes(p),
  );

  const { error } = await supabase
    .from("pos_laudo_ciclos")
    .update({
      objeto_analise: input.objetoAnalise?.trim() || null,
      tese_assistida: input.teseAssistida?.trim() || null,
      classificacao_global: classificacaoGlobal,
      providencia_recomendada: providencia,
      posicao_pericons_sintese: input.posicaoPericonsSintese?.trim() || null,
    })
    .eq("id", input.cicloId)
    .eq("processo_id", input.processoId)
    .eq("fluxo", "assistencia_tecnica");
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo`);
  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

/** Chaves boolean|null da análise estruturada AT — cada uma tem o par `<chave>` + `<chave>_nota`. Fonte única: rotulos.ts. */
const AT_ANALISE_EIXOS = AT_ANALISE_EIXO_ORDEM;

export type AtAnalisePatch = {
  conclusaoDoPerito?: string | null;
  impactoProcessual?: string | null;
} & Partial<Record<(typeof AT_ANALISE_EIXOS)[number], boolean | null>> &
  Partial<Record<`${(typeof AT_ANALISE_EIXOS)[number]}_nota`, string | null>>;

/**
 * UPSERT 1:1 (`onConflict: ciclo_id`) da "Análise estruturada do laudo
 * judicial" (Gestão AT.pdf §12) — mesmo padrão de `salvarComplementacao`:
 * o painel manda o objeto inteiro num clique só de "Salvar".
 */
export async function salvarAtAnalise(
  cicloId: string,
  processoId: string,
  patch: AtAnalisePatch,
): Promise<ActionResult> {
  const supabase = await createClient();

  const p: Record<string, unknown> = { ciclo_id: cicloId };
  const txt = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null);

  if ("conclusaoDoPerito" in patch) p.conclusao_do_perito = txt(patch.conclusaoDoPerito);
  if ("impactoProcessual" in patch) p.impacto_processual = txt(patch.impactoProcessual);
  for (const eixo of AT_ANALISE_EIXOS) {
    if (eixo in patch) {
      const v = patch[eixo];
      p[eixo] = v === undefined ? null : v;
    }
    const chaveNota = `${eixo}_nota` as const;
    if (chaveNota in patch) p[chaveNota] = txt(patch[chaveNota]);
  }

  const { error } = await supabase
    .from("pos_laudo_at_analise")
    .upsert(p as PosLaudoAtAnaliseInsert, { onConflict: "ciclo_id" });
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

/**
 * Encerra a rodada do ciclo (fatia 8): `status` = 'encerrado' + carimba
 * `encerrado_em`. Não exige nenhum documento gerado — uma rodada pode
 * terminar com 0, 1, 2 ou as 3 saídas, conforme a perita precisou (decisão
 * da Dra., confirmada em áudio). Encerrar NÃO congela nada de forma
 * irreversível (ao contrário de protocolar): é só o estado organizacional da
 * rodada. `reabrirCiclo` desfaz.
 */
export async function encerrarCiclo(cicloId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pos_laudo_ciclos")
    .update({ status: "encerrado", encerrado_em: new Date().toISOString() })
    .eq("id", cicloId)
    .eq("processo_id", processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/pos-laudo`);
  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

/** Reabre um ciclo encerrado — volta `status` = 'aberto' e limpa `encerrado_em`. */
export async function reabrirCiclo(cicloId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pos_laudo_ciclos")
    .update({ status: "aberto", encerrado_em: null })
    .eq("id", cicloId)
    .eq("processo_id", processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/pos-laudo`);
  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

// ============================================================================
// Fatia 2 — triagem + matriz de pontos
// ============================================================================

const CLASSIFICACAO_VALIDAS: readonly PosLaudoClassificacaoTriagem[] = [
  "questionamento_pertinente",
  "esclarecimento_legitimo",
  "quesito_suplementar_pertinente",
  "documento_novo_relevante",
  "necessidade_complementacao",
  "divergencia_interpretativa",
  "mero_inconformismo",
  "reiteracao_quesito",
  "questao_juridica_fora_objeto",
];
const POTENCIAL_VALIDAS: readonly PosLaudoPotencialConclusao[] = [
  "nao",
  "potencialmente",
  "sim",
  "depende_complementacao",
];

/**
 * Reavalia pos_laudo_ciclos.rascunho_complementacao a partir das
 * classificações dos pontos do ciclo. É PURA SINALIZAÇÃO VISUAL: fica true
 * quando algum ponto foi classificado como "necessidade_complementacao" e
 * false caso contrário. Esta flag NUNCA é lida como condição de fluxo — não
 * força a criação de uma Complementação nem bloqueia o caminho de
 * Esclarecimentos. A decisão continua sendo da perita; o sistema só sugere.
 */
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function recomputarRascunhoComplementacao(
  supabase: SupabaseServer,
  cicloId: string,
): Promise<void> {
  const { data: pontos } = await supabase
    .from("pos_laudo_pontos")
    .select("classificacao_triagem")
    .eq("ciclo_id", cicloId);
  const sugere = (pontos ?? []).some(
    (p) => p.classificacao_triagem === "necessidade_complementacao",
  );
  await supabase
    .from("pos_laudo_ciclos")
    .update({ rascunho_complementacao: sugere })
    .eq("id", cicloId);
}

/** Campo de ciclo "a manifestação pode modificar a conclusão?" (triagem). */
export async function salvarTriagemCiclo(input: {
  cicloId: string;
  processoId: string;
  podeModificarConclusao: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const valor: PosLaudoPotencialConclusao | null =
    input.podeModificarConclusao &&
    (POTENCIAL_VALIDAS as readonly string[]).includes(input.podeModificarConclusao)
      ? (input.podeModificarConclusao as PosLaudoPotencialConclusao)
      : null;

  const { error } = await supabase
    .from("pos_laudo_ciclos")
    .update({ pode_modificar_conclusao: valor })
    .eq("id", input.cicloId)
    .eq("processo_id", input.processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

/** Cria um ponto em branco no fim da matriz do ciclo. */
export async function adicionarPonto(cicloId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: ultimo, error: erroUltimo } = await supabase
    .from("pos_laudo_pontos")
    .select("ordem")
    .eq("ciclo_id", cicloId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };

  const insert: PosLaudoPontosInsert = {
    ciclo_id: cicloId,
    ordem: (ultimo?.ordem ?? 0) + 1,
  };
  const { error } = await supabase.from("pos_laudo_pontos").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

const REPERCUSSAO_PONTO_VALIDAS: readonly PosLaudoRepercussaoPonto[] = [
  "ponto_ja_esclarecido",
  "fundamentacao_complementada",
  "retificacao_necessaria",
  "conclusao_parcialmente_modificada",
  "sem_repercussao",
];

/** pos_laudo_pontos.categoria_problema — só fluxo AT (Gestão AT.pdf §14). Coluna text livre, validada aqui. */
const CATEGORIA_PROBLEMA_VALIDAS: readonly string[] = [
  "omissao",
  "contradicao_interna",
  "contradicao_documental",
  "erro_tecnico",
  "erro_conceitual",
  "premissa_incorreta",
  "ausencia_fundamentacao",
  "extrapolacao_objeto",
  "divergencia_literatura",
  "outro",
];

/**
 * Salva um ponto: campos de triagem + os campos da matriz de enfrentamento
 * (resposta_tecnica, repercussao). Ponto sem resposta técnica é estado
 * válido — o bloqueio de completude fica na geração da saída (fatia
 * seguinte), não aqui. Reavalia rascunho_complementacao do ciclo.
 */
export async function salvarPonto(input: {
  pontoId: string;
  cicloId: string;
  processoId: string;
  origemPonto: string | null;
  tema: string | null;
  sinteseAlegacao: string | null;
  jaAbordadoNoLaudo: boolean | null;
  referenciaLaudo: string | null;
  classificacaoTriagem: string | null;
  fundamentacaoAdicional: string | null;
  respostaTecnica: string | null;
  repercussao: string | null;
  /** Só fluxo AT — categoria do problema no laudo judicial. Ignorado (null) no judicial. */
  categoriaProblema?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const classificacao: PosLaudoClassificacaoTriagem | null =
    input.classificacaoTriagem &&
    (CLASSIFICACAO_VALIDAS as readonly string[]).includes(input.classificacaoTriagem)
      ? (input.classificacaoTriagem as PosLaudoClassificacaoTriagem)
      : null;
  const repercussao: PosLaudoRepercussaoPonto | null =
    input.repercussao && (REPERCUSSAO_PONTO_VALIDAS as readonly string[]).includes(input.repercussao)
      ? (input.repercussao as PosLaudoRepercussaoPonto)
      : null;
  const categoriaProblema: string | null =
    input.categoriaProblema && CATEGORIA_PROBLEMA_VALIDAS.includes(input.categoriaProblema)
      ? input.categoriaProblema
      : null;

  const { error } = await supabase
    .from("pos_laudo_pontos")
    .update({
      origem_ponto: input.origemPonto,
      tema: input.tema,
      sintese_alegacao: input.sinteseAlegacao,
      ja_abordado_no_laudo: input.jaAbordadoNoLaudo,
      referencia_laudo: input.referenciaLaudo,
      classificacao_triagem: classificacao,
      fundamentacao_adicional: input.fundamentacaoAdicional,
      resposta_tecnica: input.respostaTecnica,
      repercussao,
      categoria_problema: categoriaProblema,
    })
    .eq("id", input.pontoId)
    .eq("ciclo_id", input.cicloId);
  if (error) return { error: error.message };

  await recomputarRascunhoComplementacao(supabase, input.cicloId);

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

/** Remove um ponto (e, por cascade, suas evidências) e reavalia rascunho_complementacao. */
export async function removerPonto(
  pontoId: string,
  cicloId: string,
  processoId: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("pos_laudo_pontos")
    .delete()
    .eq("id", pontoId)
    .eq("ciclo_id", cicloId);
  if (error) return { error: error.message };

  await recomputarRascunhoComplementacao(supabase, cicloId);

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

/** Vincula um documento já anexado ao processo como evidência de um ponto. */
export async function vincularEvidencia(input: {
  pontoId: string;
  cicloId: string;
  processoId: string;
  documentoId: string;
  observacao: string | null;
}): Promise<ActionResult> {
  if (!input.documentoId) return { error: "Escolha um documento." };
  const supabase = await createClient();

  const { error } = await supabase.from("pos_laudo_ponto_evidencias").insert({
    ponto_id: input.pontoId,
    documento_id: input.documentoId,
    observacao: input.observacao,
  });
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

/** Desvincula uma evidência de um ponto. */
export async function desvincularEvidencia(input: {
  evidenciaId: string;
  cicloId: string;
  processoId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pos_laudo_ponto_evidencias")
    .delete()
    .eq("id", input.evidenciaId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

// ============================================================================
// Fatia 3 — documentos supervenientes
// ============================================================================

const PAPEL_VALIDOS: readonly PosLaudoDocumentoPapel[] = [
  "superveniente",
  "laudo_analisado",
  "manifestacao_analisada",
];
const RELEVANCIA_VALIDAS: readonly PosLaudoDocumentoRelevancia[] = [
  "sem_relevancia",
  "complementar",
  "relevante",
  "potencialmente_modificador",
  "determinante",
];

function texto(fd: FormData, k: string): string | null {
  const v = (fd.get(k) as string | null)?.trim();
  return v ? v : null;
}
function boolTri(fd: FormData, k: string): boolean | null {
  const v = fd.get(k) as string | null;
  return v === "sim" ? true : v === "nao" ? false : null;
}
function sanitizarNomeArquivo(nome: string): string {
  const semAcento = nome.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return semAcento.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/**
 * Cadastra um documento superveniente do ciclo. Reaproveita 100% o pipeline
 * de `documentos` — MESMO bucket (`documentos-processos`), mesma convenção de
 * `storage_path`, mesmo padrão "sobe o arquivo, insere a linha, desfaz tudo
 * se algo falhar". O que é específico do ciclo (papel, apresentante,
 * relevância, impacto etc.) fica só em `pos_laudo_documentos`, apontando pro
 * `documento_id`. O `compilarLaudo` exclui esses `documento_id` do acervo do
 * laudo original (anti-join — ver compilar.ts).
 */
export async function adicionarDocumentoSuperveniente(
  cicloId: string,
  processoId: string,
  formData: FormData,
): Promise<ActionResult> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return { error: "Arquivo maior que 25MB — não é possível enviar." };
  }

  const papelBruto = formData.get("papel") as string | null;
  const papel: PosLaudoDocumentoPapel = (PAPEL_VALIDOS as readonly string[]).includes(papelBruto ?? "")
    ? (papelBruto as PosLaudoDocumentoPapel)
    : "superveniente";
  const relevanciaBruta = formData.get("relevancia") as string | null;
  const relevancia: PosLaudoDocumentoRelevancia | null = (RELEVANCIA_VALIDAS as readonly string[]).includes(
    relevanciaBruta ?? "",
  )
    ? (relevanciaBruta as PosLaudoDocumentoRelevancia)
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = `${processoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizarNomeArquivo(arquivo.name)}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, arquivo, { contentType: arquivo.type || undefined });
  if (erroUpload) {
    return { error: `Erro ao enviar o arquivo: ${erroUpload.message}` };
  }

  const { data: ultimoDoc } = await supabase
    .from("documentos")
    .select("ordem")
    .eq("processo_id", processoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const docInsert: DocumentosInsert = {
    processo_id: processoId,
    tipo: "documento_processual",
    nome_arquivo: arquivo.name,
    storage_path: path,
    mime_type: arquivo.type || null,
    tamanho_bytes: arquivo.size,
    ordem: (ultimoDoc?.ordem ?? 0) + 1,
    observacao: texto(formData, "observacao"),
    enviado_por: user?.id ?? null,
  };
  const { data: doc, error: erroDoc } = await supabase
    .from("documentos")
    .insert(docInsert)
    .select("id")
    .single();
  if (erroDoc || !doc) {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove([path]);
    return { error: erroDoc?.message ?? "Erro ao gravar o documento." };
  }

  const pldInsert: PosLaudoDocumentosInsert = {
    ciclo_id: cicloId,
    documento_id: doc.id,
    papel,
    apresentante: texto(formData, "apresentante"),
    data_juntada: texto(formData, "data_juntada"),
    paginas: texto(formData, "paginas"),
    existencia_previa: boolTri(formData, "existencia_previa"),
    disponivel_ao_perito_antes: boolTri(formData, "disponivel_ao_perito_antes"),
    relevancia,
    impacto: texto(formData, "impacto"),
    observacao_tecnica: texto(formData, "observacao_tecnica"),
  };
  const { error: erroPld } = await supabase.from("pos_laudo_documentos").insert(pldInsert);
  if (erroPld) {
    // Desfaz tudo — arquivo, linha de documentos — pra não deixar meio-cadastro.
    await supabase.from("documentos").delete().eq("id", doc.id);
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove([path]);
    return { error: erroPld.message };
  }

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  revalidatePath(`/processos/${processoId}/documentos`);
  return { success: true };
}

/** Edita os metadados de ciclo de um documento superveniente (não toca no arquivo). */
export async function salvarMetadadosSuperveniente(input: {
  pldId: string;
  cicloId: string;
  processoId: string;
  papel: string;
  apresentante: string | null;
  dataJuntada: string | null;
  paginas: string | null;
  existenciaPrevia: boolean | null;
  disponivelAoPeritoAntes: boolean | null;
  relevancia: string | null;
  impacto: string | null;
  observacaoTecnica: string | null;
  jaEnfrentado: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const papel: PosLaudoDocumentoPapel = (PAPEL_VALIDOS as readonly string[]).includes(input.papel)
    ? (input.papel as PosLaudoDocumentoPapel)
    : "superveniente";
  const relevancia: PosLaudoDocumentoRelevancia | null =
    input.relevancia && (RELEVANCIA_VALIDAS as readonly string[]).includes(input.relevancia)
      ? (input.relevancia as PosLaudoDocumentoRelevancia)
      : null;

  const { error } = await supabase
    .from("pos_laudo_documentos")
    .update({
      papel,
      apresentante: input.apresentante,
      data_juntada: input.dataJuntada,
      paginas: input.paginas,
      existencia_previa: input.existenciaPrevia,
      disponivel_ao_perito_antes: input.disponivelAoPeritoAntes,
      relevancia,
      impacto: input.impacto,
      observacao_tecnica: input.observacaoTecnica,
      ja_enfrentado: input.jaEnfrentado,
    })
    .eq("id", input.pldId)
    .eq("ciclo_id", input.cicloId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

/**
 * Remove um documento superveniente por completo: o vínculo de ciclo
 * (`pos_laudo_documentos`), a linha de `documentos` e o arquivo no Storage.
 * Foi adicionado através do fluxo de pós-laudo — removê-lo o remove inteiro.
 */
export async function removerDocumentoSuperveniente(input: {
  pldId: string;
  documentoId: string;
  cicloId: string;
  processoId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documentos")
    .select("storage_path")
    .eq("id", input.documentoId)
    .maybeSingle();

  // Ordem: solta o vínculo primeiro (a FK documento_id é NO ACTION), depois a
  // linha de documentos, depois o arquivo.
  const { error: erroPld } = await supabase
    .from("pos_laudo_documentos")
    .delete()
    .eq("id", input.pldId)
    .eq("ciclo_id", input.cicloId);
  if (erroPld) return { error: erroPld.message };

  const { error: erroDoc } = await supabase.from("documentos").delete().eq("id", input.documentoId);
  if (erroDoc) return { error: erroDoc.message };

  if (doc?.storage_path) {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove([doc.storage_path]);
  }

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  revalidatePath(`/processos/${input.processoId}/documentos`);
  return { success: true };
}

// ============================================================================
// Fatia 4 — matriz de enfrentamento (síntese de ciclo) + Conclusão Vigente V1
// ============================================================================

const REPERCUSSAO_LAUDO_VALIDAS: readonly PosLaudoRepercussaoLaudo[] = [
  "mantido_integralmente",
  "complementado_sem_alterar",
  "retificacao_sem_repercussao",
  "modificacao_parcial",
  "revisao_substancial",
  "substituicao_conclusao",
];

/**
 * Semeia (ou corrige) a Conclusão Vigente V1 de um processo, a partir da ação
 * explícita da perita na tela do laudo final. Sem backfill retroativo — o
 * processo que já tem laudo protocolado mas nenhuma linha aqui só ganha uma
 * quando a perita confirma o texto.
 *
 * Só opera enquanto a vigente for a V1 do próprio laudo (`origem_tipo =
 * 'laudo'` e nenhum ciclo a consumiu): aí o texto é editável e a atualização é
 * in-place. Depois que um ciclo de pós-laudo define uma nova conclusão
 * vigente, este caminho fica bloqueado — a conclusão passa a ser matéria de
 * ciclo, log append-only.
 */
export async function definirConclusaoVigenteInicial(
  processoId: string,
  texto: string,
): Promise<ActionResult> {
  const limpo = texto.trim();
  if (!limpo) return { error: "Cole ou digite o texto da conclusão vigente." };

  const supabase = await createClient();

  const { data: laudoBase, error: erroLaudo } = await supabase
    .from("laudos_gerados")
    .select("id")
    .eq("processo_id", processoId)
    .eq("tipo", "laudo")
    .eq("protocolado", true)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroLaudo) return { error: erroLaudo.message };
  if (!laudoBase) {
    return { error: "O laudo precisa estar marcado como protocolado antes de definir a conclusão vigente." };
  }

  const vigente = await conclusaoVigenteAtual(supabase, processoId);

  if (vigente) {
    if (vigente.origem_tipo !== "laudo" || vigente.ciclo_id !== null) {
      return {
        error:
          "A conclusão vigente foi definida por um ciclo de pós-laudo e não pode mais ser editada por aqui.",
      };
    }
    const { error } = await supabase
      .from("pos_laudo_conclusoes_vigentes")
      .update({ texto: limpo, origem_laudo_gerado_id: laudoBase.id })
      .eq("id", vigente.id);
    if (error) return { error: error.message };
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("pos_laudo_conclusoes_vigentes").insert({
      processo_id: processoId,
      origem_tipo: "laudo",
      origem_laudo_gerado_id: laudoBase.id,
      texto: limpo,
      escopo: "integral",
      created_by: user?.id ?? null,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/processos/${processoId}/laudo`);
  revalidatePath(`/processos/${processoId}/pos-laudo`);
  return { success: true };
}

/**
 * Síntese de nível de ciclo da matriz de enfrentamento: a repercussão sobre o
 * laudo original (`repercussao_laudo`) e, quando ela indica alteração da
 * conclusão, o RASCUNHO da Nova Conclusão Vigente (`conclusao_vigente_nova`).
 * Os dois são preenchidos pela perita — o sistema só sugere (aviso visual). O
 * rascunho não vira conclusão vigente aqui: só quando o documento de pós-laudo
 * que o carrega é protocolado (fatia seguinte).
 */
export async function salvarRepercussaoCiclo(input: {
  cicloId: string;
  processoId: string;
  repercussaoLaudo: string | null;
  conclusaoVigenteNova: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const repercussaoLaudo: PosLaudoRepercussaoLaudo | null =
    input.repercussaoLaudo &&
    (REPERCUSSAO_LAUDO_VALIDAS as readonly string[]).includes(input.repercussaoLaudo)
      ? (input.repercussaoLaudo as PosLaudoRepercussaoLaudo)
      : null;
  const rascunho = input.conclusaoVigenteNova?.trim() || null;

  const { error } = await supabase
    .from("pos_laudo_ciclos")
    .update({
      repercussao_laudo: repercussaoLaudo,
      conclusao_vigente_nova: rascunho,
    })
    .eq("id", input.cicloId)
    .eq("processo_id", input.processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

// ============================================================================
// Fatia 5 — geração dos Esclarecimentos
// ============================================================================

/**
 * Gera uma nova versão de Esclarecimentos do ciclo: compila (mesma função que
 * alimenta o bloco de pendências da tela), renderiza PDF + Word do MESMO
 * modelo, sobe os dois pro Storage e grava `laudos_gerados`
 * (`tipo='esclarecimentos'`, `versao` sempre a maior já usada pelo processo +
 * 1 — nunca sobrescreve uma versão anterior, mesma regra de `gerarLaudo`).
 *
 * Two-pass de paginação (decisão aprovada — plano §4, ponto técnico 15): a 1ª
 * passada renderiza com um placeholder ("—") no lugar do número de páginas do
 * Encerramento e mede a paginação real via `renderizarPdfComPaginas`; a 2ª
 * passada renderiza de novo com o número real embutido. Se a paginação da 2ª
 * passada divergir da 1ª (o próprio texto do número, em tese, pode empurrar
 * uma quebra de página), a geração é abortada — nunca publica um "composto
 * por X páginas" que pode estar errado.
 *
 * `dataAssinaturaIso` ("YYYY-MM-DD") é a data do ATO, escolhida pela perita na
 * tela de geração (pré-preenchida com hoje, mas editável) — NÃO a data em que
 * ela clicou em gerar. Um documento pode ser gerado num dia e protocolado
 * dias depois; a data que vai aos autos tem que corresponder ao que
 * efetivamente aconteceu, não ao momento da geração no sistema.
 */
export async function gerarEsclarecimentos(
  cicloId: string,
  processoId: string,
  dataAssinaturaIso: string,
): Promise<{ error: string } | { success: true; versao: number }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAssinaturaIso)) {
    return { error: "Informe a data da assinatura." };
  }

  const pass1 = await compilarEsclarecimentos(processoId, cicloId, "—", dataAssinaturaIso);
  if (pass1.status === "erro") return { error: pass1.mensagem };
  if (pass1.status === "pendencias") {
    return { error: `Geração bloqueada — pendências: ${pass1.itens.map((i) => i.label).join("; ")}.` };
  }

  const ativos = await buscarAtivosGlobais();
  const medidaUm = await renderizarPdfComPaginas(pass1.modelo, ativos, []);

  const pass2 = await compilarEsclarecimentos(processoId, cicloId, String(medidaUm.paginas), dataAssinaturaIso);
  if (pass2.status !== "ok") {
    // Não deveria acontecer — nada muda entre as duas chamadas dentro da mesma execução.
    return { error: "O estado do ciclo mudou entre as duas passadas de paginação — tente gerar novamente." };
  }
  const medidaDois = await renderizarPdfComPaginas(pass2.modelo, ativos, []);
  if (medidaDois.paginas !== medidaUm.paginas) {
    return {
      error: `Divergência de paginação ao inserir o número de páginas (1ª passada: ${medidaUm.paginas}; 2ª passada: ${medidaDois.paginas}). Geração abortada — tente novamente.`,
    };
  }

  const bufferDocx = await renderizarDocx(pass2.modelo, ativos, []);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ultimo, error: erroUltimo } = await supabase
    .from("laudos_gerados")
    .select("versao")
    .eq("processo_id", processoId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };
  const versao = (ultimo?.versao ?? 0) + 1;

  const caminhoPdf = `${processoId}/v${versao}.pdf`;
  const caminhoDocx = `${processoId}/v${versao}.docx`;

  const [uploadPdf, uploadDocx] = await Promise.all([
    supabase.storage
      .from(BUCKET_LAUDOS_GERADOS)
      .upload(caminhoPdf, medidaDois.buffer, { contentType: "application/pdf" }),
    supabase.storage.from(BUCKET_LAUDOS_GERADOS).upload(caminhoDocx, bufferDocx, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  ]);
  if (uploadPdf.error || uploadDocx.error) {
    await Promise.all([
      uploadPdf.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf]),
      uploadDocx.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoDocx]),
    ]);
    return { error: `Erro ao salvar os arquivos: ${uploadPdf.error?.message ?? uploadDocx.error?.message}` };
  }

  const insert: LaudosGeradosInsert = {
    processo_id: processoId,
    versao,
    tipo: "esclarecimentos",
    pos_laudo_ciclo_id: cicloId,
    titulo: "Esclarecimentos ao Laudo Médico-Pericial",
    substitui_conclusao: pass2.snapshot.conclusao_vigente_texto !== null,
    storage_path_pdf: caminhoPdf,
    storage_path_docx: caminhoDocx,
    snapshot_respostas: pass2.snapshot,
    paginas: medidaDois.paginas,
    gerado_por: user?.id ?? null,
  };
  const { error: erroInsert } = await supabase.from("laudos_gerados").insert(insert);
  if (erroInsert) {
    await supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf, caminhoDocx]);
    return { error: erroInsert.message };
  }

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true, versao };
}

/**
 * Marca uma versão de saída de pós-laudo (Esclarecimentos hoje; Retificação e
 * Complementação nas fatias seguintes reusam a mesma ação — qualquer
 * `laudos_gerados` com `pos_laudo_ciclo_id` preenchido) como PROTOCOLADA.
 * Mesmo contrato de `marcarLaudoProtocolado` (geracao-laudo/actions.ts): ação
 * irreversível, o trigger `trg_laudos_gerados_congela` passa a proteger o
 * conteúdo dessa versão a partir daqui. `pos_laudo_ciclo_id` no filtro já
 * garante que esta ação nunca alcança uma linha do laudo principal.
 *
 * Quando o snapshot JÁ CONGELADO por este UPDATE carrega uma Nova Conclusão
 * Vigente (`conclusao_vigente_texto` não vazio), grava a linha em
 * `pos_laudo_conclusoes_vigentes` a partir desse snapshot — NUNCA de
 * `pos_laudo_ciclos.conclusao_vigente_nova` (a coluna viva pode ter mudado
 * desde a geração desta versão). O que fica registrado como conclusão
 * vigente é sempre exatamente o que está no documento protocolado.
 */
export async function marcarPosLaudoProtocolado(
  laudoGeradoId: string,
  processoId: string,
  cicloId: string,
  protocoloId: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("laudos_gerados")
    .update({
      protocolado: true,
      protocolado_em: new Date().toISOString(),
      protocolo_id: protocoloId,
    })
    .eq("id", laudoGeradoId)
    .eq("processo_id", processoId)
    .eq("pos_laudo_ciclo_id", cicloId)
    .eq("protocolado", false)
    .select("tipo, snapshot_respostas")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) {
    return {
      error:
        "Não foi possível marcar como protocolado — a versão não existe, já está protocolada, ou não pertence a este ciclo.",
    };
  }

  const snapshot = data.snapshot_respostas as SnapshotPosLaudo | null;
  const conclusaoTexto = snapshot?.conclusao_vigente_texto?.trim() || null;
  if (conclusaoTexto) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const insert: PosLaudoConclusoesVigentesInsert = {
      processo_id: processoId,
      origem_tipo: data.tipo as PosLaudoConclusaoOrigem, // nunca 'retificacao' — trava estrutural, ver enums.ts
      origem_laudo_gerado_id: laudoGeradoId,
      ciclo_id: cicloId,
      texto: conclusaoTexto,
      created_by: user?.id ?? null,
    };
    const { error: erroConclusao } = await supabase.from("pos_laudo_conclusoes_vigentes").insert(insert);
    if (erroConclusao) {
      return {
        error: `Protocolado, mas houve erro ao registrar a nova conclusão vigente: ${erroConclusao.message}. Corrija manualmente antes de prosseguir.`,
      };
    }
  }

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  revalidatePath(`/processos/${processoId}/laudo`);
  return { success: true };
}

// ============================================================================
// Fatia 6 — Retificação de Erro Material
// ============================================================================

const NATUREZA_ERRO_VALIDAS: readonly PosLaudoNaturezaErro[] = [
  "digitacao",
  "grafia",
  "nome_identificacao",
  "data",
  "numero_valor",
  "pagina_item_referencia",
  "troca_omissao",
  "formatacao",
  "outro",
];

/**
 * Cria um item de retificação em branco — `onde_se_le`/`leia_se` chegam como
 * string vazia (a coluna é NOT NULL no banco, mas "" satisfaz isso; o campo
 * só precisa ter conteúdo de verdade na hora de gerar, não de salvar — mesmo
 * "estado válido" dos pontos da matriz de enfrentamento). `documento_alvo_id`
 * é pré-preenchido com o `laudo_base_id` do ciclo — simplificação registrada:
 * hoje não há seletor pra apontar um item pra outro documento (Esclarecimentos
 * anterior, por ex.); todos os itens de um ciclo retificam o mesmo documento.
 */
export async function adicionarItemRetificacao(cicloId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const [{ data: ciclo }, { data: ultimo, error: erroUltimo }] = await Promise.all([
    supabase.from("pos_laudo_ciclos").select("laudo_base_id").eq("id", cicloId).maybeSingle(),
    supabase
      .from("pos_laudo_retificacao_itens")
      .select("ordem")
      .eq("ciclo_id", cicloId)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (erroUltimo) return { error: erroUltimo.message };

  const insert: PosLaudoRetificacaoItensInsert = {
    ciclo_id: cicloId,
    documento_alvo_id: ciclo?.laudo_base_id ?? null,
    ordem: (ultimo?.ordem ?? 0) + 1,
    onde_se_le: "",
    leia_se: "",
  };
  const { error } = await supabase.from("pos_laudo_retificacao_itens").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

/** Salva os campos de um item de retificação (seção III do modelo). */
export async function salvarItemRetificacao(input: {
  itemId: string;
  cicloId: string;
  processoId: string;
  pagina: string | null;
  itemSecao: string | null;
  ondeSeLe: string;
  leiaSe: string;
  naturezaErro: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const naturezaErro: PosLaudoNaturezaErro | null =
    input.naturezaErro && (NATUREZA_ERRO_VALIDAS as readonly string[]).includes(input.naturezaErro)
      ? (input.naturezaErro as PosLaudoNaturezaErro)
      : null;

  const { error } = await supabase
    .from("pos_laudo_retificacao_itens")
    .update({
      pagina: input.pagina,
      item_secao: input.itemSecao,
      onde_se_le: input.ondeSeLe,
      leia_se: input.leiaSe,
      natureza_erro: naturezaErro,
    })
    .eq("id", input.itemId)
    .eq("ciclo_id", input.cicloId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

/** Remove um item de retificação. */
export async function removerItemRetificacao(
  itemId: string,
  cicloId: string,
  processoId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pos_laudo_retificacao_itens")
    .delete()
    .eq("id", itemId)
    .eq("ciclo_id", cicloId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

/**
 * Salva a Análise da Repercussão (seção IV do modelo) — a principal trava do
 * módulo. Pergunta EXPLÍCITA à perita (NÃO/SIM + justificativa obrigatória
 * nas duas respostas, pelo modelo): nunca é derivada de outro campo. Salvar
 * sempre funciona livre (mesmo com o valor "" ainda na justificativa) — a
 * exigência de completude é checada só na geração (compilarRetificacao).
 */
export async function salvarAnaliseRetificacao(input: {
  cicloId: string;
  processoId: string;
  afetaConclusao: string | null;
  justificativa: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const afetaConclusao = input.afetaConclusao === "sim" ? true : input.afetaConclusao === "nao" ? false : null;

  const { error } = await supabase
    .from("pos_laudo_ciclos")
    .update({
      retificacao_afeta_conclusao: afetaConclusao,
      retificacao_justificativa: input.justificativa?.trim() || null,
    })
    .eq("id", input.cicloId)
    .eq("processo_id", input.processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

const ORIGEM_IDENTIFICACAO_VALIDAS: readonly PosLaudoOrigemIdentificacao[] = [
  "perito",
  "juizo",
  "autor",
  "reu",
  "outro",
];

/**
 * Salva os campos da seção I do modelo de Retificação ("Identificação do
 * Documento Retificado"): ID do documento retificado, data da identificação
 * do erro e origem da identificação. Não são obrigatórios pra gerar (o
 * modelo não os marca "obrigatório", diferente da seção IV).
 */
export async function salvarIdentificacaoRetificacao(input: {
  cicloId: string;
  processoId: string;
  idDocumento: string | null;
  dataIdentificacao: string | null;
  origemIdentificacao: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const origem: PosLaudoOrigemIdentificacao | null =
    input.origemIdentificacao &&
    (ORIGEM_IDENTIFICACAO_VALIDAS as readonly string[]).includes(input.origemIdentificacao)
      ? (input.origemIdentificacao as PosLaudoOrigemIdentificacao)
      : null;

  const { error } = await supabase
    .from("pos_laudo_ciclos")
    .update({
      retificacao_id_documento: input.idDocumento?.trim() || null,
      retificacao_data_identificacao: input.dataIdentificacao || null,
      retificacao_origem_identificacao: origem,
    })
    .eq("id", input.cicloId)
    .eq("processo_id", input.processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

/**
 * Gera uma nova versão de Retificação do ciclo — mesmo padrão de
 * `gerarEsclarecimentos` (two-pass de paginação, `versao` = maior do processo
 * + 1, nunca sobrescreve). Só chega a compilar quando
 * `retificacao_afeta_conclusao === false`: se for `true` ou `null`,
 * `compilarRetificacao` devolve pendências antes de qualquer renderização.
 * `substitui_conclusao` é sempre `false` aqui — Retificação nunca cria Nova
 * Conclusão Vigente (trava estrutural, ver enums.ts).
 */
export async function gerarRetificacao(
  cicloId: string,
  processoId: string,
  dataAssinaturaIso: string,
): Promise<{ error: string } | { success: true; versao: number }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAssinaturaIso)) {
    return { error: "Informe a data da assinatura." };
  }

  const pass1 = await compilarRetificacao(processoId, cicloId, "—", dataAssinaturaIso);
  if (pass1.status === "erro") return { error: pass1.mensagem };
  if (pass1.status === "pendencias") {
    return { error: `Geração bloqueada — pendências: ${pass1.itens.map((i) => i.label).join("; ")}.` };
  }

  const ativos = await buscarAtivosGlobais();
  const medidaUm = await renderizarPdfComPaginas(pass1.modelo, ativos, []);

  const pass2 = await compilarRetificacao(processoId, cicloId, String(medidaUm.paginas), dataAssinaturaIso);
  if (pass2.status !== "ok") {
    return { error: "O estado do ciclo mudou entre as duas passadas de paginação — tente gerar novamente." };
  }
  const medidaDois = await renderizarPdfComPaginas(pass2.modelo, ativos, []);
  if (medidaDois.paginas !== medidaUm.paginas) {
    return {
      error: `Divergência de paginação ao inserir o número de páginas (1ª passada: ${medidaUm.paginas}; 2ª passada: ${medidaDois.paginas}). Geração abortada — tente novamente.`,
    };
  }

  const bufferDocx = await renderizarDocx(pass2.modelo, ativos, []);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ultimo, error: erroUltimo } = await supabase
    .from("laudos_gerados")
    .select("versao")
    .eq("processo_id", processoId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };
  const versao = (ultimo?.versao ?? 0) + 1;

  const caminhoPdf = `${processoId}/v${versao}.pdf`;
  const caminhoDocx = `${processoId}/v${versao}.docx`;

  const [uploadPdf, uploadDocx] = await Promise.all([
    supabase.storage
      .from(BUCKET_LAUDOS_GERADOS)
      .upload(caminhoPdf, medidaDois.buffer, { contentType: "application/pdf" }),
    supabase.storage.from(BUCKET_LAUDOS_GERADOS).upload(caminhoDocx, bufferDocx, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  ]);
  if (uploadPdf.error || uploadDocx.error) {
    await Promise.all([
      uploadPdf.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf]),
      uploadDocx.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoDocx]),
    ]);
    return { error: `Erro ao salvar os arquivos: ${uploadPdf.error?.message ?? uploadDocx.error?.message}` };
  }

  const insert: LaudosGeradosInsert = {
    processo_id: processoId,
    versao,
    tipo: "retificacao",
    pos_laudo_ciclo_id: cicloId,
    titulo: "Retificação de Erro Material",
    substitui_conclusao: false,
    storage_path_pdf: caminhoPdf,
    storage_path_docx: caminhoDocx,
    snapshot_respostas: pass2.snapshot,
    paginas: medidaDois.paginas,
    gerado_por: user?.id ?? null,
  };
  const { error: erroInsert } = await supabase.from("laudos_gerados").insert(insert);
  if (erroInsert) {
    await supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf, caminhoDocx]);
    return { error: erroInsert.message };
  }

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true, versao };
}

// ============================================================================
// Fatia 7 — Complementação do Laudo
// ============================================================================

const COMPLEMENTACAO_MOTIVO_VALIDOS: readonly PosLaudoComplementacaoMotivo[] = [
  "documento_novo",
  "nova_avaliacao",
  "exame_complementar",
  "avaliacao_especialista",
  "diligencia_juizo",
  "determinacao_judicial",
  "insuficiencia_tecnica",
  "esclarecimento_ampliado",
  "outro",
];
const COMPLEMENTACAO_IMPACTO_VALIDOS: readonly PosLaudoComplementacaoImpacto[] = [
  "sem_relevancia_modificadora",
  "complementares",
  "relevantes_fundamentacao",
  "potencialmente_modificadores",
  "determinantes_revisao_parcial",
  "determinantes_revisao_integral",
];
const ELEMENTO_SITUACAO_VALIDAS: readonly PosLaudoElementoCentralSituacao[] = [
  "mantido",
  "complementado",
  "modificado",
  "nao_aplicavel",
];

/** Sanitiza o jsonb vii_elementos vindo do cliente (seção VII). */
function sanitizarElementosCentrais(v: unknown): ComplementacaoElementosCentrais {
  const out: ComplementacaoElementosCentrais = {};
  if (!v || typeof v !== "object") return out;
  const src = v as Record<string, unknown>;
  for (const chave of ["diagnostico", "conduta", "nexo", "dano", "incapacidade", "prognostico"] as const) {
    const raw = src[chave];
    if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      const situacao =
        typeof r.situacao === "string" && (ELEMENTO_SITUACAO_VALIDAS as readonly string[]).includes(r.situacao)
          ? (r.situacao as PosLaudoElementoCentralSituacao)
          : null;
      const fundamentacao = typeof r.fundamentacao === "string" ? r.fundamentacao : "";
      if (situacao !== null || fundamentacao.trim()) out[chave] = { situacao, fundamentacao };
    }
  }
  if (typeof src.outros === "string" && src.outros.trim()) out.outros = src.outros;
  return out;
}

/**
 * Campos que o painel da Complementação pode enviar. Cada card manda só os
 * seus — a ação faz UPSERT em `pos_laudo_complementacao` (1:1 com o ciclo),
 * criando a linha na primeira gravação. Salvar sempre funciona livre; a
 * exigência de completude é checada só na geração (compilarComplementacao).
 */
export interface ComplementacaoPatch {
  idDocumentoOrigem?: string | null;
  motivos?: string[];
  motivoDescricao?: string | null;
  impactoElementos?: string | null;
  impactoFundamentacao?: string | null;
  avaliacaoRealizada?: boolean;
  avaliacaoData?: string | null;
  avaliacaoHorario?: string | null;
  avaliacaoLocal?: string | null;
  avaliacaoPresentes?: string | null;
  avaliacaoAssistentes?: string | null;
  avaliacaoDocumentosAto?: string | null;
  avaliacaoAchados?: string | null;
  avaliacaoComparacao?: string | null;
  examesRealizados?: boolean;
  exameDescricao?: string | null;
  exameData?: string | null;
  exameProfissional?: string | null;
  exameResultado?: string | null;
  exameRepercussao?: string | null;
  viMantidos?: string | null;
  viNecessitam?: string | null;
  viRevistos?: string | null;
  viFundamentacao?: string | null;
  viiElementos?: unknown;
}

export async function salvarComplementacao(
  cicloId: string,
  processoId: string,
  patch: ComplementacaoPatch,
): Promise<ActionResult> {
  const supabase = await createClient();

  const p: Record<string, unknown> = { ciclo_id: cicloId };
  const txt = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null);

  if ("idDocumentoOrigem" in patch) p.id_documento_origem = txt(patch.idDocumentoOrigem);
  if (patch.motivos !== undefined) {
    p.motivos = patch.motivos.filter((m): m is PosLaudoComplementacaoMotivo =>
      (COMPLEMENTACAO_MOTIVO_VALIDOS as readonly string[]).includes(m),
    );
  }
  if ("motivoDescricao" in patch) p.motivo_descricao = txt(patch.motivoDescricao);
  if ("impactoElementos" in patch) {
    p.impacto_elementos =
      patch.impactoElementos &&
      (COMPLEMENTACAO_IMPACTO_VALIDOS as readonly string[]).includes(patch.impactoElementos)
        ? patch.impactoElementos
        : null;
  }
  if ("impactoFundamentacao" in patch) p.impacto_fundamentacao = txt(patch.impactoFundamentacao);

  if (patch.avaliacaoRealizada !== undefined) p.avaliacao_realizada = patch.avaliacaoRealizada;
  if ("avaliacaoData" in patch) p.avaliacao_data = patch.avaliacaoData || null;
  if ("avaliacaoHorario" in patch) p.avaliacao_horario = txt(patch.avaliacaoHorario);
  if ("avaliacaoLocal" in patch) p.avaliacao_local = txt(patch.avaliacaoLocal);
  if ("avaliacaoPresentes" in patch) p.avaliacao_presentes = txt(patch.avaliacaoPresentes);
  if ("avaliacaoAssistentes" in patch) p.avaliacao_assistentes = txt(patch.avaliacaoAssistentes);
  if ("avaliacaoDocumentosAto" in patch) p.avaliacao_documentos_ato = txt(patch.avaliacaoDocumentosAto);
  if ("avaliacaoAchados" in patch) p.avaliacao_achados = txt(patch.avaliacaoAchados);
  if ("avaliacaoComparacao" in patch) p.avaliacao_comparacao = txt(patch.avaliacaoComparacao);

  if (patch.examesRealizados !== undefined) p.exames_realizados = patch.examesRealizados;
  if ("exameDescricao" in patch) p.exame_descricao = txt(patch.exameDescricao);
  if ("exameData" in patch) p.exame_data = patch.exameData || null;
  if ("exameProfissional" in patch) p.exame_profissional = txt(patch.exameProfissional);
  if ("exameResultado" in patch) p.exame_resultado = txt(patch.exameResultado);
  if ("exameRepercussao" in patch) p.exame_repercussao = txt(patch.exameRepercussao);

  if ("viMantidos" in patch) p.vi_mantidos = txt(patch.viMantidos);
  if ("viNecessitam" in patch) p.vi_necessitam = txt(patch.viNecessitam);
  if ("viRevistos" in patch) p.vi_revistos = txt(patch.viRevistos);
  if ("viFundamentacao" in patch) p.vi_fundamentacao = txt(patch.viFundamentacao);

  if (patch.viiElementos !== undefined) p.vii_elementos = sanitizarElementosCentrais(patch.viiElementos);

  const { error } = await supabase
    .from("pos_laudo_complementacao")
    .upsert(p as PosLaudoComplementacaoInsert, { onConflict: "ciclo_id" });
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

/**
 * Gera uma nova versão da Complementação do ciclo — mesmo padrão de
 * `gerarRetificacao`/`gerarEsclarecimentos` (two-pass de paginação, `versao` =
 * maior do processo + 1). É a única saída que aceita
 * `repercussao_laudo = 'substituicao_conclusao'`; e a que grava Nova Conclusão
 * Vigente quando a repercussão altera/revê/substitui a conclusão
 * (`marcarPosLaudoProtocolado`, já genérico, faz isso a partir do snapshot).
 */
export async function gerarComplementacao(
  cicloId: string,
  processoId: string,
  dataAssinaturaIso: string,
): Promise<{ error: string } | { success: true; versao: number }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAssinaturaIso)) {
    return { error: "Informe a data da assinatura." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `versao` é calculada ANTES da compilação porque a seção I do documento
  // mostra "Versão do documento: V{n}" (só a Complementação faz isso).
  const { data: ultimo, error: erroUltimo } = await supabase
    .from("laudos_gerados")
    .select("versao")
    .eq("processo_id", processoId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };
  const versao = (ultimo?.versao ?? 0) + 1;

  const pass1 = await compilarComplementacao(processoId, cicloId, "—", dataAssinaturaIso, versao);
  if (pass1.status === "erro") return { error: pass1.mensagem };
  if (pass1.status === "pendencias") {
    return { error: `Geração bloqueada — pendências: ${pass1.itens.map((i) => i.label).join("; ")}.` };
  }

  const ativos = await buscarAtivosGlobais();
  const medidaUm = await renderizarPdfComPaginas(pass1.modelo, ativos, []);

  const pass2 = await compilarComplementacao(processoId, cicloId, String(medidaUm.paginas), dataAssinaturaIso, versao);
  if (pass2.status !== "ok") {
    return { error: "O estado do ciclo mudou entre as duas passadas de paginação — tente gerar novamente." };
  }
  const medidaDois = await renderizarPdfComPaginas(pass2.modelo, ativos, []);
  if (medidaDois.paginas !== medidaUm.paginas) {
    return {
      error: `Divergência de paginação ao inserir o número de páginas (1ª passada: ${medidaUm.paginas}; 2ª passada: ${medidaDois.paginas}). Geração abortada — tente novamente.`,
    };
  }

  const bufferDocx = await renderizarDocx(pass2.modelo, ativos, []);

  const caminhoPdf = `${processoId}/v${versao}.pdf`;
  const caminhoDocx = `${processoId}/v${versao}.docx`;

  const [uploadPdf, uploadDocx] = await Promise.all([
    supabase.storage
      .from(BUCKET_LAUDOS_GERADOS)
      .upload(caminhoPdf, medidaDois.buffer, { contentType: "application/pdf" }),
    supabase.storage.from(BUCKET_LAUDOS_GERADOS).upload(caminhoDocx, bufferDocx, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  ]);
  if (uploadPdf.error || uploadDocx.error) {
    await Promise.all([
      uploadPdf.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf]),
      uploadDocx.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoDocx]),
    ]);
    return { error: `Erro ao salvar os arquivos: ${uploadPdf.error?.message ?? uploadDocx.error?.message}` };
  }

  const insert: LaudosGeradosInsert = {
    processo_id: processoId,
    versao,
    tipo: "complementacao",
    pos_laudo_ciclo_id: cicloId,
    titulo: "Complementação ao Laudo Médico-Pericial",
    substitui_conclusao: pass2.snapshot.conclusao_vigente_texto !== null,
    storage_path_pdf: caminhoPdf,
    storage_path_docx: caminhoDocx,
    snapshot_respostas: pass2.snapshot,
    paginas: medidaDois.paginas,
    gerado_por: user?.id ?? null,
  };
  const { error: erroInsert } = await supabase.from("laudos_gerados").insert(insert);
  if (erroInsert) {
    await supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf, caminhoDocx]);
    return { error: erroInsert.message };
  }

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true, versao };
}

// ============================================================================
// Fatia 9 — quesitos suplementares do ciclo
// ============================================================================

const QUESITO_TIPO_VALIDOS: readonly PosLaudoQuesitoTipo[] = ["suplementar", "esclarecimento"];
const QUESITO_ORIGEM_VALIDAS: readonly PosLaudoQuesitoOrigemParte[] = ["autor", "reu", "juizo", "outro"];

/**
 * Cria um quesito suplementar em branco no fim da lista do ciclo. `numero` é
 * a MAIOR ordem já usada NESTE CICLO + 1 — a numeração REINICIA do 1 a cada
 * ciclo, nunca continua a contagem do laudo original (decisão da Dra.,
 * pergunta (c)). Fica só no ciclo de pós-laudo: NUNCA entra na aba Quesitos
 * do laudo (Dra. confirmou).
 */
export async function adicionarQuesitoCiclo(cicloId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: ultimo, error: erroUltimo } = await supabase
    .from("pos_laudo_quesitos")
    .select("numero")
    .eq("ciclo_id", cicloId)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };

  const insert: PosLaudoQuesitosInsert = {
    ciclo_id: cicloId,
    tipo: "suplementar",
    numero: (ultimo?.numero ?? 0) + 1,
    pergunta: "",
  };
  const { error } = await supabase.from("pos_laudo_quesitos").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

/** Salva um quesito do ciclo (origem, tipo, pergunta, resposta). O texto e a resposta ficam livres até a geração. */
export async function salvarQuesitoCiclo(input: {
  quesitoId: string;
  cicloId: string;
  processoId: string;
  origem: string | null;
  tipo: string;
  pergunta: string;
  resposta: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const tipo: PosLaudoQuesitoTipo = (QUESITO_TIPO_VALIDOS as readonly string[]).includes(input.tipo)
    ? (input.tipo as PosLaudoQuesitoTipo)
    : "suplementar";
  const origem: PosLaudoQuesitoOrigemParte | null =
    input.origem && (QUESITO_ORIGEM_VALIDAS as readonly string[]).includes(input.origem)
      ? (input.origem as PosLaudoQuesitoOrigemParte)
      : null;

  const { error } = await supabase
    .from("pos_laudo_quesitos")
    .update({ origem, tipo, pergunta: input.pergunta, resposta: input.resposta })
    .eq("id", input.quesitoId)
    .eq("ciclo_id", input.cicloId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

/** Remove um quesito do ciclo. */
export async function removerQuesitoCiclo(
  quesitoId: string,
  cicloId: string,
  processoId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pos_laudo_quesitos")
    .delete()
    .eq("id", quesitoId)
    .eq("ciclo_id", cicloId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

// ============================================================================
// Fluxo Assistência Técnica — geração das saídas (fatia 10c)
// ============================================================================

const AT_MODALIDADE_VALIDAS: readonly PosLaudoAtModalidade[] = [
  "concordancia",
  "concordancia_ressalvas",
  "impugnacao_parcial",
  "impugnacao_integral",
  "divergente",
  "manifestacao",
];

const TIPOS_PARECER_AT: readonly LaudoGeradoTipo[] = [
  "parecer_at",
  "manifestacao_at",
  "impugnacao_at",
  "parecer_divergente_at",
];

/**
 * Grava (insere OU sobrescreve in-place) uma saída de Assistência Técnica em
 * `laudos_gerados` — o núcleo da mudança de arquitetura da fatia 10 (resposta
 * (b) da Dra. Fernanda): o documento de AT NÃO é protocolado pelo sistema, é
 * o advogado quem protocola, externamente, dias depois de receber.
 *
 * A régua tem DOIS estados de "já saiu daqui", não um só:
 *
 *   RASCUNHO (nunca entregue) --regera--> RASCUNHO (mesma linha, sobrescrita)
 *   RASCUNHO --entrega registrada--> ENTREGUE --regera--> RASCUNHO NOVO (versão nova)
 *   qualquer um --protocolo registrado--> PROTOCOLADO (congelado, trg_laudos_gerados_congela)
 *
 * Enquanto a saída NUNCA foi entregue (`entregue_ao_advogado_em IS NULL` E
 * `protocolado = false`), gerar de novo SOBRESCREVE a mesma linha (mesmo
 * `id`/`versao`/caminho no Storage — "ela edita a mesma página e reentrega",
 * ainda sem ninguém ter recebido nada). A partir do momento em que a entrega é
 * registrada, existe um PDF na mão de outra pessoa: regenerar não pode mais
 * apagar esse conteúdo, então passa a criar uma VERSÃO NOVA (próximo bloco),
 * preservando a versão entregue — e a data de cada entrega — no histórico.
 * Ela continua livre pra editar e reentregar quantas vezes quiser (não muda
 * nada da resposta (b) da Dra.); o que muda é que cada entrega vira um
 * registro permanente, não uma fase transitória apagável.
 *
 * `tiposMesmoRascunho` define o que conta como "o rascunho atual desta saída":
 * as 4 variações do parecer (a modalidade pode mudar de uma geração pra outra
 * sem virar documento novo) ou só `quesitos_at` para o documento isolado.
 */
async function gravarSaidaAtInPlace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    processoId: string;
    cicloId: string;
    tipo: LaudoGeradoTipo;
    tiposMesmoRascunho: readonly LaudoGeradoTipo[];
    titulo: string;
    atModalidade: PosLaudoAtModalidade | null;
    snapshot: SnapshotPosLaudo;
    bufferPdf: Buffer;
    bufferDocx: Buffer;
    paginas: number;
  },
): Promise<{ error: string } | { success: true; versao: number }> {
  const { data: rascunho, error: erroRascunho } = await supabase
    .from("laudos_gerados")
    .select("id, versao, storage_path_pdf, storage_path_docx")
    .eq("pos_laudo_ciclo_id", input.cicloId)
    .in("tipo", input.tiposMesmoRascunho)
    .eq("protocolado", false)
    .is("entregue_ao_advogado_em", null)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroRascunho) return { error: erroRascunho.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (rascunho) {
    const caminhoPdf = rascunho.storage_path_pdf ?? `${input.processoId}/v${rascunho.versao}.pdf`;
    const caminhoDocx = rascunho.storage_path_docx ?? `${input.processoId}/v${rascunho.versao}.docx`;
    const [uploadPdf, uploadDocx] = await Promise.all([
      supabase.storage
        .from(BUCKET_LAUDOS_GERADOS)
        .upload(caminhoPdf, input.bufferPdf, { contentType: "application/pdf", upsert: true }),
      supabase.storage.from(BUCKET_LAUDOS_GERADOS).upload(caminhoDocx, input.bufferDocx, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      }),
    ]);
    if (uploadPdf.error || uploadDocx.error) {
      return { error: `Erro ao salvar os arquivos: ${uploadPdf.error?.message ?? uploadDocx.error?.message}` };
    }
    // entregue_ao_advogado_em não entra no update: a linha só chega até aqui
    // quando já está null (filtro da consulta acima) — nunca há o que limpar.
    const { error: erroUpdate } = await supabase
      .from("laudos_gerados")
      .update({
        tipo: input.tipo,
        titulo: input.titulo,
        at_modalidade: input.atModalidade,
        storage_path_pdf: caminhoPdf,
        storage_path_docx: caminhoDocx,
        snapshot_respostas: input.snapshot,
        paginas: input.paginas,
        gerado_por: user?.id ?? null,
      })
      .eq("id", rascunho.id)
      .eq("protocolado", false)
      .is("entregue_ao_advogado_em", null);
    if (erroUpdate) return { error: erroUpdate.message };
    return { success: true, versao: rascunho.versao };
  }

  // Não há rascunho sobrescrevível: ou é a 1ª geração, ou o rascunho mais
  // recente já foi entregue e/ou protocolado — nos dois casos, versão nova.

  const { data: ultimo, error: erroUltimo } = await supabase
    .from("laudos_gerados")
    .select("versao")
    .eq("processo_id", input.processoId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };
  const versao = (ultimo?.versao ?? 0) + 1;
  const caminhoPdf = `${input.processoId}/v${versao}.pdf`;
  const caminhoDocx = `${input.processoId}/v${versao}.docx`;

  const [uploadPdf, uploadDocx] = await Promise.all([
    supabase.storage
      .from(BUCKET_LAUDOS_GERADOS)
      .upload(caminhoPdf, input.bufferPdf, { contentType: "application/pdf" }),
    supabase.storage.from(BUCKET_LAUDOS_GERADOS).upload(caminhoDocx, input.bufferDocx, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  ]);
  if (uploadPdf.error || uploadDocx.error) {
    await Promise.all([
      uploadPdf.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf]),
      uploadDocx.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoDocx]),
    ]);
    return { error: `Erro ao salvar os arquivos: ${uploadPdf.error?.message ?? uploadDocx.error?.message}` };
  }

  const insert: LaudosGeradosInsert = {
    processo_id: input.processoId,
    versao,
    tipo: input.tipo,
    pos_laudo_ciclo_id: input.cicloId,
    titulo: input.titulo,
    at_modalidade: input.atModalidade,
    substitui_conclusao: false,
    storage_path_pdf: caminhoPdf,
    storage_path_docx: caminhoDocx,
    snapshot_respostas: input.snapshot,
    paginas: input.paginas,
    gerado_por: user?.id ?? null,
  };
  const { error: erroInsert } = await supabase.from("laudos_gerados").insert(insert);
  if (erroInsert) {
    await supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf, caminhoDocx]);
    return { error: erroInsert.message };
  }

  return { success: true, versao };
}

/**
 * Gera (ou regenera in-place, ver `gravarSaidaAtInPlace`) o parecer de
 * Assistência Técnica do ciclo, na modalidade escolhida. Mesmo two-pass de
 * paginação dos compiladores judiciais.
 */
export async function gerarParecerAt(
  cicloId: string,
  processoId: string,
  modalidade: string,
  dataAssinaturaIso: string,
): Promise<{ error: string } | { success: true; versao: number }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAssinaturaIso)) {
    return { error: "Informe a data da assinatura." };
  }
  if (!(AT_MODALIDADE_VALIDAS as readonly string[]).includes(modalidade)) {
    return { error: "Modalidade de parecer inválida." };
  }
  const modalidadeValida = modalidade as PosLaudoAtModalidade;

  const pass1 = await compilarParecerAt(processoId, cicloId, modalidadeValida, "—", dataAssinaturaIso);
  if (pass1.status === "erro") return { error: pass1.mensagem };
  if (pass1.status === "pendencias") {
    return { error: `Geração bloqueada — pendências: ${pass1.itens.map((i) => i.label).join("; ")}.` };
  }

  const ativos = await buscarAtivosGlobais();
  const medidaUm = await renderizarPdfComPaginas(pass1.modelo, ativos, []);

  const pass2 = await compilarParecerAt(processoId, cicloId, modalidadeValida, String(medidaUm.paginas), dataAssinaturaIso);
  if (pass2.status !== "ok") {
    return { error: "O estado do ciclo mudou entre as duas passadas de paginação — tente gerar novamente." };
  }
  const medidaDois = await renderizarPdfComPaginas(pass2.modelo, ativos, []);
  if (medidaDois.paginas !== medidaUm.paginas) {
    return {
      error: `Divergência de paginação ao inserir o número de páginas (1ª passada: ${medidaUm.paginas}; 2ª passada: ${medidaDois.paginas}). Geração abortada — tente novamente.`,
    };
  }
  const bufferDocx = await renderizarDocx(pass2.modelo, ativos, []);

  const supabase = await createClient();
  const resultado = await gravarSaidaAtInPlace(supabase, {
    processoId,
    cicloId,
    tipo: pass2.tipo,
    tiposMesmoRascunho: TIPOS_PARECER_AT,
    titulo: pass2.titulo,
    atModalidade: modalidadeValida,
    snapshot: pass2.snapshot,
    bufferPdf: medidaDois.buffer,
    bufferDocx,
    paginas: medidaDois.paginas,
  });
  if ("error" in resultado) return resultado;

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return resultado;
}

/**
 * Gera (ou regenera in-place) o documento isolado de Quesitos Suplementares
 * do ciclo AT — item 7 da aprovação da fatia 10 (Jeferson): os mesmos
 * quesitos do ciclo já saem embutidos no parecer; este é o documento próprio
 * pros casos em que ela só precisa entregar o quesito, sem parecer nenhum.
 */
export async function gerarQuesitosAt(
  cicloId: string,
  processoId: string,
  dataAssinaturaIso: string,
): Promise<{ error: string } | { success: true; versao: number }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAssinaturaIso)) {
    return { error: "Informe a data da assinatura." };
  }

  const pass1 = await compilarQuesitosAt(processoId, cicloId, "—", dataAssinaturaIso);
  if (pass1.status === "erro") return { error: pass1.mensagem };
  if (pass1.status === "pendencias") {
    return { error: `Geração bloqueada — pendências: ${pass1.itens.map((i) => i.label).join("; ")}.` };
  }

  const ativos = await buscarAtivosGlobais();
  const medidaUm = await renderizarPdfComPaginas(pass1.modelo, ativos, []);

  const pass2 = await compilarQuesitosAt(processoId, cicloId, String(medidaUm.paginas), dataAssinaturaIso);
  if (pass2.status !== "ok") {
    return { error: "O estado do ciclo mudou entre as duas passadas de paginação — tente gerar novamente." };
  }
  const medidaDois = await renderizarPdfComPaginas(pass2.modelo, ativos, []);
  if (medidaDois.paginas !== medidaUm.paginas) {
    return {
      error: `Divergência de paginação ao inserir o número de páginas (1ª passada: ${medidaUm.paginas}; 2ª passada: ${medidaDois.paginas}). Geração abortada — tente novamente.`,
    };
  }
  const bufferDocx = await renderizarDocx(pass2.modelo, ativos, []);

  const supabase = await createClient();
  const resultado = await gravarSaidaAtInPlace(supabase, {
    processoId,
    cicloId,
    tipo: "quesitos_at",
    tiposMesmoRascunho: ["quesitos_at"],
    titulo: TITULO_QUESITOS_AT,
    atModalidade: null,
    snapshot: pass2.snapshot,
    bufferPdf: medidaDois.buffer,
    bufferDocx,
    paginas: medidaDois.paginas,
  });
  if ("error" in resultado) return resultado;

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return resultado;
}

/**
 * Adaptadores de assinatura uniforme pra `GerarSaidaAtPanel` (o mesmo
 * componente serve o parecer e os Quesitos isolados, mas só o parecer tem
 * seletor de modalidade) — `gerarParecerAt`/`gerarQuesitosAt` continuam sendo
 * as ações "de verdade", com a assinatura própria de cada uma.
 */
export async function gerarParecerAtViaPainel(
  cicloId: string,
  processoId: string,
  dataAssinaturaIso: string,
  modalidade: string | null,
): Promise<{ error: string } | { success: true; versao: number }> {
  if (!modalidade) return { error: "Selecione a modalidade do parecer." };
  return gerarParecerAt(cicloId, processoId, modalidade, dataAssinaturaIso);
}

export async function gerarQuesitosAtViaPainel(
  cicloId: string,
  processoId: string,
  dataAssinaturaIso: string,
): Promise<{ error: string } | { success: true; versao: number }> {
  return gerarQuesitosAt(cicloId, processoId, dataAssinaturaIso);
}

/**
 * Registra que a saída AT foi entregue ao advogado — estado intermediário
 * ANTES do protocolo (que é do patrono, externo ao sistema). Reversível e
 * NÃO congela nada (ao contrário de `marcarPosLaudoProtocolado`): o campo em
 * si pode ser corrigido depois se preciso. Mas a partir daqui existe um PDF
 * na mão de outra pessoa — `gravarSaidaAtInPlace` para de sobrescrever esta
 * linha: a próxima geração vira uma VERSÃO NOVA, preservando esta (e a data
 * desta entrega) no histórico. Ela segue livre pra editar e reentregar; o que
 * já saiu do escritório é que fica rastreável.
 */
export async function registrarEntregaAoAdvogado(
  laudoGeradoId: string,
  processoId: string,
  cicloId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("laudos_gerados")
    .update({ entregue_ao_advogado_em: new Date().toISOString() })
    .eq("id", laudoGeradoId)
    .eq("processo_id", processoId)
    .eq("pos_laudo_ciclo_id", cicloId)
    .eq("protocolado", false);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}
