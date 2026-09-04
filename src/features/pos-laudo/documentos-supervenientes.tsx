"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarDocumentoSuperveniente,
  removerDocumentoSuperveniente,
  salvarMetadadosSuperveniente,
} from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

const PAPEL_ROTULOS: Record<string, string> = {
  superveniente: "Superveniente",
  laudo_analisado: "Laudo analisado",
  manifestacao_analisada: "Manifestação analisada",
};
const PAPEIS = ["superveniente", "laudo_analisado", "manifestacao_analisada"] as const;

const RELEVANCIA_ROTULOS: Record<string, string> = {
  sem_relevancia: "Sem relevância",
  complementar: "Complementar",
  relevante: "Relevante",
  potencialmente_modificador: "Potencialmente modificador",
  determinante: "Determinante",
};
const RELEVANCIAS = [
  "sem_relevancia",
  "complementar",
  "relevante",
  "potencialmente_modificador",
  "determinante",
] as const;

export interface DocSuperveniente {
  pld_id: string;
  documento_id: string;
  nome_arquivo: string;
  signed_url: string | null;
  papel: string;
  apresentante: string | null;
  data_juntada: string | null;
  paginas: string | null;
  existencia_previa: boolean | null;
  disponivel_ao_perito_antes: boolean | null;
  relevancia: string | null;
  impacto: string | null;
  observacao_tecnica: string | null;
  ja_enfrentado: boolean;
}

const triLabel = (v: boolean | null) => (v === null ? "" : v ? "sim" : "nao");

export function DocumentosSupervenientes({
  processoId,
  cicloId,
  docs,
}: {
  processoId: string;
  cicloId: string;
  docs: DocSuperveniente[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, startEnvio] = useTransition();

  function adicionar(formData: FormData) {
    setMensagem(null);
    startEnvio(async () => {
      const r = await adicionarDocumentoSuperveniente(cicloId, processoId, formData);
      if ("error" in r) {
        setMensagem({ tipo: "erro", texto: r.error });
        return;
      }
      (document.getElementById("form-doc-superveniente") as HTMLFormElement | null)?.reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
        Documentos supervenientes
      </h2>
      <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
        Documentos juntados <strong>depois</strong> do laudo. Sobem pelo mesmo lugar dos demais
        documentos do processo, mas ficam marcados como supervenientes e <strong>nunca</strong>{" "}
        entram na contagem nem na tabela de documentos do laudo original.
      </p>

      {docs.length === 0 ? (
        <p className="text-sm text-nevoa-500 dark:text-nevoa-400">Nenhum ainda.</p>
      ) : (
        <ul className="space-y-4">
          {docs.map((d) => (
            <DocCard
              key={d.pld_id}
              processoId={processoId}
              cicloId={cicloId}
              doc={d}
              onErro={(t) => setMensagem({ tipo: "erro", texto: t })}
              onOk={(t) => setMensagem({ tipo: "ok", texto: t })}
            />
          ))}
        </ul>
      )}

      <form
        id="form-doc-superveniente"
        action={adicionar}
        className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-3"
      >
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Adicionar documento superveniente
        </h3>
        <div>
          <label htmlFor="arquivo" className={labelClass}>
            Arquivo (até 25MB)
          </label>
          <input id="arquivo" name="arquivo" type="file" required className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="papel" className={labelClass}>
              Papel
            </label>
            <select id="papel" name="papel" defaultValue="superveniente" className={inputClass}>
              {PAPEIS.map((p) => (
                <option key={p} value={p}>
                  {PAPEL_ROTULOS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="relevancia" className={labelClass}>
              Relevância
            </label>
            <select id="relevancia" name="relevancia" defaultValue="" className={inputClass}>
              <option value="">—</option>
              {RELEVANCIAS.map((r) => (
                <option key={r} value={r}>
                  {RELEVANCIA_ROTULOS[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="apresentante" className={labelClass}>
              Apresentante
            </label>
            <input
              id="apresentante"
              name="apresentante"
              placeholder="ex.: Autor, Réu, Juízo..."
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="data_juntada" className={labelClass}>
              Data da juntada
            </label>
            <input id="data_juntada" name="data_juntada" type="date" className={inputClass} />
          </div>
          <div>
            <label htmlFor="paginas" className={labelClass}>
              Páginas
            </label>
            <input id="paginas" name="paginas" placeholder="ex.: 1-12" className={inputClass} />
          </div>
          <div>
            <label htmlFor="existencia_previa" className={labelClass}>
              Já existia antes do laudo?
            </label>
            <select id="existencia_previa" name="existencia_previa" defaultValue="" className={inputClass}>
              <option value="">—</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </div>
          <div>
            <label htmlFor="disponivel_ao_perito_antes" className={labelClass}>
              Estava disponível ao perito à época?
            </label>
            <select
              id="disponivel_ao_perito_antes"
              name="disponivel_ao_perito_antes"
              defaultValue=""
              className={inputClass}
            >
              <option value="">—</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="impacto" className={labelClass}>
            Impacto
          </label>
          <textarea id="impacto" name="impacto" rows={2} className={inputClass} />
        </div>
        <div>
          <label htmlFor="observacao_tecnica" className={labelClass}>
            Observação técnica
          </label>
          <textarea id="observacao_tecnica" name="observacao_tecnica" rows={2} className={inputClass} />
        </div>
        <Botao type="submit" carregando={enviando} textoCarregando="Enviando…">
          Enviar documento superveniente
        </Botao>
      </form>

      {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}

function DocCard({
  processoId,
  cicloId,
  doc,
  onErro,
  onOk,
}: {
  processoId: string;
  cicloId: string;
  doc: DocSuperveniente;
  onErro: (texto: string) => void;
  onOk: (texto: string) => void;
}) {
  const router = useRouter();

  const doBanco = {
    papel: doc.papel,
    apresentante: doc.apresentante ?? "",
    dataJuntada: doc.data_juntada ?? "",
    paginas: doc.paginas ?? "",
    existenciaPrevia: triLabel(doc.existencia_previa),
    disponivelAoPeritoAntes: triLabel(doc.disponivel_ao_perito_antes),
    relevancia: doc.relevancia ?? "",
    impacto: doc.impacto ?? "",
    observacaoTecnica: doc.observacao_tecnica ?? "",
    jaEnfrentado: doc.ja_enfrentado,
  };

  const [f, setF] = useState(doBanco);
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(doBanco));
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [docSync, setDocSync] = useState(doc);
  if (doc !== docSync && !dirty && !salvando) {
    setDocSync(doc);
    setF(doBanco);
    setSalvoSnap(JSON.stringify(doBanco));
  }

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  async function salvar() {
    setSalvando(true);
    const r = await salvarMetadadosSuperveniente({
      pldId: doc.pld_id,
      cicloId,
      processoId,
      papel: f.papel,
      apresentante: f.apresentante || null,
      dataJuntada: f.dataJuntada || null,
      paginas: f.paginas || null,
      existenciaPrevia: f.existenciaPrevia === "" ? null : f.existenciaPrevia === "sim",
      disponivelAoPeritoAntes:
        f.disponivelAoPeritoAntes === "" ? null : f.disponivelAoPeritoAntes === "sim",
      relevancia: f.relevancia || null,
      impacto: f.impacto || null,
      observacaoTecnica: f.observacaoTecnica || null,
      jaEnfrentado: f.jaEnfrentado,
    });
    setSalvando(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    onOk("Documento superveniente salvo.");
    router.refresh();
  }

  async function remover() {
    if (
      !window.confirm(
        `Remover "${doc.nome_arquivo}"? Remove o documento do processo e do armazenamento — não tem como desfazer.`,
      )
    )
      return;
    setRemovendo(true);
    const r = await removerDocumentoSuperveniente({
      pldId: doc.pld_id,
      documentoId: doc.documento_id,
      cicloId,
      processoId,
    });
    setRemovendo(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {doc.signed_url ? (
              <a
                href={doc.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-petroleo-600 hover:underline dark:text-petroleo-400 truncate"
              >
                {doc.nome_arquivo}
              </a>
            ) : (
              <span className="font-medium text-nevoa-900 dark:text-nevoa-100 truncate">
                {doc.nome_arquivo}
              </span>
            )}
            <Selo variante="neutro">{PAPEL_ROTULOS[doc.papel] ?? doc.papel}</Selo>
          </div>
        </div>
        <button
          type="button"
          onClick={remover}
          disabled={removendo || salvando}
          className="shrink-0 text-xs text-vinho-600 hover:underline dark:text-vinho-400 disabled:opacity-40"
        >
          Remover
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Papel</label>
          <select value={f.papel} onChange={(e) => set("papel", e.target.value)} className={inputClass}>
            {PAPEIS.map((p) => (
              <option key={p} value={p}>
                {PAPEL_ROTULOS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Relevância</label>
          <select
            value={f.relevancia}
            onChange={(e) => set("relevancia", e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {RELEVANCIAS.map((r) => (
              <option key={r} value={r}>
                {RELEVANCIA_ROTULOS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Apresentante</label>
          <input
            value={f.apresentante}
            onChange={(e) => set("apresentante", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Data da juntada</label>
          <input
            type="date"
            value={f.dataJuntada}
            onChange={(e) => set("dataJuntada", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Páginas</label>
          <input value={f.paginas} onChange={(e) => set("paginas", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Já enfrentado na matriz?</label>
          <select
            value={f.jaEnfrentado ? "sim" : "nao"}
            onChange={(e) => set("jaEnfrentado", e.target.value === "sim")}
            className={inputClass}
          >
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Já existia antes do laudo?</label>
          <select
            value={f.existenciaPrevia}
            onChange={(e) => set("existenciaPrevia", e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Disponível ao perito à época?</label>
          <select
            value={f.disponivelAoPeritoAntes}
            onChange={(e) => set("disponivelAoPeritoAntes", e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Impacto</label>
        <textarea value={f.impacto} onChange={(e) => set("impacto", e.target.value)} rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Observação técnica</label>
        <textarea
          value={f.observacaoTecnica}
          onChange={(e) => set("observacaoTecnica", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>

      <Botao onClick={() => salvar()} disabled={!dirty && !salvando} carregando={salvando} textoCarregando="Salvando…">
        {dirty ? "Salvar" : "Salvo"}
      </Botao>
    </li>
  );
}
