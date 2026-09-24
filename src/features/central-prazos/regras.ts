/**
 * Regras SÍNCRONAS e puras da Central de Prazos e Tarefas — nível de
 * urgência a partir de um prazo, e a ordenação da lista. Nada aqui toca o
 * banco (isso é `agregador.ts`). Decisões do Jeferson, 11/09/2026 (ver
 * docs/plano-modulo-central-prazos.md):
 *   - Programada = tem prazo, mais de 7 dias.
 *   - Nunca promover item sem data pra um nível acima de "Sem prazo" — a
 *     régua de cor só pode ser confiável quando algo está de fato vencendo.
 */

import type { ItemPainel, NivelUrgencia } from "./tipos";
import type { ContextoAcesso } from "@/features/acessos/contexto";

/** Rank de exibição — quanto menor, mais no topo da lista. Nunca um item de rank maior aparece antes de um de rank menor. */
export const NIVEL_ORDEM: Record<NivelUrgencia, number> = {
  critica: 1,
  urgente: 2,
  alta: 3,
  atencao: 4,
  programada: 5,
  sem_prazo: 6,
};

/** "YYYY-MM-DD" -> dias desde a época, em UTC. Evita `new Date(string)` (que interpreta como meia-noite UTC e pode "voltar um dia" em fusos negativos) comparando sempre a mesma unidade — dias inteiros, não instantes. */
export function paraDiasUtc(dataIso: string): number {
  const m = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000;
}

/** "YYYY-MM-DD" + N dias, em UTC — inverso conceitual de `paraDiasUtc`, pra prazos calculados (ex.: D+7 a partir de uma data registrada). */
export function somarDiasIso(dataIso: string, dias: number): string {
  const totalDias = paraDiasUtc(dataIso) + dias;
  const d = new Date(totalDias * 86_400_000);
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * O "hoje" da Dra. Fernanda, não o do servidor. A página roda num Server
 * Component — sem fuso de navegador disponível — e o servidor pode estar em
 * UTC (comum na Vercel). Perto da meia-noite BRT isso adiantaria o dia em até
 * 3h e mudaria um item de nível cedo demais. `Intl` com `timeZone` explícito
 * resolve isso sem depender de onde o processo roda.
 */
export function hojeIsoBrasil(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

/**
 * "HH:MM" de agora no fuso dela — par de `hojeIsoBrasil`, usado só pra
 * bloquear cadastro de evento com horário já passado NO DIA DE HOJE
 * (comparar hora só faz sentido quando a data já é hoje; dia futuro não
 * precisa dessa checagem). Item #6 da fila de melhorias (19-20/09/2026):
 * "bloquear... pra não permitir fraude da equipe em dizer que agendou e eu
 * que não vi".
 */
export function horaAgoraBrasil(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(agora);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${parte("hour")}:${parte("minute")}`;
}

/**
 * A régua de cor da Dra. Fernanda: verde ≤7 dias, amarelo ≤3 dias, laranja
 * no último dia, vermelho vencida — mapeada pros 6 níveis (Programada e Sem
 * prazo ficam sem cor, de propósito, fora dessa régua). `prazoIso === null`
 * é sempre "sem_prazo": o sistema nunca deriva urgência sem data (decisão do
 * Jeferson).
 */
export function nivelPorPrazo(prazoIso: string | null, hojeIso: string): NivelUrgencia {
  if (!prazoIso) return "sem_prazo";
  const dias = paraDiasUtc(prazoIso) - paraDiasUtc(hojeIso);
  if (Number.isNaN(dias)) return "sem_prazo";
  if (dias < 0) return "critica"; // vencida
  if (dias === 0) return "urgente"; // último dia
  if (dias <= 3) return "alta";
  if (dias <= 7) return "atencao";
  return "programada"; // tem prazo, mas > 7 dias — decisão do Jeferson, 11/09/2026
}

/**
 * Ordena a lista inteira: rank do nível primeiro — sempre —, depois
 * desempate por `ordenacao` (mais antiga primeiro). Um item "Sem prazo"
 * nunca aparece antes de um "Crítica"/"Urgente", não importa quantos itens
 * sem data existam na lista (requisito do Jeferson, 11/09/2026).
 */
/**
 * "Tela de atividades" por pessoa (Etapa 5, 30/09/2026) — perfil restrito só
 * vê os itens atribuídos a ele mesmo (comparando com `nome_exibicao`, ver
 * migration 20260930170000); admin (Dra. Fernanda, sem perfil atribuído)
 * continua vendo tudo, como sempre. Usada por /hoje e /agenda, os dois
 * consumidores de `montarPainel`.
 */
export function filtrarPorAcesso(itens: ItemPainel[], contexto: ContextoAcesso): ItemPainel[] {
  if (contexto.tipo === "admin") return itens;
  return itens.filter((i) => i.responsavel === contexto.nomeExibicao);
}

export function ordenarPainel(itens: ItemPainel[]): ItemPainel[] {
  return [...itens].sort((a, b) => {
    const porNivel = NIVEL_ORDEM[a.nivel] - NIVEL_ORDEM[b.nivel];
    if (porNivel !== 0) return porNivel;
    return a.ordenacao.localeCompare(b.ordenacao);
  });
}
