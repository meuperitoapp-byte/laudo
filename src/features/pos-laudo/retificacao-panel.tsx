"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarItemRetificacao,
  removerItemRetificacao,
  salvarAnaliseRetificacao,
  salvarItemRetificacao,
} from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import { NATUREZA_ERRO_ORDENADA, NATUREZA_ERRO_ROTULOS } from "./rotulos";
import type { PosLaudoRetificacaoItensRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Retificação de Erro Material (fatia 6): itens "onde se lê / leia-se"
 * (seção III do modelo) + Análise da Repercussão (seção IV — a principal
 * trava do módulo, pergunta EXPLÍCITA à perita, nunca inferida). As duas
 * partes ficam sempre editáveis, independente uma da outra — a trava é só na
 * geração do documento (ver compilar-retificacao.ts).
 */
export function RetificacaoPanel({
  processoId,
  cicloId,
  itens,
  afetaConclusao,
  justificativa,
}: {
  processoId: string;
  cicloId: string;
  itens: PosLaudoRetificacaoItensRow[];
  afetaConclusao: boolean | null;
  justificativa: string | null;
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [adicionando, setAdicionando] = useState(false);

  async function novoItem() {
    setAdicionando(true);
    setMensagem(null);
    const r = await adicionarItemRetificacao(cicloId, processoId);
    setAdicionando(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div id="retificacao-itens">
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-2">
          Retificação — onde se lê / leia-se
        </h2>
        {itens.length === 0 ? (
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
            Nenhum item ainda. Adicione um item para cada trecho do documento original que precisa de
            correção.
          </p>
        ) : (
          <ol className="space-y-4">
            {itens.map((item, i) => (
              <ItemRetificacaoCard
                key={item.id}
                numero={i + 1}
                processoId={processoId}
                cicloId={cicloId}
                item={item}
                onErro={(t) => setMensagem({ tipo: "erro", texto: t })}
                onOk={(t) => setMensagem({ tipo: "ok", texto: t })}
              />
            ))}
          </ol>
        )}
      </div>

      <Botao onClick={novoItem} carregando={adicionando} textoCarregando="Adicionando…">
        Adicionar item
      </Botao>

      <AnaliseRepercussaoControl
        processoId={processoId}
        cicloId={cicloId}
        afetaConclusaoInicial={afetaConclusao}
        justificativaInicial={justificativa}
        onErro={(t) => setMensagem({ tipo: "erro", texto: t })}
        onOk={(t) => setMensagem({ tipo: "ok", texto: t })}
      />

      {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}

function ItemRetificacaoCard({
  numero,
  processoId,
  cicloId,
  item,
  onErro,
  onOk,
}: {
  numero: number;
  processoId: string;
  cicloId: string;
  item: PosLaudoRetificacaoItensRow;
  onErro: (texto: string) => void;
  onOk: (texto: string) => void;
}) {
  const router = useRouter();

  const doBanco = {
    pagina: item.pagina ?? "",
    itemSecao: item.item_secao ?? "",
    ondeSeLe: item.onde_se_le,
    leiaSe: item.leia_se,
    naturezaErro: item.natureza_erro ?? "",
  };

  const [f, setF] = useState(doBanco);
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(doBanco));
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [itemSync, setItemSync] = useState(item);
  if (item !== itemSync && !dirty && !salvando) {
    setItemSync(item);
    setF(doBanco);
    setSalvoSnap(JSON.stringify(doBanco));
  }

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function salvar() {
    setSalvando(true);
    const r = await salvarItemRetificacao({
      itemId: item.id,
      cicloId,
      processoId,
      pagina: f.pagina || null,
      itemSecao: f.itemSecao || null,
      ondeSeLe: f.ondeSeLe,
      leiaSe: f.leiaSe,
      naturezaErro: f.naturezaErro || null,
    });
    setSalvando(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    onOk(`Item ${numero} salvo.`);
    router.refresh();
  }

  async function remover() {
    if (!window.confirm(`Remover o item ${numero}? Não tem como desfazer.`)) return;
    setRemovendo(true);
    const r = await removerItemRetificacao(item.id, cicloId, processoId);
    setRemovendo(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    router.refresh();
  }

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const semConteudo = !f.ondeSeLe.trim() || !f.leiaSe.trim();

  return (
    <li
      id={`retificacao-item-${item.id}`}
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-4 space-y-3 scroll-mt-24"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-nevoa-500 dark:text-nevoa-400">
          Item {numero}
          {semConteudo && <Selo variante="atencao">Onde se lê / Leia-se incompletos</Selo>}
        </span>
        <button
          type="button"
          onClick={remover}
          disabled={removendo || salvando}
          className="text-xs text-vinho-600 hover:underline dark:text-vinho-400 disabled:opacity-40"
        >
          Remover item
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Página</label>
          <input value={f.pagina} onChange={(e) => set("pagina", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Item / seção</label>
          <input value={f.itemSecao} onChange={(e) => set("itemSecao", e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Onde se lê (transcrição exata do trecho original)</label>
        <textarea
          value={f.ondeSeLe}
          onChange={(e) => set("ondeSeLe", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Leia-se (texto correto)</label>
        <textarea value={f.leiaSe} onChange={(e) => set("leiaSe", e.target.value)} rows={2} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Natureza do erro</label>
        <select value={f.naturezaErro} onChange={(e) => set("naturezaErro", e.target.value)} className={inputClass}>
          <option value="">—</option>
          {NATUREZA_ERRO_ORDENADA.map((n) => (
            <option key={n} value={n}>
              {NATUREZA_ERRO_ROTULOS[n]}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-1">
        <Botao onClick={() => salvar()} disabled={!dirty && !salvando} carregando={salvando} textoCarregando="Salvando…">
          {dirty ? "Salvar item" : "Item salvo"}
        </Botao>
      </div>
    </li>
  );
}

function AnaliseRepercussaoControl({
  processoId,
  cicloId,
  afetaConclusaoInicial,
  justificativaInicial,
  onErro,
  onOk,
}: {
  processoId: string;
  cicloId: string;
  afetaConclusaoInicial: boolean | null;
  justificativaInicial: string | null;
  onErro: (texto: string) => void;
  onOk: (texto: string) => void;
}) {
  const router = useRouter();

  const paraValor = (v: boolean | null) => (v === true ? "sim" : v === false ? "nao" : "");
  const doBanco = {
    afetaConclusao: paraValor(afetaConclusaoInicial),
    justificativa: justificativaInicial ?? "",
  };

  const [f, setF] = useState(doBanco);
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(doBanco));
  const [salvando, setSalvando] = useState(false);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [sync, setSync] = useState({ afetaConclusaoInicial, justificativaInicial });
  if (
    (afetaConclusaoInicial !== sync.afetaConclusaoInicial || justificativaInicial !== sync.justificativaInicial) &&
    !dirty &&
    !salvando
  ) {
    setSync({ afetaConclusaoInicial, justificativaInicial });
    setF(doBanco);
    setSalvoSnap(JSON.stringify(doBanco));
  }

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  async function salvar() {
    setSalvando(true);
    const r = await salvarAnaliseRetificacao({
      cicloId,
      processoId,
      afetaConclusao: f.afetaConclusao || null,
      justificativa: f.justificativa || null,
    });
    setSalvando(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    onOk("Análise da Repercussão salva.");
    router.refresh();
  }

  return (
    <div
      id="retificacao-analise"
      className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4 scroll-mt-24"
    >
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Análise da Repercussão
        </h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
          A principal trava do módulo — pergunta explícita, o sistema nunca decide isso sozinho.
        </p>
      </div>

      <div>
        <label htmlFor="retificacao_afeta_conclusao" className={labelClass}>
          A correção identificada interfere na fundamentação técnico-pericial ou na conclusão do
          documento original?
        </label>
        <select
          id="retificacao_afeta_conclusao"
          value={f.afetaConclusao}
          onChange={(e) => set("afetaConclusao", e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          <option value="nao">Não — trata-se exclusivamente de erro material, sem repercussão técnico-pericial</option>
          <option value="sim">Sim — a correção possui repercussão sobre fundamentação e/ou conclusão</option>
        </select>
      </div>

      <div>
        <label htmlFor="retificacao_justificativa" className={labelClass}>
          Justificativa
        </label>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mb-1">
          Obrigatória nas duas respostas. Quando a resposta é &ldquo;Não&rdquo;, este texto entra
          verbatim no documento gerado — é a declaração técnica que sustenta a peça.
        </p>
        <textarea
          id="retificacao_justificativa"
          value={f.justificativa}
          onChange={(e) => set("justificativa", e.target.value)}
          rows={4}
          className={inputClass}
        />
      </div>

      <Botao
        onClick={() => salvar()}
        disabled={!dirty && !salvando}
        carregando={salvando}
        textoCarregando="Salvando…"
      >
        {dirty ? "Salvar" : "Salvo"}
      </Botao>
    </div>
  );
}
