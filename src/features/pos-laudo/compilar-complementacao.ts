/**
 * Compila a Complementação ao Laudo Médico-Pericial de um ciclo de pós-laudo
 * — fatia 7. Mesmo padrão de `compilar-esclarecimentos.ts` /
 * `compilar-retificacao.ts` (busca no banco, monta um `ModeloLaudo` real
 * reusando os renderers, devolve status ok/erro/pendências).
 *
 * Baseado em `MODELO_COMPLEMENTACAO_AO_LAUDO_MEDICO_PERICIAL.pdf` (seções
 * I–XI). É a saída mais completa das três judiciais e a ÚNICA que:
 *   - aceita `repercussao_laudo = 'substituicao_conclusao'` (barrado nos
 *     Esclarecimentos);
 *   - recebe os itens onde-se-lê/leia-se quando a Retificação deu SIM — eles
 *     entram como sub-bloco read-only na seção VI (a promessa da mensagem
 *     calma do caminho SIM se concretizando).
 *
 * Seções condicionais: III (só com documento superveniente), IV (só com
 * `avaliacao_realizada`), V (só com `exames_realizados`), VIII (quesitos do
 * ciclo — sem CRUD ainda, fatia 9, sempre ausente).
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoFormal, type CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotPosLaudo, SnapshotPosLaudoRetificacaoItem } from "@/types/json-fields";
import type { PosLaudoComplementacaoRow, PosLaudoRetificacaoItensRow } from "@/types/database";
import { podeGerarSaida, type PendenciaGeracaoPosLaudo } from "./regras";
import {
  COMPLEMENTACAO_IMPACTO_ROTULOS,
  COMPLEMENTACAO_MOTIVO_ROTULOS,
  ELEMENTO_CENTRAL_ORDENADA,
  ELEMENTO_CENTRAL_ROTULOS,
  ELEMENTO_CENTRAL_SITUACAO_ROTULOS,
  FLUXO_ROTULOS,
  ORIGEM_ROTULOS,
  REPERCUSSAO_LAUDO_ROTULOS,
} from "./rotulos";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import type {
  PosLaudoComplementacaoImpacto,
  PosLaudoComplementacaoMotivo,
  PosLaudoElementoCentralSituacao,
  PosLaudoOrigem,
  PosLaudoRepercussaoLaudo,
} from "@/types/enums";

export type { PendenciaGeracaoPosLaudo };

export type ResultadoComplementacao =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotPosLaudo }
  | { status: "erro"; mensagem: string }
  | { status: "pendencias"; itens: PendenciaGeracaoPosLaudo[] };

const TITULO_COMPLEMENTACAO = "COMPLEMENTAÇÃO AO LAUDO MÉDICO-PERICIAL";

function formatarDataPura(data: string | null): string {
  const m = data?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}
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
function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}
function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
}

function montarParagrafoIntroducao(protocoloLaudoOriginal: string | null, dataIntimacao: string | null): string {
  const nome = VALORES_PADRAO_PERITO.nome_perito;
  const crm = VALORES_PADRAO_PERITO.crm_uf;
  let frase = `Dra. ${nome}, médica, CRM/${crm}, perita nomeada por este Juízo, vem, respeitosamente`;
  if (dataIntimacao) frase += `, em atenção à intimação/determinação de ${formatarDataPura(dataIntimacao)}`;
  frase += `, apresentar a presente ${TITULO_COMPLEMENTACAO}`;
  frase += protocoloLaudoOriginal
    ? `, referente ao Laudo Médico-Pericial anteriormente apresentado sob protocolo nº ${protocoloLaudoOriginal}, nos termos que seguem.`
    : ", referente ao Laudo Médico-Pericial anteriormente apresentado nos autos, nos termos que seguem.";
  return frase;
}

/** Seção I — Identificação da Complementação. Reusa dados do Registro da Demanda (ciclo) e do laudo-base. */
function montarSecaoI(input: {
  protocoloLaudoOriginal: string | null;
  dataProtocoloLaudoOriginal: string | null;
  idDocumentoOrigem: string | null;
  dataIntimacao: string | null;
  origem: PosLaudoOrigem | null;
  versaoDocumento: number | null;
}): SecaoCompilada {
  const blocos: BlocoConteudo[] = [
    paragrafo(`Laudo pericial original: ${input.protocoloLaudoOriginal ?? "—"}`),
    paragrafo(
      `Data do protocolo do laudo original: ${input.dataProtocoloLaudoOriginal ? formatarTimestamp(input.dataProtocoloLaudoOriginal) : "—"}`,
    ),
  ];
  if (input.idDocumentoOrigem) {
    blocos.push(paragrafo(`Documento/intimação que originou a complementação: ${input.idDocumentoOrigem}`));
  }
  blocos.push(paragrafo(`Data da intimação do perito: ${formatarDataPura(input.dataIntimacao)}`));
  blocos.push(paragrafo(`Origem: ${input.origem ? (ORIGEM_ROTULOS[input.origem] ?? input.origem) : "—"}`));
  blocos.push(paragrafo(`Versão do documento: ${input.versaoDocumento ? `V${input.versaoDocumento}` : "—"}`));
  blocos.push(
    paragrafo(
      "A presente complementação destina-se à análise dos elementos supervenientes e/ou à realização das diligências determinadas nos autos, com a finalidade de complementar a avaliação médico-pericial anteriormente realizada, nos limites do objeto pericial definido pelo Juízo.",
    ),
  );
  return { secaoId: "complementacao-i", codigo: "complementacao_identificacao", titulo: "I — IDENTIFICAÇÃO DA COMPLEMENTAÇÃO", ordem: 1, blocos };
}

/** Seção II — Motivo e Delimitação. */
function montarSecaoII(motivos: string[], motivoDescricao: string | null): SecaoCompilada {
  const rotulos = motivos
    .map((m) => COMPLEMENTACAO_MOTIVO_ROTULOS[m as PosLaudoComplementacaoMotivo] ?? m)
    .join("; ");
  return {
    secaoId: "complementacao-ii",
    codigo: "complementacao_motivo",
    titulo: "II — MOTIVO E DELIMITAÇÃO DA COMPLEMENTAÇÃO",
    ordem: 2,
    blocos: [
      paragrafo(`Motivo da complementação: ${rotulos || "—"}.`),
      paragrafo(`Descrição do motivo: ${motivoDescricao?.trim() || "—"}`),
      paragrafo(
        "A presente complementação possui natureza vinculada ao Laudo Médico-Pericial original e não implica, por si só, invalidação ou substituição integral do trabalho anteriormente realizado. Permanecem válidos os elementos do laudo original que não sejam expressamente complementados, retificados ou revistos neste documento.",
      ),
    ],
  };
}

/** Seção III — Novos Documentos e Elementos Considerados. `null` = sem documento superveniente no ciclo. */
function montarSecaoIII(
  documentos: { nome_arquivo: string; apresentante: string | null; data_juntada: string | null; paginas: string | null; relevancia: string | null }[],
  impacto: PosLaudoComplementacaoImpacto | null,
  impactoFundamentacao: string | null,
): SecaoCompilada | null {
  if (documentos.length === 0) return null;
  const linhas = documentos.map((d) => [
    d.nome_arquivo,
    d.apresentante ?? "—",
    formatarDataPura(d.data_juntada),
    d.paginas ?? "—",
    d.relevancia ?? "—",
  ]);
  const blocos: BlocoConteudo[] = [
    { tipo: "tabela", colunas: ["Documento/Elemento", "Origem", "Data", "Páginas", "Relevância"], linhas },
    paragrafo(
      `Classificação do impacto dos elementos supervenientes: ${impacto ? COMPLEMENTACAO_IMPACTO_ROTULOS[impacto] : "—"}.`,
    ),
    paragrafo(`Fundamentação: ${impactoFundamentacao?.trim() || "—"}`),
    paragrafo(
      "Todo documento juntado após o Laudo original permanece identificado como elemento superveniente e não é incorporado retroativamente ao acervo documental original.",
    ),
  ];
  return { secaoId: "complementacao-iii", codigo: "complementacao_supervenientes", titulo: "III — NOVOS DOCUMENTOS E ELEMENTOS CONSIDERADOS", ordem: 3, blocos };
}

/** Seção IV — Nova Avaliação Médico-Pericial. `null` = toggle desligado. */
function montarSecaoIV(c: PosLaudoComplementacaoRow): SecaoCompilada | null {
  if (!c.avaliacao_realizada) return null;
  return {
    secaoId: "complementacao-iv",
    codigo: "complementacao_nova_avaliacao",
    titulo: "IV — NOVA AVALIAÇÃO MÉDICO-PERICIAL",
    ordem: 4,
    blocos: [
      paragrafo(`Data: ${formatarDataPura(c.avaliacao_data)}`),
      paragrafo(`Horário: ${c.avaliacao_horario?.trim() || "—"}`),
      paragrafo(`Local/modalidade: ${c.avaliacao_local?.trim() || "—"}`),
      paragrafo(`Presentes: ${c.avaliacao_presentes?.trim() || "—"}`),
      paragrafo(`Assistentes técnicos: ${c.avaliacao_assistentes?.trim() || "—"}`),
      paragrafo(`Documentos apresentados no ato: ${c.avaliacao_documentos_ato?.trim() || "—"}`),
      paragrafo(`Achados complementares: ${c.avaliacao_achados?.trim() || "—"}`),
      paragrafo(`Comparação com a avaliação original: ${c.avaliacao_comparacao?.trim() || "—"}`),
    ],
  };
}

/** Seção V — Exames Complementares / Avaliação Especializada. `null` = toggle desligado. */
function montarSecaoV(c: PosLaudoComplementacaoRow): SecaoCompilada | null {
  if (!c.exames_realizados) return null;
  return {
    secaoId: "complementacao-v",
    codigo: "complementacao_exames",
    titulo: "V — EXAMES COMPLEMENTARES / AVALIAÇÃO ESPECIALIZADA",
    ordem: 5,
    blocos: [
      paragrafo(`Exame/avaliação: ${c.exame_descricao?.trim() || "—"}`),
      paragrafo(`Data: ${formatarDataPura(c.exame_data)}`),
      paragrafo(`Profissional/serviço: ${c.exame_profissional?.trim() || "—"}`),
      paragrafo(`Resultado relevante: ${c.exame_resultado?.trim() || "—"}`),
      paragrafo(`Repercussão médico-pericial: ${c.exame_repercussao?.trim() || "—"}`),
    ],
  };
}

/**
 * Seção VI — Análise Técnico-Pericial Complementar. Quando o ciclo tem itens
 * de Retificação (chegou aqui pelo caminho SIM), eles entram como sub-bloco
 * read-only "onde se lê / leia-se" ANTES do texto livre — a correção exata
 * não se perde no documento protocolado, e a perita escreve a análise em cima.
 */
function montarSecaoVI(c: PosLaudoComplementacaoRow, retificacaoItens: PosLaudoRetificacaoItensRow[]): SecaoCompilada {
  const blocos: BlocoConteudo[] = [];
  if (retificacaoItens.length > 0) {
    blocos.push(
      paragrafo(
        "Correções de erro material identificadas no ciclo, cuja verificação revelou repercussão sobre a fundamentação e/ou a conclusão (integram esta complementação):",
      ),
    );
    blocos.push({
      tipo: "tabela",
      colunas: ["Página", "Item/Seção", "Onde se lê", "Leia-se"],
      linhas: retificacaoItens.map((i) => [i.pagina?.trim() || "—", i.item_secao?.trim() || "—", i.onde_se_le, i.leia_se]),
    });
  }
  blocos.push(paragrafo(`Elementos do laudo original mantidos: ${c.vi_mantidos?.trim() || "—"}`));
  blocos.push(paragrafo(`Elementos que necessitam complementação: ${c.vi_necessitam?.trim() || "—"}`));
  blocos.push(paragrafo(`Elementos revistos ou modificados: ${c.vi_revistos?.trim() || "—"}`));
  blocos.push(paragrafo(`Fundamentação médico-pericial complementar: ${c.vi_fundamentacao?.trim() || "—"}`));
  return { secaoId: "complementacao-vi", codigo: "complementacao_analise", titulo: "VI — ANÁLISE TÉCNICO-PERICIAL COMPLEMENTAR", ordem: 6, blocos };
}

/** Seção VII — Repercussão sobre os Elementos Centrais da Perícia. Só entra elemento avaliado (situação ou fundamentação preenchida). */
function montarSecaoVII(c: PosLaudoComplementacaoRow): SecaoCompilada | null {
  const linhas: string[][] = [];
  for (const chave of ELEMENTO_CENTRAL_ORDENADA) {
    const e = c.vii_elementos[chave];
    if (!e || (!e.situacao && !e.fundamentacao?.trim())) continue;
    const situacao = e.situacao
      ? ELEMENTO_CENTRAL_SITUACAO_ROTULOS[e.situacao as PosLaudoElementoCentralSituacao]
      : "—";
    const fund = e.fundamentacao?.trim() ? ` — ${e.fundamentacao.trim()}` : "";
    linhas.push([ELEMENTO_CENTRAL_ROTULOS[chave], `${situacao}${fund}`]);
  }
  const outros = c.vii_elementos.outros?.trim();
  if (outros) linhas.push(["Outros pontos do objeto pericial", outros]);
  if (linhas.length === 0) return null;
  return {
    secaoId: "complementacao-vii",
    codigo: "complementacao_repercussao_elementos",
    titulo: "VII — REPERCUSSÃO SOBRE OS ELEMENTOS CENTRAIS DA PERÍCIA",
    ordem: 7,
    blocos: [{ tipo: "tabela", colunas: ["Elemento", "Repercussão"], linhas }],
  };
}

/** Seção IX — Repercussão sobre o Laudo Médico-Pericial Original (obrigatória). Reusa `repercussao_laudo` do ciclo. */
function montarSecaoIX(repercussaoLaudo: PosLaudoRepercussaoLaudo): SecaoCompilada {
  return {
    secaoId: "complementacao-ix",
    codigo: "complementacao_repercussao_laudo",
    titulo: "IX — REPERCUSSÃO SOBRE O LAUDO MÉDICO-PERICIAL ORIGINAL",
    ordem: 9,
    blocos: [paragrafo(`Repercussão declarada: ${REPERCUSSAO_LAUDO_ROTULOS[repercussaoLaudo]}.`)],
  };
}

/** Seção X — Conclusão Médico-Pericial Complementar. Texto-base por repercussão; embute a Nova Conclusão Vigente quando há. */
function montarSecaoX(repercussaoLaudo: PosLaudoRepercussaoLaudo, conclusaoVigenteNova: string | null): SecaoCompilada {
  let texto: string;
  switch (repercussaoLaudo) {
    case "mantido_integralmente":
    case "complementado_sem_alterar":
    case "retificacao_sem_repercussao":
      texto =
        "Após a análise dos elementos supervenientes e/ou das diligências realizadas, verifica-se que as novas informações complementam a fundamentação médico-pericial anteriormente apresentada, sem produzir modificação das conclusões constantes do Laudo Médico-Pericial original. Dessa forma, permanecem mantidas as conclusões anteriormente estabelecidas, passando a presente complementação a integrar o conjunto da prova pericial.";
      break;
    case "modificacao_parcial":
    case "revisao_substancial":
      texto = `A análise dos novos elementos demonstrou a necessidade de revisão parcial do Laudo Médico-Pericial. Permanecem válidos os demais elementos do laudo original que não sejam incompatíveis com a presente complementação. A conclusão médico-pericial vigente passa a ser compreendida nos seguintes termos:\n\n${conclusaoVigenteNova?.trim() ?? ""}`;
      break;
    case "substituicao_conclusao":
      texto = `Os elementos supervenientes analisados nesta complementação apresentam relevância técnico-pericial suficiente para modificar a conclusão anteriormente estabelecida. Em razão disso, para os aspectos expressamente abordados neste documento, a conclusão constante do Laudo Médico-Pericial original fica substituída pela seguinte conclusão vigente:\n\n${conclusaoVigenteNova?.trim() ?? ""}`;
      break;
  }
  return {
    secaoId: "complementacao-x",
    codigo: "complementacao_conclusao",
    titulo: "X — CONCLUSÃO MÉDICO-PERICIAL COMPLEMENTAR",
    ordem: 10,
    blocos: [paragrafo(texto)],
  };
}

/** Seção XI — Encerramento. */
function montarSecaoXI(paginasTexto: string, dataAssinaturaIso: string): SecaoCompilada {
  return {
    secaoId: "complementacao-xi",
    codigo: "encerramento",
    titulo: "XI — ENCERRAMENTO",
    ordem: 11,
    blocos: [
      paragrafo(
        `Nada mais havendo a complementar no presente momento, encerra-se a presente Complementação ao Laudo Médico-Pericial, composta por ${paginasTexto} páginas, incluindo esta, todas devidamente numeradas. O presente documento deverá ser interpretado em conjunto com o Laudo Médico-Pericial original e com os demais esclarecimentos ou complementações eventualmente apresentados nos autos, observada a conclusão médico-pericial vigente indicada nesta versão.`,
      ),
      {
        tipo: "assinatura",
        cidadeData: `${VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${formatarDataExtenso(dataAssinaturaIso)}.`,
        nome: `Dra. ${VALORES_PADRAO_PERITO.nome_perito}`,
        tituloCrm: `Médica Perita Judicial, CRM ${VALORES_PADRAO_PERITO.crm_uf}.`,
      },
    ],
  };
}

/**
 * Compila a Complementação de um ciclo. `paginasTexto`/`dataAssinaturaIso`:
 * ver `compilarEsclarecimentos` — mesmo contrato de two-pass e de data do ato.
 */
export async function compilarComplementacao(
  processoId: string,
  cicloId: string,
  paginasTexto = "—",
  dataAssinaturaIso: string = hojeIso(),
  versaoDocumento: number | null = null,
): Promise<ResultadoComplementacao> {
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
      mensagem: `Geração de Complementação só está disponível no fluxo judicial (este ciclo é ${FLUXO_ROTULOS[ciclo.fluxo] ?? ciclo.fluxo}).`,
    };
  }

  const { data: processo } = await supabase.from("processos").select("*").eq("id", processoId).single();
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };

  const { data: partesDb } = await supabase.from("processo_partes").select("*").eq("processo_id", processoId);
  const cabecalhoBase = montarCabecalhoFormal(processo, partesDb ?? []);
  if ("erro" in cabecalhoBase) return { status: "erro", mensagem: cabecalhoBase.erro };

  const [{ data: complementacaoDb }, { data: pldDb }, { data: itensRetDb }, { data: config }] = await Promise.all([
    supabase.from("pos_laudo_complementacao").select("*").eq("ciclo_id", cicloId).maybeSingle(),
    supabase.from("pos_laudo_documentos").select("*").eq("ciclo_id", cicloId).order("created_at"),
    supabase.from("pos_laudo_retificacao_itens").select("*").eq("ciclo_id", cicloId).order("ordem"),
    supabase.from("configuracoes").select("*").maybeSingle(),
  ]);
  const c = complementacaoDb;
  const pld = pldDb ?? [];
  const itensRetificacao = itensRetDb ?? [];

  const { data: laudoBase } = ciclo.laudo_base_id
    ? await supabase.from("laudos_gerados").select("protocolo_id, protocolado_em").eq("id", ciclo.laudo_base_id).maybeSingle()
    : { data: null };

  const { data: docsDb } =
    pld.length > 0
      ? await supabase.from("documentos").select("id, nome_arquivo").in("id", pld.map((p) => p.documento_id))
      : { data: [] };
  const nomeDocPorId = new Map((docsDb ?? []).map((d) => [d.id, d.nome_arquivo]));

  // --- Pendências ---
  const pendencias: PendenciaGeracaoPosLaudo[] = [];
  if (!ciclo.repercussao_laudo) {
    pendencias.push({
      id: "repercussao-ciclo",
      label: "Repercussão sobre o laudo original (seção IX) não preenchida.",
      href: "#repercussao-ciclo",
    });
  } else {
    const regra = podeGerarSaida(ciclo);
    if (!regra.ok) pendencias.push({ id: "conclusao-vigente-nova", label: regra.motivo, href: "#repercussao-ciclo" });
  }
  if (!c?.vi_fundamentacao?.trim()) {
    pendencias.push({
      id: "vi-fundamentacao",
      label: "Fundamentação médico-pericial complementar (seção VI) não preenchida.",
      href: "#complementacao-vi",
    });
  }
  if (c?.avaliacao_realizada && !c.avaliacao_data) {
    pendencias.push({
      id: "iv-sem-data",
      label: "Seção IV (nova avaliação) está ligada, mas sem data.",
      href: "#complementacao-iv",
    });
  }
  if (c?.exames_realizados && !c.exame_descricao?.trim()) {
    pendencias.push({
      id: "v-sem-descricao",
      label: "Seção V (exames/avaliação especializada) está ligada, mas sem descrição.",
      href: "#complementacao-v",
    });
  }
  if (pendencias.length > 0) return { status: "pendencias", itens: pendencias };

  const repercussaoLaudo = ciclo.repercussao_laudo as PosLaudoRepercussaoLaudo;
  const exigeNovaConclusao =
    repercussaoLaudo === "modificacao_parcial" ||
    repercussaoLaudo === "revisao_substancial" ||
    repercussaoLaudo === "substituicao_conclusao";
  const conclusaoVigenteTexto = exigeNovaConclusao ? (ciclo.conclusao_vigente_nova?.trim() ?? null) : null;

  // c é garantidamente não-nulo aqui (vi_fundamentacao preenchida => linha existe).
  const comp = c as PosLaudoComplementacaoRow;

  const documentosSuperveniente = pld.map((p) => ({
    nome_arquivo: nomeDocPorId.get(p.documento_id) ?? "(documento removido)",
    apresentante: p.apresentante,
    data_juntada: p.data_juntada,
    paginas: p.paginas,
    relevancia: p.relevancia,
  }));

  const cabecalho: CabecalhoFormal = {
    ...cabecalhoBase,
    tituloDocumento: TITULO_COMPLEMENTACAO,
    paragrafoIntroducao: montarParagrafoIntroducao(laudoBase?.protocolo_id ?? null, ciclo.data_intimacao),
  };

  const secoes: SecaoCompilada[] = [
    montarSecaoI({
      protocoloLaudoOriginal: laudoBase?.protocolo_id ?? null,
      dataProtocoloLaudoOriginal: laudoBase?.protocolado_em ?? null,
      idDocumentoOrigem: comp.id_documento_origem,
      dataIntimacao: ciclo.data_intimacao,
      origem: ciclo.origem,
      versaoDocumento,
    }),
    montarSecaoII(comp.motivos, comp.motivo_descricao),
    montarSecaoIII(documentosSuperveniente, comp.impacto_elementos, comp.impacto_fundamentacao),
    montarSecaoIV(comp),
    montarSecaoV(comp),
    montarSecaoVI(comp, itensRetificacao),
    montarSecaoVII(comp),
    // Seção VIII (quesitos do ciclo) — sempre ausente por ora (fatia 9).
    montarSecaoIX(repercussaoLaudo),
    montarSecaoX(repercussaoLaudo, conclusaoVigenteTexto),
    montarSecaoXI(paginasTexto, dataAssinaturaIso),
  ].filter((s): s is SecaoCompilada => s !== null);

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
    tipo: "complementacao",
    gerado_em: modelo.geradoEm,
    ciclo_id: cicloId,
    numero_ciclo: ciclo.numero_ciclo,
    fluxo: ciclo.fluxo,
    pontos: [],
    quesitos_ciclo: [],
    retificacao_itens: itensRetificacao.map(
      (i): SnapshotPosLaudoRetificacaoItem => ({
        ordem: i.ordem,
        pagina: i.pagina,
        item_secao: i.item_secao,
        onde_se_le: i.onde_se_le,
        leia_se: i.leia_se,
      }),
    ),
    repercussao_ciclo: repercussaoLaudo,
    classificacao_global: ciclo.classificacao_global,
    conclusao_vigente_texto: conclusaoVigenteTexto,
  };

  return { status: "ok", modelo, snapshot };
}
