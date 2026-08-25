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

/** Chip compacto pra radio — mesma semântica do <input>, só a casca visual muda. Pensado pra listas densas (60+ campos por seção). */
function ChipRadio({
  nome,
  checked,
  onChange,
  children,
}: {
  nome: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
        checked
          ? "border-petroleo-600 bg-petroleo-100 text-petroleo-700 dark:border-petroleo-400 dark:bg-petroleo-950/50 dark:text-petroleo-300"
          : "border-nevoa-300 text-nevoa-700 hover:bg-nevoa-50 dark:border-nevoa-700 dark:text-nevoa-300 dark:hover:bg-nevoa-800/60"
      }`}
    >
      <input type="radio" name={nome} checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden="true"
        className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full border ${
          checked ? "border-petroleo-600 dark:border-petroleo-400" : "border-nevoa-400 dark:border-nevoa-600"
        }`}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-petroleo-600 dark:bg-petroleo-400" />}
      </span>
      {children}
    </label>
  );
}

/** Chip compacto pra checkbox — mesmo espírito do ChipRadio acima. */
function ChipCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm cursor-pointer transition-colors ${
        checked
          ? "border-petroleo-600 bg-petroleo-100 text-petroleo-700 dark:border-petroleo-400 dark:bg-petroleo-950/50 dark:text-petroleo-300"
          : "border-nevoa-300 text-nevoa-700 hover:bg-nevoa-50 dark:border-nevoa-700 dark:text-nevoa-300 dark:hover:bg-nevoa-800/60"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden="true"
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
          checked
            ? "border-petroleo-600 bg-petroleo-600 dark:border-petroleo-400 dark:bg-petroleo-400"
            : "border-nevoa-400 dark:border-nevoa-600"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white dark:text-nevoa-900" fill="none">
            <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {children}
    </label>
  );
}

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
        <label className="block text-sm font-medium text-nevoa-800 dark:text-nevoa-200 mb-1.5">
          {campo.rotulo}
          {campo.obrigatorio && <span className="text-vinho-600 dark:text-vinho-400"> *</span>}
        </label>

        {campo.tipo_campo === "selecao_unica" && (
          <div className="flex flex-wrap gap-1.5">
            {(campo.opcoes ?? []).map((opcao) => (
              <ChipRadio
                key={opcao.codigo}
                nome={campo.id}
                checked={resposta.valorSelecionado === opcao.codigo}
                onChange={() => setValorSelecionado(opcao.codigo)}
              >
                {opcao.rotulo}
              </ChipRadio>
            ))}
          </div>
        )}

        {campo.tipo_campo === "selecao_multipla" && (
          <div className="flex flex-wrap gap-1.5">
            {(campo.opcoes ?? []).map((opcao) => {
              const selecionados = Array.isArray(resposta.valorSelecionado)
                ? (resposta.valorSelecionado as string[])
                : [];
              const marcado = selecionados.includes(opcao.codigo);
              return (
                <ChipCheckbox
                  key={opcao.codigo}
                  checked={marcado}
                  onChange={() => {
                    const novos = marcado
                      ? selecionados.filter((c) => c !== opcao.codigo)
                      : [...selecionados, opcao.codigo];
                    setValorSelecionado(novos.length > 0 ? novos : null);
                  }}
                >
                  {opcao.rotulo}
                </ChipCheckbox>
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
              className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-2 py-1.5 text-sm text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
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
          <label className="block text-xs text-nevoa-500 dark:text-nevoa-400 mb-1">Detalhamento (opcional)</label>
          <textarea
            value={resposta.textoLivre ?? ""}
            onChange={(e) => patch({ textoLivre: e.target.value || null })}
            rows={1}
            placeholder="Individualize/detalhe a resposta acima, se necessário"
            className="w-full rounded-md border border-nevoa-200 dark:border-nevoa-800 bg-transparent px-2 py-1 text-sm text-nevoa-700 dark:text-nevoa-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
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
        <label className="flex items-start gap-2 text-sm rounded-md border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-100 dark:bg-ambar-950/30 text-nevoa-800 dark:text-nevoa-200 px-3 py-2">
          <input
            type="checkbox"
            checked={resposta.confirmadoPeloPerito}
            onChange={(e) => patch({ confirmadoPeloPerito: e.target.checked })}
            className="mt-0.5 accent-petroleo-600"
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
        <div className="ml-5 pl-4 border-l-2 border-nevoa-200 dark:border-nevoa-800 space-y-4">
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
