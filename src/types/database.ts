/**
 * Tipos correspondentes ao schema em
 * supabase/migrations/20260821120000_schema_inicial.sql. Escritos à mão
 * (sem `supabase gen types`, que exige a CLI instalada) — se a CLI for
 * instalada depois, o formato aqui foi pensado pra bater com o que ela geraria,
 * então dá pra substituir sem quebrar o resto do app.
 *
 * `Database` é o shape que @supabase/supabase-js espera do generic de
 * `createClient<Database>()` — cada tabela precisa de Row/Insert/Update/
 * Relationships (ver node_modules/@supabase/postgrest-js `GenericTable`).
 *
 * IMPORTANTE: os `XyzRow` são declarados com `type`, não `interface`. O
 * generic interno do supabase-js resolve `Schema` (Tables/Views/Functions)
 * via `Database['public'] extends GenericSchema`, e isso exige que cada
 * `Row` satisfaça `Record<string, unknown>` num conditional type — e uma
 * `interface` (mesmo com exatamente os mesmos campos) NÃO satisfaz esse
 * check, só um `type` literal satisfaz. Trocar `type` de volta para
 * `interface` aqui quebra silenciosamente `.from(...).select(...)` em toda
 * a aplicação (toda linha vira `never`, sem erro nenhum na declaração deste
 * arquivo — só nos call-sites). Confirmado isolando o problema num arquivo
 * de teste à parte antes de corrigir.
 */

import type {
  TipoCampo,
  TipoTrabalhoProcesso,
  StatusProcesso,
  TipoVara,
  JusticaGratuita,
  AceitouNomeacao,
  NotaFiscalEmitida,
  TipoDocumento,
  EtapaContratada,
  PosLaudoFluxo,
  PosLaudoCicloStatus,
  PosLaudoOrigem,
  PosLaudoOrigemIdentificacao,
  PosLaudoComplementacaoImpacto,
  PosLaudoClassificacaoGlobal,
  PosLaudoPotencialConclusao,
  PosLaudoClassificacaoTriagem,
  PosLaudoRepercussaoPonto,
  PosLaudoDocumentoPapel,
  PosLaudoDocumentoRelevancia,
  PosLaudoQuesitoTipo,
  PosLaudoQuesitoStatus,
  PosLaudoRepercussaoLaudo,
  PosLaudoConclusaoOrigem,
  PosLaudoConclusaoEscopo,
  LaudoGeradoTipo,
  PosLaudoAtModalidade,
  SituacaoDeposito,
  ResponsavelAdiantamentoDeposito,
  FormaDisponibilizacaoDeposito,
  HonorariosSituacao,
  HonorariosComplexidade,
  AgendamentoNecessidadeAcompanhante,
  AgendamentoDepositoPrevioExigido,
  LiberacaoForma,
  TipoCentralTarefa,
  ModuloOrigemCaso,
  ViabilidadeStatus,
  ViabilidadeSuficienciaDocumental,
  ViabilidadeOportunidadeDiagnostica,
  ViabilidadeHouveAtraso,
  ViabilidadeGrauSeguranca,
  ViabilidadeRiscoGrau,
  ViabilidadeNecessidadeEspecialista,
  ViabilidadeConclusao,
  ViabilidadePosEntregaReuniao,
  ViabilidadeSatisfacao,
  ViabilidadeOrcamentoEnviado,
  ViabilidadeRelevanciaDocumento,
  ViabilidadeImpactoDocumentoFaltante,
  ViabilidadeCategoriaLinhaTempo,
  ViabilidadeClassificacaoFato,
  ViabilidadeAvaliacaoConduta,
  ViabilidadeConclusaoNexo,
  ViabilidadeDanoExiste,
  ViabilidadeDanoTemporarioPermanente,
  ViabilidadeParcialTotal,
  ViabilidadeIncapacidadeTemporariaPermanente,
  ViabilidadePlausibilidade,
  ViabilidadeForcaProbatoria,
  ViabilidadeImpactoFragilidade,
  ViabilidadeTipoProva,
  ViabilidadeTipoLiteratura,
  ViabilidadeImpactoLimitacao,
  NivelUrgencia,
  TipoMovimentacaoFinanceira,
  ModuloSistema,
} from './enums'
import type {
  CondicaoVisibilidade,
  OpcaoCampo,
  ConfigTabela,
  ValorSelecionado,
  SnapshotLaudoGerado,
  ComplementacaoElementosCentrais,
} from './json-fields'

/** Torna as chaves em K opcionais em T — modela colunas com DEFAULT no banco para o tipo Insert. */
type ComDefaults<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// ============================================================================
// tipos_laudo
// ============================================================================
export type TiposLaudoRow = {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  ordem: number | null
  ativo: boolean
  created_at: string
  updated_at: string
}
export type TiposLaudoInsert = ComDefaults<
  TiposLaudoRow,
  'id' | 'descricao' | 'ordem' | 'ativo' | 'created_at' | 'updated_at'
>
export type TiposLaudoUpdate = Partial<TiposLaudoRow>

// ============================================================================
// secoes
// ============================================================================
export type SecoesRow = {
  id: string
  tipo_laudo_id: string
  codigo: string
  titulo: string
  ordem: number
  condicional: boolean
  condicao: CondicaoVisibilidade | null
  /** Template de narrativo da seção inteira (placeholders {{codigo_do_campo}} ou tokens computados). Ver migration 20260821130000. */
  texto_automatico_template: string | null
  created_at: string
  updated_at: string
}
export type SecoesInsert = ComDefaults<
  SecoesRow,
  | 'id'
  | 'condicional'
  | 'condicao'
  | 'texto_automatico_template'
  | 'created_at'
  | 'updated_at'
>
export type SecoesUpdate = Partial<SecoesRow>

// ============================================================================
// campos_secao
// ============================================================================
export type CamposSecaoRow = {
  id: string
  secao_id: string
  parent_campo_id: string | null
  codigo: string
  rotulo: string
  tipo_campo: TipoCampo
  ordem: number
  obrigatorio: boolean
  aceita_texto_livre: boolean
  opcoes: OpcaoCampo[] | null
  config_tabela: ConfigTabela | null
  condicional: boolean
  condicao: CondicaoVisibilidade | null
  requer_confirmacao_perito: boolean
  /** Template de narrativo do campo (não da seção). Ver migration 20260822090000. Null na maioria dos campos. */
  texto_automatico_template: string | null
  created_at: string
  updated_at: string
}
export type CamposSecaoInsert = ComDefaults<
  CamposSecaoRow,
  | 'id'
  | 'parent_campo_id'
  | 'obrigatorio'
  | 'aceita_texto_livre'
  | 'opcoes'
  | 'config_tabela'
  | 'condicional'
  | 'condicao'
  | 'requer_confirmacao_perito'
  | 'texto_automatico_template'
  | 'created_at'
  | 'updated_at'
>
export type CamposSecaoUpdate = Partial<CamposSecaoRow>

// ============================================================================
// processos (28 colunas)
// ============================================================================
export type ProcessosRow = {
  id: string
  tipo_trabalho: TipoTrabalhoProcesso
  tipo_laudo_id: string | null
  status: StatusProcesso
  numero_processo: string | null
  tipo_vara: TipoVara | null
  vara_numero: string | null
  comarca_subsecao: string | null
  /** 2 letras (CHECK char_length(uf) = 2), ex.: 'SP'. Não validado como UF real no banco. */
  uf: string | null
  parte_autora: string | null
  partes_re: string | null
  periciando_nome: string | null
  periciando_cpf: string | null
  /** date do Postgres, formato 'YYYY-MM-DD'. */
  periciando_data_nascimento: string | null
  objeto_pericia: string | null
  etapas_contratadas: EtapaContratada[] | null
  /** Só assistencia_tecnica: quem contratou / parte assistida. Ver migration 20260904120000. */
  cliente_parte_assistida: string | null
  /** Só assistencia_tecnica: advogado(a) / escritório da parte assistida. */
  advogado_escritorio: string | null
  /** Só assistencia_tecnica: quando o serviço foi contratado. Ver migration 20260930120000. */
  data_contratacao: string | null
  /** Só assistencia_tecnica: prazo contratual de entrega combinado. Migrou de analises_viabilidade (migration 20260930120000). */
  prazo_contratual_entrega: string | null
  /** Ponto do fluxo (texto livre + catálogo). Ver migration 20260829120000. */
  situacao_processo: string | null
  /** Situação financeira (texto livre + catálogo). */
  situacao_financeira: string | null
  /** numeric(14,2) do Postgres — chega como number pelo supabase-js. */
  valor_processo: number | null
  honorario_apresentado: number | null
  honorario_arbitrado: number | null
  justica_gratuita: JusticaGratuita | null
  aceitou_nomeacao: AceitouNomeacao | null
  url_processo: string | null
  /** null = ainda não registrado. Ver migration 20260925120000. */
  nota_fiscal_emitida: NotaFiscalEmitida | null
  nota_fiscal_numero: string | null
  /** Ação / Objeto da Perícia ou Assistência (texto livre + catálogo). Separado de tipo_laudo_id. */
  acao_objeto: string | null
  // --- Fluxo Principal do Perito Judicial (migration 20260911120000) ---
  nomeacao_id: string | null
  nomeacao_data: string | null
  nomeacao_ciencia_data: string | null
  nomeacao_prazo_manifestacao: string | null
  aceite_impedimento_suspeicao: boolean | null
  aceite_competencia_tecnica: boolean | null
  aceite_necessita_especialista: boolean | null
  deposito_situacao: SituacaoDeposito | null
  deposito_valor: number | null
  deposito_data: string | null
  deposito_responsavel_adiantamento: ResponsavelAdiantamentoDeposito | null
  deposito_comprovante_documento_id: string | null
  deposito_forma_disponibilizacao: FormaDisponibilizacaoDeposito | null
  // --- Fluxo Principal do Perito Judicial — Honorários/Agendamento (migration 20260911130000) ---
  honorarios_situacao: HonorariosSituacao | null
  honorarios_complexidade: HonorariosComplexidade | null
  honorarios_horas_tecnicas_estimadas: number | null
  honorarios_valor_hora_tecnica: number | null
  agendamento_data: string | null
  /** time do Postgres, formato 'HH:MM' ou 'HH:MM:SS'. */
  agendamento_horario: string | null
  agendamento_modalidade: string | null
  agendamento_local: string | null
  agendamento_endereco: string | null
  agendamento_complemento: string | null
  agendamento_referencia_acesso: string | null
  agendamento_necessidade_acompanhante: AgendamentoNecessidadeAcompanhante | null
  agendamento_orientacoes_especificas: string | null
  agendamento_deposito_previo_exigido: AgendamentoDepositoPrevioExigido | null
  liberacao_forma: LiberacaoForma | null
  liberacao_solicitada_em: string | null
  /** date do Postgres, 'YYYY-MM-DD' — preenchida pela perita, nunca inferida. */
  honorarios_recebidos_em: string | null
  // --- Central de Prazos — fatia 3, "documentos pendentes" (migration 20260918120000) ---
  /** date do Postgres — preenchida e limpa manualmente pela perita, nunca inferida. */
  documentos_solicitados_em: string | null
  documentos_solicitados_descricao: string | null
  // --- Dashboard/relatórios (migration 20260919120000) ---
  /** Escritório/advogado que indicou o caso — distinto de advogado_escritorio (AT: quem contratou). Vale pros dois tipos de trabalho. */
  escritorio_indicacao: string | null
  // --- Honorários em atraso (migration 20260921120000) ---
  /** JUDICIAL só. Data do PRÓXIMO marco de pagamento combinado — nunca calculada, sempre o que falta (não histórico). */
  honorarios_proximo_marco_em: string | null
  honorarios_proximo_marco_descricao: string | null
  /** ASSISTÊNCIA TÉCNICA só. Catálogo fechado na UI (cartão/pix/boleto/transferência/outro), texto livre sem CHECK. */
  honorarios_forma_pagamento: string | null
  /** ASSISTÊNCIA TÉCNICA só. Data de vencimento do contrato, fixa desde o cadastro. */
  honorarios_vencimento: string | null
  // --- AT — ação por etapa (migration 20260922120000) ---
  /** Só etapa "estrategia_pericial". Data da reunião de explicações técnicas com o advogado — preenchida/limpa manualmente. */
  estrategia_pericial_reuniao_em: string | null
  // --- AT — Área da demanda (migration 20260923120000) ---
  /** Só Assistência Técnica. Conselho profissional do objeto da demanda (CRM/CRO/CRP/CREFITO/COREN) — catálogo editável. */
  orgao_classe: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
export type ProcessosInsert = ComDefaults<
  ProcessosRow,
  | 'id'
  | 'tipo_laudo_id'
  | 'status'
  | 'numero_processo'
  | 'tipo_vara'
  | 'vara_numero'
  | 'comarca_subsecao'
  | 'uf'
  | 'parte_autora'
  | 'partes_re'
  | 'periciando_nome'
  | 'periciando_cpf'
  | 'periciando_data_nascimento'
  | 'objeto_pericia'
  | 'etapas_contratadas'
  | 'cliente_parte_assistida'
  | 'advogado_escritorio'
  | 'data_contratacao'
  | 'prazo_contratual_entrega'
  | 'situacao_processo'
  | 'situacao_financeira'
  | 'valor_processo'
  | 'honorario_apresentado'
  | 'honorario_arbitrado'
  | 'justica_gratuita'
  | 'aceitou_nomeacao'
  | 'url_processo'
  | 'acao_objeto'
  | 'nota_fiscal_emitida'
  | 'nota_fiscal_numero'
  | 'nomeacao_id'
  | 'nomeacao_data'
  | 'nomeacao_ciencia_data'
  | 'nomeacao_prazo_manifestacao'
  | 'aceite_impedimento_suspeicao'
  | 'aceite_competencia_tecnica'
  | 'aceite_necessita_especialista'
  | 'deposito_situacao'
  | 'deposito_valor'
  | 'deposito_data'
  | 'deposito_responsavel_adiantamento'
  | 'deposito_comprovante_documento_id'
  | 'deposito_forma_disponibilizacao'
  | 'honorarios_situacao'
  | 'honorarios_complexidade'
  | 'honorarios_horas_tecnicas_estimadas'
  | 'honorarios_valor_hora_tecnica'
  | 'agendamento_data'
  | 'agendamento_horario'
  | 'agendamento_modalidade'
  | 'agendamento_local'
  | 'agendamento_endereco'
  | 'agendamento_complemento'
  | 'agendamento_referencia_acesso'
  | 'agendamento_necessidade_acompanhante'
  | 'agendamento_orientacoes_especificas'
  | 'agendamento_deposito_previo_exigido'
  | 'liberacao_forma'
  | 'liberacao_solicitada_em'
  | 'honorarios_recebidos_em'
  | 'documentos_solicitados_em'
  | 'documentos_solicitados_descricao'
  | 'escritorio_indicacao'
  | 'honorarios_proximo_marco_em'
  | 'honorarios_proximo_marco_descricao'
  | 'honorarios_forma_pagamento'
  | 'honorarios_vencimento'
  | 'estrategia_pericial_reuniao_em'
  | 'orgao_classe'
  | 'created_by'
  | 'created_at'
  | 'updated_at'
>
export type ProcessosUpdate = Partial<ProcessosRow>

// ============================================================================
// processo_partes — pessoas de cada polo (ativo/passivo). Ver migration
// 20260827100000. processos.parte_autora/partes_re ficam como colunas
// legadas, sem uso a partir desta migration.
// ============================================================================
export type ProcessoPartesRow = {
  id: string
  processo_id: string
  polo: 'ativo' | 'passivo'
  /** Ex.: "Autor(a)", "Réu", "Reclamante", "Curatelando(a)" — texto livre, varia por tipo de processo. */
  papel: string
  nome: string
  ordem: number
  created_at: string
  updated_at: string
}
export type ProcessoPartesInsert = ComDefaults<ProcessoPartesRow, 'id' | 'created_at' | 'updated_at'>
export type ProcessoPartesUpdate = Partial<ProcessoPartesRow>

// ============================================================================
// documentos
// ============================================================================
export type DocumentosRow = {
  id: string
  /** null = asset global da conta (assinatura_perito, logomarca), não ligado a um processo. */
  processo_id: string | null
  tipo: TipoDocumento
  nome_arquivo: string
  storage_path: string
  mime_type: string | null
  /** bigint do Postgres — PostgREST serializa como number; cuidado acima de Number.MAX_SAFE_INTEGER. */
  tamanho_bytes: number | null
  ordem: number | null
  ilegivel_insuficiente: boolean
  observacao: string | null
  /** Categoria p/ Matriz de Documentos Analisados (ex.: 'prontuário hospitalar'). Vocabulário livre, varia por tipo_laudo. */
  categoria: string | null
  origem_profissional: string | null
  /** date do Postgres, formato 'YYYY-MM-DD'. */
  data_documento: string | null
  paginas: number | null
  enviado_por: string | null
  /** Só Assistência Técnica: código de EtapaContratada ao qual este documento pertence (migration 20260922120000). Independente de `categoria`. */
  etapa_at: string | null
  /** Vínculo opcional com caso_necessidade_especialista (migration 20260926120000) — mesmo padrão de etapa_at, reaproveita o pipeline de Documentos existente. */
  necessidade_especialista_id: string | null
  created_at: string
  updated_at: string
}
export type DocumentosInsert = ComDefaults<
  DocumentosRow,
  | 'id'
  | 'processo_id'
  | 'mime_type'
  | 'tamanho_bytes'
  | 'ordem'
  | 'ilegivel_insuficiente'
  | 'observacao'
  | 'categoria'
  | 'origem_profissional'
  | 'data_documento'
  | 'paginas'
  | 'enviado_por'
  | 'etapa_at'
  | 'necessidade_especialista_id'
  | 'created_at'
  | 'updated_at'
>
export type DocumentosUpdate = Partial<DocumentosRow>

// ============================================================================
// configuracoes — config global da conta (linha única, id = true).
// Ver migration 20260901120000_configuracoes.sql.
// ============================================================================
export type ConfiguracoesRow = {
  id: boolean
  /** Linha exata do rodapé dos documentos de Perícia Judicial (texto livre, usado sem transformação). */
  rodape_judicial_texto: string | null
  /** Linha exata do rodapé dos documentos de Assistência Técnica. */
  rodape_at_texto: string | null
  // --- Dados bancários pra depósito de honorários periciais (migration 20260911120000) ---
  // Dado sensível, de propósito FORA do código-fonte — mora só aqui, atrás do
  // login. NUNCA entram num documento gerado sem confirmação explícita na
  // hora de gerar; nunca entram quando o processo exigir depósito em conta
  // judicial (ver processos.deposito_forma_disponibilizacao).
  dados_bancarios_titular: string | null
  dados_bancarios_cpf_cnpj: string | null
  dados_bancarios_banco: string | null
  dados_bancarios_codigo_banco: string | null
  dados_bancarios_agencia: string | null
  dados_bancarios_conta: string | null
  dados_bancarios_tipo_conta: string | null
  dados_bancarios_chave_pix: string | null
  updated_at: string
}
export type ConfiguracoesInsert = ComDefaults<
  ConfiguracoesRow,
  | 'id'
  | 'rodape_judicial_texto'
  | 'rodape_at_texto'
  | 'dados_bancarios_titular'
  | 'dados_bancarios_cpf_cnpj'
  | 'dados_bancarios_banco'
  | 'dados_bancarios_codigo_banco'
  | 'dados_bancarios_agencia'
  | 'dados_bancarios_conta'
  | 'dados_bancarios_tipo_conta'
  | 'dados_bancarios_chave_pix'
  | 'updated_at'
>
export type ConfiguracoesUpdate = Partial<ConfiguracoesRow>

// ============================================================================
// respostas_processo
// ============================================================================
export type RespostasProcessoRow = {
  id: string
  processo_id: string
  campo_id: string
  valor_selecionado: ValorSelecionado | null
  texto_livre: string | null
  texto_narrativo: string | null
  confirmado_pelo_perito: boolean
  respondido_por: string | null
  created_at: string
  updated_at: string
}
export type RespostasProcessoInsert = ComDefaults<
  RespostasProcessoRow,
  | 'id'
  | 'valor_selecionado'
  | 'texto_livre'
  | 'texto_narrativo'
  | 'confirmado_pelo_perito'
  | 'respondido_por'
  | 'created_at'
  | 'updated_at'
>
export type RespostasProcessoUpdate = Partial<RespostasProcessoRow>

// ============================================================================
// respostas_secao — texto narrativo composto por seção (ver migration
// 20260823110000). Granularidade de seção, não de campo — complementa
// respostas_processo.texto_narrativo (que é por campo).
// ============================================================================
export type RespostasSecaoRow = {
  id: string
  processo_id: string
  secao_id: string
  texto_narrativo: string | null
  editado_manualmente: boolean
  respondido_por: string | null
  created_at: string
  updated_at: string
}
export type RespostasSecaoInsert = ComDefaults<
  RespostasSecaoRow,
  | 'id'
  | 'texto_narrativo'
  | 'editado_manualmente'
  | 'respondido_por'
  | 'created_at'
  | 'updated_at'
>
export type RespostasSecaoUpdate = Partial<RespostasSecaoRow>

// ============================================================================
// resposta_evidencias
// ============================================================================
export type RespostaEvidenciasRow = {
  id: string
  resposta_id: string
  documento_id: string | null
  resposta_referenciada_id: string | null
  observacao: string | null
  created_at: string
}
export type RespostaEvidenciasInsert = ComDefaults<
  RespostaEvidenciasRow,
  'id' | 'documento_id' | 'resposta_referenciada_id' | 'observacao' | 'created_at'
>
export type RespostaEvidenciasUpdate = Partial<RespostaEvidenciasRow>

// ============================================================================
// respostas_reutilizaveis
// ============================================================================
export type RespostasReutilizaveisRow = {
  id: string
  campo_id: string | null
  tipo_laudo_id: string | null
  titulo: string
  conteudo: string
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type RespostasReutilizaveisInsert = ComDefaults<
  RespostasReutilizaveisRow,
  'id' | 'campo_id' | 'tipo_laudo_id' | 'criado_por' | 'created_at' | 'updated_at'
>
export type RespostasReutilizaveisUpdate = Partial<RespostasReutilizaveisRow>

// ============================================================================
// biblioteca_pericial
// ============================================================================
export type CategoriaBibliotecaPericial =
  | 'quesitos_por_area'
  | 'teses'
  | 'literatura'
  | 'legislacao_normas'
  | 'conitec_natjus_pcdt'
  | 'protocolos_diretrizes'
  | 'jurisprudencia_tecnica'
export type BibliotecaPericialRow = {
  id: string
  categoria: CategoriaBibliotecaPericial
  area_pericial: string | null
  titulo: string
  conteudo: string
  fonte: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type BibliotecaPericialInsert = ComDefaults<
  BibliotecaPericialRow,
  'id' | 'area_pericial' | 'fonte' | 'criado_por' | 'created_at' | 'updated_at'
>
export type BibliotecaPericialUpdate = Partial<BibliotecaPericialRow>

// ============================================================================
// movimentacoes_financeiras (renomeada de `despesas` — migration 20260930140000)
// ============================================================================
export type MovimentacoesFinanceirasRow = {
  id: string
  data: string
  categoria: string | null
  /** entrada ou saída — sem default, toda linha nova precisa informar. */
  tipo: TipoMovimentacaoFinanceira
  /** Catálogo editável (Asaas, Inter, Banco do Brasil hoje). */
  conta: string | null
  /** Obrigatório pra tipo=entrada, opcional pra tipo=saida (checado na aplicação, não no banco). */
  processo_id: string | null
  /** Antiga `descricao` — opcional (entrada com processo já se identifica sozinha). */
  observacoes: string | null
  /** numeric(14,2) do Postgres — chega como number pelo supabase-js. */
  valor: number
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type MovimentacoesFinanceirasInsert = ComDefaults<
  MovimentacoesFinanceirasRow,
  'id' | 'categoria' | 'conta' | 'processo_id' | 'observacoes' | 'criado_por' | 'created_at' | 'updated_at'
>
export type MovimentacoesFinanceirasUpdate = Partial<MovimentacoesFinanceirasRow>

// ============================================================================
// quesitos
// ============================================================================
export type QuesitosRow = {
  id: string
  processo_id: string
  origem: string | null
  pergunta: string
  resposta: string | null
  ordem: number | null
  created_at: string
  updated_at: string
}
export type QuesitosInsert = ComDefaults<
  QuesitosRow,
  'id' | 'origem' | 'resposta' | 'ordem' | 'created_at' | 'updated_at'
>
export type QuesitosUpdate = Partial<QuesitosRow>

// ============================================================================
// laudos_gerados  (estendida em 20260905120000_pos_laudo_schema.sql)
// ============================================================================
export type LaudosGeradosRow = {
  id: string
  processo_id: string
  versao: number
  storage_path_pdf: string | null
  storage_path_docx: string | null
  snapshot_respostas: SnapshotLaudoGerado | null
  gerado_por: string | null
  created_at: string
  // --- colunas do Pós-Laudo (todas nullable ou com default no banco) ---
  tipo: LaudoGeradoTipo                 // default 'laudo'
  pos_laudo_ciclo_id: string | null
  titulo: string | null
  substitui_conclusao: boolean          // default false
  protocolado: boolean                  // default false
  protocolo_id: string | null
  protocolado_em: string | null
  paginas: number | null
  // --- fatia 10, fluxo AT (migration 20260910120000) ---
  at_modalidade: PosLaudoAtModalidade | null
  entregue_ao_advogado_em: string | null
}
export type LaudosGeradosInsert = ComDefaults<
  LaudosGeradosRow,
  | 'id'
  | 'storage_path_pdf'
  | 'storage_path_docx'
  | 'snapshot_respostas'
  | 'gerado_por'
  | 'created_at'
  | 'tipo'
  | 'pos_laudo_ciclo_id'
  | 'titulo'
  | 'substitui_conclusao'
  | 'protocolado'
  | 'protocolo_id'
  | 'protocolado_em'
  | 'paginas'
  | 'at_modalidade'
  | 'entregue_ao_advogado_em'
>
export type LaudosGeradosUpdate = Partial<LaudosGeradosRow>

// ============================================================================
// pos_laudo_ciclos  (20260905120000_pos_laudo_schema.sql)
// ============================================================================
export type PosLaudoCiclosRow = {
  id: string
  processo_id: string
  numero_ciclo: number
  fluxo: PosLaudoFluxo
  status: PosLaudoCicloStatus
  data_intimacao: string | null
  prazo: string | null
  origem: PosLaudoOrigem | null
  natureza: string[]                    // códigos PosLaudoNatureza (validado na aplicação)
  documento_intimacao_id: string | null
  laudo_base_id: string | null
  classificacao_global: PosLaudoClassificacaoGlobal | null
  pode_modificar_conclusao: PosLaudoPotencialConclusao | null
  rascunho_complementacao: boolean
  // --- fatia 4 (migration 20260906120000) ---
  repercussao_laudo: PosLaudoRepercussaoLaudo | null
  conclusao_vigente_nova: string | null
  // --- fatia 6 (migration 20260907120000) ---
  retificacao_afeta_conclusao: boolean | null
  retificacao_justificativa: string | null
  // --- fatia 6, gap seção I (migration 20260908120000) ---
  retificacao_id_documento: string | null
  retificacao_data_identificacao: string | null
  retificacao_origem_identificacao: PosLaudoOrigemIdentificacao | null
  // --- fatia 10, fluxo AT (migration 20260910120000) ---
  objeto_analise: string | null
  tese_assistida: string | null
  providencia_recomendada: string[]     // códigos PosLaudoProvidenciaAt (validado na aplicação)
  posicao_pericons_sintese: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  encerrado_em: string | null
}
export type PosLaudoCiclosInsert = ComDefaults<
  PosLaudoCiclosRow,
  | 'id'
  | 'status'
  | 'data_intimacao'
  | 'prazo'
  | 'origem'
  | 'natureza'
  | 'documento_intimacao_id'
  | 'laudo_base_id'
  | 'classificacao_global'
  | 'pode_modificar_conclusao'
  | 'rascunho_complementacao'
  | 'repercussao_laudo'
  | 'conclusao_vigente_nova'
  | 'retificacao_afeta_conclusao'
  | 'retificacao_justificativa'
  | 'retificacao_id_documento'
  | 'retificacao_data_identificacao'
  | 'retificacao_origem_identificacao'
  | 'objeto_analise'
  | 'tese_assistida'
  | 'providencia_recomendada'
  | 'posicao_pericons_sintese'
  | 'created_by'
  | 'created_at'
  | 'updated_at'
  | 'encerrado_em'
>
export type PosLaudoCiclosUpdate = Partial<PosLaudoCiclosRow>

// ============================================================================
// pos_laudo_pontos
// ============================================================================
export type PosLaudoPontosRow = {
  id: string
  ciclo_id: string
  ordem: number
  origem_ponto: string | null
  tema: string | null
  sintese_alegacao: string | null
  ja_abordado_no_laudo: boolean | null
  referencia_laudo: string | null
  classificacao_triagem: PosLaudoClassificacaoTriagem | null
  potencial_alterar_conclusao: PosLaudoPotencialConclusao | null
  fundamentacao_adicional: string | null
  resposta_tecnica: string | null
  repercussao: PosLaudoRepercussaoPonto | null
  categoria_problema: string | null
  created_at: string
  updated_at: string
}
export type PosLaudoPontosInsert = ComDefaults<
  PosLaudoPontosRow,
  | 'id'
  | 'origem_ponto'
  | 'tema'
  | 'sintese_alegacao'
  | 'ja_abordado_no_laudo'
  | 'referencia_laudo'
  | 'classificacao_triagem'
  | 'potencial_alterar_conclusao'
  | 'fundamentacao_adicional'
  | 'resposta_tecnica'
  | 'repercussao'
  | 'categoria_problema'
  | 'created_at'
  | 'updated_at'
>
export type PosLaudoPontosUpdate = Partial<PosLaudoPontosRow>

// ============================================================================
// pos_laudo_ponto_evidencias
// ============================================================================
export type PosLaudoPontoEvidenciasRow = {
  id: string
  ponto_id: string
  documento_id: string | null
  resposta_processo_id: string | null
  observacao: string | null
  created_at: string
}
export type PosLaudoPontoEvidenciasInsert = ComDefaults<
  PosLaudoPontoEvidenciasRow,
  'id' | 'documento_id' | 'resposta_processo_id' | 'observacao' | 'created_at'
>
export type PosLaudoPontoEvidenciasUpdate = Partial<PosLaudoPontoEvidenciasRow>

// ============================================================================
// pos_laudo_documentos
// ============================================================================
export type PosLaudoDocumentosRow = {
  id: string
  ciclo_id: string
  documento_id: string
  papel: PosLaudoDocumentoPapel
  apresentante: string | null
  data_juntada: string | null
  paginas: string | null
  existencia_previa: boolean | null
  disponivel_ao_perito_antes: boolean | null
  relevancia: PosLaudoDocumentoRelevancia | null
  impacto: string | null
  ja_enfrentado: boolean
  observacao_tecnica: string | null
  created_at: string
  updated_at: string
}
export type PosLaudoDocumentosInsert = ComDefaults<
  PosLaudoDocumentosRow,
  | 'id'
  | 'papel'
  | 'apresentante'
  | 'data_juntada'
  | 'paginas'
  | 'existencia_previa'
  | 'disponivel_ao_perito_antes'
  | 'relevancia'
  | 'impacto'
  | 'ja_enfrentado'
  | 'observacao_tecnica'
  | 'created_at'
  | 'updated_at'
>
export type PosLaudoDocumentosUpdate = Partial<PosLaudoDocumentosRow>

// ============================================================================
// pos_laudo_retificacao_itens
// ============================================================================
export type PosLaudoRetificacaoItensRow = {
  id: string
  ciclo_id: string
  documento_alvo_id: string | null
  ordem: number
  pagina: string | null
  item_secao: string | null
  onde_se_le: string
  leia_se: string
  natureza_erro: string | null
  created_at: string
  updated_at: string
}
export type PosLaudoRetificacaoItensInsert = ComDefaults<
  PosLaudoRetificacaoItensRow,
  | 'id'
  | 'documento_alvo_id'
  | 'pagina'
  | 'item_secao'
  | 'natureza_erro'
  | 'created_at'
  | 'updated_at'
>
export type PosLaudoRetificacaoItensUpdate = Partial<PosLaudoRetificacaoItensRow>

// ============================================================================
// pos_laudo_complementacao  (20260909120000_pos_laudo_complementacao.sql)
// ============================================================================
export type PosLaudoComplementacaoRow = {
  id: string
  ciclo_id: string
  // I
  id_documento_origem: string | null
  // II — códigos PosLaudoComplementacaoMotivo (validado na aplicação)
  motivos: string[]
  motivo_descricao: string | null
  // III
  impacto_elementos: PosLaudoComplementacaoImpacto | null
  impacto_fundamentacao: string | null
  // IV
  avaliacao_realizada: boolean
  avaliacao_data: string | null
  avaliacao_horario: string | null
  avaliacao_local: string | null
  avaliacao_presentes: string | null
  avaliacao_assistentes: string | null
  avaliacao_documentos_ato: string | null
  avaliacao_achados: string | null
  avaliacao_comparacao: string | null
  // V
  exames_realizados: boolean
  exame_descricao: string | null
  exame_data: string | null
  exame_profissional: string | null
  exame_resultado: string | null
  exame_repercussao: string | null
  // VI
  vi_mantidos: string | null
  vi_necessitam: string | null
  vi_revistos: string | null
  vi_fundamentacao: string | null
  // VII
  vii_elementos: ComplementacaoElementosCentrais
  created_at: string
  updated_at: string
}
export type PosLaudoComplementacaoInsert = ComDefaults<
  PosLaudoComplementacaoRow,
  | 'id'
  | 'id_documento_origem'
  | 'motivos'
  | 'motivo_descricao'
  | 'impacto_elementos'
  | 'impacto_fundamentacao'
  | 'avaliacao_realizada'
  | 'avaliacao_data'
  | 'avaliacao_horario'
  | 'avaliacao_local'
  | 'avaliacao_presentes'
  | 'avaliacao_assistentes'
  | 'avaliacao_documentos_ato'
  | 'avaliacao_achados'
  | 'avaliacao_comparacao'
  | 'exames_realizados'
  | 'exame_descricao'
  | 'exame_data'
  | 'exame_profissional'
  | 'exame_resultado'
  | 'exame_repercussao'
  | 'vi_mantidos'
  | 'vi_necessitam'
  | 'vi_revistos'
  | 'vi_fundamentacao'
  | 'vii_elementos'
  | 'created_at'
  | 'updated_at'
>
export type PosLaudoComplementacaoUpdate = Partial<PosLaudoComplementacaoRow>

// ============================================================================
// pos_laudo_at_analise  (20260910120000_pos_laudo_at.sql)
// ============================================================================
// "Análise estruturada do laudo judicial" no fluxo AT (Gestão Assistência
// Técnica.pdf §12), 1:1 com o ciclo. Cada eixo é boolean | null (null = não
// avaliado) + uma nota de texto. Resultado global = pos_laudo_ciclos.classificacao_global.
export type PosLaudoAtAnaliseRow = {
  id: string
  ciclo_id: string
  conclusao_do_perito: string | null
  respondeu_objeto: boolean | null
  respondeu_objeto_nota: string | null
  respondeu_quesitos: boolean | null
  respondeu_quesitos_nota: string | null
  considerou_documentos: boolean | null
  considerou_documentos_nota: string | null
  tem_omissoes: boolean | null
  tem_omissoes_nota: string | null
  tem_contradicoes: boolean | null
  tem_contradicoes_nota: string | null
  tem_erros_tecnicos: boolean | null
  tem_erros_tecnicos_nota: string | null
  tem_erros_conceituais: boolean | null
  tem_erros_conceituais_nota: string | null
  extrapolou_objeto: boolean | null
  extrapolou_objeto_nota: string | null
  conclusoes_sem_fundamentacao: boolean | null
  conclusoes_sem_fundamentacao_nota: string | null
  divergencia_literatura: boolean | null
  divergencia_literatura_nota: string | null
  tem_fato_novo: boolean | null
  tem_fato_novo_nota: string | null
  favorece_tese: boolean | null
  favorece_tese_nota: string | null
  prejudica_tese: boolean | null
  prejudica_tese_nota: string | null
  impacto_processual: string | null
  created_at: string
  updated_at: string
}
export type PosLaudoAtAnaliseInsert = ComDefaults<
  PosLaudoAtAnaliseRow,
  | 'id'
  | 'conclusao_do_perito'
  | 'respondeu_objeto'
  | 'respondeu_objeto_nota'
  | 'respondeu_quesitos'
  | 'respondeu_quesitos_nota'
  | 'considerou_documentos'
  | 'considerou_documentos_nota'
  | 'tem_omissoes'
  | 'tem_omissoes_nota'
  | 'tem_contradicoes'
  | 'tem_contradicoes_nota'
  | 'tem_erros_tecnicos'
  | 'tem_erros_tecnicos_nota'
  | 'tem_erros_conceituais'
  | 'tem_erros_conceituais_nota'
  | 'extrapolou_objeto'
  | 'extrapolou_objeto_nota'
  | 'conclusoes_sem_fundamentacao'
  | 'conclusoes_sem_fundamentacao_nota'
  | 'divergencia_literatura'
  | 'divergencia_literatura_nota'
  | 'tem_fato_novo'
  | 'tem_fato_novo_nota'
  | 'favorece_tese'
  | 'favorece_tese_nota'
  | 'prejudica_tese'
  | 'prejudica_tese_nota'
  | 'impacto_processual'
  | 'created_at'
  | 'updated_at'
>
export type PosLaudoAtAnaliseUpdate = Partial<PosLaudoAtAnaliseRow>

// ============================================================================
// pos_laudo_quesitos
// ============================================================================
export type PosLaudoQuesitosRow = {
  id: string
  ciclo_id: string
  ponto_id: string | null
  tipo: PosLaudoQuesitoTipo
  origem: string | null
  numero: number | null
  pergunta: string
  resposta: string | null
  objetivo_estrategico_interno: string | null
  status: PosLaudoQuesitoStatus
  created_at: string
  updated_at: string
}
export type PosLaudoQuesitosInsert = ComDefaults<
  PosLaudoQuesitosRow,
  | 'id'
  | 'ponto_id'
  | 'origem'
  | 'numero'
  | 'resposta'
  | 'objetivo_estrategico_interno'
  | 'status'
  | 'created_at'
  | 'updated_at'
>
export type PosLaudoQuesitosUpdate = Partial<PosLaudoQuesitosRow>

// ============================================================================
// pos_laudo_conclusoes_vigentes
// ============================================================================
export type PosLaudoConclusoesVigentesRow = {
  id: string
  processo_id: string
  origem_tipo: PosLaudoConclusaoOrigem
  origem_laudo_gerado_id: string | null
  ciclo_id: string | null
  texto: string
  escopo: PosLaudoConclusaoEscopo
  vigente_desde: string
  substituida_em: string | null
  substituida_por_id: string | null
  created_by: string | null
  created_at: string
}
export type PosLaudoConclusoesVigentesInsert = ComDefaults<
  PosLaudoConclusoesVigentesRow,
  | 'id'
  | 'origem_laudo_gerado_id'
  | 'ciclo_id'
  | 'escopo'
  | 'vigente_desde'
  | 'substituida_em'
  | 'substituida_por_id'
  | 'created_by'
  | 'created_at'
>
export type PosLaudoConclusoesVigentesUpdate = Partial<PosLaudoConclusoesVigentesRow>

// ============================================================================
// central_tarefas — Central de Gestão de Prazos e Tarefas, fatia 2 (cadastro
// manual de tarefa/evento avulso). Ver migration 20260917120000.
// ============================================================================
export type CentralTarefasRow = {
  id: string
  /** Null = tarefa avulsa, sem processo específico. */
  processo_id: string | null
  tipo: TipoCentralTarefa
  titulo: string
  descricao: string | null
  /** date do Postgres — prazo (tarefa) ou data do compromisso (evento). */
  data: string
  /** time do Postgres, 'HH:MM:SS' — só quando tipo='evento' (CHECK no banco). */
  hora: string | null
  /** Vocabulário livre, sem CHECK — ver central-prazos/catalogos.ts. Obrigatório só pra tipo='tarefa' (CHECK no banco); opcional pra evento. */
  status: string | null
  status_alterado_em: string
  /** Quando preenchida, sempre vence o cálculo automático de nível. */
  nivel_urgencia_manual: NivelUrgencia | null
  /** Fato explícito e independente de `status` — null = ainda pendente. */
  concluida_em: string | null
  /** Quem deve executar — texto livre, catálogo editável. Muda ao longo do fluxo. */
  responsavel: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
export type CentralTarefasInsert = ComDefaults<
  CentralTarefasRow,
  | 'id'
  | 'processo_id'
  | 'descricao'
  | 'hora'
  | 'status'
  | 'status_alterado_em'
  | 'nivel_urgencia_manual'
  | 'concluida_em'
  | 'responsavel'
  | 'created_by'
  | 'created_at'
  | 'updated_at'
>
export type CentralTarefasUpdate = Partial<CentralTarefasRow>

// ============================================================================
// Janela de Análise de Viabilidade Técnico-Pericial
// (migration 20260926120000_analise_viabilidade_schema.sql)
// ============================================================================

export type AnalisesViabilidadeRow = {
  id: string
  processo_id: string
  status: ViabilidadeStatus
  posicao_cliente_litigio: string | null
  especialidade: string | null
  materia: string[] | null
  tags_tecnicas: string[] | null
  finalidade: string[]
  pergunta_central_advogado: string | null
  narrativa_advogado: string | null
  narrativa_cliente: string | null
  tese_inicial_apresentada: string | null
  narrativa_fonte_informacao: string | null
  objeto_analise: string | null
  suficiencia_documental: ViabilidadeSuficienciaDocumental | null
  /** §10 (migration 20260927120000). Vocabulário fechado, mas guardado como jsonb string[] — mesmo padrão de `finalidade`. */
  limitacoes_documentais: string[] | null
  limitacoes_impacto: ViabilidadeImpactoLimitacao | null
  limitacoes_justificativa: string | null
  oportunidade_diagnostica: ViabilidadeOportunidadeDiagnostica | null
  oportunidade_momento: string | null
  oportunidade_sinais: string | null
  oportunidade_exames: string | null
  oportunidade_conduta_possivel: string | null
  oportunidade_conduta_realizada: string | null
  oportunidade_houve_atraso: ViabilidadeHouveAtraso | null
  oportunidade_duracao_estimada: string | null
  oportunidade_repercussao: string | null
  oportunidade_evidencias: string | null
  oportunidade_grau_seguranca: ViabilidadeGrauSeguranca | null
  /** INTERNO — nunca aparece no PDF (garantido pela assinatura da função geradora, não por esta anotação). */
  risco_principal_tecnico: string | null
  risco_fato_desfavoravel: string | null
  risco_documento_prejudicial: string | null
  risco_pergunta_dificil: string | null
  risco_grau: ViabilidadeRiscoGrau | null
  risco_fundamentacao: string | null
  /** INTERNO — nunca aparece no PDF. Ver comentário da coluna na migration. */
  raciocinio_pericial_interno: string | null
  necessidade_especialista: ViabilidadeNecessidadeEspecialista | null
  matriz_suporte_documental: string | null
  matriz_sustentacao_conduta: string | null
  matriz_nexo: string | null
  matriz_dano: string | null
  matriz_fragilidades: string | null
  matriz_provas_faltantes: string | null
  matriz_risco_pericial: string | null
  matriz_sustentacao_global: string | null
  conclusao: ViabilidadeConclusao | null
  conclusao_fundamentacao: string | null
  conclusao_elementos_favoraveis: string | null
  conclusao_fragilidades: string | null
  conclusao_condicionantes: string | null
  recomendacao_justificativa: string | null
  proxima_acao: string | null
  proxima_acao_responsavel: string | null
  proxima_acao_prazo: string | null
  proxima_acao_prioridade: string | null
  pos_entrega_reuniao: ViabilidadePosEntregaReuniao | null
  pos_entrega_retorno_d7_em: string | null
  pos_entrega_satisfacao: ViabilidadeSatisfacao | null
  pos_entrega_orcamento_enviado: ViabilidadeOrcamentoEnviado | null
  pos_entrega_orcamento_enviado_em: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type AnalisesViabilidadeInsert = ComDefaults<
  AnalisesViabilidadeRow,
  | 'id'
  | 'status'
  | 'posicao_cliente_litigio'
  | 'especialidade'
  | 'materia'
  | 'tags_tecnicas'
  | 'finalidade'
  | 'pergunta_central_advogado'
  | 'narrativa_advogado'
  | 'narrativa_cliente'
  | 'tese_inicial_apresentada'
  | 'narrativa_fonte_informacao'
  | 'objeto_analise'
  | 'suficiencia_documental'
  | 'limitacoes_documentais'
  | 'limitacoes_impacto'
  | 'limitacoes_justificativa'
  | 'oportunidade_diagnostica'
  | 'oportunidade_momento'
  | 'oportunidade_sinais'
  | 'oportunidade_exames'
  | 'oportunidade_conduta_possivel'
  | 'oportunidade_conduta_realizada'
  | 'oportunidade_houve_atraso'
  | 'oportunidade_duracao_estimada'
  | 'oportunidade_repercussao'
  | 'oportunidade_evidencias'
  | 'oportunidade_grau_seguranca'
  | 'risco_principal_tecnico'
  | 'risco_fato_desfavoravel'
  | 'risco_documento_prejudicial'
  | 'risco_pergunta_dificil'
  | 'risco_grau'
  | 'risco_fundamentacao'
  | 'raciocinio_pericial_interno'
  | 'necessidade_especialista'
  | 'matriz_suporte_documental'
  | 'matriz_sustentacao_conduta'
  | 'matriz_nexo'
  | 'matriz_dano'
  | 'matriz_fragilidades'
  | 'matriz_provas_faltantes'
  | 'matriz_risco_pericial'
  | 'matriz_sustentacao_global'
  | 'conclusao'
  | 'conclusao_fundamentacao'
  | 'conclusao_elementos_favoraveis'
  | 'conclusao_fragilidades'
  | 'conclusao_condicionantes'
  | 'recomendacao_justificativa'
  | 'proxima_acao'
  | 'proxima_acao_responsavel'
  | 'proxima_acao_prazo'
  | 'proxima_acao_prioridade'
  | 'pos_entrega_reuniao'
  | 'pos_entrega_retorno_d7_em'
  | 'pos_entrega_satisfacao'
  | 'pos_entrega_orcamento_enviado'
  | 'pos_entrega_orcamento_enviado_em'
  | 'origem_modulo'
  | 'atualizado_por_modulo'
  | 'criado_por'
  | 'created_at'
  | 'updated_at'
>
export type AnalisesViabilidadeUpdate = Partial<AnalisesViabilidadeRow>

export type CasoQuestoesTecnicasRow = {
  id: string
  processo_id: string
  numero: number | null
  questao: string
  tema: string | null
  status: string | null
  resposta_preliminar: string | null
  fonte: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoQuestoesTecnicasInsert = ComDefaults<
  CasoQuestoesTecnicasRow,
  | 'id' | 'numero' | 'tema' | 'status' | 'resposta_preliminar' | 'fonte'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoQuestoesTecnicasUpdate = Partial<CasoQuestoesTecnicasRow>

export type CasoDocumentosAvaliadosRow = {
  id: string
  processo_id: string
  documento_id: string
  utilizado: boolean
  relevancia: ViabilidadeRelevanciaDocumento | null
  observacao_tecnica: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoDocumentosAvaliadosInsert = ComDefaults<
  CasoDocumentosAvaliadosRow,
  | 'id' | 'utilizado' | 'relevancia' | 'observacao_tecnica'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoDocumentosAvaliadosUpdate = Partial<CasoDocumentosAvaliadosRow>

export type CasoDocumentosFaltantesRow = {
  id: string
  processo_id: string
  documento_necessario: string
  justificativa_tecnica: string | null
  quem_provavelmente_possui: string | null
  prioridade: string | null
  impacto: ViabilidadeImpactoDocumentoFaltante | null
  responsavel: string | null
  prazo: string | null
  status: string | null
  visivel_meu_perito: boolean
  resolvido_em: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoDocumentosFaltantesInsert = ComDefaults<
  CasoDocumentosFaltantesRow,
  | 'id' | 'justificativa_tecnica' | 'quem_provavelmente_possui' | 'prioridade' | 'impacto'
  | 'responsavel' | 'prazo' | 'status' | 'visivel_meu_perito' | 'resolvido_em'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoDocumentosFaltantesUpdate = Partial<CasoDocumentosFaltantesRow>

export type CasoLinhaTempoMedicaRow = {
  id: string
  processo_id: string
  data: string
  hora: string | null
  evento: string
  categoria: ViabilidadeCategoriaLinhaTempo | null
  documento_id: string | null
  pagina_ref: string | null
  relevancia: string | null
  observacao_tecnica: string | null
  marco_critico: boolean
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoLinhaTempoMedicaInsert = ComDefaults<
  CasoLinhaTempoMedicaRow,
  | 'id' | 'hora' | 'categoria' | 'documento_id' | 'pagina_ref' | 'relevancia' | 'observacao_tecnica' | 'marco_critico'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoLinhaTempoMedicaUpdate = Partial<CasoLinhaTempoMedicaRow>

export type CasoFatosComprovadosRow = {
  id: string
  processo_id: string
  fato: string
  data: string | null
  documento_id: string | null
  pagina_ref: string | null
  relevancia: string | null
  questao_tecnica_id: string | null
  classificacao: ViabilidadeClassificacaoFato
  /** §12 (migration 20260928120000). Só fatos com isto preenchido migram pro PDF sem exigir nova revisão na fatia 8. */
  validado_em: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoFatosComprovadosInsert = ComDefaults<
  CasoFatosComprovadosRow,
  | 'id' | 'data' | 'documento_id' | 'pagina_ref' | 'relevancia' | 'questao_tecnica_id' | 'validado_em'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoFatosComprovadosUpdate = Partial<CasoFatosComprovadosRow>

export type CasoPontosTecnicosRow = {
  id: string
  processo_id: string
  ponto_tecnico: string
  narrativa_apresentada: string | null
  evidencia_documental: string | null
  possivel_controversia: string | null
  avaliacao_tecnica: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoPontosTecnicosInsert = ComDefaults<
  CasoPontosTecnicosRow,
  | 'id' | 'narrativa_apresentada' | 'evidencia_documental' | 'possivel_controversia' | 'avaliacao_tecnica'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoPontosTecnicosUpdate = Partial<CasoPontosTecnicosRow>

export type CasoCondutasAnalisadasRow = {
  id: string
  processo_id: string
  profissional_instituicao: string
  papel: string | null
  periodo_inicio: string | null
  periodo_fim: string | null
  conduta_questionada: string | null
  conduta_documentada: string | null
  conduta_esperada: string | null
  fonte: string | null
  literatura_norma: string | null
  avaliacao: ViabilidadeAvaliacaoConduta | null
  repercussao: string | null
  seguranca: ViabilidadeGrauSeguranca | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoCondutasAnalisadasInsert = ComDefaults<
  CasoCondutasAnalisadasRow,
  | 'id' | 'papel' | 'periodo_inicio' | 'periodo_fim' | 'conduta_questionada' | 'conduta_documentada'
  | 'conduta_esperada' | 'fonte' | 'literatura_norma' | 'avaliacao' | 'repercussao' | 'seguranca'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoCondutasAnalisadasUpdate = Partial<CasoCondutasAnalisadasRow>

/** 1:1 por processo — ver nota de versionamento futuro na migration. */
export type CasoNexoCausalRow = {
  id: string
  processo_id: string
  aplicavel: boolean
  conduta_evento: string | null
  dano: string | null
  temporalidade: string | null
  topografia: string | null
  plausibilidade_biologica: string | null
  compatibilidade_fisiopatologica: string | null
  preexistencias: string | null
  concausas: string | null
  causas_alternativas_texto: string | null
  intercorrencias_independentes: string | null
  evidencias_favoraveis: string | null
  evidencias_contrarias: string | null
  fundamentacao: string | null
  conclusao: ViabilidadeConclusaoNexo | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoNexoCausalInsert = ComDefaults<
  CasoNexoCausalRow,
  | 'id' | 'aplicavel' | 'conduta_evento' | 'dano' | 'temporalidade' | 'topografia' | 'plausibilidade_biologica'
  | 'compatibilidade_fisiopatologica' | 'preexistencias' | 'concausas' | 'causas_alternativas_texto'
  | 'intercorrencias_independentes' | 'evidencias_favoraveis' | 'evidencias_contrarias' | 'fundamentacao' | 'conclusao'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoNexoCausalUpdate = Partial<CasoNexoCausalRow>

/** 1:1 por processo — ver nota de versionamento futuro na migration. */
export type CasoDanoRow = {
  id: string
  processo_id: string
  existe: ViabilidadeDanoExiste | null
  natureza: string | null
  data_inicio: string | null
  situacao_atual: string | null
  temporario_permanente: ViabilidadeDanoTemporarioPermanente | null
  reversibilidade: string | null
  repercussao_funcional: string | null
  tratamentos: string | null
  necessidade_terceiros: string | null
  prognostico: string | null
  documentacao: string | null
  /** SEMPRE separado de `existe` (§17: "separar sempre existência do dano de atribuição causal"). */
  atribuicao_causal: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoDanoInsert = ComDefaults<
  CasoDanoRow,
  | 'id' | 'existe' | 'natureza' | 'data_inicio' | 'situacao_atual' | 'temporario_permanente' | 'reversibilidade'
  | 'repercussao_funcional' | 'tratamentos' | 'necessidade_terceiros' | 'prognostico' | 'documentacao' | 'atribuicao_causal'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoDanoUpdate = Partial<CasoDanoRow>

/** 1:1 por processo — ver nota de versionamento futuro na migration. */
export type CasoIncapacidadeRow = {
  id: string
  processo_id: string
  pertinente: boolean
  profissao: string | null
  atividade_habitual: string | null
  exigencias_funcionais: string | null
  limitacoes: string | null
  incapacidade_atual: string | null
  parcial_total: ViabilidadeParcialTotal | null
  temporaria_permanente: ViabilidadeIncapacidadeTemporariaPermanente | null
  reabilitacao: string | null
  data_provavel_inicio: string | null
  prognostico: string | null
  necessidade_avaliacao_complementar: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoIncapacidadeInsert = ComDefaults<
  CasoIncapacidadeRow,
  | 'id' | 'pertinente' | 'profissao' | 'atividade_habitual' | 'exigencias_funcionais' | 'limitacoes'
  | 'incapacidade_atual' | 'parcial_total' | 'temporaria_permanente' | 'reabilitacao' | 'data_provavel_inicio'
  | 'prognostico' | 'necessidade_avaliacao_complementar'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoIncapacidadeUpdate = Partial<CasoIncapacidadeRow>

export type CasoCausasAlternativasRow = {
  id: string
  processo_id: string
  hipotese: string
  elementos_favoraveis: string | null
  elementos_contrarios: string | null
  documento_id: string | null
  plausibilidade: ViabilidadePlausibilidade | null
  impacto_sobre_tese: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoCausasAlternativasInsert = ComDefaults<
  CasoCausasAlternativasRow,
  | 'id' | 'elementos_favoraveis' | 'elementos_contrarios' | 'documento_id' | 'plausibilidade' | 'impacto_sobre_tese'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoCausasAlternativasUpdate = Partial<CasoCausasAlternativasRow>

export type CasoPontosFavoraveisRow = {
  id: string
  processo_id: string
  descricao: string
  documento_id: string | null
  questao_tecnica_id: string | null
  importancia: string | null
  forca_probatoria: ViabilidadeForcaProbatoria | null
  observacao: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoPontosFavoraveisInsert = ComDefaults<
  CasoPontosFavoraveisRow,
  | 'id' | 'documento_id' | 'questao_tecnica_id' | 'importancia' | 'forca_probatoria' | 'observacao'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoPontosFavoraveisUpdate = Partial<CasoPontosFavoraveisRow>

export type CasoFragilidadesRow = {
  id: string
  processo_id: string
  descricao: string
  motivo: string | null
  evidencia: string | null
  impacto: ViabilidadeImpactoFragilidade | null
  possibilidade_mitigacao: string | null
  prova_necessaria: string | null
  responsavel: string | null
  prazo: string | null
  oportunidade_probatoria_id: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoFragilidadesInsert = ComDefaults<
  CasoFragilidadesRow,
  | 'id' | 'motivo' | 'evidencia' | 'impacto' | 'possibilidade_mitigacao' | 'prova_necessaria' | 'responsavel' | 'prazo'
  | 'oportunidade_probatoria_id'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoFragilidadesUpdate = Partial<CasoFragilidadesRow>

export type CasoOportunidadesProbatoriasRow = {
  id: string
  processo_id: string
  providencia: string
  tipo_prova: ViabilidadeTipoProva | null
  objetivo: string | null
  responsavel: string | null
  prazo: string | null
  prioridade: string | null
  status: string | null
  resolvido_em: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoOportunidadesProbatoriasInsert = ComDefaults<
  CasoOportunidadesProbatoriasRow,
  | 'id' | 'tipo_prova' | 'objetivo' | 'responsavel' | 'prazo' | 'prioridade' | 'status' | 'resolvido_em'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoOportunidadesProbatoriasUpdate = Partial<CasoOportunidadesProbatoriasRow>

/** INTEIRAMENTE interna — nunca aparece no PDF externo (ver comentário da tabela na migration). */
export type CasoTeseAdversaRow = {
  id: string
  processo_id: string
  argumento_previsivel: string
  fundamento_possivel: string | null
  documento_id: string | null
  resposta_tecnica_possivel: string | null
  prova_necessaria: string | null
  forca_estimada: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoTeseAdversaInsert = ComDefaults<
  CasoTeseAdversaRow,
  | 'id' | 'fundamento_possivel' | 'documento_id' | 'resposta_tecnica_possivel' | 'prova_necessaria' | 'forca_estimada'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoTeseAdversaUpdate = Partial<CasoTeseAdversaRow>

export type CasoLiteraturaUtilizadaRow = {
  id: string
  processo_id: string
  biblioteca_pericial_id: string | null
  titulo: string
  autor_entidade: string | null
  tipo: ViabilidadeTipoLiteratura | null
  ano: number | null
  identificador_link: string | null
  tema: string | null
  conceito_relevante: string | null
  ponto_analise_utilizado: string | null
  arquivo_documento_id: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoLiteraturaUtilizadaInsert = ComDefaults<
  CasoLiteraturaUtilizadaRow,
  | 'id' | 'biblioteca_pericial_id' | 'autor_entidade' | 'tipo' | 'ano' | 'identificador_link' | 'tema'
  | 'conceito_relevante' | 'ponto_analise_utilizado' | 'arquivo_documento_id'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoLiteraturaUtilizadaUpdate = Partial<CasoLiteraturaUtilizadaRow>

export type CasoNecessidadeEspecialistaRow = {
  id: string
  processo_id: string
  nome_especialista: string | null
  especialidade: string | null
  finalidade: string | null
  questao_tecnica_id: string | null
  prioridade: string | null
  prazo: string | null
  status: string | null
  resolvido_em: string | null
  origem_modulo: ModuloOrigemCaso
  atualizado_por_modulo: ModuloOrigemCaso
  criado_por: string | null
  created_at: string
  updated_at: string
}
export type CasoNecessidadeEspecialistaInsert = ComDefaults<
  CasoNecessidadeEspecialistaRow,
  | 'id' | 'nome_especialista' | 'especialidade' | 'finalidade' | 'questao_tecnica_id' | 'prioridade' | 'prazo' | 'status'
  | 'resolvido_em'
  | 'origem_modulo' | 'atualizado_por_modulo' | 'criado_por' | 'created_at' | 'updated_at'
>
export type CasoNecessidadeEspecialistaUpdate = Partial<CasoNecessidadeEspecialistaRow>

export type PerfisRow = {
  id: string
  nome: string
  created_at: string
  updated_at: string
}
export type PerfisInsert = ComDefaults<PerfisRow, 'id' | 'created_at' | 'updated_at'>
export type PerfisUpdate = Partial<PerfisRow>

export type PerfilPermissoesRow = {
  id: string
  perfil_id: string
  modulo: ModuloSistema
  created_at: string
}
export type PerfilPermissoesInsert = ComDefaults<PerfilPermissoesRow, 'id' | 'created_at'>
export type PerfilPermissoesUpdate = Partial<PerfilPermissoesRow>

export type PerfilUsuariosRow = {
  id: string
  perfil_id: string
  email: string
  nome_exibicao: string
  created_at: string
}
export type PerfilUsuariosInsert = ComDefaults<PerfilUsuariosRow, 'id' | 'created_at'>
export type PerfilUsuariosUpdate = Partial<PerfilUsuariosRow>

// ============================================================================
// Database — shape esperado por createClient<Database>()
// ============================================================================
export interface Database {
  public: {
    Tables: {
      tipos_laudo: {
        Row: TiposLaudoRow
        Insert: TiposLaudoInsert
        Update: TiposLaudoUpdate
        Relationships: []
      }
      secoes: {
        Row: SecoesRow
        Insert: SecoesInsert
        Update: SecoesUpdate
        Relationships: []
      }
      campos_secao: {
        Row: CamposSecaoRow
        Insert: CamposSecaoInsert
        Update: CamposSecaoUpdate
        Relationships: []
      }
      processos: {
        Row: ProcessosRow
        Insert: ProcessosInsert
        Update: ProcessosUpdate
        Relationships: []
      }
      processo_partes: {
        Row: ProcessoPartesRow
        Insert: ProcessoPartesInsert
        Update: ProcessoPartesUpdate
        Relationships: []
      }
      documentos: {
        Row: DocumentosRow
        Insert: DocumentosInsert
        Update: DocumentosUpdate
        Relationships: []
      }
      configuracoes: {
        Row: ConfiguracoesRow
        Insert: ConfiguracoesInsert
        Update: ConfiguracoesUpdate
        Relationships: []
      }
      respostas_processo: {
        Row: RespostasProcessoRow
        Insert: RespostasProcessoInsert
        Update: RespostasProcessoUpdate
        Relationships: []
      }
      respostas_secao: {
        Row: RespostasSecaoRow
        Insert: RespostasSecaoInsert
        Update: RespostasSecaoUpdate
        Relationships: []
      }
      resposta_evidencias: {
        Row: RespostaEvidenciasRow
        Insert: RespostaEvidenciasInsert
        Update: RespostaEvidenciasUpdate
        Relationships: []
      }
      respostas_reutilizaveis: {
        Row: RespostasReutilizaveisRow
        Insert: RespostasReutilizaveisInsert
        Update: RespostasReutilizaveisUpdate
        Relationships: []
      }
      biblioteca_pericial: {
        Row: BibliotecaPericialRow
        Insert: BibliotecaPericialInsert
        Update: BibliotecaPericialUpdate
        Relationships: []
      }
      movimentacoes_financeiras: {
        Row: MovimentacoesFinanceirasRow
        Insert: MovimentacoesFinanceirasInsert
        Update: MovimentacoesFinanceirasUpdate
        Relationships: []
      }
      quesitos: {
        Row: QuesitosRow
        Insert: QuesitosInsert
        Update: QuesitosUpdate
        Relationships: []
      }
      laudos_gerados: {
        Row: LaudosGeradosRow
        Insert: LaudosGeradosInsert
        Update: LaudosGeradosUpdate
        Relationships: []
      }
      pos_laudo_ciclos: {
        Row: PosLaudoCiclosRow
        Insert: PosLaudoCiclosInsert
        Update: PosLaudoCiclosUpdate
        Relationships: []
      }
      pos_laudo_pontos: {
        Row: PosLaudoPontosRow
        Insert: PosLaudoPontosInsert
        Update: PosLaudoPontosUpdate
        Relationships: []
      }
      pos_laudo_ponto_evidencias: {
        Row: PosLaudoPontoEvidenciasRow
        Insert: PosLaudoPontoEvidenciasInsert
        Update: PosLaudoPontoEvidenciasUpdate
        Relationships: []
      }
      pos_laudo_documentos: {
        Row: PosLaudoDocumentosRow
        Insert: PosLaudoDocumentosInsert
        Update: PosLaudoDocumentosUpdate
        Relationships: []
      }
      pos_laudo_retificacao_itens: {
        Row: PosLaudoRetificacaoItensRow
        Insert: PosLaudoRetificacaoItensInsert
        Update: PosLaudoRetificacaoItensUpdate
        Relationships: []
      }
      pos_laudo_complementacao: {
        Row: PosLaudoComplementacaoRow
        Insert: PosLaudoComplementacaoInsert
        Update: PosLaudoComplementacaoUpdate
        Relationships: []
      }
      pos_laudo_at_analise: {
        Row: PosLaudoAtAnaliseRow
        Insert: PosLaudoAtAnaliseInsert
        Update: PosLaudoAtAnaliseUpdate
        Relationships: []
      }
      pos_laudo_quesitos: {
        Row: PosLaudoQuesitosRow
        Insert: PosLaudoQuesitosInsert
        Update: PosLaudoQuesitosUpdate
        Relationships: []
      }
      pos_laudo_conclusoes_vigentes: {
        Row: PosLaudoConclusoesVigentesRow
        Insert: PosLaudoConclusoesVigentesInsert
        Update: PosLaudoConclusoesVigentesUpdate
        Relationships: []
      }
      central_tarefas: {
        Row: CentralTarefasRow
        Insert: CentralTarefasInsert
        Update: CentralTarefasUpdate
        Relationships: []
      }
      analises_viabilidade: {
        Row: AnalisesViabilidadeRow
        Insert: AnalisesViabilidadeInsert
        Update: AnalisesViabilidadeUpdate
        Relationships: []
      }
      caso_questoes_tecnicas: {
        Row: CasoQuestoesTecnicasRow
        Insert: CasoQuestoesTecnicasInsert
        Update: CasoQuestoesTecnicasUpdate
        Relationships: []
      }
      caso_documentos_avaliados: {
        Row: CasoDocumentosAvaliadosRow
        Insert: CasoDocumentosAvaliadosInsert
        Update: CasoDocumentosAvaliadosUpdate
        Relationships: []
      }
      caso_documentos_faltantes: {
        Row: CasoDocumentosFaltantesRow
        Insert: CasoDocumentosFaltantesInsert
        Update: CasoDocumentosFaltantesUpdate
        Relationships: []
      }
      caso_linha_tempo_medica: {
        Row: CasoLinhaTempoMedicaRow
        Insert: CasoLinhaTempoMedicaInsert
        Update: CasoLinhaTempoMedicaUpdate
        Relationships: []
      }
      caso_fatos_comprovados: {
        Row: CasoFatosComprovadosRow
        Insert: CasoFatosComprovadosInsert
        Update: CasoFatosComprovadosUpdate
        Relationships: []
      }
      caso_pontos_tecnicos: {
        Row: CasoPontosTecnicosRow
        Insert: CasoPontosTecnicosInsert
        Update: CasoPontosTecnicosUpdate
        Relationships: []
      }
      caso_condutas_analisadas: {
        Row: CasoCondutasAnalisadasRow
        Insert: CasoCondutasAnalisadasInsert
        Update: CasoCondutasAnalisadasUpdate
        Relationships: []
      }
      caso_nexo_causal: {
        Row: CasoNexoCausalRow
        Insert: CasoNexoCausalInsert
        Update: CasoNexoCausalUpdate
        Relationships: []
      }
      caso_dano: {
        Row: CasoDanoRow
        Insert: CasoDanoInsert
        Update: CasoDanoUpdate
        Relationships: []
      }
      caso_incapacidade: {
        Row: CasoIncapacidadeRow
        Insert: CasoIncapacidadeInsert
        Update: CasoIncapacidadeUpdate
        Relationships: []
      }
      caso_causas_alternativas: {
        Row: CasoCausasAlternativasRow
        Insert: CasoCausasAlternativasInsert
        Update: CasoCausasAlternativasUpdate
        Relationships: []
      }
      caso_pontos_favoraveis: {
        Row: CasoPontosFavoraveisRow
        Insert: CasoPontosFavoraveisInsert
        Update: CasoPontosFavoraveisUpdate
        Relationships: []
      }
      caso_fragilidades: {
        Row: CasoFragilidadesRow
        Insert: CasoFragilidadesInsert
        Update: CasoFragilidadesUpdate
        Relationships: []
      }
      caso_oportunidades_probatorias: {
        Row: CasoOportunidadesProbatoriasRow
        Insert: CasoOportunidadesProbatoriasInsert
        Update: CasoOportunidadesProbatoriasUpdate
        Relationships: []
      }
      caso_tese_adversa: {
        Row: CasoTeseAdversaRow
        Insert: CasoTeseAdversaInsert
        Update: CasoTeseAdversaUpdate
        Relationships: []
      }
      caso_literatura_utilizada: {
        Row: CasoLiteraturaUtilizadaRow
        Insert: CasoLiteraturaUtilizadaInsert
        Update: CasoLiteraturaUtilizadaUpdate
        Relationships: []
      }
      caso_necessidade_especialista: {
        Row: CasoNecessidadeEspecialistaRow
        Insert: CasoNecessidadeEspecialistaInsert
        Update: CasoNecessidadeEspecialistaUpdate
        Relationships: []
      }
      perfis: {
        Row: PerfisRow
        Insert: PerfisInsert
        Update: PerfisUpdate
        Relationships: []
      }
      perfil_permissoes: {
        Row: PerfilPermissoesRow
        Insert: PerfilPermissoesInsert
        Update: PerfilPermissoesUpdate
        Relationships: []
      }
      perfil_usuarios: {
        Row: PerfilUsuariosRow
        Insert: PerfilUsuariosInsert
        Update: PerfilUsuariosUpdate
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}
