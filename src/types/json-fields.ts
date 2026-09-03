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
 * Uma condição simples: a resposta de UM campo decide a visibilidade (visível
 * quando o valor bate com algum de `valores_gatilho`). Forma original —
 * continua sendo a mais comum, e é a única forma que os seeds de
 * Curatela/Previdenciário/Trabalhista usam.
 */
export interface CondicaoSimples {
  /** codigo (campos_secao.codigo) do campo cuja resposta decide a visibilidade */
  campo_codigo: string
  /** valores (codigo da opção escolhida) que tornam o item visível */
  valores_gatilho: string[]
}

/**
 * Regra de visibilidade genérica usada tanto por seções condicionais quanto
 * por campos condicionais (incluindo os sub-campos do exame físico por
 * sistema, pendurados via campos_secao.parent_campo_id).
 *
 * Duas formas, ambas válidas em secoes.condicao e campos_secao.condicao:
 *  - CondicaoSimples (forma original, ver acima).
 *  - `{ todas: CondicaoSimples[] }` — combinação por E lógico: só fica
 *    visível quando TODAS as condições simples da lista forem satisfeitas ao
 *    mesmo tempo. Adicionado no mapeamento do Erro Médico (Seção XII —
 *    "Exame Médico-Pericial Direto" só deve aparecer quando o periciando
 *    está vivo E a perícia não é indireta; uma condição simples só resolve
 *    "vivo", não as duas ao mesmo tempo). Não há suporte a "qualquer uma"
 *    (OU entre condições) nem a aninhamento — se isso for necessário num
 *    tipo futuro, expandir aqui em vez de forçar o `todas` a fazer o papel.
 *  Não muda a coluna do banco (continua jsonb livre) nem exige migration —
 *  só o formato interpretado pela aplicação.
 */
export type CondicaoVisibilidade = CondicaoSimples | { todas: CondicaoSimples[] }

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

// ----------------------------------------------------------------------------
// laudos_gerados.snapshot_respostas — arm do Pós-Laudo
// (migration 20260905120000_pos_laudo_schema.sql; plano §1.3)
// ----------------------------------------------------------------------------
// Depois que laudos_gerados passou a carregar também Esclarecimentos /
// Retificação / Complementação (e as saídas AT), o snapshot ganhou uma
// segunda forma. A discriminação é por `laudos_gerados.tipo` (a COLUNA):
//   row.tipo === 'laudo'  -> snapshot_respostas é SnapshotRespostas
//   row.tipo !== 'laudo'  -> snapshot_respostas é SnapshotPosLaudo
// Dentro do Pós-Laudo, o campo `tipo` do próprio snapshot distingue as 7
// naturezas de documento. Não é tipo "solto": a forma do snapshot fica
// amarrada a `tipo` e o tsc obriga a narrow antes de ler `secoes`/`pontos`.
//
// Linhas geradas ANTES desta migration não têm `tipo` na coluna nem
// discriminante no jsonb — um leitor futuro trata ausência de tipo como 'laudo'.

/** Um ponto da matriz de enfrentamento, congelado no snapshot de um documento de pós-laudo. */
export interface SnapshotPosLaudoPonto {
  ordem: number
  tema: string | null
  origem_ponto: string | null
  sintese_alegacao: string | null
  classificacao_triagem: string | null
  resposta_tecnica: string | null
  repercussao: string | null
}

/** Um quesito do ciclo, congelado. O objetivo estratégico interno (só AT) NUNCA entra no snapshot externo. */
export interface SnapshotPosLaudoQuesito {
  numero: number | null
  tipo: 'suplementar' | 'esclarecimento'
  origem: string | null
  pergunta: string
  resposta: string | null
}

/** Um item "onde se lê / leia-se" de uma Retificação, congelado. */
export interface SnapshotPosLaudoRetificacaoItem {
  ordem: number
  pagina: string | null
  item_secao: string | null
  onde_se_le: string
  leia_se: string
}

/**
 * laudos_gerados.snapshot_respostas quando `laudos_gerados.tipo` != 'laudo'.
 * Congela o conteúdo compilado de um documento de pós-laudo no momento da
 * geração (matriz de pontos + quesitos do ciclo + repercussão + conclusão),
 * para que editar o ciclo depois não altere um documento já entregue.
 */
export interface SnapshotPosLaudo {
  tipo: 'esclarecimentos' | 'retificacao' | 'complementacao' | 'parecer_at' | 'manifestacao_at' | 'impugnacao_at' | 'parecer_divergente_at'
  gerado_em: string // ISO 8601
  ciclo_id: string
  numero_ciclo: number
  fluxo: 'judicial' | 'assistencia_tecnica'
  pontos: SnapshotPosLaudoPonto[]
  quesitos_ciclo: SnapshotPosLaudoQuesito[]
  retificacao_itens: SnapshotPosLaudoRetificacaoItem[]
  /** Repercussão sobre o laudo original, nível de ciclo. */
  repercussao_ciclo: string | null
  /** Classificação global do laudo — só fluxo AT. */
  classificacao_global: string | null
  /** Texto da conclusão vigente registrada por este documento (quando altera/substitui). */
  conclusao_vigente_texto: string | null
}

/**
 * Forma de laudos_gerados.snapshot_respostas — união das duas naturezas.
 * Narrow por `laudos_gerados.tipo` (ver acima).
 */
export type SnapshotLaudoGerado = SnapshotRespostas | SnapshotPosLaudo
