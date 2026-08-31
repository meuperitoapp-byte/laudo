import type { TipoTrabalhoProcesso } from "@/types/enums";

/**
 * Dados de contato que vão no rodapé do documento final (Word/PDF), logo
 * abaixo do conteúdo, em toda página — como nos modelos da cliente
 * ("PARECER TÉCNICO MÉDICO-LEGAL"). A logomarca é a mesma nos dois fluxos; o
 * que muda é o rodapé de contato conforme o processo seja Perícia Judicial
 * ou Assistência Técnica.
 *
 * Fixo aqui de propósito (pedido: "por enquanto o mais rápido é fixos, com um
 * lugar único pra trocar"). Quando a cliente quiser editar pela interface,
 * vira uma linha em `configuracoes` — só esta constante e `contatoRodape()`
 * mudam, os renderizadores não.
 */
export interface ContatoRodape {
  email: string;
  telefone: string;
  instagram: string;
}

/** Perícia Judicial — dados do modelo enviado pela cliente. */
export const CONTATO_JUDICIAL: ContatoRodape = {
  email: "pericias.pericons@gmail.com",
  telefone: "(85) 99723-1920",
  instagram: "drafernandanascimento_",
};

/**
 * Assistência Técnica — AJUSTAR quando a cliente enviar os dados próprios
 * desse fluxo. Por ora repete os da Perícia Judicial pra não deixar o rodapé
 * vazio.
 */
export const CONTATO_ASSISTENCIA_TECNICA: ContatoRodape = {
  email: "pericias.pericons@gmail.com",
  telefone: "(85) 99723-1920",
  instagram: "drafernandanascimento_",
};

export function contatoRodape(tipoTrabalho: TipoTrabalhoProcesso): ContatoRodape {
  return tipoTrabalho === "assistencia_tecnica" ? CONTATO_ASSISTENCIA_TECNICA : CONTATO_JUDICIAL;
}

/** Linha única do rodapé: "email  ·  telefone  ·  @instagram". */
export function linhaRodape(contato: ContatoRodape): string {
  return `${contato.email}   ·   ${contato.telefone}   ·   @${contato.instagram}`;
}
