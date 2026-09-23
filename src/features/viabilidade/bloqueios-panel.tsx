import type { AnalisesViabilidadeRow } from "@/types/database";

interface ItemBloqueio {
  rotulo: string;
  ok: boolean;
}

/**
 * Bloqueios pra finalização (§42) — checklist INFORMATIVO, não um botão
 * "CONCLUIR ANÁLISE" que trava de verdade. Mantém "o sistema não decide,
 * a perita decide" (regra crítica do CLAUDE.md): ela vê o que falta e
 * decide sozinha quando mudar o status pra "Concluída" (§3, já existe
 * no cabeçalho) — nunca um botão que bloqueia a ação por conta própria.
 */
export function BloqueiosPanel({
  analise,
  temQuestoesTecnicas,
  temDocumentosAvaliados,
}: {
  analise: AnalisesViabilidadeRow;
  temQuestoesTecnicas: boolean;
  temDocumentosAvaliados: boolean;
}) {
  const itens: ItemBloqueio[] = [
    { rotulo: "Objeto da análise definido", ok: Boolean(analise.objeto_analise) },
    { rotulo: "Documentos avaliados", ok: temDocumentosAvaliados },
    { rotulo: "Suficiência documental respondida", ok: Boolean(analise.suficiencia_documental) },
    { rotulo: "Questões técnicas analisadas", ok: temQuestoesTecnicas },
    { rotulo: "Conclusão selecionada", ok: Boolean(analise.conclusao) },
    { rotulo: "Fundamentação da conclusão", ok: Boolean(analise.conclusao_fundamentacao) },
    { rotulo: "Recomendação registrada", ok: Boolean(analise.recomendacao) },
    { rotulo: "Próxima ação (ou encerramento definitivo)", ok: Boolean(analise.proxima_acao) || analise.status === "concluida" },
  ];
  const faltam = itens.filter((i) => !i.ok).length;

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-3">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-1">Bloqueios pra finalização</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
          §42 — checklist informativo. {faltam === 0 ? "Tudo preenchido." : `Faltam ${faltam} de ${itens.length}.`} A decisão de
          finalizar continua sua — isso não trava nada sozinho.
        </p>
      </div>
      <ul className="space-y-1.5">
        {itens.map((item) => (
          <li key={item.rotulo} className="flex items-center gap-2 text-sm">
            <span
              className={
                item.ok
                  ? "text-musgo-600 dark:text-musgo-400"
                  : "text-nevoa-400 dark:text-nevoa-600"
              }
            >
              {item.ok ? "✓" : "○"}
            </span>
            <span className={item.ok ? "text-nevoa-800 dark:text-nevoa-200" : "text-nevoa-500 dark:text-nevoa-400"}>
              {item.rotulo}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
