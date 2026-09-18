import Link from "next/link";
import { PainelEmConstrucao } from "@/components/ui/em-construcao";

export default function BibliotecaPericialPage() {
  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Biblioteca Pericial</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Acervo de referência técnica, organizado por área pericial.
        </p>
      </div>
      <PainelEmConstrucao
        titulo="Acervo técnico por área pericial"
        descricao="Vai reunir quesitos já formulados por área (ex.: violência obstétrica, acidente de trabalho), teses, literatura, legislação/normas, CONITEC, NATJUS, PCDT, protocolos/diretrizes e jurisprudência técnica — parte manual, parte pensada pra vir automática. Hoje, respostas de texto reaproveitáveis já existem em Respostas reutilizáveis."
        itens={[
          "Quesitos por área",
          "Teses",
          "Literatura",
          "Legislação/Normas",
          "CONITEC / NATJUS / PCDT",
          "Protocolos/Diretrizes",
          "Jurisprudência Técnica",
        ]}
      />
      <p className="text-sm text-center">
        <Link href="/respostas-reutilizaveis" className="text-petroleo-600 hover:underline dark:text-petroleo-400">
          Ir para Respostas reutilizáveis →
        </Link>
      </p>
    </main>
  );
}
