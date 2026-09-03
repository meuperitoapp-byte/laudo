"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PosLaudoCiclosInsert, PosLaudoPontosInsert } from "@/types/database";
import type {
  PosLaudoClassificacaoTriagem,
  PosLaudoFluxo,
  PosLaudoNatureza,
  PosLaudoOrigem,
  PosLaudoPotencialConclusao,
} from "@/types/enums";

type ActionResult = { error: string } | { success: true };

const ORIGEM_VALIDAS: readonly PosLaudoOrigem[] = ["autor", "reu", "ambos", "juizo", "mp", "outro"];
const NATUREZA_VALIDAS: readonly PosLaudoNatureza[] = [
  "concordancia",
  "impugnacao",
  "esclarecimentos",
  "quesitos_suplementares",
  "complementacao",
  "documento_novo",
  "nova_pericia",
  "determinacao_judicial",
  "outra",
];

/** Um ciclo está "vazio" (rascunho — Registro da Demanda ainda não preenchido). */
function registroVazio(c: {
  data_intimacao: string | null;
  prazo: string | null;
  origem: string | null;
  natureza: string[] | null;
  documento_intimacao_id: string | null;
}): boolean {
  return (
    c.data_intimacao === null &&
    c.prazo === null &&
    c.origem === null &&
    (c.natureza === null || c.natureza.length === 0) &&
    c.documento_intimacao_id === null
  );
}

/**
 * Abre um novo ciclo de pós-laudo — ou, se já houver um ciclo `status =
 * 'aberto'` com o Registro da Demanda ainda em branco, leva pra ele em vez de
 * criar outro. Dois cliques no botão não podem virar dois ciclos vazios.
 *
 * `fluxo` NUNCA é escolha do usuário: nasce derivado de
 * processos.tipo_trabalho (judicial / assistencia_tecnica), pra não pedir uma
 * informação que o sistema já tem e não gerar documento com cabeçalho errado.
 *
 * `laudo_base_id` = a MAIOR `versao` entre as linhas `tipo = 'laudo'` E
 * `protocolado = true` desse processo. O filtro de `tipo` é explícito de
 * propósito: quando esclarecimentos/complementações povoarem `laudos_gerados`,
 * "a versão mais recente" sem esse filtro passaria a apontar pro documento
 * errado.
 */
export async function abrirCicloPosLaudo(processoId: string): Promise<{ error: string }> {
  const supabase = await createClient();

  const { data: processo, error: erroProc } = await supabase
    .from("processos")
    .select("tipo_trabalho")
    .eq("id", processoId)
    .single();
  if (erroProc || !processo) {
    return { error: erroProc?.message ?? "Processo não encontrado." };
  }

  const fluxo: PosLaudoFluxo =
    processo.tipo_trabalho === "assistencia_tecnica" ? "assistencia_tecnica" : "judicial";

  // Gate + âncora do ciclo: precisa de um laudo protocolado.
  const { data: laudoBase, error: erroLaudo } = await supabase
    .from("laudos_gerados")
    .select("id")
    .eq("processo_id", processoId)
    .eq("tipo", "laudo")
    .eq("protocolado", true)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroLaudo) {
    return { error: erroLaudo.message };
  }
  if (!laudoBase) {
    return {
      error: "O laudo precisa estar marcado como protocolado antes de abrir um ciclo de pós-laudo.",
    };
  }

  // Dedup: reaproveita um ciclo 'aberto' ainda em branco, se houver.
  const { data: abertos, error: erroAbertos } = await supabase
    .from("pos_laudo_ciclos")
    .select("id, data_intimacao, prazo, origem, natureza, documento_intimacao_id")
    .eq("processo_id", processoId)
    .eq("status", "aberto");
  if (erroAbertos) {
    return { error: erroAbertos.message };
  }
  const emBranco = (abertos ?? []).find(registroVazio);
  if (emBranco) {
    redirect(`/processos/${processoId}/pos-laudo/${emBranco.id}`);
  }

  // numero_ciclo = maior já usado no processo + 1
  const { data: ultimo, error: erroUltimo } = await supabase
    .from("pos_laudo_ciclos")
    .select("numero_ciclo")
    .eq("processo_id", processoId)
    .order("numero_ciclo", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) {
    return { error: erroUltimo.message };
  }

  const insert: PosLaudoCiclosInsert = {
    processo_id: processoId,
    numero_ciclo: (ultimo?.numero_ciclo ?? 0) + 1,
    fluxo,
    laudo_base_id: laudoBase.id,
  };
  const { data: novo, error: erroInsert } = await supabase
    .from("pos_laudo_ciclos")
    .insert(insert)
    .select("id")
    .single();
  if (erroInsert || !novo) {
    return { error: erroInsert?.message ?? "Erro ao abrir o ciclo." };
  }

  revalidatePath(`/processos/${processoId}/pos-laudo`);
  redirect(`/processos/${processoId}/pos-laudo/${novo.id}`);
}

/**
 * Salva o Registro da Demanda de um ciclo (data da intimação, prazo, origem,
 * natureza, documento da intimação). NÃO mexe no `status` do ciclo — o avanço
 * de "aberto" pra "triagem" é matéria da fatia seguinte.
 */
export async function salvarRegistroDemanda(input: {
  cicloId: string;
  processoId: string;
  dataIntimacao: string | null;
  prazo: string | null;
  origem: string | null;
  natureza: string[];
  documentoIntimacaoId: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const origem: PosLaudoOrigem | null =
    input.origem && (ORIGEM_VALIDAS as readonly string[]).includes(input.origem)
      ? (input.origem as PosLaudoOrigem)
      : null;
  const natureza = input.natureza.filter((n): n is PosLaudoNatureza =>
    (NATUREZA_VALIDAS as readonly string[]).includes(n),
  );

  const { error } = await supabase
    .from("pos_laudo_ciclos")
    .update({
      data_intimacao: input.dataIntimacao,
      prazo: input.prazo,
      origem,
      natureza,
      documento_intimacao_id: input.documentoIntimacaoId,
    })
    .eq("id", input.cicloId)
    .eq("processo_id", input.processoId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/processos/${input.processoId}/pos-laudo`);
  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

// ============================================================================
// Fatia 2 — triagem + matriz de pontos
// ============================================================================

const CLASSIFICACAO_VALIDAS: readonly PosLaudoClassificacaoTriagem[] = [
  "questionamento_pertinente",
  "esclarecimento_legitimo",
  "quesito_suplementar_pertinente",
  "documento_novo_relevante",
  "necessidade_complementacao",
  "divergencia_interpretativa",
  "mero_inconformismo",
  "reiteracao_quesito",
  "questao_juridica_fora_objeto",
];
const POTENCIAL_VALIDAS: readonly PosLaudoPotencialConclusao[] = [
  "nao",
  "potencialmente",
  "sim",
  "depende_complementacao",
];

/**
 * Reavalia pos_laudo_ciclos.rascunho_complementacao a partir das
 * classificações dos pontos do ciclo. É PURA SINALIZAÇÃO VISUAL: fica true
 * quando algum ponto foi classificado como "necessidade_complementacao" e
 * false caso contrário. Esta flag NUNCA é lida como condição de fluxo — não
 * força a criação de uma Complementação nem bloqueia o caminho de
 * Esclarecimentos. A decisão continua sendo da perita; o sistema só sugere.
 */
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function recomputarRascunhoComplementacao(
  supabase: SupabaseServer,
  cicloId: string,
): Promise<void> {
  const { data: pontos } = await supabase
    .from("pos_laudo_pontos")
    .select("classificacao_triagem")
    .eq("ciclo_id", cicloId);
  const sugere = (pontos ?? []).some(
    (p) => p.classificacao_triagem === "necessidade_complementacao",
  );
  await supabase
    .from("pos_laudo_ciclos")
    .update({ rascunho_complementacao: sugere })
    .eq("id", cicloId);
}

/** Campo de ciclo "a manifestação pode modificar a conclusão?" (triagem). */
export async function salvarTriagemCiclo(input: {
  cicloId: string;
  processoId: string;
  podeModificarConclusao: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const valor: PosLaudoPotencialConclusao | null =
    input.podeModificarConclusao &&
    (POTENCIAL_VALIDAS as readonly string[]).includes(input.podeModificarConclusao)
      ? (input.podeModificarConclusao as PosLaudoPotencialConclusao)
      : null;

  const { error } = await supabase
    .from("pos_laudo_ciclos")
    .update({ pode_modificar_conclusao: valor })
    .eq("id", input.cicloId)
    .eq("processo_id", input.processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

/** Cria um ponto em branco no fim da matriz do ciclo. */
export async function adicionarPonto(cicloId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: ultimo, error: erroUltimo } = await supabase
    .from("pos_laudo_pontos")
    .select("ordem")
    .eq("ciclo_id", cicloId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) return { error: erroUltimo.message };

  const insert: PosLaudoPontosInsert = {
    ciclo_id: cicloId,
    ordem: (ultimo?.ordem ?? 0) + 1,
  };
  const { error } = await supabase.from("pos_laudo_pontos").insert(insert);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

/** Salva os campos de triagem de um ponto e reavalia rascunho_complementacao do ciclo. */
export async function salvarPonto(input: {
  pontoId: string;
  cicloId: string;
  processoId: string;
  origemPonto: string | null;
  tema: string | null;
  sinteseAlegacao: string | null;
  jaAbordadoNoLaudo: boolean | null;
  referenciaLaudo: string | null;
  classificacaoTriagem: string | null;
  fundamentacaoAdicional: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const classificacao: PosLaudoClassificacaoTriagem | null =
    input.classificacaoTriagem &&
    (CLASSIFICACAO_VALIDAS as readonly string[]).includes(input.classificacaoTriagem)
      ? (input.classificacaoTriagem as PosLaudoClassificacaoTriagem)
      : null;

  const { error } = await supabase
    .from("pos_laudo_pontos")
    .update({
      origem_ponto: input.origemPonto,
      tema: input.tema,
      sintese_alegacao: input.sinteseAlegacao,
      ja_abordado_no_laudo: input.jaAbordadoNoLaudo,
      referencia_laudo: input.referenciaLaudo,
      classificacao_triagem: classificacao,
      fundamentacao_adicional: input.fundamentacaoAdicional,
    })
    .eq("id", input.pontoId)
    .eq("ciclo_id", input.cicloId);
  if (error) return { error: error.message };

  await recomputarRascunhoComplementacao(supabase, input.cicloId);

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

/** Remove um ponto (e, por cascade, suas evidências) e reavalia rascunho_complementacao. */
export async function removerPonto(
  pontoId: string,
  cicloId: string,
  processoId: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("pos_laudo_pontos")
    .delete()
    .eq("id", pontoId)
    .eq("ciclo_id", cicloId);
  if (error) return { error: error.message };

  await recomputarRascunhoComplementacao(supabase, cicloId);

  revalidatePath(`/processos/${processoId}/pos-laudo/${cicloId}`);
  return { success: true };
}

/** Vincula um documento já anexado ao processo como evidência de um ponto. */
export async function vincularEvidencia(input: {
  pontoId: string;
  cicloId: string;
  processoId: string;
  documentoId: string;
  observacao: string | null;
}): Promise<ActionResult> {
  if (!input.documentoId) return { error: "Escolha um documento." };
  const supabase = await createClient();

  const { error } = await supabase.from("pos_laudo_ponto_evidencias").insert({
    ponto_id: input.pontoId,
    documento_id: input.documentoId,
    observacao: input.observacao,
  });
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}

/** Desvincula uma evidência de um ponto. */
export async function desvincularEvidencia(input: {
  evidenciaId: string;
  cicloId: string;
  processoId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pos_laudo_ponto_evidencias")
    .delete()
    .eq("id", input.evidenciaId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/pos-laudo/${input.cicloId}`);
  return { success: true };
}
