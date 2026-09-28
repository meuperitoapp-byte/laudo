import type { IndicadoresParceriaEscritorio, IndicadoresParceriaProfissional } from "./parceria";

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function Bloco({ rotulo, valor }: { rotulo: string; valor: string | number }) {
  return (
    <div>
      <p className="text-xs text-nevoa-500 dark:text-nevoa-400">{rotulo}</p>
      <p className="font-medium text-nevoa-900 dark:text-nevoa-100">{valor}</p>
    </div>
  );
}

/** §13.3 — indicadores de parceria, 100% automáticos a partir dos encaminhamentos e indicações. */
export function IndicadoresParceriaEscritorioPanel({ indicadores }: { indicadores: IndicadoresParceriaEscritorio }) {
  const semDados =
    indicadores.clientesEncaminhadosPelaPericons === 0 &&
    indicadores.profissionaisEncaminhados === 0 &&
    indicadores.clientesIndicadosPeloEscritorio === 0;
  if (semDados) return null;

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-3">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Indicadores de parceria</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <Bloco rotulo="Clientes encaminhados pela PERICONS" valor={indicadores.clientesEncaminhadosPelaPericons} />
        <Bloco rotulo="Profissionais encaminhados" valor={indicadores.profissionaisEncaminhados} />
        <Bloco rotulo="Clientes indicados pelo escritório" valor={indicadores.clientesIndicadosPeloEscritorio} />
        <Bloco rotulo="Encaminhamentos aceitos" valor={indicadores.encaminhamentosAceitos} />
        <Bloco rotulo="Contratações informadas" valor={indicadores.contratacoesInformadas} />
        <Bloco rotulo="Última conexão" valor={indicadores.ultimaConexao ? dataCurta(indicadores.ultimaConexao) : "—"} />
      </div>
    </div>
  );
}

export function IndicadoresParceriaProfissionalPanel({ indicadores }: { indicadores: IndicadoresParceriaProfissional }) {
  const semDados =
    indicadores.clientesIndicadosAPericons === 0 &&
    indicadores.profissionaisIndicados === 0 &&
    indicadores.encaminhamentosRealizados === 0;
  if (semDados) return null;

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-3">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Indicadores de parceria</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <Bloco rotulo="Clientes indicados à PERICONS" valor={indicadores.clientesIndicadosAPericons} />
        <Bloco rotulo="Profissionais indicados" valor={indicadores.profissionaisIndicados} />
        <Bloco rotulo="Encaminhamentos realizados" valor={indicadores.encaminhamentosRealizados} />
        <Bloco rotulo="Última conexão" valor={indicadores.ultimaConexao ? dataCurta(indicadores.ultimaConexao) : "—"} />
      </div>
    </div>
  );
}
