/**
 * Calendário Inteligente de Relacionamento (§22-23 do modelo) — terceira
 * camada de gatilhos (institucional e continuidade de serviços já entregues
 * na Fase 1). Junta aniversários pessoais/profissionais/de parceria,
 * campanhas temáticas de saúde elegíveis, premiações pendentes e MEU PERITO
 * pendente de abordagem em UMA lista, ordenada por proximidade.
 *
 * Deliberadamente NÃO duplica "parceiros sem contato" (já é o bloco
 * Prioridades da tela principal) nem "follow-ups de continuidade" (já é a
 * fila de Continuidade de Serviços) — cada gatilho mora num lugar só.
 */
import type { RelacionamentosRow, RelacionamentoAdvogadosRow, RelacionamentoPremiacoesRow, CampanhasTematicasSaudeRow, DatasComemorativasProfissionaisRow } from "@/types/database";
import { TIPO_ROTULOS } from "./catalogos";

export interface OportunidadeCalendario {
  id: string;
  tipo: "aniversario_pessoal" | "aniversario_profissional" | "aniversario_parceria" | "campanha_saude" | "premiacao_pendente" | "meu_perito_pendente";
  titulo: string;
  subtitulo: string | null;
  data: string;
  diasRestantes: number;
  relacionamentoId: string;
  href: string;
}

/** Próxima ocorrência anual de um 'MM-DD' a partir de hoje (hoje conta como 0 dias). */
function proximaOcorrenciaAnual(mesDia: string, hojeIso: string): { data: string; dias: number } {
  const anoAtual = Number(hojeIso.slice(0, 4));
  const hoje = new Date(`${hojeIso}T00:00:00Z`).getTime();
  const candidatoEsteAno = `${anoAtual}-${mesDia}`;
  const candidatoData = new Date(`${candidatoEsteAno}T00:00:00Z`).getTime();
  const usar = candidatoData >= hoje ? candidatoEsteAno : `${anoAtual + 1}-${mesDia}`;
  const dias = Math.round((new Date(`${usar}T00:00:00Z`).getTime() - hoje) / 86400000);
  return { data: usar, dias };
}

export function montarCalendarioInteligente({
  hojeIso,
  janelaDias,
  relacionamentos,
  advogados,
  premiacoes,
  campanhasSaude,
  datasComemorativas,
}: {
  hojeIso: string;
  janelaDias: number;
  relacionamentos: RelacionamentosRow[];
  advogados: RelacionamentoAdvogadosRow[];
  premiacoes: RelacionamentoPremiacoesRow[];
  campanhasSaude: CampanhasTematicasSaudeRow[];
  datasComemorativas: DatasComemorativasProfissionaisRow[];
}): OportunidadeCalendario[] {
  const itens: OportunidadeCalendario[] = [];
  const dataComemorativaPorProfissao = new Map(datasComemorativas.filter((d) => d.ativo).map((d) => [d.profissao.toLowerCase(), d.data_comemorativa]));

  for (const r of relacionamentos) {
    const faleceu = r.cs_situacao_atual === "falecido";

    // §22.1/22.2 — aniversário pessoal (Cliente Saúde, Profissional, advogado solo).
    if (r.data_nascimento && !faleceu) {
      const { data, dias } = proximaOcorrenciaAnual(r.data_nascimento.slice(5, 10), hojeIso);
      if (dias <= janelaDias) {
        itens.push({
          id: `aniversario_pessoal-${r.id}`,
          tipo: "aniversario_pessoal",
          titulo: `Aniversário — ${r.nome}`,
          subtitulo: TIPO_ROTULOS[r.tipo],
          data,
          diasRestantes: dias,
          relacionamentoId: r.id,
          href: `/relacionamento/${r.id}`,
        });
      }
    }

    // §22.1 — data profissional comemorativa (Profissional por prof_profissao/outra, ou "Advogado" pro tipo advogado_escritorio).
    if (!faleceu) {
      const chave = r.tipo === "advogado_escritorio" ? "advogado" : (r.prof_profissao === "outro" ? r.prof_profissao_outra : r.prof_profissao)?.toLowerCase();
      const mesDia = chave ? dataComemorativaPorProfissao.get(chave) : undefined;
      if (mesDia) {
        const { data, dias } = proximaOcorrenciaAnual(mesDia, hojeIso);
        if (dias <= janelaDias) {
          itens.push({
            id: `aniversario_profissional-${r.id}`,
            tipo: "aniversario_profissional",
            titulo: `Data profissional — ${r.nome}`,
            subtitulo: r.tipo === "advogado_escritorio" ? "Dia do Advogado" : (r.prof_profissao === "outro" ? r.prof_profissao_outra : r.prof_profissao),
            data,
            diasRestantes: dias,
            relacionamentoId: r.id,
            href: `/relacionamento/${r.id}`,
          });
        }
      }
    }

    // §6.1 — aniversário de relacionamento (marcos 1, 2, 3, 4, 5+ anos).
    const anoCriacao = Number(r.created_at.slice(0, 4));
    const mesDiaCriacao = r.created_at.slice(5, 10);
    const { data: proximaData, dias: diasProxima } = proximaOcorrenciaAnual(mesDiaCriacao, hojeIso);
    const anosNaProxima = Number(proximaData.slice(0, 4)) - anoCriacao;
    if (anosNaProxima >= 1 && diasProxima <= janelaDias) {
      itens.push({
        id: `aniversario_parceria-${r.id}`,
        tipo: "aniversario_parceria",
        titulo: `${r.nome} completa ${anosNaProxima >= 5 ? `${anosNaProxima} (5+)` : anosNaProxima} ano(s) com a PERICONS`,
        subtitulo: TIPO_ROTULOS[r.tipo],
        data: proximaData,
        diasRestantes: diasProxima,
        relacionamentoId: r.id,
        href: `/relacionamento/${r.id}`,
      });
    }

    // §12/§8 — MEU PERITO pendente de abordagem (não abordado ou abordado, com potencial médio/alto).
    if (r.tipo === "advogado_escritorio" && !r.meu_perito && r.meu_perito_potencial && r.meu_perito_potencial !== "baixo" && r.meu_perito_status !== "assinante" && r.meu_perito_status !== "inativo") {
      itens.push({
        id: `meu_perito_pendente-${r.id}`,
        tipo: "meu_perito_pendente",
        titulo: `MEU PERITO — ${r.nome}`,
        subtitulo: `Potencial ${r.meu_perito_potencial}${r.meu_perito_status ? ` · ${r.meu_perito_status}` : ""}`,
        data: hojeIso,
        diasRestantes: 0,
        relacionamentoId: r.id,
        href: `/relacionamento/${r.id}`,
      });
    }
  }

  // §22.1 — aniversário de advogados vinculados (não têm cs_situacao_atual, não podem estar "falecidos" por essa regra).
  for (const a of advogados) {
    if (!a.data_nascimento) continue;
    const { data, dias } = proximaOcorrenciaAnual(a.data_nascimento.slice(5, 10), hojeIso);
    if (dias <= janelaDias) {
      itens.push({
        id: `aniversario_pessoal-advogado-${a.id}`,
        tipo: "aniversario_pessoal",
        titulo: `Aniversário — ${a.nome}`,
        subtitulo: "Advogado vinculado",
        data,
        diasRestantes: dias,
        relacionamentoId: a.relacionamento_id,
        href: `/relacionamento/${a.relacionamento_id}`,
      });
    }
  }

  // §7.1 — premiações pendentes (ainda não entregues).
  for (const p of premiacoes) {
    if (p.status === "entregue") continue;
    itens.push({
      id: `premiacao_pendente-${p.id}`,
      tipo: "premiacao_pendente",
      titulo: `Premiação pendente: ${p.premiacao}`,
      subtitulo: p.campanha,
      data: p.data_prevista ?? hojeIso,
      diasRestantes: p.data_prevista ? Math.round((new Date(`${p.data_prevista}T00:00:00Z`).getTime() - new Date(`${hojeIso}T00:00:00Z`).getTime()) / 86400000) : 0,
      relacionamentoId: p.relacionamento_id,
      href: `/relacionamento/${p.relacionamento_id}`,
    });
  }

  // §22.6 — campanhas temáticas de saúde elegíveis (nunca falecido, área clínica compatível).
  const clientesSaude = relacionamentos.filter((r) => r.tipo === "cliente_saude" && r.cs_situacao_atual !== "falecido");
  for (const campanha of campanhasSaude.filter((c) => c.ativo)) {
    for (const cliente of clientesSaude) {
      if (campanha.area_clinica && cliente.cs_area_clinica !== campanha.area_clinica) continue;
      const situacao = cliente.cs_situacao_atual ?? "";
      if (campanha.situacoes_excluidas.includes(situacao)) continue;
      if (campanha.situacoes_permitidas.length > 0 && !campanha.situacoes_permitidas.includes(situacao)) continue;
      itens.push({
        id: `campanha_saude-${campanha.id}-${cliente.id}`,
        tipo: "campanha_saude",
        titulo: `${campanha.nome} — ${cliente.nome}`,
        subtitulo: cliente.cs_area_clinica,
        data: hojeIso,
        diasRestantes: 0,
        relacionamentoId: cliente.id,
        href: `/relacionamento/${cliente.id}`,
      });
    }
  }

  return itens.sort((a, b) => a.diasRestantes - b.diasRestantes);
}
