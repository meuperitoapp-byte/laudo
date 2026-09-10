/**
 * Compila o documento ISOLADO de "Quesitos Suplementares" do fluxo AT — fatia
 * 10c, item 7 da aprovação do Jeferson: os mesmos quesitos do ciclo saem tanto
 * embutidos no parecer (compilar-parecer-at.ts, seção V) quanto como peça
 * própria, porque há cenários em que a Dra. Fernanda só precisa entregar o
 * quesito ao advogado, sem parecer nenhum.
 *
 * Por isso as pendências aqui são DELIBERADAMENTE mais leves que as do
 * parecer: não exige classificação global, laudo analisado anexado, nem
 * pontos da matriz respondidos — só que exista pelo menos um quesito com
 * pergunta preenchida. Exigir o resto obrigaria a fazer a análise completa só
 * pra entregar uma pergunta, o que contradiz o próprio motivo de existir do
 * documento isolado.
 */

import { montarCabecalhoAssistenciaTecnica } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotPosLaudo } from "@/types/json-fields";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import { montarSecaoQuesitos } from "./compilar-quesitos-secao";
import { carregarContextoAt } from "./consultas-at";
import type { PendenciaGeracaoPosLaudo } from "./regras";
import { createClient } from "@/lib/supabase/server";

export type { PendenciaGeracaoPosLaudo };

export type ResultadoQuesitosAt =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotPosLaudo }
  | { status: "erro"; mensagem: string }
  | { status: "pendencias"; itens: PendenciaGeracaoPosLaudo[] };

export const TITULO_QUESITOS_AT = "QUESITOS SUPLEMENTARES";

function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
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

function montarSecaoI(input: { objetoAnalise: string | null; teseAssistida: string | null }): SecaoCompilada {
  const blocos: BlocoConteudo[] = [
    paragrafo(
      "Seguem os quesitos suplementares elaborados para apresentação pelo(a) advogado(a) nos autos, a critério da estratégia processual da parte assistida.",
    ),
  ];
  if (input.objetoAnalise?.trim()) blocos.push(paragrafo(`Objeto da análise: ${input.objetoAnalise.trim()}`));
  if (input.teseAssistida?.trim()) blocos.push(paragrafo(`Tese da parte assistida: ${input.teseAssistida.trim()}`));
  return { secaoId: "at-quesitos-i", codigo: "at_quesitos_identificacao", titulo: "I — IDENTIFICAÇÃO", ordem: 1, blocos };
}

function montarSecaoEncerramento(paginasTexto: string, dataAssinaturaIso: string): SecaoCompilada {
  const dataExtenso = formatarDataExtenso(dataAssinaturaIso);
  return {
    secaoId: "at-quesitos-encerramento",
    codigo: "encerramento",
    titulo: "III — ENCERRAMENTO",
    ordem: 3,
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

export async function compilarQuesitosAt(
  processoId: string,
  cicloId: string,
  paginasTexto = "—",
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoQuesitosAt> {
  const supabase = await createClient();
  const carregado = await carregarContextoAt(supabase, processoId, cicloId);
  if ("erro" in carregado) return { status: "erro", mensagem: carregado.erro };
  const ctx = carregado.ctx;

  const pendencias: PendenciaGeracaoPosLaudo[] = [];
  if (ctx.quesitos.length === 0) {
    pendencias.push({ id: "sem-quesitos", label: "Nenhum quesito cadastrado no ciclo.", href: "#quesitos-ciclo" });
  }
  ctx.quesitos.forEach((q, i) => {
    if (!q.pergunta?.trim()) {
      pendencias.push({
        id: `quesito-sem-pergunta-${q.id}`,
        label: `Quesito ${i + 1} do ciclo — pergunta ainda não preenchida.`,
        href: `#quesito-${q.id}`,
      });
    }
  });
  if (pendencias.length > 0) return { status: "pendencias", itens: pendencias };

  const secaoQuesitos = montarSecaoQuesitos(ctx.quesitos, {
    secaoId: "at-quesitos-ii",
    codigo: "at_quesitos_lista",
    titulo: "II — QUESITOS SUPLEMENTARES",
    ordem: 2,
    semResposta: true,
  });
  // Inalcançável aqui (pendências acima já garantem >=1 quesito com pergunta), mas TS exige o narrow.
  if (!secaoQuesitos) return { status: "erro", mensagem: "Nenhum quesito para compor o documento." };

  const cabecalho = {
    ...montarCabecalhoAssistenciaTecnica(ctx.processo),
    tituloDocumento: TITULO_QUESITOS_AT,
  };

  const secoes: SecaoCompilada[] = [
    montarSecaoI({ objetoAnalise: ctx.ciclo.objeto_analise, teseAssistida: ctx.ciclo.tese_assistida }),
    secaoQuesitos,
    montarSecaoEncerramento(paginasTexto, dataAssinaturaIso),
  ];

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
    tipo: "quesitos_at",
    gerado_em: modelo.geradoEm,
    ciclo_id: cicloId,
    numero_ciclo: ctx.ciclo.numero_ciclo,
    fluxo: "assistencia_tecnica",
    pontos: [],
    quesitos_ciclo: ctx.quesitos.map((q) => ({
      numero: q.numero,
      tipo: q.tipo,
      origem: q.origem,
      pergunta: q.pergunta,
      resposta: q.resposta,
    })),
    retificacao_itens: [],
    repercussao_ciclo: null,
    classificacao_global: ctx.ciclo.classificacao_global,
    conclusao_vigente_texto: null,
  };

  return { status: "ok", modelo, snapshot };
}
