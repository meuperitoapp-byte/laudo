import { PainelEmConstrucao } from "@/components/ui/em-construcao";

export default function FinanceiroPage() {
  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Financeiro</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Visão consolidada do financeiro da operação, sempre relacionada ao Caso.
        </p>
      </div>
      <PainelEmConstrucao
        titulo="Painel financeiro consolidado"
        descricao="Vai reunir visão geral, a receber, recebidos, honorários judiciais, serviços de AT, propostas, inadimplência e repasse a especialistas. Valores totais pensados pra ficar restritos ao financeiro e à Dra. Fernanda. Por enquanto, os dados financeiros continuam por processo, em cada Caso, e o resumo por situação está no Dashboard."
        itens={[
          "Visão Geral",
          "A Receber",
          "Recebidos",
          "Honorários Judiciais",
          "Serviços AT",
          "Propostas",
          "Inadimplência",
          "Repasse/Especialistas",
          "Relatórios",
        ]}
      />
    </main>
  );
}
