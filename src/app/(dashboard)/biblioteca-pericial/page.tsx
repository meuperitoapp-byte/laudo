import { createClient } from "@/lib/supabase/server";
import { BibliotecaPericialPanel } from "@/features/biblioteca-pericial/biblioteca-pericial-panel";
import { AREA_PERICIAL_SEED } from "@/features/biblioteca-pericial/catalogos";
import { mesclarSugestoes } from "@/features/processos/catalogos";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";

export default async function BibliotecaPericialPage() {
  const supabase = await createClient();

  const { data: itens, error } = await supabase
    .from("biblioteca_pericial")
    .select("*")
    .order("created_at", { ascending: false });
  // Mesma classe de bug do dashboard "0 processos" (21/09/2026): sem checar
  // `error`, uma falha aqui viraria "Nenhum item salvo ainda" — estado vazio
  // normal, mas enganoso quando na verdade é falha de leitura.
  if (error) console.error("Biblioteca Pericial: falha ao listar:", error.message);

  const areasSugestoes = mesclarSugestoes(
    AREA_PERICIAL_SEED,
    (itens ?? []).map((i) => i.area_pericial)
  );

  return (
    <main className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50">Biblioteca Pericial</h1>
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
          Acervo de referência técnica, organizado por área pericial — quesitos já formulados, teses, literatura,
          legislação/normas, CONITEC/NATJUS/PCDT, protocolos/diretrizes e jurisprudência técnica.
        </p>
      </div>

      {error && <BannerErroConsulta mensagem="Não consegui carregar tudo agora — a lista abaixo pode estar incompleta." />}

      <BibliotecaPericialPanel itens={itens ?? []} areasSugestoes={areasSugestoes} />
    </main>
  );
}
