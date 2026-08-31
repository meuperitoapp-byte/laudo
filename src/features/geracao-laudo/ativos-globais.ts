import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_DOCUMENTOS } from "@/features/documentos/constants";
import { lerDimensoesImagem } from "./dimensoes-imagem";

/**
 * Assinatura da perita e logomarca da cliente (documentos.tipo =
 * 'assinatura_perito' / 'logomarca', processo_id NULL — assets globais da
 * conta, CLAUDE.md > Fluxo aprovado, itens 10-11).
 *
 * Reaproveita o bucket `documentos-processos` (sob um prefixo `_global/`,
 * quando algo for gravado ali) em vez de criar bucket próprio agora —
 * decisão pragmática: ainda NÃO existe nenhuma tela de upload pra esses
 * assets (fica pra "Configurações", como já combinado na etapa de
 * Documentos), então criar um bucket sem nada que escreva nele seria
 * prematuro. Sem essa tela, as duas buscas abaixo sempre voltam null hoje —
 * a mecânica de baixar e embutir já fica pronta pra quando a tela existir;
 * só o "de onde vem o upload" falta.
 */

export interface AtivoImagem {
  bytes: Buffer;
  mimeType: string;
  larguraPx: number;
  alturaPx: number;
}

export interface AtivosGlobais {
  assinatura: AtivoImagem | null;
  logomarca: AtivoImagem | null;
}

async function baixarAtivo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tipo: "assinatura_perito" | "logomarca"
): Promise<AtivoImagem | null> {
  const { data: doc } = await supabase
    .from("documentos")
    .select("storage_path, mime_type")
    .is("processo_id", null)
    .eq("tipo", tipo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!doc || !doc.mime_type?.startsWith("image/")) return null;

  const { data: arquivo, error } = await supabase.storage.from(BUCKET_DOCUMENTOS).download(doc.storage_path);
  if (error || !arquivo) return null;

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const dimensoes = lerDimensoesImagem(bytes, doc.mime_type);
  if (!dimensoes) return null; // formato não suportado pra medir (só PNG/JPEG) — melhor não embutir do que embutir distorcido

  return { bytes, mimeType: doc.mime_type, larguraPx: dimensoes.larguraPx, alturaPx: dimensoes.alturaPx };
}

/**
 * Fallback de arquivo pra logomarca: enquanto não há tela de upload, basta
 * colocar `public/branding/logomarca.png` (ou `.jpg`) na raiz do projeto que
 * ele entra no cabeçalho de toda página do laudo. Um registro em
 * `documentos` (tipo 'logomarca', processo_id NULL) tem prioridade sobre
 * este arquivo, quando a tela de Configurações existir.
 */
function lerLogomarcaDoArquivo(): AtivoImagem | null {
  const candidatos: { arquivo: string; mimeType: string }[] = [
    { arquivo: "logomarca.png", mimeType: "image/png" },
    { arquivo: "logomarca.jpg", mimeType: "image/jpeg" },
    { arquivo: "logomarca.jpeg", mimeType: "image/jpeg" },
  ];
  for (const { arquivo, mimeType } of candidatos) {
    const caminho = path.join(process.cwd(), "public", "branding", arquivo);
    let bytes: Buffer;
    try {
      bytes = fs.readFileSync(caminho);
    } catch {
      continue;
    }
    const dimensoes = lerDimensoesImagem(bytes, mimeType);
    if (!dimensoes) continue;
    return { bytes, mimeType, larguraPx: dimensoes.larguraPx, alturaPx: dimensoes.alturaPx };
  }
  return null;
}

export async function buscarAtivosGlobais(): Promise<AtivosGlobais> {
  const supabase = await createClient();
  const [assinatura, logomarcaBanco] = await Promise.all([
    baixarAtivo(supabase, "assinatura_perito"),
    baixarAtivo(supabase, "logomarca"),
  ]);
  return { assinatura, logomarca: logomarcaBanco ?? lerLogomarcaDoArquivo() };
}
