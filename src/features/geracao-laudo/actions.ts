"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { compilarLaudo } from "./compilar";
import { renderizarDocx } from "./renderizar-docx";
import { renderizarPdf } from "./renderizar-pdf";
import { buscarAtivosGlobais } from "./ativos-globais";
import { baixarImagensPericia } from "./imagens-pericia";
import type { LaudosGeradosInsert } from "@/types/database";
import { BUCKET_LAUDOS_GERADOS } from "./constants";

type ActionResult = { error: string } | { success: true; versao: number };

/**
 * Gera uma nova versão do laudo final: compila (mesma função que alimenta os
 * links de prévia), renderiza PDF + Word do MESMO modelo, sobe os dois pro
 * Storage e grava a linha em `laudos_gerados` com o snapshot congelado.
 * `versao` é sempre a maior já usada pro processo + 1 — nunca sobrescreve
 * uma versão anterior (CLAUDE.md: editar respostas depois não pode alterar
 * retroativamente uma versão já gerada/entregue).
 */
export async function gerarLaudo(processoId: string): Promise<ActionResult> {
  const resultado = await compilarLaudo(processoId);

  if (resultado.status === "erro") {
    return { error: resultado.mensagem };
  }
  if (resultado.status === "pendente_revisao") {
    const titulos = resultado.secoesPendentes.map((s) => s.titulo).join(", ");
    return { error: `Geração bloqueada — seções ainda não revisadas: ${titulos}.` };
  }
  if (resultado.status === "campos_obrigatorios") {
    const itens = resultado.camposFaltando.map((c) => `${c.secaoTitulo} → ${c.campoRotulo}`).join("; ");
    return { error: `Geração bloqueada — campos obrigatórios não preenchidos: ${itens}.` };
  }

  const [ativos, imagensPericia] = await Promise.all([
    buscarAtivosGlobais(),
    baixarImagensPericia(resultado.modelo.imagensPericia),
  ]);
  const [bufferDocx, bufferPdf] = await Promise.all([
    renderizarDocx(resultado.modelo, ativos, imagensPericia),
    renderizarPdf(resultado.modelo, ativos, imagensPericia),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ultimo, error: erroUltimo } = await supabase
    .from("laudos_gerados")
    .select("versao")
    .eq("processo_id", processoId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (erroUltimo) {
    return { error: erroUltimo.message };
  }
  const versao = (ultimo?.versao ?? 0) + 1;

  const caminhoPdf = `${processoId}/v${versao}.pdf`;
  const caminhoDocx = `${processoId}/v${versao}.docx`;

  const [uploadPdf, uploadDocx] = await Promise.all([
    supabase.storage.from(BUCKET_LAUDOS_GERADOS).upload(caminhoPdf, bufferPdf, { contentType: "application/pdf" }),
    supabase.storage.from(BUCKET_LAUDOS_GERADOS).upload(caminhoDocx, bufferDocx, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  ]);

  if (uploadPdf.error || uploadDocx.error) {
    // Desfaz o que subiu com sucesso, pra não deixar arquivo órfão no Storage.
    await Promise.all([
      uploadPdf.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf]),
      uploadDocx.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoDocx]),
    ]);
    return { error: `Erro ao salvar os arquivos: ${uploadPdf.error?.message ?? uploadDocx.error?.message}` };
  }

  const insert: LaudosGeradosInsert = {
    processo_id: processoId,
    versao,
    tipo: "laudo", // explícito, não depende do default da coluna (ver migration 20260905120000)
    storage_path_pdf: caminhoPdf,
    storage_path_docx: caminhoDocx,
    snapshot_respostas: resultado.snapshot,
    gerado_por: user?.id ?? null,
  };

  const { error: erroInsert } = await supabase.from("laudos_gerados").insert(insert);
  if (erroInsert) {
    await supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf, caminhoDocx]);
    return { error: erroInsert.message };
  }

  revalidatePath(`/processos/${processoId}/laudo`);
  return { success: true, versao };
}

/**
 * Marca uma versão do laudo (tipo = 'laudo') como PROTOCOLADA nos autos.
 * É a pré-condição do Módulo Pós-Laudo — a aba "Pós-laudo" só aparece quando
 * existe um laudo protocolado, e o ciclo se ancora nele (laudo_base_id).
 *
 * A partir daqui o conteúdo dessa versão fica congelado pelo trigger
 * trg_laudos_gerados_congela (arquivo, snapshot, tipo, versao, titulo,
 * paginas, ...): NÃO há como desfazer, nem a marcação, nem o conteúdo. Só
 * protocolo_id / protocolado_em seguem corrigíveis. Por isso a UI exige
 * confirmação explícita num diálogo antes de chamar esta ação.
 *
 * Só age em linha tipo = 'laudo' ainda não protocolada; se 0 linhas baterem,
 * devolve erro (id inexistente, já protocolada, ou não é o laudo principal).
 */
export async function marcarLaudoProtocolado(
  laudoGeradoId: string,
  processoId: string,
  protocoloId: string | null,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("laudos_gerados")
    .update({
      protocolado: true,
      protocolado_em: new Date().toISOString(),
      protocolo_id: protocoloId,
    })
    .eq("id", laudoGeradoId)
    .eq("processo_id", processoId)
    .eq("tipo", "laudo")
    .eq("protocolado", false)
    .select("id");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return {
      error:
        "Não foi possível marcar como protocolado — a versão não existe, já está protocolada, ou não é o laudo principal.",
    };
  }

  revalidatePath(`/processos/${processoId}/laudo`);
  revalidatePath(`/processos/${processoId}`);
  return { success: true };
}
