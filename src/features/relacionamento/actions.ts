"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  RelacionamentosInsert,
  RelacionamentosUpdate,
  RelacionamentoAdvogadosInsert,
  RelacionamentoAdvogadosUpdate,
  RelacionamentoInteracoesInsert,
  RelacionamentoPremiacoesInsert,
  RelacionamentoPremiacoesUpdate,
  RelacionamentoEncaminhamentosInsert,
  RelacionamentoEncaminhamentosUpdate,
  RelacionamentoCreditosIndicacaoInsert,
} from "@/types/database";
import type {
  RelacionamentoTipo,
  RelacionamentoOrigem,
  RelacionamentoCanal,
  MeuPeritoStatus,
  MeuPeritoPotencial,
  ClienteSaudeTipoDemanda,
  ClienteSaudeNecessidade,
  ClienteSaudeStatus,
  ProfissionalProfissao,
  ProfissionalNecessidade,
  PremiacaoStatus,
  EncaminhamentoStatus,
  EncaminhamentoContratacaoRealizada,
  CreditoIndicacaoTipo,
  ClienteSaudeSituacaoAtual,
  ResultadoInteracao,
} from "@/types/enums";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}
function numeroOuNull(valor: FormDataEntryValue | null): number | null {
  const texto = (valor as string | null)?.trim();
  if (!texto) return null;
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function enumOuNull<T extends string>(valor: FormDataEntryValue | null, permitidos: readonly T[]): T | null {
  const texto = (valor as string | null)?.trim();
  return texto && (permitidos as readonly string[]).includes(texto) ? (texto as T) : null;
}

const ORIGENS: readonly RelacionamentoOrigem[] = [
  "indicacao", "redes_sociais", "comercial_pericons", "evento_palestra_curso",
  "meu_perito", "site_busca", "cliente_antigo_retorno", "parceria_institucional", "acolher", "outro",
];
const CANAIS: readonly RelacionamentoCanal[] = ["whatsapp", "telefone", "email", "reuniao", "presencial", "outro"];
const MEU_PERITO_STATUS: readonly MeuPeritoStatus[] = ["nao_abordado", "abordado", "em_avaliacao", "assinante", "inativo"];
const MEU_PERITO_POTENCIAL: readonly MeuPeritoPotencial[] = ["baixo", "medio", "alto"];
const CS_TIPO_DEMANDA: readonly ClienteSaudeTipoDemanda[] = [
  "medicamento", "cirurgia", "plano_saude", "home_care", "internacao_leito",
  "erro_medico", "tratamento", "beneficio_direito_doenca", "indenizacao", "outra",
];
const CS_NECESSIDADE: readonly ClienteSaudeNecessidade[] = ["juridica", "medico_pericial", "extrajudicial", "ambas", "em_avaliacao"];
const CS_STATUS: readonly ClienteSaudeStatus[] = ["entrada", "triagem", "qualificada", "direcionada", "em_acompanhamento", "encerrada"];
const PROF_PROFISSAO: readonly ProfissionalProfissao[] = ["medico", "dentista", "psicologo", "outro"];
const PROF_NECESSIDADE: readonly ProfissionalNecessidade[] = [
  "juridica", "etico_profissional", "consultoria", "pericial", "gestao_regularizacao", "formacao", "outro",
];
const PREMIACAO_STATUS: readonly PremiacaoStatus[] = ["a_enviar", "enviado", "entregue"];
const ENCAMINHAMENTO_STATUS: readonly EncaminhamentoStatus[] = ["encaminhado", "aceito", "recusado", "em_contato", "encerrado"];
const ENCAMINHAMENTO_CONTRATACAO: readonly EncaminhamentoContratacaoRealizada[] = ["sim", "nao", "nao_informado"];
const CREDITO_TIPOS: readonly CreditoIndicacaoTipo[] = ["gerado", "utilizado"];
const CS_SITUACAO_ATUAL: readonly ClienteSaudeSituacaoAtual[] = [
  "em_tratamento", "em_acompanhamento", "tratamento_concluido", "condicao_controlada", "situacao_desconhecida", "falecido",
];
const RESULTADOS_INTERACAO: readonly ResultadoInteracao[] = ["enviado", "respondido", "contato_realizado", "nao_realizado"];

/** Campos comuns aos 3 tipos + os condicionais do tipo escolhido — só grava o que é do tipo. */
function camposPorTipo(formData: FormData, tipo: RelacionamentoTipo) {
  const base = {
    data_nascimento: textoOuNull(formData.get("data_nascimento")),
    meu_perito: formData.get("meu_perito") === "on",
    meu_perito_status: enumOuNull(formData.get("meu_perito_status"), MEU_PERITO_STATUS),
    meu_perito_potencial: enumOuNull(formData.get("meu_perito_potencial"), MEU_PERITO_POTENCIAL),
    meu_perito_observacao: textoOuNull(formData.get("meu_perito_observacao")),
    cs_tipo_demanda: null as ClienteSaudeTipoDemanda | null,
    cs_necessidade: null as ClienteSaudeNecessidade | null,
    cs_status: null as ClienteSaudeStatus | null,
    cs_condicao_principal: null as string | null,
    cs_area_clinica: null as string | null,
    cs_situacao_atual: null as ClienteSaudeSituacaoAtual | null,
    cs_situacao_atualizada_em: null as string | null,
    cs_data_falecimento: null as string | null,
    cs_data_conhecimento: null as string | null,
    cs_familiar_responsavel_id: null as string | null,
    prof_profissao: null as ProfissionalProfissao | null,
    prof_profissao_outra: null as string | null,
    prof_conselho_registro: null as string | null,
    prof_especialidade: null as string | null,
    prof_cidade: null as string | null,
    prof_uf: null as string | null,
    prof_necessidade: null as ProfissionalNecessidade | null,
    prof_produto_futuro_potencial: null as MeuPeritoPotencial | null,
    prof_produto_futuro_observacao: null as string | null,
  };
  if (tipo === "cliente_saude") {
    return {
      ...base,
      cs_tipo_demanda: enumOuNull(formData.get("cs_tipo_demanda"), CS_TIPO_DEMANDA),
      cs_necessidade: enumOuNull(formData.get("cs_necessidade"), CS_NECESSIDADE),
      cs_status: enumOuNull(formData.get("cs_status"), CS_STATUS) ?? "entrada",
      cs_condicao_principal: textoOuNull(formData.get("cs_condicao_principal")),
      cs_area_clinica: textoOuNull(formData.get("cs_area_clinica")),
      cs_situacao_atual: enumOuNull(formData.get("cs_situacao_atual"), CS_SITUACAO_ATUAL),
      cs_situacao_atualizada_em: textoOuNull(formData.get("cs_situacao_atualizada_em")),
      cs_data_falecimento: textoOuNull(formData.get("cs_data_falecimento")),
      cs_data_conhecimento: textoOuNull(formData.get("cs_data_conhecimento")),
      cs_familiar_responsavel_id: textoOuNull(formData.get("cs_familiar_responsavel_id")),
    };
  }
  if (tipo === "profissional") {
    return {
      ...base,
      prof_profissao: enumOuNull(formData.get("prof_profissao"), PROF_PROFISSAO),
      prof_profissao_outra: textoOuNull(formData.get("prof_profissao_outra")),
      prof_conselho_registro: textoOuNull(formData.get("prof_conselho_registro")),
      prof_especialidade: textoOuNull(formData.get("prof_especialidade")),
      prof_cidade: textoOuNull(formData.get("prof_cidade")),
      prof_uf: textoOuNull(formData.get("prof_uf")),
      prof_necessidade: enumOuNull(formData.get("prof_necessidade"), PROF_NECESSIDADE),
      prof_produto_futuro_potencial: enumOuNull(formData.get("prof_produto_futuro_potencial"), MEU_PERITO_POTENCIAL),
      prof_produto_futuro_observacao: textoOuNull(formData.get("prof_produto_futuro_observacao")),
    };
  }
  return base;
}

export async function criarRelacionamento(formData: FormData): Promise<ActionResult> {
  const tipo = enumOuNull(formData.get("tipo"), ["advogado_escritorio", "cliente_saude", "profissional"] as const);
  const nome = textoOuNull(formData.get("nome"));
  const origem = enumOuNull(formData.get("origem"), ORIGENS);
  if (!tipo || !nome) return { error: "Tipo e nome são obrigatórios." };
  if (!origem) return { error: "Origem é obrigatória." };
  const indicadoPorId = textoOuNull(formData.get("indicado_por_id"));
  if (origem === "indicacao" && !indicadoPorId) {
    return { error: "Origem \"Indicação\" exige selecionar quem indicou." };
  }

  const supabase = await createClient();
  const payload: RelacionamentosInsert = {
    tipo,
    nome,
    observacoes: textoOuNull(formData.get("observacoes")),
    origem,
    indicado_por_id: origem === "indicacao" ? indicadoPorId : null,
    ...camposPorTipo(formData, tipo),
  };
  const { data, error } = await supabase.from("relacionamentos").insert(payload).select("id").single();
  if (error) return { error: error.message };

  revalidatePath("/relacionamento");
  redirect(`/relacionamento/${data.id}`);
}

export async function atualizarRelacionamento(id: string, formData: FormData): Promise<ActionResult> {
  const tipo = enumOuNull(formData.get("tipo"), ["advogado_escritorio", "cliente_saude", "profissional"] as const);
  const nome = textoOuNull(formData.get("nome"));
  const origem = enumOuNull(formData.get("origem"), ORIGENS);
  if (!id || !tipo || !nome) return { error: "Documento inválido — recarregue a página e tente de novo." };
  if (!origem) return { error: "Origem é obrigatória." };
  const indicadoPorId = textoOuNull(formData.get("indicado_por_id"));
  if (origem === "indicacao" && !indicadoPorId) {
    return { error: "Origem \"Indicação\" exige selecionar quem indicou." };
  }

  const supabase = await createClient();
  const payload: RelacionamentosUpdate = {
    tipo,
    nome,
    observacoes: textoOuNull(formData.get("observacoes")),
    origem,
    indicado_por_id: origem === "indicacao" ? indicadoPorId : null,
    ...camposPorTipo(formData, tipo),
  };
  const { error } = await supabase.from("relacionamentos").update(payload).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/relacionamento");
  revalidatePath(`/relacionamento/${id}`);
  redirect(`/relacionamento/${id}`);
}

/** Excluir — sem checagem prévia de "uso": se for indicador de alguém (FK sem ON DELETE) o próprio Postgres bloqueia, e a mensagem é traduzida abaixo. Processos vinculados apenas desvinculam (ON DELETE SET NULL). */
export async function excluirRelacionamento(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("relacionamentos").delete().eq("id", id);
  if (error) {
    if (error.message.includes("violates foreign key constraint") && error.message.includes("indicado_por_id")) {
      return { error: "Esse cadastro é o indicador de outro registro — remova essa indicação antes de excluir." };
    }
    return { error: error.message };
  }
  revalidatePath("/relacionamento");
  redirect("/relacionamento");
}

/** Próxima ação — mesmo padrão de campo único usado em outros hubs do sistema. */
export async function salvarProximaAcao(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("relacionamentos")
    .update({
      proxima_acao_texto: textoOuNull(formData.get("proxima_acao_texto")),
      proxima_acao_motivo: textoOuNull(formData.get("proxima_acao_motivo")),
      proxima_acao_data: textoOuNull(formData.get("proxima_acao_data")),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/relacionamento/${id}`);
  return { success: true };
}

/**
 * Registrar contato — toda interação atualiza "último contato" e a faixa
 * automaticamente (é sempre MAX(data) desta tabela, calculado em ranking.ts).
 * Também atualiza `ultimo_canal` no cadastro (só um resumo visual — a fonte
 * de verdade continua sendo o histórico completo).
 */
export async function registrarInteracao(relacionamentoId: string, formData: FormData): Promise<ActionResult> {
  const data = textoOuNull(formData.get("data"));
  const canal = enumOuNull(formData.get("canal"), CANAIS);
  if (!data || !canal) return { error: "Data e canal são obrigatórios." };

  const supabase = await createClient();
  const payload: RelacionamentoInteracoesInsert = {
    relacionamento_id: relacionamentoId,
    data,
    canal,
    observacao: textoOuNull(formData.get("observacao")),
    campanha: textoOuNull(formData.get("campanha")),
    responsavel: textoOuNull(formData.get("responsavel")),
    resultado: enumOuNull(formData.get("resultado"), RESULTADOS_INTERACAO),
  };
  const { error: erroInteracao } = await supabase.from("relacionamento_interacoes").insert(payload);
  if (erroInteracao) return { error: erroInteracao.message };

  await supabase.from("relacionamentos").update({ ultimo_canal: canal }).eq("id", relacionamentoId);

  revalidatePath(`/relacionamento/${relacionamentoId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Advogados vinculados (só tipo = advogado_escritorio)
// ---------------------------------------------------------------------------
export async function criarAdvogado(relacionamentoId: string, formData: FormData): Promise<ActionResult> {
  const nome = textoOuNull(formData.get("nome"));
  if (!nome) return { error: "Nome é obrigatório." };
  const supabase = await createClient();
  const payload: RelacionamentoAdvogadosInsert = {
    relacionamento_id: relacionamentoId,
    nome,
    oab: textoOuNull(formData.get("oab")),
    email: textoOuNull(formData.get("email")),
    telefone: textoOuNull(formData.get("telefone")),
    data_nascimento: textoOuNull(formData.get("data_nascimento")),
  };
  const { error } = await supabase.from("relacionamento_advogados").insert(payload);
  if (error) return { error: error.message };
  revalidatePath(`/relacionamento/${relacionamentoId}`);
  return { success: true };
}

export async function salvarAdvogado(id: string, relacionamentoId: string, formData: FormData): Promise<ActionResult> {
  const nome = textoOuNull(formData.get("nome"));
  if (!nome) return { error: "Nome é obrigatório." };
  const supabase = await createClient();
  const payload: RelacionamentoAdvogadosUpdate = {
    nome,
    oab: textoOuNull(formData.get("oab")),
    email: textoOuNull(formData.get("email")),
    telefone: textoOuNull(formData.get("telefone")),
    data_nascimento: textoOuNull(formData.get("data_nascimento")),
  };
  const { error } = await supabase.from("relacionamento_advogados").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/relacionamento/${relacionamentoId}`);
  return { success: true };
}

export async function excluirAdvogado(id: string, relacionamentoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("relacionamento_advogados").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/relacionamento/${relacionamentoId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Premiações
// ---------------------------------------------------------------------------
export async function criarPremiacao(relacionamentoId: string, formData: FormData): Promise<ActionResult> {
  const premiacao = textoOuNull(formData.get("premiacao"));
  if (!premiacao) return { error: "Descrição da premiação é obrigatória." };
  const supabase = await createClient();
  const payload: RelacionamentoPremiacoesInsert = {
    relacionamento_id: relacionamentoId,
    campanha: textoOuNull(formData.get("campanha")),
    premiacao,
    status: enumOuNull(formData.get("status"), PREMIACAO_STATUS) ?? "a_enviar",
    data_prevista: textoOuNull(formData.get("data_prevista")),
    data_enviada: textoOuNull(formData.get("data_enviada")),
    observacao: textoOuNull(formData.get("observacao")),
  };
  const { error } = await supabase.from("relacionamento_premiacoes").insert(payload);
  if (error) return { error: error.message };
  revalidatePath(`/relacionamento/${relacionamentoId}`);
  return { success: true };
}

export async function salvarPremiacao(id: string, relacionamentoId: string, formData: FormData): Promise<ActionResult> {
  const premiacao = textoOuNull(formData.get("premiacao"));
  if (!premiacao) return { error: "Descrição da premiação é obrigatória." };
  const supabase = await createClient();
  const payload: RelacionamentoPremiacoesUpdate = {
    campanha: textoOuNull(formData.get("campanha")),
    premiacao,
    status: enumOuNull(formData.get("status"), PREMIACAO_STATUS) ?? "a_enviar",
    data_prevista: textoOuNull(formData.get("data_prevista")),
    data_enviada: textoOuNull(formData.get("data_enviada")),
    observacao: textoOuNull(formData.get("observacao")),
  };
  const { error } = await supabase.from("relacionamento_premiacoes").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/relacionamento/${relacionamentoId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Extrato de créditos de indicação
// ---------------------------------------------------------------------------
export async function registrarCredito(indicadorId: string, formData: FormData): Promise<ActionResult> {
  const tipo = enumOuNull(formData.get("tipo"), CREDITO_TIPOS);
  const valor = numeroOuNull(formData.get("valor"));
  const data = textoOuNull(formData.get("data"));
  if (!tipo || valor == null || !data) return { error: "Tipo, valor e data são obrigatórios." };
  const supabase = await createClient();
  const payload: RelacionamentoCreditosIndicacaoInsert = {
    indicador_id: indicadorId,
    tipo,
    valor,
    data,
    servico_relacionado: textoOuNull(formData.get("servico_relacionado")),
    processo_id: textoOuNull(formData.get("processo_id")),
    observacao: textoOuNull(formData.get("observacao")),
  };
  const { error } = await supabase.from("relacionamento_creditos_indicacao").insert(payload);
  if (error) return { error: error.message };
  revalidatePath(`/relacionamento/${indicadorId}`);
  return { success: true };
}

export async function salvarValorCreditoPadrao(formData: FormData): Promise<ActionResult> {
  const valor = numeroOuNull(formData.get("valor_credito_indicacao_padrao"));
  if (valor == null) return { error: "Informe um valor." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("relacionamento_configuracoes")
    .update({ valor_credito_indicacao_padrao: valor })
    .eq("id", true);
  if (error) return { error: error.message };
  revalidatePath("/relacionamento");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Conexões / encaminhamentos (Rede Parceira)
// ---------------------------------------------------------------------------
export async function criarEncaminhamento(origemId: string, formData: FormData): Promise<ActionResult> {
  const data = textoOuNull(formData.get("data"));
  if (!data) return { error: "Data é obrigatória." };
  const destinoId = textoOuNull(formData.get("destino_id"));
  const destinoDescricao = textoOuNull(formData.get("destino_descricao"));
  if (!destinoId && !destinoDescricao) return { error: "Informe o escritório de destino ou uma descrição." };
  const supabase = await createClient();
  const payload: RelacionamentoEncaminhamentosInsert = {
    origem_id: origemId,
    destino_id: destinoId,
    destino_descricao: destinoDescricao,
    demanda: textoOuNull(formData.get("demanda")),
    data,
    status: enumOuNull(formData.get("status"), ENCAMINHAMENTO_STATUS) ?? "encaminhado",
    contratacao_realizada: enumOuNull(formData.get("contratacao_realizada"), ENCAMINHAMENTO_CONTRATACAO) ?? "nao_informado",
    retorno_cliente: textoOuNull(formData.get("retorno_cliente")),
    retorno_escritorio: textoOuNull(formData.get("retorno_escritorio")),
  };
  const { error } = await supabase.from("relacionamento_encaminhamentos").insert(payload);
  if (error) return { error: error.message };
  revalidatePath(`/relacionamento/${origemId}`);
  return { success: true };
}

export async function salvarEncaminhamento(id: string, origemId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const payload: RelacionamentoEncaminhamentosUpdate = {
    status: enumOuNull(formData.get("status"), ENCAMINHAMENTO_STATUS) ?? "encaminhado",
    contratacao_realizada: enumOuNull(formData.get("contratacao_realizada"), ENCAMINHAMENTO_CONTRATACAO) ?? "nao_informado",
    retorno_cliente: textoOuNull(formData.get("retorno_cliente")),
    retorno_escritorio: textoOuNull(formData.get("retorno_escritorio")),
  };
  const { error } = await supabase.from("relacionamento_encaminhamentos").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/relacionamento/${origemId}`);
  return { success: true };
}
