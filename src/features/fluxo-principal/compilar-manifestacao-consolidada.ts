/**
 * Compila a Manifestação Consolidada — documento composto que agrupa até 4
 * módulos (Aceite/Honorários/Depósito/Agendamento) numa peça só, conforme o
 * que a perita marcar. Reaproveita as MESMAS funções montadoras de seção que
 * os documentos standalone usam (secoes.ts) — nunca duplica texto nem regra.
 *
 * Baseado em `MANIFESTACAO_CONSOLIDADA.pdf`. Regra estrutural do modelo: "O
 * sistema deve gerar somente os blocos selecionados pelo perito, preservando
 * cada ato também como expediente autônomo na biblioteca" — por isso os 4
 * módulos continuam existindo como documentos standalone (compilar-aceite-
 * pericial.ts etc.), esta função só monta a versão combinada.
 *
 * A trava do Aceite (§4.1) é checada de novo aqui, mesmo a tela já impedindo
 * marcar o checkbox quando bloqueada — o compilador não confia cegamente na
 * UI: se por qualquer razão chegar aqui com `aceite=true` e a trava
 * bloqueando, a geração falha em vez de produzir um documento errado.
 */

import { createClient } from "@/lib/supabase/server";
import { montarCabecalhoFormal, type CabecalhoFormal } from "@/features/geracao-laudo/cabecalho";
import { rodapeTexto } from "@/features/geracao-laudo/contatos";
import type { ModeloLaudo, SecaoCompilada, BlocoConteudo } from "@/features/geracao-laudo/modelo";
import type { SnapshotManifestacaoInicial, ModuloManifestacaoConsolidada } from "@/types/json-fields";
import { VALORES_PADRAO_PERITO } from "@/features/preenchimento/perito-padrao";
import { montarSecaoAceite, montarSecaoHonorarios, montarSecaoDeposito, montarSecaoAgendamento } from "./secoes";
import { verificarTravaAceite } from "./regras";

export interface ModulosSelecionados {
  aceite: boolean;
  honorarios: boolean;
  deposito: boolean;
  agendamento: boolean;
}

export type ResultadoManifestacaoConsolidada =
  | { status: "ok"; modelo: ModeloLaudo; snapshot: SnapshotManifestacaoInicial }
  | { status: "erro"; mensagem: string };

const TITULO_CONSOLIDADA = "MANIFESTAÇÃO CONSOLIDADA";

const ROTULO_MODULO: Record<ModuloManifestacaoConsolidada, string> = {
  aceite: "Aceite do Encargo Pericial",
  honorarios: "Proposta/Concordância com Honorários Periciais",
  deposito: "Informação de Dados para Depósito dos Honorários",
  agendamento: "Comunicação de Agendamento da Perícia",
};

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

function modulosMarcados(modulos: ModulosSelecionados): ModuloManifestacaoConsolidada[] {
  const ordem: ModuloManifestacaoConsolidada[] = ["aceite", "honorarios", "deposito", "agendamento"];
  return ordem.filter((m) => modulos[m]);
}

function montarParagrafoIntroducao(nomeacaoId: string | null, marcados: ModuloManifestacaoConsolidada[]): string {
  const nome = VALORES_PADRAO_PERITO.nome_perito;
  const crm = VALORES_PADRAO_PERITO.crm_uf;
  let frase = `Dra. ${nome}, médica, CRM/${crm}, perita nomeada por este Juízo nos autos em epígrafe, vem, respeitosamente`;
  frase += nomeacaoId ? `, em atenção à nomeação/intimação de ID ${nomeacaoId}, apresentar a presente:` : ", apresentar a presente:";
  frase += ` ${TITULO_CONSOLIDADA}, para fins de ${marcados.map((m) => ROTULO_MODULO[m].toLowerCase()).join(", ")}, conforme os módulos selecionados a seguir.`;
  return frase;
}

function montarSecaoModulosSelecionados(marcados: ModuloManifestacaoConsolidada[]): SecaoCompilada {
  return {
    secaoId: "consolidada-i",
    codigo: "consolidada_modulos",
    titulo: "I — MÓDULOS SELECIONADOS PARA ESTA MANIFESTAÇÃO",
    ordem: 1,
    blocos: [paragrafo(`Módulos incluídos nesta manifestação: ${marcados.map((m) => ROTULO_MODULO[m]).join("; ")}.`)],
  };
}

function montarSecaoRequerimentosConsolidados(
  marcados: ModuloManifestacaoConsolidada[],
  dataAssinaturaIso: string,
): SecaoCompilada {
  const itens: string[] = [];
  if (marcados.includes("aceite")) itens.push("seja recebida a manifestação de aceite do encargo pericial");
  if (marcados.includes("honorarios")) itens.push("sejam apreciados/fixados ou tidos por aceitos os honorários periciais, conforme a situação registrada");
  if (marcados.includes("deposito")) {
    itens.push("sejam considerados os dados informados para depósito/pagamento dos honorários");
    itens.push("seja determinada/intimada a parte responsável para realização ou complementação do depósito, quando necessário");
  }
  if (marcados.includes("agendamento")) itens.push("seja dada ciência do agendamento e promovida a intimação das partes quanto à data, horário, local e orientações do ato pericial");

  const dataExtenso = formatarDataExtenso(dataAssinaturaIso);
  return {
    secaoId: "consolidada-requerimentos",
    codigo: "encerramento",
    titulo: "REQUERIMENTOS CONSOLIDADOS",
    ordem: 6,
    blocos: [
      paragrafo(`Diante do exposto, requer-se que: ${itens.map((i) => `(i) ${i}`).join("; ")}.`),
      {
        tipo: "assinatura",
        cidadeData: `${VALORES_PADRAO_PERITO.cidade_uf_assinatura}, ${dataExtenso}.`,
        nome: `Dra. ${VALORES_PADRAO_PERITO.nome_perito}`,
        tituloCrm: `Médica Perita Judicial, CRM ${VALORES_PADRAO_PERITO.crm_uf}.`,
      },
    ],
  };
}

function hojeIso(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

export async function compilarManifestacaoConsolidada(
  processoId: string,
  modulos: ModulosSelecionados,
  confirmarExposicaoDadosBancarios: boolean,
  dataAssinaturaIso: string = hojeIso(),
): Promise<ResultadoManifestacaoConsolidada> {
  const marcados = modulosMarcados(modulos);
  if (marcados.length === 0) {
    return { status: "erro", mensagem: "Selecione ao menos um módulo para gerar a Manifestação Consolidada." };
  }

  const supabase = await createClient();

  const { data: processo } = await supabase.from("processos").select("*").eq("id", processoId).single();
  if (!processo) return { status: "erro", mensagem: "Processo não encontrado." };

  const { data: partesDb } = await supabase.from("processo_partes").select("*").eq("processo_id", processoId);
  const cabecalhoBase = montarCabecalhoFormal(processo, partesDb ?? []);
  if ("erro" in cabecalhoBase) return { status: "erro", mensagem: cabecalhoBase.erro };

  if (modulos.aceite) {
    const trava = verificarTravaAceite(processo);
    if (!trava.ok) {
      return {
        status: "erro",
        mensagem: `O módulo Aceite não pode ser incluído: ${trava.motivo}`,
      };
    }
  }

  const { data: config } = await supabase.from("configuracoes").select("*").maybeSingle();

  const cabecalho: CabecalhoFormal = {
    ...cabecalhoBase,
    tituloDocumento: TITULO_CONSOLIDADA,
    paragrafoIntroducao: montarParagrafoIntroducao(processo.nomeacao_id, marcados),
  };

  const secoes: SecaoCompilada[] = [montarSecaoModulosSelecionados(marcados)];
  if (modulos.aceite) secoes.push(montarSecaoAceite(processo, { secaoId: "consolidada-aceite", ordem: 2 }));
  if (modulos.honorarios) secoes.push(montarSecaoHonorarios(processo, { secaoId: "consolidada-honorarios", ordem: 3 }));
  if (modulos.deposito) {
    secoes.push(
      montarSecaoDeposito(processo, config ?? null, {
        secaoId: "consolidada-deposito",
        ordem: 4,
        confirmarExposicaoDadosBancarios,
      }),
    );
  }
  if (modulos.agendamento) secoes.push(montarSecaoAgendamento(processo, { secaoId: "consolidada-agendamento", ordem: 5 }));
  secoes.push(montarSecaoRequerimentosConsolidados(marcados, dataAssinaturaIso));

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

  const snapshot: SnapshotManifestacaoInicial = {
    tipo: "manifestacao_inicial",
    gerado_em: modelo.geradoEm,
    modulos_selecionados: marcados,
  };

  return { status: "ok", modelo, snapshot };
}
