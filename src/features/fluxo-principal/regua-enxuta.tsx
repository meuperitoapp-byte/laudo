import { Selo } from "@/components/ui/badge";
import { HONORARIOS_SITUACAO_ROTULOS, SITUACAO_DEPOSITO_ROTULOS } from "./rotulos";
import type { ProcessosRow } from "@/types/database";

const dataCurta = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

const DEPOSITO_SITUACOES_OK = ["integral", "dispensado", "justica_gratuita"] as const;
const DEPOSITO_SITUACOES_ATENCAO = ["parcial", "aguardando_comprovacao"] as const;

type ProcessoRegua = Pick<
  ProcessosRow,
  "nomeacao_data" | "aceitou_nomeacao" | "honorarios_situacao" | "deposito_situacao" | "agendamento_data"
  | "liberacao_solicitada_em" | "honorarios_recebidos_em"
>;

/**
 * Régua enxuta (fatia 7 do plano) — painel só-leitura mostrando onde o
 * processo está nas 7 etapas já modeladas pelo Fluxo Principal, sem papéis
 * nem Central Judicial (fora de escopo, decisão maior separada). Só lê o
 * que já está gravado em `processos`/`laudos_gerados` — nenhuma coluna nova,
 * nenhuma inferência: cada etapa reflete exatamente o dado que as telas
 * acima desta já editam.
 */
export function ReguaEnxuta({
  processo,
  laudoPrincipalProtocoladoEm,
}: {
  processo: ProcessoRegua;
  laudoPrincipalProtocoladoEm: string | null;
}) {
  const etapas: { rotulo: string; conteudo: React.ReactNode }[] = [
    {
      rotulo: "Nomeação",
      conteudo: processo.nomeacao_data ? (
        <Selo variante="sucesso">Registrada em {dataCurta(processo.nomeacao_data)}</Selo>
      ) : (
        <Selo variante="neutro">Pendente</Selo>
      ),
    },
    {
      rotulo: "Aceite",
      conteudo:
        processo.aceitou_nomeacao === "sim" ? (
          <Selo variante="sucesso">Aceito</Selo>
        ) : processo.aceitou_nomeacao === "nao" ? (
          <Selo variante="atencao">Não aceito</Selo>
        ) : processo.aceitou_nomeacao === "encargo_declinado" ? (
          <Selo variante="atencao">Encargo declinado</Selo>
        ) : processo.aceitou_nomeacao === "destituida" ? (
          <Selo variante="atencao">Destituída do cargo</Selo>
        ) : (
          <Selo variante="neutro">Pendente</Selo>
        ),
    },
    {
      rotulo: "Honorários",
      conteudo: processo.honorarios_situacao ? (
        <Selo variante="sucesso">{HONORARIOS_SITUACAO_ROTULOS[processo.honorarios_situacao]}</Selo>
      ) : (
        <Selo variante="neutro">Pendente</Selo>
      ),
    },
    {
      rotulo: "Depósito",
      conteudo: processo.deposito_situacao ? (
        <Selo
          variante={
            (DEPOSITO_SITUACOES_OK as readonly string[]).includes(processo.deposito_situacao)
              ? "sucesso"
              : (DEPOSITO_SITUACOES_ATENCAO as readonly string[]).includes(processo.deposito_situacao)
                ? "atencao"
                : "neutro"
          }
        >
          {SITUACAO_DEPOSITO_ROTULOS[processo.deposito_situacao]}
        </Selo>
      ) : (
        <Selo variante="neutro">Pendente</Selo>
      ),
    },
    {
      rotulo: "Agendamento",
      conteudo: processo.agendamento_data ? (
        <Selo variante="sucesso">Marcado para {dataCurta(processo.agendamento_data)}</Selo>
      ) : (
        <Selo variante="neutro">Pendente</Selo>
      ),
    },
    {
      rotulo: "Laudo",
      conteudo: laudoPrincipalProtocoladoEm ? (
        <Selo variante="sucesso">Protocolado em {dataCurta(laudoPrincipalProtocoladoEm)}</Selo>
      ) : (
        <Selo variante="neutro">Pendente</Selo>
      ),
    },
    {
      // Só "concluída" (sucesso) quando há RECEBIMENTO confirmado — protocolar
      // o pedido é um passo intermediário, não o fim do trilho financeiro
      // (decisão do Jeferson, 16/09/2026).
      rotulo: "Liberação",
      conteudo: processo.honorarios_recebidos_em ? (
        <Selo variante="sucesso">Recebido em {dataCurta(processo.honorarios_recebidos_em)}</Selo>
      ) : processo.liberacao_solicitada_em ? (
        <Selo variante="atencao">Solicitada em {dataCurta(processo.liberacao_solicitada_em)} — aguardando recebimento</Selo>
      ) : (
        <Selo variante="neutro">Pendente</Selo>
      ),
    },
  ];

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5">
      <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mb-3">
        Onde este processo está — reflete só o que já foi salvo nas seções abaixo, sem decidir nada sozinho.
      </p>
      <ul className="flex flex-wrap gap-x-6 gap-y-3">
        {etapas.map((e) => (
          <li key={e.rotulo} className="flex items-center gap-2 text-sm">
            <span className="text-nevoa-500 dark:text-nevoa-400">{e.rotulo}:</span>
            {e.conteudo}
          </li>
        ))}
      </ul>
    </div>
  );
}
