"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MeioEntrega } from "@/types/enums";

type ActionResult = { error: string } | { success: true };

/**
 * Etapas de AT que viram documento entregue ao advogado com prazo próprio
 * (lote 15/10/2026): Quesitos e Orientação para Réplica. As duas tabelas têm
 * as mesmas colunas de abertura/entrega, então um par de actions serve as
 * duas — a tabela vem de uma lista fechada, nunca texto livre do navegador.
 */
const TABELAS = {
  quesitos: { tabela: "quesitos_documentos", rota: "quesitos" },
  replica: { tabela: "replicas", rota: "replica" },
} as const;
export type EtapaComEntrega = keyof typeof TABELAS;

const MEIOS: readonly MeioEntrega[] = ["whatsapp", "email", "sistema"];
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function dataOuNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t && DATA_ISO.test(t) ? t : null;
}

function revalidar(processoId: string, etapa: EtapaComEntrega) {
  revalidatePath(`/processos/${processoId}`);
  revalidatePath(`/processos/${processoId}/${TABELAS[etapa].rota}`);
  revalidatePath("/hoje");
  revalidatePath("/agenda");
}

/**
 * Dados de abertura (pedido dela: "sempre que vai elaborar os quesitos ou
 * réplica já existe processo e peço ao adv que me mande o arquivo — tem como
 * colocar ... número do processo, data da contratação e prazo da entrega?").
 * O nº do processo é o MESMO do cadastro (processos.numero_processo) — nunca
 * uma cópia que poderia divergir; data de contratação e prazo são da etapa.
 */
export async function salvarAberturaEtapaAt(input: {
  etapa: EtapaComEntrega;
  registroId: string;
  processoId: string;
  numeroProcesso: string | null;
  dataContratacao: string | null;
  prazoEntrega: string | null;
}): Promise<ActionResult> {
  const destino = TABELAS[input.etapa];
  if (!destino || !input.registroId || !input.processoId) return { error: "Registro inválido — recarregue a página e tente de novo." };

  const supabase = await createClient();
  const [{ error: erroProcesso }, { error: erroEtapa }] = await Promise.all([
    supabase.from("processos").update({ numero_processo: input.numeroProcesso?.trim() || null }).eq("id", input.processoId),
    supabase
      .from(destino.tabela)
      .update({ data_contratacao: dataOuNull(input.dataContratacao), prazo_entrega: dataOuNull(input.prazoEntrega) })
      .eq("id", input.registroId),
  ]);
  if (erroProcesso) return { error: erroProcesso.message };
  if (erroEtapa) return { error: erroEtapa.message };

  revalidar(input.processoId, input.etapa);
  revalidatePath("/processos");
  return { success: true };
}

/**
 * Registro de entrega (pedido dela: "depois que eu entregar tem que
 * notificar com a data da entrega, meio de entrega (whatsapp, e-mail,
 * sistema)"). `entregueEm = null` desfaz o registro. Registrar a entrega é o
 * que tira o prazo da Central de Prazos e vira o selo verde da etapa.
 */
export async function registrarEntregaEtapaAt(input: {
  etapa: EtapaComEntrega;
  registroId: string;
  processoId: string;
  entregueEm: string | null;
  via: MeioEntrega | null;
}): Promise<ActionResult> {
  const destino = TABELAS[input.etapa];
  if (!destino || !input.registroId || !input.processoId) return { error: "Registro inválido — recarregue a página e tente de novo." };

  const entregueEm = dataOuNull(input.entregueEm);
  if (input.entregueEm && !entregueEm) return { error: "Data de entrega inválida." };
  if (entregueEm && (!input.via || !MEIOS.includes(input.via))) return { error: "Escolha o meio de entrega (WhatsApp, e-mail ou sistema)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from(destino.tabela)
    .update({ entregue_em: entregueEm, entregue_via: entregueEm ? input.via : null })
    .eq("id", input.registroId);
  if (error) return { error: error.message };

  revalidar(input.processoId, input.etapa);
  return { success: true };
}
