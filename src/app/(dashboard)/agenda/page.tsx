import { PainelEmConstrucao } from "@/components/ui/em-construcao";

export default function AgendaPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Agenda</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Visão geral da operação da empresa — calendário, perícias, reuniões e prazos num só lugar.
        </p>
      </div>
      <PainelEmConstrucao
        titulo="Agenda unificada"
        descricao="Vai reunir Calendário, Perícias, Reuniões, Prazos e Tarefas num só lugar, recebendo automaticamente o que nasce dentro dos Casos, com filtro por pessoa/área. Por enquanto, prazos e tarefas continuam em “Hoje”."
        itens={["Calendário", "Perícias", "Reuniões", "Prazos", "Tarefas"]}
      />
    </main>
  );
}
