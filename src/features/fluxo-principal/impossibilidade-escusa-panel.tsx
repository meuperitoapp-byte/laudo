"use client";

import { useState } from "react";
import { gerarImpossibilidadeAssumir, gerarEscusaDeclinio } from "./actions";
import { GerarDocumentoPanel, type VersaoDocumento } from "./gerar-documento-panel";
import type { AceitouNomeacao } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Bloco embutido no AceitePanel, mostrado só quando a trava do Aceite (§4.1)
 * bloqueia — é o destino que faltava, agora com dois documentos reais em vez
 * de só um texto de orientação. Qual dos dois aparece depende de
 * `aceitouNomeacao`:
 *
 * - ainda não é 'sim' → **Impossibilidade de Assumir o Encargo** (nº12 da
 *   Biblioteca) — ela nunca chegou a aceitar.
 * - já é 'sim' → **Escusa/Declínio do Encargo Já Aceito** (nº13) — o
 *   impedimento surgiu depois de uma aceitação anterior; o texto do nº13
 *   pressupõe isso ("Após a aceitação do encargo..."), então mostrar o
 *   documento errado seria um erro de conteúdo na peça, não só de UI.
 *
 * Gerar qualquer um dos dois NÃO alza `aceitou_nomeacao` nem nenhum outro
 * campo do processo — só o protocolar de um documento com o módulo Aceite
 * mexe nisso (ver marcarFluxoPrincipalProtocolado), e estes dois nunca
 * incluem esse módulo.
 */
export function ImpossibilidadeOuEscusaPanel({
  processoId,
  aceitouNomeacao,
  versoesImpossibilidade,
  versoesEscusa,
}: {
  processoId: string;
  aceitouNomeacao: AceitouNomeacao | null;
  versoesImpossibilidade: VersaoDocumento[];
  versoesEscusa: VersaoDocumento[];
}) {
  if (aceitouNomeacao === "sim") {
    return <EscusaDeclinioForm processoId={processoId} versoes={versoesEscusa} />;
  }
  return <ImpossibilidadeAssumirForm processoId={processoId} versoes={versoesImpossibilidade} />;
}

function ImpossibilidadeAssumirForm({
  processoId,
  versoes,
}: {
  processoId: string;
  versoes: VersaoDocumento[];
}) {
  const [motivo, setMotivo] = useState("");

  return (
    <div className="rounded-lg border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-50 dark:bg-ambar-950/20 p-5 space-y-4">
      <div>
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Impossibilidade de Assumir o Encargo
        </h3>
        <p className="text-xs text-nevoa-600 dark:text-nevoa-400 mt-1">
          Você ainda não aceitou este encargo — este é o caminho pra comunicar ao Juízo que não pode assumir,
          com pedido de designação de outro profissional.
        </p>
      </div>
      <div>
        <label htmlFor="impossibilidade_motivo" className={labelClass}>
          Motivo objetivo
        </label>
        <textarea
          id="impossibilidade_motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>
      <GerarDocumentoPanel
        processoId={processoId}
        tipo="impossibilidade_assumir"
        chave="impossibilidade"
        nomeDocumento="Impossibilidade de Assumir o Encargo"
        tituloBotao="Gerar Impossibilidade de Assumir"
        podeGerar={Boolean(motivo.trim())}
        avisoBloqueio={!motivo.trim() ? "Preencha o motivo antes de gerar." : null}
        versoes={versoes}
        gerar={(dataAssinatura) => gerarImpossibilidadeAssumir(processoId, motivo, dataAssinatura)}
      />
    </div>
  );
}

function EscusaDeclinioForm({ processoId, versoes }: { processoId: string; versoes: VersaoDocumento[] }) {
  const [motivo, setMotivo] = useState("");
  const [pendencias, setPendencias] = useState("");

  return (
    <div className="rounded-lg border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-50 dark:bg-ambar-950/20 p-5 space-y-4">
      <div>
        <h3 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Escusa / Declínio do Encargo Já Aceito
        </h3>
        <p className="text-xs text-nevoa-600 dark:text-nevoa-400 mt-1">
          Você já havia aceitado este encargo, e agora surgiu um impedimento — este documento comunica a
          escusa e pede a liberação do encargo, com substituição do(a) perito(a).
        </p>
      </div>
      <div>
        <label htmlFor="escusa_motivo" className={labelClass}>
          Circunstância que motivou a escusa
        </label>
        <textarea
          id="escusa_motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="escusa_pendencias" className={labelClass}>
          Documentos, valores ou providências pendentes (opcional)
        </label>
        <textarea
          id="escusa_pendencias"
          value={pendencias}
          onChange={(e) => setPendencias(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>
      <GerarDocumentoPanel
        processoId={processoId}
        tipo="escusa_declinio_pericial"
        chave="escusa"
        nomeDocumento="Escusa/Declínio do Encargo Já Aceito"
        tituloBotao="Gerar Escusa/Declínio"
        podeGerar={Boolean(motivo.trim())}
        avisoBloqueio={!motivo.trim() ? "Preencha a circunstância antes de gerar." : null}
        versoes={versoes}
        gerar={(dataAssinatura) => gerarEscusaDeclinio(processoId, motivo, pendencias || null, dataAssinatura)}
      />
    </div>
  );
}
