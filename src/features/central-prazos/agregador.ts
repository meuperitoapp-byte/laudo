/**
 * Central de Prazos e Tarefas — fatias 1, 2, 3 (parte "documentos
 * pendentes") e 5: agrega em uma lista só o que é pendente em qualquer canto
 * do sistema. Ver docs/plano-modulo-central-prazos.md.
 *
 * Não é "use server": função de leitura pura, chamada pela página. Cada
 * bloco numerado é uma FONTE independente — mesmo formato de saída
 * (`ItemPainel`) — de propósito (ver plano §5). Fatia 5 (15-16/09/2026)
 * plugou o Fluxo Principal do Perito Judicial como mais 3 fontes (nomeação
 * com prazo real, agendamento marcado, liberação sem recebimento) sem mexer
 * nas que já existiam. Fatia 2 (17/09/2026) plugou `central_tarefas` (o
 * cadastro manual de tarefa/evento avulso) como a 9ª fonte — a única que lê
 * dado que ela mesma escreveu em vez de inferir de outra tabela. Fatia 3,
 * parte "documentos pendentes" (18/09/2026), plugou a 8ª fonte
 * (`processos.documentos_solicitados_em`). Honorários em atraso (21/09/2026,
 * plano §6.2) plugou a 10ª fonte, com dois ramos: judicial (próximo marco
 * combinado, prazo real) e Assistência Técnica (vencimento de contrato,
 * só boleto/transferência, só enquanto não "Pago").
 */

import type { createClient } from "@/lib/supabase/server";
import { hojeIsoBrasil, nivelPorPrazo, ordenarPainel, paraDiasUtc } from "./regras";
import { PROVIDENCIA_POR_CATEGORIA } from "./rotulos";
import type { ItemPainel } from "./tipos";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

const TIPOS_SAIDA_AT = ["parecer_at", "manifestacao_at", "impugnacao_at", "parecer_divergente_at", "quesitos_at"] as const;

/** "Nº do processo, ou nome do periciando, ou parte autora" — mesmo critério já usado no índice de ciclos e no índice de processos. */
export function identificarProcesso(p: { numero_processo: string | null; periciando_nome: string | null; parte_autora: string | null }): string {
  return p.numero_processo || p.periciando_nome || p.parte_autora || "Processo sem identificação";
}

export async function montarPainel(supabase: SupabaseServer): Promise<ItemPainel[]> {
  const hoje = hojeIsoBrasil();

  // As 7 consultas abaixo são todas INDEPENDENTES entre si — nenhuma usa
  // dado de outra no WHERE, só cruzam em memória depois (via processoPorId).
  // Antes rodavam uma de cada vez (7 idas e voltas sequenciais ao Supabase);
  // isso é chamado por /hoje E por /dashboard, então cada navegação pra essas
  // duas telas pagava esse custo inteiro. Corrigido em 22/09/2026 (relato de
  // lentidão ao trocar de módulo) — ver [[performance-navegacao]].
  const [
    { data: processosDb },
    { data: ciclosDb },
    { data: laudosDb },
    { data: atDb },
    { data: docsDb },
    { data: processosComLaudoDb },
    { data: tarefasDb },
  ] = await Promise.all([
    // Processos ativos — filtro aplicado a TODAS as fontes abaixo: um
    // processo finalizado/arquivado não é "o que fazer hoje", mesmo que
    // alguma coluna antiga tenha ficado sem preencher (ex.: aceitou_nomeacao
    // nunca setado num processo de anos atrás, de antes de a coluna existir).
    supabase
      .from("processos")
      .select(
        "id, tipo_trabalho, numero_processo, periciando_nome, parte_autora, aceitou_nomeacao, nomeacao_prazo_manifestacao, agendamento_data, liberacao_solicitada_em, honorarios_recebidos_em, documentos_solicitados_em, documentos_solicitados_descricao, honorarios_proximo_marco_em, honorarios_proximo_marco_descricao, honorarios_forma_pagamento, honorarios_vencimento, situacao_financeira",
      )
      .eq("status", "em_andamento"),
    // Fonte 1 — ciclos de pós-laudo abertos.
    supabase
      .from("pos_laudo_ciclos")
      .select("id, processo_id, numero_ciclo, prazo, created_at")
      .eq("status", "aberto"),
    // Fonte 2 — laudo (V1) pronto, ainda não protocolado.
    supabase
      .from("laudos_gerados")
      .select("id, processo_id, versao, created_at")
      .eq("tipo", "laudo")
      .eq("protocolado", false)
      .order("versao", { ascending: false }),
    // Fonte 3 — saídas de Assistência Técnica não protocoladas.
    supabase
      .from("laudos_gerados")
      .select("id, processo_id, pos_laudo_ciclo_id, tipo, entregue_ao_advogado_em, created_at")
      .in("tipo", TIPOS_SAIDA_AT)
      .eq("protocolado", false),
    // Fonte 4 — documentos marcados como ilegíveis/insuficientes.
    supabase.from("documentos").select("id, processo_id, nome_arquivo, created_at").eq("ilegivel_insuficiente", true),
    // Fonte 6 (parte 1) — quais processos já têm laudo, pra excluir da fonte de agendamento.
    supabase.from("laudos_gerados").select("processo_id").eq("tipo", "laudo"),
    // Fonte 9 (parte 1) — tarefas/eventos manuais em aberto.
    supabase
      .from("central_tarefas")
      .select("id, processo_id, tipo, titulo, descricao, data, hora, status, nivel_urgencia_manual")
      .is("concluida_em", null),
  ]);
  const processos = processosDb ?? [];
  const processoPorId = new Map(processos.map((p) => [p.id, p]));
  const tarefas = tarefasDb ?? [];

  // Segunda rodada, só pro que genuinamente depende do resultado da
  // primeira (número de ciclo dos ids referenciados por fontes 1+3; nome dos
  // processos referenciados por tarefas que apontam pra processo inativo) —
  // as duas são independentes ENTRE SI, então também disparam juntas.
  const idsCiclos = new Set<string>();
  for (const c of ciclosDb ?? []) idsCiclos.add(c.id);
  for (const a of atDb ?? []) {
    if (a.pos_laudo_ciclo_id) idsCiclos.add(a.pos_laudo_ciclo_id);
  }
  const idsProcessosTarefas = Array.from(
    new Set(tarefas.map((t) => t.processo_id).filter((pid): pid is string => pid !== null && !processoPorId.has(pid))),
  );
  const [{ data: numerosDb }, { data: processosExtraDb }] = await Promise.all([
    idsCiclos.size > 0
      ? supabase.from("pos_laudo_ciclos").select("id, numero_ciclo").in("id", Array.from(idsCiclos))
      : Promise.resolve({ data: null, error: null }),
    idsProcessosTarefas.length > 0
      ? supabase.from("processos").select("id, numero_processo, periciando_nome, parte_autora").in("id", idsProcessosTarefas)
      : Promise.resolve({ data: null, error: null }),
  ]);
  const numeroCicloPorId = new Map((numerosDb ?? []).map((c) => [c.id, c.numero_ciclo]));
  const identificacaoExtra = new Map((processosExtraDb ?? []).map((p) => [p.id, identificarProcesso(p)]));

  const itens: ItemPainel[] = [];

  // ---- 1. Ciclos de pós-laudo abertos (a única fonte com prazo de verdade) ----
  for (const c of ciclosDb ?? []) {
    const processo = processoPorId.get(c.processo_id);
    if (!processo) continue; // processo não ativo — fora da Central
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
  // (números de ciclo pros títulos/links já resolvidos em numeroCicloPorId, acima —
  // pode incluir ciclo já encerrado: um parecer sem entrega continua pendente mesmo com o ciclo fechado)
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
  // `nomeacao_prazo_manifestacao` (Fluxo Principal) alimenta um prazo REAL
  // aqui quando ela existir — antes disso caía sempre em "sem_prazo" porque
  // não havia dado nenhum pra ler. Cresce sozinho, sem mudar a categoria.
  for (const p of processos) {
    if (p.tipo_trabalho !== "pericia_judicial" || p.aceitou_nomeacao !== null) continue;
    itens.push({
      id: `nomeacao_sem_decisao-${p.id}`,
      categoria: "nomeacao_sem_decisao",
      titulo: `Nomeação sem decisão — ${identificarProcesso(p)}`,
      subtitulo: p.nomeacao_prazo_manifestacao ? null : "Sem prazo de manifestação registrado ainda",
      providencia: PROVIDENCIA_POR_CATEGORIA.nomeacao_sem_decisao,
      nivel: nivelPorPrazo(p.nomeacao_prazo_manifestacao, hoje),
      prazo: p.nomeacao_prazo_manifestacao,
      dataContexto: null,
      ordenacao: p.nomeacao_prazo_manifestacao ?? hoje,
      href: `/processos/${p.id}/editar`,
    });
  }

  // ---- 6. Agendamento marcado (só perícia judicial, primeira fonte de "evento" de verdade) ----
  // Só aparece enquanto NENHUM laudo (rascunho ou protocolado) existir pro
  // processo — se o laudo já saiu, a perícia claramente aconteceu, e deixar
  // a data do agendamento (já passada) competir como "vencida" seria ruído,
  // não sinal (mesmo cuidado que motivou não incluir liberacao_solicitada_em
  // como prazo).
  const processosComLaudo = new Set((processosComLaudoDb ?? []).map((l) => l.processo_id));
  for (const p of processos) {
    if (p.tipo_trabalho !== "pericia_judicial" || !p.agendamento_data || processosComLaudo.has(p.id)) continue;
    itens.push({
      id: `agendamento_marcado-${p.id}`,
      categoria: "agendamento_marcado",
      titulo: `Perícia agendada — ${identificarProcesso(p)}`,
      subtitulo: null,
      providencia: PROVIDENCIA_POR_CATEGORIA.agendamento_marcado,
      nivel: nivelPorPrazo(p.agendamento_data, hoje),
      prazo: p.agendamento_data,
      dataContexto: null,
      ordenacao: p.agendamento_data,
      href: `/processos/${p.id}/fluxo-principal`,
    });
  }

  // ---- 7. Liberação protocolada, sem confirmação de recebimento ----
  // `liberacao_solicitada_em` não é prazo (é registro do que já foi feito),
  // mas a AUSÊNCIA de `honorarios_recebidos_em` depois dela é pendência real
  // — dinheiro parado, sem data de vencimento (depósito judicial costuma
  // demorar, então nunca "vence") — cai em "sem_prazo" (decisão do Jeferson,
  // 16/09/2026). Some sozinho quando ela confirma o recebimento.
  for (const p of processos) {
    if (!p.liberacao_solicitada_em || p.honorarios_recebidos_em) continue;
    itens.push({
      id: `liberacao_sem_recebimento-${p.id}`,
      categoria: "liberacao_sem_recebimento",
      titulo: `Liberação sem recebimento confirmado — ${identificarProcesso(p)}`,
      subtitulo: null,
      providencia: PROVIDENCIA_POR_CATEGORIA.liberacao_sem_recebimento,
      nivel: "sem_prazo",
      prazo: null,
      dataContexto: { rotulo: "Solicitada em", valor: p.liberacao_solicitada_em },
      ordenacao: p.liberacao_solicitada_em,
      href: `/processos/${p.id}/fluxo-principal`,
    });
  }

  // ---- 8. Documentos pendentes (fatia 3, parte decidida) ----
  // Estado do caso, independente de `situacao_processo` (convive com
  // qualquer etapa) — investigação de 17/09/2026 confirmou que nada no banco
  // representava isso antes da migration 20260918120000. Sem prazo real (ela
  // não registra vencimento, só o fato de estar esperando) — mesma lógica de
  // "liberação sem recebimento": pendência real, sem data que sustente
  // urgência crescente. Some sozinho quando ela marca como recebido.
  for (const p of processos) {
    if (!p.documentos_solicitados_em) continue;
    // A urgência é "sem_prazo" (não há vencimento a calcular), mas o tempo
    // parado É o dado que torna o item acionável — por isso a data em vez de
    // booleano desde a decisão original. Sem essa contagem no texto, o item
    // não diz nada que justifique agir agora em vez de depois.
    const diasPendente = paraDiasUtc(hoje) - paraDiasUtc(p.documentos_solicitados_em);
    const rotuloPendencia =
      diasPendente <= 0
        ? "Documentos pendentes (solicitados hoje)"
        : `Documentos pendentes há ${diasPendente} dia${diasPendente === 1 ? "" : "s"}`;
    itens.push({
      id: `documentos_pendentes-${p.id}`,
      categoria: "documentos_pendentes",
      titulo: `${rotuloPendencia} — ${identificarProcesso(p)}`,
      subtitulo: null,
      providencia: p.documentos_solicitados_descricao?.trim() || PROVIDENCIA_POR_CATEGORIA.documentos_pendentes,
      nivel: "sem_prazo",
      prazo: null,
      dataContexto: { rotulo: "Solicitado em", valor: p.documentos_solicitados_em },
      ordenacao: p.documentos_solicitados_em,
      href: `/processos/${p.id}`,
    });
  }

  // ---- 9. Tarefas/eventos manuais em aberto (fatia 2) ----
  // Diferente das outras 8 fontes, esta não filtra por `processos.status`:
  // a tarefa é criação explícita dela, não inferência do sistema sobre um
  // processo específico — um processo finalizado com uma tarefa avulsa
  // ainda aberta continua sendo algo que ela decidiu acompanhar. Só
  // `concluida_em is null` decide se aparece. Identificação dos processos
  // vinculados que NÃO estão no mapa de processos ativos (tarefa pode
  // apontar pra um processo já finalizado/arquivado) já resolvida em
  // identificacaoExtra, acima.
  for (const t of tarefas) {
    const nomeProcesso = t.processo_id
      ? (processoPorId.has(t.processo_id) ? identificarProcesso(processoPorId.get(t.processo_id)!) : identificacaoExtra.get(t.processo_id))
      : null;
    // `dataContexto` é sempre uma DATA (a página formata como tal) — o
    // horário do evento entra no subtítulo, não ali, pra não confundir a
    // formatação de exibição.
    const horario = t.tipo === "evento" && t.hora ? t.hora.slice(0, 5) : null;
    itens.push({
      id: `tarefa_manual-${t.id}`,
      categoria: "tarefa_manual",
      titulo: nomeProcesso ? `${t.titulo} — ${nomeProcesso}` : t.titulo,
      subtitulo: horario ? `${t.status} · ${horario}` : t.status,
      providencia: t.descricao?.trim() || PROVIDENCIA_POR_CATEGORIA.tarefa_manual,
      // Correção manual SEMPRE vence o cálculo — nunca o contrário.
      nivel: t.nivel_urgencia_manual ?? nivelPorPrazo(t.data, hoje),
      prazo: t.data,
      dataContexto: null,
      ordenacao: t.data,
      href: `/tarefas/${t.id}`,
    });
  }

  // ---- 10. Honorários em atraso (fatia 6.2) — mesma fonte, dois ramos ----
  // Dois mecanismos DIFERENTES (nunca um campo genérico de vencimento
  // forçando os dois casos no mesmo molde — instrução do Jeferson, ver
  // docs/plano-modulo-central-prazos.md).
  for (const p of processos) {
    // JUDICIAL — prazo REAL (ela mesma confirmou a data, não é inferência):
    // diferente de "documentos pendentes"/"liberação sem recebimento", que
    // nunca têm data real e por isso ficam em sem_prazo.
    if (p.tipo_trabalho === "pericia_judicial" && p.honorarios_proximo_marco_em) {
      itens.push({
        id: `honorarios_marco_judicial-${p.id}`,
        categoria: "honorarios_marco_judicial",
        titulo: `Próximo marco de honorários — ${identificarProcesso(p)}`,
        subtitulo: p.honorarios_proximo_marco_descricao,
        providencia: PROVIDENCIA_POR_CATEGORIA.honorarios_marco_judicial,
        nivel: nivelPorPrazo(p.honorarios_proximo_marco_em, hoje),
        prazo: p.honorarios_proximo_marco_em,
        dataContexto: null,
        ordenacao: p.honorarios_proximo_marco_em,
        href: `/processos/${p.id}`,
      });
    }

    // ASSISTÊNCIA TÉCNICA — só boleto/transferência geram lembrete (cartão e
    // pix não precisam de cobrança), e só enquanto não estiver "Pago".
    if (
      p.tipo_trabalho === "assistencia_tecnica" &&
      p.honorarios_vencimento &&
      (p.honorarios_forma_pagamento === "Boleto" || p.honorarios_forma_pagamento === "Transferência") &&
      p.situacao_financeira !== "Pago"
    ) {
      itens.push({
        id: `honorarios_atraso_at-${p.id}`,
        categoria: "honorarios_atraso_at",
        titulo: `Pagamento (${p.honorarios_forma_pagamento}) — ${identificarProcesso(p)}`,
        subtitulo: null,
        providencia: PROVIDENCIA_POR_CATEGORIA.honorarios_atraso_at,
        nivel: nivelPorPrazo(p.honorarios_vencimento, hoje),
        prazo: p.honorarios_vencimento,
        dataContexto: null,
        ordenacao: p.honorarios_vencimento,
        href: `/processos/${p.id}/editar`,
      });
    }
  }

  return ordenarPainel(itens);
}
