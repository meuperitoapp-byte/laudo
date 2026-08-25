"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DocumentosInsert, DocumentosUpdate } from "@/types/database";
import type { TipoDocumento } from "@/types/enums";
import { BUCKET_DOCUMENTOS, TAMANHO_MAXIMO_BYTES } from "./constants";

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

/** Troca acentos/espaços/símbolos por algo seguro pra virar parte de um storage_path. */
function sanitizarNomeArquivo(nome: string): string {
  const semAcento = nome.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return semAcento.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/**
 * Upload de um documento/imagem vinculado ao processo (CLAUDE.md > Fluxo
 * aprovado, item 9). Sobe o arquivo pro Storage primeiro; se o insert na
 * tabela `documentos` falhar depois, desfaz o upload pra não deixar arquivo
 * órfão no bucket.
 */
export async function uploadDocumento(processoId: string, formData: FormData): Promise<ActionResult> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return { error: "Arquivo maior que 25MB — não é possível enviar." };
  }

  const tipo = formData.get("tipo") as TipoDocumento | null;
  if (tipo !== "documento_processual" && tipo !== "imagem_pericia") {
    return { error: "Selecione o tipo do documento." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = `${processoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizarNomeArquivo(arquivo.name)}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, arquivo, { contentType: arquivo.type || undefined });
  if (erroUpload) {
    return { error: `Erro ao enviar o arquivo: ${erroUpload.message}` };
  }

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
    nome_arquivo: arquivo.name,
    storage_path: path,
    mime_type: arquivo.type || null,
    tamanho_bytes: arquivo.size,
    ordem: (ultimo?.ordem ?? 0) + 1,
    ilegivel_insuficiente: formData.get("ilegivel_insuficiente") === "on",
    observacao: textoOuNull(formData.get("observacao")),
    categoria: textoOuNull(formData.get("categoria")),
    origem_profissional: textoOuNull(formData.get("origem_profissional")),
    data_documento: textoOuNull(formData.get("data_documento")),
    paginas: numeroOuNull(formData.get("paginas")),
    enviado_por: user?.id ?? null,
  };

  const { error: erroInsert } = await supabase.from("documentos").insert(insert);
  if (erroInsert) {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove([path]);
    return { error: erroInsert.message };
  }

  revalidatePath(`/processos/${processoId}/documentos`);
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
