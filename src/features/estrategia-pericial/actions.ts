"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  EstrategiasPericiaisRow,
  EstrategiasPericiaisUpdate,
  EstrategiaEixosTeseInsert,
  EstrategiaEixosTeseUpdate,
  EstrategiaPontosInvestigacaoInsert,
  EstrategiaPontosInvestigacaoUpdate,
  EstrategiaFragilidadesInsert,
  EstrategiaFragilidadesUpdate,
  EstrategiaTesesAdversasInsert,
  EstrategiaTesesAdversasUpdate,
  EstrategiaDocumentosProvasInsert,
  EstrategiaDocumentosProvasUpdate,
} from "@/types/database";
import type {
  EstrategiaProximaAcao,
  PrioridadeTarefa,
  EstrategiaFragilidadeClassificacao,
  EstrategiaTeseAdversaDestino,
  EstrategiaDocumentoPrioridade,
  EstrategiaDocumentoAcao,
} from "@/types/enums";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}
function linhasOuVazio(valor: FormDataEntryValue | null): string[] {
  const texto = (valor as string | null) ?? "";
  return texto.split("\n").map((l) => l.trim()).filter(Boolean);
}

/** Select-ou-cria — mesmo padrão de garantirAtestado. */
export async function garantirEstrategiaPericial(
  processoId: string,
): Promise<{ error: string } | { data: EstrategiasPericiaisRow }> {
  const supabase = await createClient();

  const { data: existente, error: erroSelect } = await supabase
    .from("estrategias_periciais")
    .select("*")
    .eq("processo_id", processoId)
    .maybeSingle();
  if (erroSelect) return { error: erroSelect.message };
  if (existente) return { data: existente };

  const { data: criado, error: erroInsert } = await supabase
    .from("estrategias_periciais")
    .insert({ processo_id: processoId })
    .select("*")
    .single();
  if (erroInsert) return { error: erroInsert.message };

  return { data: criado };
}

export async function salvarEstrategiaPericial(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  if (!id || !processoId) return { error: "Documento inválido — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const update: EstrategiasPericiaisUpdate = {
    resumo_tecnico_caso: textoOuNull(formData.get("resumo_tecnico_caso")),
    questao_central: textoOuNull(formData.get("questao_central")),
    questoes_secundarias: linhasOuVazio(formData.get("questoes_secundarias")),
    tese_principal: textoOuNull(formData.get("tese_principal")),
    cadeia_estado_anterior: textoOuNull(formData.get("cadeia_estado_anterior")),
    cadeia_evento: textoOuNull(formData.get("cadeia_evento")),
    cadeia_alteracao: textoOuNull(formData.get("cadeia_alteracao")),
    cadeia_persistencia: textoOuNull(formData.get("cadeia_persistencia")),
    cadeia_exame_diagnostico: textoOuNull(formData.get("cadeia_exame_diagnostico")),
    cadeia_dano_repercussao: textoOuNull(formData.get("cadeia_dano_repercussao")),
    pontos_pericia: linhasOuVazio(formData.get("pontos_pericia")),
    conclusao_direcao_estrategica: textoOuNull(formData.get("conclusao_direcao_estrategica")),
    proxima_acao: (formData.get("proxima_acao") as EstrategiaProximaAcao | "") || null,
    proxima_acao_outra: textoOuNull(formData.get("proxima_acao_outra")),
    responsavel: textoOuNull(formData.get("responsavel")),
    prazo: textoOuNull(formData.get("prazo")),
    prioridade: (formData.get("prioridade") as PrioridadeTarefa) || "normal",
    local_emissao: textoOuNull(formData.get("local_emissao")),
    data_emissao: textoOuNull(formData.get("data_emissao")),
  };

  const { error } = await supabase.from("estrategias_periciais").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/estrategia-pericial`);
  return { success: true };
}

const REVALIDAR = (processoId: string) => revalidatePath(`/processos/${processoId}/estrategia-pericial`);

// ---- Eixos da tese (§4) -----------------------------------------------------
export async function criarEixoTese(estrategiaId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: ultimo, error: erroUltimo } = await supabase
    .from("estrategia_eixos_tese")
    .select("ordem")
    .eq("estrategia_id", estrategiaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };
  const insert: EstrategiaEixosTeseInsert = { estrategia_id: estrategiaId, ordem: (ultimo?.ordem ?? 0) + 1, titulo: "Novo eixo — edite abaixo" };
  const { error } = await supabase.from("estrategia_eixos_tese").insert(insert);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}
export async function salvarEixoTese(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const titulo = textoOuNull(formData.get("titulo"));
  if (!id || !processoId) return { error: "Registro inválido." };
  if (!titulo) return { error: "O título do eixo não pode ficar vazio." };
  const supabase = await createClient();
  const update: EstrategiaEixosTeseUpdate = {
    titulo,
    tese_especifica: textoOuNull(formData.get("tese_especifica")),
    base_atual: textoOuNull(formData.get("base_atual")),
  };
  const { error } = await supabase.from("estrategia_eixos_tese").update(update).eq("id", id);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}
export async function excluirEixoTese(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("estrategia_eixos_tese").delete().eq("id", id);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}

// ---- Pontos técnicos de investigação (§7) ----------------------------------
export async function criarPontoInvestigacao(estrategiaId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: ultimo, error: erroUltimo } = await supabase
    .from("estrategia_pontos_investigacao")
    .select("ordem")
    .eq("estrategia_id", estrategiaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };
  const insert: EstrategiaPontosInvestigacaoInsert = { estrategia_id: estrategiaId, ordem: (ultimo?.ordem ?? 0) + 1, ponto: "Novo ponto — edite abaixo" };
  const { error } = await supabase.from("estrategia_pontos_investigacao").insert(insert);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}
export async function salvarPontoInvestigacao(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const ponto = textoOuNull(formData.get("ponto"));
  if (!id || !processoId) return { error: "Registro inválido." };
  if (!ponto) return { error: "O ponto não pode ficar vazio." };
  const supabase = await createClient();
  const update: EstrategiaPontosInvestigacaoUpdate = {
    ponto,
    o_que_sabemos: textoOuNull(formData.get("o_que_sabemos")),
    o_que_demonstrar: textoOuNull(formData.get("o_que_demonstrar")),
    como_provar: textoOuNull(formData.get("como_provar")),
  };
  const { error } = await supabase.from("estrategia_pontos_investigacao").update(update).eq("id", id);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}
export async function excluirPontoInvestigacao(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("estrategia_pontos_investigacao").delete().eq("id", id);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}

// ---- Fragilidades da tese (§9) ----------------------------------------------
export async function criarFragilidade(estrategiaId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: ultimo, error: erroUltimo } = await supabase
    .from("estrategia_fragilidades")
    .select("ordem")
    .eq("estrategia_id", estrategiaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };
  const insert: EstrategiaFragilidadesInsert = { estrategia_id: estrategiaId, ordem: (ultimo?.ordem ?? 0) + 1, fragilidade: "Nova fragilidade — edite abaixo" };
  const { error } = await supabase.from("estrategia_fragilidades").insert(insert);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}
export async function salvarFragilidade(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const fragilidade = textoOuNull(formData.get("fragilidade"));
  if (!id || !processoId) return { error: "Registro inválido." };
  if (!fragilidade) return { error: "A fragilidade não pode ficar vazia." };
  const supabase = await createClient();
  const update: EstrategiaFragilidadesUpdate = {
    fragilidade,
    classificacao: (formData.get("classificacao") as EstrategiaFragilidadeClassificacao | "") || null,
  };
  const { error } = await supabase.from("estrategia_fragilidades").update(update).eq("id", id);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}
export async function excluirFragilidade(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("estrategia_fragilidades").delete().eq("id", id);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}

// ---- Teses adversas previsíveis (§10) ---------------------------------------
export async function criarTeseAdversa(estrategiaId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: ultimo, error: erroUltimo } = await supabase
    .from("estrategia_teses_adversas")
    .select("ordem")
    .eq("estrategia_id", estrategiaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };
  const insert: EstrategiaTesesAdversasInsert = { estrategia_id: estrategiaId, ordem: (ultimo?.ordem ?? 0) + 1, tese_adversa: "Nova tese adversa — edite abaixo" };
  const { error } = await supabase.from("estrategia_teses_adversas").insert(insert);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}
export async function salvarTeseAdversa(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const teseAdversa = textoOuNull(formData.get("tese_adversa"));
  if (!id || !processoId) return { error: "Registro inválido." };
  if (!teseAdversa) return { error: "A tese adversa não pode ficar vazia." };
  const supabase = await createClient();
  const update: EstrategiaTesesAdversasUpdate = {
    tese_adversa: teseAdversa,
    resposta_tecnica: textoOuNull(formData.get("resposta_tecnica")),
    evidencia_necessaria: textoOuNull(formData.get("evidencia_necessaria")),
    destino: (formData.get("destino") as EstrategiaTeseAdversaDestino | "") || null,
  };
  const { error } = await supabase.from("estrategia_teses_adversas").update(update).eq("id", id);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}
export async function excluirTeseAdversa(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("estrategia_teses_adversas").delete().eq("id", id);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}

// ---- Documentos e provas complementares (§11) -------------------------------
export async function criarDocumentoProva(estrategiaId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: ultimo, error: erroUltimo } = await supabase
    .from("estrategia_documentos_provas")
    .select("ordem")
    .eq("estrategia_id", estrategiaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };
  const insert: EstrategiaDocumentosProvasInsert = { estrategia_id: estrategiaId, ordem: (ultimo?.ordem ?? 0) + 1, documento: "Novo documento — edite abaixo" };
  const { error } = await supabase.from("estrategia_documentos_provas").insert(insert);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}
export async function salvarDocumentoProva(formData: FormData): Promise<ActionResult> {
  const id = textoOuNull(formData.get("id"));
  const processoId = textoOuNull(formData.get("processo_id"));
  const documento = textoOuNull(formData.get("documento"));
  if (!id || !processoId) return { error: "Registro inválido." };
  if (!documento) return { error: "O documento não pode ficar vazio." };
  const supabase = await createClient();
  const update: EstrategiaDocumentosProvasUpdate = {
    documento,
    motivo: textoOuNull(formData.get("motivo")),
    prioridade: (formData.get("prioridade") as EstrategiaDocumentoPrioridade | "") || null,
    acao: (formData.get("acao") as EstrategiaDocumentoAcao | "") || null,
  };
  const { error } = await supabase.from("estrategia_documentos_provas").update(update).eq("id", id);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}
export async function excluirDocumentoProva(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("estrategia_documentos_provas").delete().eq("id", id);
  if (error) return { error: error.message };
  REVALIDAR(processoId);
  return { success: true };
}
