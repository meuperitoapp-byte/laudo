/**
 * Compila a Retificação de Erro Material de um ciclo de pós-laudo — fatia 6.
 * Mesmo padrão de `compilar-esclarecimentos.ts` (que por sua vez espelha
 * `geracao-laudo/compilar.ts`): busca no banco, monta um `ModeloLaudo` real
 * (reusando `renderizarPdf`/`renderizarDocx` sem duplicar motor nenhum) e
 * devolve status ok/erro/pendências, com pendências como lista item a item.
 *
 * Baseado em `MODELO_RETIFICACAO_DE_ERRO_MATERIAL.pdf` (seções I–VII).
 *
 * A trava central do documento (seção IV — "Análise da Repercussão") é uma
 * PERGUNTA EXPLÍCITA à perita (`pos_laudo_ciclos.retificacao_afeta_conclusao`,
 * migration 20260907120000), nunca inferida de outro campo. Quando a resposta
 * é SIM, este compilador nunca chega a montar um documento — devolve uma
 * pendência de TOM "orientação" (não "bloqueio"): ela identificou certo que a
 * correção repercute, e o caminho correto passa a ser a Complementação do
 * Laudo (fatia 7, ainda não existe). Os itens "onde se lê / leia-se"
 * (`pos_laudo_retificacao_itens`) não precisam ser movidos pra lugar nenhum
 * quando isso acontece — a tabela já nasceu (fatia 0) chaveada só por
 * `ciclo_id`, não pela saída que a consome.
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoFormal, type CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotPosLaudo, SnapshotPosLaudoRetificacaoItem } from "@/types/json-fields";
import type { PosLaudoRetificacaoItensRow } from "@/types/database";
import { FLUXO_ROTULOS, NATUREZA_ERRO_ROTULOS } from "./rotulos";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import type { PosLaudoNaturezaErro } from "@/types/enums";
import type { PendenciaGeracaoPosLaudo } from "./regras";

export type { PendenciaGeracaoPosLaudo };

export type ResultadoRetificacao =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotPosLaudo }
  | { status: "erro"; mensagem: string }
  | { status: "pendencias"; itens: PendenciaGeracaoPosLaudo[] };

const TITULO_RETIFICACAO = "RETIFICAÇÃO DE ERRO MATERIAL";

function formatarTimestamp(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" }) : "—";
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

/** Nome do tipo de documento original, pro Seção I ("Laudo/documento original: ..."). Só os tipos que já podem existir hoje. */
const TIPO_DOCUMENTO_ROTULOS: Record<string, string> = {
  laudo: "Laudo Médico-Pericial",
  esclarecimentos: "Esclarecimentos ao Laudo Médico-Pericial",
  retificacao: "Retificação de Erro Material",
  complementacao: "Complementação do Laudo",
};

function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
}

/**
 * Parágrafo de abertura — "[NOME], médico(a), CRM..., vem respeitosamente
 * apresentar a presente RETIFICAÇÃO DE ERRO MATERIAL referente ao Laudo...".
 * Sem "ID [___]": quando falta o protocolo do documento-alvo, a frase é
 * composta sem a cláusula (mesma regra de compilar-esclarecimentos.ts).
 */
function montarParagrafoIntroducao(protocoloDocumentoAlvo: string | null): string {
  const nome = VALORES_PADRAO_PERITO.nome_perito;
  const crm = VALORES_PADRAO_PERITO.crm_uf;
  let frase = `Dra. ${nome}, médica, CRM/${crm}, perita nomeada por este Juízo, vem, respeitosamente, apresentar a presente ${TITULO_RETIFICACAO}`;
  frase += protocoloDocumentoAlvo
    ? `, referente ao documento pericial anteriormente apresentado sob protocolo nº ${protocoloDocumentoAlvo}, para correção de inexatidão material identificada no documento, nos termos que seguem.`
    : ", referente ao documento pericial anteriormente apresentado nos autos, para correção de inexatidão material identificada no documento, nos termos que seguem.";
  return frase;
}

/**
 * Seção I — Identificação do Documento Retificado. O documento-alvo é sempre
 * o `laudo_base_id` do ciclo (mesma âncora usada pra Esclarecimentos) —
 * simplificação registrada: o modelo prevê apontar pra qualquer versão
 * anterior (Laudo/Esclarecimentos/Complementação); por ora não há seletor de
 * item por item, então todos os itens deste ciclo retificam o mesmo
 * documento-base. "Data da identificação do erro" e "Origem da identificação"
 * do modelo não têm campo equivalente no schema — a seção não as menciona.
 */
function montarSecaoI(documentoAlvo: { tipo: string; versao: number; protocolo_id: string | null; protocolado_em: string | null } | null): SecaoCompilada {
  const blocos: BlocoConteudo[] = [
    paragrafo(`Laudo/documento original: ${documentoAlvo ? (TIPO_DOCUMENTO_ROTULOS[documentoAlvo.tipo] ?? documentoAlvo.tipo) : "—"}`),
  ];
  if (documentoAlvo?.protocolo_id) blocos.push(paragrafo(`ID do documento: ${documentoAlvo.protocolo_id}`));
  blocos.push(paragrafo(`Versão: V${documentoAlvo?.versao ?? "—"}`));
  blocos.push(paragrafo(`Data do protocolo: ${documentoAlvo ? formatarTimestamp(documentoAlvo.protocolado_em) : "—"}`));
  return {
    secaoId: "retificacao-i",
    codigo: "retificacao_identificacao",
    titulo: "I — IDENTIFICAÇÃO DO DOCUMENTO RETIFICADO",
    ordem: 1,
    blocos,
  };
}

/** Seção II — Objeto da Retificação. Lista as naturezas de erro presentes nos itens (sem repetir). */
function montarSecaoII(itens: PosLaudoRetificacaoItensRow[]): SecaoCompilada {
  const naturezas = Array.from(
    new Set(itens.map((i) => i.natureza_erro).filter((n): n is string => Boolean(n))),
  ).map((n) => NATUREZA_ERRO_ROTULOS[n as PosLaudoNaturezaErro] ?? n);
  return {
    secaoId: "retificacao-ii",
    codigo: "retificacao_objeto",
    titulo: "II — OBJETO DA RETIFICAÇÃO",
    ordem: 2,
    blocos: [
      paragrafo(
        "A presente retificação destina-se exclusivamente à correção de erro material identificado no documento pericial acima referido, sem reabertura da análise técnico-pericial.",
      ),
      paragrafo(`Natureza do erro material: ${naturezas.length > 0 ? naturezas.join("; ") : "—"}.`),
    ],
  };
}

/** Seção III — Retificação. Uma tabela com todos os itens onde-se-lê/leia-se. */
function montarSecaoIII(itens: PosLaudoRetificacaoItensRow[]): SecaoCompilada {
  const linhas = itens.map((i) => [i.pagina?.trim() || "—", i.item_secao?.trim() || "—", i.onde_se_le, i.leia_se]);
  return {
    secaoId: "retificacao-iii",
    codigo: "retificacao_correcoes",
    titulo: "III — RETIFICAÇÃO",
    ordem: 3,
    blocos: [{ tipo: "tabela", colunas: ["Página", "Item/Seção", "Onde se lê", "Leia-se"], linhas }],
  };
}

/**
 * Seção IV — Análise da Repercussão. Só é alcançada quando a resposta é NÃO
 * (SIM vira pendência de orientação antes de chegar aqui — ver
 * compilarRetificacao). A justificativa entra VERBATIM: é a declaração
 * técnica que sustenta a peça se for questionada depois.
 */
function montarSecaoIV(justificativa: string): SecaoCompilada {
  return {
    secaoId: "retificacao-iv",
    codigo: "retificacao_repercussao",
    titulo: "IV — ANÁLISE DA REPERCUSSÃO",
    ordem: 4,
    blocos: [
      paragrafo(
        "A correção identificada interfere na fundamentação técnico-pericial ou na conclusão do documento original? NÃO — Trata-se exclusivamente de erro material, sem repercussão técnico-pericial.",
      ),
      paragrafo(`Justificativa: ${justificativa}`),
    ],
  };
}

/** Seção V — Repercussão sobre o Documento Original. Só existe no caminho NÃO — texto fixo do modelo. */
function montarSecaoV(): SecaoCompilada {
  return {
    secaoId: "retificacao-v",
    codigo: "retificacao_repercussao_documento",
    titulo: "V — REPERCUSSÃO SOBRE O DOCUMENTO ORIGINAL",
    ordem: 5,
    blocos: [
      paragrafo(
        "A presente correção possui natureza exclusivamente material e não modifica a metodologia, os achados médico-periciais, a fundamentação técnica, as respostas aos quesitos ou as conclusões constantes do documento original, que permanecem integralmente mantidos nos demais termos.",
      ),
      paragrafo("Situação da conclusão médico-pericial: Conclusão original integralmente mantida."),
    ],
  };
}

/** Seção VI — Conclusão da Retificação. Texto fixo do modelo. */
function montarSecaoVI(): SecaoCompilada {
  return {
    secaoId: "retificacao-vi",
    codigo: "retificacao_conclusao",
    titulo: "VI — CONCLUSÃO DA RETIFICAÇÃO",
    ordem: 6,
    blocos: [
      paragrafo(
        "Diante do exposto, procede-se à retificação do erro material acima individualizado, devendo o trecho indicado ser considerado conforme a redação constante do campo \"Leia-se\".",
      ),
      paragrafo(
        "A presente retificação não altera o conteúdo técnico-pericial substancial do documento original, permanecendo mantidos seus demais termos, fundamentos e conclusões.",
      ),
    ],
  };
}

/** Seção VII — Encerramento. Mesmo padrão de compilar-esclarecimentos.ts (paginação two-pass + data do ato). */
function montarSecaoVII(paginasTexto: string, dataAssinaturaIso: string): SecaoCompilada {
  const dataExtenso = formatarDataExtenso(dataAssinaturaIso);
  return {
    secaoId: "retificacao-vii",
    codigo: "encerramento",
    titulo: "VII — ENCERRAMENTO",
    ordem: 7,
    blocos: [
      paragrafo(
        `Nada mais havendo a retificar, encerra-se o presente documento de Retificação de Erro Material, composto por ${paginasTexto} páginas, incluindo esta, todas devidamente numeradas. A presente retificação deverá ser interpretada em conjunto com o documento pericial original ao qual se vincula.`,
      ),
      {
        tipo: "assinatura",
        cidadeData: `${VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${dataExtenso}.`,
        nome: `Dra. ${VALORES_PADRAO_PERITO.nome_perito}`,
        tituloCrm: `Médica Perita Judicial, CRM ${VALORES_PADRAO_PERITO.crm_uf}.`,
      },
    ],
  };
}

/** "YYYY-MM-DD" de hoje, no fuso do servidor — só serve de default pra chamada de leitura (preview de pendências). */
function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

/**
 * Compila a Retificação de um ciclo. `paginasTexto`/`dataAssinaturaIso`: ver
 * `compilarEsclarecimentos` — mesmo contrato de two-pass e de data do ato.
 */
export async function compilarRetificacao(
  processoId: string,
  cicloId: string,
  paginasTexto = "—",
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoRetificacao> {
  const supabase = await createClient();

  const { data: ciclo } = await supabase
    .from("pos_laudo_ciclos")
    .select("*")
    .eq("id", cicloId)
    .eq("processo_id", processoId)
    .maybeSingle();
  if (!ciclo) return { status: "erro", mensagem: "Ciclo de pós-laudo não encontrado." };
  if (ciclo.fluxo !== "judicial") {
    return {
      status: "erro",
      mensagem: `Geração de Retificação só está disponível no fluxo judicial (este ciclo é ${FLUXO_ROTULOS[ciclo.fluxo] ?? ciclo.fluxo}).`,
    };
  }

  const { data: processo } = await supabase.from("processos").select("*").eq("id", processoId).single();
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };

  const { data: partesDb } = await supabase.from("processo_partes").select("*").eq("processo_id", processoId);
  const cabecalhoBase = montarCabecalhoFormal(processo, partesDb ?? []);
  if ("erro" in cabecalhoBase) return { status: "erro", mensagem: cabecalhoBase.erro };

  const [{ data: itensDb }, { data: config }] = await Promise.all([
    supabase.from("pos_laudo_retificacao_itens").select("*").eq("ciclo_id", cicloId).order("ordem"),
    supabase.from("configuracoes").select("*").maybeSingle(),
  ]);
  const itens = itensDb ?? [];

  const { data: documentoAlvo } = ciclo.laudo_base_id
    ? await supabase
        .from("laudos_gerados")
        .select("tipo, versao, protocolo_id, protocolado_em")
        .eq("id", ciclo.laudo_base_id)
        .maybeSingle()
    : { data: null };

  // --- Pendências: uma lista só, cada item aponta pro lugar de resolver ---
  const pendencias: PendenciaGeracaoPosLaudo[] = [];
  if (itens.length === 0) {
    pendencias.push({ id: "sem-itens", label: "Nenhum item de retificação cadastrado.", href: "#retificacao-itens" });
  }
  itens.forEach((item, i) => {
    if (!item.onde_se_le?.trim() || !item.leia_se?.trim()) {
      pendencias.push({
        id: `item-${item.id}`,
        label: `Item ${i + 1} — "Onde se lê" e "Leia-se" precisam estar preenchidos.`,
        href: `#retificacao-item-${item.id}`,
      });
    }
  });

  if (ciclo.retificacao_afeta_conclusao === null) {
    pendencias.push({
      id: "analise-nao-respondida",
      label: "Análise da Repercussão (seção IV) ainda não respondida.",
      href: "#retificacao-analise",
    });
  } else if (ciclo.retificacao_afeta_conclusao === true) {
    pendencias.push({
      id: "afeta-conclusao",
      tom: "orientacao",
      label:
        "Você identificou corretamente que esta correção tem repercussão sobre a fundamentação ou a conclusão do laudo — isso não é um erro seu. Pelo modelo, o caminho técnico correto para esse caso é a Complementação do Laudo, não uma Retificação simples. A Complementação ainda não foi implementada neste sistema; por enquanto, os itens que você já cadastrou aqui ficam salvos e serão usados automaticamente assim que ela existir. Nenhum documento de Retificação será gerado para este ciclo enquanto esta resposta for SIM — não porque algo deu errado, mas porque essa não é mais a saída certa para este caso.",
      href: "#retificacao-analise",
    });
  } else if (!ciclo.retificacao_justificativa?.trim()) {
    pendencias.push({
      id: "sem-justificativa",
      label: "Justificativa da Análise da Repercussão (seção IV) não preenchida.",
      href: "#retificacao-analise",
    });
  }
  if (pendencias.length > 0) return { status: "pendencias", itens: pendencias };

  // A partir daqui, retificacao_afeta_conclusao === false e a justificativa está preenchida (checado acima).
  const justificativa = ciclo.retificacao_justificativa as string;

  const cabecalho: CabecalhoFormal = {
    ...cabecalhoBase,
    tituloDocumento: TITULO_RETIFICACAO,
    paragrafoIntroducao: montarParagrafoIntroducao(documentoAlvo?.protocolo_id ?? null),
  };

  const secoes: SecaoCompilada[] = [
    montarSecaoI(documentoAlvo),
    montarSecaoII(itens),
    montarSecaoIII(itens),
    montarSecaoIV(justificativa),
    montarSecaoV(),
    montarSecaoVI(),
    montarSecaoVII(paginasTexto, dataAssinaturaIso),
  ];

  const modelo: ModeloLaudo = {
    processoId,
    tipoTrabalho: processo.tipo_trabalho,
    rodapeTexto: rodapeTexto(config ?? null, processo.tipo_trabalho),
    tipoLaudoCodigo: "",
    tipoLaudoNome: "",
    geradoEm: new Date().toISOString(),
    cabecalho,
    apresentacao: "",
    secoes,
    imagensPericia: [],
  };

  const snapshot: SnapshotPosLaudo = {
    tipo: "retificacao",
    gerado_em: modelo.geradoEm,
    ciclo_id: cicloId,
    numero_ciclo: ciclo.numero_ciclo,
    fluxo: ciclo.fluxo,
    pontos: [],
    quesitos_ciclo: [],
    retificacao_itens: itens.map(
      (i): SnapshotPosLaudoRetificacaoItem => ({
        ordem: i.ordem,
        pagina: i.pagina,
        item_secao: i.item_secao,
        onde_se_le: i.onde_se_le,
        leia_se: i.leia_se,
      }),
    ),
    repercussao_ciclo: null, // não se aplica à Retificação — é a síntese dos Esclarecimentos
    classificacao_global: ciclo.classificacao_global,
    conclusao_vigente_texto: null, // Retificação NUNCA cria Nova Conclusão Vigente — trava estrutural (ver enums.ts)
  };

  return { status: "ok", modelo, snapshot };
}
