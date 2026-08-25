import type { CamposSecaoRow, SecoesRow } from "@/types/database";
import type { ValorSelecionado } from "@/types/json-fields";

/**
 * Geração do texto narrativo automático a partir das marcações (CLAUDE.md,
 * "Texto automático" e "Regra de exibição crítica"). Duas granularidades:
 *
 *  - por CAMPO (gerarNarrativoCampo): opcoes[].texto_automatico da opção
 *    marcada, ou campos_secao.texto_automatico_template (campos
 *    "guarda-chuva", ex.: sistema do exame físico) — persistido em
 *    respostas_processo.texto_narrativo.
 *  - por SEÇÃO (gerarNarrativoSecao): secoes.texto_automatico_template
 *    (parágrafo único combinando vários campos da seção) ou, na ausência
 *    dele, a concatenação dos narrativos dos campos de topo da seção —
 *    persistido em respostas_secao.texto_narrativo (ver migration
 *    20260823110000).
 *
 * Todo texto gerado aqui é só uma PRÉVIA — a perita sempre pode editar antes
 * de salvar (a UI decide o que persistir).
 */

/** Resposta mínima necessária para resolver valores/narrativo — subset de
 * RespostasProcessoRow, útil tanto no servidor quanto no client (estado local). */
export interface RespostaCampoParaNarrativo {
  valor_selecionado: ValorSelecionado | null;
  texto_livre: string | null;
  confirmado_pelo_perito: boolean;
}

export interface ContextoCampo {
  rotulo: string;
  /** Valor já resolvido pra uso em frase (rótulo da opção, rótulos concatenados, ou texto livre). null = ainda não respondido. */
  valorExibivel: string | null;
}

/** codigo do campo (campos_secao.codigo) -> contexto resolvido. Pode reunir
 * campos de qualquer seção do mesmo tipo_laudo — os templates podem
 * referenciar campos fora da própria seção (ver comentário da migration
 * 20260821130000). */
export type ContextoNarrativo = Map<string, ContextoCampo>;

/** Resolve o valor "exibível" de um campo a partir de valor_selecionado/texto_livre. */
export function valorExibivelCampo(
  campo: Pick<CamposSecaoRow, "tipo_campo" | "opcoes">,
  valorSelecionado: ValorSelecionado | null,
  textoLivre: string | null
): string | null {
  if (campo.tipo_campo === "texto_livre") {
    return textoLivre?.trim() || null;
  }
  if (campo.tipo_campo === "selecao_unica" && typeof valorSelecionado === "string") {
    return campo.opcoes?.find((o) => o.codigo === valorSelecionado)?.rotulo ?? null;
  }
  if (campo.tipo_campo === "selecao_multipla" && Array.isArray(valorSelecionado)) {
    const rotulos = (valorSelecionado as string[])
      .map((codigo) => campo.opcoes?.find((o) => o.codigo === codigo)?.rotulo)
      .filter((r): r is string => Boolean(r));
    return rotulos.length > 0 ? rotulos.join(", ") : null;
  }
  // tabela: fora do escopo de resolução de placeholder por enquanto.
  return null;
}

/**
 * Monta o contexto de resolução a partir de todos os campos do tipo_laudo e
 * das respostas do processo. Campos com requer_confirmacao_perito = true e
 * ainda não confirmados entram como "não informado" — a regra "o sistema não
 * decide, o perito decide" vale também pra propagação em outros textos.
 */
export function construirContexto(
  campos: CamposSecaoRow[],
  respostasPorCampoId: Map<string, RespostaCampoParaNarrativo>
): ContextoNarrativo {
  const contexto: ContextoNarrativo = new Map();
  for (const campo of campos) {
    const resposta = respostasPorCampoId.get(campo.id);
    const confirmacaoPendente = campo.requer_confirmacao_perito && !resposta?.confirmado_pelo_perito;
    contexto.set(campo.codigo, {
      rotulo: campo.rotulo,
      valorExibivel: confirmacaoPendente
        ? null
        : valorExibivelCampo(campo, resposta?.valor_selecionado ?? null, resposta?.texto_livre ?? null),
    });
  }
  return contexto;
}

/**
 * Substitui {{codigo_do_campo}} pelo valor exibível do contexto. Placeholder
 * sem campo correspondente no contexto (ex.: {{total_documentos}}, token
 * computado que este sistema ainda não resolve) é deixado como está, cru,
 * pra ficar óbvio que precisa de edição manual.
 *
 * Campo existente mas ainda sem resposta vira o marcador curto "[a
 * preencher]" — sem repetir o rótulo do campo. Templates com vários
 * placeholders na mesma frase (ex.: Seção X, "...memória imediata
 * {{memoria_imediata}}, recente {{memoria_recente}}...") já têm a palavra que
 * identifica o campo logo antes do placeholder; repetir o rótulo completo ali
 * (ex.: "[Funções executivas — organização: não informado]") lia como um
 * fallback de debug vazando pro meio da frase, não como um aviso de edição —
 * mantém o "chama atenção pra revisar antes de finalizar" sem o ruído.
 */
export function resolverPlaceholders(template: string, contexto: ContextoNarrativo): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, codigo: string) => {
    const item = contexto.get(codigo);
    if (!item) return match;
    return item.valorExibivel ?? "[a preencher]";
  });
}

/** Concatena texto_automatico das opções marcadas de UM campo de seleção, na
 * ordem em que aparecem em `opcoes` (não na ordem de marcação — mantém a
 * frase estável independente da ordem de clique). */
export function textoAutomaticoOpcoesCampo(
  campo: Pick<CamposSecaoRow, "tipo_campo" | "opcoes">,
  valorSelecionado: ValorSelecionado | null
): string | null {
  if (!campo.opcoes || campo.opcoes.length === 0) return null;
  if (campo.tipo_campo === "selecao_unica" && typeof valorSelecionado === "string") {
    return campo.opcoes.find((o) => o.codigo === valorSelecionado)?.texto_automatico?.trim() || null;
  }
  if (campo.tipo_campo === "selecao_multipla" && Array.isArray(valorSelecionado)) {
    const selecionados = valorSelecionado as string[];
    const textos = campo.opcoes
      .filter((o) => selecionados.includes(o.codigo))
      .map((o) => o.texto_automatico?.trim())
      .filter((t): t is string => Boolean(t));
    return textos.length > 0 ? textos.join(" ") : null;
  }
  return null;
}

/**
 * Narrativo de UM campo: texto_automatico_template do próprio campo (campos
 * "guarda-chuva", ex.: 13.1 Musculoesquelético) tem prioridade sobre o
 * texto_automatico por opção; nos dois casos, o texto livre de detalhamento
 * (quando existir) é anexado como frase adicional. Campo com confirmação
 * pendente nunca gera narrativo.
 */
export function gerarNarrativoCampo(
  campo: CamposSecaoRow,
  resposta: RespostaCampoParaNarrativo | undefined,
  contexto: ContextoNarrativo
): string | null {
  if (campo.requer_confirmacao_perito && !resposta?.confirmado_pelo_perito) return null;

  const partes: string[] = [];
  if (campo.texto_automatico_template) {
    partes.push(resolverPlaceholders(campo.texto_automatico_template, contexto));
  } else {
    const textoOpcoes = textoAutomaticoOpcoesCampo(campo, resposta?.valor_selecionado ?? null);
    if (textoOpcoes) partes.push(textoOpcoes);
  }
  if (campo.tipo_campo !== "texto_livre" && resposta?.texto_livre?.trim()) {
    partes.push(resposta.texto_livre.trim());
  }
  return partes.length > 0 ? partes.join(" ") : null;
}

/**
 * Narrativo composto de uma SEÇÃO: usa secoes.texto_automatico_template
 * quando existir (parágrafo único, pode referenciar campos de qualquer
 * seção do tipo_laudo); senão, concatena o narrativo dos campos de TOPO da
 * seção (sub-campos entram via o texto_automatico_template do campo pai,
 * não são somados de novo aqui, pra não duplicar).
 */
export function gerarNarrativoSecao(
  secao: Pick<SecoesRow, "texto_automatico_template">,
  camposDaSecao: CamposSecaoRow[],
  respostasPorCampoId: Map<string, RespostaCampoParaNarrativo>,
  contexto: ContextoNarrativo
): string | null {
  if (secao.texto_automatico_template) {
    return resolverPlaceholders(secao.texto_automatico_template, contexto);
  }
  const partes: string[] = [];
  for (const campo of camposDaSecao) {
    if (campo.parent_campo_id) continue;
    const texto = gerarNarrativoCampo(campo, respostasPorCampoId.get(campo.id), contexto);
    if (texto) partes.push(texto);
  }
  return partes.length > 0 ? partes.join(" ") : null;
}
