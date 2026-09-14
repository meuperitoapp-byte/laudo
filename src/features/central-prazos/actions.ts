"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CentralTarefasInsert, CentralTarefasUpdate } from "@/types/database";
import type { TipoCentralTarefa, NivelUrgencia } from "@/types/enums";

type ActionResult = { error: string } | { success: true };

const NIVEIS_VALIDOS: readonly NivelUrgencia[] = [
  "critica", "urgente", "alta", "atencao", "programada", "sem_prazo",
];

function textoOuNull(v: FormDataEntryValue | null): string | null {
  const t = (v as string | null)?.trim();
  return t ? t : null;
}

/**
 * Cadastro manual de tarefa/evento avulso (fatia 2 da Central de Prazos).
 * `tipo='evento'` exige `hora` (o CHECK do banco garante isso de novo, mas
 * validar aqui devolve mensagem em português em vez do erro cru do
 * Postgres). Redireciona pra tela da tarefa recém-criada em vez de voltar
 * pro `/hoje` — ela normalmente quer conferir/ajustar algo antes de sair.
 */
export async function criarTarefaCentral(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tipo = formData.get("tipo") as TipoCentralTarefa | null;
  if (tipo !== "tarefa" && tipo !== "evento") return { error: "Tipo inválido." };

  const titulo = textoOuNull(formData.get("titulo"));
  if (!titulo) return { error: "Informe um título." };

  const data = textoOuNull(formData.get("data"));
  if (!data) return { error: `Informe a data ${tipo === "evento" ? "do evento" : "limite"}.` };

  const hora = textoOuNull(formData.get("hora"));
  if (tipo === "evento" && !hora) return { error: "Evento precisa de horário marcado." };

  const status = textoOuNull(formData.get("status"));
  if (!status) return { error: "Informe o status." };

  const insert: CentralTarefasInsert = {
    processo_id: textoOuNull(formData.get("processo_id")),
    tipo,
    titulo,
    descricao: textoOuNull(formData.get("descricao")),
    data,
    hora: tipo === "evento" ? hora : null,
    status,
    created_by: user?.id ?? null,
  };

  const { data: criada, error } = await supabase.from("central_tarefas").insert(insert).select("id").single();
  if (error) return { error: error.message };

  revalidatePath("/hoje");
  redirect(`/tarefas/${criada.id}`);
}

/**
 * `status_alterado_em` só é gravado de novo quando `status` realmente muda
 * (comparado com o valor já salvo) — nunca a cada edição da tarefa, senão o
 * "há quantos dias está pendente" reiniciaria toda vez que ela corrigisse um
 * detalhe qualquer.
 */
export async function atualizarTarefaCentral(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: atual } = await supabase.from("central_tarefas").select("status").eq("id", id).single();
  if (!atual) return { error: "Tarefa não encontrada." };

  const tipo = formData.get("tipo") as TipoCentralTarefa | null;
  if (tipo !== "tarefa" && tipo !== "evento") return { error: "Tipo inválido." };

  const titulo = textoOuNull(formData.get("titulo"));
  if (!titulo) return { error: "Informe um título." };

  const data = textoOuNull(formData.get("data"));
  if (!data) return { error: `Informe a data ${tipo === "evento" ? "do evento" : "limite"}.` };

  const hora = textoOuNull(formData.get("hora"));
  if (tipo === "evento" && !hora) return { error: "Evento precisa de horário marcado." };

  const status = textoOuNull(formData.get("status"));
  if (!status) return { error: "Informe o status." };

  const nivelManualBruto = textoOuNull(formData.get("nivel_urgencia_manual"));
  const nivelManual =
    nivelManualBruto && (NIVEIS_VALIDOS as readonly string[]).includes(nivelManualBruto)
      ? (nivelManualBruto as NivelUrgencia)
      : null;

  const update: CentralTarefasUpdate = {
    processo_id: textoOuNull(formData.get("processo_id")),
    tipo,
    titulo,
    descricao: textoOuNull(formData.get("descricao")),
    data,
    hora: tipo === "evento" ? hora : null,
    status,
    nivel_urgencia_manual: nivelManual,
  };
  if (status !== atual.status) {
    update.status_alterado_em = new Date().toISOString();
  }

  const { error } = await supabase.from("central_tarefas").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/hoje");
  revalidatePath(`/tarefas/${id}`);
  return { success: true };
}

/**
 * Fato explícito e separado de `status` (ver comentário da coluna) — nunca
 * inferido de nenhum valor de status, por mais que pareça "terminado".
 */
export async function marcarTarefaConcluida(id: string, concluida: boolean): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("central_tarefas")
    .update({ concluida_em: concluida ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/hoje");
  revalidatePath(`/tarefas/${id}`);
  return { success: true };
}

/** Exclusão real — tarefa avulsa não tem documento nem histórico ligado a ela, diferente de um processo. */
export async function excluirTarefaCentral(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("central_tarefas").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/hoje");
  redirect("/hoje");
}
