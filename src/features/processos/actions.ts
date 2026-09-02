"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProcessosInsert, ProcessosUpdate } from "@/types/database";
import type {
  AceitouNomeacao,
  EtapaContratada,
  JusticaGratuita,
  StatusProcesso,
  TipoTrabalhoProcesso,
  TipoVara,
} from "@/types/enums";

type ActionResult = { error: string } | void;

function optionalText(formData: FormData, key: string): string | null {
  const value = (formData.get(key) as string | null)?.trim();
  return value ? value : null;
}

/** Campo monetário do formulário (input number, ex.: "1234.56") → number | null. */
function optionalNumber(formData: FormData, key: string): number | null {
  const raw = (formData.get(key) as string | null)?.trim();
  if (!raw) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Select de opção fixa: só aceita um dos valores permitidos, senão null. */
function optionalEnum<T extends string>(
  formData: FormData,
  key: string,
  permitidos: readonly T[],
): T | null {
  const value = (formData.get(key) as string | null)?.trim();
  return value && (permitidos as readonly string[]).includes(value) ? (value as T) : null;
}

const JUSTICA_GRATUITA_VALORES: readonly JusticaGratuita[] = ["sim", "nao"];
const ACEITOU_NOMEACAO_VALORES: readonly AceitouNomeacao[] = ["sim", "nao", "destituida"];
const STATUS_VALORES: readonly StatusProcesso[] = ["em_andamento", "finalizado", "arquivado"];

/**
 * Campos genéricos (situação, acompanhamento, financeiro) — válidos para os
 * dois tipos de trabalho. Usado tanto no insert quanto no update.
 */
function camposGenericos(formData: FormData) {
  return {
    situacao_processo: optionalText(formData, "situacao_processo"),
    situacao_financeira: optionalText(formData, "situacao_financeira"),
    valor_processo: optionalNumber(formData, "valor_processo"),
    honorario_apresentado: optionalNumber(formData, "honorario_apresentado"),
    honorario_arbitrado: optionalNumber(formData, "honorario_arbitrado"),
    justica_gratuita: optionalEnum(formData, "justica_gratuita", JUSTICA_GRATUITA_VALORES),
    aceitou_nomeacao: optionalEnum(formData, "aceitou_nomeacao", ACEITOU_NOMEACAO_VALORES),
    url_processo: optionalText(formData, "url_processo"),
    acao_objeto: optionalText(formData, "acao_objeto"),
  };
}

/**
 * Cria o processo a partir do formulário de cadastro (Etapa 2). Os campos
 * específicos de Perícia Judicial ou Assistência Técnica só são lidos quando
 * fazem sentido pro tipo_trabalho escolhido — o restante fica null.
 */
export async function createProcesso(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const tipoTrabalho = formData.get("tipo_trabalho") as TipoTrabalhoProcesso | null;
  if (!tipoTrabalho) {
    return { error: "Selecione o tipo de trabalho." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insert: ProcessosInsert = {
    tipo_trabalho: tipoTrabalho,
    tipo_laudo_id: optionalText(formData, "tipo_laudo_id"),
    created_by: user?.id ?? null,
    ...camposGenericos(formData),
  };

  if (tipoTrabalho === "pericia_judicial") {
    const tipoVara = optionalText(formData, "tipo_vara") as TipoVara | null;
    insert.numero_processo = optionalText(formData, "numero_processo");
    insert.tipo_vara = tipoVara;
    insert.vara_numero = optionalText(formData, "vara_numero");
    insert.comarca_subsecao = optionalText(formData, "comarca_subsecao");
    insert.uf = optionalText(formData, "uf");
    // Polo Ativo/Passivo (várias pessoas cada) são cadastrados depois de criar
    // o processo — ver processo_partes/PoloPartesPanel. parte_autora/partes_re
    // seguem existindo na tabela só por compatibilidade com dados antigos.
    insert.periciando_nome = optionalText(formData, "periciando_nome");
    insert.periciando_cpf = optionalText(formData, "periciando_cpf");
    insert.periciando_data_nascimento = optionalText(formData, "periciando_data_nascimento");
    insert.objeto_pericia = optionalText(formData, "objeto_pericia");
  } else {
    const etapas = formData.getAll("etapas_contratadas") as EtapaContratada[];
    insert.etapas_contratadas = etapas.length > 0 ? etapas : null;
    insert.cliente_parte_assistida = optionalText(formData, "cliente_parte_assistida");
    insert.advogado_escritorio = optionalText(formData, "advogado_escritorio");
    insert.periciando_nome = optionalText(formData, "periciando_nome");
  }

  const { data, error } = await supabase
    .from("processos")
    .insert(insert)
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Erro ao criar o processo." };
  }

  redirect(`/processos/${data.id}`);
}

/**
 * Atualiza um processo já cadastrado (tela /processos/[id]/editar). Não mexe
 * em tipo_trabalho — esse é fixo depois de criado. tipo_laudo_id pode mudar
 * (ainda não travamos troca de template, mas o ideal é evitar depois que já
 * há respostas). Campos em branco viram null (a perita pode limpar um valor).
 */
export async function updateProcesso(
  processoId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const tipoTrabalho = formData.get("tipo_trabalho") as TipoTrabalhoProcesso | null;

  const update: ProcessosUpdate = {
    tipo_laudo_id: optionalText(formData, "tipo_laudo_id"),
    status: optionalEnum(formData, "status", STATUS_VALORES) ?? "em_andamento",
    ...camposGenericos(formData),
  };

  if (tipoTrabalho === "pericia_judicial") {
    update.numero_processo = optionalText(formData, "numero_processo");
    update.tipo_vara = (optionalText(formData, "tipo_vara") as TipoVara | null) ?? null;
    update.vara_numero = optionalText(formData, "vara_numero");
    update.comarca_subsecao = optionalText(formData, "comarca_subsecao");
    update.uf = optionalText(formData, "uf");
    update.periciando_nome = optionalText(formData, "periciando_nome");
    update.periciando_cpf = optionalText(formData, "periciando_cpf");
    update.periciando_data_nascimento = optionalText(formData, "periciando_data_nascimento");
    update.objeto_pericia = optionalText(formData, "objeto_pericia");
  } else if (tipoTrabalho === "assistencia_tecnica") {
    const etapas = formData.getAll("etapas_contratadas") as EtapaContratada[];
    update.etapas_contratadas = etapas.length > 0 ? etapas : null;
    update.cliente_parte_assistida = optionalText(formData, "cliente_parte_assistida");
    update.advogado_escritorio = optionalText(formData, "advogado_escritorio");
    update.periciando_nome = optionalText(formData, "periciando_nome");
  }

  const { error } = await supabase.from("processos").update(update).eq("id", processoId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/processos/${processoId}`);
  revalidatePath(`/processos/${processoId}/editar`);
  redirect(`/processos/${processoId}`);
}
