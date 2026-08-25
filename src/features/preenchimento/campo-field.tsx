"use client";

import type { NoCampo } from "./campo-tree";
import type { EstadoRespostaCampo, EstadoRespostas } from "./tipos";
import { ESTADO_VAZIO } from "./tipos";
import { avaliarCondicao } from "./condicoes";
import { TabelaCampo } from "./tabela-campo";
import { ReutilizavelControles } from "./reutilizavel-controles";
import { RastreabilidadeEvidencias } from "./rastreabilidade-evidencias";
import type { DadosRastreabilidade } from "./rastreabilidade-tipos";
import type { RespostasReutilizaveisRow } from "@/types/database";
import type { ValorSelecionado, ValorTabelaLinha } from "@/types/json-fields";

/**
 * Renderiza um campo (e seus sub-campos, recursivamente) de acordo com
 * tipo_campo. Sub-campos condicionais (ex.: detalhamento de "Alterado" no
 * exame físico por sistema — CLAUDE.md, "Regra de interface: exame físico
 * por sistemas") abrem/fecham na hora, sem reload, avaliando `condicao`
 * contra o estado local desta seção.
 */
export function CampoField({
  no,
  estado,
  onChange,
  tipoLaudoId,
  reutilizaveis,
  rastreabilidade,
}: {
  no: NoCampo;
  estado: EstadoRespostas;
  onChange: (campoId: string, patch: Partial<EstadoRespostaCampo>) => void;
  /** id do tipo_laudo do processo — só precisa pra gravar em "Salvar como reutilizável". */
  tipoLaudoId: string;
  /** Já filtrado no servidor pra este tipo_laudo (próprio ou genérico) — ver page.tsx. */
  reutilizaveis: RespostasReutilizaveisRow[];
  /** Dados de rastreabilidade (CLAUDE.md > "Regra: rastreabilidade") — só usado em campos requer_confirmacao_perito. */
  rastreabilidade: DadosRastreabilidade;
}) {
  const { campo, filhos } = no;
  const resposta = estado[campo.id] ?? ESTADO_VAZIO;
  const reutilizaveisDoCampo = reutilizaveis.filter((r) => r.campo_id === campo.id || r.campo_id === null);

  // Rastreabilidade só é possível apontando pra uma linha JÁ SALVA em
  // respostas_processo (a FK de resposta_evidencias exige isso) — e só faz
  // sentido quando o que está salvo e confirmado bate exatamente com o que
  // está na tela agora (senão a evidência ficaria presa a uma versão antiga
  // ou a uma marcação ainda não confirmada de verdade).
  const respostaPersistida = rastreabilidade.respostasPersistidas[campo.id];
  const podeVincularEvidencias =
    campo.requer_confirmacao_perito &&
    Boolean(respostaPersistida) &&
    respostaPersistida!.confirmadoPeloPerito &&
    resposta.confirmadoPeloPerito &&
    JSON.stringify(resposta.valorSelecionado) === JSON.stringify(respostaPersistida!.valorSelecionado) &&
    (resposta.textoLivre ?? "") === (respostaPersistida!.textoLivre ?? "");

  function patch(p: Partial<EstadoRespostaCampo>) {
    onChange(campo.id, p);
  }

  // Ao trocar a marcação de um campo que exige confirmação, a confirmação
  // anterior não vale mais pra nova escolha — nunca preenchemos isso sozinhos.
  function setValorSelecionado(novoValor: ValorSelecionado | null) {
    patch({
      valorSelecionado: novoValor,
      confirmadoPeloPerito: campo.requer_confirmacao_perito ? false : resposta.confirmadoPeloPerito,
    });
  }

  const valoresPorCodigoDosFilhos = new Map<string, ValorSelecionado | null>();
  for (const f of filhos) {
    valoresPorCodigoDosFilhos.set(f.campo.codigo, (estado[f.campo.id] ?? ESTADO_VAZIO).valorSelecionado);
  }
  // A própria marcação deste campo também pode ser o gatilho dos filhos (caso mais comum).
  valoresPorCodigoDosFilhos.set(campo.codigo, resposta.valorSelecionado);

  const filhosVisiveis = filhos.filter((f) => avaliarCondicao(f.campo.condicao, valoresPorCodigoDosFilhos));

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {campo.rotulo}
          {campo.obrigatorio && <span className="text-red-600"> *</span>}
        </label>

        {campo.tipo_campo === "selecao_unica" && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {(campo.opcoes ?? []).map((opcao) => (
              <label key={opcao.codigo} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name={campo.id}
                  checked={resposta.valorSelecionado === opcao.codigo}
                  onChange={() => setValorSelecionado(opcao.codigo)}
                />
                {opcao.rotulo}
              </label>
            ))}
          </div>
        )}

        {campo.tipo_campo === "selecao_multipla" && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {(campo.opcoes ?? []).map((opcao) => {
              const selecionados = Array.isArray(resposta.valorSelecionado)
                ? (resposta.valorSelecionado as string[])
                : [];
              const marcado = selecionados.includes(opcao.codigo);
              return (
                <label key={opcao.codigo} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => {
                      const novos = marcado
                        ? selecionados.filter((c) => c !== opcao.codigo)
                        : [...selecionados, opcao.codigo];
                      setValorSelecionado(novos.length > 0 ? novos : null);
                    }}
                  />
                  {opcao.rotulo}
                </label>
              );
            })}
          </div>
        )}

        {campo.tipo_campo === "texto_livre" && (
          <>
            <textarea
              value={resposta.textoLivre ?? ""}
              onChange={(e) => patch({ textoLivre: e.target.value || null })}
              rows={2}
              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
            />
            <ReutilizavelControles
              campoId={campo.id}
              tipoLaudoId={tipoLaudoId}
              reutilizaveis={reutilizaveisDoCampo}
              valorAtual={resposta.textoLivre ?? ""}
              onInserir={(conteudo) => patch({ textoLivre: conteudo })}
            />
          </>
        )}

        {campo.tipo_campo === "tabela" && (
          <TabelaCampo
            campo={campo}
            valor={resposta.valorSelecionado}
            onChange={(novoValor: ValorTabelaLinha[]) =>
              setValorSelecionado(novoValor.length > 0 ? novoValor : null)
            }
          />
        )}
      </div>

      {campo.tipo_campo !== "texto_livre" && campo.aceita_texto_livre && (
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Detalhamento (opcional)</label>
          <textarea
            value={resposta.textoLivre ?? ""}
            onChange={(e) => patch({ textoLivre: e.target.value || null })}
            rows={1}
            placeholder="Individualize/detalhe a resposta acima, se necessário"
            className="w-full rounded border border-zinc-200 dark:border-zinc-800 bg-transparent px-2 py-1 text-sm text-zinc-700 dark:text-zinc-300"
          />
          <ReutilizavelControles
            campoId={campo.id}
            tipoLaudoId={tipoLaudoId}
            reutilizaveis={reutilizaveisDoCampo}
            valorAtual={resposta.textoLivre ?? ""}
            onInserir={(conteudo) => patch({ textoLivre: conteudo })}
          />
        </div>
      )}

      {campo.requer_confirmacao_perito && (
        <label className="flex items-start gap-2 text-sm rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
          <input
            type="checkbox"
            checked={resposta.confirmadoPeloPerito}
            onChange={(e) => patch({ confirmadoPeloPerito: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            Confirmo esta conclusão médico-pericial. Enquanto não confirmada, a marcação acima é
            só um rascunho e não entra no texto do laudo.
          </span>
        </label>
      )}

      {campo.requer_confirmacao_perito && (
        <RastreabilidadeEvidencias
          podeVincular={podeVincularEvidencias}
          respostaId={respostaPersistida?.id}
          processoId={rastreabilidade.processoId}
          secaoId={rastreabilidade.secaoId}
          evidencias={
            respostaPersistida
              ? rastreabilidade.evidencias.filter((e) => e.resposta_id === respostaPersistida!.id)
              : []
          }
          achadosDisponiveis={rastreabilidade.achadosDisponiveis}
          documentosDisponiveis={rastreabilidade.documentosDisponiveis}
        />
      )}

      {filhosVisiveis.length > 0 && (
        <div className="ml-5 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-4">
          {filhosVisiveis.map((filho) => (
            <CampoField
              key={filho.campo.id}
              no={filho}
              estado={estado}
              onChange={onChange}
              tipoLaudoId={tipoLaudoId}
              reutilizaveis={reutilizaveis}
              rastreabilidade={rastreabilidade}
            />
          ))}
        </div>
      )}
    </div>
  );
}
