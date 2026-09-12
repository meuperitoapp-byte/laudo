/**
 * Compila a Escusa/Declínio do Encargo Já Aceito (nº13 da Biblioteca de
 * Expedientes Periciais) — o outro destino da trava do Aceite (§4.1), usado
 * quando ela JÁ tinha aceitado (`aceitou_nomeacao === 'sim'`) e sobreveio
 * impedimento depois. Pra quando ela nunca chegou a aceitar, o destino
 * correto é `compilar-impossibilidade-assumir.ts` (nº12) — a tela decide
 * qual mostrar (ver aceite-panel.tsx).
 *
 * Documento pequeno: um parágrafo fixo com motivo (obrigatório) e pendências
 * (opcional), nenhum dos dois persistido em `processos` — congelados só no
 * snapshot desta versão. Gerar este documento NÃO altera `aceitou_nomeacao`
 * nem nenhum outro campo do processo.
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoFormal, type CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotEscusaDeclinio } from "@/types/json-fields";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";

export type ResultadoEscusaDeclinio =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotEscusaDeclinio }
  | { status: "erro"; mensagem: string };

const TITULO = "ESCUSA / DECLÍNIO DO ENCARGO JÁ ACEITO";

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

export async function compilarEscusaDeclinio(
  processoId: string,
  motivo: string,
  pendencias: string | null,
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoEscusaDeclinio> {
  if (!motivo.trim()) return { status: "erro", mensagem: "Informe a circunstância que motivou a escusa." };

  const supabase = await createClient();
  const { data: processo } = await supabase.from("processos").select("*").eq("id", processoId).single();
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };

  const { data: partesDb } = await supabase.from("processo_partes").select("*").eq("processo_id", processoId);
  const cabecalhoBase = montarCabecalhoFormal(processo, partesDb ?? []);
  if ("erro" in cabecalhoBase) return { status: "erro", mensagem: cabecalhoBase.erro };

  const { data: config } = await supabase.from("configuracoes").select("*").maybeSingle();

  const nome = VALORES_PADRAO_PERITO.nome_perito;
  const crm = VALORES_PADRAO_PERITO.crm_uf;
  const cabecalho: CabecalhoFormal = {
    ...cabecalhoBase,
    tituloDocumento: TITULO,
    paragrafoIntroducao: `Dra. ${nome}, médica, CRM/${crm}, perita nomeada por este Juízo nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, apresentar a seguinte manifestação:`,
  };

  const pendenciasTexto = pendencias?.trim() || "não há documentos, valores ou providências pendentes sob responsabilidade desta Perita";

  const dataExtenso = formatarDataExtenso(dataAssinaturaIso);
  const secoes: SecaoCompilada[] = [
    {
      secaoId: "escusa-i",
      codigo: "encerramento",
      titulo: TITULO,
      ordem: 1,
      blocos: [
        paragrafo(
          `Após a aceitação do encargo, sobreveio circunstância relevante consistente em ${motivo.trim()}, que impede a continuidade adequada da atuação pericial.`,
        ),
        paragrafo(
          "Diante da impossibilidade superveniente, apresenta escusa e requer a liberação do encargo, com a adoção das providências necessárias para substituição do(a) expert.",
        ),
        paragrafo(`Quanto a documentos, valores ou providências pendentes sob responsabilidade desta Perita: ${pendenciasTexto}.`),
        {
          tipo: "assinatura",
          cidadeData: `${VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${dataExtenso}.`,
          nome: `Dra. ${nome}`,
          tituloCrm: `Médica Perita Judicial, CRM ${crm}.`,
        },
      ],
    },
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

  const snapshot: SnapshotEscusaDeclinio = {
    tipo: "escusa_declinio_pericial",
    gerado_em: modelo.geradoEm,
    motivo: motivo.trim(),
    pendencias: pendencias?.trim() || null,
  };

  return { status: "ok", modelo, snapshot };
}
