"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NoCampo } from "./campo-tree";
import { achatarArvoreCampos } from "./campo-tree";
import { CampoField } from "./campo-field";
import { salvarSecao, type RespostaCampoInput } from "./actions";
import {
  gerarNarrativoCampo,
  gerarNarrativoSecao,
  valorExibivelCampo,
  type ContextoCampo,
  type ContextoNarrativo,
  type RespostaCampoParaNarrativo,
} from "./narrativo";
import { ESTADO_VAZIO, type EstadoRespostaCampo, type EstadoRespostas, type SecaoNavItem } from "./tipos";
import type {
  AchadoParaVinculo,
  DadosRastreabilidade,
  DocumentoParaVinculo,
  RespostaPersistida,
} from "./rastreabilidade-tipos";
import type { CamposSecaoRow, RespostaEvidenciasRow, RespostasReutilizaveisRow } from "@/types/database";

function paraRespostaNarrativa(r: EstadoRespostaCampo): RespostaCampoParaNarrativo {
  return {
    valor_selecionado: r.valorSelecionado,
    texto_livre: r.textoLivre,
    confirmado_pelo_perito: r.confirmadoPeloPerito,
  };
}

function snapshot(estado: EstadoRespostas, narrativoTexto: string, editadoManualmente: boolean) {
  return JSON.stringify({ estado, narrativoTexto, editadoManualmente });
}

export function SecaoWorkspace({
  processoId,
  tipoLaudoNome,
  periciandoNome,
  secoesNav,
  secaoAtualId,
  secaoAtualTitulo,
  secaoTextoAutomaticoTemplate,
  arvoreCampos,
  respostasIniciais,
  narrativoSecaoInicial,
  contextoBase,
  estrutural,
  tipoLaudoId,
  reutilizaveis,
  respostasPersistidas,
  achadosDisponiveis,
  documentosDisponiveis,
  evidencias,
}: {
  processoId: string;
  tipoLaudoNome: string;
  periciandoNome: string | null;
  secoesNav: SecaoNavItem[];
  secaoAtualId: string;
  secaoAtualTitulo: string;
  secaoTextoAutomaticoTemplate: string | null;
  arvoreCampos: NoCampo[];
  respostasIniciais: EstadoRespostas;
  narrativoSecaoInicial: { texto: string | null; editadoManualmente: boolean } | null;
  contextoBase: Record<string, ContextoCampo>;
  estrutural: boolean;
  tipoLaudoId: string;
  /** Já filtrado no servidor: tipo_laudo_id = este processo, ou genéricas (null). Ver page.tsx. */
  reutilizaveis: RespostasReutilizaveisRow[];
  /** Rastreabilidade (CLAUDE.md > "Regra: rastreabilidade") — dados brutos vindos do servidor; montados em `rastreabilidade` abaixo. */
  respostasPersistidas: Record<string, RespostaPersistida>;
  achadosDisponiveis: AchadoParaVinculo[];
  documentosDisponiveis: DocumentoParaVinculo[];
  evidencias: RespostaEvidenciasRow[];
}) {
  const router = useRouter();
  const camposDaSecaoPlano = useMemo(() => achatarArvoreCampos(arvoreCampos), [arvoreCampos]);

  const rastreabilidade: DadosRastreabilidade = useMemo(
    () => ({
      processoId,
      secaoId: secaoAtualId,
      respostasPersistidas,
      achadosDisponiveis,
      documentosDisponiveis,
      evidencias,
    }),
    [processoId, secaoAtualId, respostasPersistidas, achadosDisponiveis, documentosDisponiveis, evidencias]
  );

  const [estado, setEstado] = useState<EstadoRespostas>(respostasIniciais);
  // Texto narrativo digitado à mão pela perita, quando ela assume o controle
  // (editadoManualmente = true). Enquanto false, o texto exibido é sempre o
  // recomposto automaticamente (narrativoAuto, calculado abaixo) — sem
  // precisar sincronizar isso via efeito.
  const [manualOverride, setManualOverride] = useState<string | null>(
    narrativoSecaoInicial?.editadoManualmente ? narrativoSecaoInicial.texto ?? "" : null
  );
  const [editadoManualmente, setEditadoManualmente] = useState(narrativoSecaoInicial?.editadoManualmente ?? false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [salvoSnapshot, setSalvoSnapshot] = useState(() =>
    snapshot(respostasIniciais, narrativoSecaoInicial?.texto ?? "", narrativoSecaoInicial?.editadoManualmente ?? false)
  );

  function onCampoChange(campoId: string, patch: Partial<EstadoRespostaCampo>) {
    setEstado((atual) => ({
      ...atual,
      [campoId]: { ...(atual[campoId] ?? ESTADO_VAZIO), ...patch },
    }));
  }

  // Contexto de resolução de placeholders: base vinda do servidor (todo o
  // tipo_laudo, na última vez que o processo foi salvo/carregado) sobreposta
  // pelo estado local desta seção — assim campos que se referenciam dentro da
  // própria seção atualizam a prévia ao vivo, sem reload.
  const contexto: ContextoNarrativo = useMemo(() => {
    const mapa: ContextoNarrativo = new Map(Object.entries(contextoBase));
    for (const campo of camposDaSecaoPlano) {
      const resp = estado[campo.id] ?? ESTADO_VAZIO;
      const confirmacaoPendente = campo.requer_confirmacao_perito && !resp.confirmadoPeloPerito;
      mapa.set(campo.codigo, {
        rotulo: campo.rotulo,
        valorExibivel: confirmacaoPendente
          ? null
          : valorExibivelCampo(campo, resp.valorSelecionado, resp.textoLivre),
      });
    }
    return mapa;
  }, [estado, camposDaSecaoPlano, contextoBase]);

  const respostasPorCampoId = useMemo(() => {
    const mapa = new Map<string, RespostaCampoParaNarrativo>();
    for (const campo of camposDaSecaoPlano) {
      mapa.set(campo.id, paraRespostaNarrativa(estado[campo.id] ?? ESTADO_VAZIO));
    }
    return mapa;
  }, [estado, camposDaSecaoPlano]);

  const narrativoAuto = useMemo(() => {
    if (estrutural) return null;
    return gerarNarrativoSecao(
      { texto_automatico_template: secaoTextoAutomaticoTemplate },
      camposDaSecaoPlano,
      respostasPorCampoId,
      contexto
    );
  }, [estrutural, secaoTextoAutomaticoTemplate, camposDaSecaoPlano, respostasPorCampoId, contexto]);

  const narrativoTexto = editadoManualmente ? manualOverride ?? "" : narrativoAuto ?? "";

  const dirty = useMemo(
    () => snapshot(estado, narrativoTexto, editadoManualmente) !== salvoSnapshot,
    [estado, narrativoTexto, editadoManualmente, salvoSnapshot]
  );

  // Evita perder respostas não salvas ao fechar/atualizar a aba.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function salvar(): Promise<boolean> {
    setSalvando(true);
    setMensagem(null);

    const respostas: RespostaCampoInput[] = camposDaSecaoPlano.map((campo: CamposSecaoRow) => {
      const r = estado[campo.id] ?? ESTADO_VAZIO;
      return {
        campoId: campo.id,
        valorSelecionado: r.valorSelecionado,
        textoLivre: r.textoLivre,
        textoNarrativo: gerarNarrativoCampo(campo, paraRespostaNarrativa(r), contexto),
        confirmadoPeloPerito: r.confirmadoPeloPerito,
      };
    });

    const resultado = await salvarSecao({
      processoId,
      secaoId: secaoAtualId,
      respostas,
      narrativoSecao: { texto: narrativoTexto || null, editadoManualmente },
    });

    setSalvando(false);
    if ("error" in resultado) {
      setMensagem({ tipo: "erro", texto: resultado.error });
      return false;
    }
    setSalvoSnapshot(snapshot(estado, narrativoTexto, editadoManualmente));
    setMensagem({ tipo: "ok", texto: "Seção salva." });
    router.refresh();
    return true;
  }

  async function irPara(destinoSecaoId: string) {
    if (destinoSecaoId === secaoAtualId) return;
    if (dirty) {
      const ok = await salvar();
      if (!ok) {
        const continuar = window.confirm(
          "Não foi possível salvar as alterações desta seção. Sair mesmo assim e perder as mudanças?"
        );
        if (!continuar) return;
      }
    }
    router.push(`/processos/${processoId}/preenchimento/${destinoSecaoId}`);
  }

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">{tipoLaudoNome}</p>
          <p className="text-sm font-medium">{periciandoNome ?? "Periciando(a) não identificado(a)"}</p>
        </div>
        <nav className="p-2">
          {secoesNav.map((s) => {
            const ativa = s.id === secaoAtualId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => irPara(s.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                  ativa
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <span
                  aria-hidden
                  className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                    s.respondida ? "bg-emerald-500" : ativa ? "bg-white/50 dark:bg-zinc-900/40" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                />
                <span className={s.estrutural ? "italic" : ""}>{s.titulo}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 max-w-3xl">
        <h1 className="text-xl font-semibold mb-1">{secaoAtualTitulo}</h1>
        {estrutural && (
          <p className="text-sm text-zinc-500 mb-6">
            Esta seção não tem campos de marcação — o conteúdo dela vem de outra tela do sistema
            (Documentos ou Quesitos). Use o campo abaixo se quiser escrever manualmente um texto
            pra ela desde já.
          </p>
        )}

        {!estrutural && (
          <div className="space-y-6 mb-8">
            {arvoreCampos.map((no) => (
              <CampoField
                key={no.campo.id}
                no={no}
                estado={estado}
                onChange={onCampoChange}
                tipoLaudoId={tipoLaudoId}
                reutilizaveis={reutilizaveis}
                rastreabilidade={rastreabilidade}
              />
            ))}
          </div>
        )}

        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Texto narrativo da seção</label>
            {editadoManualmente && !estrutural && (
              <button
                type="button"
                onClick={() => {
                  setEditadoManualmente(false);
                  setManualOverride(null);
                }}
                className="text-xs underline text-zinc-500"
              >
                Recompor automaticamente
              </button>
            )}
          </div>
          {editadoManualmente && !estrutural && (
            <p className="text-xs text-amber-700 dark:text-amber-500 mb-1.5">
              Texto editado manualmente — não será mais recomposto sozinho ao mudar uma marcação.
            </p>
          )}
          <textarea
            value={narrativoTexto}
            onChange={(e) => {
              setManualOverride(e.target.value);
              setEditadoManualmente(true);
            }}
            rows={8}
            placeholder={
              estrutural
                ? "Escreva manualmente, se necessário"
                : "Gerado automaticamente a partir das marcações acima — edite à vontade"
            }
            className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Este texto é sempre editável e só entra no laudo final assim como estiver aqui — nada é
            decidido sozinho pelo sistema.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={() => salvar()}
            disabled={salvando || !dirty}
            className="rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm disabled:opacity-40"
          >
            {salvando ? "Salvando…" : dirty ? "Salvar seção" : "Salvo"}
          </button>
          {mensagem && (
            <span className={`text-sm ${mensagem.tipo === "erro" ? "text-red-600" : "text-zinc-500"}`}>
              {mensagem.texto}
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
