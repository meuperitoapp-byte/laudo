"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { definirConclusaoVigenteInicial } from "./actions";
import { Botao } from "@/components/ui/button";
import { Selo } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";

/**
 * Bloco "Conclusão vigente" da tela do laudo final. Semeia (ou corrige,
 * enquanto ainda for a V1 do laudo) a conclusão vigente do processo a partir
 * da confirmação explícita da perita.
 *
 * `origemAutomatica` só vem preenchido quando o texto inicial foi extraído
 * automaticamente de uma seção do laudo E a conclusão ainda não foi
 * confirmada: nesse caso a tela avisa de onde o texto veio e pede
 * conferência. Quando a extração não é segura, `textoInicial` chega vazio e
 * `origemAutomatica` nulo, e a perita cola o texto.
 */
export function ConclusaoVigenteInicial({
  processoId,
  textoInicial,
  origemAutomatica,
  confirmada,
}: {
  processoId: string;
  textoInicial: string;
  origemAutomatica: string | null;
  confirmada: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(textoInicial);
  const [salvo, setSalvo] = useState(textoInicial);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const dirty = texto !== salvo;

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
    const r = await definirConclusaoVigenteInicial(processoId, texto);
    setSalvando(false);
    if ("error" in r) {
      setMsg({ tipo: "erro", texto: r.error });
      return;
    }
    setSalvo(texto);
    setMsg({ tipo: "ok", texto: "Conclusão vigente registrada." });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-5 space-y-3">
      <div>
        <h2 className="font-title text-sm font-semibold text-nevoa-900 dark:text-nevoa-100">
          Conclusão vigente
        </h2>
        <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
          É o texto de conclusão do laudo que serve de referência para os ciclos de pós-laudo. Um
          ciclo só pode ser aberto depois que ela estiver confirmada aqui.
        </p>
      </div>

      {!confirmada && origemAutomatica && (
        <div className="flex items-start gap-2 rounded-lg border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-100 dark:bg-ambar-950/30 px-4 py-3 text-sm">
          <Selo variante="atencao">Conferir</Selo>
          <p className="text-nevoa-800 dark:text-nevoa-200">
            Texto extraído automaticamente da seção &ldquo;{origemAutomatica}&rdquo;. Confira e
            ajuste antes de confirmar: os tipos de laudo têm estruturas de conclusão diferentes e a
            extração pode não ter pego o trecho certo.
          </p>
        </div>
      )}

      {!confirmada && !origemAutomatica && (
        <div className="flex items-start gap-2 rounded-lg border border-nevoa-300/60 dark:border-nevoa-700/40 bg-nevoa-50 dark:bg-nevoa-900/60 px-4 py-3 text-sm">
          <Selo variante="neutro">Ação necessária</Selo>
          <p className="text-nevoa-800 dark:text-nevoa-200">
            Não foi possível localizar a seção de conclusão deste laudo com segurança. Cole abaixo o
            texto da conclusão médico-pericial como ele consta no laudo protocolado.
          </p>
        </div>
      )}

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={8}
        className={inputClass}
        placeholder="Conclusão médico-pericial vigente…"
      />

      <Botao
        onClick={() => salvar()}
        disabled={(!dirty && confirmada) || salvando || !texto.trim()}
        carregando={salvando}
        textoCarregando="Salvando…"
      >
        {confirmada ? (dirty ? "Salvar" : "Salvo") : "Confirmar conclusão vigente"}
      </Botao>

      {msg && <Toast tipo={msg.tipo} texto={msg.texto} onClose={() => setMsg(null)} />}
    </div>
  );
}
