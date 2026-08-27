/**
 * Dados fixos da perita, pré-preenchidos nos campos de identificação do
 * perito quando ainda não há resposta salva — só existe uma perita usando o
 * sistema (CLAUDE.md: 2 perfis, perita + secretária, sem outros peritos),
 * então não faz sentido ela digitar nome/CRM/cidade em todo processo novo.
 * Continua editável normalmente (é só o valor inicial do campo de texto
 * livre, não um valor fixo/travado) — cobre o caso raro de outro CRM/RQE
 * pontual, ou de outra perita vir a usar o sistema no futuro.
 *
 * Chaveado por `campos_secao.codigo` — os 4 tipos de laudo já mapeados
 * (Curatela/Previdenciário/Trabalhista/Erro Médico) usam os mesmos códigos
 * pra esses campos na seção "Identificação do Perito" e no "Encerramento";
 * qualquer tipo futuro que siga a mesma convenção ganha o pré-preenchimento
 * de graça.
 */
export const VALORES_PADRAO_PERITO: Record<string, string> = {
  nome_perito: "FERNANDA NASCIMENTO RESENDE",
  crm_uf: "17266",
  cidade_uf_assinatura: "Fortaleza - CE",
};
