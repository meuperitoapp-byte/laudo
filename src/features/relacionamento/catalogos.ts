/**
 * Rótulos e catálogos do Módulo de Relacionamento (CRM) — Fase 1.
 * Modelo: PERICONS_MODULO_RELACIONAMENTO_DEFINITIVO_PARA_PROGRAMADOR.pdf.
 */
import type {
  RelacionamentoTipo,
  RelacionamentoOrigem,
  RelacionamentoCanal,
  RelacionamentoFaixaContato,
  RelacionamentoCategoria,
  MeuPeritoStatus,
  MeuPeritoPotencial,
  ClienteSaudeTipoDemanda,
  ClienteSaudeNecessidade,
  ClienteSaudeStatus,
  ProfissionalProfissao,
  ProfissionalNecessidade,
  PremiacaoStatus,
  EncaminhamentoStatus,
  EncaminhamentoContratacaoRealizada,
} from "@/types/enums";

export const TIPO_ROTULOS: Record<RelacionamentoTipo, string> = {
  advogado_escritorio: "Advogado / Escritório",
  cliente_saude: "Cliente Saúde",
  profissional: "Profissional",
};

export const ORIGEM_ROTULOS: Record<RelacionamentoOrigem, string> = {
  indicacao: "Indicação",
  redes_sociais: "Redes sociais",
  comercial_pericons: "Comercial PERICONS",
  evento_palestra_curso: "Evento / palestra / curso",
  meu_perito: "MEU PERITO",
  site_busca: "Site / busca",
  cliente_antigo_retorno: "Cliente antigo / retorno",
  parceria_institucional: "Parceria institucional",
  acolher: "ACOLHER",
  outro: "Outro",
};

export const CANAL_ROTULOS: Record<RelacionamentoCanal, string> = {
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  email: "E-mail",
  reuniao: "Reunião",
  presencial: "Presencial",
  outro: "Outro",
};

export const FAIXA_ROTULOS: Record<RelacionamentoFaixaContato, string> = {
  verde: "Ativo",
  amarelo: "Atenção",
  laranja: "Esfriando",
  vermelho: "Reativar",
};

/** Cores reservadas de status já validadas no projeto (musgo/âmbar/vinho) — nunca reaproveitadas como série de gráfico. */
export const FAIXA_SELO_VARIANTE: Record<RelacionamentoFaixaContato, "sucesso" | "atencao" | "erro" | "neutro"> = {
  verde: "sucesso",
  amarelo: "atencao",
  laranja: "atencao",
  vermelho: "erro",
};

export const CATEGORIA_ROTULOS: Record<RelacionamentoCategoria, string> = {
  diamante: "Diamante",
  ouro: "Ouro",
  prata: "Prata",
  sem_categoria: "Sem categoria",
};

export const MEU_PERITO_STATUS_ROTULOS: Record<MeuPeritoStatus, string> = {
  nao_abordado: "Não abordado",
  abordado: "Abordado",
  em_avaliacao: "Em avaliação",
  assinante: "Assinante",
  inativo: "Inativo",
};

export const MEU_PERITO_POTENCIAL_ROTULOS: Record<MeuPeritoPotencial, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

export const CS_TIPO_DEMANDA_ROTULOS: Record<ClienteSaudeTipoDemanda, string> = {
  medicamento: "Medicamento",
  cirurgia: "Cirurgia",
  plano_saude: "Plano de saúde",
  home_care: "Home care",
  internacao_leito: "Internação / leito",
  erro_medico: "Erro médico",
  tratamento: "Tratamento",
  beneficio_direito_doenca: "Benefício ou direito decorrente de doença",
  indenizacao: "Indenização",
  outra: "Outra",
};

export const CS_NECESSIDADE_ROTULOS: Record<ClienteSaudeNecessidade, string> = {
  juridica: "Jurídica",
  medico_pericial: "Médico-pericial",
  extrajudicial: "Extrajudicial",
  ambas: "Ambas",
  em_avaliacao: "Em avaliação",
};

export const CS_STATUS_ROTULOS: Record<ClienteSaudeStatus, string> = {
  entrada: "Entrada",
  triagem: "Triagem",
  qualificada: "Qualificada",
  direcionada: "Direcionada",
  em_acompanhamento: "Em acompanhamento",
  encerrada: "Encerrada",
};

export const PROF_PROFISSAO_ROTULOS: Record<ProfissionalProfissao, string> = {
  medico: "Médico",
  dentista: "Dentista",
  psicologo: "Psicólogo",
  outro: "Outro",
};

export const PROF_NECESSIDADE_ROTULOS: Record<ProfissionalNecessidade, string> = {
  juridica: "Jurídica",
  etico_profissional: "Ético-profissional",
  consultoria: "Consultoria",
  pericial: "Pericial",
  gestao_regularizacao: "Gestão / regularização",
  formacao: "Formação",
  outro: "Outro",
};

export const PREMIACAO_STATUS_ROTULOS: Record<PremiacaoStatus, string> = {
  a_enviar: "A enviar",
  enviado: "Enviado",
  entregue: "Entregue",
};

export const ENCAMINHAMENTO_STATUS_ROTULOS: Record<EncaminhamentoStatus, string> = {
  encaminhado: "Encaminhado",
  aceito: "Aceito",
  recusado: "Recusado",
  em_contato: "Em contato",
  encerrado: "Encerrado",
};

export const ENCAMINHAMENTO_CONTRATACAO_ROTULOS: Record<EncaminhamentoContratacaoRealizada, string> = {
  sim: "Sim",
  nao: "Não",
  nao_informado: "Não informado",
};
