"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProcessosInsert } from "@/types/database";
import type { EtapaContratada, TipoTrabalhoProcesso, TipoVara } from "@/types/enums";

type ActionResult = { error: string } | void;

function optionalText(formData: FormData, key: string): string | null {
  const value = (formData.get(key) as string | null)?.trim();
  return value ? value : null;
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
