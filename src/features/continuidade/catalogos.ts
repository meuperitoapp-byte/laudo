/**
 * Rótulos da Continuidade de Serviços (§20 do modelo de Relacionamento).
 */
import type { ContinuidadeFluxo, ContinuidadeStatus, ContinuidadeResultadoFollowup } from "@/types/enums";

export const FLUXO_ROTULOS: Record<ContinuidadeFluxo, string> = {
  avulso: "Cliente avulso",
  meu_perito: "MEU PERITO",
  cliente_saude_direto: "Cliente Saúde direto",
};

export const STATUS_ROTULOS: Record<ContinuidadeStatus, string> = {
  aberta: "Aberta",
  contratou_principal: "Contratou serviço principal",
  contratou_avulso: "Contratou serviço avulso",
  encerrada_sem_continuidade: "Encerrada sem continuidade",
  aguardando_marco: "Aguardando marco processual",
};

/** §20.5 — os 10 resultados padronizados de follow-up, cada um com consequência própria (ver actions.ts). */
export const RESULTADO_FOLLOWUP_ROTULOS: Record<ContinuidadeResultadoFollowup, string> = {
  contratou_principal: "Contratou serviço principal",
  contratou_avulso: "Contratou serviço avulso",
  ainda_avaliando: "Ainda avaliando",
  sem_interesse: "Sem interesse",
  valor_elevado: "Valor elevado",
  fara_internamente: "Fará internamente",
  caso_nao_prosseguiu: "Caso não prosseguiu",
  sem_necessidade_agora: "Não há necessidade técnica agora",
  aguardando_marco_processual: "Aguardando marco processual",
  sem_resposta: "Sem resposta",
  outro: "Outro",
};

/** Resultado -> status consequente (§20.5), aplicado automaticamente ao salvar o follow-up. */
export const STATUS_POR_RESULTADO: Record<ContinuidadeResultadoFollowup, ContinuidadeStatus> = {
  contratou_principal: "contratou_principal",
  contratou_avulso: "contratou_avulso",
  ainda_avaliando: "aberta",
  sem_interesse: "encerrada_sem_continuidade",
  valor_elevado: "aberta",
  fara_internamente: "encerrada_sem_continuidade",
  caso_nao_prosseguiu: "encerrada_sem_continuidade",
  sem_necessidade_agora: "aguardando_marco",
  aguardando_marco_processual: "aguardando_marco",
  sem_resposta: "aberta",
  outro: "aberta",
};
