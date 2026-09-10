/**
 * Compila o parecer de Assistência Técnica de um ciclo de pós-laudo — fatia
 * 10c. Mesmo padrão dos compiladores judiciais (`compilar-esclarecimentos.ts`
 * / `compilar-retificacao.ts` / `compilar-complementacao.ts`): busca no
 * banco, monta um `ModeloLaudo` real (reusa `renderizarPdf`/`renderizarDocx`
 * sem duplicar motor nenhum) e devolve status ok/erro/pendências.
 *
 * Baseado em `Gestão Assistência Técnica.pdf` §§12-15 (Análise do Laudo
 * Judicial → Decisão Pós-Laudo → Manifestação/Impugnação). As 5 modalidades
 * que a Dra. Fernanda descreveu (Concordância / Concordância com Ressalvas /
 * Impugnação Parcial / Impugnação Integral / Parecer Divergente) + a
 * Manifestação genérica são UM compilador só, parametrizado por
 * `at_modalidade` — o esqueleto do documento é idêntico, só o texto da
 * conclusão (seção VI) e o `laudos_gerados.tipo`/título mudam.
 *
 * Os quesitos suplementares/de esclarecimento aparecem embutidos na seção V
 * (via `montarSecaoQuesitos`) E TAMBÉM como documento isolado
 * (`compilar-quesitos-at.ts`) — pedido explícito do Jeferson (item 7 da
 * aprovação da fatia 10): "ela às vezes só precisa entregar o quesito, sem
 * parecer nenhum".
 */

import { montarCabecalhoAssistenciaTecnica } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotPosLaudo, SnapshotPosLaudoPonto } from "@/types/json-fields";
import type { LaudoGeradoTipo, PosLaudoAtModalidade, PosLaudoClassificacaoGlobal } from "@/types/enums";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import { montarSecaoQuesitos } from "./compilar-quesitos-secao";
import {
  AT_ANALISE_EIXO_ORDEM,
  AT_ANALISE_EIXO_ROTULOS,
  CATEGORIA_PROBLEMA_ROTULOS,
  CLASSIFICACAO_GLOBAL_ROTULOS,
  PROVIDENCIA_AT_ROTULOS,
  type CategoriaProblemaAt,
} from "./rotulos";
import { carregarContextoAt, pendenciasComunsAt, type ContextoAt, type LaudoAnalisadoRef } from "./consultas-at";
import type { PosLaudoAtAnaliseRow, PosLaudoPontosRow } from "@/types/database";
import type { PosLaudoProvidenciaAt } from "@/types/enums";
import type { PendenciaGeracaoPosLaudo } from "./regras";
import { createClient } from "@/lib/supabase/server";

export type { PendenciaGeracaoPosLaudo };

export type ResultadoParecerAt =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotPosLaudo; tipo: LaudoGeradoTipo; titulo: string }
  | { status: "erro"; mensagem: string }
  | { status: "pendencias"; itens: PendenciaGeracaoPosLaudo[] };

/** `laudos_gerados.tipo` de cada modalidade — o CHECK do banco só distingue estes 4 valores (migration 20260905120000). */
export const TIPO_POR_MODALIDADE: Record<
  PosLaudoAtModalidade,
  "parecer_at" | "manifestacao_at" | "impugnacao_at" | "parecer_divergente_at"
> = {
  concordancia: "parecer_at",
  concordancia_ressalvas: "parecer_at",
  impugnacao_parcial: "impugnacao_at",
  impugnacao_integral: "impugnacao_at",
  divergente: "parecer_divergente_at",
  manifestacao: "manifestacao_at",
};

export const TITULO_POR_MODALIDADE: Record<PosLaudoAtModalidade, string> = {
  concordancia: "PARECER DE CONCORDÂNCIA",
  concordancia_ressalvas: "PARECER DE CONCORDÂNCIA COM RESSALVAS",
  impugnacao_parcial: "IMPUGNAÇÃO TÉCNICA PARCIAL",
  impugnacao_integral: "IMPUGNAÇÃO TÉCNICA INTEGRAL",
  divergente: "PARECER TÉCNICO DIVERGENTE",
  manifestacao: "MANIFESTAÇÃO TÉCNICA",
};

function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY", sem passar por Date (mesmo cuidado de fuso dos demais compiladores). */
function formatarDataPura(data: string | null): string {
  const m = data?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

const MESES_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
function formatarDataExtenso(dataIso: string): string {
  const m = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dataIso;
  const [, ano, mes, dia] = m;
  return `${parseInt(dia, 10)} de ${MESES_EXTENSO[parseInt(mes, 10) - 1]} de ${ano}`;
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

/** Seção I — Identificação da Análise. */
function montarSecaoI(input: {
  objetoAnalise: string | null;
  teseAssistida: string | null;
  laudoAnalisado: LaudoAnalisadoRef | null;
  classificacaoGlobal: PosLaudoClassificacaoGlobal;
}): SecaoCompilada {
  const blocos: BlocoConteudo[] = [];
  if (input.objetoAnalise?.trim()) blocos.push(paragrafo(`Objeto da análise: ${input.objetoAnalise.trim()}`));
  if (input.teseAssistida?.trim()) blocos.push(paragrafo(`Tese da parte assistida: ${input.teseAssistida.trim()}`));
  const la = input.laudoAnalisado;
  blocos.push(paragrafo(`Laudo analisado: ${la ? la.nomeArquivo : "—"}`));
  if (la?.apresentante) blocos.push(paragrafo(`Apresentado por: ${la.apresentante}`));
  if (la?.dataJuntada) blocos.push(paragrafo(`Data de juntada: ${formatarDataPura(la.dataJuntada)}`));
  if (la?.paginas) blocos.push(paragrafo(`Páginas: ${la.paginas}`));
  blocos.push(paragrafo(`Classificação global do laudo: ${CLASSIFICACAO_GLOBAL_ROTULOS[input.classificacaoGlobal]}`));
  return { secaoId: "at-i", codigo: "at_identificacao", titulo: "I — IDENTIFICAÇÃO DA ANÁLISE", ordem: 1, blocos };
}

/** Seção II — Síntese do Laudo Analisado. `null` = seção não entra (conclusão do perito ainda não registrada). */
function montarSecaoII(atAnalise: PosLaudoAtAnaliseRow | null): SecaoCompilada | null {
  const conclusao = atAnalise?.conclusao_do_perito?.trim();
  if (!conclusao) return null;
  return {
    secaoId: "at-ii",
    codigo: "at_sintese_laudo",
    titulo: "II — SÍNTESE DO LAUDO ANALISADO",
    ordem: 2,
    blocos: [paragrafo(`Conclusão do perito judicial: ${conclusao}`)],
  };
}

/** Seção III — Análise Estruturada do Laudo. Só entram os eixos efetivamente avaliados (Sim/Não). `null` = nenhum avaliado ainda. */
function montarSecaoIII(atAnalise: PosLaudoAtAnaliseRow | null): SecaoCompilada | null {
  if (!atAnalise) return null;
  const blocos: BlocoConteudo[] = [];
  for (const eixo of AT_ANALISE_EIXO_ORDEM) {
    const valor = atAnalise[eixo];
    if (valor === null) continue;
    const nota = atAnalise[`${eixo}_nota`]?.trim();
    let linha = `${AT_ANALISE_EIXO_ROTULOS[eixo]} ${valor ? "Sim." : "Não."}`;
    if (nota) linha += ` ${nota}`;
    blocos.push(paragrafo(linha));
  }
  if (atAnalise.impacto_processual?.trim()) {
    blocos.push(paragrafo(`Impacto processual: ${atAnalise.impacto_processual.trim()}`));
  }
  if (blocos.length === 0) return null;
  return { secaoId: "at-iii", codigo: "at_analise_estruturada", titulo: "III — ANÁLISE ESTRUTURADA DO LAUDO", ordem: 3, blocos };
}

/** Seção IV — Análise Ponto a Ponto. Um ponto por item — mesma estrutura de compilar-esclarecimentos.ts, com categoria_problema no lugar de repercussão. */
function montarSecaoIV(pontos: PosLaudoPontosRow[]): SecaoCompilada {
  const blocos: BlocoConteudo[] = [];
  pontos.forEach((p, i) => {
    const categoria = p.categoria_problema
      ? (CATEGORIA_PROBLEMA_ROTULOS[p.categoria_problema as CategoriaProblemaAt] ?? p.categoria_problema)
      : null;
    blocos.push(paragrafo(`${i + 1}. Quanto a ${p.tema?.trim() || "ponto não temático"}`));
    if (p.sintese_alegacao?.trim()) blocos.push(paragrafo(`Trecho/conclusão do laudo: ${p.sintese_alegacao.trim()}`));
    if (categoria) blocos.push(paragrafo(`Categoria do problema: ${categoria}`));
    blocos.push(paragrafo(`Fundamentação técnica: ${p.resposta_tecnica?.trim() || "—"}`));
  });
  return { secaoId: "at-iv", codigo: "at_pontos", titulo: "IV — ANÁLISE PONTO A PONTO", ordem: 4, blocos };
}

/** Seção VI — Posição da PERICONS. Texto-base por modalidade + a síntese que a perita escreveu, quando houver. */
function montarSecaoVI(modalidade: PosLaudoAtModalidade, posicaoSintese: string | null): SecaoCompilada {
  const base: Record<PosLaudoAtModalidade, string> = {
    concordancia:
      "A PERICONS concorda integralmente com a conclusão do laudo pericial judicial, por entender que os fundamentos técnicos apresentados estão corretos e suficientemente demonstrados.",
    concordancia_ressalvas:
      "A PERICONS concorda, em linhas gerais, com a conclusão do laudo pericial judicial, ressalvados os pontos especificamente indicados na análise ponto a ponto acima.",
    impugnacao_parcial:
      "A PERICONS diverge parcialmente da conclusão do laudo pericial judicial, nos termos e pelos fundamentos técnicos expostos na análise ponto a ponto acima, sem prejuízo dos demais aspectos não impugnados.",
    impugnacao_integral:
      "A PERICONS diverge integralmente da conclusão do laudo pericial judicial, pelos fundamentos técnicos expostos na análise ponto a ponto acima.",
    divergente:
      "A PERICONS apresenta parecer técnico divergente da conclusão do laudo pericial judicial, com fundamentação própria, nos termos expostos neste documento.",
    manifestacao:
      "A PERICONS apresenta a presente manifestação técnica sobre o laudo pericial judicial, nos termos expostos neste documento.",
  };
  const blocos: BlocoConteudo[] = [paragrafo(base[modalidade])];
  if (posicaoSintese?.trim()) blocos.push(paragrafo(posicaoSintese.trim()));
  return { secaoId: "at-vi", codigo: "at_posicao", titulo: "VI — POSIÇÃO DA PERICONS", ordem: 6, blocos };
}

/** Seção VII — Providência Recomendada. */
function montarSecaoVII(providencia: string[]): SecaoCompilada {
  const rotulos = providencia
    .map((p) => PROVIDENCIA_AT_ROTULOS[p as PosLaudoProvidenciaAt] ?? p)
    .filter(Boolean);
  return {
    secaoId: "at-vii",
    codigo: "at_providencia",
    titulo: "VII — PROVIDÊNCIA RECOMENDADA",
    ordem: 7,
    blocos: [paragrafo(rotulos.length > 0 ? rotulos.join("; ") + "." : "—")],
  };
}

/** Seção VIII — Encerramento. Mesmo padrão two-pass + data do ato dos demais compiladores. */
function montarSecaoVIII(paginasTexto: string, dataAssinaturaIso: string): SecaoCompilada {
  const dataExtenso = formatarDataExtenso(dataAssinaturaIso);
  return {
    secaoId: "at-viii",
    codigo: "encerramento",
    titulo: "VIII — ENCERRAMENTO",
    ordem: 8,
    blocos: [
      paragrafo(
        `Nada mais havendo a acrescentar, encerra-se o presente documento, composto por ${paginasTexto} páginas, incluindo esta, todas devidamente numeradas.`,
      ),
      {
        tipo: "assinatura",
        cidadeData: `${VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${dataExtenso}.`,
        nome: `Dra. ${VALORES_PADRAO_PERITO.nome_perito}`,
        tituloCrm: `Médica Perita, CRM ${VALORES_PADRAO_PERITO.crm_uf}.`,
      },
    ],
  };
}

/** Pendências específicas do parecer, além das comuns às duas saídas AT (ver consultas-at.ts). */
function pendenciasParecer(ctx: ContextoAt): PendenciaGeracaoPosLaudo[] {
  const pendencias = pendenciasComunsAt(ctx);
  const providencia = (ctx.ciclo.providencia_recomendada as string[] | null) ?? [];
  if (providencia.length === 0) {
    pendencias.push({
      id: "sem-providencia",
      label: "Providência recomendada ainda não selecionada.",
      href: "#providencia-recomendada",
    });
  }
  return pendencias;
}

export async function compilarParecerAt(
  processoId: string,
  cicloId: string,
  modalidade: PosLaudoAtModalidade,
  paginasTexto = "—",
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoParecerAt> {
  const supabase = await createClient();
  const carregado = await carregarContextoAt(supabase, processoId, cicloId);
  if ("erro" in carregado) return { status: "erro", mensagem: carregado.erro };
  const ctx = carregado.ctx;

  const pendencias = pendenciasParecer(ctx);
  if (pendencias.length > 0) return { status: "pendencias", itens: pendencias };

  const classificacaoGlobal = ctx.ciclo.classificacao_global as PosLaudoClassificacaoGlobal;
  const cabecalho = {
    ...montarCabecalhoAssistenciaTecnica(ctx.processo),
    tituloDocumento: TITULO_POR_MODALIDADE[modalidade],
  };

  const secaoQuesitos = montarSecaoQuesitos(ctx.quesitos, {
    secaoId: "at-v",
    codigo: "at_quesitos",
    titulo: "V — QUESITOS SUGERIDOS",
    ordem: 5,
    semResposta: true,
  });

  const secoes: SecaoCompilada[] = [
    montarSecaoI({
      objetoAnalise: ctx.ciclo.objeto_analise,
      teseAssistida: ctx.ciclo.tese_assistida,
      laudoAnalisado: ctx.laudoAnalisado,
      classificacaoGlobal,
    }),
    montarSecaoII(ctx.atAnalise),
    montarSecaoIII(ctx.atAnalise),
    montarSecaoIV(ctx.pontos),
    secaoQuesitos,
    montarSecaoVI(modalidade, ctx.ciclo.posicao_pericons_sintese),
    montarSecaoVII((ctx.ciclo.providencia_recomendada as string[] | null) ?? []),
    montarSecaoVIII(paginasTexto, dataAssinaturaIso),
  ].filter((s): s is SecaoCompilada => s !== null);

  const modelo: ModeloLaudo = {
    processoId,
    tipoTrabalho: ctx.processo.tipo_trabalho,
    rodapeTexto: rodapeTexto(ctx.config, ctx.processo.tipo_trabalho),
    tipoLaudoCodigo: "",
    tipoLaudoNome: "",
    geradoEm: new Date().toISOString(),
    cabecalho,
    apresentacao: "",
    secoes,
    imagensPericia: [],
  };

  const snapshot: SnapshotPosLaudo = {
    tipo: TIPO_POR_MODALIDADE[modalidade],
    gerado_em: modelo.geradoEm,
    ciclo_id: cicloId,
    numero_ciclo: ctx.ciclo.numero_ciclo,
    fluxo: "assistencia_tecnica",
    pontos: ctx.pontos.map(
      (p): SnapshotPosLaudoPonto => ({
        ordem: p.ordem,
        tema: p.tema,
        origem_ponto: p.origem_ponto,
        sintese_alegacao: p.sintese_alegacao,
        classificacao_triagem: p.classificacao_triagem,
        resposta_tecnica: p.resposta_tecnica,
        repercussao: p.repercussao,
        categoria_problema: p.categoria_problema,
      }),
    ),
    quesitos_ciclo: ctx.quesitos.map((q) => ({
      numero: q.numero,
      tipo: q.tipo,
      origem: q.origem,
      pergunta: q.pergunta,
      resposta: q.resposta,
    })),
    retificacao_itens: [],
    repercussao_ciclo: null,
    classificacao_global: classificacaoGlobal,
    conclusao_vigente_texto: null, // AT não tem conclusão vigente própria (resposta (a) da Dra.)
    at_modalidade: modalidade,
    at_providencia: (ctx.ciclo.providencia_recomendada as string[] | null) ?? [],
    at_posicao_pericons: ctx.ciclo.posicao_pericons_sintese,
  };

  return { status: "ok", modelo, snapshot, tipo: TIPO_POR_MODALIDADE[modalidade], titulo: TITULO_POR_MODALIDADE[modalidade] };
}
