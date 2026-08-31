import type { TipoTrabalhoProcesso } from "@/types/enums";
import type { ConfiguracoesRow } from "@/types/database";

/**
 * Contato que vai na faixa de identidade (rodapé) do documento final — vem da
 * tabela `configuracoes` (linha única), editada na tela de Configurações.
 * Nada hardcoded: se a config estiver vazia, `resolverContato` devolve null e
 * o rodapé simplesmente não mostra a linha de contato.
 */
export interface ContatoRodape {
  email: string | null;
  telefone: string | null;
  instagram: string | null;
}

/**
 * Resolve o contato conforme o tipo de trabalho do processo. Assistência
 * Técnica usa os campos `contato_at_*`; qualquer um em branco cai no
 * equivalente da Perícia Judicial. Retorna null quando não há nenhum dado
 * de contato aproveitável (config ausente ou toda vazia).
 */
export function resolverContato(
  config: ConfiguracoesRow | null,
  tipoTrabalho: TipoTrabalhoProcesso,
): ContatoRodape | null {
  if (!config) return null;
  const at = tipoTrabalho === "assistencia_tecnica";
  const contato: ContatoRodape = {
    email: (at ? config.contato_at_email : null) || config.contato_judicial_email || null,
    telefone: (at ? config.contato_at_telefone : null) || config.contato_judicial_telefone || null,
    instagram: (at ? config.contato_at_instagram : null) || config.contato_judicial_instagram || null,
  };
  if (!contato.email && !contato.telefone && !contato.instagram) return null;
  return contato;
}

/** "email   ·   telefone   ·   @instagram" — só as partes preenchidas. */
export function linhaRodape(c: ContatoRodape): string {
  const partes: string[] = [];
  if (c.email) partes.push(c.email.trim());
  if (c.telefone) partes.push(c.telefone.trim());
  if (c.instagram) {
    const ig = c.instagram.trim();
    partes.push(ig.startsWith("@") ? ig : `@${ig}`);
  }
  return partes.join("   ·   ");
}
