/**
 * Rótulos em pt-BR das colunas `text` + CHECK do Módulo Pós-Laudo
 * (migration 20260905120000_pos_laudo_schema.sql). Camada de apresentação —
 * o vocabulário canônico é o dos CHECKs / src/types/enums.ts.
 */

import type {
  PosLaudoFluxo,
  PosLaudoCicloStatus,
  PosLaudoOrigem,
  PosLaudoOrigemIdentificacao,
  PosLaudoNatureza,
  PosLaudoNaturezaErro,
  PosLaudoClassificacaoTriagem,
  PosLaudoPotencialConclusao,
  PosLaudoRepercussaoPonto,
  PosLaudoRepercussaoLaudo,
  PosLaudoComplementacaoMotivo,
  PosLaudoComplementacaoImpacto,
  PosLaudoElementoCentralSituacao,
  PosLaudoQuesitoTipo,
  PosLaudoQuesitoOrigemParte,
  PosLaudoClassificacaoGlobal,
  PosLaudoProvidenciaAt,
  PosLaudoAtModalidade,
  LaudoGeradoTipo,
} from "@/types/enums";

export const FLUXO_ROTULOS: Record<PosLaudoFluxo, string> = {
  judicial: "Perícia Judicial",
  assistencia_tecnica: "Assistência Técnica",
};

export const CICLO_STATUS_ROTULOS: Record<PosLaudoCicloStatus, string> = {
  aberto: "Aberto",
  triagem: "Em triagem",
  em_resposta: "Em resposta",
  aguardando_protocolo: "Aguardando protocolo",
  protocolado: "Protocolado",
  encerrado: "Encerrado",
};

export const ORIGEM_ROTULOS: Record<PosLaudoOrigem, string> = {
  autor: "Autor",
  reu: "Réu",
  ambos: "Ambos",
  juizo: "Juízo",
  mp: "Ministério Público",
  outro: "Outro",
};

/** Ordem de exibição fixa (não alfabética) — segue o registro de entrada do módulo. */
export const NATUREZA_ORDENADA: readonly PosLaudoNatureza[] = [
  "concordancia",
  "impugnacao",
  "esclarecimentos",
  "quesitos_suplementares",
  "complementacao",
  "documento_novo",
  "nova_pericia",
  "determinacao_judicial",
  "outra",
];

export const NATUREZA_ROTULOS: Record<PosLaudoNatureza, string> = {
  concordancia: "Concordância",
  impugnacao: "Impugnação",
  esclarecimentos: "Esclarecimentos",
  quesitos_suplementares: "Quesitos suplementares",
  complementacao: "Complementação",
  documento_novo: "Documento novo",
  nova_pericia: "Nova perícia",
  determinacao_judicial: "Determinação judicial",
  outra: "Outra",
};

/** pos_laudo_pontos.classificacao_triagem — ordem de exibição fixa (segue o registro do módulo). */
export const CLASSIFICACAO_TRIAGEM_ORDENADA: readonly PosLaudoClassificacaoTriagem[] = [
  "questionamento_pertinente",
  "esclarecimento_legitimo",
  "quesito_suplementar_pertinente",
  "documento_novo_relevante",
  "necessidade_complementacao",
  "divergencia_interpretativa",
  "mero_inconformismo",
  "reiteracao_quesito",
  "questao_juridica_fora_objeto",
];

export const CLASSIFICACAO_TRIAGEM_ROTULOS: Record<PosLaudoClassificacaoTriagem, string> = {
  questionamento_pertinente: "Questionamento pertinente",
  esclarecimento_legitimo: "Esclarecimento legítimo",
  quesito_suplementar_pertinente: "Quesito suplementar pertinente",
  documento_novo_relevante: "Documento novo relevante",
  necessidade_complementacao: "Necessidade de complementação",
  divergencia_interpretativa: "Divergência interpretativa",
  mero_inconformismo: "Mero inconformismo",
  reiteracao_quesito: "Reiteração de quesito",
  questao_juridica_fora_objeto: "Questão jurídica fora do objeto",
};

/** pos_laudo_ciclos.pode_modificar_conclusao (e, mais adiante, pos_laudo_pontos.potencial_alterar_conclusao). */
export const POTENCIAL_CONCLUSAO_ORDENADA: readonly PosLaudoPotencialConclusao[] = [
  "nao",
  "potencialmente",
  "sim",
  "depende_complementacao",
];

export const POTENCIAL_CONCLUSAO_ROTULOS: Record<PosLaudoPotencialConclusao, string> = {
  nao: "Não",
  potencialmente: "Potencialmente",
  sim: "Sim",
  depende_complementacao: "Depende de complementação",
};

/** pos_laudo_pontos.repercussao — o que o ponto (já respondido) faz no laudo original. */
export const REPERCUSSAO_PONTO_ORDENADA: readonly PosLaudoRepercussaoPonto[] = [
  "ponto_ja_esclarecido",
  "fundamentacao_complementada",
  "retificacao_necessaria",
  "conclusao_parcialmente_modificada",
  "sem_repercussao",
];

export const REPERCUSSAO_PONTO_ROTULOS: Record<PosLaudoRepercussaoPonto, string> = {
  ponto_ja_esclarecido: "Ponto já esclarecido no laudo",
  fundamentacao_complementada: "Fundamentação complementada",
  retificacao_necessaria: "Retificação necessária",
  conclusao_parcialmente_modificada: "Conclusão parcialmente modificada",
  sem_repercussao: "Sem repercussão",
};

/** pos_laudo_ciclos.repercussao_laudo — síntese de ciclo (modelo Esclarecimentos VI / Complementação IX). */
export const REPERCUSSAO_LAUDO_ORDENADA: readonly PosLaudoRepercussaoLaudo[] = [
  "mantido_integralmente",
  "complementado_sem_alterar",
  "retificacao_sem_repercussao",
  "modificacao_parcial",
  "revisao_substancial",
  "substituicao_conclusao",
];

export const REPERCUSSAO_LAUDO_ROTULOS: Record<PosLaudoRepercussaoLaudo, string> = {
  mantido_integralmente: "Mantido integralmente",
  complementado_sem_alterar: "Complementado, sem alterar a conclusão",
  retificacao_sem_repercussao: "Retificação de erro material, sem repercussão",
  modificacao_parcial: "Modificação parcial da fundamentação e/ou conclusão",
  revisao_substancial: "Revisão substancial da conclusão",
  substituicao_conclusao: "Substituição da conclusão anterior",
};

/** Valores de repercussao_laudo que exigem "Nova Conclusão Vigente" (trava de aplicação). */
export const REPERCUSSAO_LAUDO_EXIGE_NOVA_CONCLUSAO: readonly PosLaudoRepercussaoLaudo[] = [
  "modificacao_parcial",
  "revisao_substancial",
  "substituicao_conclusao",
];

/** pos_laudo_retificacao_itens.natureza_erro — seção II do modelo de Retificação de Erro Material. */
export const NATUREZA_ERRO_ORDENADA: readonly PosLaudoNaturezaErro[] = [
  "digitacao",
  "grafia",
  "nome_identificacao",
  "data",
  "numero_valor",
  "pagina_item_referencia",
  "troca_omissao",
  "formatacao",
  "outro",
];

export const NATUREZA_ERRO_ROTULOS: Record<PosLaudoNaturezaErro, string> = {
  digitacao: "Erro de digitação",
  grafia: "Erro de grafia",
  nome_identificacao: "Nome/identificação incorreta",
  data: "Data incorreta",
  numero_valor: "Número/valor transcrito incorretamente",
  pagina_item_referencia: "Página/item/referência incorreta",
  troca_omissao: "Troca ou omissão material de palavra/expressão",
  formatacao: "Erro de formatação com repercussão na leitura",
  outro: "Outro erro material",
};

/** pos_laudo_ciclos.retificacao_origem_identificacao — "Origem da identificação" (seção I do modelo de Retificação). */
export const ORIGEM_IDENTIFICACAO_ORDENADA: readonly PosLaudoOrigemIdentificacao[] = [
  "perito",
  "juizo",
  "autor",
  "reu",
  "outro",
];

export const ORIGEM_IDENTIFICACAO_ROTULOS: Record<PosLaudoOrigemIdentificacao, string> = {
  perito: "Perito",
  juizo: "Juízo",
  autor: "Autor",
  reu: "Réu",
  outro: "Outro",
};

// ---------------------------------------------------------------------------
// Complementação do Laudo (migration 20260909120000)
// ---------------------------------------------------------------------------

/** pos_laudo_complementacao.motivos — "Motivo da complementação" (seção II). */
export const COMPLEMENTACAO_MOTIVO_ORDENADA: readonly PosLaudoComplementacaoMotivo[] = [
  "documento_novo",
  "nova_avaliacao",
  "exame_complementar",
  "avaliacao_especialista",
  "diligencia_juizo",
  "determinacao_judicial",
  "insuficiencia_tecnica",
  "esclarecimento_ampliado",
  "outro",
];

export const COMPLEMENTACAO_MOTIVO_ROTULOS: Record<PosLaudoComplementacaoMotivo, string> = {
  documento_novo: "Documento novo",
  nova_avaliacao: "Nova avaliação médico-pericial",
  exame_complementar: "Exame complementar",
  avaliacao_especialista: "Avaliação por especialista",
  diligencia_juizo: "Diligência determinada pelo Juízo",
  determinacao_judicial: "Determinação judicial de complementação",
  insuficiencia_tecnica: "Insuficiência técnica posteriormente identificada",
  esclarecimento_ampliado: "Necessidade de esclarecimento com ampliação da análise",
  outro: "Outro",
};

/** pos_laudo_complementacao.impacto_elementos — "Classificação do impacto" (seção III). */
export const COMPLEMENTACAO_IMPACTO_ORDENADA: readonly PosLaudoComplementacaoImpacto[] = [
  "sem_relevancia_modificadora",
  "complementares",
  "relevantes_fundamentacao",
  "potencialmente_modificadores",
  "determinantes_revisao_parcial",
  "determinantes_revisao_integral",
];

export const COMPLEMENTACAO_IMPACTO_ROTULOS: Record<PosLaudoComplementacaoImpacto, string> = {
  sem_relevancia_modificadora: "Sem relevância modificadora",
  complementares: "Complementares aos elementos já analisados",
  relevantes_fundamentacao: "Relevantes para a fundamentação",
  potencialmente_modificadores: "Potencialmente modificadores",
  determinantes_revisao_parcial: "Determinantes para revisão parcial",
  determinantes_revisao_integral: "Determinantes para revisão integral",
};

/** vii_elementos — situação de cada elemento central (seção VII). */
export const ELEMENTO_CENTRAL_SITUACAO_ORDENADA: readonly PosLaudoElementoCentralSituacao[] = [
  "mantido",
  "complementado",
  "modificado",
  "nao_aplicavel",
];

export const ELEMENTO_CENTRAL_SITUACAO_ROTULOS: Record<PosLaudoElementoCentralSituacao, string> = {
  mantido: "Mantido",
  complementado: "Complementado",
  modificado: "Modificado",
  nao_aplicavel: "Não aplicável",
};

/** As 6 chaves fixas de vii_elementos com situação (a 7ª, "outros", é texto livre). */
export const ELEMENTO_CENTRAL_ORDENADA = [
  "diagnostico",
  "conduta",
  "nexo",
  "dano",
  "incapacidade",
  "prognostico",
] as const;

export const ELEMENTO_CENTRAL_ROTULOS: Record<(typeof ELEMENTO_CENTRAL_ORDENADA)[number], string> = {
  diagnostico: "Diagnóstico / condição clínica",
  conduta: "Conduta médica / assistencial",
  nexo: "Nexo causal / concausal",
  dano: "Dano",
  incapacidade: "Incapacidade / funcionalidade",
  prognostico: "Prognóstico",
};

// ---------------------------------------------------------------------------
// Quesitos do ciclo (fatia 9) — pos_laudo_quesitos
// ---------------------------------------------------------------------------

export const QUESITO_TIPO_ROTULOS: Record<PosLaudoQuesitoTipo, string> = {
  suplementar: "Quesito suplementar",
  esclarecimento: "Quesito de esclarecimento",
};

/** pos_laudo_quesitos.origem — grupos A/B/C/D do modelo, nesta ordem de exibição. */
export const QUESITO_ORIGEM_ORDENADA: readonly PosLaudoQuesitoOrigemParte[] = ["autor", "reu", "juizo", "outro"];

export const QUESITO_ORIGEM_ROTULOS: Record<PosLaudoQuesitoOrigemParte, string> = {
  autor: "Parte autora",
  reu: "Parte ré",
  juizo: "Juízo",
  outro: "Outros",
};

// ---------------------------------------------------------------------------
// Fluxo Assistência Técnica (migration 20260910120000 — fatia 10)
// ---------------------------------------------------------------------------

/** pos_laudo_ciclos.classificacao_global — resultado global do laudo analisado (obrigatório no AT). */
export const CLASSIFICACAO_GLOBAL_ORDENADA: readonly PosLaudoClassificacaoGlobal[] = [
  "favoravel",
  "parc_favoravel",
  "neutro",
  "parc_desfavoravel",
  "desfavoravel",
];

export const CLASSIFICACAO_GLOBAL_ROTULOS: Record<PosLaudoClassificacaoGlobal, string> = {
  favoravel: "Favorável",
  parc_favoravel: "Parcialmente favorável",
  neutro: "Neutro",
  parc_desfavoravel: "Parcialmente desfavorável",
  desfavoravel: "Desfavorável",
};

/** pos_laudo_ciclos.providencia_recomendada — "Decisão pós-laudo" (Gestão AT.pdf §13). */
export const PROVIDENCIA_AT_ORDENADA: readonly PosLaudoProvidenciaAt[] = [
  "nenhuma",
  "concordancia",
  "quesitos_esclarecimento",
  "quesitos_suplementares",
  "manifestacao_tecnica",
  "impugnacao_tecnica",
  "solicitacao_complementacao",
  "pedido_nova_pericia",
  "parecer_divergente",
  "outro",
];

export const PROVIDENCIA_AT_ROTULOS: Record<PosLaudoProvidenciaAt, string> = {
  nenhuma: "Nenhuma manifestação técnica",
  concordancia: "Concordância",
  quesitos_esclarecimento: "Quesitos de esclarecimento",
  quesitos_suplementares: "Quesitos suplementares",
  manifestacao_tecnica: "Manifestação técnica",
  impugnacao_tecnica: "Impugnação técnica",
  solicitacao_complementacao: "Solicitação de complementação",
  pedido_nova_pericia: "Pedido de nova perícia",
  parecer_divergente: "Parecer técnico divergente",
  outro: "Outro",
};

/** laudos_gerados.at_modalidade — a modalidade concreta do parecer AT (usada na fatia 10c). */
export const AT_MODALIDADE_ORDENADA: readonly PosLaudoAtModalidade[] = [
  "concordancia",
  "concordancia_ressalvas",
  "impugnacao_parcial",
  "impugnacao_integral",
  "divergente",
  "manifestacao",
];

export const AT_MODALIDADE_ROTULOS: Record<PosLaudoAtModalidade, string> = {
  concordancia: "Parecer de Concordância",
  concordancia_ressalvas: "Concordância com Ressalvas",
  impugnacao_parcial: "Impugnação Técnica Parcial",
  impugnacao_integral: "Impugnação Técnica Integral",
  divergente: "Parecer Divergente",
  manifestacao: "Manifestação Técnica",
};

/**
 * pos_laudo_pontos.categoria_problema — categoria do problema identificado no
 * laudo judicial (só AT; Gestão AT.pdf §14). Coluna `text` livre no banco,
 * validada na aplicação (mesmo padrão de PosLaudoNatureza).
 */
export const CATEGORIA_PROBLEMA_ORDENADA = [
  "omissao",
  "contradicao_interna",
  "contradicao_documental",
  "erro_tecnico",
  "erro_conceitual",
  "premissa_incorreta",
  "ausencia_fundamentacao",
  "extrapolacao_objeto",
  "divergencia_literatura",
  "outro",
] as const;

export type CategoriaProblemaAt = (typeof CATEGORIA_PROBLEMA_ORDENADA)[number];

export const CATEGORIA_PROBLEMA_ROTULOS: Record<CategoriaProblemaAt, string> = {
  omissao: "Omissão",
  contradicao_interna: "Contradição interna",
  contradicao_documental: "Contradição com a prova documental",
  erro_tecnico: "Erro técnico",
  erro_conceitual: "Erro conceitual",
  premissa_incorreta: "Premissa incorreta",
  ausencia_fundamentacao: "Conclusão sem fundamentação",
  extrapolacao_objeto: "Extrapolação do objeto",
  divergencia_literatura: "Divergência com a literatura",
  outro: "Outro",
};

/**
 * pos_laudo_at_analise — os 13 eixos boolean|null da "Análise estruturada do
 * laudo judicial" (Gestão AT.pdf §12), com a pergunta que cada um representa.
 * Fonte única usada por at-analise-panel.tsx, actions.ts (validação) e
 * compilar-parecer-at.ts (seção III do documento) — ordem = a do PDF.
 */
export const AT_ANALISE_EIXO_ORDEM = [
  "respondeu_objeto",
  "respondeu_quesitos",
  "considerou_documentos",
  "tem_omissoes",
  "tem_contradicoes",
  "tem_erros_tecnicos",
  "tem_erros_conceituais",
  "extrapolou_objeto",
  "conclusoes_sem_fundamentacao",
  "divergencia_literatura",
  "tem_fato_novo",
  "favorece_tese",
  "prejudica_tese",
] as const;

export type AtAnaliseEixo = (typeof AT_ANALISE_EIXO_ORDEM)[number];

export const AT_ANALISE_EIXO_ROTULOS: Record<AtAnaliseEixo, string> = {
  respondeu_objeto: "Respondeu ao objeto da perícia?",
  respondeu_quesitos: "Respondeu a todos os quesitos?",
  considerou_documentos: "Considerou todos os documentos?",
  tem_omissoes: "Há omissões?",
  tem_contradicoes: "Há contradições?",
  tem_erros_tecnicos: "Há erros técnicos?",
  tem_erros_conceituais: "Há erros conceituais?",
  extrapolou_objeto: "Houve extrapolação do objeto?",
  conclusoes_sem_fundamentacao: "Há conclusões sem fundamentação?",
  divergencia_literatura: "Há divergência com a literatura?",
  tem_fato_novo: "Há fato novo?",
  favorece_tese: "Favorece a tese da parte assistida?",
  prejudica_tese: "Prejudica a tese da parte assistida?",
};

// ---------------------------------------------------------------------------
// Linha do tempo de versões (fatia 12) — laudos_gerados.tipo
// ---------------------------------------------------------------------------

/**
 * Rótulo genérico por `tipo` — usado só como QUEDA quando a linha não tem
 * `titulo` próprio (hoje só o Laudo V1, cujo `gerarLaudo` nunca grava
 * `titulo`). Toda saída de pós-laudo grava `titulo` na geração — prefira
 * `linha.titulo || TIPO_DOCUMENTO_ROTULOS[linha.tipo]` a usar isto sozinho,
 * porque `titulo` já traz a modalidade exata do parecer AT (ex.: "IMPUGNAÇÃO
 * TÉCNICA PARCIAL"), que este mapa não distingue.
 */
export const TIPO_DOCUMENTO_ROTULOS: Record<LaudoGeradoTipo, string> = {
  laudo: "Laudo Médico-Pericial",
  esclarecimentos: "Esclarecimentos ao Laudo Médico-Pericial",
  retificacao: "Retificação de Erro Material",
  complementacao: "Complementação do Laudo",
  parecer_at: "Parecer Técnico (AT)",
  manifestacao_at: "Manifestação Técnica (AT)",
  impugnacao_at: "Impugnação Técnica (AT)",
  parecer_divergente_at: "Parecer Divergente (AT)",
  quesitos_at: "Quesitos Suplementares (AT)",
};
