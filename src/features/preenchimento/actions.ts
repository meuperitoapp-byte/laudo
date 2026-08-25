"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RespostasProcessoInsert, RespostasSecaoInsert } from "@/types/database";
import type { ValorSelecionado } from "@/types/json-fields";

export interface RespostaCampoInput {
  campoId: string;
  valorSelecionado: ValorSelecionado | null;
  textoLivre: string | null;
  textoNarrativo: string | null;
  confirmadoPeloPerito: boolean;
}

export interface NarrativoSecaoInput {
  texto: string | null;
  editadoManualmente: boolean;
}

export interface SalvarSecaoInput {
  processoId: string;
  secaoId: string;
  respostas: RespostaCampoInput[];
  narrativoSecao: NarrativoSecaoInput | null;
}

type ActionResult = { error: string } | { success: true };

/**
 * Salva de uma vez toda a seção sendo editada: as respostas por campo
 * (respostas_processo, upsert em lote por processo_id+campo_id) e o
 * narrativo composto da seção (respostas_secao, upsert por
 * processo_id+secao_id — ver migration 20260823110000). Usado tanto pelo
 * botão "Salvar" quanto pelo auto-save ao navegar para outra seção.
 */
export async function salvarSecao(input: SalvarSecaoInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (input.respostas.length > 0) {
    const rows: RespostasProcessoInsert[] = input.respostas.map((r) => ({
      processo_id: input.processoId,
      campo_id: r.campoId,
      valor_selecionado: r.valorSelecionado,
      texto_livre: r.textoLivre,
      texto_narrativo: r.textoNarrativo,
      confirmado_pelo_perito: r.confirmadoPeloPerito,
      respondido_por: user?.id ?? null,
    }));

    const { error } = await supabase
      .from("respostas_processo")
      .upsert(rows, { onConflict: "processo_id,campo_id" });

    if (error) {
      return { error: `Erro ao salvar respostas: ${error.message}` };
    }
  }

  if (input.narrativoSecao) {
    const row: RespostasSecaoInsert = {
      processo_id: input.processoId,
      secao_id: input.secaoId,
      texto_narrativo: input.narrativoSecao.texto,
      editado_manualmente: input.narrativoSecao.editadoManualmente,
      respondido_por: user?.id ?? null,
    };

    const { error } = await supabase
      .from("respostas_secao")
      .upsert(row, { onConflict: "processo_id,secao_id" });

    if (error) {
      return { error: `Erro ao salvar o texto da seção: ${error.message}` };
    }
  }

  revalidatePath(`/processos/${input.processoId}/preenchimento/${input.secaoId}`);
  revalidatePath(`/processos/${input.processoId}`);
  return { success: true };
}
