"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarDadosAceite, gerarAceitePericial } from "./actions";
import { verificarTravaAceite } from "./regras";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { GerarDocumentoPanel, type VersaoDocumento } from "./gerar-documento-panel";
import { ImpossibilidadeOuEscusaPanel } from "./impossibilidade-escusa-panel";
import type { ProcessosRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

type ProcessoAceite = Pick<
  ProcessosRow,
  | "id"
  | "nomeacao_id"
  | "nomeacao_data"
  | "nomeacao_ciencia_data"
  | "nomeacao_prazo_manifestacao"
  | "aceite_impedimento_suspeicao"
  | "aceite_competencia_tecnica"
  | "aceite_necessita_especialista"
  | "aceitou_nomeacao"
>;

const paraValor = (v: boolean | null) => (v === true ? "sim" : v === false ? "nao" : "");
const paraBool = (v: string) => (v === "sim" ? true : v === "nao" ? false : null);

/** Manifestação de Aceite do Encargo Pericial — dados (nomeação + análise prévia) + geração. */
export function AceitePanel({
  processo,
  versoes,
  versoesImpossibilidade,
  versoesEscusa,
}: {
  processo: ProcessoAceite;
  versoes: VersaoDocumento[];
  versoesImpossibilidade: VersaoDocumento[];
  versoesEscusa: VersaoDocumento[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const doBanco = {
    nomeacaoId: processo.nomeacao_id ?? "",
    nomeacaoData: processo.nomeacao_data ?? "",
    nomeacaoCienciaData: processo.nomeacao_ciencia_data ?? "",
    nomeacaoPrazoManifestacao: processo.nomeacao_prazo_manifestacao ?? "",
    impedimentoSuspeicao: paraValor(processo.aceite_impedimento_suspeicao),
    competenciaTecnica: paraValor(processo.aceite_competencia_tecnica),
    necessitaEspecialista: paraValor(processo.aceite_necessita_especialista),
  };
  const [f, setF] = useState(doBanco);
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(doBanco));
  const [salvando, setSalvando] = useState(false);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [sync, setSync] = useState(processo);
  if (processo !== sync && !dirty && !salvando) {
    setSync(processo);
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
    const r = await salvarDadosAceite({
      processoId: processo.id,
      nomeacaoId: f.nomeacaoId,
      nomeacaoData: f.nomeacaoData,
      nomeacaoCienciaData: f.nomeacaoCienciaData,
      nomeacaoPrazoManifestacao: f.nomeacaoPrazoManifestacao,
      impedimentoSuspeicao: f.impedimentoSuspeicao || null,
      competenciaTecnica: f.competenciaTecnica || null,
      necessitaEspecialista: f.necessitaEspecialista || null,
    });
    setSalvando(false);
    if ("error" in r) {
      setMensagem({ tipo: "erro", texto: r.error });
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    setMensagem({ tipo: "ok", texto: "Dados do aceite salvos." });
    router.refresh();
  }

  // Trava avaliada com os valores AINDA NÃO SALVOS — dá feedback imediato de
  // que o botão de gerar vai liberar/bloquear antes mesmo dela salvar.
  const trava = verificarTravaAceite({
    aceite_impedimento_suspeicao: paraBool(f.impedimentoSuspeicao),
    aceite_competencia_tecnica: paraBool(f.competenciaTecnica),
  });
  // Trava avaliada com os valores JÁ SALVOS — é essa que decide se mostra o
  // bloco de Impossibilidade/Escusa, porque esses dois documentos não têm
  // relação com o que ainda está sendo editado no formulário acima.
  const travaSalva = verificarTravaAceite(processo);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-4">
        <div>
          <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
            Identificação da nomeação
          </h3>
        </div>

        <div>
          <label htmlFor="aceite_nomeacao_id" className={labelClass}>
            ID da nomeação
          </label>
          <input
            id="aceite_nomeacao_id"
            value={f.nomeacaoId}
            onChange={(e) => set("nomeacaoId", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="aceite_nomeacao_data" className={labelClass}>
              Data da nomeação
            </label>
            <input
              id="aceite_nomeacao_data"
              type="date"
              value={f.nomeacaoData}
              onChange={(e) => set("nomeacaoData", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="aceite_nomeacao_ciencia" className={labelClass}>
              Data da ciência
            </label>
            <input
              id="aceite_nomeacao_ciencia"
              type="date"
              value={f.nomeacaoCienciaData}
              onChange={(e) => set("nomeacaoCienciaData", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="aceite_nomeacao_prazo" className={labelClass}>
              Prazo para manifestação
            </label>
            <input
              id="aceite_nomeacao_prazo"
              type="date"
              value={f.nomeacaoPrazoManifestacao}
              onChange={(e) => set("nomeacaoPrazoManifestacao", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
            Análise prévia do encargo
          </h3>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
            Responda antes de gerar o aceite — o sistema não presume nenhuma das três.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label htmlFor="aceite_impedimento" className={labelClass}>
              Há impedimento ou suspeição?
            </label>
            <select
              id="aceite_impedimento"
              value={f.impedimentoSuspeicao}
              onChange={(e) => set("impedimentoSuspeicao", e.target.value)}
              className={inputClass}
            >
              <option value="">— ainda não respondido —</option>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
          <div>
            <label htmlFor="aceite_competencia" className={labelClass}>
              Possui competência técnica para o objeto?
            </label>
            <select
              id="aceite_competencia"
              value={f.competenciaTecnica}
              onChange={(e) => set("competenciaTecnica", e.target.value)}
              className={inputClass}
            >
              <option value="">— ainda não respondido —</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </div>
          <div>
            <label htmlFor="aceite_especialista" className={labelClass}>
              Há necessidade de especialista complementar?
            </label>
            <select
              id="aceite_especialista"
              value={f.necessitaEspecialista}
              onChange={(e) => set("necessitaEspecialista", e.target.value)}
              className={inputClass}
            >
              <option value="">— ainda não respondido —</option>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
        </div>

        <Botao onClick={() => salvar()} disabled={!dirty && !salvando} carregando={salvando} textoCarregando="Salvando…">
          {dirty ? "Salvar" : "Salvo"}
        </Botao>
        {mensagem && <Toast tipo={mensagem.tipo} texto={mensagem.texto} onClose={() => setMensagem(null)} />}
      </div>

      <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5">
        <GerarDocumentoPanel
          processoId={processo.id}
          tipo="aceite_pericial"
          chave="aceite"
          nomeDocumento="Manifestação de Aceite do Encargo Pericial"
          tituloBotao="Gerar Aceite do Encargo Pericial"
          podeGerar={trava.ok && !dirty}
          avisoBloqueio={
            dirty
              ? "Salve a análise prévia acima antes de gerar — a geração usa os dados já salvos, não o que ainda está sendo editado."
              : trava.ok
                ? null
                : trava.motivo
          }
          versoes={versoes}
          gerar={(dataAssinatura) => gerarAceitePericial(processo.id, dataAssinatura)}
        />
      </div>

      {!travaSalva.ok && (
        <ImpossibilidadeOuEscusaPanel
          processoId={processo.id}
          aceitouNomeacao={processo.aceitou_nomeacao}
          versoesImpossibilidade={versoesImpossibilidade}
          versoesEscusa={versoesEscusa}
        />
      )}
    </div>
  );
}
