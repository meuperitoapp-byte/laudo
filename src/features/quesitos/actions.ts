"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { QuesitosInsert, QuesitosUpdate } from "@/types/database";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

/**
 * Cria um quesito no fim da lista do processo (CLAUDE.md: "campo aberto —
 * cola a pergunta do juízo/partes e responde", sem lista fixa de perguntas).
 * `ordem` = maior ordem já usada no processo + 1.
 */
export async function criarQuesito(processoId: string, formData: FormData): Promise<ActionResult> {
  const pergunta = textoOuNull(formData.get("pergunta"));
  if (!pergunta) {
    return { error: "Cole o texto da pergunta." };
  }

  const supabase = await createClient();

  const { data: ultimo, error: erroUltimo } = await supabase
    .from("quesitos")
    .select("ordem")
    .eq("processo_id", processoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) {
    return { error: erroUltimo.message };
  }

  const insert: QuesitosInsert = {
    processo_id: processoId,
    origem: textoOuNull(formData.get("origem")),
    pergunta,
    ordem: (ultimo?.ordem ?? 0) + 1,
  };

  const { error } = await supabase.from("quesitos").insert(insert);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/processos/${processoId}/quesitos`);
  return { success: true };
}

/**
 * Atualiza origem/pergunta/resposta de um quesito já existente. `resposta`
 * pode ficar vazia de propósito — CLAUDE.md: quando não há elementos
 * médico-periciais objetivos suficientes, a resposta objetiva não deve ser
 * forçada; a justificativa (texto livre) é que entra no lugar dela, não é um
 * campo à parte. Por isso a única validação aqui é a pergunta não ficar vazia.
 */
export async function atualizarQuesito(input: {
  quesitoId: string;
  processoId: string;
  origem: string | null;
  pergunta: string;
  resposta: string | null;
}): Promise<ActionResult> {
  const pergunta = input.pergunta.trim();
  if (!pergunta) {
    return { error: "A pergunta não pode ficar vazia." };
  }

  const supabase = await createClient();
  const update: QuesitosUpdate = {
    origem: input.origem?.trim() || null,
    pergunta,
    resposta: input.resposta?.trim() || null,
  };

  const { error } = await supabase.from("quesitos").update(update).eq("id", input.quesitoId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/processos/${input.processoId}/quesitos`);
  return { success: true };
}

export async function excluirQuesito(quesitoId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("quesitos").delete().eq("id", quesitoId);
  if (error) {
    return { error: error.message };
  }
  revalidatePath(`/processos/${processoId}/quesitos`);
  return { success: true };
}

/**
 * Move um quesito uma posição pra cima/baixo, trocando o `ordem` dele com o
 * do vizinho. Lê a lista atual do banco (em vez de confiar só no que o
 * client já tem) pra não desalinhar em caso de outra pessoa (perita ou
 * secretária) ter mexido na lista ao mesmo tempo.
 */
export async function moverQuesito(input: {
  processoId: string;
  quesitoId: string;
  direcao: "cima" | "baixo";
}): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: lista, error: erroLista } = await supabase
    .from("quesitos")
    .select("id, ordem")
    .eq("processo_id", input.processoId)
    .order("ordem", { ascending: true });
  if (erroLista) {
    return { error: erroLista.message };
  }
  if (!lista) {
    return { success: true };
  }

  const index = lista.findIndex((q) => q.id === input.quesitoId);
  if (index === -1) {
    return { error: "Quesito não encontrado — a lista pode ter mudado, recarregue a página." };
  }
  const alvoIndex = input.direcao === "cima" ? index - 1 : index + 1;
  if (alvoIndex < 0 || alvoIndex >= lista.length) {
    return { success: true }; // já está na ponta da lista, nada a fazer
  }

  const atual = lista[index];
  const alvo = lista[alvoIndex];
  const ordemAtual = atual.ordem ?? index;
  const ordemAlvo = alvo.ordem ?? alvoIndex;

  const [{ error: erro1 }, { error: erro2 }] = await Promise.all([
    supabase.from("quesitos").update({ ordem: ordemAlvo }).eq("id", atual.id),
    supabase.from("quesitos").update({ ordem: ordemAtual }).eq("id", alvo.id),
  ]);
  if (erro1) return { error: erro1.message };
  if (erro2) return { error: erro2.message };

  revalidatePath(`/processos/${input.processoId}/quesitos`);
  return { success: true };
}
