import type {
  EstrategiaFragilidadeClassificacao,
  EstrategiaTeseAdversaDestino,
  EstrategiaDocumentoPrioridade,
  EstrategiaDocumentoAcao,
  EstrategiaProximaAcao,
  PrioridadeTarefa,
} from "@/types/enums";

export const CLASSIFICACAO_FRAGILIDADE_ROTULOS: Record<EstrategiaFragilidadeClassificacao, string> = {
  controlavel: "Controlável",
  depende_documento: "Depende de documento",
  depende_pericia: "Depende da perícia",
  nao_controlavel: "Não controlável",
};
export const CLASSIFICACOES_FRAGILIDADE_ORDENADAS = Object.keys(CLASSIFICACAO_FRAGILIDADE_ROTULOS) as EstrategiaFragilidadeClassificacao[];

export const DESTINO_TESE_ADVERSA_ROTULOS: Record<EstrategiaTeseAdversaDestino, string> = {
  replica: "Réplica",
  quesito: "Quesito",
  pericia: "Perícia",
};
export const DESTINOS_TESE_ADVERSA_ORDENADOS = Object.keys(DESTINO_TESE_ADVERSA_ROTULOS) as EstrategiaTeseAdversaDestino[];

export const PRIORIDADE_DOCUMENTO_ROTULOS: Record<EstrategiaDocumentoPrioridade, string> = {
  essencial: "Essencial",
  importante: "Importante",
  complementar: "Complementar",
};
export const PRIORIDADES_DOCUMENTO_ORDENADAS = Object.keys(PRIORIDADE_DOCUMENTO_ROTULOS) as EstrategiaDocumentoPrioridade[];

export const ACAO_DOCUMENTO_ROTULOS: Record<EstrategiaDocumentoAcao, string> = {
  solicitar: "Solicitar",
  obter: "Obter",
};
export const ACOES_DOCUMENTO_ORDENADAS = Object.keys(ACAO_DOCUMENTO_ROTULOS) as EstrategiaDocumentoAcao[];

export const PROXIMA_ACAO_ESTRATEGIA_ROTULOS: Record<EstrategiaProximaAcao, string> = {
  elaborar_quesitos: "Elaborar Quesitos",
  solicitar_documentos: "Solicitar Documentos",
  preparar_pericia: "Preparar para Perícia",
  gerar_orientacao_replica: "Gerar Orientação para Réplica",
  elaborar_parecer_relatorio: "Elaborar Parecer/Relatório",
  atualizar_estrategia: "Atualizar Estratégia após novo documento",
  aguardar_andamento: "Aguardar andamento processual",
  outro: "Outro",
};
export const PROXIMAS_ACOES_ESTRATEGIA_ORDENADAS = Object.keys(PROXIMA_ACAO_ESTRATEGIA_ROTULOS) as EstrategiaProximaAcao[];

export const PRIORIDADE_ROTULOS: Record<PrioridadeTarefa, string> = {
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};
export const PRIORIDADES_ORDENADAS = Object.keys(PRIORIDADE_ROTULOS) as PrioridadeTarefa[];

/** Rodapé obrigatório do documento externo — pedido explícito da Dra. Fernanda (24/09/2026), fixo, não editável. */
export const RODAPE_ESTRATEGIA_PERICIAL =
  "Esse material é estudo direcionado à equipe jurídica e não representa parecer técnico médico-legal.";

/** §14 do modelo — texto-modelo de conclusão, sempre editável depois de inserido. */
export const CONCLUSAO_TEXTO_PADRAO =
  "A estratégia técnico-pericial deverá concentrar-se em [EIXOS/PONTOS CENTRAIS], buscando demonstrar [FATOS ESSENCIAIS] por meio de [DOCUMENTOS/PROVA PERICIAL]. Os principais pontos de vulnerabilidade identificados são [FRAGILIDADES], devendo ser especialmente investigados ou delimitados durante a instrução. Recomenda-se que os pontos [INDICAR] sejam convertidos em quesitos e que sejam providenciados [DOCUMENTOS/PROVAS] antes do ato pericial.";
