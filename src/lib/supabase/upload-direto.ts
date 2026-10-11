import { createClient } from "./client";

/**
 * Upload direto do navegador pro Supabase Storage — usado por toda tela que
 * anexa arquivo de tamanho arbitrário (Documentos, anexo de etapa da AT,
 * documentos supervenientes do Pós-Laudo, Chat).
 *
 * Por que não mandar o arquivo dentro da Server Action: na Vercel, toda
 * requisição pra uma function tem teto fixo de 4,5MB de corpo, que NÃO é
 * configurável (o `bodySizeLimit` do next.config.ts só vale pro `next
 * start` local). Bug real (11/10/2026, relato dela): orçamento em PDF com
 * fotos passava de 4,5MB e a tela inteira quebrava com "This page couldn't
 * load", sem chegar no Supabase. Subindo direto daqui, o arquivo nunca passa
 * pela Vercel — a Server Action só recebe os metadados (caminho, nome, tipo,
 * tamanho) depois que o arquivo já está no bucket. As policies de
 * storage.objects já liberam `authenticated` nos buckets usados.
 *
 * Se o registro falhar, quem desfaz o upload é a própria Server Action (ela
 * sabe se chegou a gravar a linha) — o navegador nunca apaga por conta
 * própria, pra não remover um arquivo que já ficou registrado.
 */

export interface ArquivoEnviado {
  path: string;
  nome: string;
  tipo: string | null;
  tamanho: number;
}

/** Troca acentos/espaços/símbolos por algo seguro pra virar parte de um storage_path. */
export function sanitizarNomeArquivo(nome: string): string {
  const semAcento = nome.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return semAcento.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/** `prefixo` sem barra no fim (ex.: o id do processo) ou vazio pra raiz do bucket. */
export async function enviarArquivoDireto(
  bucket: string,
  prefixo: string,
  arquivo: File,
): Promise<{ error: string } | { arquivo: ArquivoEnviado }> {
  const nomeSeguro = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizarNomeArquivo(arquivo.name)}`;
  const path = prefixo ? `${prefixo}/${nomeSeguro}` : nomeSeguro;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arquivo, { contentType: arquivo.type || undefined });
  if (error) {
    return { error: `Erro ao enviar o arquivo: ${error.message}` };
  }
  return { arquivo: { path, nome: arquivo.name, tipo: arquivo.type || null, tamanho: arquivo.size } };
}

/**
 * Coloca os metadados do arquivo já enviado no FormData e TIRA o `File` dele
 * — senão o arquivo continuaria indo inteiro no corpo da Server Action.
 */
export function anexarMetadadosArquivo(formData: FormData, arquivo: ArquivoEnviado): void {
  formData.delete("arquivo");
  formData.set("arquivo_path", arquivo.path);
  formData.set("arquivo_nome", arquivo.nome);
  formData.set("arquivo_tipo", arquivo.tipo ?? "");
  formData.set("arquivo_tamanho", String(arquivo.tamanho));
}

/** Lado servidor: lê de volta o que `anexarMetadadosArquivo` colocou. `null` se faltar algo. */
export function lerMetadadosArquivo(formData: FormData): ArquivoEnviado | null {
  const path = (formData.get("arquivo_path") as string | null)?.trim();
  const nome = (formData.get("arquivo_nome") as string | null)?.trim();
  const tamanho = Number(formData.get("arquivo_tamanho"));
  if (!path || !nome || !Number.isFinite(tamanho) || tamanho <= 0) return null;
  const tipo = (formData.get("arquivo_tipo") as string | null)?.trim() || null;
  return { path, nome, tipo, tamanho };
}
