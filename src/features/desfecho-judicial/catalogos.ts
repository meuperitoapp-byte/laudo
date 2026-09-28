/**
 * Rótulos do Desfecho Judicial e Biblioteca de Decisões PERICONS — Fase 3
 * (última) do Módulo de Relacionamento. Modelo, §24-25.
 */
import type {
  DesfechoArea,
  DesfechoParteAssistida,
  DesfechoTipoDecisao,
  DesfechoResultadoParteAssistida,
  DesfechoStatusDecisao,
  DesfechoResultadoPericia,
} from "@/types/enums";

export const AREA_ROTULOS: Record<DesfechoArea, string> = {
  saude: "Saúde",
  medico: "Médico",
  trabalhista: "Trabalhista",
  previdenciario: "Previdenciário",
  criminal: "Criminal",
  outra: "Outra",
};

export const PARTE_ASSISTIDA_ROTULOS: Record<DesfechoParteAssistida, string> = {
  autor: "Autor",
  reu: "Réu",
  reclamante: "Reclamante",
  reclamada: "Reclamada",
  outra: "Outra",
};

export const TIPO_DECISAO_ROTULOS: Record<DesfechoTipoDecisao, string> = {
  tutela: "Tutela",
  liminar: "Liminar",
  sentenca: "Sentença",
  acordao: "Acórdão",
  decisao_interlocutoria: "Decisão interlocutória",
  outra: "Outra",
};

export const RESULTADO_PARTE_ASSISTIDA_ROTULOS: Record<DesfechoResultadoParteAssistida, string> = {
  favoravel: "Favorável",
  parcialmente_favoravel: "Parcialmente favorável",
  desfavoravel: "Desfavorável",
  sem_julgamento_merito: "Sem julgamento de mérito",
  outro: "Outro",
};

export const STATUS_DECISAO_ROTULOS: Record<DesfechoStatusDecisao, string> = {
  provisoria: "Provisória",
  recurso_pendente: "Recurso pendente",
  definitiva: "Definitiva",
  transito_julgado: "Trânsito em julgado",
  outro: "Outro",
};

export const RESULTADO_PERICIA_ROTULOS: Record<DesfechoResultadoPericia, string> = {
  favoravel: "Favorável",
  parcialmente_favoravel: "Parcialmente favorável",
  desfavoravel: "Desfavorável",
  inconclusivo: "Inconclusivo",
  nao_se_aplica: "Não se aplica",
};

/** §24.1 — "Serviços PERICONS no caso": rótulos livres, sugestão apenas (não é FK pro enum EtapaContratada). */
export const SERVICOS_PERICONS_SUGESTOES = [
  "Viabilidade", "Quesitos", "Parecer", "Assistência Técnica", "Acompanhamento", "Análise de laudo",
];

export const RESULTADO_SELO_VARIANTE: Record<DesfechoResultadoParteAssistida, "sucesso" | "atencao" | "erro" | "neutro"> = {
  favoravel: "sucesso",
  parcialmente_favoravel: "atencao",
  desfavoravel: "erro",
  sem_julgamento_merito: "neutro",
  outro: "neutro",
};
