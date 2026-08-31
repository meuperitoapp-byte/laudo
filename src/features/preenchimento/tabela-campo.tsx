"use client";

import type { CamposSecaoRow } from "@/types/database";
import type { ColunaTabelaConfig, ConfigTabela } from "@/types/json-fields";
import type { ValorSelecionado, ValorTabelaLinha } from "@/types/json-fields";

/**
 * Renderiza tipo_campo = 'tabela'. Dois formatos, conforme config_tabela:
 *
 *  1. Linhas fixas x UMA coluna DE SELEÇÃO (ex.: Curatela — avaliação
 *     funcional, escala 0-3/NA). Formato original, valor por linha em
 *     ValorTabelaLinhaSimples ({linha, valor}). O corpo do branch (render em
 *     <select>) segue intocado desde a Etapa 4; só o guard de roteamento ficou
 *     mais estrito — 1 coluna de TEXTO não entra mais aqui, vai pro Formato 2.
 *  2. Qualquer outro caso (1 coluna de texto, 2+ colunas fechadas/texto, e/ou linhas
 *     dinâmicas — ex.: Trabalhista "Matriz de exposição a riscos" 6x6,
 *     "Matriz de análise do nexo causal" 15x2, Previdenciário "Benefícios
 *     anteriores" com linhas que a perita adiciona) — valor por linha em
 *     ValorTabelaLinhaMultipla ({linha, valores: {coluna_codigo: valor}}).
 */
/** Coluna que rende um <select> (tem opções): tipo explícito 'selecao_unica'
 * ou, formato antigo, sem tipo mas com `opcoes`. */
function colunaEhSelecao(coluna: ColunaTabelaConfig): boolean {
  return coluna.tipo === "selecao_unica" || (!coluna.tipo && Boolean(coluna.opcoes?.length));
}

export function TabelaCampo({
  campo,
  valor,
  onChange,
}: {
  campo: CamposSecaoRow;
  valor: ValorSelecionado | null;
  onChange: (novoValor: ValorTabelaLinha[]) => void;
}) {
  const config = campo.config_tabela;
  if (!config) return null;

  // Formato 1 (valor por linha em ValorTabelaLinhaSimples) só se aplica quando
  // a única coluna é fechada/selecionável — ex.: Curatela, escala 0-3/NA. Uma
  // tabela de 1 coluna de TEXTO cai no Formato 2 (linhas fixas x colunas), que
  // renderiza <input> de texto — senão o renderer mostrava um <select> vazio.
  const linhaFixaUmaColunaSelecao =
    config.colunas.length === 1 && !config.linhas_dinamicas && colunaEhSelecao(config.colunas[0]);

  if (linhaFixaUmaColunaSelecao) {
    return <TabelaLinhaFixaUmaColuna config={config} valor={valor} onChange={onChange} />;
  }

  return <TabelaMultiColuna campo={campo} config={config} valor={valor} onChange={onChange} />;
}

// ============================================================================
// Formato 1 — linhas fixas x uma coluna fechada (comportamento original)
// ============================================================================

function TabelaLinhaFixaUmaColuna({
  config,
  valor,
  onChange,
}: {
  config: ConfigTabela;
  valor: ValorSelecionado | null;
  onChange: (novoValor: ValorTabelaLinha[]) => void;
}) {
  const linhasValor =
    Array.isArray(valor) && valor.length > 0 && typeof valor[0] === "object" ? (valor as ValorTabelaLinha[]) : [];

  const coluna = config.colunas[0];

  function valorDaLinha(linhaCodigo: string): string {
    const entrada = linhasValor.find((l) => l.linha === linhaCodigo);
    return entrada && "valor" in entrada ? entrada.valor : "";
  }

  function setValorDaLinha(linhaCodigo: string, novoValor: string) {
    const resto = linhasValor.filter((l) => l.linha !== linhaCodigo);
    onChange(novoValor ? [...resto, { linha: linhaCodigo, valor: novoValor }] : resto);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-nevoa-300 dark:border-nevoa-700 text-left">
            <th className="py-1.5 pr-3 font-medium text-nevoa-600 dark:text-nevoa-400">Item</th>
            <th className="py-1.5 font-medium text-nevoa-600 dark:text-nevoa-400">
              {coluna.rotulo ?? "Valor"}
            </th>
          </tr>
        </thead>
        <tbody>
          {config.linhas.map((linha) => (
            <tr key={linha.codigo} className="border-b border-nevoa-100 dark:border-nevoa-800">
              <td className="py-1.5 pr-3">{linha.rotulo}</td>
              <td className="py-1.5">
                <select
                  value={valorDaLinha(linha.codigo)}
                  onChange={(e) => setValorDaLinha(linha.codigo, e.target.value)}
                  className="rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-2 py-1 text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
                >
                  <option value="">— selecione —</option>
                  {(coluna.opcoes ?? []).map((opcao) => (
                    <option key={opcao.codigo} value={opcao.codigo}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Formato 2 — várias colunas e/ou linhas dinâmicas
// ============================================================================

function valoresDaLinha(entrada: ValorTabelaLinha | undefined): Record<string, string> {
  if (entrada && "valores" in entrada) return entrada.valores;
  return {};
}

function CelulaTabela({
  coluna,
  valor,
  onChange,
}: {
  coluna: ColunaTabelaConfig;
  valor: string;
  onChange: (novoValor: string) => void;
}) {
  if (colunaEhSelecao(coluna)) {
    return (
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-2 py-1 text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
      >
        <option value="">— selecione —</option>
        {(coluna.opcoes ?? []).map((opcao) => (
          <option key={opcao.codigo} value={opcao.codigo}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="text"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-2 py-1 text-nevoa-900 dark:text-nevoa-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500"
    />
  );
}

function TabelaMultiColuna({
  campo,
  config,
  valor,
  onChange,
}: {
  campo: Pick<CamposSecaoRow, "rotulo">;
  config: ConfigTabela;
  valor: ValorSelecionado | null;
  onChange: (novoValor: ValorTabelaLinha[]) => void;
}) {
  const linhasValor: ValorTabelaLinha[] = Array.isArray(valor) ? (valor as ValorTabelaLinha[]) : [];

  function setCelula(linhaId: string, colunaCodigo: string, novoValor: string) {
    const resto = linhasValor.filter((l) => l.linha !== linhaId);
    const atuais = valoresDaLinha(linhasValor.find((l) => l.linha === linhaId));
    const novosValores = { ...atuais, [colunaCodigo]: novoValor };
    onChange([...resto, { linha: linhaId, valores: novosValores }]);
  }

  if (config.linhas_dinamicas) {
    function adicionarLinha() {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `linha-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      onChange([...linhasValor, { linha: id, valores: {} }]);
    }
    function removerLinha(linhaId: string) {
      onChange(linhasValor.filter((l) => l.linha !== linhaId));
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-nevoa-300 dark:border-nevoa-700 text-left">
              {config.colunas.map((coluna) => (
                <th key={coluna.codigo} className="py-1.5 pr-3 font-medium text-nevoa-600 dark:text-nevoa-400">
                  {coluna.rotulo ?? coluna.codigo}
                </th>
              ))}
              <th className="py-1.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {linhasValor.length === 0 && (
              <tr>
                <td colSpan={config.colunas.length + 1} className="py-2 text-nevoa-500 dark:text-nevoa-400 italic">
                  Nenhuma linha adicionada ainda.
                </td>
              </tr>
            )}
            {linhasValor.map((linha) => {
              const celulas = valoresDaLinha(linha);
              return (
                <tr key={linha.linha} className="border-b border-nevoa-100 dark:border-nevoa-800 align-top">
                  {config.colunas.map((coluna) => (
                    <td key={coluna.codigo} className="py-1.5 pr-3">
                      <CelulaTabela
                        coluna={coluna}
                        valor={celulas[coluna.codigo] ?? ""}
                        onChange={(v) => setCelula(linha.linha, coluna.codigo, v)}
                      />
                    </td>
                  ))}
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => removerLinha(linha.linha)}
                      aria-label={`Remover linha`}
                      title="Remover linha"
                      className="text-nevoa-400 hover:text-vinho-600 dark:hover:text-vinho-400"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={adicionarLinha}
          className="mt-2 text-xs text-petroleo-600 hover:underline dark:text-petroleo-400"
        >
          + Adicionar linha ({campo.rotulo})
        </button>
      </div>
    );
  }

  // Linhas fixas (config.linhas) x múltiplas colunas.
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-nevoa-300 dark:border-nevoa-700 text-left">
            <th className="py-1.5 pr-3 font-medium text-nevoa-600 dark:text-nevoa-400">Item</th>
            {config.colunas.map((coluna) => (
              <th key={coluna.codigo} className="py-1.5 pr-3 font-medium text-nevoa-600 dark:text-nevoa-400">
                {coluna.rotulo ?? coluna.codigo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {config.linhas.map((linha) => {
            const celulas = valoresDaLinha(linhasValor.find((l) => l.linha === linha.codigo));
            return (
              <tr key={linha.codigo} className="border-b border-nevoa-100 dark:border-nevoa-800 align-top">
                <td className="py-1.5 pr-3">{linha.rotulo}</td>
                {config.colunas.map((coluna) => (
                  <td key={coluna.codigo} className="py-1.5 pr-3">
                    <CelulaTabela
                      coluna={coluna}
                      valor={celulas[coluna.codigo] ?? ""}
                      onChange={(v) => setCelula(linha.codigo, coluna.codigo, v)}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
