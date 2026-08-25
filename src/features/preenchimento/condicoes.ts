import type { CondicaoVisibilidade, ValorSelecionado } from "@/types/json-fields";

/**
 * Um valor de resposta "dispara" um dos valores-gatilho? Cobre seleção única
 * (string) e seleção múltipla (string[]) — a regra de condicional do
 * CLAUDE.md só se aplica a campos de marcação, não a tabela/texto_livre.
 */
export function valorSatisfazGatilho(
  valor: ValorSelecionado | null | undefined,
  valoresGatilho: string[]
): boolean {
  if (!valor) return false;
  if (typeof valor === "string") return valoresGatilho.includes(valor);
  if (Array.isArray(valor)) {
    return valor.some((item) => typeof item === "string" && valoresGatilho.includes(item));
  }
  return false;
}

/**
 * Avalia uma `condicao` (secoes.condicao ou campos_secao.condicao) contra um
 * mapa de respostas atuais (codigo do campo -> valor_selecionado). Sem
 * condicao, é sempre visível.
 */
export function avaliarCondicao(
  condicao: CondicaoVisibilidade | null,
  valoresPorCodigo: Map<string, ValorSelecionado | null>
): boolean {
  if (!condicao) return true;
  return valorSatisfazGatilho(valoresPorCodigo.get(condicao.campo_codigo), condicao.valores_gatilho);
}
