/**
 * Monta a seção de "Respostas aos Quesitos" — seção V dos Esclarecimentos e
 * VIII da Complementação (fatia 9). Estrutura idêntica nas duas: os quesitos
 * do ciclo (`pos_laudo_quesitos`) agrupados por origem (parte autora / ré /
 * Juízo / outros), numerados de 1 dentro de cada grupo. A seção só existe
 * quando há pelo menos um quesito — condicional idêntica à do modelo.
 *
 * Não é "use server": é helper puro, chamado pelos `compilar-*.ts`.
 */

import type { SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { PosLaudoQuesitosRow } from "@/types/database";
import type { PosLaudoQuesitoOrigemParte } from "@/types/enums";
import { QUESITO_ORIGEM_ORDENADA, QUESITO_ORIGEM_ROTULOS } from "./rotulos";

/** `null` quando não há quesito no ciclo — a seção não entra no documento. */
export function montarSecaoQuesitos(
  quesitos: PosLaudoQuesitosRow[],
  opts: {
    secaoId: string;
    codigo: string;
    titulo: string;
    ordem: number;
    introComplementar?: boolean;
    /** Fluxo AT: os quesitos são elaborados para o advogado, não respondidos aqui — omite a linha de resposta. */
    semResposta?: boolean;
  },
): SecaoCompilada | null {
  if (quesitos.length === 0) return null;

  const blocos: BlocoConteudo[] = [];
  if (opts.introComplementar) {
    blocos.push({
      tipo: "paragrafo",
      texto:
        "As respostas abaixo são complementares às já apresentadas no Laudo Médico-Pericial original, preservado o texto dos quesitos como consta nos autos.",
    });
  }

  // Agrupa por origem, na ordem fixa do modelo (autora, ré, Juízo, outros);
  // quesito sem origem cai em "outros".
  const porGrupo = new Map<PosLaudoQuesitoOrigemParte, PosLaudoQuesitosRow[]>();
  for (const q of quesitos) {
    const chave: PosLaudoQuesitoOrigemParte =
      q.origem && (QUESITO_ORIGEM_ORDENADA as readonly string[]).includes(q.origem)
        ? (q.origem as PosLaudoQuesitoOrigemParte)
        : "outro";
    let arr = porGrupo.get(chave);
    if (!arr) {
      arr = [];
      porGrupo.set(chave, arr);
    }
    arr.push(q);
  }

  for (const chave of QUESITO_ORIGEM_ORDENADA) {
    const doGrupo = porGrupo.get(chave);
    if (!doGrupo || doGrupo.length === 0) continue;
    blocos.push({ tipo: "paragrafo", texto: `Quesitos — ${QUESITO_ORIGEM_ROTULOS[chave]}` });
    blocos.push({
      tipo: "quesitos",
      semResposta: opts.semResposta,
      itens: doGrupo.map((q, i) => ({
        numero: i + 1,
        origem: null, // o grupo já identifica a parte; não repetir "(origem)" no item
        pergunta: q.pergunta,
        resposta: q.resposta,
      })),
    });
  }

  return { secaoId: opts.secaoId, codigo: opts.codigo, titulo: opts.titulo, ordem: opts.ordem, blocos };
}
