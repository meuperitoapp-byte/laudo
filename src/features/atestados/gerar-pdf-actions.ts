"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { compilarAtestado } from "./compilar-pdf";
import { TITULO_TIPO_DOCUMENTO } from "./catalogos";
import { renderizarDocx } from "@/features/geracao-laudo/renderizar-docx";
import { renderizarPdf } from "@/features/geracao-laudo/renderizar-pdf";
import { buscarAtivosGlobais } from "@/features/geracao-laudo/ativos-globais";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import type { LaudosGeradosInsert } from "@/types/database";
import type { AtestadoTipoDocumento } from "@/types/enums";

type ActionResult = { error: string } | { success: true; versao: number };

/** Gera uma nova versão do PDF/Word do Atestado/Declaração — mesmo padrão de gerarAnaliseViabilidadePdf (viabilidade/gerar-pdf-actions.ts). */
export async function gerarAtestadoPdf(
  processoId: string,
  atestadoId: string,
  tipoDocumento: AtestadoTipoDocumento,
): Promise<ActionResult> {
  const resultado = await compilarAtestado(processoId, atestadoId);
  if (resultado.status === "erro") {
    return { error: resultado.mensagem };
  }

  const ativos = await buscarAtivosGlobais();
  const [bufferDocx, bufferPdf] = await Promise.all([
    renderizarDocx(resultado.modelo, ativos),
    renderizarPdf(resultado.modelo, ativos),
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
  if (erroUltimo) return { error: erroUltimo.message };
  const versao = (ultimo?.versao ?? 0) + 1;

  const prefixo = tipoDocumento === "declaracao" ? "declaracao" : "atestado";
  const caminhoPdf = `${processoId}/${prefixo}-v${versao}.pdf`;
  const caminhoDocx = `${processoId}/${prefixo}-v${versao}.docx`;

  const [uploadPdf, uploadDocx] = await Promise.all([
    supabase.storage.from(BUCKET_LAUDOS_GERADOS).upload(caminhoPdf, bufferPdf, { contentType: "application/pdf" }),
    supabase.storage.from(BUCKET_LAUDOS_GERADOS).upload(caminhoDocx, bufferDocx, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  ]);
  if (uploadPdf.error || uploadDocx.error) {
    await Promise.all([
      uploadPdf.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf]),
      uploadDocx.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoDocx]),
    ]);
    return { error: `Erro ao salvar os arquivos: ${uploadPdf.error?.message ?? uploadDocx.error?.message}` };
  }

  const insert: LaudosGeradosInsert = {
    processo_id: processoId,
    versao,
    tipo: tipoDocumento,
    titulo: TITULO_TIPO_DOCUMENTO[tipoDocumento],
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

  revalidatePath(`/processos/${processoId}`);
  return { success: true, versao };
}
