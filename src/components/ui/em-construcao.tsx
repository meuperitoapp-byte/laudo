/**
 * Placeholder de módulo ainda não construído — usado pelos itens novos da
 * navegação PERICONS (item #7 da fila de melhorias, aplicado como "só
 * reorganizar a navegação": renomeia/agrupa o que já existe e sinaliza
 * claramente o que ainda não foi construído, em vez de link quebrado ou
 * fingir que a função já existe).
 */
export function PainelEmConstrucao({
  titulo,
  descricao,
  itens,
}: {
  titulo: string;
  descricao: string;
  itens?: string[];
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-nevoa-300 dark:border-nevoa-700 bg-white dark:bg-nevoa-900/40 px-6 py-16 text-center">
      <span className="text-xs font-semibold uppercase tracking-wide text-ambar-600 dark:text-ambar-400">
        Em construção
      </span>
      <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-100">{titulo}</h2>
      <p className="text-sm text-nevoa-500 dark:text-nevoa-400 max-w-md">{descricao}</p>
      {itens && itens.length > 0 && (
        <ul className="text-sm text-nevoa-600 dark:text-nevoa-400 space-y-1">
          {itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
