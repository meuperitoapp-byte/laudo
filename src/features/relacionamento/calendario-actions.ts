"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  DatasComemorativasProfissionaisInsert,
  DatasComemorativasProfissionaisUpdate,
  CampanhasTematicasSaudeInsert,
  CampanhasTematicasSaudeUpdate,
} from "@/types/database";
import type { RelacionamentoCanal } from "@/types/enums";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}
function numeroOuNull(valor: FormDataEntryValue | null): number | null {
  const texto = (valor as string | null)?.trim();
  if (!texto) return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}
function enumOuNull<T extends string>(valor: FormDataEntryValue | null, permitidos: readonly T[]): T | null {
  const texto = (valor as string | null)?.trim();
  return texto && (permitidos as readonly string[]).includes(texto) ? (texto as T) : null;
}
function listaOuVazia(valor: FormDataEntryValue | null): string[] {
  const texto = (valor as string | null) ?? "";
  return texto.split(",").map((s) => s.trim()).filter(Boolean);
}

const CANAIS: readonly RelacionamentoCanal[] = ["whatsapp", "telefone", "email", "reuniao", "presencial", "outro"];

/** §22.8 — configurações do Calendário Inteligente, editáveis pela gestão sem alteração de código. */
export async function salvarConfiguracoesCalendario(formData: FormData): Promise<ActionResult> {
  const prazoMeses = numeroOuNull(formData.get("prazo_meses_atualizacao_cliente_saude"));
  const diasAntecedencia = numeroOuNull(formData.get("dias_antecedencia_aniversarios"));
  if (prazoMeses == null || diasAntecedencia == null) return { error: "Informe os dois valores." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("relacionamento_configuracoes")
    .update({ prazo_meses_atualizacao_cliente_saude: prazoMeses, dias_antecedencia_aniversarios: diasAntecedencia })
    .eq("id", true);
  if (error) return { error: error.message };
  revalidatePath("/relacionamento");
  revalidatePath("/relacionamento/configuracoes");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Datas comemorativas por profissão (§22.1)
// ---------------------------------------------------------------------------
export async function criarDataComemorativa(formData: FormData): Promise<ActionResult> {
  const profissao = textoOuNull(formData.get("profissao"));
  const dataComemorativa = textoOuNull(formData.get("data_comemorativa"));
  if (!profissao || !dataComemorativa || !/^\d{2}-\d{2}$/.test(dataComemorativa)) {
    return { error: "Profissão e data (formato DD-MM) são obrigatórias." };
  }
  const supabase = await createClient();
  const payload: DatasComemorativasProfissionaisInsert = { profissao, data_comemorativa: dataComemorativa };
  const { error } = await supabase.from("datas_comemorativas_profissionais").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/relacionamento/configuracoes");
  return { success: true };
}

export async function salvarDataComemorativa(id: string, formData: FormData): Promise<ActionResult> {
  const profissao = textoOuNull(formData.get("profissao"));
  const dataComemorativa = textoOuNull(formData.get("data_comemorativa"));
  if (!profissao || !dataComemorativa || !/^\d{2}-\d{2}$/.test(dataComemorativa)) {
    return { error: "Profissão e data (formato DD-MM) são obrigatórias." };
  }
  const supabase = await createClient();
  const payload: DatasComemorativasProfissionaisUpdate = {
    profissao,
    data_comemorativa: dataComemorativa,
    ativo: formData.get("ativo") === "on",
  };
  const { error } = await supabase.from("datas_comemorativas_profissionais").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/relacionamento/configuracoes");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Campanhas temáticas de saúde (§22.6)
// ---------------------------------------------------------------------------
export async function criarCampanhaSaude(formData: FormData): Promise<ActionResult> {
  const nome = textoOuNull(formData.get("nome"));
  if (!nome) return { error: "Nome da campanha é obrigatório." };
  const supabase = await createClient();
  const payload: CampanhasTematicasSaudeInsert = {
    nome,
    area_clinica: textoOuNull(formData.get("area_clinica")),
    situacoes_permitidas: listaOuVazia(formData.get("situacoes_permitidas")),
    situacoes_excluidas: listaOuVazia(formData.get("situacoes_excluidas")).length > 0 ? listaOuVazia(formData.get("situacoes_excluidas")) : ["falecido"],
    canal: enumOuNull(formData.get("canal"), CANAIS),
    mensagem_modelo: textoOuNull(formData.get("mensagem_modelo")),
  };
  const { error } = await supabase.from("campanhas_tematicas_saude").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/relacionamento/configuracoes");
  return { success: true };
}

export async function salvarCampanhaSaude(id: string, formData: FormData): Promise<ActionResult> {
  const nome = textoOuNull(formData.get("nome"));
  if (!nome) return { error: "Nome da campanha é obrigatório." };
  const supabase = await createClient();
  const payload: CampanhasTematicasSaudeUpdate = {
    nome,
    area_clinica: textoOuNull(formData.get("area_clinica")),
    situacoes_permitidas: listaOuVazia(formData.get("situacoes_permitidas")),
    situacoes_excluidas: listaOuVazia(formData.get("situacoes_excluidas")),
    canal: enumOuNull(formData.get("canal"), CANAIS),
    mensagem_modelo: textoOuNull(formData.get("mensagem_modelo")),
    ativo: formData.get("ativo") === "on",
  };
  const { error } = await supabase.from("campanhas_tematicas_saude").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/relacionamento/configuracoes");
  return { success: true };
}
