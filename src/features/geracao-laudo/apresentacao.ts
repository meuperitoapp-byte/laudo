import type { ContextoNarrativo } from "@/features/preenchimento/narrativo";

/**
 * Parágrafo de "APRESENTAÇÃO" (identificação do perito + metodologia) —
 * CLAUDE.md > Fluxo aprovado, item 6: "texto padrão de identificação do
 * perito e metodologia".
 *
 * PLACEHOLDER — a redação oficial ainda não foi definida (provavelmente vem
 * dos PDFs-modelo originais, com pequenos ajustes de variável — {{nome}},
 * {{crm_uf}} etc.). De propósito, NÃO inventei texto jurídico aqui: é só um
 * marcador estrutural, pra confirmar que a mecânica (puxar os dados certos
 * do contexto) funciona. Quando a redação chegar, troca só o retorno desta
 * função — o resto do pipeline (compilar.ts, renderizadores) não muda.
 */
export function montarApresentacao(contexto: ContextoNarrativo): string {
  const nome = contexto.get("nome_perito")?.valorExibivel ?? "[nome do(a) perito(a) — Seção I não preenchida]";
  const crmUf = contexto.get("crm_uf")?.valorExibivel;
  return `[APRESENTAÇÃO — AGUARDANDO REDAÇÃO OFICIAL] Identificação de ${nome}${crmUf ? ` (${crmUf})` : ""} e metodologia médico-pericial empregada.`;
}
