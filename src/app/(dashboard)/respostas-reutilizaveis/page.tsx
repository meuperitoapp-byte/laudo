import { createClient } from "@/lib/supabase/server";
import { BibliotecaPanel, type CampoParaBiblioteca } from "@/features/respostas-reutilizaveis/biblioteca-panel";

export default async function RespostasReutilizaveisPage() {
  const supabase = await createClient();

  const [{ data: respostas }, { data: tiposLaudo }, { data: secoes }, { data: camposSecao }] = await Promise.all([
    supabase.from("respostas_reutilizaveis").select("*").order("created_at", { ascending: false }),
    supabase.from("tipos_laudo").select("*").order("ordem"),
    supabase.from("secoes").select("id, titulo, ordem, tipo_laudo_id"),
    supabase.from("campos_secao").select("id, rotulo, ordem, secao_id"),
  ]);

  const secaoPorId = new Map((secoes ?? []).map((s) => [s.id, s]));

  const campos: CampoParaBiblioteca[] = (camposSecao ?? []).flatMap((campo) => {
    const secao = secaoPorId.get(campo.secao_id);
    if (!secao) return [];
    return [
      {
        id: campo.id,
        rotulo: campo.rotulo,
        tipoLaudoId: secao.tipo_laudo_id,
        secaoTitulo: secao.titulo,
        secaoOrdem: secao.ordem,
        ordem: campo.ordem,
      },
    ];
  });

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold mb-1">Respostas reutilizáveis</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Biblioteca pessoal de textos pra reaproveitar entre processos — não depende de nenhum
        processo específico.
      </p>

      <BibliotecaPanel respostas={respostas ?? []} tiposLaudo={tiposLaudo ?? []} campos={campos} />
    </main>
  );
}
