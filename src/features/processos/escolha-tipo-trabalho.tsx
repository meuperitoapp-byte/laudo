import Link from "next/link";

/**
 * Primeira página do cadastro (pedido da cliente): a escolha entre Perícia
 * Judicial e Assistência Técnica fica sozinha numa tela própria. Escolher leva
 * DIRETO para o formulário de cadastro já com o tipo definido (?tipo= em
 * /processos/novo) — sem passar pela lista. Só links — sem estado, sem client.
 */

const OPCOES: { valor: "pericia_judicial" | "assistencia_tecnica"; rotulo: string; descricao: string }[] = [
  {
    valor: "pericia_judicial",
    rotulo: "Perícia Judicial",
    descricao: "Nomeação pelo juízo. Processo com vara, comarca e partes; laudo com endereçamento formal.",
  },
  {
    valor: "assistencia_tecnica",
    rotulo: "Assistência Técnica",
    descricao: "Contratação pela parte. Etapas contratadas; pode não haver processo judicial formal ainda.",
  },
];

export function EscolhaTipoTrabalho() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-nevoa-600 dark:text-nevoa-400">Como este trabalho começa?</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPCOES.map((o) => (
          <Link
            key={o.valor}
            href={`/processos/novo?tipo=${o.valor}`}
            className="group flex flex-col gap-2 rounded-lg border border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 p-5 transition-colors hover:border-petroleo-600 hover:bg-petroleo-100/50 dark:hover:border-petroleo-400 dark:hover:bg-petroleo-950/40"
          >
            <span className="font-title text-base font-semibold text-nevoa-900 dark:text-nevoa-100">
              {o.rotulo}
            </span>
            <span className="text-xs leading-relaxed text-nevoa-500 dark:text-nevoa-400">{o.descricao}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
