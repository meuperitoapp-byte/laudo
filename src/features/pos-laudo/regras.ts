/**
 * Regras SÍNCRONAS de aplicação do Módulo Pós-Laudo. NÃO é "use server" —
 * ficam aqui porque um arquivo "use server" só pode exportar funções async.
 */

import type { PosLaudoRepercussaoLaudo } from "@/types/enums";
import { REPERCUSSAO_LAUDO_EXIGE_NOVA_CONCLUSAO } from "@/features/pos-laudo/rotulos";

/**
 * Um item da lista de pendências que bloqueia a geração de uma saída de
 * pós-laudo (Esclarecimentos, Retificação, ...). Compartilhado pelos
 * `compilar-*.ts` de cada saída, pra não redefinir o mesmo formato em cada
 * um.
 */
export interface PendenciaGeracaoPosLaudo {
  id: string;
  label: string;
  /** Âncora (#id) da tela do ciclo que resolve a pendência. */
  href?: string;
  /**
   * "bloqueio" (default se ausente) = algo ainda incompleto — tom neutro de
   * pendência comum. "orientacao" = ela não fez nada errado; o sistema está
   * indicando o caminho certo (ex.: Retificação com repercussão na
   * conclusão, redirecionada pra Complementação). A tela renderiza os dois
   * tons de formas visualmente distintas.
   */
  tom?: "bloqueio" | "orientacao";
}

/**
 * A trava da Nova Conclusão Vigente. Quando a repercussão de ciclo indica
 * alteração da conclusão (`modificacao_parcial` / `revisao_substancial` /
 * `substituicao_conclusao`), o rascunho da nova conclusão precisa estar
 * preenchido ANTES de gerar o documento de pós-laudo — o texto entra no corpo
 * do documento e, quando ele for protocolado, vira a conclusão vigente.
 *
 * Mora na aplicação (não como CHECK): a exigência é "estar preenchido no
 * momento de gerar", não uma invariante de linha — um CHECK rejeitaria saves
 * intermediários legítimos. Barra a GERAÇÃO do documento, não o encerramento
 * do ciclo: barrar depois seria tarde (documento protocolado com um buraco).
 *
 * Fatia 4 só define e exporta — a amarração no fluxo de geração é da fatia
 * seguinte.
 */
export function podeGerarSaida(ciclo: {
  repercussao_laudo: PosLaudoRepercussaoLaudo | null;
  conclusao_vigente_nova: string | null;
}): { ok: true } | { ok: false; motivo: string } {
  const exigeNova =
    ciclo.repercussao_laudo !== null &&
    (REPERCUSSAO_LAUDO_EXIGE_NOVA_CONCLUSAO as readonly string[]).includes(ciclo.repercussao_laudo);

  if (exigeNova && !ciclo.conclusao_vigente_nova?.trim()) {
    return {
      ok: false,
      motivo:
        "A repercussão sobre o laudo indica alteração da conclusão. Preencha a Nova Conclusão Vigente antes de gerar o documento.",
    };
  }
  return { ok: true };
}
