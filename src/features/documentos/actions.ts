"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DocumentosInsert, DocumentosUpdate } from "@/types/database";
import type { TipoDocumento } from "@/types/enums";
import { lerMetadadosArquivo } from "@/lib/supabase/upload-direto";
import { BUCKET_DOCUMENTOS } from "./constants";

type ActionResult = { error: string } | { success: true };

function textoOuNull(valor: FormDataEntryValue | null): string | null {
  const texto = (valor as string | null)?.trim();
  return texto ? texto : null;
}

function numeroOuNull(valor: FormDataEntryValue | null): number | null {
  const texto = (valor as string | null)?.trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Registra um documento/imagem vinculado ao processo (CLAUDE.md > Fluxo
 * aprovado, item 9). O arquivo já subiu direto do navegador pro Storage
 * (ver src/lib/supabase/upload-direto.ts — o corpo de uma Server Action na
 * Vercel não passa de 4,5MB); aqui só chegam os metadados. Se o insert na
 * tabela `documentos` falhar, desfaz o upload pra não deixar arquivo órfão
 * no bucket.
 */
export async function uploadDocumento(processoId: string, formData: FormData): Promise<ActionResult> {
  const arquivo = lerMetadadosArquivo(formData);
  if (!arquivo) {
    return { error: "Selecione um arquivo." };
  }
  // O caminho vem do navegador — só aceita dentro da pasta deste processo.
  if (!arquivo.path.startsWith(`${processoId}/`)) {
    return { error: "Caminho de arquivo inválido." };
  }
  const path = arquivo.path;

  const supabase = await createClient();

  const tipo = formData.get("tipo") as TipoDocumento | null;
  if (tipo !== "documento_processual" && tipo !== "imagem_pericia") {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove([path]);
    return { error: "Selecione o tipo do documento." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ultimo } = await supabase
    .from("documentos")
    .select("ordem")
    .eq("processo_id", processoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const insert: DocumentosInsert = {
    processo_id: processoId,
    tipo,
    nome_arquivo: arquivo.nome,
    storage_path: path,
    mime_type: arquivo.tipo,
    tamanho_bytes: arquivo.tamanho,
    ordem: (ultimo?.ordem ?? 0) + 1,
    ilegivel_insuficiente: formData.get("ilegivel_insuficiente") === "on",
    observacao: textoOuNull(formData.get("observacao")),
    categoria: textoOuNull(formData.get("categoria")),
    origem_profissional: textoOuNull(formData.get("origem_profissional")),
    data_documento: textoOuNull(formData.get("data_documento")),
    paginas: numeroOuNull(formData.get("paginas")),
    enviado_por: user?.id ?? null,
    // Só Assistência Técnica (ver migration 20260922120000) — marca que este
    // documento pertence a uma etapa contratada específica (ex.: o anexo da
    // "Análise da contestação"). Independente de `categoria`.
    etapa_at: textoOuNull(formData.get("etapa_at")),
  };

  const { error: erroInsert } = await supabase.from("documentos").insert(insert);
  if (erroInsert) {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove([path]);
    return { error: erroInsert.message };
  }

  revalidatePath(`/processos/${processoId}/documentos`);
  // Documento pode aparecer também no painel de etapa da tela do processo
  // (AnexoEtapaAtPanel) quando `etapa_at` está preenchido.
  revalidatePath(`/processos/${processoId}`);
  return { success: true };
}

/**
 * Atualiza os metadados de um documento já enviado (não troca o arquivo em
 * si). `ilegivel_insuficiente` sem `observacao` é permitido salvar — o
 * alerta "documento ilegível/insuficiente sem observação justificando"
 * (CLAUDE.md) é um aviso de interface, não um bloqueio (mesma decisão já
 * registrada no comentário de documentos.ilegivel_insuficiente na migration
 * do schema inicial: "o fluxo permite salvar rascunho sem observação ainda
 * preenchida").
 */
export async function atualizarDocumento(input: {
  documentoId: string;
  processoId: string;
  tipo: TipoDocumento;
  categoria: string | null;
  origemProfissional: string | null;
  dataDocumento: string | null;
  paginas: number | null;
  ilegivelInsuficiente: boolean;
  observacao: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const update: DocumentosUpdate = {
    tipo: input.tipo,
    categoria: input.categoria,
    origem_profissional: input.origemProfissional,
    data_documento: input.dataDocumento,
    paginas: input.paginas,
    ilegivel_insuficiente: input.ilegivelInsuficiente,
    observacao: input.observacao,
  };

  const { error } = await supabase.from("documentos").update(update).eq("id", input.documentoId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/processos/${input.processoId}/documentos`);
  return { success: true };
}

/** Remove o documento do banco E do Storage (nessa ordem: Storage primeiro, banco depois). */
export async function excluirDocumento(documentoId: string, processoId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: documento, error: erroBusca } = await supabase
    .from("documentos")
    .select("storage_path")
    .eq("id", documentoId)
    .single();
  if (erroBusca || !documento) {
    return { error: erroBusca?.message ?? "Documento não encontrado." };
  }

  const { error: erroStorage } = await supabase.storage.from(BUCKET_DOCUMENTOS).remove([documento.storage_path]);
  if (erroStorage) {
    return { error: `Erro ao remover o arquivo do Storage: ${erroStorage.message}` };
  }

  const { error: erroDelete } = await supabase.from("documentos").delete().eq("id", documentoId);
  if (erroDelete) {
    return { error: erroDelete.message };
  }

  revalidatePath(`/processos/${processoId}/documentos`);
  revalidatePath(`/processos/${processoId}`);
  return { success: true };
}

/**
 * Move um documento uma posição pra cima/baixo, trocando `ordem` com o
 * vizinho — mesmo padrão de src/features/quesitos/actions.ts (moverQuesito):
 * relê a lista do banco na hora, pra não desalinhar se a perita e a
 * secretária mexerem ao mesmo tempo.
 */
export async function moverDocumento(input: {
  processoId: string;
  documentoId: string;
  direcao: "cima" | "baixo";
}): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: lista, error: erroLista } = await supabase
    .from("documentos")
    .select("id, ordem")
    .eq("processo_id", input.processoId)
    .order("ordem", { ascending: true });
  if (erroLista) {
    return { error: erroLista.message };
  }
  if (!lista) {
    return { success: true };
  }

  const index = lista.findIndex((d) => d.id === input.documentoId);
  if (index === -1) {
    return { error: "Documento não encontrado — a lista pode ter mudado, recarregue a página." };
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
    supabase.from("documentos").update({ ordem: ordemAlvo }).eq("id", atual.id),
    supabase.from("documentos").update({ ordem: ordemAtual }).eq("id", alvo.id),
  ]);
  if (erro1) return { error: erro1.message };
  if (erro2) return { error: erro2.message };

  revalidatePath(`/processos/${input.processoId}/documentos`);
  return { success: true };
}
