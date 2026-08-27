import { createClient } from "@/lib/supabase/server";
import { BUCKET_DOCUMENTOS } from "@/features/documentos/constants";
import { lerDimensoesImagem } from "./dimensoes-imagem";
import type { AtivoImagem } from "./ativos-globais";
import type { ImagemPericiaRef } from "./modelo";

/**
 * Baixa os bytes das imagens da perícia (documentos.tipo = 'imagem_pericia')
 * pra embutir de verdade no documento final — CLAUDE.md item 9 ("Upload de
 * imagens da perícia e documentos, mantendo ordem"). Mesmo padrão de
 * ativos-globais.ts (baixarAtivo), só que por processo em vez de global —
 * por isso não entra em AtivosGlobais.
 *
 * Fica de fora de ModeloLaudo (compilar.ts só guarda a referência leve,
 * ImagemPericiaRef) de propósito: o modelo é serializado como JSON na tela
 * de debug ("Ver conteúdo compilado") — bytes binários ali quebrariam ou
 * incharia a prévia à toa. Os bytes só existem no momento de renderizar de
 * verdade (gerarLaudo, ver actions.ts), igual assinatura/logomarca.
 *
 * Download que falha (arquivo removido do Storage, formato não suportado
 * pra medir) não derruba a geração inteira — a imagem só fica de fora do
 * documento final, silenciosamente, em vez de travar tudo por causa de um
 * anexo problemático.
 */
export interface ImagemPericiaEmbutida extends AtivoImagem {
  nomeArquivo: string;
}

export async function baixarImagensPericia(refs: ImagemPericiaRef[]): Promise<ImagemPericiaEmbutida[]> {
  if (refs.length === 0) return [];
  const supabase = await createClient();

  const resultados = await Promise.all(
    refs.map(async (ref): Promise<ImagemPericiaEmbutida | null> => {
      const { data: arquivo, error } = await supabase.storage.from(BUCKET_DOCUMENTOS).download(ref.storagePath);
      if (error || !arquivo) return null;

      const mimeType = arquivo.type || "image/jpeg";
      const bytes = Buffer.from(await arquivo.arrayBuffer());
      const dimensoes = lerDimensoesImagem(bytes, mimeType);
      if (!dimensoes) return null; // formato não suportado pra medir (só PNG/JPEG) — melhor não embutir do que embutir distorcido

      return { nomeArquivo: ref.nomeArquivo, bytes, mimeType, larguraPx: dimensoes.larguraPx, alturaPx: dimensoes.alturaPx };
    })
  );

  return resultados.filter((r): r is ImagemPericiaEmbutida => r !== null);
}
