/**
 * §7.2 — Campanhas automáticas: público sempre calculado, nunca digitado.
 * Reaproveita os cálculos já existentes (faixaContato, categoriaPorReceita,
 * calcularResumoSemestre) — esta função só agrupa em listas prontas pra
 * tela, sem introduzir nenhuma regra nova de elegibilidade.
 */
import { semestreDe, calcularResumoSemestre, type ProcessoVinculado } from "./ranking";
import { CATEGORIA_ROTULOS } from "./catalogos";
import type { RelacionamentosRow } from "@/types/database";
import type { RelacionamentoCategoria, RelacionamentoFaixaContato } from "@/types/enums";

export interface ItemCampanha {
  id: string;
  nome: string;
  detalhe: string | null;
}

export interface TopParceiroSemestre extends ItemCampanha {
  posicao: number;
  receitaSemestre: number;
  quantidadeServicos: number;
}

export interface CampanhasAutomaticas {
  fimDeAno: ItemCampanha[];
  topParceirosSemestre: { ano: number; semestre: 1 | 2; itens: TopParceiroSemestre[] };
  atencao: ItemCampanha[];
  esfriando: ItemCampanha[];
  reativacao: ItemCampanha[];
  meuPeritoPotencial: ItemCampanha[];
}

interface RelacionamentoCalculado {
  r: RelacionamentosRow;
  faixa: RelacionamentoFaixaContato;
  categoria: RelacionamentoCategoria | null;
  diasSemContato: number;
}

export function montarCampanhasAutomaticas(
  comCalculo: RelacionamentoCalculado[],
  processosPorRelacionamento: Map<string, ProcessoVinculado[]>,
  hojeIso: string,
): CampanhasAutomaticas {
  const fimDeAno = comCalculo
    .filter(({ categoria }) => categoria && categoria !== "sem_categoria")
    .map(({ r, categoria }) => ({ id: r.id, nome: r.nome, detalhe: categoria ? CATEGORIA_ROTULOS[categoria] : null }));

  const { ano, semestre } = semestreDe(hojeIso);
  const topParceirosSemestre = comCalculo
    .filter(({ r }) => r.tipo === "advogado_escritorio")
    .map(({ r }) => ({ r, resumo: calcularResumoSemestre(processosPorRelacionamento.get(r.id) ?? [], ano, semestre) }))
    .filter(({ resumo }) => resumo.receitaSemestre > 0)
    .sort((a, b) => b.resumo.receitaSemestre - a.resumo.receitaSemestre)
    .slice(0, 10)
    .map(({ r, resumo }, indice) => ({
      id: r.id,
      nome: r.nome,
      detalhe: null,
      posicao: indice + 1,
      receitaSemestre: resumo.receitaSemestre,
      quantidadeServicos: resumo.quantidadeServicos,
    }));

  const porFaixa = (faixa: RelacionamentoFaixaContato) =>
    comCalculo
      .filter((c) => c.faixa === faixa)
      .map(({ r, diasSemContato }) => ({ id: r.id, nome: r.nome, detalhe: `${diasSemContato}d sem contato` }));

  const meuPeritoPotencial = comCalculo
    .filter(({ r }) => r.tipo === "advogado_escritorio" && !r.meu_perito && r.meu_perito_status !== "assinante" && r.meu_perito_status !== "inativo")
    .map(({ r }) => ({ id: r.id, nome: r.nome, detalhe: r.meu_perito_potencial ? `Potencial ${r.meu_perito_potencial}` : null }));

  return {
    fimDeAno,
    topParceirosSemestre: { ano, semestre, itens: topParceirosSemestre },
    atencao: porFaixa("amarelo"),
    esfriando: porFaixa("laranja"),
    reativacao: porFaixa("vermelho"),
    meuPeritoPotencial,
  };
}
