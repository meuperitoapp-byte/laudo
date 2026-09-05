/**
 * Compila os Esclarecimentos ao Laudo Médico-Pericial de um ciclo de
 * pós-laudo — fatia 5. Espelha `src/features/geracao-laudo/compilar.ts`
 * (mesmo padrão: busca tudo no banco, monta um `ModeloLaudo` e devolve status
 * ok/erro/pendências), mas devolve as pendências como UMA lista item a item
 * (não dois status separados como o laudo principal) — cada item aponta pro
 * lugar exato de resolver, no mesmo espírito do bloco "Geração bloqueada" da
 * tela do laudo final.
 *
 * Baseado no modelo `MODELO_ESCLARECIMENTOS_AO_LAUDO_MEDICO_PERICIAL.pdf`
 * (seções I–VIII). Simplificações registradas linha a linha abaixo — nenhuma
 * é um placeholder de template ("[___]") impresso no documento: quando falta
 * dado, a frase é composta sem a informação, nunca com um colchete vazio.
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoFormal, type CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotPosLaudo, SnapshotPosLaudoPonto } from "@/types/json-fields";
import type { PosLaudoCiclosRow, PosLaudoPontosRow } from "@/types/database";
import { podeGerarSaida } from "./regras";
import {
  FLUXO_ROTULOS,
  NATUREZA_ROTULOS,
  ORIGEM_ROTULOS,
  REPERCUSSAO_LAUDO_ROTULOS,
  REPERCUSSAO_PONTO_ROTULOS,
} from "./rotulos";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import type { PosLaudoNatureza, PosLaudoOrigem, PosLaudoRepercussaoLaudo, PosLaudoRepercussaoPonto } from "@/types/enums";

export interface PendenciaGeracaoPosLaudo {
  id: string;
  label: string;
  /** Âncora (#id) da tela do ciclo que resolve a pendência. */
  href?: string;
}

export type ResultadoEsclarecimentos =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotPosLaudo }
  | { status: "erro"; mensagem: string }
  | { status: "pendencias"; itens: PendenciaGeracaoPosLaudo[] };

const TITULO_ESCLARECIMENTOS = "ESCLARECIMENTOS AO LAUDO MÉDICO-PERICIAL";

/** "YYYY-MM-DD" -> "DD/MM/YYYY", sem passar por Date (evita o problema clássico de fuso em datas puras). */
function formatarDataPura(data: string | null): string {
  const m = data?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

/** Timestamp de verdade (com hora) — mesma convenção de gerar-laudo-panel.tsx. */
function formatarTimestamp(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" }) : "—";
}

const MESES_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/**
 * "YYYY-MM-DD" -> "5 de setembro de 2026", sem passar por `Date` (mesmo
 * cuidado de fuso de `formatarDataPura`). É a data do ATO — a perita escolhe
 * na tela de geração (pré-preenchida com hoje, mas editável): um documento
 * pode ser gerado num dia e protocolado dias depois, e a data que vai aos
 * autos tem que ser a do ato, não a da geração.
 */
function formatarDataExtenso(dataIso: string): string {
  const m = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dataIso;
  const [, ano, mes, dia] = m;
  return `${parseInt(dia, 10)} de ${MESES_EXTENSO[parseInt(mes, 10) - 1]} de ${ano}`;
}

function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
}

/**
 * Parágrafo de abertura (entre os dados do processo e o título) — "[NOME DO
 * PERITO], médico(a), CRM..., vem respeitosamente... apresentar os presentes
 * Esclarecimentos... referentes ao Laudo... nos termos que seguem." Nunca
 * imprime "ID [___]": quando não há nº de protocolo do laudo original ou data
 * da intimação, a frase é composta sem essa cláusula, em vez de um colchete
 * vazio (mesma regra que a Dra. pediu pra extração da conclusão vigente).
 */
function montarParagrafoIntroducao(protocoloLaudoOriginal: string | null, dataIntimacao: string | null): string {
  const nome = VALORES_PADRAO_PERITO.nome_perito;
  const crm = VALORES_PADRAO_PERITO.crm_uf;
  let frase = `Dra. ${nome}, médica, CRM/${crm}, perita nomeada por este Juízo, vem, respeitosamente`;
  if (dataIntimacao) frase += `, em atenção à intimação de ${formatarDataPura(dataIntimacao)}`;
  frase += `, apresentar os presentes ${TITULO_ESCLARECIMENTOS}`;
  frase += protocoloLaudoOriginal
    ? `, referentes ao Laudo Médico-Pericial anteriormente apresentado sob protocolo nº ${protocoloLaudoOriginal}, nos termos que seguem.`
    : ", referentes ao Laudo Médico-Pericial anteriormente apresentado nos autos, nos termos que seguem.";
  return frase;
}

/** Seção I — Identificação da Manifestação. "ID da manifestação" do modelo não entra: não há campo equivalente no schema hoje (nota no README). */
function montarSecaoI(
  ciclo: PosLaudoCiclosRow,
  protocoloLaudoOriginal: string | null,
  dataProtocoloLaudoOriginal: string | null,
): SecaoCompilada {
  const naturezaTexto =
    (ciclo.natureza as PosLaudoNatureza[] | null)?.map((n) => NATUREZA_ROTULOS[n] ?? n).join("; ") || "—";
  const origemTexto = ciclo.origem ? (ORIGEM_ROTULOS[ciclo.origem as PosLaudoOrigem] ?? ciclo.origem) : "—";

  return {
    secaoId: "esclarecimentos-i",
    codigo: "esclarecimentos_identificacao",
    titulo: "I — IDENTIFICAÇÃO DA MANIFESTAÇÃO",
    ordem: 1,
    blocos: [
      paragrafo(`Laudo pericial original: ${protocoloLaudoOriginal ?? "—"}`),
      paragrafo(`Data do protocolo: ${dataProtocoloLaudoOriginal ? formatarTimestamp(dataProtocoloLaudoOriginal) : "—"}`),
      paragrafo(`Manifestação analisada: ${naturezaTexto}`),
      paragrafo(`Apresentada por: ${origemTexto}`),
      paragrafo(`Data da intimação do perito: ${formatarDataPura(ciclo.data_intimacao)}`),
      paragrafo(
        "Os presentes esclarecimentos destinam-se à análise dos pontos suscitados na manifestação acima identificada, mantendo-se como referência o objeto pericial originalmente delimitado pelo Juízo.",
      ),
    ],
  };
}

/** Seção II — Delimitação da Análise. O 2º parágrafo só entra quando há documento superveniente no ciclo. */
function montarSecaoII(temDocumentoSuperveniente: boolean): SecaoCompilada {
  const blocos: BlocoConteudo[] = [
    paragrafo(
      "Os presentes esclarecimentos possuem natureza complementar ao Laudo Médico-Pericial anteriormente apresentado e destinam-se especificamente ao enfrentamento dos questionamentos supervenientes formulados nos autos.",
    ),
    paragrafo(
      "Permanecem válidos os dados, metodologia, exame médico-pericial, documentação analisada, discussão e demais elementos constantes do laudo original, salvo quando expressamente complementados, retificados ou revistos no presente documento.",
    ),
  ];
  if (temDocumentoSuperveniente) {
    blocos.push(
      paragrafo(
        "Registra-se que, após a emissão do laudo original, foram apresentados novos documentos, os quais não integravam o acervo documental disponível ao perito à época da elaboração da perícia, sendo analisados especificamente nesta oportunidade.",
      ),
    );
  }
  return {
    secaoId: "esclarecimentos-ii",
    codigo: "esclarecimentos_delimitacao",
    titulo: "II — DELIMITAÇÃO DA ANÁLISE",
    ordem: 2,
    blocos,
  };
}

/** Seção III — Documentos Supervenientes Analisados. `null` = seção não entra no documento (sem documento novo no ciclo). */
function montarSecaoIII(
  documentos: { nome_arquivo: string; apresentante: string | null; data_juntada: string | null; paginas: string | null; relevancia: string | null; impacto: string | null }[],
): SecaoCompilada | null {
  if (documentos.length === 0) return null;
  const linhas = documentos.map((d) => [
    d.nome_arquivo,
    d.apresentante ?? "—",
    formatarDataPura(d.data_juntada),
    d.paginas ?? "—",
    d.relevancia ?? "—",
    d.impacto?.trim() || "—",
  ]);
  return {
    secaoId: "esclarecimentos-iii",
    codigo: "esclarecimentos_documentos_supervenientes",
    titulo: "III — DOCUMENTOS SUPERVENIENTES ANALISADOS",
    ordem: 3,
    blocos: [
      { tipo: "tabela", colunas: ["Documento", "Apresentado por", "Data", "Páginas", "Relevância", "Impacto"], linhas },
    ],
  };
}

/** Seção IV — Análise dos Pontos Questionados. Um ponto por item, com todos os campos da matriz de enfrentamento. */
function montarSecaoIV(
  pontos: PosLaudoPontosRow[],
  elementosPorPonto: Map<string, string>,
): SecaoCompilada {
  const blocos: BlocoConteudo[] = [];
  pontos.forEach((p, i) => {
    const repercussao = p.repercussao
      ? (REPERCUSSAO_PONTO_ROTULOS[p.repercussao as PosLaudoRepercussaoPonto] ?? p.repercussao)
      : "—";
    blocos.push(paragrafo(`${i + 1}. Quanto à alegação de ${p.tema?.trim() || "questionamento não temático"}`));
    blocos.push(paragrafo(`Questionamento apresentado: ${p.sintese_alegacao?.trim() || "—"}`));
    blocos.push(paragrafo(`Esclarecimento pericial: ${p.resposta_tecnica?.trim() || "—"}`));
    blocos.push(paragrafo(`Elementos considerados: ${elementosPorPonto.get(p.id) || "—"}`));
    blocos.push(paragrafo(`Repercussão sobre o laudo original: ${repercussao}`));
  });
  return {
    secaoId: "esclarecimentos-iv",
    codigo: "esclarecimentos_pontos",
    titulo: "IV — ANÁLISE DOS PONTOS QUESTIONADOS",
    ordem: 4,
    blocos,
  };
}

/**
 * Seção V — Respostas aos Quesitos Suplementares. Sempre `null` por ora: a
 * matriz de quesitos do ciclo (`pos_laudo_quesitos`) ainda não tem CRUD
 * (fatia 9) — condicional idêntica à do modelo ("aparece somente quando
 * existirem quesitos"), só que hoje nunca existem.
 */

/** Seção VI — Análise da Repercussão sobre o Laudo Original. Só chega aqui com `repercussao_laudo` preenchido e válido (ver pendências). */
function montarSecaoVI(repercussaoLaudo: PosLaudoRepercussaoLaudo): SecaoCompilada {
  return {
    secaoId: "esclarecimentos-vi",
    codigo: "esclarecimentos_repercussao",
    titulo: "VI — ANÁLISE DA REPERCUSSÃO SOBRE O LAUDO ORIGINAL",
    ordem: 6,
    blocos: [paragrafo(`Repercussão declarada: ${REPERCUSSAO_LAUDO_ROTULOS[repercussaoLaudo]}.`)],
  };
}

/** Seção VII — Conclusão dos Esclarecimentos. Texto automático por repercussão (modelo, seção VII); embute a Nova Conclusão Vigente quando ela existe. */
function montarSecaoVII(repercussaoLaudo: PosLaudoRepercussaoLaudo, conclusaoVigenteNova: string | null): SecaoCompilada {
  let texto: string;
  switch (repercussaoLaudo) {
    case "mantido_integralmente":
      texto =
        "Após a análise dos questionamentos apresentados e dos demais elementos submetidos à apreciação pericial, não foram identificados elementos técnicos novos capazes de modificar as conclusões constantes do Laudo Médico-Pericial anteriormente apresentado. Os esclarecimentos ora prestados complementam a fundamentação pericial nos pontos especificamente questionados, permanecendo integralmente mantidas as conclusões do laudo original.";
      break;
    case "complementado_sem_alterar":
      texto =
        "Os elementos analisados nesta oportunidade acrescentam informações relevantes à fundamentação técnico-pericial, sem, contudo, modificar a conclusão anteriormente estabelecida. Dessa forma, o presente documento passa a integrar o conjunto dos esclarecimentos periciais, permanecendo mantida a conclusão constante do laudo original.";
      break;
    case "retificacao_sem_repercussao":
      texto =
        "A análise dos questionamentos apresentados evidenciou a necessidade de retificação de erro material, sem, contudo, qualquer repercussão sobre a conclusão anteriormente estabelecida, que permanece integralmente mantida.";
      break;
    case "modificacao_parcial":
    case "revisao_substancial": {
      const intro =
        repercussaoLaudo === "modificacao_parcial"
          ? "A análise dos elementos supervenientes demonstrou a necessidade de revisão parcial das considerações anteriormente apresentadas."
          : "A análise dos elementos supervenientes demonstrou a necessidade de revisão substancial da conclusão pericial anteriormente apresentada.";
      texto = `${intro} Permanecem inalterados os demais fundamentos e conclusões do Laudo Médico-Pericial que não sejam incompatíveis com a presente complementação. Assim, a conclusão médico-pericial passa a ser compreendida nos seguintes termos:\n\n${conclusaoVigenteNova?.trim() ?? ""}`;
      break;
    }
    default:
      // Inalcançável: 'substituicao_conclusao' é barrada como pendência antes de chegar aqui
      // (é exclusiva da Complementação — ver compilarEsclarecimentos). TS exige o caso coberto.
      throw new Error(`Repercussão "${repercussaoLaudo}" não é válida para Esclarecimentos.`);
  }
  return {
    secaoId: "esclarecimentos-vii",
    codigo: "esclarecimentos_conclusao",
    titulo: "VII — CONCLUSÃO DOS ESCLARECIMENTOS",
    ordem: 7,
    blocos: [paragrafo(texto)],
  };
}

/**
 * Seção VIII — Encerramento. `paginasTexto` chega pronto (placeholder na 1ª
 * passada, número real na 2ª — ver actions.ts). `dataAssinaturaIso` é a data
 * do ato escolhida pela perita na tela de geração (não a data de hoje).
 */
function montarSecaoVIII(paginasTexto: string, dataAssinaturaIso: string): SecaoCompilada {
  const dataExtenso = formatarDataExtenso(dataAssinaturaIso);
  return {
    secaoId: "esclarecimentos-viii",
    codigo: "encerramento",
    titulo: "VIII — ENCERRAMENTO",
    ordem: 8,
    blocos: [
      paragrafo(
        `Nada mais havendo a esclarecer no presente momento, encerra-se o presente documento de Esclarecimentos Médico-Periciais, composto por ${paginasTexto} páginas, incluindo esta, todas devidamente numeradas. Permanecendo à disposição do Juízo para eventuais esclarecimentos adicionais que se mostrem necessários.`,
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

/** "YYYY-MM-DD" de hoje, no fuso do servidor — só serve de default pra chamada de leitura (preview de pendências), que nunca vira documento de verdade. */
function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

/**
 * Compila os Esclarecimentos de um ciclo. `paginasTexto` é o texto que entra
 * na frase de "composto por X páginas" do Encerramento — quem chama faz o
 * two-pass (1ª chamada com um placeholder, mede a paginação real, chama de
 * novo com o número): ver `gerarEsclarecimentos` em actions.ts. `dataAssinaturaIso`
 * é a data do ato (escolhida pela perita na tela de geração, não a de hoje) —
 * o default aqui só importa pra chamada de preview de pendências da página,
 * que nunca chega a gerar um documento.
 */
export async function compilarEsclarecimentos(
  processoId: string,
  cicloId: string,
  paginasTexto = "—",
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoEsclarecimentos> {
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
      mensagem: `Geração de Esclarecimentos só está disponível no fluxo judicial (este ciclo é ${FLUXO_ROTULOS[ciclo.fluxo] ?? ciclo.fluxo}).`,
    };
  }

  const { data: processo } = await supabase.from("processos").select("*").eq("id", processoId).single();
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };

  const { data: partesDb } = await supabase.from("processo_partes").select("*").eq("processo_id", processoId);
  const cabecalhoBase = montarCabecalhoFormal(processo, partesDb ?? []);
  if ("erro" in cabecalhoBase) return { status: "erro", mensagem: cabecalhoBase.erro };

  const [{ data: pontosDb }, { data: pldDb }, { data: config }] = await Promise.all([
    supabase.from("pos_laudo_pontos").select("*").eq("ciclo_id", cicloId).order("ordem"),
    supabase.from("pos_laudo_documentos").select("*").eq("ciclo_id", cicloId).order("created_at"),
    supabase.from("configuracoes").select("*").maybeSingle(),
  ]);
  const pontos = pontosDb ?? [];
  const pld = pldDb ?? [];

  const { data: laudoBase } = ciclo.laudo_base_id
    ? await supabase.from("laudos_gerados").select("protocolo_id, protocolado_em").eq("id", ciclo.laudo_base_id).maybeSingle()
    : { data: null };

  // Documentos: nome dos arquivos (documentos supervenientes do ciclo + evidências vinculadas aos pontos).
  const idsDocumentos = new Set(pld.map((p) => p.documento_id));
  const { data: evidenciasDb } =
    pontos.length > 0
      ? await supabase
          .from("pos_laudo_ponto_evidencias")
          .select("ponto_id, documento_id, observacao")
          .in(
            "ponto_id",
            pontos.map((p) => p.id),
          )
      : { data: [] };
  const evidencias = evidenciasDb ?? [];
  for (const e of evidencias) if (e.documento_id) idsDocumentos.add(e.documento_id);

  const { data: docsDb } =
    idsDocumentos.size > 0
      ? await supabase.from("documentos").select("id, nome_arquivo").in("id", Array.from(idsDocumentos))
      : { data: [] };
  const nomeDocPorId = new Map((docsDb ?? []).map((d) => [d.id, d.nome_arquivo]));

  // --- Pendências: uma lista só, cada item aponta pro lugar de resolver ---
  const pendencias: PendenciaGeracaoPosLaudo[] = [];
  if (pontos.length === 0) {
    pendencias.push({ id: "sem-pontos", label: "Nenhum ponto cadastrado na matriz de enfrentamento." });
  }
  pontos.forEach((p, i) => {
    if (!p.resposta_tecnica?.trim()) {
      pendencias.push({ id: `ponto-${p.id}-resposta`, label: `Ponto ${i + 1} — sem resposta técnica.`, href: `#ponto-${p.id}` });
    }
    if (!p.repercussao) {
      pendencias.push({ id: `ponto-${p.id}-repercussao`, label: `Ponto ${i + 1} — sem repercussão declarada.`, href: `#ponto-${p.id}` });
    }
  });
  if (!ciclo.repercussao_laudo) {
    pendencias.push({
      id: "repercussao-ciclo",
      label: "Repercussão sobre o laudo original (seção VI) não preenchida.",
      href: "#repercussao-ciclo",
    });
  } else if (ciclo.repercussao_laudo === "substituicao_conclusao") {
    pendencias.push({
      id: "repercussao-invalida",
      label:
        "A repercussão \"Substituição da conclusão anterior\" é exclusiva da Complementação do Laudo (ainda não implementada) — escolha outra repercussão para gerar Esclarecimentos.",
      href: "#repercussao-ciclo",
    });
  } else {
    const regra = podeGerarSaida(ciclo);
    if (!regra.ok) pendencias.push({ id: "conclusao-vigente-nova", label: regra.motivo, href: "#repercussao-ciclo" });
  }
  if (pendencias.length > 0) return { status: "pendencias", itens: pendencias };

  // A partir daqui, ciclo.repercussao_laudo está garantidamente preenchido e válido (checado acima).
  const repercussaoLaudo = ciclo.repercussao_laudo as PosLaudoRepercussaoLaudo;
  const conclusaoVigenteTexto =
    repercussaoLaudo === "modificacao_parcial" || repercussaoLaudo === "revisao_substancial"
      ? (ciclo.conclusao_vigente_nova?.trim() ?? null)
      : null;

  const elementosPorPonto = new Map<string, string>();
  for (const p of pontos) {
    const partes: string[] = [];
    if (p.referencia_laudo?.trim()) partes.push(`página/item ${p.referencia_laudo.trim()} do laudo original`);
    const nomesEvidencias = evidencias
      .filter((e) => e.ponto_id === p.id && e.documento_id)
      .map((e) => nomeDocPorId.get(e.documento_id as string))
      .filter((n): n is string => Boolean(n));
    if (nomesEvidencias.length > 0) partes.push(nomesEvidencias.join(", "));
    elementosPorPonto.set(p.id, partes.join("; "));
  }

  const cabecalho: CabecalhoFormal = {
    ...cabecalhoBase,
    tituloDocumento: TITULO_ESCLARECIMENTOS,
    paragrafoIntroducao: montarParagrafoIntroducao(laudoBase?.protocolo_id ?? null, ciclo.data_intimacao),
  };

  const documentosSuperveniente = pld.map((p) => ({
    nome_arquivo: nomeDocPorId.get(p.documento_id) ?? "(documento removido)",
    apresentante: p.apresentante,
    data_juntada: p.data_juntada,
    paginas: p.paginas,
    relevancia: p.relevancia,
    impacto: p.impacto,
  }));

  const secoes: SecaoCompilada[] = [
    montarSecaoI(ciclo, laudoBase?.protocolo_id ?? null, laudoBase?.protocolado_em ?? null),
    montarSecaoII(pld.length > 0),
    montarSecaoIII(documentosSuperveniente),
    montarSecaoIV(pontos, elementosPorPonto),
    // Seção V (quesitos suplementares do ciclo) — sempre ausente por ora, ver nota acima de montarSecaoVI.
    montarSecaoVI(repercussaoLaudo),
    montarSecaoVII(repercussaoLaudo, conclusaoVigenteTexto),
    montarSecaoVIII(paginasTexto, dataAssinaturaIso),
  ].filter((s): s is SecaoCompilada => s !== null);

  const modelo: ModeloLaudo = {
    processoId,
    tipoTrabalho: processo.tipo_trabalho,
    rodapeTexto: rodapeTexto(config ?? null, processo.tipo_trabalho),
    tipoLaudoCodigo: "",
    tipoLaudoNome: "",
    geradoEm: new Date().toISOString(),
    cabecalho,
    apresentacao: "", // sem seção "APRESENTAÇÃO" própria — o parágrafo de abertura vai no cabeçalho (paragrafoIntroducao)
    secoes,
    imagensPericia: [],
  };

  const snapshot: SnapshotPosLaudo = {
    tipo: "esclarecimentos",
    gerado_em: modelo.geradoEm,
    ciclo_id: cicloId,
    numero_ciclo: ciclo.numero_ciclo,
    fluxo: ciclo.fluxo,
    pontos: pontos.map(
      (p): SnapshotPosLaudoPonto => ({
        ordem: p.ordem,
        tema: p.tema,
        origem_ponto: p.origem_ponto,
        sintese_alegacao: p.sintese_alegacao,
        classificacao_triagem: p.classificacao_triagem,
        resposta_tecnica: p.resposta_tecnica,
        repercussao: p.repercussao,
      }),
    ),
    quesitos_ciclo: [],
    retificacao_itens: [],
    repercussao_ciclo: repercussaoLaudo,
    classificacao_global: ciclo.classificacao_global,
    conclusao_vigente_texto: conclusaoVigenteTexto,
  };

  return { status: "ok", modelo, snapshot };
}
