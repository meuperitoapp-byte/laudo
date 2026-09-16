import { createClient } from "@/lib/supabase/server";
import { BibliotecaPanel, type CampoParaBiblioteca } from "@/features/respostas-reutilizaveis/biblioteca-panel";
import { BannerErroConsulta } from "@/components/ui/erro-consulta";

export default async function RespostasReutilizaveisPage() {
  const supabase = await createClient();

  const [
    { data: respostas, error: erroRespostas },
    { data: tiposLaudo, error: erroTiposLaudo },
    { data: secoes, error: erroSecoes },
    { data: camposSecao, error: erroCampos },
  ] = await Promise.all([
    supabase.from("respostas_reutilizaveis").select("*").order("created_at", { ascending: false }),
    supabase.from("tipos_laudo").select("*").order("ordem"),
    supabase.from("secoes").select("id, titulo, ordem, tipo_laudo_id"),
    supabase.from("campos_secao").select("id, rotulo, ordem, secao_id"),
  ]);
  // Mesma classe de bug do dashboard "0 processos" (21/09/2026): sem checar
  // `error`, uma falha aqui viraria "Nenhuma resposta salva ainda" — estado
  // vazio normal, mas enganoso quando na verdade é falha de leitura.
  if (erroRespostas) console.error("Respostas reutilizáveis: falha ao listar:", erroRespostas.message);
  if (erroTiposLaudo) console.error("Respostas reutilizáveis: falha ao buscar tipos de laudo:", erroTiposLaudo.message);
  if (erroSecoes) console.error("Respostas reutilizáveis: falha ao buscar seções:", erroSecoes.message);
  if (erroCampos) console.error("Respostas reutilizáveis: falha ao buscar campos:", erroCampos.message);
  const houveErro = Boolean(erroRespostas || erroTiposLaudo || erroSecoes || erroCampos);

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
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="font-title text-2xl font-semibold text-nevoa-900 dark:text-nevoa-50 mb-1">Respostas reutilizáveis</h1>
      <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mb-6">
        Biblioteca pessoal de textos pra reaproveitar entre processos — não depende de nenhum
        processo específico.
      </p>

      {houveErro && (
        <div className="mb-6">
          <BannerErroConsulta mensagem="Não consegui carregar tudo agora — a lista abaixo pode estar incompleta." />
        </div>
      )}

      <BibliotecaPanel respostas={respostas ?? []} tiposLaudo={tiposLaudo ?? []} campos={campos} />
    </main>
  );
}
