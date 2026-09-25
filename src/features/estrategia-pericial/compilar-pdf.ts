/**
 * Compila a Estratégia Pericial (V1 enxuto) — mesmo padrão "modelo
 * intermediário único" dos demais compiladores. Baseado em
 * PERICONS_MODELO_PADRAO_ESTRATEGIA_PERICIAL_PARA_PROGRAMADOR.pdf, §17
 * "Estrutura do PDF externo" (com os cortes do V1 documentados na migration).
 *
 * Rodapé OBRIGATÓRIO (pedido explícito da Dra. Fernanda, 24/09/2026): fixo,
 * nunca editável pela tela — ver RODAPE_ESTRATEGIA_PERICIAL em catalogos.ts.
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoAssistenciaTecnica } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotEstrategiaPericial } from "@/types/json-fields";
import {
  RODAPE_ESTRATEGIA_PERICIAL,
  CLASSIFICACAO_FRAGILIDADE_ROTULOS,
  DESTINO_TESE_ADVERSA_ROTULOS,
  PRIORIDADE_DOCUMENTO_ROTULOS,
  ACAO_DOCUMENTO_ROTULOS,
} from "./catalogos";
import { CATEGORIA_LINHA_TEMPO_ROTULOS } from "@/features/viabilidade/catalogos";
import type {
  EstrategiasPericiaisRow,
  EstrategiaEixosTeseRow,
  EstrategiaPontosInvestigacaoRow,
  EstrategiaFragilidadesRow,
  EstrategiaTesesAdversasRow,
  EstrategiaDocumentosProvasRow,
  EstrategiaPlanoAcaoRow,
  EstrategiaResponsabilidadesRow,
  CasoLinhaTempoMedicaRow,
} from "@/types/database";

export type ResultadoEstrategiaPericial =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotEstrategiaPericial }
  | { status: "erro"; mensagem: string };

export const TITULO_ESTRATEGIA_PERICIAL = "ESTRATÉGIA PERICIAL";

function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
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
function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function tabela(colunas: string[], linhas: string[][]): BlocoConteudo {
  return { tipo: "tabela", colunas, linhas };
}

export async function compilarEstrategiaPericial(processoId: string, estrategiaId: string): Promise<ResultadoEstrategiaPericial> {
  const supabase = await createClient();

  const [
    { data: processo, error: erroProcesso },
    { data: estrategia, error: erroEstrategia },
    { data: config, error: erroConfig },
    { data: eixosDb, error: erroEixos },
    { data: pontosDb, error: erroPontos },
    { data: fragilidadesDb, error: erroFragilidades },
    { data: tesesDb, error: erroTeses },
    { data: documentosDb, error: erroDocumentos },
    { data: planoAcaoDb, error: erroPlanoAcao },
    { data: responsabilidadesDb, error: erroResponsabilidades },
    { data: linhaTempoDb, error: erroLinhaTempo },
  ] = await Promise.all([
    supabase.from("processos").select("*").eq("id", processoId).single(),
    supabase.from("estrategias_periciais").select("*").eq("id", estrategiaId).single(),
    supabase.from("configuracoes").select("*").maybeSingle(),
    supabase.from("estrategia_eixos_tese").select("*").eq("estrategia_id", estrategiaId).order("ordem", { ascending: true }),
    supabase.from("estrategia_pontos_investigacao").select("*").eq("estrategia_id", estrategiaId).order("ordem", { ascending: true }),
    supabase.from("estrategia_fragilidades").select("*").eq("estrategia_id", estrategiaId).order("ordem", { ascending: true }),
    supabase.from("estrategia_teses_adversas").select("*").eq("estrategia_id", estrategiaId).order("ordem", { ascending: true }),
    supabase.from("estrategia_documentos_provas").select("*").eq("estrategia_id", estrategiaId).order("ordem", { ascending: true }),
    supabase.from("estrategia_plano_acao").select("*").eq("estrategia_id", estrategiaId).order("ordem", { ascending: true }),
    supabase.from("estrategia_responsabilidades").select("*").eq("estrategia_id", estrategiaId).order("ordem", { ascending: true }),
    supabase.from("caso_linha_tempo_medica").select("*").eq("processo_id", processoId).order("data", { ascending: true }),
  ]);
  if (erroProcesso) return { status: "erro", mensagem: erroProcesso.message };
  if (erroEstrategia) return { status: "erro", mensagem: erroEstrategia.message };
  if (erroConfig) return { status: "erro", mensagem: erroConfig.message };
  if (erroEixos) return { status: "erro", mensagem: erroEixos.message };
  if (erroPontos) return { status: "erro", mensagem: erroPontos.message };
  if (erroFragilidades) return { status: "erro", mensagem: erroFragilidades.message };
  if (erroTeses) return { status: "erro", mensagem: erroTeses.message };
  if (erroDocumentos) return { status: "erro", mensagem: erroDocumentos.message };
  if (erroPlanoAcao) return { status: "erro", mensagem: erroPlanoAcao.message };
  if (erroResponsabilidades) return { status: "erro", mensagem: erroResponsabilidades.message };
  if (erroLinhaTempo) return { status: "erro", mensagem: erroLinhaTempo.message };

  const eixos: EstrategiaEixosTeseRow[] = eixosDb ?? [];
  const pontos: EstrategiaPontosInvestigacaoRow[] = pontosDb ?? [];
  const fragilidades: EstrategiaFragilidadesRow[] = fragilidadesDb ?? [];
  const teses: EstrategiaTesesAdversasRow[] = tesesDb ?? [];
  const documentos: EstrategiaDocumentosProvasRow[] = documentosDb ?? [];
  const planoAcao: EstrategiaPlanoAcaoRow[] = planoAcaoDb ?? [];
  const responsabilidades: EstrategiaResponsabilidadesRow[] = responsabilidadesDb ?? [];
  const linhaTempo: CasoLinhaTempoMedicaRow[] = linhaTempoDb ?? [];

  const cabecalhoBase = montarCabecalhoAssistenciaTecnica(processo);
  const cabecalho = { ...cabecalhoBase, tituloDocumento: TITULO_ESTRATEGIA_PERICIAL };

  const secoes: SecaoCompilada[] = [];

  const blocosIdentificacao: BlocoConteudo[] = cabecalhoBase.linhasContexto.map((l) => paragrafo(`${l.rotulo}: ${l.valor}`));
  if (processo.periciando_nome) blocosIdentificacao.push(paragrafo(`Paciente/Periciado: ${processo.periciando_nome}`));
  blocosIdentificacao.push(paragrafo(`Profissional responsável: Dra. ${VALORES_PADRAO_PERITO.nome_perito} — CRM ${VALORES_PADRAO_PERITO.crm_uf}`));
  secoes.push({ secaoId: "ep-1", codigo: "identificacao", titulo: "1 — IDENTIFICAÇÃO", ordem: 1, blocos: blocosIdentificacao });

  if (estrategia.resumo_tecnico_caso) {
    secoes.push({ secaoId: "ep-2", codigo: "resumo_tecnico", titulo: "2 — RESUMO TÉCNICO DO CASO", ordem: 2, blocos: [paragrafo(estrategia.resumo_tecnico_caso)] });
  }

  const blocosQuestao: BlocoConteudo[] = [];
  if (estrategia.questao_central) blocosQuestao.push(paragrafo(`Questão central: ${estrategia.questao_central}`));
  estrategia.questoes_secundarias.forEach((q, i) => blocosQuestao.push(paragrafo(`${i + 1}. ${q}`)));
  if (blocosQuestao.length > 0) {
    secoes.push({ secaoId: "ep-3", codigo: "questao_central", titulo: "3 — QUESTÃO CENTRAL DA PROVA", ordem: 3, blocos: blocosQuestao });
  }

  const blocosTese: BlocoConteudo[] = [];
  if (estrategia.tese_principal) blocosTese.push(paragrafo(`Tese principal: ${estrategia.tese_principal}`));
  eixos.forEach((e, i) => {
    blocosTese.push(paragrafo(`Eixo ${String.fromCharCode(65 + i)} — ${e.titulo}`));
    if (e.tese_especifica) blocosTese.push(paragrafo(e.tese_especifica));
    if (e.base_atual) blocosTese.push(paragrafo(`Base: ${e.base_atual}`));
  });
  if (blocosTese.length > 0) {
    secoes.push({ secaoId: "ep-4", codigo: "tese_pericial", titulo: "4 — TESE PERICIAL E EIXOS", ordem: 4, blocos: blocosTese });
  }

  if (linhaTempo.length > 0) {
    secoes.push({
      secaoId: "ep-5",
      codigo: "linha_tempo",
      titulo: "5 — LINHA DO TEMPO E MARCOS PROBATÓRIOS",
      ordem: 5,
      blocos: [
        tabela(
          ["Data", "Categoria", "Evento", "Marco crítico"],
          linhaTempo.map((e) => [
            dataCurta(e.data),
            e.categoria ? CATEGORIA_LINHA_TEMPO_ROTULOS[e.categoria] : "—",
            e.evento,
            e.marco_critico ? "Sim" : "Não",
          ]),
        ),
      ],
    });
  }

  const cadeia = [
    estrategia.cadeia_estado_anterior,
    estrategia.cadeia_evento,
    estrategia.cadeia_alteracao,
    estrategia.cadeia_persistencia,
    estrategia.cadeia_exame_diagnostico,
    estrategia.cadeia_dano_repercussao,
  ].filter((v): v is string => Boolean(v));
  if (cadeia.length > 0) {
    secoes.push({ secaoId: "ep-6", codigo: "cadeia_probatoria", titulo: "6 — CADEIA PROBATÓRIA", ordem: 6, blocos: [paragrafo(cadeia.join(" → "))] });
  }

  if (pontos.length > 0) {
    const blocos: BlocoConteudo[] = [];
    pontos.forEach((p, i) => {
      blocos.push(paragrafo(`${i + 1}. ${p.ponto}`));
      if (p.o_que_sabemos) blocos.push(paragrafo(`O que sabemos: ${p.o_que_sabemos}`));
      if (p.o_que_demonstrar) blocos.push(paragrafo(`O que precisa ser demonstrado: ${p.o_que_demonstrar}`));
      if (p.como_provar) blocos.push(paragrafo(`Como provar: ${p.como_provar}`));
    });
    secoes.push({ secaoId: "ep-7", codigo: "pontos_investigacao", titulo: "7 — PONTOS TÉCNICOS DE INVESTIGAÇÃO", ordem: 7, blocos });
  }

  if (responsabilidades.length > 0) {
    const blocos: BlocoConteudo[] = [];
    responsabilidades.forEach((r, i) => {
      blocos.push(paragrafo(`${i + 1}. ${r.agente}`));
      if (r.objeto_investigacao) blocos.push(paragrafo(`Objeto de investigação: ${r.objeto_investigacao}`));
      if (r.conduta_documentada) blocos.push(paragrafo(`Conduta documentada: ${r.conduta_documentada}`));
      if (r.ponto_controvertido) blocos.push(paragrafo(`Ponto controvertido: ${r.ponto_controvertido}`));
    });
    secoes.push({ secaoId: "ep-8", codigo: "responsabilidades", titulo: "8 — RESPONSABILIDADES / CONDUTAS DIFERENCIADAS", ordem: 8, blocos });
  }

  if (fragilidades.length > 0) {
    const blocos: BlocoConteudo[] = fragilidades.map((f, i) =>
      paragrafo(`${i + 1}. ${f.fragilidade}${f.classificacao ? ` (${CLASSIFICACAO_FRAGILIDADE_ROTULOS[f.classificacao]})` : ""}`),
    );
    secoes.push({ secaoId: "ep-9", codigo: "fragilidades", titulo: "9 — FRAGILIDADES RELEVANTES", ordem: 9, blocos });
  }

  if (teses.length > 0) {
    const blocos: BlocoConteudo[] = [];
    teses.forEach((t, i) => {
      blocos.push(paragrafo(`${i + 1}. Tese adversa: ${t.tese_adversa}`));
      if (t.resposta_tecnica) blocos.push(paragrafo(`Resposta técnica: ${t.resposta_tecnica}`));
      if (t.evidencia_necessaria) blocos.push(paragrafo(`Evidência necessária: ${t.evidencia_necessaria}`));
      if (t.destino) blocos.push(paragrafo(`Destino: ${DESTINO_TESE_ADVERSA_ROTULOS[t.destino]}`));
    });
    secoes.push({ secaoId: "ep-10", codigo: "teses_adversas", titulo: "10 — TESES ADVERSAS PREVISÍVEIS E RESPOSTA TÉCNICA", ordem: 10, blocos });
  }

  if (documentos.length > 0) {
    const blocos: BlocoConteudo[] = documentos.map((d, i) => {
      const partes = [d.documento];
      if (d.motivo) partes.push(`— ${d.motivo}`);
      if (d.prioridade) partes.push(`(${PRIORIDADE_DOCUMENTO_ROTULOS[d.prioridade]})`);
      if (d.acao) partes.push(`[${ACAO_DOCUMENTO_ROTULOS[d.acao]}]`);
      return paragrafo(`${i + 1}. ${partes.join(" ")}`);
    });
    secoes.push({ secaoId: "ep-11", codigo: "documentos_provas", titulo: "11 — DOCUMENTOS E PROVAS COMPLEMENTARES", ordem: 11, blocos });
  }

  if (estrategia.pontos_pericia.length > 0) {
    const blocos: BlocoConteudo[] = estrategia.pontos_pericia.map((p, i) => paragrafo(`${i + 1}. ${p}`));
    secoes.push({ secaoId: "ep-12", codigo: "pontos_pericia", titulo: "12 — PONTOS ESSENCIAIS A SEREM LEVADOS À PERÍCIA", ordem: 12, blocos });
  }

  if (planoAcao.length > 0) {
    secoes.push({
      secaoId: "ep-13",
      codigo: "plano_acao",
      titulo: "13 — PLANO DE AÇÃO PERICIAL",
      ordem: 13,
      blocos: [
        tabela(
          ["Ação", "Objetivo", "Responsável", "Prazo", "Status"],
          planoAcao.map((a) => [a.acao, a.objetivo ?? "—", a.responsavel ?? "—", a.prazo ? dataCurta(a.prazo) : "—", a.status ?? "—"]),
        ),
      ],
    });
  }

  if (estrategia.conclusao_direcao_estrategica) {
    secoes.push({
      secaoId: "ep-14",
      codigo: "conclusao_direcao",
      titulo: "14 — CONCLUSÃO E DIREÇÃO ESTRATÉGICA",
      ordem: 14,
      blocos: [paragrafo(estrategia.conclusao_direcao_estrategica)],
    });
  }

  const dataIso = estrategia.data_emissao ?? hojeIso();
  secoes.push({
    secaoId: "ep-encerramento",
    codigo: "encerramento",
    titulo: "ENCERRAMENTO",
    ordem: 15,
    blocos: [
      paragrafo(RODAPE_ESTRATEGIA_PERICIAL),
      {
        tipo: "assinatura",
        cidadeData: `${estrategia.local_emissao || VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${formatarDataExtenso(dataIso)}.`,
        nome: `Dra. ${VALORES_PADRAO_PERITO.nome_perito}`,
        tituloCrm: `Médica Perita, CRM ${VALORES_PADRAO_PERITO.crm_uf}.`,
      },
    ],
  });

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

  const snapshot: SnapshotEstrategiaPericial = {
    tipo: "estrategia_pericial",
    gerado_em: modelo.geradoEm,
    dados: { estrategia, eixos, pontos, fragilidades, teses, documentos, planoAcao, responsabilidades, linhaTempo },
  };

  return { status: "ok", modelo, snapshot };
}
