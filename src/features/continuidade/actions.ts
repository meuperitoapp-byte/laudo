"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { somarDiasIso } from "@/features/central-prazos/regras";
import { STATUS_POR_RESULTADO } from "./catalogos";
import type { ContinuidadeOportunidadesInsert, ContinuidadeRegrasInsert, ContinuidadeRegrasUpdate } from "@/types/database";
import type { ContinuidadeFluxo, ContinuidadeResultadoFollowup } from "@/types/enums";

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

const FLUXOS: readonly ContinuidadeFluxo[] = ["avulso", "meu_perito", "cliente_saude_direto"];
const RESULTADOS: readonly ContinuidadeResultadoFollowup[] = [
  "contratou_principal", "contratou_avulso", "ainda_avaliando", "sem_interesse", "valor_elevado",
  "fara_internamente", "caso_nao_prosseguiu", "sem_necessidade_agora", "aguardando_marco_processual",
  "sem_resposta", "outro",
];

/**
 * Registrar uma oportunidade de continuidade (§20) — sempre manual (a perita/
 * Patrícia decide que aquele serviço concluído merece um follow-up), nunca
 * disparado sozinho pelo banco. `data_limite` é calculada aqui uma vez e
 * congelada (não recalcula se a regra padrão mudar depois).
 */
export async function registrarOportunidade(processoId: string, relacionamentoId: string | null, formData: FormData): Promise<ActionResult> {
  const servicoOrigem = textoOuNull(formData.get("servico_origem"));
  const dataGatilho = textoOuNull(formData.get("data_gatilho"));
  if (!servicoOrigem || !dataGatilho) return { error: "Serviço de origem e data do gatilho são obrigatórios." };
  const prazoDias = numeroOuNull(formData.get("prazo_dias")) ?? 7;

  const supabase = await createClient();
  const payload: ContinuidadeOportunidadesInsert = {
    processo_id: processoId,
    relacionamento_id: relacionamentoId,
    servico_origem: servicoOrigem,
    gatilho: textoOuNull(formData.get("gatilho")),
    data_gatilho: dataGatilho,
    prazo_dias: prazoDias,
    data_limite: somarDiasIso(dataGatilho, prazoDias),
    fluxo: enumOuNull(formData.get("fluxo"), FLUXOS),
    observacao: textoOuNull(formData.get("observacao")),
  };
  const { error } = await supabase.from("continuidade_oportunidades").insert(payload);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/continuidade`);
  revalidatePath("/relacionamento");
  revalidatePath("/hoje");
  return { success: true };
}

/**
 * Resultado padronizado do follow-up (§20.5) — o status consequente é
 * aplicado automaticamente (STATUS_POR_RESULTADO), nunca escolhido à parte
 * (evita inconsistência tipo "contratou_avulso" com status "aberta").
 */
export async function salvarResultadoFollowup(id: string, processoId: string, formData: FormData): Promise<ActionResult> {
  const resultado = enumOuNull(formData.get("resultado_followup"), RESULTADOS);
  if (!resultado) return { error: "Selecione um resultado." };
  if (resultado === "outro" && !textoOuNull(formData.get("resultado_followup_outro"))) {
    return { error: "Descreva o resultado em \"Outro\"." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("continuidade_oportunidades")
    .update({
      resultado_followup: resultado,
      resultado_followup_outro: textoOuNull(formData.get("resultado_followup_outro")),
      status: STATUS_POR_RESULTADO[resultado],
      proxima_tentativa_data: textoOuNull(formData.get("proxima_tentativa_data")),
      observacao: textoOuNull(formData.get("observacao")),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/continuidade`);
  revalidatePath("/relacionamento");
  revalidatePath("/hoje");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Regras de continuidade — catálogo configurável pela gestão (§20.4).
// ---------------------------------------------------------------------------
export async function criarRegra(formData: FormData): Promise<ActionResult> {
  const servicoOrigem = textoOuNull(formData.get("servico_origem"));
  if (!servicoOrigem) return { error: "Serviço de origem é obrigatório." };
  const supabase = await createClient();
  const alternativos = textoOuNull(formData.get("servicos_alternativos"));
  const payload: ContinuidadeRegrasInsert = {
    servico_origem: servicoOrigem,
    gatilho: textoOuNull(formData.get("gatilho")),
    servico_destino_principal: textoOuNull(formData.get("servico_destino_principal")),
    servicos_alternativos: alternativos ? alternativos.split(",").map((s) => s.trim()).filter(Boolean) : [],
    prazo_dias_padrao: numeroOuNull(formData.get("prazo_dias_padrao")) ?? 7,
  };
  const { error } = await supabase.from("continuidade_regras").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/relacionamento/configuracoes");
  return { success: true };
}

export async function salvarRegra(id: string, formData: FormData): Promise<ActionResult> {
  const servicoOrigem = textoOuNull(formData.get("servico_origem"));
  if (!servicoOrigem) return { error: "Serviço de origem é obrigatório." };
  const supabase = await createClient();
  const alternativos = textoOuNull(formData.get("servicos_alternativos"));
  const payload: ContinuidadeRegrasUpdate = {
    servico_origem: servicoOrigem,
    gatilho: textoOuNull(formData.get("gatilho")),
    servico_destino_principal: textoOuNull(formData.get("servico_destino_principal")),
    servicos_alternativos: alternativos ? alternativos.split(",").map((s) => s.trim()).filter(Boolean) : [],
    prazo_dias_padrao: numeroOuNull(formData.get("prazo_dias_padrao")) ?? 7,
    ativo: formData.get("ativo") === "on",
  };
  const { error } = await supabase.from("continuidade_regras").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/relacionamento/configuracoes");
  return { success: true };
}
