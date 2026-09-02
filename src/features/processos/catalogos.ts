/**
 * Listas-semente dos catálogos de texto livre do cadastro de processo
 * (Situação do Processo, Situação Financeira, Ação/Objeto, especialização da
 * Vara). Mesmo princípio do ComboboxCatalogo usado em Vara/Comarca: o valor
 * salvo é sempre o próprio texto, sem tabela de catálogo à parte. O que estas
 * constantes fazem é garantir que as opções mais comuns já apareçam no
 * dropdown mesmo antes de existir um processo que as use — a partir daí o
 * catálogo cresce sozinho com os valores distintos já cadastrados.
 *
 * Para acrescentar uma opção nova de forma permanente, basta a perita digitar
 * e usar uma vez ("+ Nova situação…") — ou incluir aqui, se quiser que já
 * nasça na lista.
 */

/**
 * Situação do Processo — pipeline único e ORDENADO (substitui os campos
 * separados "Andamento" (status em_andamento/finalizado/arquivado) e a antiga
 * lista livre de "Situação do Processo" — a Dra. Fernanda confirmou que eram a
 * mesma coisa). Lista fechada (não é mais texto livre) porque o filtro padrão
 * da lista de Processos ("esconder os Finalizado") depende de comparação
 * exata. A ordem AQUI é a ordem de exibição no formulário — não usar
 * mesclarSugestoes (ordena alfabético) em cima desta constante.
 */
export const SITUACOES_PROCESSO_ORDENADA = [
  "Sem processo",
  "Aceite",
  "Proposta de honorários",
  "Agendamento de perícia",
  "Comunicação de ausência do periciando",
  "Novo agendamento",
  "Elaboração de laudo",
  "Laudo protocolado",
  "Manifestação/complementação/esclarecimentos/novos quesitos",
  "Pagamento",
  "Finalizado",
] as const;

/** Situação Financeira do Processo — só Perícia Judicial (a Assistência Técnica usa SITUACOES_FINANCEIRAS_AT_SEED). */
export const SITUACOES_FINANCEIRAS_SEED = [
  "Aguardando",
  "Aguardando Pagamento de Honorários",
  "Aguardando Sentença",
  "Aguardando contratação fase 1 com quesitos",
  "Aguardando contratação fase 1 sem quesitos",
  "Aguardando contratação fase 2",
  "Aguardando depósito processual",
  "Aguardando entrega de laudo pericial",
  "Pago",
] as const;

/** Situação Financeira — Assistência Técnica: lista fechada e simples (confirmado pela Dra. Fernanda). */
export const SITUACOES_FINANCEIRAS_AT = ["Pago", "Não pago", "Em parcelamento"] as const;

/**
 * Especialização da vara (Cível, do Trabalho, de Família e Sucessões,
 * Criminal…) — entra como sugestão no combobox de "Número da vara", onde a
 * perita já registra o número junto com a especialização (ex.: "3ª Vara
 * Cível"). A Dra. Fernanda vai completando a lista conforme aparecem.
 */
export const VARA_ESPECIALIZACAO_SEED = [
  "Cível",
  "do Trabalho",
  "de Família e Sucessões",
  "Criminal",
] as const;

/**
 * Junta a lista-semente com os valores distintos já usados em processos
 * (vindos do banco), sem duplicar (comparação case-insensitive), ordem
 * alfabética pt-BR.
 */
export function mesclarSugestoes(
  seed: readonly string[],
  doBanco: ({ valor: string | null } | string | null)[] | null | undefined,
): string[] {
  const porChave = new Map<string, string>();
  for (const s of seed) porChave.set(s.toLowerCase(), s);
  for (const item of doBanco ?? []) {
    const bruto = typeof item === "string" ? item : item?.valor;
    const v = bruto?.trim();
    if (v && !porChave.has(v.toLowerCase())) porChave.set(v.toLowerCase(), v);
  }
  return Array.from(porChave.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
