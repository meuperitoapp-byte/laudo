/**
 * Formas dos campos `jsonb` do schema (ver supabase/migrations/20260821120000_schema_inicial.sql
 * e o resumo de schema discutido com a Dra. Fernanda). O Postgres não valida a forma
 * desses campos em tempo de escrita — jsonb é livre no banco — então a validação de
 * forma é responsabilidade da aplicação, usando estes tipos.
 */

// ----------------------------------------------------------------------------
// secoes.condicao e campos_secao.condicao
// ----------------------------------------------------------------------------

/**
 * Regra de visibilidade genérica usada tanto por seções condicionais quanto
 * por campos condicionais (incluindo os sub-campos do exame físico por
 * sistema, pendurados via campos_secao.parent_campo_id).
 */
export interface CondicaoVisibilidade {
  /** codigo (campos_secao.codigo) do campo cuja resposta decide a visibilidade */
  campo_codigo: string
  /** valores (codigo da opção escolhida) que tornam o item visível */
  valores_gatilho: string[]
}

// ----------------------------------------------------------------------------
// campos_secao.opcoes (tipo_campo = selecao_unica | selecao_multipla)
// ----------------------------------------------------------------------------

/** Uma opção marcável de um campo de seleção única/múltipla. */
export interface OpcaoCampo {
  codigo: string
  rotulo: string
  /** Texto que entra no laudo final (texto_narrativo) quando esta opção é marcada. */
  texto_automatico?: string | null
}

// ----------------------------------------------------------------------------
// campos_secao.config_tabela (tipo_campo = 'tabela')
// ----------------------------------------------------------------------------

/** Uma linha configurável da tabela (ex.: uma função avaliada). */
export interface LinhaTabelaConfig {
  codigo: string
  rotulo: string
}

/** Um valor possível de uma coluna fechada (ex.: um nível de uma escala). */
export interface OpcaoColunaTabela {
  codigo: string
  rotulo: string
}

/** Uma coluna configurável da tabela (ex.: a escala de dependência funcional). */
export interface ColunaTabelaConfig {
  codigo: string
  rotulo?: string
  /** 'selecao_unica' quando a coluna tem `opcoes` fechadas; 'texto_livre' quando é texto aberto (ex.: colunas de uma tabela de linhas dinâmicas). Opcional — a presença de `opcoes` já implica selecao_unica na prática. */
  tipo?: 'selecao_unica' | 'texto_livre'
  /** Valores possíveis da coluna, quando fechada (ex.: escala 0-3/NA com o rótulo de cada nível). */
  opcoes?: OpcaoColunaTabela[]
}

/**
 * Estrutura livre de uma tabela de laudo. Ex.: avaliação funcional
 * (~20-25 funções x escala 0-4/NA), matriz de documentos analisados, etc.
 * O mesmo formato serve para qualquer tabela dos 10 tipos de laudo.
 *
 * `linhas_dinamicas` (opcional, default false ausente): quando true, `linhas`
 * fica vazio no template — a perita adiciona/remove linhas livremente na UI
 * usando só as `colunas` definidas (ex.: Previdenciário, Seção VII.2 —
 * Benefícios anteriores: sem lista fixa de benefícios). Quando false/ausente,
 * `linhas` é a lista fechada do template (ex.: avaliação funcional).
 */
export interface ConfigTabela {
  linhas: LinhaTabelaConfig[]
  colunas: ColunaTabelaConfig[]
  linhas_dinamicas?: boolean
}

// ----------------------------------------------------------------------------
// respostas_processo.valor_selecionado
// ----------------------------------------------------------------------------

/**
 * Uma linha respondida de uma tabela com UMA coluna fechada — `linha`
 * referencia LinhaTabelaConfig.codigo, `valor` é o codigo da opção marcada
 * naquela coluna. Forma original (Curatela): mantida tal como está — não
 * mexer aqui é o que garante que tabelas já em produção (Curatela) continuam
 * lendo/escrevendo exatamente como antes.
 */
export interface ValorTabelaLinhaSimples {
  linha: string
  valor: string
}

/**
 * Uma linha respondida de uma tabela com DUAS OU MAIS colunas, ou com linhas
 * dinâmicas (config_tabela.linhas_dinamicas = true) — `valores` mapeia
 * ColunaTabelaConfig.codigo -> valor da célula (codigo da opção, se a coluna
 * for selecao_unica; texto livre, se for texto_livre). Em tabela de linhas
 * dinâmicas, `linha` é um id gerado pela aplicação ao adicionar a linha (não
 * existe em config_tabela.linhas, que fica vazio nesse caso).
 */
export interface ValorTabelaLinhaMultipla {
  linha: string
  valores: Record<string, string>
}

export type ValorTabelaLinha = ValorTabelaLinhaSimples | ValorTabelaLinhaMultipla

/**
 * respostas_processo.valor_selecionado — a forma depende do `tipo_campo` do
 * campos_secao referenciado (o jsonb em si não carrega um discriminante):
 *  - selecao_unica    -> string (codigo da opção marcada)
 *  - selecao_multipla -> string[] (códigos das opções marcadas)
 *  - tabela           -> ValorTabelaLinha[] (uma entrada por linha respondida —
 *                        ValorTabelaLinhaSimples quando a tabela tem 1 coluna
 *                        fechada e linhas fixas; ValorTabelaLinhaMultipla nos
 *                        demais casos, ver acima)
 *  - texto_livre      -> não usa esta coluna (fica em respostas_processo.texto_livre)
 */
export type ValorSelecionado = string | string[] | ValorTabelaLinha[]

// ----------------------------------------------------------------------------
// laudos_gerados.snapshot_respostas
// ----------------------------------------------------------------------------

/** Uma resposta congelada dentro do snapshot de uma versão gerada do laudo. */
export interface SnapshotResposta {
  campo_id: string
  campo_codigo: string
  rotulo: string
  valor_selecionado: ValorSelecionado | null
  texto_livre: string | null
  texto_narrativo: string | null
}

/** Uma seção congelada dentro do snapshot de uma versão gerada do laudo. */
export interface SnapshotSecao {
  secao_id: string
  codigo: string
  titulo: string
  ordem: number
  respostas: SnapshotResposta[]
}

/** Um quesito congelado — só existe fora de `secoes` porque quesitos não vêm de campos_secao/respostas_processo (tabela própria `quesitos`). */
export interface SnapshotQuesito {
  numero: number
  origem: string | null
  pergunta: string
  resposta: string | null
}

/**
 * laudos_gerados.snapshot_respostas — congela o conteúdo compilado no
 * momento da geração de uma versão do laudo (ver comentário da tabela na
 * migration), para que editar respostas depois não altere retroativamente
 * uma versão já entregue.
 *
 * Forma revisada ao implementar `geracao-laudo` (ver
 * src/features/geracao-laudo/compilar.ts, que agora produz isto de
 * verdade): adicionado `quesitos`, que a forma original (proposta antes de
 * existir código de geração) não previa.
 */
export interface SnapshotRespostas {
  gerado_em: string // ISO 8601
  tipo_laudo_codigo: string
  secoes: SnapshotSecao[]
  quesitos: SnapshotQuesito[]
}
