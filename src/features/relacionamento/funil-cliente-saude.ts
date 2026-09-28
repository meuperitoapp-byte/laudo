/**
 * §11.2 — "o módulo deverá permitir medir a efetividade das campanhas:
 * contatos gerados, triagens, demandas qualificadas, encaminhamentos e
 * contratações." Não existe uma entidade "campanha" ligada ao cadastro do
 * Cliente Saúde (só a `origem`, que é o proxy mais próximo de "de onde veio
 * o contato") — por isso o funil é calculado por origem, nunca por uma
 * campanha específica que não existe no cadastro.
 */
import type { RelacionamentosRow } from "@/types/database";
import type { RelacionamentoOrigem } from "@/types/enums";

export interface FunilOrigem {
  origem: RelacionamentoOrigem;
  contatosGerados: number;
  triagens: number;
  demandasQualificadas: number;
  encaminhamentos: number;
  contratacoes: number;
}

/** `processoIdsComRelacionamento`: ids de Cliente Saúde que têm ao menos 1 processo vinculado (= contratação). */
export function calcularFunilClienteSaudePorOrigem(
  clientesSaude: RelacionamentosRow[],
  idsComProcessoVinculado: Set<string>,
): FunilOrigem[] {
  const porOrigem = new Map<RelacionamentoOrigem, FunilOrigem>();
  for (const c of clientesSaude) {
    const atual = porOrigem.get(c.origem) ?? {
      origem: c.origem,
      contatosGerados: 0,
      triagens: 0,
      demandasQualificadas: 0,
      encaminhamentos: 0,
      contratacoes: 0,
    };
    atual.contatosGerados++;
    if (c.cs_status && c.cs_status !== "entrada") atual.triagens++;
    if (c.cs_status === "qualificada" || c.cs_status === "direcionada" || c.cs_status === "em_acompanhamento" || c.cs_status === "encerrada") atual.demandasQualificadas++;
    if (c.cs_status === "direcionada" || c.cs_status === "em_acompanhamento") atual.encaminhamentos++;
    if (idsComProcessoVinculado.has(c.id)) atual.contratacoes++;
    porOrigem.set(c.origem, atual);
  }
  return [...porOrigem.values()].sort((a, b) => b.contatosGerados - a.contatosGerados);
}
