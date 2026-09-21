"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alternarValidacaoFato, atualizarFatoComprovado, criarFatoComprovado, excluirFatoComprovado } from "./actions";
import { CLASSIFICACAO_FATO_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { CasoFatosComprovadosRow, CasoQuestoesTecnicasRow, DocumentosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ActionResult = { error: string } | { success: true };

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Fatos comprovados (§12) — só entram aqui via ação manual explícita
 * ("+ Adicionar fato"), NUNCA populado a partir de narrativa_advogado/
 * narrativa_cliente (fatia 1) — essa separação de painéis/tabelas, sem
 * pipeline de código entre elas, é o que garante "narrativa nunca vira
 * fato automaticamente" (§5).
 *
 * `validado_em` é distinto de `classificacao`: um fato "Comprovado" ainda
 * pode não ter sido formalmente revisado — só o que estiver validado migra
 * pro PDF (fatia 8) sem exigir nova checagem (§12).
 */
export function FatosComprovadosPanel({
  processoId,
  itens,
  documentos,
  questoes,
}: {
  processoId: string;
  itens: CasoFatosComprovadosRow[];
  documentos: DocumentosRow[];
  questoes: CasoQuestoesTecnicasRow[];
}) {
  const ordenados = [...itens].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? "") || a.created_at.localeCompare(b.created_at));
  const documentoPorId = new Map(documentos.map((d) => [d.id, d]));

  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Fatos comprovados</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
          §12 — só o que estiver validado migra pro PDF sem nova revisão.
        </p>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum fato comprovado cadastrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((item) => (
            <FatoComprovadoItem
              key={item.id}
              item={item}
              processoId={processoId}
              documentos={documentos}
              questoes={questoes}
              documento={item.documento_id ? (documentoPorId.get(item.documento_id) ?? null) : null}
            />
          ))}
        </ul>
      )}

      <NovoFatoComprovadoForm processoId={processoId} documentos={documentos} questoes={questoes} />
    </div>
  );
}

function FatoComprovadoItem({
  item,
  processoId,
  documentos,
  questoes,
  documento,
}: {
  item: CasoFatosComprovadosRow;
  processoId: string;
  documentos: DocumentosRow[];
  questoes: CasoQuestoesTecnicasRow[];
  documento: DocumentosRow | null;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado = await atualizarFatoComprovado(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function alternarValidacao() {
    setErro(null);
    startTransition(async () => {
      const resultado = await alternarValidacaoFato(item.id, processoId, !item.validado_em);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir o fato "${item.fato}"? Não tem como desfazer.`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirFatoComprovado(item.id, processoId);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Selo variante={item.classificacao === "comprovado" ? "sucesso" : item.classificacao === "controvertido" ? "erro" : "atencao"}>
                {CLASSIFICACAO_FATO_ROTULOS[item.classificacao]}
              </Selo>
              {item.validado_em && <Selo variante="sucesso">Validado {dataCurta(item.validado_em)}</Selo>}
            </div>
            <p className="text-sm text-nevoa-800 dark:text-nevoa-200 mt-1">{item.fato}</p>
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-0.5">
              {[item.data && dataCurta(item.data), documento && `doc.: ${documento.nome_arquivo}`, item.relevancia].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={alternarValidacao}
              disabled={isPending}
              className="rounded-md border border-musgo-300 dark:border-musgo-800 text-musgo-600 dark:text-musgo-400 hover:bg-musgo-100 dark:hover:bg-musgo-950 px-2 py-1 text-xs disabled:opacity-30"
            >
              {item.validado_em ? "Desfazer validação" : "Marcar como validado"}
            </button>
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
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400 mt-2">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-3">
      <form action={salvar} className="space-y-3">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="processo_id" value={processoId} />
        <div>
          <label className={labelClass}>Fato</label>
          <textarea name="fato" rows={2} defaultValue={item.fato} className={inputClass} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Data</label>
            <input type="date" name="data" defaultValue={item.data ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Classificação</label>
            <select name="classificacao" defaultValue={item.classificacao} className={inputClass} required>
              {(Object.keys(CLASSIFICACAO_FATO_ROTULOS) as (keyof typeof CLASSIFICACAO_FATO_ROTULOS)[]).map((c) => (
                <option key={c} value={c}>
                  {CLASSIFICACAO_FATO_ROTULOS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Documento comprobatório</label>
            <select name="documento_id" defaultValue={item.documento_id ?? ""} className={inputClass}>
              <option value="">— Nenhum —</option>
              {documentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome_arquivo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Página/ID</label>
            <input name="pagina_ref" defaultValue={item.pagina_ref ?? ""} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Relevância</label>
            <input name="relevancia" defaultValue={item.relevancia ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Questão técnica relacionada</label>
            <select name="questao_tecnica_id" defaultValue={item.questao_tecnica_id ?? ""} className={inputClass}>
              <option value="">— Nenhuma —</option>
              {questoes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.questao.slice(0, 60)}
                </option>
              ))}
            </select>
          </div>
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

function NovoFatoComprovadoForm({
  processoId,
  documentos,
  questoes,
}: {
  processoId: string;
  documentos: DocumentosRow[];
  questoes: CasoQuestoesTecnicasRow[];
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const resultado: ActionResult = await criarFatoComprovado(formData);
      if ("error" in resultado) {
        setErro(resultado.error);
        return;
      }
      (document.getElementById(`form-novo-fato-${processoId}`) as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <form
      id={`form-novo-fato-${processoId}`}
      action={handleSubmit}
      className="rounded-lg border border-dashed border-nevoa-300 dark:border-nevoa-700 p-4 space-y-3"
    >
      <input type="hidden" name="processo_id" value={processoId} />
      <h3 className="text-sm font-medium text-nevoa-700 dark:text-nevoa-300">+ Adicionar fato</h3>
      <div>
        <label className={labelClass}>Fato</label>
        <textarea name="fato" rows={2} className={inputClass} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Data</label>
          <input type="date" name="data" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Classificação</label>
          <select name="classificacao" className={inputClass} required defaultValue="">
            <option value="" disabled>
              — Escolha —
            </option>
            {(Object.keys(CLASSIFICACAO_FATO_ROTULOS) as (keyof typeof CLASSIFICACAO_FATO_ROTULOS)[]).map((c) => (
              <option key={c} value={c}>
                {CLASSIFICACAO_FATO_ROTULOS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Documento comprobatório</label>
          <select name="documento_id" className={inputClass} defaultValue="">
            <option value="">— Nenhum —</option>
            {documentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome_arquivo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Página/ID</label>
          <input name="pagina_ref" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Relevância</label>
          <input name="relevancia" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Questão técnica relacionada</label>
          <select name="questao_tecnica_id" className={inputClass} defaultValue="">
            <option value="">— Nenhuma —</option>
            {questoes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.questao.slice(0, 60)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && <p className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</p>}

      <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
        Adicionar
      </Botao>
    </form>
  );
}
