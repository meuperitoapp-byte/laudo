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

// ----------------------------------------------------------------------------
// Fluxo Principal do Perito Judicial (migration 20260911120000) — nomeação,
// aceite e depósito dos honorários. Ver docs/plano-modulo-fluxo-principal.md.
// ----------------------------------------------------------------------------

/**
 * processos.deposito_situacao — vocabulário literal do Modelo de Informação
 * de Dados para Depósito dos Honorários. Alimenta o alerta de agendamento
 * (plano §4.2) — não é ela quem marca "depende de depósito prévio", é o
 * próprio estado do depósito que decide se o alerta aparece.
 */
export type SituacaoDeposito =
  | 'nao_realizado'
  | 'parcial'
  | 'integral'
  | 'dispensado'
  | 'justica_gratuita'
  | 'aguardando_comprovacao'

/** processos.deposito_responsavel_adiantamento — "Responsável pelo adiantamento" do modelo. */
export type ResponsavelAdiantamentoDeposito = 'autor' | 'reu' | 'ambos' | 'outro'

/**
 * processos.deposito_forma_disponibilizacao — "Forma de disponibilização" do
 * modelo. Trava de exposição dos dados bancários (configuracoes): só
 * 'dados_bancarios' permite incluí-los num documento gerado; 'conta_judicial'
 * os exclui sempre, em qualquer hipótese.
 */
export type FormaDisponibilizacaoDeposito = 'dados_bancarios' | 'conta_judicial' | 'conforme_juizo' | 'outro'

/** processos.honorarios_situacao — vocabulário literal da seção III do Modelo de Manifestação Consolidada. */
export type HonorariosSituacao =
  | 'nao_fixados'
  | 'arbitrados_concordancia'
  | 'arbitrados_insuficiente_majoracao'
  | 'impugnados'
  | 'justica_gratuita_regime_especifico'

/** processos.honorarios_complexidade. */
export type HonorariosComplexidade = 'baixa' | 'media' | 'alta' | 'excepcional'

/** processos.agendamento_necessidade_acompanhante. */
export type AgendamentoNecessidadeAcompanhante = 'nao' | 'sim' | 'conforme_condicao_clinica'

/**
 * processos.agendamento_deposito_previo_exigido — "Confirmação do depósito
 * exigida antes do agendamento?" do modelo. Fato do CASO, marcado uma vez
 * pela perita; `null` (ainda não respondido) é um estado deliberadamente
 * distinto de 'nao'/'nao_aplicavel' — ver comentário da coluna na migration
 * 20260911130000 e verificarAlertaAgendamento em fluxo-principal/regras.ts.
 */
export type AgendamentoDepositoPrevioExigido = 'sim' | 'nao' | 'nao_aplicavel'

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
 * pos_laudo_quesitos.origem — de quem é o quesito suplementar (seção V dos
 * Esclarecimentos / VIII da Complementação: A parte autora / B parte ré / C
 * Juízo / D outros). Coluna é `text` livre no banco — validado na aplicação.
 */
export type PosLaudoQuesitoOrigemParte = 'autor' | 'reu' | 'juizo' | 'outro'

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
 * pos_laudo_ciclos.retificacao_origem_identificacao — "Origem da
 * identificação" (seção I do modelo de Retificação). CHECK no banco (mesma
 * convenção da coluna `origem` da tabela).
 */
export type PosLaudoOrigemIdentificacao = 'perito' | 'juizo' | 'autor' | 'reu' | 'outro'

// ----------------------------------------------------------------------------
// Complementação do Laudo (migration 20260909120000_pos_laudo_complementacao)
// ----------------------------------------------------------------------------

/**
 * pos_laudo_complementacao.motivos (text[]) — "Motivo da complementação"
 * (seção II do modelo). Vocabulário fixo, validado na aplicação (não é CHECK
 * no banco — mesmo padrão de pos_laudo_ciclos.natureza).
 */
export type PosLaudoComplementacaoMotivo =
  | 'documento_novo'
  | 'nova_avaliacao'
  | 'exame_complementar'
  | 'avaliacao_especialista'
  | 'diligencia_juizo'
  | 'determinacao_judicial'
  | 'insuficiencia_tecnica'
  | 'esclarecimento_ampliado'
  | 'outro'

/**
 * pos_laudo_complementacao.impacto_elementos — "Classificação do impacto dos
 * elementos supervenientes" (seção III do modelo). CHECK no banco.
 */
export type PosLaudoComplementacaoImpacto =
  | 'sem_relevancia_modificadora'
  | 'complementares'
  | 'relevantes_fundamentacao'
  | 'potencialmente_modificadores'
  | 'determinantes_revisao_parcial'
  | 'determinantes_revisao_integral'

/**
 * Situação de cada elemento central da perícia na Complementação (seção VII
 * do modelo). Guardado dentro do jsonb pos_laudo_complementacao.vii_elementos.
 */
export type PosLaudoElementoCentralSituacao =
  | 'mantido'
  | 'complementado'
  | 'modificado'
  | 'nao_aplicavel'

/**
 * pos_laudo_retificacao_itens.natureza_erro — vocabulário fixo (seção II do
 * modelo de Retificação de Erro Material), validado na aplicação (não é
 * CHECK no banco — mesmo padrão de PosLaudoNatureza/EtapaContratada).
 */
export type PosLaudoNaturezaErro =
  | 'digitacao'
  | 'grafia'
  | 'nome_identificacao'
  | 'data'
  | 'numero_valor'
  | 'pagina_item_referencia'
  | 'troca_omissao'
  | 'formatacao'
  | 'outro'

/**
 * laudos_gerados.tipo — discrimina a forma de snapshot_respostas. Linhas
 * pré-migration 20260905120000 assumem 'laudo' (default da coluna).
 * 'quesitos_at' (migration 20260910120000) = documento isolado "Quesitos
 * Suplementares" do lado AT (os mesmos quesitos também saem embutidos no
 * parecer).
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
  | 'quesitos_at'
  | 'aceite_pericial'
  | 'dados_deposito'
  | 'agendamento_pericia'

// ----------------------------------------------------------------------------
// Fluxo Assistência Técnica (migration 20260910120000_pos_laudo_at)
// ----------------------------------------------------------------------------

/**
 * laudos_gerados.at_modalidade — a modalidade concreta do parecer AT, que
 * escolhe o texto-base da conclusão no compilador. CHECK no banco. Null fora
 * dos tipos parecer_at / manifestacao_at / impugnacao_at / parecer_divergente_at.
 */
export type PosLaudoAtModalidade =
  | 'concordancia'
  | 'concordancia_ressalvas'
  | 'impugnacao_parcial'
  | 'impugnacao_integral'
  | 'divergente'
  | 'manifestacao'

/**
 * pos_laudo_ciclos.providencia_recomendada (text[]) — "Decisão pós-laudo"
 * (Gestão Assistência Técnica.pdf §13). Vocabulário fixo validado na
 * aplicação (mesmo padrão de PosLaudoNatureza). Define quais saídas AT fazem
 * sentido gerar.
 */
export type PosLaudoProvidenciaAt =
  | 'nenhuma'
  | 'concordancia'
  | 'quesitos_esclarecimento'
  | 'quesitos_suplementares'
  | 'manifestacao_tecnica'
  | 'impugnacao_tecnica'
  | 'solicitacao_complementacao'
  | 'pedido_nova_pericia'
  | 'parecer_divergente'
  | 'outro'
