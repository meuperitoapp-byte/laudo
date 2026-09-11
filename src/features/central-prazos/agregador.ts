/**
 * Central de Prazos e Tarefas — fatia 1: agrega em uma lista só o que já é
 * pendente em qualquer canto do sistema, sem tabela nova e sem cadastro
 * manual. Ver docs/plano-modulo-central-prazos.md.
 *
 * Não é "use server": função de leitura pura, chamada pela página. Cada
 * `itensDe*` é uma FONTE independente — mesmo formato de saída
 * (`ItemPainel`) — de propósito (ver plano §5): quando o Fluxo Principal do
 * Perito Judicial existir, ele entra como só mais uma fonte aqui, sem mexer
 * nas que já existem nem na ordenação.
 */

import type { createClient } from "@/lib/supabase/server";
import { hojeIsoBrasil, nivelPorPrazo, ordenarPainel } from "./regras";
import { PROVIDENCIA_POR_CATEGORIA } from "./rotulos";
import type { ItemPainel } from "./tipos";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

const TIPOS_SAIDA_AT = ["parecer_at", "manifestacao_at", "impugnacao_at", "parecer_divergente_at", "quesitos_at"] as const;

/** "Nº do processo, ou nome do periciando, ou parte autora" — mesmo critério já usado no índice de ciclos e no índice de processos. */
function identificarProcesso(p: { numero_processo: string | null; periciando_nome: string | null; parte_autora: string | null }): string {
  return p.numero_processo || p.periciando_nome || p.parte_autora || "Processo sem identificação";
}

export async function montarPainel(supabase: SupabaseServer): Promise<ItemPainel[]> {
  const hoje = hojeIsoBrasil();

  // Processos ativos — filtro aplicado a TODAS as fontes abaixo: um processo
  // finalizado/arquivado não é "o que fazer hoje", mesmo que alguma coluna
  // antiga tenha ficado sem preencher (ex.: aceitou_nomeacao nunca setado
  // num processo de anos atrás, de antes de a coluna existir).
  const { data: processosDb } = await supabase
    .from("processos")
    .select("id, tipo_trabalho, numero_processo, periciando_nome, parte_autora, aceitou_nomeacao")
    .eq("status", "em_andamento");
  const processos = processosDb ?? [];
  const processoPorId = new Map(processos.map((p) => [p.id, p]));

  const idsCiclos = new Set<string>();
  const itens: ItemPainel[] = [];

  // ---- 1. Ciclos de pós-laudo abertos (a única fonte com prazo de verdade) ----
  const { data: ciclosDb } = await supabase
    .from("pos_laudo_ciclos")
    .select("id, processo_id, numero_ciclo, prazo, created_at")
    .eq("status", "aberto");
  for (const c of ciclosDb ?? []) {
    const processo = processoPorId.get(c.processo_id);
    if (!processo) continue; // processo não ativo — fora da Central
    idsCiclos.add(c.id);
    itens.push({
      id: `ciclo_aberto-${c.id}`,
      categoria: "ciclo_aberto",
      titulo: `Ciclo ${c.numero_ciclo} — ${identificarProcesso(processo)}`,
      subtitulo: c.prazo ? null : "Sem prazo registrado ainda",
      providencia: PROVIDENCIA_POR_CATEGORIA.ciclo_aberto,
      nivel: nivelPorPrazo(c.prazo, hoje),
      prazo: c.prazo,
      dataContexto: null,
      ordenacao: c.prazo ?? c.created_at,
      href: `/processos/${c.processo_id}/pos-laudo/${c.id}`,
    });
  }

  // ---- 2. Laudo (V1) pronto, ainda não protocolado — só a versão mais recente por processo ----
  const { data: laudosDb } = await supabase
    .from("laudos_gerados")
    .select("id, processo_id, versao, created_at")
    .eq("tipo", "laudo")
    .eq("protocolado", false)
    .order("versao", { ascending: false });
  const laudosLista = laudosDb ?? [];
  const laudoMaisRecentePorProcesso = new Map<string, (typeof laudosLista)[number]>();
  for (const l of laudosLista) {
    if (!laudoMaisRecentePorProcesso.has(l.processo_id)) laudoMaisRecentePorProcesso.set(l.processo_id, l);
  }
  for (const l of laudoMaisRecentePorProcesso.values()) {
    const processo = processoPorId.get(l.processo_id);
    if (!processo) continue;
    itens.push({
      id: `laudo_sem_protocolar-${l.id}`,
      categoria: "laudo_sem_protocolar",
      titulo: `Laudo pronto — ${identificarProcesso(processo)}`,
      subtitulo: `Versão ${l.versao}`,
      providencia: PROVIDENCIA_POR_CATEGORIA.laudo_sem_protocolar,
      nivel: "sem_prazo",
      prazo: null,
      dataContexto: null,
      ordenacao: l.created_at,
      href: `/processos/${l.processo_id}/laudo`,
    });
  }

  // ---- 3. Saídas de Assistência Técnica não protocoladas (entregues ou não) ----
  const { data: atDb } = await supabase
    .from("laudos_gerados")
    .select("id, processo_id, pos_laudo_ciclo_id, tipo, entregue_ao_advogado_em, created_at")
    .in("tipo", TIPOS_SAIDA_AT)
    .eq("protocolado", false);
  for (const a of atDb ?? []) {
    if (a.pos_laudo_ciclo_id) idsCiclos.add(a.pos_laudo_ciclo_id);
  }

  // Números de ciclo pros títulos/links das saídas AT (pode incluir ciclo já encerrado — um parecer sem entrega continua pendente mesmo com o ciclo fechado).
  let numeroCicloPorId = new Map<string, number>();
  if (idsCiclos.size > 0) {
    const { data: numerosDb } = await supabase
      .from("pos_laudo_ciclos")
      .select("id, numero_ciclo")
      .in("id", Array.from(idsCiclos));
    numeroCicloPorId = new Map((numerosDb ?? []).map((c) => [c.id, c.numero_ciclo]));
  }

  for (const a of atDb ?? []) {
    const processo = processoPorId.get(a.processo_id);
    if (!processo || !a.pos_laudo_ciclo_id) continue;
    const numeroCiclo = numeroCicloPorId.get(a.pos_laudo_ciclo_id);
    const tituloBase = `Ciclo ${numeroCiclo ?? "?"} — ${identificarProcesso(processo)}`;
    const href = `/processos/${a.processo_id}/pos-laudo/${a.pos_laudo_ciclo_id}`;

    if (!a.entregue_ao_advogado_em) {
      itens.push({
        id: `at_sem_entrega-${a.id}`,
        categoria: "at_sem_entrega",
        titulo: tituloBase,
        subtitulo: a.tipo === "quesitos_at" ? "Quesitos Suplementares" : "Parecer",
        providencia: PROVIDENCIA_POR_CATEGORIA.at_sem_entrega,
        nivel: "sem_prazo",
        prazo: null,
        dataContexto: null,
        ordenacao: a.created_at,
        href,
      });
    } else {
      itens.push({
        id: `at_entregue_sem_protocolo-${a.id}`,
        categoria: "at_entregue_sem_protocolo",
        titulo: tituloBase,
        subtitulo: a.tipo === "quesitos_at" ? "Quesitos Suplementares" : "Parecer",
        providencia: PROVIDENCIA_POR_CATEGORIA.at_entregue_sem_protocolo,
        nivel: "sem_prazo",
        prazo: null,
        dataContexto: { rotulo: "Entregue em", valor: a.entregue_ao_advogado_em },
        ordenacao: a.entregue_ao_advogado_em,
        href,
      });
    }
  }

  // ---- 4. Documentos marcados como ilegíveis/insuficientes ----
  const { data: docsDb } = await supabase
    .from("documentos")
    .select("id, processo_id, nome_arquivo, created_at")
    .eq("ilegivel_insuficiente", true);
  for (const d of docsDb ?? []) {
    if (!d.processo_id) continue;
    const processo = processoPorId.get(d.processo_id);
    if (!processo) continue;
    itens.push({
      id: `documento_ilegivel-${d.id}`,
      categoria: "documento_ilegivel",
      titulo: `Documento a resolver — ${identificarProcesso(processo)}`,
      subtitulo: d.nome_arquivo,
      providencia: PROVIDENCIA_POR_CATEGORIA.documento_ilegivel,
      nivel: "sem_prazo",
      prazo: null,
      dataContexto: null,
      ordenacao: d.created_at,
      href: `/processos/${d.processo_id}/documentos`,
    });
  }

  // ---- 5. Nomeação sem decisão (só perícia judicial) ----
  for (const p of processos) {
    if (p.tipo_trabalho !== "pericia_judicial" || p.aceitou_nomeacao !== null) continue;
    itens.push({
      id: `nomeacao_sem_decisao-${p.id}`,
      categoria: "nomeacao_sem_decisao",
      titulo: `Nomeação sem decisão — ${identificarProcesso(p)}`,
      subtitulo: null,
      providencia: PROVIDENCIA_POR_CATEGORIA.nomeacao_sem_decisao,
      nivel: "sem_prazo",
      prazo: null,
      dataContexto: null,
      ordenacao: hoje,
      href: `/processos/${p.id}/editar`,
    });
  }

  return ordenarPainel(itens);
}
