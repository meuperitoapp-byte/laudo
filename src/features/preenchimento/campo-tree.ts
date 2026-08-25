import type { CamposSecaoRow } from "@/types/database";

/** Nó da árvore de campos de uma seção, agrupada por parent_campo_id (ex.:
 * sub-campos do exame físico por sistema). A visibilidade do nó em si é
 * controlada por `campo.condicao`, não pela posição na árvore. */
export interface NoCampo {
  campo: CamposSecaoRow;
  filhos: NoCampo[];
}

/** Monta a árvore ordenada (por `ordem`) a partir da lista plana de campos de UMA seção. */
export function construirArvoreCampos(campos: CamposSecaoRow[]): NoCampo[] {
  const porId = new Map(campos.map((c) => [c.id, c]));
  const filhosPorPai = new Map<string, CamposSecaoRow[]>();
  const raizes: CamposSecaoRow[] = [];

  for (const campo of campos) {
    if (campo.parent_campo_id && porId.has(campo.parent_campo_id)) {
      const lista = filhosPorPai.get(campo.parent_campo_id) ?? [];
      lista.push(campo);
      filhosPorPai.set(campo.parent_campo_id, lista);
    } else {
      raizes.push(campo);
    }
  }

  const porOrdem = (lista: CamposSecaoRow[]) => [...lista].sort((a, b) => a.ordem - b.ordem);
  const montar = (campo: CamposSecaoRow): NoCampo => ({
    campo,
    filhos: porOrdem(filhosPorPai.get(campo.id) ?? []).map(montar),
  });

  return porOrdem(raizes).map(montar);
}

/** Achata a árvore de volta pra uma lista plana de campos (raízes + descendentes). */
export function achatarArvoreCampos(nos: NoCampo[]): CamposSecaoRow[] {
  const resultado: CamposSecaoRow[] = [];
  const visitar = (lista: NoCampo[]) => {
    for (const no of lista) {
      resultado.push(no.campo);
      visitar(no.filhos);
    }
  };
  visitar(nos);
  return resultado;
}
