import type { TipoTrabalhoProcesso } from "@/types/enums";
import type { ConfiguracoesRow } from "@/types/database";

/**
 * Linha do rodapé (faixa de identidade) do documento final. É texto livre
 * guardado inteiro na tabela `configuracoes` — a Dra. Fernanda definiu o texto
 * exato de cada tipo e os dois formatos não seguem o mesmo template, então
 * nada é composto/pontuado por código: pega a string do tipo certo e usa
 * direto. Vazia (ou config ausente) → sem linha de rodapé (a faixa some se
 * também não houver logomarca).
 */
export function rodapeTexto(
  config: ConfiguracoesRow | null,
  tipoTrabalho: TipoTrabalhoProcesso,
): string | null {
  if (!config) return null;
  const texto =
    tipoTrabalho === "assistencia_tecnica" ? config.rodape_at_texto : config.rodape_judicial_texto;
  return texto?.trim() || null;
}
