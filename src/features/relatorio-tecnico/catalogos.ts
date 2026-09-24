import type { RelatorioTecnicoDocumentacaoSuficiente } from "@/types/enums";

export const DOCUMENTACAO_SUFICIENTE_ROTULOS: Record<RelatorioTecnicoDocumentacaoSuficiente, string> = {
  sim: "Sim",
  parcialmente: "Parcialmente",
  nao: "Não",
};
export const DOCUMENTACAO_SUFICIENTE_ORDENADAS = Object.keys(DOCUMENTACAO_SUFICIENTE_ROTULOS) as RelatorioTecnicoDocumentacaoSuficiente[];

export const DOCUMENTACAO_SUFICIENTE_TEXTOS_PADRAO: Record<RelatorioTecnicoDocumentacaoSuficiente, string> = {
  sim: "A documentação disponibilizada mostra-se suficiente para a análise objetiva proposta neste relatório.",
  parcialmente:
    "A documentação permite análise parcial da questão apresentada, permanecendo limitações relacionadas a [INDICAR].",
  nao: "Os elementos disponibilizados são insuficientes para conclusão segura acerca de [INDICAR QUESTÃO].",
};

/** §I do modelo — sugestões de "questão técnica principal". */
export const QUESTAO_TECNICA_TEXTOS_PADRAO: string[] = [
  "Avaliar os principais elementos técnico-periciais relacionados ao quadro clínico apresentado e à documentação disponibilizada.",
  "Analisar objetivamente a condição clínica e funcional documentada no período de interesse.",
  "Verificar se os documentos apresentados contêm elementos técnicos suficientes para esclarecer a questão submetida à análise.",
  "Avaliar, de forma objetiva, a conduta, o dano, o nexo causal ou a incapacidade, conforme o objeto específico do caso.",
];

/** §IV do modelo — campos complementares opcionais, cada um com sua sugestão de resposta padrão. */
export const CAMPO_COMPLEMENTAR_ROTULOS = {
  campo_diagnostico_cid: "Diagnóstico/CID",
  campo_conduta: "Conduta",
  campo_nexo_causal: "Nexo causal",
  campo_dano: "Dano",
  campo_incapacidade: "Incapacidade",
  campo_tratamento: "Tratamento",
  campo_prognostico: "Prognóstico",
} as const;
export type CampoComplementarChave = keyof typeof CAMPO_COMPLEMENTAR_ROTULOS;
export const CAMPOS_COMPLEMENTARES_ORDENADOS = Object.keys(CAMPO_COMPLEMENTAR_ROTULOS) as CampoComplementarChave[];

export const CAMPO_COMPLEMENTAR_TEXTOS_PADRAO: Record<CampoComplementarChave, string> = {
  campo_diagnostico_cid: "A documentação registra diagnóstico de [DIAGNÓSTICO], classificado sob CID [CÓDIGO], conforme [DOCUMENTO/DATA].",
  campo_conduta: "Os registros demonstram realização de [CONDUTA], no contexto clínico de [SITUAÇÃO].",
  campo_nexo_causal:
    "Os elementos disponíveis [permitem / não permitem / permitem parcialmente] estabelecer relação técnico-causal entre [EVENTO] e [DESFECHO], considerando os limites documentais do caso.",
  campo_dano: "Encontra-se documentado [DANO/ALTERAÇÃO], com repercussão descrita como [REPERCUSSÃO].",
  campo_incapacidade:
    "Os elementos analisados [demonstram / não demonstram / não permitem concluir] incapacidade funcional ou laborativa para [ATIVIDADE/PERÍODO].",
  campo_tratamento: "Consta realização/indicação de [TRATAMENTO], com [RESPOSTA/EVOLUÇÃO] registrada na documentação.",
  campo_prognostico: "Com os elementos atuais, o prognóstico é [DESCREVER] / não pode ser definido com segurança nesta análise.",
};

/** §V do modelo — sugestões de conclusão. */
export const CONCLUSAO_TEXTOS_PADRAO: { rotulo: string; texto: string }[] = [
  {
    rotulo: "Compatível",
    texto: "Os elementos documentais analisados mostram-se compatíveis com [CONCLUSÃO OBJETIVA], nos limites do objeto deste relatório.",
  },
  {
    rotulo: "Parcialmente demonstrada",
    texto: "A documentação contém elementos que sustentam parcialmente [QUESTÃO], permanecendo necessidade de esclarecimento quanto a [PONTO].",
  },
  {
    rotulo: "Insuficiente",
    texto: "Não há, nos documentos atualmente disponibilizados, elementos suficientes para conclusão técnica segura acerca de [QUESTÃO].",
  },
];

/** Documentos/providências complementares — sugestões do modelo. */
export const DOCUMENTOS_COMPLEMENTARES_TEXTOS_PADRAO: string[] = [
  "Solicita-se prontuário médico integral referente ao atendimento de [DATA/INSTITUIÇÃO].",
  "Recomenda-se apresentação dos exames complementares realizados no período de [PERÍODO].",
  "Recomenda-se relatório médico atualizado contendo diagnóstico, tratamento em curso, evolução clínica, limitações funcionais e prognóstico.",
  "No momento, não foram identificadas necessidades documentais complementares para a finalidade delimitada deste relatório.",
];
