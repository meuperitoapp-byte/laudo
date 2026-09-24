import type { AtestadoFinalidade, AtestadoConclusaoModelo, AtestadoTipoDocumento } from "@/types/enums";

export const TITULO_TIPO_DOCUMENTO: Record<AtestadoTipoDocumento, string> = {
  atestado: "Atestado Médico-Pericial",
  declaracao: "Declaração Médico-Pericial",
};

/** §2 do modelo — múltipla seleção, cada uma abre um bloco condicional. */
export const FINALIDADE_ROTULOS: Record<AtestadoFinalidade, string> = {
  capacidade_laborativa: "Capacidade laborativa",
  incapacidade_laborativa: "Incapacidade laborativa",
  capacidade_funcional: "Capacidade funcional",
  necessidade_afastamento: "Necessidade de afastamento",
  condicao_clinica: "Condição clínica",
  capacidade_civil: "Capacidade civil / autonomia para atos da vida civil",
  necessidade_assistencia_terceiros: "Necessidade de assistência de terceiros",
  aptidao_atividade: "Aptidão para atividade específica",
  outra: "Outra",
};
export const FINALIDADES_ORDENADAS: AtestadoFinalidade[] = Object.keys(FINALIDADE_ROTULOS) as AtestadoFinalidade[];

/**
 * §5 do modelo — os 6 textos-modelo de conclusão. `[NOME]`/`[PERÍODO]` são
 * placeholders que o painel substitui ao inserir o texto — depois disso o
 * texto fica 100% editável (nunca é reaplicado sozinho).
 */
export const CONCLUSAO_MODELO_ROTULOS: Record<AtestadoConclusaoModelo, string> = {
  capacidade_preservada: "A. Capacidade laborativa — preservada",
  incapacidade_temporaria: "B. Incapacidade laborativa temporária",
  inconclusiva: "C. Capacidade laborativa inconclusiva",
  capacidade_funcional: "D. Capacidade funcional",
  necessidade_assistencia: "E. Necessidade de assistência de terceiros",
  ausencia_necessidade_assistencia: "F. Ausência de necessidade de assistência habitual",
};
export const CONCLUSAO_MODELO_TEXTOS: Record<AtestadoConclusaoModelo, (nome: string) => string> = {
  capacidade_preservada: (nome) =>
    `Considerando os elementos médicos avaliados e a repercussão funcional atualmente documentada, ${nome} encontra-se, sob perspectiva médica, apto(a) para o exercício de suas atividades habituais, no momento da presente avaliação.`,
  incapacidade_temporaria: () =>
    `Considerando os elementos médicos avaliados, verifica-se comprometimento funcional que inviabiliza temporariamente o exercício da atividade habitual, recomendando-se afastamento pelo período de [PERÍODO], sujeito a reavaliação clínica.`,
  inconclusiva: () =>
    `Os elementos atualmente disponíveis não permitem conclusão segura acerca da capacidade laborativa, sendo necessária complementação por [EXAME/AVALIAÇÃO/DOCUMENTO].`,
  capacidade_funcional: (nome) =>
    `À avaliação dos elementos disponibilizados, ${nome} apresenta [preservação/comprometimento parcial/comprometimento significativo] de sua capacidade funcional, especialmente quanto a [DESCREVER DOMÍNIOS].`,
  necessidade_assistencia: () =>
    `Em razão das limitações atualmente documentadas, o(a) paciente apresenta necessidade de auxílio de terceiros para [DESCREVER ATIVIDADES].`,
  ausencia_necessidade_assistencia: () =>
    `Não foram identificados, nos elementos avaliados, comprometimentos que demonstrem necessidade habitual de auxílio de terceiros para as atividades analisadas.`,
};

/** §6 do modelo — opções de cada item da avaliação médico-funcional (capacidade civil). Cada campo tem seu próprio conjunto, exatamente como no modelo. */
export const CC_OPCOES = {
  cc_consciencia: ["Preservada", "Alterada", "Não avaliável"],
  cc_orientacao: ["Preservada", "Parcialmente comprometida", "Comprometida"],
  cc_memoria: ["Preservada", "Comprometida", "Não determinada"],
  cc_compreensao: ["Preservada", "Comprometida"],
  cc_juizo_critico: ["Preservado", "Comprometido"],
  cc_capacidade_decisoria: ["Preservada", "Parcialmente comprometida", "Comprometida"],
  cc_comunicacao: ["Preservada", "Comprometida"],
  cc_autonomia_avd: ["Preservada", "Parcial", "Dependente"],
} as const;
export const CC_ROTULOS: Record<keyof typeof CC_OPCOES, string> = {
  cc_consciencia: "Consciência",
  cc_orientacao: "Orientação",
  cc_memoria: "Memória",
  cc_compreensao: "Compreensão",
  cc_juizo_critico: "Juízo crítico",
  cc_capacidade_decisoria: "Capacidade decisória",
  cc_comunicacao: "Comunicação/expressão de vontade",
  cc_autonomia_avd: "Autonomia para atividades da vida diária",
};

/** §6 — os 4 textos-modelo de conclusão sobre capacidade civil, sempre editáveis depois de inseridos. */
export const CC_TEXTO_MODELOS: { rotulo: string; texto: string }[] = [
  {
    rotulo: "Capacidade preservada",
    texto:
      "À avaliação médica e dos elementos documentais disponíveis, não foram identificadas alterações cognitivas, mentais ou funcionais com repercussão suficiente para comprometer, sob perspectiva médica, a capacidade de compreender informações, avaliar suas consequências, tomar decisões e exprimir a própria vontade.",
  },
  {
    rotulo: "Comprometimento",
    texto:
      "Os elementos avaliados demonstram comprometimento de [COGNIÇÃO/JUÍZO CRÍTICO/MEMÓRIA/ORIENTAÇÃO/CAPACIDADE DECISÓRIA], com repercussão sobre a capacidade de [COMPREENDER / DELIBERAR / ADMINISTRAR DETERMINADOS ATOS / EXPRIMIR VONTADE].",
  },
  {
    rotulo: "Comprometimento parcial",
    texto:
      "Observa-se comprometimento funcional/cognitivo parcial, com preservação de [FUNÇÕES PRESERVADAS] e limitação relacionada a [FUNÇÕES COMPROMETIDAS], recomendando-se que a análise da autonomia seja delimitada de acordo com os atos especificamente considerados.",
  },
  {
    rotulo: "Inconclusivo",
    texto:
      "Os elementos atualmente disponíveis não são suficientes para caracterização segura da repercussão da condição clínica sobre a autonomia decisória, sendo recomendada complementação da avaliação por [AVALIAÇÃO/EXAME/ESPECIALISTA].",
  },
];
