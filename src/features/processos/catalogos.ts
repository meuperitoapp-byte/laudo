import type { EtapaContratada } from "@/types/enums";

/** Etapas contratadas da Assistência Técnica — rótulo e sigla (a sigla prefixa o título do processo de AT). Compartilhado entre a tela de detalhe e a listagem de processos. */
export const ETAPA_CONTRATADA_ROTULOS: Record<EtapaContratada, string> = {
  analise_viabilidade: "Análise de viabilidade",
  estrategia_pericial: "Estratégia pericial",
  analise_contestacao: "Análise da contestação",
  dados_replica: "Dados para réplica",
  quesitos: "Quesitos",
  parecer_tecnico: "Parecer técnico",
  relatorio_tecnico: "Relatório técnico",
  atestados: "Atestados",
  declaracao: "Declaração",
  manifestacao_laudo_pericial: "Manifestação ao laudo pericial",
  quesitos_suplementares: "Quesitos suplementares",
  participacao_pericia: "Participação da perícia",
};
/** Ordem fixa/canônica de exibição — a mesma dos 12 serviços definidos com ela, nunca a ordem em que foram marcados. */
export const ETAPAS_CONTRATADAS_ORDENADAS = Object.keys(ETAPA_CONTRATADA_ROTULOS) as EtapaContratada[];

export const ETAPA_CONTRATADA_SIGLAS: Record<EtapaContratada, string> = {
  analise_viabilidade: "AV",
  estrategia_pericial: "EP",
  analise_contestacao: "AC",
  dados_replica: "DR",
  quesitos: "Q",
  parecer_tecnico: "PT",
  relatorio_tecnico: "RT",
  atestados: "ATE",
  declaracao: "DECL",
  manifestacao_laudo_pericial: "ML",
  quesitos_suplementares: "QS",
  participacao_pericia: "PP",
};

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
/** Situação sugerida (Módulo Pós-Laudo, fatia 11) ao abrir um ciclo de pós-laudo — nunca setada sozinha, sempre com confirmação explícita da perita. */
export const SITUACAO_PROCESSO_POS_LAUDO = "Manifestação/complementação/esclarecimentos/novos quesitos";

/**
 * "Recusa do encargo" (protocolar nº12, Impossibilidade de Assumir) e
 * "Devolução do encargo" (protocolar nº13, Escusa/Declínio) — dois valores
 * distintos, nunca um só combinando os dois (confirmado pela Dra. Fernanda,
 * 18/09/2026): são fatos diferentes (nunca chegou a aceitar × aceitou e
 * devolveu depois), mesma distinção que já existe em
 * `processos.aceitou_nomeacao` ('nao' × 'encargo_declinado'). Sugeridas
 * juntas com a mudança de `aceitou_nomeacao`, nunca aplicadas sozinhas — ver
 * `AceitouNomeacaoSugestao`.
 */
export const SITUACAO_PROCESSO_RECUSA = "Recusa do encargo";
export const SITUACAO_PROCESSO_DEVOLUCAO = "Devolução do encargo";
/** Usado também pelo Financeiro (seção "Propostas") pra filtrar processos judiciais com proposta de honorários em aberto — não confundir com "Propostas" comercial do CRM (ainda travado). */
export const SITUACAO_PROCESSO_PROPOSTA_HONORARIOS = "Proposta de honorários";

export const SITUACOES_PROCESSO_ORDENADA = [
  "Sem processo",
  "Aceite",
  SITUACAO_PROCESSO_RECUSA,
  SITUACAO_PROCESSO_DEVOLUCAO,
  SITUACAO_PROCESSO_PROPOSTA_HONORARIOS,
  "Agendamento de perícia",
  "Comunicação de ausência do periciando",
  "Novo agendamento",
  "Elaboração de laudo",
  "Laudo protocolado",
  SITUACAO_PROCESSO_POS_LAUDO,
  "Pagamento",
  "Finalizado",
] as const;

/**
 * Cor da Situação do processo onde aparece como selo (lista de processos,
 * detalhe do processo) — pipeline sem julgamento embutido na maioria dos
 * valores (neutro), exceto os poucos que já são um desfecho: sucesso
 * (encerrou bem) ou atenção (encargo não seguiu adiante). Mesmo critério já
 * usado pra `aceitou_nomeacao` na régua enxuta do Fluxo Principal.
 */
export function varianteSituacaoProcesso(situacao: string | null): "sucesso" | "atencao" | "neutro" {
  if (situacao === "Finalizado" || situacao === "Pagamento") return "sucesso";
  if (situacao === SITUACAO_PROCESSO_RECUSA || situacao === SITUACAO_PROCESSO_DEVOLUCAO) return "atencao";
  return "neutro";
}

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
 * Forma de pagamento — só Assistência Técnica, honorários em atraso (migration
 * 20260921120000). Catálogo fechado igual a SITUACOES_FINANCEIRAS_AT: texto
 * livre no banco, fechamento é convenção de UI. Cartão/pix nunca geram
 * lembrete de cobrança na Central de Prazos (não precisam de cobrança).
 */
export const HONORARIOS_FORMA_PAGAMENTO_AT = ["Cartão", "Pix", "Boleto", "Transferência", "Outro"] as const;

/**
 * Órgão de classe — só Assistência Técnica (migration 20260923120000).
 * Catálogo EDITÁVEL (diferente de HONORARIOS_FORMA_PAGAMENTO_AT): a demanda
 * pode envolver profissional de saúde de conselho fora dessa lista, então a
 * tela usa ComboboxCatalogo (sugestão, não trava) em vez de <select> fechado.
 */
export const ORGAO_CLASSE_SEED = ["CRM", "CRO", "CRP", "CREFITO", "COREN"] as const;

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
