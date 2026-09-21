"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  AnalisesViabilidadeRow,
  AnalisesViabilidadeUpdate,
  CasoQuestoesTecnicasInsert,
  CasoQuestoesTecnicasUpdate,
  CasoDocumentosFaltantesInsert,
  CasoDocumentosFaltantesUpdate,
  CasoLinhaTempoMedicaInsert,
  CasoLinhaTempoMedicaUpdate,
  CasoFatosComprovadosInsert,
  CasoFatosComprovadosUpdate,
  CasoPontosTecnicosInsert,
  CasoPontosTecnicosUpdate,
} from "@/types/database";
import type {
  ViabilidadeStatus,
  ViabilidadeSuficienciaDocumental,
  ViabilidadeRelevanciaDocumento,
  ViabilidadeImpactoLimitacao,
  ViabilidadeCategoriaLinhaTempo,
  ViabilidadeClassificacaoFato,
} from "@/types/enums";
import { VIABILIDADE_STATUS_ORDENADOS } from "./catalogos";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

/**
 * Garante que existe uma linha em `analises_viabilidade` pro processo —
 * cria com status inicial 'nao_iniciada' na primeira visita à tela, sem
 * exigir um botão "Iniciar análise" separado (mesmo espírito de outras
 * telas do sistema que criam o registro-base na primeira visita). Chamada
 * pela page (Server Component), não por um botão do usuário.
 */
export async function garantirAnaliseViabilidade(
  processoId: string,
): Promise<{ error: string } | { data: AnalisesViabilidadeRow }> {
  const supabase = await createClient();

  const { data: existente, error: erroSelect } = await supabase
    .from("analises_viabilidade")
    .select("*")
    .eq("processo_id", processoId)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };
  if (existente) return { data: existente };

  const { data: criada, error: erroInsert } = await supabase
    .from("analises_viabilidade")
    .insert({ processo_id: processoId })
    .select("*")
    .single();
  if (erroInsert) return { error: erroInsert.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { data: criada };
}

/** Cabeçalho da Janela de Análise de Viabilidade (§3 do spec) — fatia 0. */
export async function salvarCabecalhoViabilidade(formData: FormData): Promise<ActionResult> {
  const analiseId = textoOuNull(formData.get("analise_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!analiseId || !processoId) return { error: "Análise inválida — recarregue a página e tente de novo." };

  const status = formData.get("status") as ViabilidadeStatus | null;
  if (!status || !VIABILIDADE_STATUS_ORDENADOS.includes(status)) {
    return { error: "Escolha um status válido." };
  }

  const materia = formData.getAll("materia").map((v) => String(v)).filter(Boolean);
  const tagsTecnicas = formData.getAll("tags_tecnicas").map((v) => String(v)).filter(Boolean);

  const supabase = await createClient();
  const update: AnalisesViabilidadeUpdate = {
    status,
    posicao_cliente_litigio: textoOuNull(formData.get("posicao_cliente_litigio")),
    especialidade: textoOuNull(formData.get("especialidade")),
    materia: materia.length > 0 ? materia : null,
    tags_tecnicas: tagsTecnicas.length > 0 ? tagsTecnicas : null,
    prazo_contratual_entrega: textoOuNull(formData.get("prazo_contratual_entrega")),
  };

  const { error } = await supabase.from("analises_viabilidade").update(update).eq("id", analiseId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Finalidade (§4) + Narrativas (§5) + Objeto (§6, exceto questões técnicas) — fatia 1. */
export async function salvarFinalidadeNarrativasObjeto(formData: FormData): Promise<ActionResult> {
  const analiseId = textoOuNull(formData.get("analise_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!analiseId || !processoId) return { error: "Análise inválida — recarregue a página e tente de novo." };

  const finalidade = formData.getAll("finalidade").map((v) => String(v)).filter(Boolean);

  const supabase = await createClient();
  const update: AnalisesViabilidadeUpdate = {
    finalidade,
    pergunta_central_advogado: textoOuNull(formData.get("pergunta_central_advogado")),
    narrativa_advogado: textoOuNull(formData.get("narrativa_advogado")),
    narrativa_cliente: textoOuNull(formData.get("narrativa_cliente")),
    tese_inicial_apresentada: textoOuNull(formData.get("tese_inicial_apresentada")),
    narrativa_fonte_informacao: textoOuNull(formData.get("narrativa_fonte_informacao")),
    objeto_analise: textoOuNull(formData.get("objeto_analise")),
  };

  const { error } = await supabase.from("analises_viabilidade").update(update).eq("id", analiseId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** "+ Adicionar questão técnica" (§6) — CRUD independente, ligado a processo_id (não à análise). */
export async function criarQuestaoTecnica(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const questao = textoOuNull(formData.get("questao"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!questao) return { error: "Descreva a questão técnica." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const numeroBruto = textoOuNull(formData.get("numero"));
  const insert: CasoQuestoesTecnicasInsert = {
    processo_id: processoId,
    numero: numeroBruto ? Number(numeroBruto) : null,
    questao,
    tema: textoOuNull(formData.get("tema")),
    status: textoOuNull(formData.get("status")),
    resposta_preliminar: textoOuNull(formData.get("resposta_preliminar")),
    fonte: textoOuNull(formData.get("fonte")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_questoes_tecnicas").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarQuestaoTecnica(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const questao = textoOuNull(formData.get("questao"));
  if (!id || !processoId) return { error: "Questão técnica inválida — recarregue a página e tente de novo." };
  if (!questao) return { error: "Descreva a questão técnica." };

  const numeroBruto = textoOuNull(formData.get("numero"));
  const supabase = await createClient();
  const update: CasoQuestoesTecnicasUpdate = {
    numero: numeroBruto ? Number(numeroBruto) : null,
    questao,
    tema: textoOuNull(formData.get("tema")),
    status: textoOuNull(formData.get("status")),
    resposta_preliminar: textoOuNull(formData.get("resposta_preliminar")),
    fonte: textoOuNull(formData.get("fonte")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_questoes_tecnicas").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirQuestaoTecnica(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_questoes_tecnicas").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/**
 * Suficiência documental (§8) — é o gatilho: Parcialmente/Não sinalizam
 * que o bloco de Documentos faltantes é esperado, mas o bloco continua
 * visível e utilizável mesmo com Sim (decisão do Jeferson, 21/09/2026:
 * pode ter caso com acervo suficiente e ainda assim valer pedir um
 * documento complementar — nunca esconder o bloco, só não obrigar).
 */
export async function salvarSuficienciaDocumental(formData: FormData): Promise<ActionResult> {
  const analiseId = textoOuNull(formData.get("analise_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!analiseId || !processoId) return { error: "Análise inválida — recarregue a página e tente de novo." };

  const suficiencia = (formData.get("suficiencia_documental") as ViabilidadeSuficienciaDocumental | "") || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("analises_viabilidade")
    .update({ suficiencia_documental: suficiencia })
    .eq("id", analiseId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/**
 * Acervo documental (§7) — avaliação de UM documento já existente em
 * `documentos` NESTA análise (utilizado?/relevância/observação técnica).
 * Sem UNIQUE constraint em (processo_id, documento_id) no banco — resolve
 * por select-then-branch (mesmo padrão de garantirAnaliseViabilidade), em
 * vez de upsert, que exigiria um índice único que a migration não criou.
 */
export async function avaliarDocumento(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const documentoId = textoOuNull(formData.get("documento_id"));
  if (!processoId || !documentoId) return { error: "Documento inválido — recarregue a página e tente de novo." };

  const utilizado = formData.get("utilizado") === "on";
  const relevancia = (formData.get("relevancia") as ViabilidadeRelevanciaDocumento | "") || null;
  const observacaoTecnica = textoOuNull(formData.get("observacao_tecnica"));

  const supabase = await createClient();
  const { data: existente, error: erroSelect } = await supabase
    .from("caso_documentos_avaliados")
    .select("id")
    .eq("processo_id", processoId)
    .eq("documento_id", documentoId)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };

  if (existente) {
    const { error } = await supabase
      .from("caso_documentos_avaliados")
      .update({ utilizado, relevancia, observacao_tecnica: observacaoTecnica, atualizado_por_modulo: "viabilidade" })
      .eq("id", existente.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("caso_documentos_avaliados")
      .insert({ processo_id: processoId, documento_id: documentoId, utilizado, relevancia, observacao_tecnica: observacaoTecnica });
    if (error) return { error: error.message };
  }

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Documentos faltantes (§9) — CRUD independente, ligado a processo_id. Sempre visível (ver nota acima). */
export async function criarDocumentoFaltante(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const documentoNecessario = textoOuNull(formData.get("documento_necessario"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!documentoNecessario) return { error: "Descreva o documento necessário." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: CasoDocumentosFaltantesInsert = {
    processo_id: processoId,
    documento_necessario: documentoNecessario,
    justificativa_tecnica: textoOuNull(formData.get("justificativa_tecnica")),
    quem_provavelmente_possui: textoOuNull(formData.get("quem_provavelmente_possui")),
    prioridade: textoOuNull(formData.get("prioridade")),
    impacto: (formData.get("impacto") as CasoDocumentosFaltantesInsert["impacto"]) || null,
    responsavel: textoOuNull(formData.get("responsavel")),
    prazo: textoOuNull(formData.get("prazo")),
    status: textoOuNull(formData.get("status")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_documentos_faltantes").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  revalidatePath("/hoje");
  revalidatePath("/agenda");
  return { success: true };
}

export async function atualizarDocumentoFaltante(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const documentoNecessario = textoOuNull(formData.get("documento_necessario"));
  if (!id || !processoId) return { error: "Documento faltante inválido — recarregue a página e tente de novo." };
  if (!documentoNecessario) return { error: "Descreva o documento necessário." };

  const supabase = await createClient();
  const update: CasoDocumentosFaltantesUpdate = {
    documento_necessario: documentoNecessario,
    justificativa_tecnica: textoOuNull(formData.get("justificativa_tecnica")),
    quem_provavelmente_possui: textoOuNull(formData.get("quem_provavelmente_possui")),
    prioridade: textoOuNull(formData.get("prioridade")),
    impacto: (formData.get("impacto") as CasoDocumentosFaltantesUpdate["impacto"]) || null,
    responsavel: textoOuNull(formData.get("responsavel")),
    prazo: textoOuNull(formData.get("prazo")),
    status: textoOuNull(formData.get("status")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_documentos_faltantes").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  revalidatePath("/hoje");
  revalidatePath("/agenda");
  return { success: true };
}

/** Marca como resolvido — some da Central de Prazos (fonte lê `resolvido_em is null`), fica no histórico do caso. */
export async function resolverDocumentoFaltante(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("caso_documentos_faltantes")
    .update({ resolvido_em: new Date().toISOString(), atualizado_por_modulo: "viabilidade" })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  revalidatePath("/hoje");
  revalidatePath("/agenda");
  return { success: true };
}

export async function excluirDocumentoFaltante(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_documentos_faltantes").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  revalidatePath("/hoje");
  revalidatePath("/agenda");
  return { success: true };
}

/**
 * Limitações documentais (§10) — hub, não repetível. NOTA (registrada a
 * pedido do Jeferson, 21/09/2026): `limitacoes_justificativa` deveria ser
 * exigida quando impacto='impede_conclusao' E a conclusão escolhida
 * (analises_viabilidade.conclusao) for definitiva — mas essa trava NÃO
 * TEM COMO DISPARAR ainda, porque `conclusao` só existe a partir da fatia
 * 7. Fica sem validação de obrigatoriedade aqui de propósito; a fatia 7
 * (bloqueios de finalização, §42) é quem liga essa checagem.
 */
export async function salvarLimitacoesDocumentais(formData: FormData): Promise<ActionResult> {
  const analiseId = textoOuNull(formData.get("analise_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!analiseId || !processoId) return { error: "Análise inválida — recarregue a página e tente de novo." };

  const limitacoes = formData.getAll("limitacoes_documentais").map((v) => String(v)).filter(Boolean);
  const impacto = (formData.get("limitacoes_impacto") as ViabilidadeImpactoLimitacao | "") || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("analises_viabilidade")
    .update({
      limitacoes_documentais: limitacoes.length > 0 ? limitacoes : null,
      limitacoes_impacto: impacto,
      limitacoes_justificativa: textoOuNull(formData.get("limitacoes_justificativa")),
    })
    .eq("id", analiseId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Linha do tempo médico-pericial (§11) — CRUD, ligado a processo_id. */
export async function criarEventoLinhaTempo(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const data = textoOuNull(formData.get("data"));
  const evento = textoOuNull(formData.get("evento"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!data) return { error: "Informe a data do evento." };
  if (!evento) return { error: "Descreva o evento." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: CasoLinhaTempoMedicaInsert = {
    processo_id: processoId,
    data,
    hora: textoOuNull(formData.get("hora")),
    evento,
    categoria: (formData.get("categoria") as ViabilidadeCategoriaLinhaTempo | "") || null,
    documento_id: textoOuNull(formData.get("documento_id")),
    pagina_ref: textoOuNull(formData.get("pagina_ref")),
    relevancia: textoOuNull(formData.get("relevancia")),
    observacao_tecnica: textoOuNull(formData.get("observacao_tecnica")),
    marco_critico: formData.get("marco_critico") === "on",
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_linha_tempo_medica").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarEventoLinhaTempo(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const data = textoOuNull(formData.get("data"));
  const evento = textoOuNull(formData.get("evento"));
  if (!id || !processoId) return { error: "Evento inválido — recarregue a página e tente de novo." };
  if (!data) return { error: "Informe a data do evento." };
  if (!evento) return { error: "Descreva o evento." };

  const supabase = await createClient();
  const update: CasoLinhaTempoMedicaUpdate = {
    data,
    hora: textoOuNull(formData.get("hora")),
    evento,
    categoria: (formData.get("categoria") as ViabilidadeCategoriaLinhaTempo | "") || null,
    documento_id: textoOuNull(formData.get("documento_id")),
    pagina_ref: textoOuNull(formData.get("pagina_ref")),
    relevancia: textoOuNull(formData.get("relevancia")),
    observacao_tecnica: textoOuNull(formData.get("observacao_tecnica")),
    marco_critico: formData.get("marco_critico") === "on",
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_linha_tempo_medica").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirEventoLinhaTempo(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_linha_tempo_medica").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/**
 * Fatos comprovados (§12) — CRUD, ligado a processo_id. NUNCA populado a
 * partir das narrativas (fatia 1) — é essa separação de tabelas, sem
 * pipeline de código entre elas, que garante "narrativa nunca vira fato
 * automaticamente".
 */
export async function criarFatoComprovado(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const fato = textoOuNull(formData.get("fato"));
  const classificacao = formData.get("classificacao") as ViabilidadeClassificacaoFato | null;
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!fato) return { error: "Descreva o fato." };
  if (!classificacao) return { error: "Escolha uma classificação." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: CasoFatosComprovadosInsert = {
    processo_id: processoId,
    fato,
    data: textoOuNull(formData.get("data")),
    documento_id: textoOuNull(formData.get("documento_id")),
    pagina_ref: textoOuNull(formData.get("pagina_ref")),
    relevancia: textoOuNull(formData.get("relevancia")),
    questao_tecnica_id: textoOuNull(formData.get("questao_tecnica_id")),
    classificacao,
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_fatos_comprovados").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarFatoComprovado(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const fato = textoOuNull(formData.get("fato"));
  const classificacao = formData.get("classificacao") as ViabilidadeClassificacaoFato | null;
  if (!id || !processoId) return { error: "Fato inválido — recarregue a página e tente de novo." };
  if (!fato) return { error: "Descreva o fato." };
  if (!classificacao) return { error: "Escolha uma classificação." };

  const supabase = await createClient();
  const update: CasoFatosComprovadosUpdate = {
    fato,
    data: textoOuNull(formData.get("data")),
    documento_id: textoOuNull(formData.get("documento_id")),
    pagina_ref: textoOuNull(formData.get("pagina_ref")),
    relevancia: textoOuNull(formData.get("relevancia")),
    questao_tecnica_id: textoOuNull(formData.get("questao_tecnica_id")),
    classificacao,
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_fatos_comprovados").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Alterna validado_em (§12) — nunca inferido da classificação, só preenchido quando ela confirma explicitamente. */
export async function alternarValidacaoFato(id: string, processoId: string, validar: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("caso_fatos_comprovados")
    .update({ validado_em: validar ? new Date().toISOString() : null, atualizado_por_modulo: "viabilidade" })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirFatoComprovado(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_fatos_comprovados").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Pontos técnicos relevantes / possíveis controvérsias (§13) — CRUD. "Possível controvérsia", nunca "versão da parte contrária" (ainda não há processo). */
export async function criarPontoTecnico(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const pontoTecnico = textoOuNull(formData.get("ponto_tecnico"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!pontoTecnico) return { error: "Descreva o ponto técnico." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: CasoPontosTecnicosInsert = {
    processo_id: processoId,
    ponto_tecnico: pontoTecnico,
    narrativa_apresentada: textoOuNull(formData.get("narrativa_apresentada")),
    evidencia_documental: textoOuNull(formData.get("evidencia_documental")),
    possivel_controversia: textoOuNull(formData.get("possivel_controversia")),
    avaliacao_tecnica: textoOuNull(formData.get("avaliacao_tecnica")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_pontos_tecnicos").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarPontoTecnico(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const pontoTecnico = textoOuNull(formData.get("ponto_tecnico"));
  if (!id || !processoId) return { error: "Ponto técnico inválido — recarregue a página e tente de novo." };
  if (!pontoTecnico) return { error: "Descreva o ponto técnico." };

  const supabase = await createClient();
  const update: CasoPontosTecnicosUpdate = {
    ponto_tecnico: pontoTecnico,
    narrativa_apresentada: textoOuNull(formData.get("narrativa_apresentada")),
    evidencia_documental: textoOuNull(formData.get("evidencia_documental")),
    possivel_controversia: textoOuNull(formData.get("possivel_controversia")),
    avaliacao_tecnica: textoOuNull(formData.get("avaliacao_tecnica")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_pontos_tecnicos").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirPontoTecnico(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_pontos_tecnicos").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}
