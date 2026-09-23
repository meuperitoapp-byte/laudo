/**
 * Compila a Análise de Viabilidade Técnico-Pericial num `ModeloLaudo` (§38,
 * §44) — mesmo padrão já usado pelos compiladores de Pós-Laudo AT
 * (`compilar-parecer-at.ts` etc.): busca no banco, monta o modelo, reaproveita
 * `renderizarPdf`/`renderizarDocx` sem duplicar motor nenhum. A Análise de
 * Viabilidade NÃO usa o modelo de seções/campos do laudo comum (`secoes`/
 * `campos_secao`/`respostas_processo`) — tem 18 tabelas próprias — então este
 * compilador monta as 11 seções do §44 diretamente a partir delas.
 *
 * Blindagem do §43 (campos internos que nunca podem vazar pro PDF): garantida
 * por ASSINATURA DE TIPOS, não por convenção —
 * (1) `CamposExternosAnalise` é o tipo de `AnalisesViabilidadeRow` SEM os 6
 *     campos `risco_*` e `raciocinio_pericial_interno`; toda função de seção
 *     recebe só esse tipo, então referenciar um campo interno é erro de
 *     compilação, não checklist manual;
 * (2) `caso_tese_adversa` nunca é buscada aqui — a tabela inteira não entra
 *     nem como dado bruto, muito menos como bloco do documento.
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoAssistenciaTecnica } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotAnaliseViabilidade } from "@/types/json-fields";
import type {
  AnalisesViabilidadeRow,
  CasoCondutasAnalisadasRow,
  CasoDanoRow,
  CasoDocumentosAvaliadosRow,
  CasoFatosComprovadosRow,
  CasoFragilidadesRow,
  CasoIncapacidadeRow,
  CasoLinhaTempoMedicaRow,
  CasoNexoCausalRow,
  CasoOportunidadesProbatoriasRow,
  CasoPontosFavoraveisRow,
  CasoPontosTecnicosRow,
  CasoQuestoesTecnicasRow,
  CasoCausasAlternativasRow,
  DocumentosRow,
} from "@/types/database";
import {
  FINALIDADE_OPCOES,
  SUFICIENCIA_DOCUMENTAL_ROTULOS,
  RELEVANCIA_DOCUMENTO_ROTULOS,
  LIMITACOES_DOCUMENTAIS_OPCOES,
  IMPACTO_LIMITACAO_ROTULOS,
  CATEGORIA_LINHA_TEMPO_ROTULOS,
  CLASSIFICACAO_FATO_ROTULOS,
  AVALIACAO_CONDUTA_ROTULOS,
  GRAU_SEGURANCA_ROTULOS,
  OPORTUNIDADE_DIAGNOSTICA_ROTULOS,
  HOUVE_ATRASO_ROTULOS,
  CONCLUSAO_NEXO_ROTULOS,
  DANO_EXISTE_ROTULOS,
  DANO_TEMPORARIO_PERMANENTE_ROTULOS,
  PARCIAL_TOTAL_ROTULOS,
  INCAPACIDADE_TEMPORARIA_PERMANENTE_ROTULOS,
  PLAUSIBILIDADE_ROTULOS,
  FORCA_PROBATORIA_ROTULOS,
  IMPACTO_FRAGILIDADE_ROTULOS,
  TIPO_PROVA_ROTULOS,
  CONCLUSAO_ROTULOS,
} from "./catalogos";

const TITULO_ANALISE_VIABILIDADE = "ANÁLISE DE VIABILIDADE TÉCNICO-PERICIAL";

type ResultadoCompilacaoViabilidade =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotAnaliseViabilidade }
  | { status: "erro"; mensagem: string };

/** `AnalisesViabilidadeRow` SEM os campos internos (§43) — ver comentário do arquivo. */
type CamposExternosAnalise = Omit<
  AnalisesViabilidadeRow,
  | "risco_principal_tecnico"
  | "risco_fato_desfavoravel"
  | "risco_documento_prejudicial"
  | "risco_pergunta_dificil"
  | "risco_grau"
  | "risco_fundamentacao"
  | "raciocinio_pericial_interno"
>;

/** Descarta os campos internos — nunca um cast, uma cópia de verdade sem essas chaves. */
function externalizarAnalise(analise: AnalisesViabilidadeRow): CamposExternosAnalise {
  /* eslint-disable @typescript-eslint/no-unused-vars -- descartados de propósito, ver comentário acima */
  const {
    risco_principal_tecnico,
    risco_fato_desfavoravel,
    risco_documento_prejudicial,
    risco_pergunta_dificil,
    risco_grau,
    risco_fundamentacao,
    raciocinio_pericial_interno,
    ...externos
  } = analise;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return externos;
}

function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
}
function tabela(colunas: string[], linhas: string[][]): BlocoConteudo {
  return { tipo: "tabela", colunas, linhas };
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY", sem passar por Date (mesmo cuidado de fuso dos demais compiladores). */
function dataCurta(data: string | null): string {
  const m = data?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

function montarSecaoI(analise: CamposExternosAnalise): SecaoCompilada {
  const blocos: BlocoConteudo[] = [];
  if (analise.posicao_cliente_litigio) blocos.push(paragrafo(`Posição do cliente no potencial litígio: ${analise.posicao_cliente_litigio}`));
  if (analise.especialidade) blocos.push(paragrafo(`Área/especialidade: ${analise.especialidade}`));
  if (analise.materia && analise.materia.length > 0) blocos.push(paragrafo(`Matéria: ${analise.materia.join(", ")}`));
  const finalidades = (analise.finalidade ?? [])
    .map((f) => FINALIDADE_OPCOES.find((o) => o.valor === f)?.rotulo ?? f)
    .join("; ");
  if (finalidades) blocos.push(paragrafo(`Finalidade da análise: ${finalidades}`));
  if (analise.pergunta_central_advogado) blocos.push(paragrafo(`Pergunta central do advogado: ${analise.pergunta_central_advogado}`));
  return { secaoId: "av-i", codigo: "av_identificacao_finalidade", titulo: "I — IDENTIFICAÇÃO E FINALIDADE", ordem: 1, blocos };
}

function montarSecaoII(analise: CamposExternosAnalise, questoes: CasoQuestoesTecnicasRow[]): SecaoCompilada | null {
  const blocos: BlocoConteudo[] = [];
  if (analise.objeto_analise) blocos.push(paragrafo(analise.objeto_analise));
  const questoesComPergunta = questoes.filter((q) => q.questao?.trim());
  if (questoesComPergunta.length > 0) {
    blocos.push(
      tabela(
        ["Nº", "Questão", "Tema", "Resposta preliminar"],
        questoesComPergunta.map((q) => [String(q.numero ?? "—"), q.questao, q.tema ?? "—", q.resposta_preliminar ?? "—"]),
      ),
    );
  }
  if (blocos.length === 0) return null;
  return { secaoId: "av-ii", codigo: "av_objeto", titulo: "II — OBJETO DA ANÁLISE", ordem: 2, blocos };
}

function montarSecaoIII(
  analise: CamposExternosAnalise,
  avaliacoes: CasoDocumentosAvaliadosRow[],
  documentoPorId: Map<string, DocumentosRow>,
): SecaoCompilada | null {
  const blocos: BlocoConteudo[] = [];
  if (analise.suficiencia_documental) {
    blocos.push(paragrafo(`Suficiência documental: ${SUFICIENCIA_DOCUMENTAL_ROTULOS[analise.suficiencia_documental]}`));
  }
  const relevantes = avaliacoes.filter((a) => a.utilizado);
  if (relevantes.length > 0) {
    blocos.push(
      tabela(
        ["Documento", "Relevância", "Observação técnica"],
        relevantes.map((a) => {
          const doc = documentoPorId.get(a.documento_id);
          return [doc?.nome_arquivo ?? "—", a.relevancia ? RELEVANCIA_DOCUMENTO_ROTULOS[a.relevancia] : "—", a.observacao_tecnica ?? "—"];
        }),
      ),
    );
  }
  const limitacoes = (analise.limitacoes_documentais ?? [])
    .map((l) => LIMITACOES_DOCUMENTAIS_OPCOES.find((o) => o.valor === l)?.rotulo ?? l)
    .join("; ");
  if (limitacoes) {
    blocos.push(paragrafo(`Limitações documentais: ${limitacoes}`));
    if (analise.limitacoes_impacto) blocos.push(paragrafo(`Impacto das limitações: ${IMPACTO_LIMITACAO_ROTULOS[analise.limitacoes_impacto]}`));
    if (analise.limitacoes_justificativa) blocos.push(paragrafo(`Justificativa: ${analise.limitacoes_justificativa}`));
  }
  if (blocos.length === 0) return null;
  return { secaoId: "av-iii", codigo: "av_acervo_documental", titulo: "III — DELIMITAÇÃO DO ACERVO DOCUMENTAL", ordem: 3, blocos };
}

function montarSecaoIV(fatos: CasoFatosComprovadosRow[]): SecaoCompilada | null {
  // Só fatos VALIDADOS migram pro PDF (§12 — regra registrada na própria
  // coluna, ver database.ts) — conteúdo nunca revisado por ela não entra
  // sozinho.
  const validados = fatos.filter((f) => f.validado_em);
  if (validados.length === 0) return null;
  return {
    secaoId: "av-iv",
    codigo: "av_sintese_fatos",
    titulo: "IV — SÍNTESE MÉDICO-PERICIAL DOS FATOS",
    ordem: 4,
    blocos: [
      tabela(
        ["Fato", "Data", "Classificação", "Relevância"],
        validados.map((f) => [f.fato, dataCurta(f.data), CLASSIFICACAO_FATO_ROTULOS[f.classificacao], f.relevancia ?? "—"]),
      ),
    ],
  };
}

function montarSecaoV(linhaTempo: CasoLinhaTempoMedicaRow[]): SecaoCompilada | null {
  if (linhaTempo.length === 0) return null;
  const ordenada = [...linhaTempo].sort((a, b) => a.data.localeCompare(b.data));
  return {
    secaoId: "av-v",
    codigo: "av_cronologia",
    titulo: "V — CRONOLOGIA RELEVANTE",
    ordem: 5,
    blocos: [
      tabela(
        ["Data", "Categoria", "Evento", "Marco crítico"],
        ordenada.map((e) => [dataCurta(e.data), e.categoria ? CATEGORIA_LINHA_TEMPO_ROTULOS[e.categoria] : "—", e.evento, e.marco_critico ? "Sim" : "Não"]),
      ),
    ],
  };
}

function montarSecaoVI(
  analise: CamposExternosAnalise,
  pontosTecnicos: CasoPontosTecnicosRow[],
  condutas: CasoCondutasAnalisadasRow[],
  causasAlternativas: CasoCausasAlternativasRow[],
): SecaoCompilada | null {
  const blocos: BlocoConteudo[] = [];

  if (pontosTecnicos.length > 0) {
    blocos.push(paragrafo("Pontos técnicos relevantes / possíveis controvérsias:"));
    blocos.push(
      tabela(
        ["Ponto técnico", "Evidência documental", "Possível controvérsia", "Avaliação técnica"],
        pontosTecnicos.map((p) => [p.ponto_tecnico, p.evidencia_documental ?? "—", p.possivel_controversia ?? "—", p.avaliacao_tecnica ?? "—"]),
      ),
    );
  }

  if (condutas.length > 0) {
    blocos.push(paragrafo("Análise das condutas:"));
    blocos.push(
      tabela(
        ["Profissional/instituição", "Conduta questionada", "Conduta esperada", "Avaliação", "Segurança"],
        condutas.map((c) => [
          c.profissional_instituicao,
          c.conduta_questionada ?? "—",
          c.conduta_esperada ?? "—",
          c.avaliacao ? AVALIACAO_CONDUTA_ROTULOS[c.avaliacao] : "—",
          c.seguranca ? GRAU_SEGURANCA_ROTULOS[c.seguranca] : "—",
        ]),
      ),
    );
  }

  if (analise.oportunidade_diagnostica && analise.oportunidade_diagnostica !== "nao_aplicavel") {
    blocos.push(paragrafo(`Oportunidade diagnóstica/terapêutica: ${OPORTUNIDADE_DIAGNOSTICA_ROTULOS[analise.oportunidade_diagnostica]}`));
    if (analise.oportunidade_momento) blocos.push(paragrafo(`Momento: ${analise.oportunidade_momento}`));
    if (analise.oportunidade_houve_atraso) blocos.push(paragrafo(`Houve atraso: ${HOUVE_ATRASO_ROTULOS[analise.oportunidade_houve_atraso]}`));
    if (analise.oportunidade_repercussao) blocos.push(paragrafo(`Repercussão: ${analise.oportunidade_repercussao}`));
  }

  if (causasAlternativas.length > 0) {
    blocos.push(paragrafo("Causas alternativas consideradas:"));
    blocos.push(
      tabela(
        ["Hipótese", "Plausibilidade", "Impacto sobre a tese"],
        causasAlternativas.map((c) => [c.hipotese, c.plausibilidade ? PLAUSIBILIDADE_ROTULOS[c.plausibilidade] : "—", c.impacto_sobre_tese ?? "—"]),
      ),
    );
  }

  if (blocos.length === 0) return null;
  return { secaoId: "av-vi", codigo: "av_analise_tecnico_pericial", titulo: "VI — ANÁLISE TÉCNICO-PERICIAL", ordem: 6, blocos };
}

function montarSecaoVII(nexo: CasoNexoCausalRow | null): SecaoCompilada | null {
  if (!nexo || !nexo.aplicavel) return null;
  const blocos: BlocoConteudo[] = [];
  if (nexo.fundamentacao) blocos.push(paragrafo(nexo.fundamentacao));
  if (nexo.conclusao) blocos.push(paragrafo(`Conclusão sobre o nexo causal: ${CONCLUSAO_NEXO_ROTULOS[nexo.conclusao]}`));
  if (blocos.length === 0) return null;
  return { secaoId: "av-vii", codigo: "av_nexo_causal", titulo: "VII — NEXO CAUSAL", ordem: 7, blocos };
}

function montarSecaoVIII(dano: CasoDanoRow | null, incapacidade: CasoIncapacidadeRow | null): SecaoCompilada | null {
  const blocos: BlocoConteudo[] = [];
  if (dano?.existe) {
    blocos.push(paragrafo(`Existência de dano: ${DANO_EXISTE_ROTULOS[dano.existe]}`));
    if (dano.existe === "sim") {
      if (dano.natureza) blocos.push(paragrafo(`Natureza: ${dano.natureza}`));
      if (dano.temporario_permanente) blocos.push(paragrafo(`Temporário/permanente: ${DANO_TEMPORARIO_PERMANENTE_ROTULOS[dano.temporario_permanente]}`));
      if (dano.repercussao_funcional) blocos.push(paragrafo(`Repercussão funcional: ${dano.repercussao_funcional}`));
      if (dano.prognostico) blocos.push(paragrafo(`Prognóstico: ${dano.prognostico}`));
      if (dano.atribuicao_causal) blocos.push(paragrafo(`Atribuição causal: ${dano.atribuicao_causal}`));
    }
  }
  if (incapacidade?.pertinente) {
    if (incapacidade.profissao) blocos.push(paragrafo(`Profissão/atividade habitual: ${incapacidade.profissao}`));
    if (incapacidade.incapacidade_atual) blocos.push(paragrafo(`Incapacidade atual: ${incapacidade.incapacidade_atual}`));
    if (incapacidade.parcial_total) blocos.push(paragrafo(`Parcial/total: ${PARCIAL_TOTAL_ROTULOS[incapacidade.parcial_total]}`));
    if (incapacidade.temporaria_permanente)
      blocos.push(paragrafo(`Temporária/permanente: ${INCAPACIDADE_TEMPORARIA_PERMANENTE_ROTULOS[incapacidade.temporaria_permanente]}`));
    if (incapacidade.prognostico) blocos.push(paragrafo(`Prognóstico: ${incapacidade.prognostico}`));
  }
  if (blocos.length === 0) return null;
  return { secaoId: "av-viii", codigo: "av_dano_repercussoes", titulo: "VIII — DANO E REPERCUSSÕES", ordem: 8, blocos };
}

function montarSecaoIX(pontosFavoraveis: CasoPontosFavoraveisRow[], fragilidades: CasoFragilidadesRow[]): SecaoCompilada | null {
  const blocos: BlocoConteudo[] = [];
  if (pontosFavoraveis.length > 0) {
    blocos.push(paragrafo("Pontos favoráveis:"));
    blocos.push(
      tabela(
        ["Descrição", "Força probatória"],
        pontosFavoraveis.map((p) => [p.descricao, p.forca_probatoria ? FORCA_PROBATORIA_ROTULOS[p.forca_probatoria] : "—"]),
      ),
    );
  }
  if (fragilidades.length > 0) {
    blocos.push(paragrafo("Fragilidades:"));
    blocos.push(
      tabela(
        ["Descrição", "Impacto"],
        fragilidades.map((f) => [f.descricao, f.impacto ? IMPACTO_FRAGILIDADE_ROTULOS[f.impacto] : "—"]),
      ),
    );
  }
  if (blocos.length === 0) return null;
  return { secaoId: "av-ix", codigo: "av_favoraveis_fragilidades", titulo: "IX — ELEMENTOS FAVORÁVEIS, FRAGILIDADES E LIMITAÇÕES", ordem: 9, blocos };
}

function montarSecaoX(analise: CamposExternosAnalise, oportunidades: CasoOportunidadesProbatoriasRow[]): SecaoCompilada | null {
  const blocos: BlocoConteudo[] = [];
  const pendentes = oportunidades.filter((o) => !o.resolvido_em);
  if (pendentes.length > 0) {
    blocos.push(paragrafo("Oportunidades probatórias identificadas:"));
    blocos.push(
      tabela(
        ["Providência", "Tipo de prova", "Prazo"],
        pendentes.map((o) => [o.providencia, o.tipo_prova ? TIPO_PROVA_ROTULOS[o.tipo_prova] : "—", dataCurta(o.prazo)]),
      ),
    );
  }
  if (analise.recomendacao_justificativa) {
    blocos.push(paragrafo(`Recomendação técnica: ${analise.recomendacao_justificativa}`));
  }
  if (blocos.length === 0) return null;
  return { secaoId: "av-x", codigo: "av_oportunidades_recomendacoes", titulo: "X — OPORTUNIDADES PROBATÓRIAS E RECOMENDAÇÕES", ordem: 10, blocos };
}

function montarSecaoXI(analise: CamposExternosAnalise): SecaoCompilada {
  const blocos: BlocoConteudo[] = [];
  blocos.push(paragrafo(`Classificação: ${analise.conclusao ? CONCLUSAO_ROTULOS[analise.conclusao] : "Não concluída"}`));
  if (analise.conclusao_fundamentacao) blocos.push(paragrafo(analise.conclusao_fundamentacao));
  if (analise.conclusao_elementos_favoraveis) blocos.push(paragrafo(`Principais elementos favoráveis: ${analise.conclusao_elementos_favoraveis}`));
  if (analise.conclusao_fragilidades) blocos.push(paragrafo(`Principais fragilidades: ${analise.conclusao_fragilidades}`));
  if (analise.conclusao_condicionantes) blocos.push(paragrafo(`Condicionante(s)/providência: ${analise.conclusao_condicionantes}`));
  return { secaoId: "av-xi", codigo: "av_conclusao", titulo: "XI — CONCLUSÃO DA VIABILIDADE TÉCNICO-PERICIAL", ordem: 11, blocos };
}

export async function compilarAnaliseViabilidade(processoId: string): Promise<ResultadoCompilacaoViabilidade> {
  const supabase = await createClient();

  const { data: processo, error: erroProcesso } = await supabase
    .from("processos")
    .select("*")
    .eq("id", processoId)
    .maybeSingle();
  if (erroProcesso) return { status: "erro", mensagem: `Falha ao buscar o processo: ${erroProcesso.message}` };
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };

  const { data: analiseDb, error: erroAnalise } = await supabase
    .from("analises_viabilidade")
    .select("*")
    .eq("processo_id", processoId)
    .maybeSingle();
  if (erroAnalise) return { status: "erro", mensagem: `Falha ao buscar a análise: ${erroAnalise.message}` };
  if (!analiseDb) return { status: "erro", mensagem: "Esta análise ainda não foi iniciada." };

  // Nota: caso_tese_adversa DELIBERADAMENTE não entra nesta lista — tabela
  // inteiramente interna, nunca aceita como entrada aqui (§43).
  const [
    { data: config },
    { data: documentosDb },
    { data: avaliacoesDb },
    { data: questoesDb },
    { data: fatosDb },
    { data: linhaTempoDb },
    { data: pontosTecnicosDb },
    { data: condutasDb },
    { data: causasAlternativasDb },
    { data: pontosFavoraveisDb },
    { data: fragilidadesDb },
    { data: oportunidadesDb },
    { data: nexoDb },
    { data: danoDb },
    { data: incapacidadeDb },
  ] = await Promise.all([
    supabase.from("configuracoes").select("*").maybeSingle(),
    supabase.from("documentos").select("*").eq("processo_id", processoId),
    supabase.from("caso_documentos_avaliados").select("*").eq("processo_id", processoId),
    supabase.from("caso_questoes_tecnicas").select("*").eq("processo_id", processoId),
    supabase.from("caso_fatos_comprovados").select("*").eq("processo_id", processoId),
    supabase.from("caso_linha_tempo_medica").select("*").eq("processo_id", processoId),
    supabase.from("caso_pontos_tecnicos").select("*").eq("processo_id", processoId),
    supabase.from("caso_condutas_analisadas").select("*").eq("processo_id", processoId),
    supabase.from("caso_causas_alternativas").select("*").eq("processo_id", processoId),
    supabase.from("caso_pontos_favoraveis").select("*").eq("processo_id", processoId),
    supabase.from("caso_fragilidades").select("*").eq("processo_id", processoId),
    supabase.from("caso_oportunidades_probatorias").select("*").eq("processo_id", processoId),
    supabase.from("caso_nexo_causal").select("*").eq("processo_id", processoId).maybeSingle(),
    supabase.from("caso_dano").select("*").eq("processo_id", processoId).maybeSingle(),
    supabase.from("caso_incapacidade").select("*").eq("processo_id", processoId).maybeSingle(),
  ]);

  const analise = externalizarAnalise(analiseDb);
  const documentoPorId = new Map((documentosDb ?? []).map((d) => [d.id, d]));

  const cabecalho = {
    ...montarCabecalhoAssistenciaTecnica(processo),
    tituloDocumento: TITULO_ANALISE_VIABILIDADE,
  };

  const secoes: SecaoCompilada[] = [
    montarSecaoI(analise),
    montarSecaoII(analise, questoesDb ?? []),
    montarSecaoIII(analise, avaliacoesDb ?? [], documentoPorId),
    montarSecaoIV(fatosDb ?? []),
    montarSecaoV(linhaTempoDb ?? []),
    montarSecaoVI(analise, pontosTecnicosDb ?? [], condutasDb ?? [], causasAlternativasDb ?? []),
    montarSecaoVII(nexoDb ?? null),
    montarSecaoVIII(danoDb ?? null, incapacidadeDb ?? null),
    montarSecaoIX(pontosFavoraveisDb ?? [], fragilidadesDb ?? []),
    montarSecaoX(analise, oportunidadesDb ?? []),
    montarSecaoXI(analise),
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

  const snapshot: SnapshotAnaliseViabilidade = {
    tipo: "analise_viabilidade",
    gerado_em: modelo.geradoEm,
    dados: {
      analise,
      documentosAvaliados: avaliacoesDb ?? [],
      questoesTecnicas: questoesDb ?? [],
      fatosComprovados: (fatosDb ?? []).filter((f) => f.validado_em),
      linhaTempo: linhaTempoDb ?? [],
      pontosTecnicos: pontosTecnicosDb ?? [],
      condutasAnalisadas: condutasDb ?? [],
      causasAlternativas: causasAlternativasDb ?? [],
      pontosFavoraveis: pontosFavoraveisDb ?? [],
      fragilidades: fragilidadesDb ?? [],
      oportunidadesProbatorias: oportunidadesDb ?? [],
      nexoCausal: nexoDb ?? null,
      dano: danoDb ?? null,
      incapacidade: incapacidadeDb ?? null,
    },
  };

  return { status: "ok", modelo, snapshot };
}
