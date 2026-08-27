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
  TipoDocumento,
  EtapaContratada,
} from './enums'
import type {
  CondicaoVisibilidade,
  OpcaoCampo,
  ConfigTabela,
  ValorSelecionado,
  SnapshotRespostas,
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
// processos (19 colunas)
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
// laudos_gerados
// ============================================================================
export type LaudosGeradosRow = {
  id: string
  processo_id: string
  versao: number
  storage_path_pdf: string | null
  storage_path_docx: string | null
  snapshot_respostas: SnapshotRespostas | null
  gerado_por: string | null
  created_at: string
}
export type LaudosGeradosInsert = ComDefaults<
  LaudosGeradosRow,
  | 'id'
  | 'storage_path_pdf'
  | 'storage_path_docx'
  | 'snapshot_respostas'
  | 'gerado_por'
  | 'created_at'
>
export type LaudosGeradosUpdate = Partial<LaudosGeradosRow>

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
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
  }
}
