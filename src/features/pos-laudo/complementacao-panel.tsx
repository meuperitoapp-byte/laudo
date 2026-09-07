"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarComplementacao, type ComplementacaoPatch } from "./actions";
import { Botao } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import {
  COMPLEMENTACAO_IMPACTO_ORDENADA,
  COMPLEMENTACAO_IMPACTO_ROTULOS,
  COMPLEMENTACAO_MOTIVO_ORDENADA,
  COMPLEMENTACAO_MOTIVO_ROTULOS,
  ELEMENTO_CENTRAL_ORDENADA,
  ELEMENTO_CENTRAL_ROTULOS,
  ELEMENTO_CENTRAL_SITUACAO_ORDENADA,
  ELEMENTO_CENTRAL_SITUACAO_ROTULOS,
} from "./rotulos";
import type { PosLaudoComplementacaoRow, PosLaudoRetificacaoItensRow } from "@/types/database";
import type { ComplementacaoElementosCentrais, ElementoCentralRepercussao } from "@/types/json-fields";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";
const cardClass = "rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-3";
const secaoTitulo = "font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100";

type ElementoForm = { situacao: string; fundamentacao: string };
const ELEMENTO_VAZIO: ElementoForm = { situacao: "", fundamentacao: "" };

/**
 * Complementação do Laudo (fatia 7) — seções II a VII do modelo, num único
 * formulário com um só botão "Salvar" (são muitos campos narrativos
 * interdependentes; a gramática "um card, um botão" fica pesada aqui). As
 * seções IX/X (repercussão + Nova Conclusão Vigente) reusam o
 * `RepercussaoCicloControl` da matriz de pontos, já presente na página.
 */
export function ComplementacaoPanel({
  processoId,
  cicloId,
  complementacao,
  retificacaoItens,
  documentosSupervenientesCount,
}: {
  processoId: string;
  cicloId: string;
  complementacao: PosLaudoComplementacaoRow | null;
  retificacaoItens: PosLaudoRetificacaoItensRow[];
  documentosSupervenientesCount: number;
}) {
  const router = useRouter();

  const elementoDoBanco = (e: ElementoCentralRepercussao | undefined): ElementoForm =>
    e ? { situacao: e.situacao ?? "", fundamentacao: e.fundamentacao ?? "" } : { ...ELEMENTO_VAZIO };

  const doBanco = {
    idDocumentoOrigem: complementacao?.id_documento_origem ?? "",
    motivos: complementacao?.motivos ?? [],
    motivoDescricao: complementacao?.motivo_descricao ?? "",
    impactoElementos: complementacao?.impacto_elementos ?? "",
    impactoFundamentacao: complementacao?.impacto_fundamentacao ?? "",
    avaliacaoRealizada: complementacao?.avaliacao_realizada ?? false,
    avaliacaoData: complementacao?.avaliacao_data ?? "",
    avaliacaoHorario: complementacao?.avaliacao_horario ?? "",
    avaliacaoLocal: complementacao?.avaliacao_local ?? "",
    avaliacaoPresentes: complementacao?.avaliacao_presentes ?? "",
    avaliacaoAssistentes: complementacao?.avaliacao_assistentes ?? "",
    avaliacaoDocumentosAto: complementacao?.avaliacao_documentos_ato ?? "",
    avaliacaoAchados: complementacao?.avaliacao_achados ?? "",
    avaliacaoComparacao: complementacao?.avaliacao_comparacao ?? "",
    examesRealizados: complementacao?.exames_realizados ?? false,
    exameDescricao: complementacao?.exame_descricao ?? "",
    exameData: complementacao?.exame_data ?? "",
    exameProfissional: complementacao?.exame_profissional ?? "",
    exameResultado: complementacao?.exame_resultado ?? "",
    exameRepercussao: complementacao?.exame_repercussao ?? "",
    viMantidos: complementacao?.vi_mantidos ?? "",
    viNecessitam: complementacao?.vi_necessitam ?? "",
    viRevistos: complementacao?.vi_revistos ?? "",
    viFundamentacao: complementacao?.vi_fundamentacao ?? "",
    diagnostico: elementoDoBanco(complementacao?.vii_elementos.diagnostico),
    conduta: elementoDoBanco(complementacao?.vii_elementos.conduta),
    nexo: elementoDoBanco(complementacao?.vii_elementos.nexo),
    dano: elementoDoBanco(complementacao?.vii_elementos.dano),
    incapacidade: elementoDoBanco(complementacao?.vii_elementos.incapacidade),
    prognostico: elementoDoBanco(complementacao?.vii_elementos.prognostico),
    viiOutros: complementacao?.vii_elementos.outros ?? "",
  };

  const [f, setF] = useState(doBanco);
  const [salvoSnap, setSalvoSnap] = useState(() => JSON.stringify(doBanco));
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const dirty = JSON.stringify(f) !== salvoSnap;

  const [sync, setSync] = useState(complementacao);
  if (complementacao !== sync && !dirty && !salvando) {
    setSync(complementacao);
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
  const setElemento = (chave: (typeof ELEMENTO_CENTRAL_ORDENADA)[number], campo: keyof ElementoForm, v: string) =>
    setF((s) => ({ ...s, [chave]: { ...s[chave], [campo]: v } }));
  const toggleMotivo = (m: string) =>
    setF((s) => ({ ...s, motivos: s.motivos.includes(m) ? s.motivos.filter((x) => x !== m) : [...s.motivos, m] }));

  async function salvar() {
    setSalvando(true);
    const vii: ComplementacaoElementosCentrais = {};
    for (const chave of ELEMENTO_CENTRAL_ORDENADA) {
      const e = f[chave];
      if (e.situacao || e.fundamentacao.trim()) {
        vii[chave] = {
          situacao: (e.situacao || null) as ElementoCentralRepercussao["situacao"],
          fundamentacao: e.fundamentacao,
        };
      }
    }
    if (f.viiOutros.trim()) vii.outros = f.viiOutros;

    const patch: ComplementacaoPatch = {
      idDocumentoOrigem: f.idDocumentoOrigem || null,
      motivos: f.motivos,
      motivoDescricao: f.motivoDescricao || null,
      impactoElementos: f.impactoElementos || null,
      impactoFundamentacao: f.impactoFundamentacao || null,
      avaliacaoRealizada: f.avaliacaoRealizada,
      avaliacaoData: f.avaliacaoData || null,
      avaliacaoHorario: f.avaliacaoHorario || null,
      avaliacaoLocal: f.avaliacaoLocal || null,
      avaliacaoPresentes: f.avaliacaoPresentes || null,
      avaliacaoAssistentes: f.avaliacaoAssistentes || null,
      avaliacaoDocumentosAto: f.avaliacaoDocumentosAto || null,
      avaliacaoAchados: f.avaliacaoAchados || null,
      avaliacaoComparacao: f.avaliacaoComparacao || null,
      examesRealizados: f.examesRealizados,
      exameDescricao: f.exameDescricao || null,
      exameData: f.exameData || null,
      exameProfissional: f.exameProfissional || null,
      exameResultado: f.exameResultado || null,
      exameRepercussao: f.exameRepercussao || null,
      viMantidos: f.viMantidos || null,
      viNecessitam: f.viNecessitam || null,
      viRevistos: f.viRevistos || null,
      viFundamentacao: f.viFundamentacao || null,
      viiElementos: vii,
    };
    const r = await salvarComplementacao(cicloId, processoId, patch);
    setSalvando(false);
    if ("error" in r) {
      setMsg({ tipo: "erro", texto: r.error });
      return;
    }
    setSalvoSnap(JSON.stringify(f));
    setMsg({ tipo: "ok", texto: "Complementação salva." });
    router.refresh();
  }

  // Só as chaves de `f` cujo valor é string — as helpers de campo abaixo só servem pra essas.
  type ChaveTexto = { [K in keyof typeof f]: (typeof f)[K] extends string ? K : never }[keyof typeof f];
  const setTexto = (k: ChaveTexto, v: string) => setF((s) => ({ ...s, [k]: v }));

  const campoTexto = (rotulo: string, k: ChaveTexto, rows = 2) => (
    <div>
      <label className={labelClass}>{rotulo}</label>
      <textarea value={f[k]} onChange={(e) => setTexto(k, e.target.value)} rows={rows} className={inputClass} />
    </div>
  );
  const campoInput = (rotulo: string, k: ChaveTexto, type = "text") => (
    <div>
      <label className={labelClass}>{rotulo}</label>
      <input type={type} value={f[k]} onChange={(e) => setTexto(k, e.target.value)} className={inputClass} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <h2 className="font-title text-lg font-semibold text-nevoa-900 dark:text-nevoa-50">Complementação do Laudo</h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
          Seções II a VII do modelo. A repercussão sobre o laudo (IX) e a Nova Conclusão Vigente (X) vêm do
          bloco &ldquo;Repercussão sobre o laudo original&rdquo; da matriz de pontos, acima.
        </p>
      </div>

      {/* I — campo extra */}
      <div className={cardClass}>
        <span className={secaoTitulo}>I — Identificação</span>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
          Versão, data de intimação, origem e dados do laudo original entram automaticamente no documento.
        </p>
        {campoInput("Documento/intimação que originou a complementação (nº de ID / protocolo)", "idDocumentoOrigem")}
      </div>

      {/* II — motivo */}
      <div className={cardClass}>
        <span className={secaoTitulo}>II — Motivo e delimitação</span>
        <div>
          <span className={labelClass}>Motivo da complementação</span>
          <div className="space-y-1.5">
            {COMPLEMENTACAO_MOTIVO_ORDENADA.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
                <input type="checkbox" checked={f.motivos.includes(m)} onChange={() => toggleMotivo(m)} />
                {COMPLEMENTACAO_MOTIVO_ROTULOS[m]}
              </label>
            ))}
          </div>
        </div>
        {campoTexto("Descrição do motivo", "motivoDescricao", 3)}
      </div>

      {/* III — impacto dos supervenientes */}
      <div className={cardClass}>
        <span className={secaoTitulo}>III — Novos documentos e elementos considerados</span>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
          A tabela vem da seção &ldquo;Documentos supervenientes&rdquo; acima
          {documentosSupervenientesCount > 0
            ? ` (${documentosSupervenientesCount} no ciclo).`
            : " — nenhum cadastrado ainda; a seção só entra no documento quando houver."}
        </p>
        <div>
          <label className={labelClass}>Classificação do impacto dos elementos supervenientes</label>
          <select
            value={f.impactoElementos}
            onChange={(e) => set("impactoElementos", e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {COMPLEMENTACAO_IMPACTO_ORDENADA.map((i) => (
              <option key={i} value={i}>
                {COMPLEMENTACAO_IMPACTO_ROTULOS[i]}
              </option>
            ))}
          </select>
        </div>
        {campoTexto("Fundamentação", "impactoFundamentacao", 3)}
      </div>

      {/* IV — nova avaliação */}
      <div className={cardClass}>
        <span className={secaoTitulo}>IV — Nova avaliação médico-pericial</span>
        <label className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
          <input
            type="checkbox"
            checked={f.avaliacaoRealizada}
            onChange={(e) => set("avaliacaoRealizada", e.target.checked)}
          />
          Houve nova avaliação direta do periciado nesta complementação
        </label>
        {f.avaliacaoRealizada && (
          <div className="space-y-3 border-l-2 border-nevoa-200 dark:border-nevoa-800 pl-3">
            <div className="grid grid-cols-2 gap-3">
              {campoInput("Data", "avaliacaoData", "date")}
              {campoInput("Horário", "avaliacaoHorario")}
            </div>
            {campoInput("Local/modalidade", "avaliacaoLocal")}
            {campoInput("Presentes", "avaliacaoPresentes")}
            {campoInput("Assistentes técnicos", "avaliacaoAssistentes")}
            {campoInput("Documentos apresentados no ato", "avaliacaoDocumentosAto")}
            {campoTexto("Achados complementares", "avaliacaoAchados", 3)}
            {campoTexto("Comparação com a avaliação original", "avaliacaoComparacao", 3)}
          </div>
        )}
      </div>

      {/* V — exames / especialista */}
      <div className={cardClass}>
        <span className={secaoTitulo}>V — Exames complementares / avaliação especializada</span>
        <label className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
          <input
            type="checkbox"
            checked={f.examesRealizados}
            onChange={(e) => set("examesRealizados", e.target.checked)}
          />
          Houve exame complementar, parecer de especialista ou diligência técnica
        </label>
        {f.examesRealizados && (
          <div className="space-y-3 border-l-2 border-nevoa-200 dark:border-nevoa-800 pl-3">
            {campoInput("Exame/avaliação", "exameDescricao")}
            {campoInput("Data", "exameData", "date")}
            {campoInput("Profissional/serviço", "exameProfissional")}
            {campoTexto("Resultado relevante", "exameResultado")}
            {campoTexto("Repercussão médico-pericial", "exameRepercussao")}
          </div>
        )}
      </div>

      {/* VI — análise complementar */}
      <div id="complementacao-vi" className={`${cardClass} scroll-mt-24`}>
        <span className={secaoTitulo}>VI — Análise técnico-pericial complementar</span>
        {retificacaoItens.length > 0 && (
          <div className="rounded-md border border-nevoa-200 dark:border-nevoa-800 bg-nevoa-50 dark:bg-nevoa-900/60 p-3 text-sm space-y-1">
            <span className="text-xs font-medium text-nevoa-500 dark:text-nevoa-400">
              Correções de erro material com repercussão (vindas da Retificação — entram na seção VI do documento):
            </span>
            <ul className="list-disc pl-5 text-nevoa-700 dark:text-nevoa-300">
              {retificacaoItens.map((i) => (
                <li key={i.id}>
                  {i.pagina?.trim() ? `p. ${i.pagina.trim()} — ` : ""}
                  <span className="line-through">{i.onde_se_le}</span> → {i.leia_se}
                </li>
              ))}
            </ul>
          </div>
        )}
        {campoTexto("Elementos do laudo original mantidos", "viMantidos", 3)}
        {campoTexto("Elementos que necessitam complementação", "viNecessitam", 3)}
        {campoTexto("Elementos revistos ou modificados", "viRevistos", 3)}
        {campoTexto("Fundamentação médico-pericial complementar", "viFundamentacao", 5)}
      </div>

      {/* VII — elementos centrais */}
      <div className={cardClass}>
        <span className={secaoTitulo}>VII — Repercussão sobre os elementos centrais da perícia</span>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
          Só entram no documento os elementos que você avaliar (situação ou fundamentação preenchida).
        </p>
        {ELEMENTO_CENTRAL_ORDENADA.map((chave) => (
          <div key={chave} className="space-y-1.5">
            <span className="text-xs font-medium text-nevoa-600 dark:text-nevoa-300">
              {ELEMENTO_CENTRAL_ROTULOS[chave]}
            </span>
            <div className="grid grid-cols-[10rem_1fr] gap-2">
              <select
                value={f[chave].situacao}
                onChange={(e) => setElemento(chave, "situacao", e.target.value)}
                className={inputClass}
                aria-label={`Situação — ${ELEMENTO_CENTRAL_ROTULOS[chave]}`}
              >
                <option value="">—</option>
                {ELEMENTO_CENTRAL_SITUACAO_ORDENADA.map((s) => (
                  <option key={s} value={s}>
                    {ELEMENTO_CENTRAL_SITUACAO_ROTULOS[s]}
                  </option>
                ))}
              </select>
              <input
                value={f[chave].fundamentacao}
                onChange={(e) => setElemento(chave, "fundamentacao", e.target.value)}
                placeholder="fundamentação"
                className={inputClass}
                aria-label={`Fundamentação — ${ELEMENTO_CENTRAL_ROTULOS[chave]}`}
              />
            </div>
          </div>
        ))}
        {campoTexto("Outros pontos do objeto pericial", "viiOutros", 2)}
      </div>

      <Botao onClick={() => salvar()} disabled={!dirty && !salvando} carregando={salvando} textoCarregando="Salvando…">
        {dirty ? "Salvar complementação" : "Complementação salva"}
      </Botao>

      {msg && <Toast tipo={msg.tipo} texto={msg.texto} onClose={() => setMsg(null)} />}
    </div>
  );
}
