import Link from "next/link";
import { Selo } from "@/components/ui/badge";
import { NIVEL_ROTULOS, NIVEL_SELO_VARIANTE, URGENTE_BADGE_CLASSE } from "@/features/central-prazos/rotulos";
import type { ItemPainel } from "@/features/central-prazos/tipos";

/** "YYYY-MM-DD" -> "DD/MM/AAAA", sem passar por `Date` (evita fuso horário). */
export const dataCurta = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });
};

/** O selo de nível — 5 dos 6 níveis reusam o `Selo` compartilhado; "Urgente" (laranja) não tem variante equivalente hoje (ver rotulos.ts). */
export function SeloNivel({ item }: { item: ItemPainel }) {
  const rotulo = NIVEL_ROTULOS[item.nivel];
  if (item.nivel === "urgente") {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${URGENTE_BADGE_CLASSE}`}>
        {rotulo}
      </span>
    );
  }
  return <Selo variante={NIVEL_SELO_VARIANTE[item.nivel] ?? "neutro"}>{rotulo}</Selo>;
}

/**
 * Card de item pendente — extraído de `/hoje` (30/09/2026) pra ser reusado
 * também na tela de Casos, quando o perfil é restrito e sem acesso ao
 * Financeiro (pedido da Dra. Fernanda: "prefiro que na tela dela fique as
 * atividades que ela precisa cumprir... ela tem TDAH, se perde"). Mesmo
 * cartão em ambos os lugares — evita duas versões divergindo com o tempo.
 */
export function ItemCard({ item }: { item: ItemPainel }) {
  return (
    <li>
      <Link
        href={item.href}
        className="flex flex-wrap items-center gap-3 rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 px-4 py-3.5 text-sm transition-colors hover:border-petroleo-400 dark:hover:border-petroleo-600"
      >
        <SeloNivel item={item} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-nevoa-900 dark:text-nevoa-100 truncate">{item.titulo}</p>
          <p className="text-nevoa-500 dark:text-nevoa-400">
            {item.providencia}
            {item.subtitulo ? ` · ${item.subtitulo}` : ""}
          </p>
        </div>
        <div className="text-xs text-nevoa-500 dark:text-nevoa-400 text-right shrink-0">
          {item.prazo && <p>Prazo: {dataCurta(item.prazo)}</p>}
          {item.dataContexto && (
            <p>
              {item.dataContexto.rotulo} {dataCurta(item.dataContexto.valor)}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
