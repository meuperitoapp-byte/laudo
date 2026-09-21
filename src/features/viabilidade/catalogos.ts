import type {
  ViabilidadeStatus,
  ViabilidadeSuficienciaDocumental,
  ViabilidadeRelevanciaDocumento,
  ViabilidadeImpactoDocumentoFaltante,
  ViabilidadeImpactoLimitacao,
  ViabilidadeCategoriaLinhaTempo,
  ViabilidadeClassificacaoFato,
} from "@/types/enums";

/**
 * Posição do cliente no potencial litígio — catálogo editável (semente da
 * Dra. Fernanda, 19/09/2026). Mesmo princípio de processos/catalogos.ts:
 * texto livre, sem CHECK no banco, cresce sozinho a partir do uso.
 */
export const POSICAO_CLIENTE_LITIGIO_SEED = [
  "Paciente",
  "Clínica",
  "Hospital",
  "Profissionais",
  "Familiar responsável",
] as const;

/**
 * Especialidade — catálogo editável, semente ainda pendente (19/09/2026):
 * a Dra. Fernanda pediu "a lista de especialidades do app dos médicos",
 * mas não existe nenhuma lista de especialidades médicas em lugar nenhum
 * do projeto (conferido em seeds, Biblioteca Pericial, tipos_laudo) — o
 * Jeferson vai confirmar com ela de qual app é. Nasce vazio, sem quebrar
 * nada: o campo já funciona como catálogo editável, só falta a semente.
 */
export const ESPECIALIDADE_SEED: readonly string[] = [];

/**
 * Matéria — multisseleção, catálogo editável. Sem resposta dela ainda
 * (19/09/2026) — nasce sem semente, só cresce pelo uso (TagsCatalogo).
 */
export const MATERIA_SEED: readonly string[] = [];

/** Rótulos de exibição do pipeline de status (§3 do spec). */
export const VIABILIDADE_STATUS_ROTULOS: Record<ViabilidadeStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_triagem_documental: "Em triagem documental",
  aguardando_documentos: "Aguardando documentos",
  em_analise_tecnica: "Em análise técnica",
  aguardando_especialista: "Aguardando especialista",
  em_conclusao: "Em conclusão",
  em_revisao: "Em revisão",
  concluida: "Concluída",
};

/** Ordem fixa de exibição do pipeline — mesma ordem do §3, não alfabética. */
export const VIABILIDADE_STATUS_ORDENADOS: ViabilidadeStatus[] = [
  "nao_iniciada",
  "em_triagem_documental",
  "aguardando_documentos",
  "em_analise_tecnica",
  "aguardando_especialista",
  "em_conclusao",
  "em_revisao",
  "concluida",
];

/**
 * Finalidade da análise (§4) — multisseleção de vocabulário FECHADO
 * (checkbox, não catálogo editável — é a lista literal do spec).
 * `valor` é o que grava em `analises_viabilidade.finalidade` (jsonb).
 */
export const FINALIDADE_OPCOES: { valor: string; rotulo: string }[] = [
  { valor: "avaliar_possibilidade_ajuizamento", rotulo: "Avaliar possibilidade de ajuizamento" },
  { valor: "elementos_tecnicos_favoraveis", rotulo: "Existência de elementos técnicos favoráveis" },
  { valor: "responsabilidade_medico_hospitalar", rotulo: "Responsabilidade médico-hospitalar" },
  { valor: "nexo_causal", rotulo: "Nexo causal" },
  { valor: "dano", rotulo: "Dano" },
  { valor: "incapacidade", rotulo: "Incapacidade" },
  { valor: "doenca_ocupacional", rotulo: "Doença ocupacional" },
  { valor: "questao_securitaria", rotulo: "Questão securitária" },
  { valor: "conduta_profissional", rotulo: "Conduta profissional" },
  { valor: "necessidade_prova_pericial", rotulo: "Necessidade de prova pericial" },
  { valor: "viabilidade_de_tese", rotulo: "Viabilidade de tese" },
  { valor: "subsidiar_estrategia_juridica", rotulo: "Subsidiar estratégia jurídica para eventual ajuizamento" },
  { valor: "defesa_pre_processual", rotulo: "Defesa pré-processual" },
  { valor: "outro", rotulo: "Outro" },
];

/** Suficiência documental (§8) — rótulos de exibição. */
export const SUFICIENCIA_DOCUMENTAL_ROTULOS: Record<ViabilidadeSuficienciaDocumental, string> = {
  sim: "Sim",
  parcialmente: "Parcialmente",
  nao: "Não",
};

/** Relevância de um documento avaliado (§7) — rótulos de exibição. */
export const RELEVANCIA_DOCUMENTO_ROTULOS: Record<ViabilidadeRelevanciaDocumento, string> = {
  determinante: "Determinante",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  sem_relevancia: "Sem relevância para esta questão",
};

/** Impacto da ausência de um documento faltante (§9) — rótulos de exibição. */
export const IMPACTO_DOCUMENTO_FALTANTE_ROTULOS: Record<ViabilidadeImpactoDocumentoFaltante, string> = {
  impede_conclusao: "Impede conclusão",
  limita_conclusao: "Limita conclusão",
  importante: "Importante",
  complementar: "Complementar",
};

/**
 * Limitações documentais (§10) — multisseleção de vocabulário FECHADO
 * (checkbox, mesmo espírito de FINALIDADE_OPCOES). `valor` é o que grava
 * em `analises_viabilidade.limitacoes_documentais` (jsonb).
 */
export const LIMITACOES_DOCUMENTAIS_OPCOES: { valor: string; rotulo: string }[] = [
  { valor: "prontuario_incompleto", rotulo: "Prontuário incompleto" },
  { valor: "documento_ilegivel", rotulo: "Documento ilegível" },
  { valor: "ausencia_horario", rotulo: "Ausência de horário" },
  { valor: "ausencia_evolucao", rotulo: "Ausência de evolução" },
  { valor: "ausencia_identificacao", rotulo: "Ausência de identificação" },
  { valor: "ausencia_exame", rotulo: "Ausência de exame" },
  { valor: "registro_insuficiente", rotulo: "Registro insuficiente" },
  { valor: "documentacao_unilateral", rotulo: "Documentação unilateral" },
  { valor: "divergencia_documental", rotulo: "Divergência documental" },
  { valor: "impossibilidade_verificar_fato", rotulo: "Impossibilidade de verificar fato" },
  { valor: "outro", rotulo: "Outro" },
];

/** Impacto das limitações documentais (§10) — rótulos de exibição. */
export const IMPACTO_LIMITACAO_ROTULOS: Record<ViabilidadeImpactoLimitacao, string> = {
  nenhum_relevante: "Nenhum relevante",
  parcial: "Parcial",
  importante: "Importante",
  impede_conclusao: "Impede conclusão",
};

/** Categoria de evento da linha do tempo médico-pericial (§11) — rótulos de exibição. */
export const CATEGORIA_LINHA_TEMPO_ROTULOS: Record<ViabilidadeCategoriaLinhaTempo, string> = {
  sintoma: "Sintoma",
  atendimento: "Atendimento",
  consulta: "Consulta",
  diagnostico: "Diagnóstico",
  exame: "Exame",
  prescricao: "Prescrição",
  procedimento: "Procedimento",
  cirurgia: "Cirurgia",
  intercorrencia: "Intercorrência",
  piora: "Piora",
  oportunidade_diagnostica: "Oportunidade diagnóstica",
  oportunidade_terapeutica: "Oportunidade terapêutica",
  alta: "Alta",
  incapacidade: "Incapacidade",
  dano: "Dano",
  obito: "Óbito",
  outro: "Outro",
};

/** Classificação de um fato comprovado (§12) — rótulos de exibição. */
export const CLASSIFICACAO_FATO_ROTULOS: Record<ViabilidadeClassificacaoFato, string> = {
  comprovado: "Comprovado",
  parcialmente_comprovado: "Parcialmente comprovado",
  controvertido: "Controvertido",
};
