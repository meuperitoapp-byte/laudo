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
  | 'estrategia_pericial'
  | 'analise_contestacao'
  | 'dados_replica'
  | 'quesitos'
  | 'parecer_tecnico'
  | 'relatorio_tecnico'
  | 'atestados'
  | 'declaracao'
  | 'manifestacao_laudo_pericial'
  | 'quesitos_suplementares'
  | 'participacao_pericia'

// ----------------------------------------------------------------------------
// Módulo Pós-Laudo (migration 20260905120000_pos_laudo_schema.sql)
// ----------------------------------------------------------------------------

/** pos_laudo_ciclos.fluxo — denormalizado de processos.tipo_trabalho. */
export type PosLaudoFluxo = 'judicial' | 'assistencia_tecnica'

/** pos_laudo_ciclos.status */
export type PosLaudoCicloStatus =
  | 'aberto'
  | 'triagem'
  | 'em_resposta'
  | 'aguardando_protocolo'
  | 'protocolado'
  | 'encerrado'

/** pos_laudo_ciclos.origem */
export type PosLaudoOrigem = 'autor' | 'reu' | 'ambos' | 'juizo' | 'mp' | 'outro'

/**
 * Códigos possíveis em pos_laudo_ciclos.natureza (text[]). Não é CHECK no
 * banco — vocabulário fixo validado na aplicação (mesmo padrão de
 * processos.etapas_contratadas).
 */
export type PosLaudoNatureza =
  | 'concordancia'
  | 'impugnacao'
  | 'esclarecimentos'
  | 'quesitos_suplementares'
  | 'complementacao'
  | 'documento_novo'
  | 'nova_pericia'
  | 'determinacao_judicial'
  | 'outra'

/** pos_laudo_ciclos.classificacao_global — obrigatória no fluxo AT. */
export type PosLaudoClassificacaoGlobal =
  | 'favoravel'
  | 'parc_favoravel'
  | 'neutro'
  | 'parc_desfavoravel'
  | 'desfavoravel'

/** pos_laudo_ciclos.pode_modificar_conclusao e pos_laudo_pontos.potencial_alterar_conclusao */
export type PosLaudoPotencialConclusao = 'nao' | 'potencialmente' | 'sim' | 'depende_complementacao'

/** pos_laudo_pontos.classificacao_triagem — UMA por ponto (Dra. confirmou). */
export type PosLaudoClassificacaoTriagem =
  | 'questionamento_pertinente'
  | 'esclarecimento_legitimo'
  | 'quesito_suplementar_pertinente'
  | 'documento_novo_relevante'
  | 'necessidade_complementacao'
  | 'divergencia_interpretativa'
  | 'mero_inconformismo'
  | 'reiteracao_quesito'
  | 'questao_juridica_fora_objeto'

/** pos_laudo_pontos.repercussao */
export type PosLaudoRepercussaoPonto =
  | 'ponto_ja_esclarecido'
  | 'fundamentacao_complementada'
  | 'retificacao_necessaria'
  | 'conclusao_parcialmente_modificada'
  | 'sem_repercussao'

/** pos_laudo_documentos.papel */
export type PosLaudoDocumentoPapel = 'superveniente' | 'laudo_analisado' | 'manifestacao_analisada'

/** pos_laudo_documentos.relevancia */
export type PosLaudoDocumentoRelevancia =
  | 'sem_relevancia'
  | 'complementar'
  | 'relevante'
  | 'potencialmente_modificador'
  | 'determinante'

/** pos_laudo_quesitos.tipo */
export type PosLaudoQuesitoTipo = 'suplementar' | 'esclarecimento'

/** pos_laudo_quesitos.status */
export type PosLaudoQuesitoStatus = 'rascunho' | 'revisado' | 'aprovado' | 'excluido'

/**
 * pos_laudo_ciclos.repercussao_laudo — síntese de nível de ciclo da
 * repercussão sobre o laudo original (migration 20260906120000). Os três
 * últimos valores exigem "Nova Conclusão Vigente" (trava de aplicação).
 */
export type PosLaudoRepercussaoLaudo =
  | 'mantido_integralmente'
  | 'complementado_sem_alterar'
  | 'retificacao_sem_repercussao'
  | 'modificacao_parcial'
  | 'revisao_substancial'
  | 'substituicao_conclusao'

/**
 * pos_laudo_conclusoes_vigentes.origem_tipo — 'retificacao' está AUSENTE de
 * propósito: garantia estrutural de que uma retificação nunca cria conclusão
 * vigente (plano §1.6).
 */
export type PosLaudoConclusaoOrigem = 'laudo' | 'esclarecimentos' | 'complementacao'

/** pos_laudo_conclusoes_vigentes.escopo */
export type PosLaudoConclusaoEscopo = 'integral' | 'parcial'

/**
 * laudos_gerados.tipo — discrimina a forma de snapshot_respostas. Linhas
 * pré-migration 20260905120000 assumem 'laudo' (default da coluna).
 */
export type LaudoGeradoTipo =
  | 'laudo'
  | 'esclarecimentos'
  | 'retificacao'
  | 'complementacao'
  | 'parecer_at'
  | 'manifestacao_at'
  | 'impugnacao_at'
  | 'parecer_divergente_at'
