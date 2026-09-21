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
  CasoCondutasAnalisadasInsert,
  CasoCondutasAnalisadasUpdate,
  CasoNexoCausalRow,
  CasoNexoCausalUpdate,
  CasoDanoRow,
  CasoDanoUpdate,
  CasoIncapacidadeRow,
  CasoIncapacidadeUpdate,
  CasoCausasAlternativasInsert,
  CasoCausasAlternativasUpdate,
  CasoPontosFavoraveisInsert,
  CasoPontosFavoraveisUpdate,
  CasoFragilidadesInsert,
  CasoFragilidadesUpdate,
  CasoOportunidadesProbatoriasInsert,
  CasoOportunidadesProbatoriasUpdate,
  CasoTeseAdversaInsert,
  CasoTeseAdversaUpdate,
  CasoLiteraturaUtilizadaInsert,
  CasoLiteraturaUtilizadaUpdate,
  CasoNecessidadeEspecialistaInsert,
  CasoNecessidadeEspecialistaUpdate,
} from "@/types/database";
import type {
  ViabilidadeStatus,
  ViabilidadeSuficienciaDocumental,
  ViabilidadeRelevanciaDocumento,
  ViabilidadeImpactoLimitacao,
  ViabilidadeCategoriaLinhaTempo,
  ViabilidadeClassificacaoFato,
  ViabilidadeAvaliacaoConduta,
  ViabilidadeGrauSeguranca,
  ViabilidadeOportunidadeDiagnostica,
  ViabilidadeHouveAtraso,
  ViabilidadeConclusaoNexo,
  ViabilidadeDanoExiste,
  ViabilidadeDanoTemporarioPermanente,
  ViabilidadeParcialTotal,
  ViabilidadeIncapacidadeTemporariaPermanente,
  ViabilidadePlausibilidade,
  ViabilidadeForcaProbatoria,
  ViabilidadeImpactoFragilidade,
  ViabilidadeTipoProva,
  ViabilidadeRiscoGrau,
  ViabilidadeNecessidadeEspecialista,
  ViabilidadeTipoLiteratura,
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

/** Condutas analisadas (§14) — CRUD, uma linha por profissional/instituição avaliado (nunca uma avaliação genérica só). */
export async function criarCondutaAnalisada(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const profissionalInstituicao = textoOuNull(formData.get("profissional_instituicao"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!profissionalInstituicao) return { error: "Informe o profissional/instituição." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: CasoCondutasAnalisadasInsert = {
    processo_id: processoId,
    profissional_instituicao: profissionalInstituicao,
    papel: textoOuNull(formData.get("papel")),
    periodo_inicio: textoOuNull(formData.get("periodo_inicio")),
    periodo_fim: textoOuNull(formData.get("periodo_fim")),
    conduta_questionada: textoOuNull(formData.get("conduta_questionada")),
    conduta_documentada: textoOuNull(formData.get("conduta_documentada")),
    conduta_esperada: textoOuNull(formData.get("conduta_esperada")),
    fonte: textoOuNull(formData.get("fonte")),
    literatura_norma: textoOuNull(formData.get("literatura_norma")),
    avaliacao: (formData.get("avaliacao") as ViabilidadeAvaliacaoConduta | "") || null,
    repercussao: textoOuNull(formData.get("repercussao")),
    seguranca: (formData.get("seguranca") as ViabilidadeGrauSeguranca | "") || null,
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_condutas_analisadas").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarCondutaAnalisada(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const profissionalInstituicao = textoOuNull(formData.get("profissional_instituicao"));
  if (!id || !processoId) return { error: "Conduta inválida — recarregue a página e tente de novo." };
  if (!profissionalInstituicao) return { error: "Informe o profissional/instituição." };

  const supabase = await createClient();
  const update: CasoCondutasAnalisadasUpdate = {
    profissional_instituicao: profissionalInstituicao,
    papel: textoOuNull(formData.get("papel")),
    periodo_inicio: textoOuNull(formData.get("periodo_inicio")),
    periodo_fim: textoOuNull(formData.get("periodo_fim")),
    conduta_questionada: textoOuNull(formData.get("conduta_questionada")),
    conduta_documentada: textoOuNull(formData.get("conduta_documentada")),
    conduta_esperada: textoOuNull(formData.get("conduta_esperada")),
    fonte: textoOuNull(formData.get("fonte")),
    literatura_norma: textoOuNull(formData.get("literatura_norma")),
    avaliacao: (formData.get("avaliacao") as ViabilidadeAvaliacaoConduta | "") || null,
    repercussao: textoOuNull(formData.get("repercussao")),
    seguranca: (formData.get("seguranca") as ViabilidadeGrauSeguranca | "") || null,
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_condutas_analisadas").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirCondutaAnalisada(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_condutas_analisadas").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Oportunidade diagnóstica/terapêutica (§15) — hub, bloco condicional (só relevante quando oportunidade_diagnostica='sim'). */
export async function salvarOportunidadeDiagnostica(formData: FormData): Promise<ActionResult> {
  const analiseId = textoOuNull(formData.get("analise_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!analiseId || !processoId) return { error: "Análise inválida — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: AnalisesViabilidadeUpdate = {
    oportunidade_diagnostica: (formData.get("oportunidade_diagnostica") as ViabilidadeOportunidadeDiagnostica | "") || null,
    oportunidade_momento: textoOuNull(formData.get("oportunidade_momento")),
    oportunidade_sinais: textoOuNull(formData.get("oportunidade_sinais")),
    oportunidade_exames: textoOuNull(formData.get("oportunidade_exames")),
    oportunidade_conduta_possivel: textoOuNull(formData.get("oportunidade_conduta_possivel")),
    oportunidade_conduta_realizada: textoOuNull(formData.get("oportunidade_conduta_realizada")),
    oportunidade_houve_atraso: (formData.get("oportunidade_houve_atraso") as ViabilidadeHouveAtraso | "") || null,
    oportunidade_duracao_estimada: textoOuNull(formData.get("oportunidade_duracao_estimada")),
    oportunidade_repercussao: textoOuNull(formData.get("oportunidade_repercussao")),
    oportunidade_evidencias: textoOuNull(formData.get("oportunidade_evidencias")),
    oportunidade_grau_seguranca: (formData.get("oportunidade_grau_seguranca") as ViabilidadeGrauSeguranca | "") || null,
  };

  const { error } = await supabase.from("analises_viabilidade").update(update).eq("id", analiseId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/**
 * Nexo causal (§16) — 1:1 por processo, bloco condicional ("o caso exige
 * análise de nexo?"). `garantirNexoCausal` cria a linha (aplicavel=false)
 * na primeira visita, mesmo padrão de `garantirAnaliseViabilidade`.
 */
export async function garantirNexoCausal(processoId: string): Promise<{ error: string } | { data: CasoNexoCausalRow }> {
  const supabase = await createClient();

  const { data: existente, error: erroSelect } = await supabase
    .from("caso_nexo_causal")
    .select("*")
    .eq("processo_id", processoId)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };
  if (existente) return { data: existente };

  const { data: criado, error: erroInsert } = await supabase
    .from("caso_nexo_causal")
    .insert({ processo_id: processoId })
    .select("*")
    .single();
  if (erroInsert) return { error: erroInsert.message };

  return { data: criado };
}

/** Conclusão do nexo (§16) NUNCA é calculada automaticamente — sempre escolha manual dela, só grava o que veio do formulário. */
export async function salvarNexoCausal(formData: FormData): Promise<ActionResult> {
  const nexoId = textoOuNull(formData.get("nexo_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!nexoId || !processoId) return { error: "Registro de nexo inválido — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: CasoNexoCausalUpdate = {
    aplicavel: formData.get("aplicavel") === "on",
    conduta_evento: textoOuNull(formData.get("conduta_evento")),
    dano: textoOuNull(formData.get("dano")),
    temporalidade: textoOuNull(formData.get("temporalidade")),
    topografia: textoOuNull(formData.get("topografia")),
    plausibilidade_biologica: textoOuNull(formData.get("plausibilidade_biologica")),
    compatibilidade_fisiopatologica: textoOuNull(formData.get("compatibilidade_fisiopatologica")),
    preexistencias: textoOuNull(formData.get("preexistencias")),
    concausas: textoOuNull(formData.get("concausas")),
    causas_alternativas_texto: textoOuNull(formData.get("causas_alternativas_texto")),
    intercorrencias_independentes: textoOuNull(formData.get("intercorrencias_independentes")),
    evidencias_favoraveis: textoOuNull(formData.get("evidencias_favoraveis")),
    evidencias_contrarias: textoOuNull(formData.get("evidencias_contrarias")),
    fundamentacao: textoOuNull(formData.get("fundamentacao")),
    conclusao: (formData.get("conclusao") as ViabilidadeConclusaoNexo | "") || null,
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_nexo_causal").update(update).eq("id", nexoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Dano (§17) — 1:1 por processo. Mesmo padrão garantir/salvar de caso_nexo_causal. */
export async function garantirDano(processoId: string): Promise<{ error: string } | { data: CasoDanoRow }> {
  const supabase = await createClient();

  const { data: existente, error: erroSelect } = await supabase
    .from("caso_dano")
    .select("*")
    .eq("processo_id", processoId)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };
  if (existente) return { data: existente };

  const { data: criado, error: erroInsert } = await supabase
    .from("caso_dano")
    .insert({ processo_id: processoId })
    .select("*")
    .single();
  if (erroInsert) return { error: erroInsert.message };

  return { data: criado };
}

/** §17: sempre separa existência do dano (`existe`) de atribuição causal — nunca um campo só misturando os dois. */
export async function salvarDano(formData: FormData): Promise<ActionResult> {
  const danoId = textoOuNull(formData.get("dano_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!danoId || !processoId) return { error: "Registro de dano inválido — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: CasoDanoUpdate = {
    existe: (formData.get("existe") as ViabilidadeDanoExiste | "") || null,
    natureza: textoOuNull(formData.get("natureza")),
    data_inicio: textoOuNull(formData.get("data_inicio")),
    situacao_atual: textoOuNull(formData.get("situacao_atual")),
    temporario_permanente: (formData.get("temporario_permanente") as ViabilidadeDanoTemporarioPermanente | "") || null,
    reversibilidade: textoOuNull(formData.get("reversibilidade")),
    repercussao_funcional: textoOuNull(formData.get("repercussao_funcional")),
    tratamentos: textoOuNull(formData.get("tratamentos")),
    necessidade_terceiros: textoOuNull(formData.get("necessidade_terceiros")),
    prognostico: textoOuNull(formData.get("prognostico")),
    documentacao: textoOuNull(formData.get("documentacao")),
    atribuicao_causal: textoOuNull(formData.get("atribuicao_causal")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_dano").update(update).eq("id", danoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Incapacidade (§18) — 1:1 por processo, exibida só quando pertinente. Mesmo padrão garantir/salvar. */
export async function garantirIncapacidade(processoId: string): Promise<{ error: string } | { data: CasoIncapacidadeRow }> {
  const supabase = await createClient();

  const { data: existente, error: erroSelect } = await supabase
    .from("caso_incapacidade")
    .select("*")
    .eq("processo_id", processoId)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };
  if (existente) return { data: existente };

  const { data: criado, error: erroInsert } = await supabase
    .from("caso_incapacidade")
    .insert({ processo_id: processoId })
    .select("*")
    .single();
  if (erroInsert) return { error: erroInsert.message };

  return { data: criado };
}

export async function salvarIncapacidade(formData: FormData): Promise<ActionResult> {
  const incapacidadeId = textoOuNull(formData.get("incapacidade_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!incapacidadeId || !processoId) return { error: "Registro de incapacidade inválido — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: CasoIncapacidadeUpdate = {
    pertinente: formData.get("pertinente") === "on",
    profissao: textoOuNull(formData.get("profissao")),
    atividade_habitual: textoOuNull(formData.get("atividade_habitual")),
    exigencias_funcionais: textoOuNull(formData.get("exigencias_funcionais")),
    limitacoes: textoOuNull(formData.get("limitacoes")),
    incapacidade_atual: textoOuNull(formData.get("incapacidade_atual")),
    parcial_total: (formData.get("parcial_total") as ViabilidadeParcialTotal | "") || null,
    temporaria_permanente: (formData.get("temporaria_permanente") as ViabilidadeIncapacidadeTemporariaPermanente | "") || null,
    reabilitacao: textoOuNull(formData.get("reabilitacao")),
    data_provavel_inicio: textoOuNull(formData.get("data_provavel_inicio")),
    prognostico: textoOuNull(formData.get("prognostico")),
    necessidade_avaliacao_complementar: textoOuNull(formData.get("necessidade_avaliacao_complementar")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_incapacidade").update(update).eq("id", incapacidadeId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Causas alternativas (§19) — CRUD repetível. */
export async function criarCausaAlternativa(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const hipotese = textoOuNull(formData.get("hipotese"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!hipotese) return { error: "Descreva a hipótese alternativa." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: CasoCausasAlternativasInsert = {
    processo_id: processoId,
    hipotese,
    elementos_favoraveis: textoOuNull(formData.get("elementos_favoraveis")),
    elementos_contrarios: textoOuNull(formData.get("elementos_contrarios")),
    documento_id: textoOuNull(formData.get("documento_id")),
    plausibilidade: (formData.get("plausibilidade") as ViabilidadePlausibilidade | "") || null,
    impacto_sobre_tese: textoOuNull(formData.get("impacto_sobre_tese")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_causas_alternativas").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarCausaAlternativa(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const hipotese = textoOuNull(formData.get("hipotese"));
  if (!id || !processoId) return { error: "Causa alternativa inválida — recarregue a página e tente de novo." };
  if (!hipotese) return { error: "Descreva a hipótese alternativa." };

  const supabase = await createClient();
  const update: CasoCausasAlternativasUpdate = {
    hipotese,
    elementos_favoraveis: textoOuNull(formData.get("elementos_favoraveis")),
    elementos_contrarios: textoOuNull(formData.get("elementos_contrarios")),
    documento_id: textoOuNull(formData.get("documento_id")),
    plausibilidade: (formData.get("plausibilidade") as ViabilidadePlausibilidade | "") || null,
    impacto_sobre_tese: textoOuNull(formData.get("impacto_sobre_tese")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_causas_alternativas").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirCausaAlternativa(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_causas_alternativas").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Pontos favoráveis (§20) — CRUD repetível. */
export async function criarPontoFavoravel(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const descricao = textoOuNull(formData.get("descricao"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!descricao) return { error: "Descreva o ponto favorável." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: CasoPontosFavoraveisInsert = {
    processo_id: processoId,
    descricao,
    documento_id: textoOuNull(formData.get("documento_id")),
    questao_tecnica_id: textoOuNull(formData.get("questao_tecnica_id")),
    importancia: textoOuNull(formData.get("importancia")),
    forca_probatoria: (formData.get("forca_probatoria") as ViabilidadeForcaProbatoria | "") || null,
    observacao: textoOuNull(formData.get("observacao")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_pontos_favoraveis").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarPontoFavoravel(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const descricao = textoOuNull(formData.get("descricao"));
  if (!id || !processoId) return { error: "Ponto favorável inválido — recarregue a página e tente de novo." };
  if (!descricao) return { error: "Descreva o ponto favorável." };

  const supabase = await createClient();
  const update: CasoPontosFavoraveisUpdate = {
    descricao,
    documento_id: textoOuNull(formData.get("documento_id")),
    questao_tecnica_id: textoOuNull(formData.get("questao_tecnica_id")),
    importancia: textoOuNull(formData.get("importancia")),
    forca_probatoria: (formData.get("forca_probatoria") as ViabilidadeForcaProbatoria | "") || null,
    observacao: textoOuNull(formData.get("observacao")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_pontos_favoraveis").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirPontoFavoravel(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_pontos_favoraveis").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Fragilidades (§21) — CRUD repetível. Vínculo opcional com oportunidade probatória gerada a partir dela fica só de leitura aqui (criado pela própria ação de "gerar oportunidade" da fatia — ainda não construída como automação de 1 clique, ela cadastra a oportunidade à parte por enquanto). */
export async function criarFragilidade(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const descricao = textoOuNull(formData.get("descricao"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!descricao) return { error: "Descreva a fragilidade." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: CasoFragilidadesInsert = {
    processo_id: processoId,
    descricao,
    motivo: textoOuNull(formData.get("motivo")),
    evidencia: textoOuNull(formData.get("evidencia")),
    impacto: (formData.get("impacto") as ViabilidadeImpactoFragilidade | "") || null,
    possibilidade_mitigacao: textoOuNull(formData.get("possibilidade_mitigacao")),
    prova_necessaria: textoOuNull(formData.get("prova_necessaria")),
    responsavel: textoOuNull(formData.get("responsavel")),
    prazo: textoOuNull(formData.get("prazo")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_fragilidades").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarFragilidade(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const descricao = textoOuNull(formData.get("descricao"));
  if (!id || !processoId) return { error: "Fragilidade inválida — recarregue a página e tente de novo." };
  if (!descricao) return { error: "Descreva a fragilidade." };

  const supabase = await createClient();
  const update: CasoFragilidadesUpdate = {
    descricao,
    motivo: textoOuNull(formData.get("motivo")),
    evidencia: textoOuNull(formData.get("evidencia")),
    impacto: (formData.get("impacto") as ViabilidadeImpactoFragilidade | "") || null,
    possibilidade_mitigacao: textoOuNull(formData.get("possibilidade_mitigacao")),
    prova_necessaria: textoOuNull(formData.get("prova_necessaria")),
    responsavel: textoOuNull(formData.get("responsavel")),
    prazo: textoOuNull(formData.get("prazo")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_fragilidades").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirFragilidade(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_fragilidades").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/**
 * Oportunidades probatórias (§22) — CRUD, ligado a processo_id. Vira fonte
 * nova do agregador da Central de Prazos (mesmo princípio de Documentos
 * faltantes, fatia 2): SEMPRE aparece enquanto não resolvida, nunca
 * gatilhada por responsável+prazo preenchidos.
 */
export async function criarOportunidadeProbatoria(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const providencia = textoOuNull(formData.get("providencia"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!providencia) return { error: "Descreva a providência." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: CasoOportunidadesProbatoriasInsert = {
    processo_id: processoId,
    providencia,
    tipo_prova: (formData.get("tipo_prova") as ViabilidadeTipoProva | "") || null,
    objetivo: textoOuNull(formData.get("objetivo")),
    responsavel: textoOuNull(formData.get("responsavel")),
    prazo: textoOuNull(formData.get("prazo")),
    prioridade: textoOuNull(formData.get("prioridade")),
    status: textoOuNull(formData.get("status")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_oportunidades_probatorias").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  revalidatePath("/hoje");
  revalidatePath("/agenda");
  return { success: true };
}

export async function atualizarOportunidadeProbatoria(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const providencia = textoOuNull(formData.get("providencia"));
  if (!id || !processoId) return { error: "Oportunidade probatória inválida — recarregue a página e tente de novo." };
  if (!providencia) return { error: "Descreva a providência." };

  const supabase = await createClient();
  const update: CasoOportunidadesProbatoriasUpdate = {
    providencia,
    tipo_prova: (formData.get("tipo_prova") as ViabilidadeTipoProva | "") || null,
    objetivo: textoOuNull(formData.get("objetivo")),
    responsavel: textoOuNull(formData.get("responsavel")),
    prazo: textoOuNull(formData.get("prazo")),
    prioridade: textoOuNull(formData.get("prioridade")),
    status: textoOuNull(formData.get("status")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_oportunidades_probatorias").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  revalidatePath("/hoje");
  revalidatePath("/agenda");
  return { success: true };
}

/** Marca como resolvida — some da Central de Prazos (fonte lê `resolvido_em is null`), fica no histórico do caso. */
export async function resolverOportunidadeProbatoria(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("caso_oportunidades_probatorias")
    .update({ resolvido_em: new Date().toISOString(), atualizado_por_modulo: "viabilidade" })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  revalidatePath("/hoje");
  revalidatePath("/agenda");
  return { success: true };
}

export async function excluirOportunidadeProbatoria(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_oportunidades_probatorias").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  revalidatePath("/hoje");
  revalidatePath("/agenda");
  return { success: true };
}

/** Risco pericial (§23) — hub, INTERNO. Nunca aparece no PDF (garantido pela assinatura da função geradora, fatia 8 — não por esta ação). */
export async function salvarRiscoPericial(formData: FormData): Promise<ActionResult> {
  const analiseId = textoOuNull(formData.get("analise_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!analiseId || !processoId) return { error: "Análise inválida — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: AnalisesViabilidadeUpdate = {
    risco_principal_tecnico: textoOuNull(formData.get("risco_principal_tecnico")),
    risco_fato_desfavoravel: textoOuNull(formData.get("risco_fato_desfavoravel")),
    risco_documento_prejudicial: textoOuNull(formData.get("risco_documento_prejudicial")),
    risco_pergunta_dificil: textoOuNull(formData.get("risco_pergunta_dificil")),
    risco_grau: (formData.get("risco_grau") as ViabilidadeRiscoGrau | "") || null,
    risco_fundamentacao: textoOuNull(formData.get("risco_fundamentacao")),
  };

  const { error } = await supabase.from("analises_viabilidade").update(update).eq("id", analiseId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Possível tese adversa (§24) — CRUD repetível, INTEIRAMENTE INTERNA (a função geradora do PDF, fatia 8, nunca aceita esta tabela como entrada). */
export async function criarTeseAdversa(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const argumentoPrevisivel = textoOuNull(formData.get("argumento_previsivel"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!argumentoPrevisivel) return { error: "Descreva o argumento previsível." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: CasoTeseAdversaInsert = {
    processo_id: processoId,
    argumento_previsivel: argumentoPrevisivel,
    fundamento_possivel: textoOuNull(formData.get("fundamento_possivel")),
    documento_id: textoOuNull(formData.get("documento_id")),
    resposta_tecnica_possivel: textoOuNull(formData.get("resposta_tecnica_possivel")),
    prova_necessaria: textoOuNull(formData.get("prova_necessaria")),
    forca_estimada: textoOuNull(formData.get("forca_estimada")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_tese_adversa").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarTeseAdversa(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const argumentoPrevisivel = textoOuNull(formData.get("argumento_previsivel"));
  if (!id || !processoId) return { error: "Tese adversa inválida — recarregue a página e tente de novo." };
  if (!argumentoPrevisivel) return { error: "Descreva o argumento previsível." };

  const supabase = await createClient();
  const update: CasoTeseAdversaUpdate = {
    argumento_previsivel: argumentoPrevisivel,
    fundamento_possivel: textoOuNull(formData.get("fundamento_possivel")),
    documento_id: textoOuNull(formData.get("documento_id")),
    resposta_tecnica_possivel: textoOuNull(formData.get("resposta_tecnica_possivel")),
    prova_necessaria: textoOuNull(formData.get("prova_necessaria")),
    forca_estimada: textoOuNull(formData.get("forca_estimada")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_tese_adversa").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirTeseAdversa(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_tese_adversa").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Provável raciocínio pericial (§25) — hub, INTERNO. Nunca aparece no PDF externo (salvo reformulado/validado — fatia 8 decide). */
export async function salvarRaciocinioPericial(formData: FormData): Promise<ActionResult> {
  const analiseId = textoOuNull(formData.get("analise_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!analiseId || !processoId) return { error: "Análise inválida — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: AnalisesViabilidadeUpdate = {
    raciocinio_pericial_interno: textoOuNull(formData.get("raciocinio_pericial_interno")),
  };

  const { error } = await supabase.from("analises_viabilidade").update(update).eq("id", analiseId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Necessidade de especialista (§26) — gatilho no hub; o detalhe (repetível) só existe quando "Recomendável"/"Necessário". */
export async function salvarNecessidadeEspecialista(formData: FormData): Promise<ActionResult> {
  const analiseId = textoOuNull(formData.get("analise_id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!analiseId || !processoId) return { error: "Análise inválida — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: AnalisesViabilidadeUpdate = {
    necessidade_especialista: (formData.get("necessidade_especialista") as ViabilidadeNecessidadeEspecialista | "") || null,
  };

  const { error } = await supabase.from("analises_viabilidade").update(update).eq("id", analiseId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Detalhe repetível de necessidade de especialista (§26) — CRUD. Sem ação "resolver" ainda: tabela não tem `resolvido_em` (gap registrado na memória, migration pendente de aplicação). */
export async function criarNecessidadeEspecialista(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: CasoNecessidadeEspecialistaInsert = {
    processo_id: processoId,
    nome_especialista: textoOuNull(formData.get("nome_especialista")),
    especialidade: textoOuNull(formData.get("especialidade")),
    finalidade: textoOuNull(formData.get("finalidade")),
    questao_tecnica_id: textoOuNull(formData.get("questao_tecnica_id")),
    prioridade: textoOuNull(formData.get("prioridade")),
    prazo: textoOuNull(formData.get("prazo")),
    status: textoOuNull(formData.get("status")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_necessidade_especialista").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarNecessidadeEspecialista(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!id || !processoId) return { error: "Registro inválido — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: CasoNecessidadeEspecialistaUpdate = {
    nome_especialista: textoOuNull(formData.get("nome_especialista")),
    especialidade: textoOuNull(formData.get("especialidade")),
    finalidade: textoOuNull(formData.get("finalidade")),
    questao_tecnica_id: textoOuNull(formData.get("questao_tecnica_id")),
    prioridade: textoOuNull(formData.get("prioridade")),
    prazo: textoOuNull(formData.get("prazo")),
    status: textoOuNull(formData.get("status")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_necessidade_especialista").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirNecessidadeEspecialista(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_necessidade_especialista").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

/** Literatura e referências (§27) — CRUD repetível, opcionalmente ligado a um item já catalogado na Biblioteca Pericial. */
export async function criarLiteraturaUtilizada(formData: FormData): Promise<ActionResult> {
  const processoId = textoOuNull(formData.get("processo_id"));
  const titulo = textoOuNull(formData.get("titulo"));
  if (!processoId) return { error: "Processo inválido — recarregue a página e tente de novo." };
  if (!titulo) return { error: "Informe o título." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const anoTexto = textoOuNull(formData.get("ano"));
  const insert: CasoLiteraturaUtilizadaInsert = {
    processo_id: processoId,
    titulo,
    biblioteca_pericial_id: textoOuNull(formData.get("biblioteca_pericial_id")),
    autor_entidade: textoOuNull(formData.get("autor_entidade")),
    tipo: (formData.get("tipo") as ViabilidadeTipoLiteratura | "") || null,
    ano: anoTexto ? Number(anoTexto) : null,
    identificador_link: textoOuNull(formData.get("identificador_link")),
    tema: textoOuNull(formData.get("tema")),
    conceito_relevante: textoOuNull(formData.get("conceito_relevante")),
    ponto_analise_utilizado: textoOuNull(formData.get("ponto_analise_utilizado")),
    arquivo_documento_id: textoOuNull(formData.get("arquivo_documento_id")),
    criado_por: user?.id ?? null,
  };

  const { error } = await supabase.from("caso_literatura_utilizada").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function atualizarLiteraturaUtilizada(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const titulo = textoOuNull(formData.get("titulo"));
  if (!id || !processoId) return { error: "Literatura inválida — recarregue a página e tente de novo." };
  if (!titulo) return { error: "Informe o título." };

  const supabase = await createClient();
  const anoTexto = textoOuNull(formData.get("ano"));
  const update: CasoLiteraturaUtilizadaUpdate = {
    titulo,
    biblioteca_pericial_id: textoOuNull(formData.get("biblioteca_pericial_id")),
    autor_entidade: textoOuNull(formData.get("autor_entidade")),
    tipo: (formData.get("tipo") as ViabilidadeTipoLiteratura | "") || null,
    ano: anoTexto ? Number(anoTexto) : null,
    identificador_link: textoOuNull(formData.get("identificador_link")),
    tema: textoOuNull(formData.get("tema")),
    conceito_relevante: textoOuNull(formData.get("conceito_relevante")),
    ponto_analise_utilizado: textoOuNull(formData.get("ponto_analise_utilizado")),
    arquivo_documento_id: textoOuNull(formData.get("arquivo_documento_id")),
    atualizado_por_modulo: "viabilidade",
  };

  const { error } = await supabase.from("caso_literatura_utilizada").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}

export async function excluirLiteraturaUtilizada(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("caso_literatura_utilizada").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/viabilidade`);
  return { success: true };
}
