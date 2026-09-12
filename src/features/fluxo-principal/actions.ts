"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buscarAtivosGlobais } from "@/features/geracao-laudo/ativos-globais";
import { renderizarDocx } from "@/features/geracao-laudo/renderizar-docx";
import { renderizarPdf } from "@/features/geracao-laudo/renderizar-pdf";
import { BUCKET_LAUDOS_GERADOS } from "@/features/geracao-laudo/constants";
import { compilarAceitePericial } from "./compilar-aceite-pericial";
import { compilarDadosDeposito } from "./compilar-dados-deposito";
import { compilarAgendamentoPericia } from "./compilar-agendamento-pericia";
import { compilarManifestacaoConsolidada, type ModulosSelecionados } from "./compilar-manifestacao-consolidada";
import { compilarImpossibilidadeAssumir } from "./compilar-impossibilidade-assumir";
import { compilarEscusaDeclinio } from "./compilar-escusa-declinio";
import { verificarAlertaAgendamento } from "./regras";
import type { ModeloLaudo } from "@/features/geracao-laudo/modelo";
import type { LaudosGeradosInsert, ProcessosUpdate } from "@/types/database";
import type { SnapshotLaudoGerado } from "@/types/json-fields";
import type {
  ResponsavelAdiantamentoDeposito,
  SituacaoDeposito,
  FormaDisponibilizacaoDeposito,
  AgendamentoNecessidadeAcompanhante,
  AgendamentoDepositoPrevioExigido,
  HonorariosSituacao,
  HonorariosComplexidade,
  LaudoGeradoTipo,
} from "@/types/enums";

type ActionResult = { error: string } | { success: true };
type GerarResult = { error: string; precisaConfirmar?: boolean } | { success: true; versao: number };

function textoOuNull(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}
function boolOuNull(v: string | null | undefined): boolean | null {
  return v === "sim" ? true : v === "nao" ? false : null;
}

// ============================================================================
// Formulários — Aceite / Depósito / Agendamento (dados que hoje só existem
// como coluna, sem tela nenhuma pra editar — a lacuna que esta fatia fecha).
// ============================================================================

export async function salvarDadosAceite(input: {
  processoId: string;
  nomeacaoId: string | null;
  nomeacaoData: string | null;
  nomeacaoCienciaData: string | null;
  nomeacaoPrazoManifestacao: string | null;
  impedimentoSuspeicao: string | null; // "sim" | "nao" | null
  competenciaTecnica: string | null;
  necessitaEspecialista: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const dados: ProcessosUpdate = {
    nomeacao_id: textoOuNull(input.nomeacaoId),
    nomeacao_data: input.nomeacaoData || null,
    nomeacao_ciencia_data: input.nomeacaoCienciaData || null,
    nomeacao_prazo_manifestacao: input.nomeacaoPrazoManifestacao || null,
    aceite_impedimento_suspeicao: boolOuNull(input.impedimentoSuspeicao),
    aceite_competencia_tecnica: boolOuNull(input.competenciaTecnica),
    aceite_necessita_especialista: boolOuNull(input.necessitaEspecialista),
  };

  const { error } = await supabase.from("processos").update(dados).eq("id", input.processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/fluxo-principal`);
  return { success: true };
}

const SITUACAO_DEPOSITO_VALIDAS: readonly SituacaoDeposito[] = [
  "nao_realizado", "parcial", "integral", "dispensado", "justica_gratuita", "aguardando_comprovacao",
];
const RESPONSAVEL_ADIANTAMENTO_VALIDOS: readonly ResponsavelAdiantamentoDeposito[] = ["autor", "reu", "ambos", "outro"];
const FORMA_DISPONIBILIZACAO_VALIDAS: readonly FormaDisponibilizacaoDeposito[] = [
  "dados_bancarios", "conta_judicial", "conforme_juizo", "outro",
];

export async function salvarDadosDeposito(input: {
  processoId: string;
  situacao: string | null;
  valor: string | null; // string do <input type="number">, convertido aqui
  data: string | null;
  responsavelAdiantamento: string | null;
  formaDisponibilizacao: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const situacao =
    input.situacao && (SITUACAO_DEPOSITO_VALIDAS as readonly string[]).includes(input.situacao)
      ? (input.situacao as SituacaoDeposito)
      : null;
  const responsavel =
    input.responsavelAdiantamento &&
    (RESPONSAVEL_ADIANTAMENTO_VALIDOS as readonly string[]).includes(input.responsavelAdiantamento)
      ? (input.responsavelAdiantamento as ResponsavelAdiantamentoDeposito)
      : null;
  const forma =
    input.formaDisponibilizacao &&
    (FORMA_DISPONIBILIZACAO_VALIDAS as readonly string[]).includes(input.formaDisponibilizacao)
      ? (input.formaDisponibilizacao as FormaDisponibilizacaoDeposito)
      : null;
  const valor = input.valor?.trim() ? Number(input.valor) : null;
  if (valor !== null && !Number.isFinite(valor)) return { error: "Valor do depósito inválido." };

  const dados: ProcessosUpdate = {
    deposito_situacao: situacao,
    deposito_valor: valor,
    deposito_data: input.data || null,
    deposito_responsavel_adiantamento: responsavel,
    deposito_forma_disponibilizacao: forma,
  };

  const { error } = await supabase.from("processos").update(dados).eq("id", input.processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/fluxo-principal`);
  return { success: true };
}

const NECESSIDADE_ACOMPANHANTE_VALIDAS: readonly AgendamentoNecessidadeAcompanhante[] = [
  "nao", "sim", "conforme_condicao_clinica",
];
const DEPOSITO_PREVIO_EXIGIDO_VALIDOS: readonly AgendamentoDepositoPrevioExigido[] = ["sim", "nao", "nao_aplicavel"];

/**
 * `depositoPrevioExigido: null` é uma resposta válida e distinta de "nao" —
 * significa "ainda não respondido" (ver comentário da coluna). Nunca
 * convertido silenciosamente pra "nao" aqui.
 */
export async function salvarDadosAgendamento(input: {
  processoId: string;
  data: string | null;
  horario: string | null;
  modalidade: string | null;
  local: string | null;
  endereco: string | null;
  complemento: string | null;
  referenciaAcesso: string | null;
  necessidadeAcompanhante: string | null;
  orientacoesEspecificas: string | null;
  depositoPrevioExigido: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const necessidade =
    input.necessidadeAcompanhante &&
    (NECESSIDADE_ACOMPANHANTE_VALIDAS as readonly string[]).includes(input.necessidadeAcompanhante)
      ? (input.necessidadeAcompanhante as AgendamentoNecessidadeAcompanhante)
      : null;
  const depositoPrevioExigido =
    input.depositoPrevioExigido &&
    (DEPOSITO_PREVIO_EXIGIDO_VALIDOS as readonly string[]).includes(input.depositoPrevioExigido)
      ? (input.depositoPrevioExigido as AgendamentoDepositoPrevioExigido)
      : null;

  const dados: ProcessosUpdate = {
    agendamento_data: input.data || null,
    agendamento_horario: input.horario || null,
    agendamento_modalidade: textoOuNull(input.modalidade),
    agendamento_local: textoOuNull(input.local),
    agendamento_endereco: textoOuNull(input.endereco),
    agendamento_complemento: textoOuNull(input.complemento),
    agendamento_referencia_acesso: textoOuNull(input.referenciaAcesso),
    agendamento_necessidade_acompanhante: necessidade,
    agendamento_orientacoes_especificas: textoOuNull(input.orientacoesEspecificas),
    agendamento_deposito_previo_exigido: depositoPrevioExigido,
  };

  const { error } = await supabase.from("processos").update(dados).eq("id", input.processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/fluxo-principal`);
  return { success: true };
}

const HONORARIOS_SITUACAO_VALIDAS: readonly HonorariosSituacao[] = [
  "nao_fixados", "arbitrados_concordancia", "arbitrados_insuficiente_majoracao", "impugnados", "justica_gratuita_regime_especifico",
];
const HONORARIOS_COMPLEXIDADE_VALIDAS: readonly HonorariosComplexidade[] = ["baixa", "media", "alta", "excepcional"];

/**
 * Honorários não tem petição avulsa (só existe embutido na Manifestação
 * Consolidada) — por isso não tem tela própria, esse formulário mora dentro
 * da tela da Consolidada (consolidada-panel.tsx).
 */
export async function salvarDadosHonorarios(input: {
  processoId: string;
  situacao: string | null;
  complexidade: string | null;
  horasTecnicasEstimadas: string | null;
  valorHoraTecnica: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const situacao =
    input.situacao && (HONORARIOS_SITUACAO_VALIDAS as readonly string[]).includes(input.situacao)
      ? (input.situacao as HonorariosSituacao)
      : null;
  const complexidade =
    input.complexidade && (HONORARIOS_COMPLEXIDADE_VALIDAS as readonly string[]).includes(input.complexidade)
      ? (input.complexidade as HonorariosComplexidade)
      : null;
  const horas = input.horasTecnicasEstimadas?.trim() ? Number(input.horasTecnicasEstimadas) : null;
  const valorHora = input.valorHoraTecnica?.trim() ? Number(input.valorHoraTecnica) : null;
  if (horas !== null && !Number.isFinite(horas)) return { error: "Horas técnicas estimadas inválidas." };
  if (valorHora !== null && !Number.isFinite(valorHora)) return { error: "Valor da hora técnica inválido." };

  const dados: ProcessosUpdate = {
    honorarios_situacao: situacao,
    honorarios_complexidade: complexidade,
    honorarios_horas_tecnicas_estimadas: horas,
    honorarios_valor_hora_tecnica: valorHora,
  };

  const { error } = await supabase.from("processos").update(dados).eq("id", input.processoId);
  if (error) return { error: error.message };

  revalidatePath(`/processos/${input.processoId}/fluxo-principal`);
  return { success: true };
}

// ============================================================================
// Geração — Aceite / Depósito / Agendamento. Mesmo padrão de
// geracao-laudo/actions.ts (gerarLaudo): compila, renderiza PDF+Word do MESMO
// modelo, sobe os dois pro Storage, grava a linha em `laudos_gerados`.
// `versao` é sempre a maior já usada pro PROCESSO + 1 (contador único por
// processo, compartilhado entre laudo/pós-laudo/fluxo principal — mesma
// convenção de sempre, não reinicia por tipo de documento).
// ============================================================================

async function proximaVersao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  processoId: string,
): Promise<number> {
  const { data } = await supabase
    .from("laudos_gerados")
    .select("versao")
    .eq("processo_id", processoId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.versao ?? 0) + 1;
}

async function gerarERegistrar(
  processoId: string,
  tipo: LaudoGeradoTipo,
  titulo: string,
  modelo: ModeloLaudo,
  snapshot: SnapshotLaudoGerado | null = null,
): Promise<GerarResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ativos = await buscarAtivosGlobais();
  const [bufferPdf, bufferDocx] = await Promise.all([
    renderizarPdf(modelo, ativos, []),
    renderizarDocx(modelo, ativos, []),
  ]);

  const versao = await proximaVersao(supabase, processoId);
  const caminhoPdf = `${processoId}/v${versao}.pdf`;
  const caminhoDocx = `${processoId}/v${versao}.docx`;

  const [uploadPdf, uploadDocx] = await Promise.all([
    supabase.storage.from(BUCKET_LAUDOS_GERADOS).upload(caminhoPdf, bufferPdf, { contentType: "application/pdf" }),
    supabase.storage.from(BUCKET_LAUDOS_GERADOS).upload(caminhoDocx, bufferDocx, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  ]);
  if (uploadPdf.error || uploadDocx.error) {
    await Promise.all([
      uploadPdf.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf]),
      uploadDocx.error ? Promise.resolve() : supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoDocx]),
    ]);
    return { error: `Erro ao salvar os arquivos: ${uploadPdf.error?.message ?? uploadDocx.error?.message}` };
  }

  const insert: LaudosGeradosInsert = {
    processo_id: processoId,
    versao,
    tipo,
    titulo,
    storage_path_pdf: caminhoPdf,
    storage_path_docx: caminhoDocx,
    snapshot_respostas: snapshot,
    gerado_por: user?.id ?? null,
  };
  const { error: erroInsert } = await supabase.from("laudos_gerados").insert(insert);
  if (erroInsert) {
    await supabase.storage.from(BUCKET_LAUDOS_GERADOS).remove([caminhoPdf, caminhoDocx]);
    return { error: erroInsert.message };
  }

  revalidatePath(`/processos/${processoId}/fluxo-principal`);
  return { success: true, versao };
}

export async function gerarAceitePericial(processoId: string, dataAssinaturaIso: string): Promise<GerarResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAssinaturaIso)) return { error: "Informe a data da assinatura." };

  const resultado = await compilarAceitePericial(processoId, dataAssinaturaIso);
  if (resultado.status === "erro") return { error: resultado.mensagem };
  if (resultado.status === "bloqueado") return { error: resultado.motivo };

  return gerarERegistrar(processoId, "aceite_pericial", "Manifestação de Aceite do Encargo Pericial", resultado.modelo);
}

export async function gerarDadosDeposito(
  processoId: string,
  confirmarExposicaoDadosBancarios: boolean,
  dataAssinaturaIso: string,
): Promise<GerarResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAssinaturaIso)) return { error: "Informe a data da assinatura." };

  const resultado = await compilarDadosDeposito(processoId, confirmarExposicaoDadosBancarios, dataAssinaturaIso);
  if (resultado.status === "erro") return { error: resultado.mensagem };

  return gerarERegistrar(
    processoId,
    "dados_deposito",
    "Informação de Dados para Depósito dos Honorários",
    resultado.modelo,
  );
}

/**
 * `confirmarApesarDoAlerta`: só tem efeito quando `verificarAlertaAgendamento`
 * acusa alerta (depósito prévio marcado como exigido e ainda não integral/
 * dispensado/justiça gratuita) — nesse caso, sem a confirmação, devolve o
 * aviso com `precisaConfirmar: true` em vez de gerar, pra tela pedir "tem
 * certeza?" antes de tentar de novo já confirmado. Quando não há alerta
 * (inclui `agendamento_deposito_previo_exigido` null — ainda não respondido),
 * gera direto, sem pedir confirmação nenhuma.
 */
export async function gerarAgendamentoPericia(
  processoId: string,
  confirmarApesarDoAlerta: boolean,
  dataAssinaturaIso: string,
): Promise<GerarResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAssinaturaIso)) return { error: "Informe a data da assinatura." };

  const supabase = await createClient();
  const { data: processo } = await supabase
    .from("processos")
    .select("deposito_situacao, agendamento_deposito_previo_exigido")
    .eq("id", processoId)
    .single();
  if (!processo) return { error: "Processo não encontrado." };

  if (!confirmarApesarDoAlerta) {
    const alerta = verificarAlertaAgendamento(processo);
    if (!alerta.ok) return { error: alerta.aviso, precisaConfirmar: true };
  }

  const resultado = await compilarAgendamentoPericia(processoId, dataAssinaturaIso);
  if (resultado.status === "erro") return { error: resultado.mensagem };

  return gerarERegistrar(processoId, "agendamento_pericia", "Comunicação de Agendamento da Perícia", resultado.modelo);
}

/**
 * A trava do Aceite (§4.1) é checada de novo dentro de `compilarManifestacaoConsolidada`
 * quando `modulos.aceite` é true — não confia na tela ter desabilitado o
 * checkbox corretamente.
 */
export async function gerarManifestacaoConsolidada(
  processoId: string,
  modulos: ModulosSelecionados,
  confirmarExposicaoDadosBancarios: boolean,
  dataAssinaturaIso: string,
): Promise<GerarResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAssinaturaIso)) return { error: "Informe a data da assinatura." };

  const resultado = await compilarManifestacaoConsolidada(
    processoId,
    modulos,
    confirmarExposicaoDadosBancarios,
    dataAssinaturaIso,
  );
  if (resultado.status === "erro") return { error: resultado.mensagem };

  return gerarERegistrar(processoId, "manifestacao_inicial", "Manifestação Consolidada", resultado.modelo, resultado.snapshot);
}

/**
 * Destino da trava do Aceite (§4.1) pra quando ela ainda NÃO tinha aceitado
 * (`aceitou_nomeacao` ainda não é 'sim'). Gerar isto NÃO altera
 * `aceitou_nomeacao` nem nenhum outro campo do processo — se algo deveria
 * mudar, é decisão de protocolar (ver marcarFluxoPrincipalProtocolado), e
 * hoje ela também não mexe em nada, de propósito, até confirmação.
 */
export async function gerarImpossibilidadeAssumir(
  processoId: string,
  motivo: string,
  dataAssinaturaIso: string,
): Promise<GerarResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAssinaturaIso)) return { error: "Informe a data da assinatura." };

  const resultado = await compilarImpossibilidadeAssumir(processoId, motivo, dataAssinaturaIso);
  if (resultado.status === "erro") return { error: resultado.mensagem };

  return gerarERegistrar(processoId, "impossibilidade_assumir", "Impossibilidade de Assumir o Encargo", resultado.modelo, resultado.snapshot);
}

/**
 * Destino da trava do Aceite (§4.1) pra quando ela JÁ tinha aceitado
 * (`aceitou_nomeacao === 'sim'`). Mesma regra do documento acima: gerar não
 * altera nada em `processos`.
 */
export async function gerarEscusaDeclinio(
  processoId: string,
  motivo: string,
  pendencias: string | null,
  dataAssinaturaIso: string,
): Promise<GerarResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAssinaturaIso)) return { error: "Informe a data da assinatura." };

  const resultado = await compilarEscusaDeclinio(processoId, motivo, pendencias, dataAssinaturaIso);
  if (resultado.status === "erro") return { error: resultado.mensagem };

  return gerarERegistrar(processoId, "escusa_declinio_pericial", "Escusa/Declínio do Encargo Já Aceito", resultado.modelo, resultado.snapshot);
}

/**
 * Marca uma versão de documento do Fluxo Principal como PROTOCOLADA. Mesmo
 * padrão de `marcarLaudoProtocolado` — a partir daqui o conteúdo fica
 * congelado pelo trigger de sempre; só protocolo_id segue corrigível.
 *
 * Único efeito colateral em `processos`: protocolar um documento que inclui
 * o módulo Aceite (standalone `aceite_pericial`, ou `manifestacao_inicial`
 * com 'aceite' no snapshot) grava `aceitou_nomeacao = 'sim'` — consequência
 * direta e não-ambígua (a trava já exigiu impedimento=não e competência=sim
 * pra esse documento ter sido gerado; protocolar só formaliza o que já
 * estava comprovadamente correto). Fecha a lacuna do Aceite standalone, que
 * até esta fatia não gravava nada ao ser protocolado.
 *
 * Protocolar `impossibilidade_assumir` ou `escusa_declinio_pericial` NÃO
 * mexe em `aceitou_nomeacao` nem em nenhum outro campo — decisão
 * deliberada, pendente de confirmação (ver docs/plano-modulo-fluxo-principal.md).
 */
export async function marcarFluxoPrincipalProtocolado(
  laudoGeradoId: string,
  processoId: string,
  tipo: LaudoGeradoTipo,
  protocoloId: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("laudos_gerados")
    .update({
      protocolado: true,
      protocolado_em: new Date().toISOString(),
      protocolo_id: protocoloId,
    })
    .eq("id", laudoGeradoId)
    .eq("processo_id", processoId)
    .eq("tipo", tipo)
    .eq("protocolado", false)
    .select("id, snapshot_respostas");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Não foi possível marcar como protocolado — a versão não existe ou já está protocolada." };
  }

  const incluiAceite =
    tipo === "aceite_pericial" ||
    (tipo === "manifestacao_inicial" &&
      Boolean(
        (data[0].snapshot_respostas as { modulos_selecionados?: string[] } | null)?.modulos_selecionados?.includes(
          "aceite",
        ),
      ));
  if (incluiAceite) {
    await supabase.from("processos").update({ aceitou_nomeacao: "sim" }).eq("id", processoId);
  }

  revalidatePath(`/processos/${processoId}/fluxo-principal`);
  return { success: true };
}
