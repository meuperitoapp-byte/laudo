"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_DOCUMENTOS } from "@/features/documentos/constants";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import type { ProcessosInsert, ProcessosUpdate } from "@/types/database";
import type {
  AceitouNomeacao,
  EtapaContratada,
  JusticaGratuita,
  NotaFiscalEmitida,
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
const ACEITOU_NOMEACAO_VALORES: readonly AceitouNomeacao[] = ["sim", "nao", "destituida", "encargo_declinado"];

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
    escritorio_indicacao: optionalText(formData, "escritorio_indicacao"),
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
    insert.orgao_classe = optionalText(formData, "orgao_classe");
    insert.honorarios_forma_pagamento = optionalText(formData, "honorarios_forma_pagamento");
    insert.honorarios_vencimento = optionalText(formData, "honorarios_vencimento");
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
    // "status" (em_andamento/finalizado/arquivado) não é mais editado pela UI —
    // foi substituído por situacao_processo (ver catalogos.ts). A coluna fica
    // como está (default 'em_andamento'), sem sobrescrever, só pra não perder
    // o histórico de quem já tinha um valor diferente.
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
    update.orgao_classe = optionalText(formData, "orgao_classe");
    update.honorarios_forma_pagamento = optionalText(formData, "honorarios_forma_pagamento");
    update.honorarios_vencimento = optionalText(formData, "honorarios_vencimento");
  }

  const { error } = await supabase.from("processos").update(update).eq("id", processoId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/processos/${processoId}`);
  revalidatePath(`/processos/${processoId}/editar`);
  redirect(`/processos/${processoId}`);
}

/**
 * Exclusão real e definitiva do processo — sem desfazer. Todas as tabelas
 * que referenciam `processos` já têm `on delete cascade` no banco (ver
 * migrations 20260821120000, 20260823110000, 20260827100000,
 * 20260905120000) — documentos, respostas, quesitos, partes e todo o
 * histórico de pós-laudo somem junto, sem linha órfã.
 *
 * O que o cascade NÃO alcança é o Storage (arquivos são bytes fora do
 * banco) — por isso a limpeza de `documentos`/`laudos_gerados` roda ANTES
 * do delete, lendo os caminhos enquanto as linhas ainda existem. Erro de
 * Storage não bloqueia a exclusão do registro: um arquivo órfão é um
 * problema bem menor que não conseguir excluir um processo.
 */
const MENSAGEM_BLOQUEIO_PROTOCOLADO =
  "Este processo tem documento protocolado nos autos (laudo, esclarecimentos, ou saída do Fluxo Principal) e por isso não pode ser excluído — documento protocolado é registro oficial já entregue, não pode simplesmente sumir do histórico.";

export async function excluirProcesso(processoId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Checado ANTES de mexer em qualquer coisa — nem limpa Storage nem tenta
  // apagar se já se sabe que vai bloquear. Cobre TODO documento protocolado
  // do processo (laudo principal, pós-laudo, Fluxo Principal), não só o que
  // o trigger do banco (trg_pos_laudo_ciclo_bloqueia_delete_com_protocolo)
  // enxerga — esse trigger só olha ciclos de pós-laudo, então um laudo
  // principal protocolado sem nenhum ciclo aberto passaria batido por ele.
  const { count: totalProtocolados } = await supabase
    .from("laudos_gerados")
    .select("id", { count: "exact", head: true })
    .eq("processo_id", processoId)
    .eq("protocolado", true);
  if (totalProtocolados && totalProtocolados > 0) {
    return { error: MENSAGEM_BLOQUEIO_PROTOCOLADO };
  }

  const [{ data: documentosDb }, { data: laudosDb }] = await Promise.all([
    supabase.from("documentos").select("storage_path").eq("processo_id", processoId),
    supabase.from("laudos_gerados").select("storage_path_pdf, storage_path_docx").eq("processo_id", processoId),
  ]);

  const caminhosDocumentos = (documentosDb ?? [])
    .map((d) => d.storage_path)
    .filter((p): p is string => Boolean(p));
  const caminhosLaudos = (laudosDb ?? [])
    .flatMap((l) => [l.storage_path_pdf, l.storage_path_docx])
    .filter((p): p is string => Boolean(p));

  if (caminhosDocumentos.length > 0) {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove(caminhosDocumentos);
  }
  if (caminhosLaudos.length > 0) {
    await supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove(caminhosLaudos);
  }

  const { error } = await supabase.from("processos").delete().eq("id", processoId);
  if (error) {
    // Rede de segurança: se o trigger do banco disparar por algum caminho
    // que o pré-check acima não previu, a Dra. Fernanda nunca vê a exceção
    // crua do Postgres (nome de tabela interna, UUID) — só a explicação em
    // linguagem clara.
    if (error.message.includes("protocolado")) {
      return { error: MENSAGEM_BLOQUEIO_PROTOCOLADO };
    }
    return { error: error.message };
  }

  revalidatePath("/processos");
  revalidatePath("/hoje");
  redirect("/processos");
}

/**
 * "Documentos pendentes" (Central de Prazos, fatia 3) — estado do caso,
 * independente de `situacao_processo` (convive com qualquer etapa).
 * `em: null` marca como recebido/resolvido: limpa os dois campos de uma vez,
 * nunca deixa a descrição órfã apontando pra uma solicitação que já foi
 * atendida. Preenchida e limpa manualmente por ela — nunca inferida, não
 * existe evento no sistema que prove chegada de documento.
 */
export async function salvarDocumentosSolicitados(
  processoId: string,
  em: string | null,
  descricao: string | null,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const dados: ProcessosUpdate = em
    ? { documentos_solicitados_em: em, documentos_solicitados_descricao: descricao }
    : { documentos_solicitados_em: null, documentos_solicitados_descricao: null };

  const { error } = await supabase.from("processos").update(dados).eq("id", processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/hoje");
  return { success: true };
}

/**
 * "Próximo marco" de honorários (Perícia Judicial só) — mesmo padrão de
 * `salvarDocumentosSolicitados`: estado do caso, preenchido e limpo
 * manualmente por ela, nunca calculado (não existe fórmula de parcelamento
 * judicial). Guarda sempre o PRÓXIMO marco que falta, não um histórico —
 * `em: null` limpa os dois campos juntos, nunca deixa descrição órfã.
 */
export async function salvarProximoMarcoHonorarios(
  processoId: string,
  em: string | null,
  descricao: string | null,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const dados: ProcessosUpdate = em
    ? { honorarios_proximo_marco_em: em, honorarios_proximo_marco_descricao: descricao }
    : { honorarios_proximo_marco_em: null, honorarios_proximo_marco_descricao: null };

  const { error } = await supabase.from("processos").update(dados).eq("id", processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/hoje");
  return { success: true };
}

/**
 * Data da reunião de explicações técnicas com o advogado (Assistência
 * Técnica, etapa "Estratégia pericial") — item 2 do lote pós-Fase-2
 * (21/09/2026). Só a data (sem local/modalidade/participantes — não
 * pedido). Preenchida e limpa manualmente por ela; não alimenta a Central
 * de Prazos (não é prazo que vence, é registro do que já foi combinado).
 */
export async function salvarReuniaoEstrategiaPericial(
  processoId: string,
  data: string | null,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("processos")
    .update({ estrategia_pericial_reuniao_em: data })
    .eq("id", processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}`);
  return { success: true };
}

/** Pedido da Dra. Fernanda ao ver o Financeiro (19/09/2026): marcar se a nota fiscal foi emitida e o número. `numero` só faz sentido junto com `emitida === "sim"` — a UI (NotaFiscalPanel) garante isso, sem CHECK no banco. */
export async function salvarNotaFiscal(
  processoId: string,
  emitida: NotaFiscalEmitida,
  numero: string | null,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("processos")
    .update({ nota_fiscal_emitida: emitida, nota_fiscal_numero: numero })
    .eq("id", processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${processoId}`);
  return { success: true };
}
