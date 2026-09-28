"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DesfechosJudiciaisInsert, DesfechosJudiciaisUpdate } from "@/types/database";
import type {
  DesfechoArea,
  DesfechoParteAssistida,
  DesfechoTipoDecisao,
  DesfechoResultadoParteAssistida,
  DesfechoStatusDecisao,
  DesfechoResultadoPericia,
} from "@/types/enums";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}
function enumOuNull<T extends string>(valor: FormDataEntryValue | null, permitidos: readonly T[]): T | null {
  const texto = (valor as string | null)?.trim();
  return texto && (permitidos as readonly string[]).includes(texto) ? (texto as T) : null;
}
function boolOuNull(valor: FormDataEntryValue | null): boolean | null {
  const texto = (valor as string | null) ?? "";
  if (texto === "sim") return true;
  if (texto === "nao") return false;
  return null;
}
function linhasOuVazio(valor: FormDataEntryValue | null): string[] {
  const texto = (valor as string | null) ?? "";
  return texto.split(",").map((s) => s.trim()).filter(Boolean);
}

const AREAS: readonly DesfechoArea[] = ["saude", "medico", "trabalhista", "previdenciario", "criminal", "outra"];
const PARTES: readonly DesfechoParteAssistida[] = ["autor", "reu", "reclamante", "reclamada", "outra"];
const TIPOS_DECISAO: readonly DesfechoTipoDecisao[] = ["tutela", "liminar", "sentenca", "acordao", "decisao_interlocutoria", "outra"];
const RESULTADOS_PARTE: readonly DesfechoResultadoParteAssistida[] = ["favoravel", "parcialmente_favoravel", "desfavoravel", "sem_julgamento_merito", "outro"];
const STATUS_DECISAO: readonly DesfechoStatusDecisao[] = ["provisoria", "recurso_pendente", "definitiva", "transito_julgado", "outro"];
const RESULTADOS_PERICIA: readonly DesfechoResultadoPericia[] = ["favoravel", "parcialmente_favoravel", "desfavoravel", "inconclusivo", "nao_se_aplica"];

function camposComuns(formData: FormData) {
  return {
    area: enumOuNull(formData.get("area"), AREAS) ?? ("outra" as DesfechoArea),
    subarea_demanda: textoOuNull(formData.get("subarea_demanda")),
    parte_assistida: enumOuNull(formData.get("parte_assistida"), PARTES),
    tipo_decisao: enumOuNull(formData.get("tipo_decisao"), TIPOS_DECISAO),
    resultado_parte_assistida: enumOuNull(formData.get("resultado_parte_assistida"), RESULTADOS_PARTE),
    status_decisao: enumOuNull(formData.get("status_decisao"), STATUS_DECISAO),
    servicos_pericons_no_caso: linhasOuVazio(formData.get("servicos_pericons_no_caso")),
    houve_prova_pericial: boolOuNull(formData.get("houve_prova_pericial")),
    resultado_pericia: enumOuNull(formData.get("resultado_pericia"), RESULTADOS_PERICIA),
    observacao_tecnica: textoOuNull(formData.get("observacao_tecnica")),
    decisao_documento_id: textoOuNull(formData.get("decisao_documento_id")),
    tribunal: textoOuNull(formData.get("tribunal")),
    uf: textoOuNull(formData.get("uf"))?.toUpperCase().slice(0, 2) ?? null,
  };
}

/** Desmarca desfecho_atual/desfecho_definitivo dos demais registros do processo — só um true por vez em cada, sempre garantido aqui. */
async function desmarcarOutros(supabase: Awaited<ReturnType<typeof createClient>>, processoId: string, excetoId: string | null, campo: "desfecho_atual" | "desfecho_definitivo") {
  const payload: DesfechosJudiciaisUpdate = campo === "desfecho_atual" ? { desfecho_atual: false } : { desfecho_definitivo: false };
  let query = supabase.from("desfechos_judiciais").update(payload).eq("processo_id", processoId).eq(campo, true);
  if (excetoId) query = query.neq("id", excetoId);
  await query;
}

export async function criarDesfecho(processoId: string, formData: FormData): Promise<ActionResult> {
  const dataDecisao = textoOuNull(formData.get("data_decisao"));
  if (!dataDecisao) return { error: "Data da decisão é obrigatória." };

  const supabase = await createClient();
  const marcarAtual = formData.get("desfecho_atual") === "on";
  const marcarDefinitivo = formData.get("desfecho_definitivo") === "on";

  const payload: DesfechosJudiciaisInsert = {
    processo_id: processoId,
    data_decisao: dataDecisao,
    desfecho_atual: marcarAtual,
    desfecho_definitivo: marcarDefinitivo,
    ...camposComuns(formData),
  };
  const { data, error } = await supabase.from("desfechos_judiciais").insert(payload).select("id").single();
  if (error) return { error: error.message };

  if (marcarAtual) await desmarcarOutros(supabase, processoId, data.id, "desfecho_atual");
  if (marcarDefinitivo) await desmarcarOutros(supabase, processoId, data.id, "desfecho_definitivo");

  revalidatePath(`/processos/${processoId}/desfecho-judicial`);
  revalidatePath("/biblioteca-pericial/decisoes");
  revalidatePath("/hoje");
  return { success: true };
}

export async function salvarDesfecho(id: string, processoId: string, formData: FormData): Promise<ActionResult> {
  const dataDecisao = textoOuNull(formData.get("data_decisao"));
  if (!dataDecisao) return { error: "Data da decisão é obrigatória." };

  const supabase = await createClient();
  const marcarAtual = formData.get("desfecho_atual") === "on";
  const marcarDefinitivo = formData.get("desfecho_definitivo") === "on";

  const payload: DesfechosJudiciaisUpdate = {
    data_decisao: dataDecisao,
    desfecho_atual: marcarAtual,
    desfecho_definitivo: marcarDefinitivo,
    ...camposComuns(formData),
  };
  const { error } = await supabase.from("desfechos_judiciais").update(payload).eq("id", id);
  if (error) return { error: error.message };

  if (marcarAtual) await desmarcarOutros(supabase, processoId, id, "desfecho_atual");
  if (marcarDefinitivo) await desmarcarOutros(supabase, processoId, id, "desfecho_definitivo");

  revalidatePath(`/processos/${processoId}/desfecho-judicial`);
  revalidatePath("/biblioteca-pericial/decisoes");
  revalidatePath("/hoje");
  return { success: true };
}

export async function excluirDesfecho(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("desfechos_judiciais").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/processos/${processoId}/desfecho-judicial`);
  revalidatePath("/biblioteca-pericial/decisoes");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Documentos relacionados (§24.1) — reaproveita `documentos` já anexados ao
// processo, nunca faz upload aqui.
// ---------------------------------------------------------------------------
export async function vincularDocumentoRelacionado(desfechoId: string, processoId: string, documentoId: string): Promise<ActionResult> {
  if (!documentoId) return { error: "Selecione um documento." };
  const supabase = await createClient();
  const { error } = await supabase.from("desfecho_documentos_relacionados").insert({ desfecho_id: desfechoId, documento_id: documentoId });
  if (error) return { error: error.message };
  revalidatePath(`/processos/${processoId}/desfecho-judicial`);
  return { success: true };
}

export async function desvincularDocumentoRelacionado(id: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("desfecho_documentos_relacionados").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/processos/${processoId}/desfecho-judicial`);
  return { success: true };
}

/** §24.5 — prazo (dias) pro alerta de desfecho judicial pendente na Central de Prazos. */
export async function salvarPrazoDesfechoPendente(formData: FormData): Promise<ActionResult> {
  const raw = (formData.get("prazo_dias_desfecho_judicial_pendente") as string | null)?.trim();
  const prazo = raw ? Number(raw) : null;
  if (prazo == null || !Number.isFinite(prazo)) return { error: "Informe um valor." };
  const supabase = await createClient();
  const { error } = await supabase.from("relacionamento_configuracoes").update({ prazo_dias_desfecho_judicial_pendente: prazo }).eq("id", true);
  if (error) return { error: error.message };
  revalidatePath("/relacionamento/configuracoes");
  return { success: true };
}
