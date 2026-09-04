"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_DOCUMENTOS, TAMANHO_MAXIMO_BYTES } from "@/features/documentos/constants";
import type {
  DocumentosInsert,
  PosLaudoCiclosInsert,
  PosLaudoDocumentosInsert,
  PosLaudoPontosInsert,
} from "@/types/database";
import type {
  PosLaudoClassificacaoTriagem,
  PosLaudoDocumentoPapel,
  PosLaudoDocumentoRelevancia,
  PosLaudoFluxo,
  PosLaudoNatureza,
  PosLaudoOrigem,
  PosLaudoPotencialConclusao,
  PosLaudoRepercussaoLaudo,
  PosLaudoRepercussaoPonto,
} from "@/types/enums";
import { conclusaoVigenteAtual } from "@/features/pos-laudo/consultas";

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

  // Gate + âncora do ciclo: precisa de um laudo protocolado.
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
    laudo_base_id: laudoBase.id,
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
