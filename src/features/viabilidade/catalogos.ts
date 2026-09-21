import type { ViabilidadeStatus } from "@/types/enums";

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
