"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  criarDesfecho,
  salvarDesfecho,
  excluirDesfecho,
  vincularDocumentoRelacionado,
  desvincularDocumentoRelacionado,
} from "./actions";
import {
  AREA_ROTULOS,
  PARTE_ASSISTIDA_ROTULOS,
  TIPO_DECISAO_ROTULOS,
  RESULTADO_PARTE_ASSISTIDA_ROTULOS,
  STATUS_DECISAO_ROTULOS,
  RESULTADO_PERICIA_ROTULOS,
  RESULTADO_SELO_VARIANTE,
} from "./catalogos";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import type { DesfechosJudiciaisRow, DesfechoDocumentosRelacionadosRow, DocumentosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

function dataCurta(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

interface DesfechoComRelacionados extends DesfechosJudiciaisRow {
  documentosRelacionados: (DesfechoDocumentosRelacionadosRow & { nome_arquivo: string | null })[];
}

/** §24.2 — linha do tempo de decisões do processo. Múltiplos registros, ordem cronológica, nenhum apaga o anterior. */
export function DesfechoTimelinePanel({
  processoId,
  desfechos,
  documentos,
}: {
  processoId: string;
  desfechos: DesfechoComRelacionados[];
  documentos: DocumentosRow[];
}) {
  const ordenados = [...desfechos].sort((a, b) => a.data_decisao.localeCompare(b.data_decisao));
  return (
    <div className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">Linha do tempo de decisões</h2>
      {ordenados.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhuma decisão registrada ainda.</p>
      ) : (
        <ul className="space-y-3">
          {ordenados.map((d, i) => (
            <DesfechoItem key={d.id} item={d} numero={i + 1} processoId={processoId} documentos={documentos} />
          ))}
        </ul>
      )}
      <NovoDesfechoForm processoId={processoId} documentos={documentos} />
    </div>
  );
}

function CamposFormulario({ item, documentos }: { item?: DesfechosJudiciaisRow; documentos: DocumentosRow[] }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Área</label>
          <select name="area" defaultValue={item?.area ?? "outra"} className={inputClass}>
            {Object.entries(AREA_ROTULOS).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Subárea / demanda</label>
          <input name="subarea_demanda" defaultValue={item?.subarea_demanda ?? ""} placeholder="Ex.: medicamento, erro médico…" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Data da decisão *</label>
          <input type="date" name="data_decisao" required defaultValue={item?.data_decisao ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Parte assistida</label>
          <select name="parte_assistida" defaultValue={item?.parte_assistida ?? ""} className={inputClass}>
            <option value="">Selecione…</option>
            {Object.entries(PARTE_ASSISTIDA_ROTULOS).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Tipo de decisão</label>
          <select name="tipo_decisao" defaultValue={item?.tipo_decisao ?? ""} className={inputClass}>
            <option value="">Selecione…</option>
            {Object.entries(TIPO_DECISAO_ROTULOS).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status da decisão</label>
          <select name="status_decisao" defaultValue={item?.status_decisao ?? ""} className={inputClass}>
            <option value="">Selecione…</option>
            {Object.entries(STATUS_DECISAO_ROTULOS).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Resultado p/ a parte assistida</label>
          <select name="resultado_parte_assistida" defaultValue={item?.resultado_parte_assistida ?? ""} className={inputClass}>
            <option value="">Selecione…</option>
            {Object.entries(RESULTADO_PARTE_ASSISTIDA_ROTULOS).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Tribunal</label>
          <input name="tribunal" defaultValue={item?.tribunal ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>UF</label>
          <input name="uf" maxLength={2} defaultValue={item?.uf ?? ""} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Houve prova pericial?</label>
          <select name="houve_prova_pericial" defaultValue={item?.houve_prova_pericial == null ? "" : item.houve_prova_pericial ? "sim" : "nao"} className={inputClass}>
            <option value="">Selecione…</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Resultado da perícia</label>
          <select name="resultado_pericia" defaultValue={item?.resultado_pericia ?? ""} className={inputClass}>
            <option value="">Selecione…</option>
            {Object.entries(RESULTADO_PERICIA_ROTULOS).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Serviços PERICONS no caso (separados por vírgula)</label>
        <input name="servicos_pericons_no_caso" defaultValue={item?.servicos_pericons_no_caso.join(", ") ?? ""} placeholder="Viabilidade, Quesitos, Parecer…" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Observação técnica</label>
        <textarea name="observacao_tecnica" rows={2} defaultValue={item?.observacao_tecnica ?? ""} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Decisão judicial (documento já anexado)</label>
        <select name="decisao_documento_id" defaultValue={item?.decisao_documento_id ?? ""} className={inputClass}>
          <option value="">Nenhum</option>
          {documentos.map((d) => (
            <option key={d.id} value={d.id}>{d.nome_arquivo}</option>
          ))}
        </select>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
          O upload é feito na aba Documentos do processo — aqui só se indica qual já anexado é a decisão.
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
          <input type="checkbox" name="desfecho_atual" defaultChecked={item?.desfecho_atual ?? false} />
          É o desfecho atual
        </label>
        <label className="flex items-center gap-2 text-sm text-nevoa-700 dark:text-nevoa-300">
          <input type="checkbox" name="desfecho_definitivo" defaultChecked={item?.desfecho_definitivo ?? false} />
          É o desfecho definitivo
        </label>
      </div>
      <p className="text-xs text-nevoa-500 dark:text-nevoa-400">Marcar aqui desmarca automaticamente qualquer outro registro deste processo com a mesma marcação.</p>
    </>
  );
}

function DesfechoItem({ item, numero, processoId, documentos }: { item: DesfechoComRelacionados; numero: number; processoId: string; documentos: DocumentosRow[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [documentoSelecionado, setDocumentoSelecionado] = useState("");
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await salvarDesfecho(item.id, processoId, formData);
      if ("error" in r) return setErro(r.error);
      setEditando(false);
      router.refresh();
    });
  }
  function excluir() {
    if (!window.confirm("Excluir este registro de decisão? Não tem como desfazer.")) return;
    startTransition(async () => {
      const r = await excluirDesfecho(item.id, processoId);
      if ("error" in r) return setErro(r.error);
      router.refresh();
    });
  }
  function vincular() {
    if (!documentoSelecionado) return;
    startTransition(async () => {
      const r = await vincularDocumentoRelacionado(item.id, processoId, documentoSelecionado);
      if ("error" in r) return setErro(r.error);
      setDocumentoSelecionado("");
      router.refresh();
    });
  }
  function desvincular(id: string) {
    startTransition(async () => {
      const r = await desvincularDocumentoRelacionado(id, processoId);
      if ("error" in r) return setErro(r.error);
      router.refresh();
    });
  }

  const documentosDisponiveis = documentos.filter((d) => !item.documentosRelacionados.some((dr) => dr.documento_id === d.id));

  if (!editando) {
    return (
      <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-25 dark:bg-nevoa-950/40 p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-nevoa-800 dark:text-nevoa-200">
              {numero}. {dataCurta(item.data_decisao)}{item.tipo_decisao ? ` — ${TIPO_DECISAO_ROTULOS[item.tipo_decisao]}` : ""}
            </p>
            {item.subarea_demanda && <p className="text-xs text-nevoa-500 dark:text-nevoa-400">{item.subarea_demanda}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {item.desfecho_atual && <Selo variante="neutro">Atual</Selo>}
            {item.desfecho_definitivo && <Selo variante="sucesso">Definitivo</Selo>}
            {item.resultado_parte_assistida && <Selo variante={RESULTADO_SELO_VARIANTE[item.resultado_parte_assistida]}>{RESULTADO_PARTE_ASSISTIDA_ROTULOS[item.resultado_parte_assistida]}</Selo>}
            <button type="button" onClick={() => setEditando(true)} className="rounded-md border border-nevoa-300 dark:border-nevoa-700 text-nevoa-600 dark:text-nevoa-400 hover:bg-nevoa-100 dark:hover:bg-nevoa-800 px-2 py-1 text-xs">Editar</button>
            <button type="button" onClick={excluir} disabled={isPending} className="rounded-md border border-nevoa-300 dark:border-nevoa-700 px-2 py-1 text-xs text-vinho-600 dark:text-vinho-400 hover:bg-vinho-100 dark:hover:bg-vinho-950 disabled:opacity-30">Excluir</button>
          </div>
        </div>
        {item.observacao_tecnica && <p className="text-xs text-nevoa-600 dark:text-nevoa-400">{item.observacao_tecnica}</p>}
        {item.houve_prova_pericial != null && (
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            Prova pericial: {item.houve_prova_pericial ? "Sim" : "Não"}{item.resultado_pericia ? ` — ${RESULTADO_PERICIA_ROTULOS[item.resultado_pericia]}` : ""}
          </p>
        )}
        <div className="pt-2 border-t border-nevoa-200 dark:border-nevoa-800 space-y-1.5">
          <p className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400">Documentos relacionados</p>
          {item.documentosRelacionados.length === 0 ? (
            <p className="text-xs text-nevoa-400 dark:text-nevoa-600">Nenhum vinculado.</p>
          ) : (
            <ul className="space-y-1">
              {item.documentosRelacionados.map((dr) => (
                <li key={dr.id} className="flex items-center justify-between text-xs text-nevoa-700 dark:text-nevoa-300">
                  {dr.nome_arquivo ?? "Documento"}
                  <button type="button" onClick={() => desvincular(dr.id)} className="text-vinho-600 dark:text-vinho-400 hover:underline">Remover</button>
                </li>
              ))}
            </ul>
          )}
          {documentosDisponiveis.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <select value={documentoSelecionado} onChange={(e) => setDocumentoSelecionado(e.target.value)} className={inputClass}>
                <option value="">Selecione um documento…</option>
                {documentosDisponiveis.map((d) => (
                  <option key={d.id} value={d.id}>{d.nome_arquivo}</option>
                ))}
              </select>
              <Botao variante="secundaria" onClick={vincular} disabled={!documentoSelecionado || isPending}>Vincular</Botao>
            </div>
          )}
        </div>
        {erro && <p className="text-xs text-vinho-600 dark:text-vinho-400">{erro}</p>}
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-petroleo-300 dark:border-petroleo-800 bg-white dark:bg-nevoa-900/40 p-4">
      <form action={salvar} className="space-y-3">
        <CamposFormulario item={item} documentos={documentos} />
        <div className="flex items-center gap-3">
          <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Salvar</Botao>
          <button type="button" onClick={() => setEditando(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
          {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
        </div>
      </form>
    </li>
  );
}

function NovoDesfechoForm({ processoId, documentos }: { processoId: string; documentos: DocumentosRow[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function criar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await criarDesfecho(processoId, formData);
      if ("error" in r) return setErro(r.error);
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) {
    return <Botao variante="secundaria" onClick={() => setAberto(true)}>+ Registrar decisão</Botao>;
  }

  return (
    <form action={criar} className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 p-4 space-y-3">
      <CamposFormulario documentos={documentos} />
      <div className="flex items-center gap-3">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">Registrar</Botao>
        <button type="button" onClick={() => setAberto(false)} className="text-sm text-nevoa-500 hover:text-nevoa-800 dark:text-nevoa-400 dark:hover:text-nevoa-100">Cancelar</button>
        {erro && <span className="text-sm text-vinho-600 dark:text-vinho-400">{erro}</span>}
      </div>
    </form>
  );
}
