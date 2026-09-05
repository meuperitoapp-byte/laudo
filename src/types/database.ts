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
  TipoDocumento,
  EtapaContratada,
  PosLaudoFluxo,
  PosLaudoCicloStatus,
  PosLaudoOrigem,
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
} from './enums'
import type {
  CondicaoVisibilidade,
  OpcaoCampo,
  ConfigTabela,
  ValorSelecionado,
  SnapshotLaudoGerado,
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
  /** Ação / Objeto da Perícia ou Assistência (texto livre + catálogo). Separado de tipo_laudo_id. */
  acao_objeto: string | null
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
  | 'situacao_processo'
  | 'situacao_financeira'
  | 'valor_processo'
  | 'honorario_apresentado'
  | 'honorario_arbitrado'
  | 'justica_gratuita'
  | 'aceitou_nomeacao'
  | 'url_processo'
  | 'acao_objeto'
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
  updated_at: string
}
export type ConfiguracoesInsert = ComDefaults<
  ConfiguracoesRow,
  'id' | 'rodape_judicial_texto' | 'rodape_at_texto' | 'updated_at'
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
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}
