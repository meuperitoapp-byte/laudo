/**
 * Union types correspondentes às colunas `text` + `CHECK (col IN (...))` do
 * schema (ver supabase/migrations/20260821120000_schema_inicial.sql).
 *
 * Motivo de serem `text` + CHECK no banco em vez de `enum` nativo do Postgres:
 * o vocabulário ainda vai crescer (7 dos 10 tipos de laudo faltam ser
 * mapeados) e alterar um CHECK é uma migration trivial, enquanto alterar um
 * ENUM do Postgres é bem mais chato. Aqui no TypeScript o preço de mudar é o
 * mesmo em ambos os casos, então usamos union type normalmente.
 */

/** campos_secao.tipo_campo */
export type TipoCampo = 'selecao_unica' | 'selecao_multipla' | 'texto_livre' | 'tabela'

/** processos.tipo_trabalho */
export type TipoTrabalhoProcesso = 'pericia_judicial' | 'assistencia_tecnica'

/** processos.status */
export type StatusProcesso = 'em_andamento' | 'finalizado' | 'arquivado'

/** processos.tipo_vara */
export type TipoVara = 'federal' | 'estadual' | 'trabalho'

/** processos.justica_gratuita (S/N no formulário) */
export type JusticaGratuita = 'sim' | 'nao'

/** processos.aceitou_nomeacao (S/N/D — 'destituida' = destituída do cargo) */
export type AceitouNomeacao = 'sim' | 'nao' | 'destituida'

/** documentos.tipo */
export type TipoDocumento =
  | 'documento_processual'
  | 'imagem_pericia'
  | 'assinatura_perito'
  | 'logomarca'

/**
 * Códigos possíveis em processos.etapas_contratadas (só relevante quando
 * tipo_trabalho = 'assistencia_tecnica'). Não é um CHECK no banco (a coluna é
 * jsonb livre) — é vocabulário fixo descrito no CLAUDE.md, fluxo item 1.
 */
export type EtapaContratada =
  | 'analise_viabilidade'
  | 'parecer_tecnico'
  | 'assistencia_tecnica_fase_1'
  | 'assistencia_tecnica_fase_2'
  | 'quesitos'
  | 'declaracao'
  | 'atestados'
