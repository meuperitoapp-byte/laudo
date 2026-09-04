"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarPonto,
  desvincularEvidencia,
  removerPonto,
  salvarPonto,
  salvarRepercussaoCiclo,
  salvarTriagemCiclo,
  vincularEvidencia,
} from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import {
  CLASSIFICACAO_TRIAGEM_ORDENADA,
  CLASSIFICACAO_TRIAGEM_ROTULOS,
  POTENCIAL_CONCLUSAO_ORDENADA,
  POTENCIAL_CONCLUSAO_ROTULOS,
  REPERCUSSAO_LAUDO_EXIGE_NOVA_CONCLUSAO,
  REPERCUSSAO_LAUDO_ORDENADA,
  REPERCUSSAO_LAUDO_ROTULOS,
  REPERCUSSAO_PONTO_ORDENADA,
  REPERCUSSAO_PONTO_ROTULOS,
} from "./rotulos";
import type { PosLaudoRepercussaoLaudo } from "@/types/enums";
import type { PosLaudoPontosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

export interface EvidenciaVinculo {
  id: string;
  documento_id: string | null;
  observacao: string | null;
}
export interface DocumentoOpcao {
  id: string;
  nome_arquivo: string;
}

export interface ConclusaoVigenteResumo {
  texto: string;
  origem_tipo: string;
  ciclo_id: string | null;
}

export function MatrizPontos({
  processoId,
  cicloId,
  podeModificarConclusao,
  rascunhoComplementacao,
  repercussaoLaudo,
  conclusaoVigenteNova,
  conclusaoVigente,
  pontos,
  evidenciasPorPonto,
  documentos,
}: {
  processoId: string;
  cicloId: string;
  podeModificarConclusao: string | null;
  rascunhoComplementacao: boolean;
  repercussaoLaudo: string | null;
  conclusaoVigenteNova: string | null;
  conclusaoVigente: ConclusaoVigenteResumo | null;
  pontos: PosLaudoPontosRow[];
  evidenciasPorPonto: Record<string, EvidenciaVinculo[]>;
  documentos: DocumentoOpcao[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [adicionando, setAdicionando] = useState(false);

  async function novoPonto() {
    setAdicionando(true);
    setMensagem(null);
    const r = await adicionarPonto(cicloId, processoId);
    setAdicionando(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <TriagemCicloControl
        processoId={processoId}
        cicloId={cicloId}
        valorInicial={podeModificarConclusao}
        onErro={(t) => setMensagem({ tipo: "erro", texto: t })}
      />

      {rascunhoComplementacao && (
        <div className="flex items-start gap-2 rounded-lg border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-100 dark:bg-ambar-950/30 px-4 py-3 text-sm">
          <Selo variante="atencao">Sugestão</Selo>
          <p className="text-nevoa-800 dark:text-nevoa-200">
            Um ou mais pontos foram classificados como &quot;necessidade de complementação&quot;. Isto
            é só uma sinalização — não cria uma Complementação nem bloqueia o caminho de
            Esclarecimentos. A decisão de qual saída produzir continua sendo sua.
          </p>
        </div>
      )}

      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100 mb-2">
          Matriz de pontos
        </h2>
        {pontos.length === 0 ? (
          <p className="text-sm text-nevoa-500 dark:text-nevoa-400">
            Nenhum ponto ainda. Adicione um ponto para cada questionamento / problema do laudo que a
            manifestação levanta.
          </p>
        ) : (
          <ol className="space-y-4">
            {pontos.map((ponto, i) => (
              <PontoCard
                key={ponto.id}
                numero={i + 1}
                processoId={processoId}
                cicloId={cicloId}
                ponto={ponto}
                evidencias={evidenciasPorPonto[ponto.id] ?? []}
                documentos={documentos}
                onErro={(t) => setMensagem({ tipo: "erro", texto: t })}
                onOk={(t) => setMensagem({ tipo: "ok", texto: t })}
              />
            ))}
          </ol>
        )}
      </div>

      <Botao onClick={novoPonto} carregando={adicionando} textoCarregando="Adicionando…">
        Adicionar ponto
      </Botao>

      <RepercussaoCicloControl
        processoId={processoId}
        cicloId={cicloId}
        repercussaoInicial={repercussaoLaudo}
        conclusaoNovaInicial={conclusaoVigenteNova}
        conclusaoVigente={conclusaoVigente}
        pontos={pontos}
        onErro={(t) => setMensagem({ tipo: "erro", texto: t })}
        onOk={(t) => setMensagem({ tipo: "ok", texto: t })}
      />

      {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </div>
  );
}

function TriagemCicloControl({
  processoId,
  cicloId,
  valorInicial,
  onErro,
}: {
  processoId: string;
  cicloId: string;
  valorInicial: string | null;
  onErro: (texto: string) => void;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(valorInicial ?? "");
  const [salvo, setSalvo] = useState(valorInicial ?? "");
  const [salvando, setSalvando] = useState(false);
  const dirty = valor !== salvo;

  const [sincronizado, setSincronizado] = useState(valorInicial);
  if (valorInicial !== sincronizado && !dirty && !salvando) {
    setSincronizado(valorInicial);
    setValor(valorInicial ?? "");
    setSalvo(valorInicial ?? "");
  }

  async function salvar() {
    setSalvando(true);
    const r = await salvarTriagemCiclo({
      cicloId,
      processoId,
      podeModificarConclusao: valor || null,
    });
    setSalvando(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    setSalvo(valor);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-3">
      <div>
        <label htmlFor="pode_modificar" className={labelClass}>
          A manifestação pode modificar a conclusão do laudo?
        </label>
        <select
          id="pode_modificar"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {POTENCIAL_CONCLUSAO_ORDENADA.map((v) => (
            <option key={v} value={v}>
              {POTENCIAL_CONCLUSAO_ROTULOS[v]}
            </option>
          ))}
        </select>
      </div>
      <Botao onClick={() => salvar()} disabled={!dirty && !salvando} carregando={salvando} textoCarregando="Salvando…">
        {dirty ? "Salvar" : "Salvo"}
      </Botao>
    </div>
  );
}

/**
 * Sugestão VISUAL de repercussão de ciclo a partir das repercussões já
 * marcadas nos pontos — mesmo modelo do rascunho_complementacao: só sinaliza,
 * nunca preenche nem trava. `null` = nada a sugerir ainda.
 */
function sugerirRepercussaoLaudo(pontos: PosLaudoPontosRow[]): PosLaudoRepercussaoLaudo | null {
  const marcadas = new Set(pontos.map((p) => p.repercussao).filter((r): r is NonNullable<typeof r> => !!r));
  if (marcadas.size === 0) return null;
  if (marcadas.has("conclusao_parcialmente_modificada")) return "modificacao_parcial";
  if (marcadas.has("retificacao_necessaria")) return "retificacao_sem_repercussao";
  if (marcadas.has("fundamentacao_complementada")) return "complementado_sem_alterar";
  return "mantido_integralmente";
}

function RepercussaoCicloControl({
  processoId,
  cicloId,
  repercussaoInicial,
  conclusaoNovaInicial,
  conclusaoVigente,
  pontos,
  onErro,
  onOk,
}: {
  processoId: string;
  cicloId: string;
  repercussaoInicial: string | null;
  conclusaoNovaInicial: string | null;
  conclusaoVigente: ConclusaoVigenteResumo | null;
  pontos: PosLaudoPontosRow[];
  onErro: (texto: string) => void;
  onOk: (texto: string) => void;
}) {
  const router = useRouter();

  const doBanco = {
    repercussao: repercussaoInicial ?? "",
    conclusaoNova: conclusaoNovaInicial ?? "",
  };
  const [f, setF] = useState(doBanco);
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(doBanco));
  const [salvando, setSalvando] = useState(false);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [sync, setSync] = useState({ repercussaoInicial, conclusaoNovaInicial });
  if (
    (repercussaoInicial !== sync.repercussaoInicial ||
      conclusaoNovaInicial !== sync.conclusaoNovaInicial) &&
    !dirty &&
    !salvando
  ) {
    setSync({ repercussaoInicial, conclusaoNovaInicial });
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

  const sugestao = sugerirRepercussaoLaudo(pontos);
  const exigeNova = (REPERCUSSAO_LAUDO_EXIGE_NOVA_CONCLUSAO as readonly string[]).includes(f.repercussao);

  async function salvar() {
    setSalvando(true);
    const r = await salvarRepercussaoCiclo({
      cicloId,
      processoId,
      repercussaoLaudo: f.repercussao || null,
      conclusaoVigenteNova: exigeNova ? f.conclusaoNova || null : null,
    });
    setSalvando(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    const salvo = exigeNova ? f : { ...f, conclusaoNova: "" };
    setF(salvo);
    setSalvoSnap(JSON.stringify(salvo));
    onOk("Repercussão do ciclo salva.");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Repercussão sobre o laudo original
        </h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
          Síntese que você escreve depois de responder todos os pontos. O sistema apenas sugere — a
          escolha é sua.
        </p>
      </div>

      {conclusaoVigente && (
        <div className="rounded-md border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-50 dark:bg-nevoa-900/60 p-3">
          <span className="block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1">
            Conclusão vigente hoje
            {conclusaoVigente.origem_tipo !== "laudo" ? " (definida por um ciclo anterior)" : " (laudo original)"}
          </span>
          <p className="whitespace-pre-wrap text-sm text-nevoa-700 dark:text-nevoa-300">
            {conclusaoVigente.texto}
          </p>
        </div>
      )}

      {sugestao && sugestao !== f.repercussao && (
        <div className="flex items-start gap-2 rounded-lg border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-100 dark:bg-ambar-950/30 px-4 py-3 text-sm">
          <Selo variante="atencao">Sugestão</Selo>
          <p className="text-nevoa-800 dark:text-nevoa-200">
            Pelas repercussões marcadas nos pontos, isto tende a{" "}
            <strong>{REPERCUSSAO_LAUDO_ROTULOS[sugestao]}</strong>. É só uma sinalização — confira e
            decida.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="repercussao_laudo" className={labelClass}>
          Nível da repercussão
        </label>
        <select
          id="repercussao_laudo"
          value={f.repercussao}
          onChange={(e) => set("repercussao", e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {REPERCUSSAO_LAUDO_ORDENADA.map((v) => (
            <option key={v} value={v}>
              {REPERCUSSAO_LAUDO_ROTULOS[v]}
            </option>
          ))}
        </select>
      </div>

      {exigeNova && (
        <div>
          <label htmlFor="conclusao_vigente_nova" className={labelClass}>
            Nova Conclusão Vigente (rascunho)
          </label>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mb-1">
            Este texto entra no corpo do documento de pós-laudo. Quando o documento for protocolado,
            ele passa a ser a conclusão vigente do processo. É exigido para gerar o documento.
          </p>
          <textarea
            id="conclusao_vigente_nova"
            value={f.conclusaoNova}
            onChange={(e) => set("conclusaoNova", e.target.value)}
            rows={5}
            className={inputClass}
          />
        </div>
      )}

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

function PontoCard({
  numero,
  processoId,
  cicloId,
  ponto,
  evidencias,
  documentos,
  onErro,
  onOk,
}: {
  numero: number;
  processoId: string;
  cicloId: string;
  ponto: PosLaudoPontosRow;
  evidencias: EvidenciaVinculo[];
  documentos: DocumentoOpcao[];
  onErro: (texto: string) => void;
  onOk: (texto: string) => void;
}) {
  const router = useRouter();

  const doBanco = {
    origemPonto: ponto.origem_ponto ?? "",
    tema: ponto.tema ?? "",
    sinteseAlegacao: ponto.sintese_alegacao ?? "",
    jaAbordado: ponto.ja_abordado_no_laudo === null ? "" : ponto.ja_abordado_no_laudo ? "sim" : "nao",
    referenciaLaudo: ponto.referencia_laudo ?? "",
    classificacao: ponto.classificacao_triagem ?? "",
    fundamentacao: ponto.fundamentacao_adicional ?? "",
    respostaTecnica: ponto.resposta_tecnica ?? "",
    repercussao: ponto.repercussao ?? "",
  };

  const [f, setF] = useState(doBanco);
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(doBanco));
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [pontoSync, setPontoSync] = useState(ponto);
  if (ponto !== pontoSync && !dirty && !salvando) {
    setPontoSync(ponto);
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
    const r = await salvarPonto({
      pontoId: ponto.id,
      cicloId,
      processoId,
      origemPonto: f.origemPonto || null,
      tema: f.tema || null,
      sinteseAlegacao: f.sinteseAlegacao || null,
      jaAbordadoNoLaudo: f.jaAbordado === "" ? null : f.jaAbordado === "sim",
      referenciaLaudo: f.referenciaLaudo || null,
      classificacaoTriagem: f.classificacao || null,
      fundamentacaoAdicional: f.fundamentacao || null,
      respostaTecnica: f.respostaTecnica || null,
      repercussao: f.repercussao || null,
    });
    setSalvando(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    onOk(`Ponto ${numero} salvo.`);
    router.refresh();
  }

  async function remover() {
    if (!window.confirm(`Remover o ponto ${numero}? Remove também as evidências vinculadas. Não tem como desfazer.`))
      return;
    setRemovendo(true);
    const r = await removerPonto(ponto.id, cicloId, processoId);
    setRemovendo(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    router.refresh();
  }

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  return (
    <li className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-nevoa-500 dark:text-nevoa-400">
          Ponto {numero}
          {!f.respostaTecnica.trim() && <Selo variante="atencao">Sem resposta técnica</Selo>}
        </span>
        <button
          type="button"
          onClick={remover}
          disabled={removendo || salvando}
          className="text-xs text-vinho-600 hover:underline dark:text-vinho-400 disabled:opacity-40"
        >
          Remover ponto
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Origem do ponto</label>
          <input
            value={f.origemPonto}
            onChange={(e) => set("origemPonto", e.target.value)}
            placeholder="ex.: Autor, Réu, Juízo, MP..."
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Tema</label>
          <input value={f.tema} onChange={(e) => set("tema", e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Síntese da alegação / questionamento</label>
        <textarea
          value={f.sinteseAlegacao}
          onChange={(e) => set("sinteseAlegacao", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Já abordado no laudo?</label>
          <select
            value={f.jaAbordado}
            onChange={(e) => set("jaAbordado", e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Página / item do laudo</label>
          <input
            value={f.referenciaLaudo}
            onChange={(e) => set("referenciaLaudo", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Classificação da triagem</label>
        <select
          value={f.classificacao}
          onChange={(e) => set("classificacao", e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {CLASSIFICACAO_TRIAGEM_ORDENADA.map((c) => (
            <option key={c} value={c}>
              {CLASSIFICACAO_TRIAGEM_ROTULOS[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Fundamentação adicional</label>
        <textarea
          value={f.fundamentacao}
          onChange={(e) => set("fundamentacao", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="border-t border-nevoa-200 dark:border-nevoa-800 pt-3 space-y-3">
        <span className="text-xs font-semibold text-nevoa-600 dark:text-nevoa-300">
          Enfrentamento
        </span>
        <div>
          <label className={labelClass}>Resposta técnica</label>
          <textarea
            value={f.respostaTecnica}
            onChange={(e) => set("respostaTecnica", e.target.value)}
            rows={4}
            placeholder="O que a perícia responde a este ponto. Pode ficar em branco por ora — o ponto só trava na geração da saída."
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Repercussão deste ponto sobre o laudo</label>
          <select
            value={f.repercussao}
            onChange={(e) => set("repercussao", e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {REPERCUSSAO_PONTO_ORDENADA.map((r) => (
              <option key={r} value={r}>
                {REPERCUSSAO_PONTO_ROTULOS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <EvidenciasPonto
        processoId={processoId}
        cicloId={cicloId}
        pontoId={ponto.id}
        evidencias={evidencias}
        documentos={documentos}
        onErro={onErro}
      />

      <div className="pt-1">
        <Botao onClick={() => salvar()} disabled={!dirty && !salvando} carregando={salvando} textoCarregando="Salvando…">
          {dirty ? "Salvar ponto" : "Ponto salvo"}
        </Botao>
      </div>
    </li>
  );
}

function EvidenciasPonto({
  processoId,
  cicloId,
  pontoId,
  evidencias,
  documentos,
  onErro,
}: {
  processoId: string;
  cicloId: string;
  pontoId: string;
  evidencias: EvidenciaVinculo[];
  documentos: DocumentoOpcao[];
  onErro: (texto: string) => void;
}) {
  const router = useRouter();
  const [docId, setDocId] = useState("");
  const [obs, setObs] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const nomePorId = new Map(documentos.map((d) => [d.id, d.nome_arquivo]));
  const jaVinculados = new Set(evidencias.map((e) => e.documento_id));
  const disponiveis = documentos.filter((d) => !jaVinculados.has(d.id));

  async function vincular() {
    if (!docId) return;
    setOcupado(true);
    const r = await vincularEvidencia({
      pontoId,
      cicloId,
      processoId,
      documentoId: docId,
      observacao: obs.trim() || null,
    });
    setOcupado(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    setDocId("");
    setObs("");
    router.refresh();
  }

  async function desvincular(evidenciaId: string) {
    setOcupado(true);
    const r = await desvincularEvidencia({ evidenciaId, cicloId, processoId });
    setOcupado(false);
    if ("error" in r) {
      onErro(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-md border border-nevoa-200 dark:border-nevoa-800 p-3 space-y-2">
      <span className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400">
        Evidências (documentos do processo que sustentam este ponto)
      </span>

      {evidencias.length > 0 && (
        <ul className="space-y-1">
          {evidencias.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-2 text-sm">
              <span className="text-nevoa-800 dark:text-nevoa-200">
                {e.documento_id ? (nomePorId.get(e.documento_id) ?? "documento removido") : "—"}
                {e.observacao ? (
                  <span className="text-nevoa-500 dark:text-nevoa-400"> — {e.observacao}</span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => desvincular(e.id)}
                disabled={ocupado}
                className="shrink-0 text-xs text-vinho-600 hover:underline dark:text-vinho-400 disabled:opacity-40"
              >
                Desvincular
              </button>
            </li>
          ))}
        </ul>
      )}

      {disponiveis.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <select
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            className={`${inputClass} flex-1 min-w-40`}
            aria-label="Documento"
          >
            <option value="">— escolher documento —</option>
            {disponiveis.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome_arquivo}
              </option>
            ))}
          </select>
          <input
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="observação (opcional)"
            className={`${inputClass} flex-1 min-w-40`}
            aria-label="Observação da evidência"
          />
          <Botao
            variante="secundaria"
            onClick={() => vincular()}
            disabled={!docId || ocupado}
            carregando={ocupado}
            textoCarregando="Vinculando…"
          >
            Vincular
          </Botao>
        </div>
      ) : (
        <p className="text-xs text-nevoa-400 dark:text-nevoa-600">
          {documentos.length === 0
            ? "Nenhum documento anexado ao processo ainda."
            : "Todos os documentos do processo já estão vinculados a este ponto."}
        </p>
      )}
    </div>
  );
}
