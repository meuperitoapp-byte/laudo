"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  atualizarRespostaReutilizavel,
  criarRespostaReutilizavel,
  excluirRespostaReutilizavel,
} from "./actions";
import { Botao } from "@/components/ui/button";
import type { RespostasReutilizaveisRow, TiposLaudoRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

export interface CampoParaBiblioteca {
  id: string;
  rotulo: string;
  tipoLaudoId: string;
  secaoTitulo: string;
  secaoOrdem: number;
  ordem: number;
}

type ActionResult = { error: string } | { success: true };

function SeletorTipoECampo({
  tiposLaudo,
  campos,
  tipoLaudoId,
  campoId,
  onTipoLaudoChange,
  onCampoChange,
}: {
  tiposLaudo: TiposLaudoRow[];
  campos: CampoParaBiblioteca[];
  tipoLaudoId: string;
  campoId: string;
  onTipoLaudoChange: (v: string) => void;
  onCampoChange: (v: string) => void;
}) {
  const camposDoTipo = campos
    .filter((c) => c.tipoLaudoId === tipoLaudoId)
    .sort((a, b) => a.secaoOrdem - b.secaoOrdem || a.ordem - b.ordem);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={labelClass}>Tipo de laudo</label>
        <select
          value={tipoLaudoId}
          onChange={(e) => onTipoLaudoChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Genérico (qualquer tipo)</option>
          {tiposLaudo.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Campo específico</label>
        <select
          value={campoId}
          onChange={(e) => onCampoChange(e.target.value)}
          disabled={!tipoLaudoId}
          className={inputClass}
        >
          <option value="">{tipoLaudoId ? "Texto genérico deste tipo" : "Escolha um tipo de laudo primeiro"}</option>
          {camposDoTipo.map((c) => (
            <option key={c.id} value={c.id}>
              {c.secaoTitulo} — {c.rotulo}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function BibliotecaPanel({
  respostas,
  tiposLaudo,
  campos,
}: {
  respostas: RespostasReutilizaveisRow[];
  tiposLaudo: TiposLaudoRow[];
  campos: CampoParaBiblioteca[];
}) {
  const tipoLaudoNome = new Map(tiposLaudo.map((t) => [t.id, t.nome]));
  const campoInfo = new Map(campos.map((c) => [c.id, c]));

  const porTipo = new Map<string, RespostasReutilizaveisRow[]>();
  for (const r of respostas) {
    const chave = r.tipo_laudo_id ?? "generico";
    const lista = porTipo.get(chave) ?? [];
    lista.push(r);
    porTipo.set(chave, lista);
  }

  const gruposOrdenados: { chave: string; titulo: string; itens: RespostasReutilizaveisRow[] }[] = [
    ...tiposLaudo
      .filter((t) => porTipo.has(t.id))
      .map((t) => ({ chave: t.id, titulo: t.nome, itens: porTipo.get(t.id)! })),
  ];
  if (porTipo.has("generico")) {
    gruposOrdenados.push({ chave: "generico", titulo: "Genérico", itens: porTipo.get("generico")! });
  }

  return (
    <div className="space-y-10 max-w-3xl">
      {respostas.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma resposta reutilizável salva ainda.</p>
      ) : (
        gruposOrdenados.map((grupo) => (
          <section key={grupo.chave} className="space-y-4">
            <h2 className="font-title text-base font-semibold text-nevoa-900 dark:text-nevoa-100 border-b border-nevoa-200 dark:border-nevoa-800 pb-1.5">
              {grupo.titulo}
            </h2>
            {agruparPorCampo(grupo.itens, campoInfo).map((sub) => (
              <div key={sub.chave} className="space-y-2 pl-2">
                <h3 className="text-sm font-medium text-nevoa-500 dark:text-nevoa-400">{sub.titulo}</h3>
                <ul className="space-y-2">
                  {sub.itens.map((item) => (
                    <RespostaItem
                      key={item.id}
                      item={item}
                      tiposLaudo={tiposLaudo}
                      campos={campos}
                      tipoLaudoNome={tipoLaudoNome}
                      campoInfo={campoInfo}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      )}

      <NovaRespostaForm tiposLaudo={tiposLaudo} campos={campos} />
    </div>
  );
}

function agruparPorCampo(
  itens: RespostasReutilizaveisRow[],
  campoInfo: Map<string, CampoParaBiblioteca>
): { chave: string; titulo: string; itens: RespostasReutilizaveisRow[] }[] {
  const porCampo = new Map<string, RespostasReutilizaveisRow[]>();
  for (const r of itens) {
    const chave = r.campo_id ?? "texto_livre";
    const lista = porCampo.get(chave) ?? [];
    lista.push(r);
    porCampo.set(chave, lista);
  }

  const grupos: { chave: string; titulo: string; ordem: number; itens: RespostasReutilizaveisRow[] }[] = [];
  for (const [chave, lista] of porCampo) {
    if (chave === "texto_livre") {
      grupos.push({ chave, titulo: "Texto livre", ordem: -1, itens: lista });
    } else {
      const campo = campoInfo.get(chave);
      grupos.push({
        chave,
        titulo: campo ? `${campo.secaoTitulo} — ${campo.rotulo}` : "Campo removido",
        ordem: campo ? campo.secaoOrdem * 1000 + campo.ordem : 999999,
        itens: lista,
      });
    }
  }
  return grupos.sort((a, b) => a.ordem - b.ordem);
}

function RespostaItem({
  item,
  tiposLaudo,
  campos,
  tipoLaudoNome,
  campoInfo,
}: {
  item: RespostasReutilizaveisRow;
  tiposLaudo: TiposLaudoRow[];
  campos: CampoParaBiblioteca[];
  tipoLaudoNome: Map<string, string>;
  campoInfo: Map<string, CampoParaBiblioteca>;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(item.titulo);
  const [conteudo, setConteudo] = useState(item.conteudo);
  const [tipoLaudoId, setTipoLaudoId] = useState(item.tipo_laudo_id ?? "");
  const [campoId, setCampoId] = useState(item.campo_id ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarRespostaReutilizavel({
        id: item.id,
        titulo,
        conteudo,
        tipoLaudoId: tipoLaudoId || null,
        campoId: campoId || null,
      });
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
      const resultado = await excluirRespostaReutilizavel(item.id);
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
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-3 space-y-3">
      <div>
        <label className={labelClass}>Título</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Conteúdo</label>
        <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={4} className={inputClass} />
      </div>
      <SeletorTipoECampo
        tiposLaudo={tiposLaudo}
        campos={campos}
        tipoLaudoId={tipoLaudoId}
        campoId={campoId}
        onTipoLaudoChange={(v) => {
          setTipoLaudoId(v);
          setCampoId("");
        }}
        onCampoChange={setCampoId}
      />
      <div className="flex items-center gap-3">
        <Botao onClick={salvar} carregando={isPending} textoCarregando="Salvando…">
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
      <p className="text-xs text-nevoa-400 dark:text-nevoa-600">
        Grupo atual: {item.tipo_laudo_id ? tipoLaudoNome.get(item.tipo_laudo_id) ?? "Tipo removido" : "Genérico"}
        {" · "}
        {item.campo_id ? campoInfo.get(item.campo_id)?.rotulo ?? "Campo removido" : "Texto livre"}
      </p>
    </li>
  );
}

function NovaRespostaForm({
  tiposLaudo,
  campos,
}: {
  tiposLaudo: TiposLaudoRow[];
  campos: CampoParaBiblioteca[];
}) {
  const router = useRouter();
  const [tipoLaudoId, setTipoLaudoId] = useState("");
  const [campoId, setCampoId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarRespostaReutilizavel(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById("form-nova-resposta-reutilizavel") as HTMLFormElement | null)?.reset();
      setTipoLaudoId("");
      setCampoId("");
      router.refresh();
    });
  }

  return (
    <form
      id="form-nova-resposta-reutilizavel"
      action={handleSubmit}
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-3"
    >
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Nova resposta reutilizável</h2>

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

      <SeletorTipoECampo
        tiposLaudo={tiposLaudo}
        campos={campos}
        tipoLaudoId={tipoLaudoId}
        campoId={campoId}
        onTipoLaudoChange={(v) => {
          setTipoLaudoId(v);
          setCampoId("");
        }}
        onCampoChange={setCampoId}
      />
      <input type="hidden" name="tipo_laudo_id" value={tipoLaudoId} />
      <input type="hidden" name="campo_id" value={campoId} />

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Salvar resposta
      </Botao>
    </form>
  );
}
