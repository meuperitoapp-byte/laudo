import { PainelEmConstrucao } from "@/components/ui/em-construcao";

export default function RelacionamentoPage() {
  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Relacionamento</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Satisfação do cliente e indicações — o lado comercial da PERICONS.
        </p>
      </div>
      <PainelEmConstrucao
        titulo="Relacionamento com clientes"
        descricao="Vai registrar satisfação do cliente, insatisfações e um programa de indicações. Ainda depende da Dra. Fernanda estruturar como isso funciona na prática antes de desenhar a tela."
      />
    </main>
  );
}
