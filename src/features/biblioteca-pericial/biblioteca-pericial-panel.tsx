"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarItemBiblioteca, criarItemBiblioteca, excluirItemBiblioteca } from "./actions";
import { CATEGORIA_ROTULOS, CATEGORIAS_ORDENADAS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { ComboboxCatalogo } from "@/components/ui/combobox-catalogo";
import type { BibliotecaPericialRow, CategoriaBibliotecaPericial } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

/** Versão controlada — usada só no formulário de criação (precisa saber a categoria escolhida pra nomear o botão etc.). */
function SeletorCategoria({
  id,
  name,
  value,
  onChange,
}: {
  id?: string;
  name?: string;
  value: CategoriaBibliotecaPericial | "";
  onChange: (v: CategoriaBibliotecaPericial | "") => void;
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value as CategoriaBibliotecaPericial | "")}
      className={inputClass}
      required
    >
      <option value="">Escolha uma categoria</option>
      {CATEGORIAS_ORDENADAS.map((c) => (
        <option key={c} value={c}>
          {CATEGORIA_ROTULOS[c]}
        </option>
      ))}
    </select>
  );
}

/** Versão não controlada (defaultValue) — usada na edição inline, que lê tudo via FormData no submit. */
function OpcoesCategoria() {
  return (
    <>
      {CATEGORIAS_ORDENADAS.map((c) => (
        <option key={c} value={c}>
          {CATEGORIA_ROTULOS[c]}
        </option>
      ))}
    </>
  );
}

function agruparPorArea(itens: BibliotecaPericialRow[]): { chave: string; titulo: string; itens: BibliotecaPericialRow[] }[] {
  const porArea = new Map<string, BibliotecaPericialRow[]>();
  for (const item of itens) {
    const chave = item.area_pericial ?? "sem_area";
    const lista = porArea.get(chave) ?? [];
    lista.push(item);
    porArea.set(chave, lista);
  }
  const grupos = Array.from(porArea.entries()).map(([chave, lista]) => ({
    chave,
    titulo: chave === "sem_area" ? "Sem área específica" : chave,
    itens: lista,
  }));
  grupos.sort((a, b) => {
    if (a.chave === "sem_area") return 1;
    if (b.chave === "sem_area") return -1;
    return a.titulo.localeCompare(b.titulo, "pt-BR");
  });
  return grupos;
}

export function BibliotecaPericialPanel({
  itens,
  areasSugestoes,
}: {
  itens: BibliotecaPericialRow[];
  areasSugestoes: string[];
}) {
  const [filtro, setFiltro] = useState<CategoriaBibliotecaPericial | "todos">("todos");

  const porCategoria = new Map<CategoriaBibliotecaPericial, BibliotecaPericialRow[]>();
  for (const item of itens) {
    const lista = porCategoria.get(item.categoria) ?? [];
    lista.push(item);
    porCategoria.set(item.categoria, lista);
  }

  const categoriasComItens = CATEGORIAS_ORDENADAS.filter((c) => porCategoria.has(c));
  const categoriasParaMostrar = filtro === "todos" ? categoriasComItens : categoriasComItens.filter((c) => c === filtro);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 border-b border-nevoa-200 dark:border-nevoa-800">
        <button
          type="button"
          onClick={() => setFiltro("todos")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            filtro === "todos"
              ? "border-petroleo-600 text-petroleo-700 dark:border-petroleo-400 dark:text-petroleo-400"
              : "border-transparent text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-200"
          }`}
        >
          Todos <span className="text-xs">({itens.length})</span>
        </button>
        {categoriasComItens.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFiltro(c)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filtro === c
                ? "border-petroleo-600 text-petroleo-700 dark:border-petroleo-400 dark:text-petroleo-400"
                : "border-transparent text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-200"
            }`}
          >
            {CATEGORIA_ROTULOS[c]} <span className="text-xs">({porCategoria.get(c)!.length})</span>
          </button>
        ))}
      </div>

      <div className="max-w-3xl space-y-10">
        {itens.length === 0 ? (
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum item salvo ainda.</p>
        ) : (
          categoriasParaMostrar.map((categoria) => (
            <section key={categoria} className="space-y-4">
              <h2 className="font-title text-base font-semibold text-nevoa-900 dark:text-nevoa-100 border-b border-nevoa-200 dark:border-nevoa-800 pb-1.5">
                {CATEGORIA_ROTULOS[categoria]}
              </h2>
              {agruparPorArea(porCategoria.get(categoria)!).map((grupo) => (
                <div key={grupo.chave} className="space-y-2 pl-2">
                  <h3 className="text-sm font-medium text-nevoa-500 dark:text-nevoa-400">{grupo.titulo}</h3>
                  <ul className="space-y-2">
                    {grupo.itens.map((item) => (
                      <ItemBiblioteca key={item.id} item={item} areasSugestoes={areasSugestoes} />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))
        )}

        <NovoItemForm areasSugestoes={areasSugestoes} />
      </div>
    </div>
  );
}

function ItemBiblioteca({ item, areasSugestoes }: { item: BibliotecaPericialRow; areasSugestoes: string[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarItemBiblioteca(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir "${item.titulo}"? Não tem como desfazer.`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirItemBiblioteca(item.id);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-nevoa-900 dark:text-nevoa-100">{item.titulo}</p>
            <p className="text-sm text-nevoa-600 dark:text-nevoa-400 mt-1 whitespace-pre-wrap">{item.conteudo}</p>
            {item.fonte && <p className="text-xs text-nevoa-400 dark:text-nevoa-600 mt-1.5">Fonte: {item.fonte}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={excluir}
              disabled={isPending}
              className="rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2 py-1 text-xs text-vinho-600 dark:text-vinho-400 hover:bg-vinho-100 dark:hover:bg-vinho-950 disabled:opacity-30"
            >
              Excluir
            </button>
          </div>
        </div>
        {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400 mt-2">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-3">
      <form action={salvar} className="space-y-3">
        <input type="hidden" name="id" value={item.id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Categoria</label>
            <select name="categoria" defaultValue={item.categoria} className={inputClass} required>
              <option value="">Escolha uma categoria</option>
              <OpcoesCategoria />
            </select>
          </div>
          <div>
            <label className={labelClass}>Área pericial</label>
            <ComboboxCatalogo
              name="area_pericial"
              sugestoes={areasSugestoes}
              valorInicial={item.area_pericial ?? ""}
              rotuloNovo="Nova área"
              placeholder="Ex.: acidente de trabalho..."
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Título</label>
          <input name="titulo" defaultValue={item.titulo} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Conteúdo</label>
          <textarea name="conteudo" defaultValue={item.conteudo} rows={4} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Fonte (opcional)</label>
          <input name="fonte" defaultValue={item.fonte ?? ""} className={inputClass} placeholder="Norma, acórdão, link..." />
        </div>
        <div className="flex items-center gap-3">
          <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
            Salvar
          </Botao>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100"
          >
            Cancelar
          </button>
          {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
        </div>
      </form>
    </li>
  );
}

function NovoItemForm({ areasSugestoes }: { areasSugestoes: string[] }) {
  const router = useRouter();
  const [categoria, setCategoria] = useState<CategoriaBibliotecaPericial | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarItemBiblioteca(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById("form-novo-item-biblioteca") as HTMLFormElement | null)?.reset();
      setCategoria("");
      router.refresh();
    });
  }

  return (
    <form
      id="form-novo-item-biblioteca"
      action={handleSubmit}
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-3"
    >
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Novo item</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="categoria" className={labelClass}>
            Categoria
          </label>
          <SeletorCategoria id="categoria" name="categoria" value={categoria} onChange={setCategoria} />
        </div>
        <div>
          <label htmlFor="area_pericial" className={labelClass}>
            Área pericial (opcional)
          </label>
          <ComboboxCatalogo
            id="area_pericial"
            name="area_pericial"
            sugestoes={areasSugestoes}
            rotuloNovo="Nova área"
            placeholder="Ex.: acidente de trabalho..."
          />
        </div>
      </div>

      <div>
        <label htmlFor="titulo" className={labelClass}>
          Título
        </label>
        <input id="titulo" name="titulo" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="conteudo" className={labelClass}>
          Conteúdo
        </label>
        <textarea id="conteudo" name="conteudo" rows={4} required className={inputClass} />
      </div>

      <div>
        <label htmlFor="fonte" className={labelClass}>
          Fonte (opcional)
        </label>
        <input id="fonte" name="fonte" className={inputClass} placeholder="Norma, acórdão, link..." />
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Salvar item
      </Botao>
    </form>
  );
}
