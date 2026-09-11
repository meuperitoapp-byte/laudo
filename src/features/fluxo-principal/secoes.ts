/**
 * Funções montadoras de seção do Fluxo Principal do Perito Judicial — fatia
 * 1 (docs/plano-modulo-fluxo-principal.md §2-3). Cada módulo (Aceite,
 * Depósito, e futuramente Honorários/Agendamento) vira UMA função pura que
 * devolve `SecaoCompilada`, reaproveitada tanto por um documento standalone
 * quanto pela Manifestação Consolidada — mesmo padrão de
 * `pos-laudo/compilar-quesitos-secao.ts` (`montarSecaoQuesitos`).
 *
 * Não é "use server": helper puro, sem acesso a banco — recebe o `processo`
 * já carregado por quem chama.
 *
 * Aceite e Depósito são os 2 módulos com schema pronto (migration
 * 20260911120000). Honorários e Agendamento ainda não têm schema — entram
 * quando esses campos existirem (ver plano §5, fatias seguintes).
 */

import type { BlocoConteudo, SecaoCompilada } from "@/features/geracao-laudo/modelo";
import type { ConfiguracoesRow, ProcessosRow } from "@/types/database";
import { RESPONSAVEL_ADIANTAMENTO_ROTULOS, SITUACAO_DEPOSITO_ROTULOS } from "./rotulos";

function paragrafo(texto: string): BlocoConteudo {
  return { tipo: "paragrafo", texto };
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY", sem passar por Date (mesmo cuidado de fuso do resto do sistema). */
function formatarDataPura(data: string | null): string {
  const m = data?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

/** numeric(14,2) do Postgres chega como number — formata em BRL sem depender de libs externas. */
function formatarValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Módulo ACEITE DO ENCARGO PERICIAL. A trava (impedimento/competência —
 * `verificarTravaAceite`, em regras.ts) é checada por quem CHAMA esta
 * função, antes de chamá-la — esta função monta a peça já assumindo que o
 * aceite pode ser gerado.
 */
export function montarSecaoAceite(
  processo: Pick<
    ProcessosRow,
    "nomeacao_id" | "nomeacao_data" | "nomeacao_ciencia_data" | "nomeacao_prazo_manifestacao" | "objeto_pericia" | "aceite_necessita_especialista"
  >,
  opts: { secaoId: string; ordem: number },
): SecaoCompilada {
  const blocos: BlocoConteudo[] = [];

  if (processo.nomeacao_id) blocos.push(paragrafo(`ID da nomeação: ${processo.nomeacao_id}`));
  if (processo.nomeacao_data) blocos.push(paragrafo(`Data da nomeação: ${formatarDataPura(processo.nomeacao_data)}`));
  if (processo.nomeacao_ciencia_data) blocos.push(paragrafo(`Data da ciência: ${formatarDataPura(processo.nomeacao_ciencia_data)}`));
  if (processo.nomeacao_prazo_manifestacao) {
    blocos.push(paragrafo(`Prazo para manifestação: ${formatarDataPura(processo.nomeacao_prazo_manifestacao)}`));
  }
  if (processo.objeto_pericia) blocos.push(paragrafo(`Objeto pericial: ${processo.objeto_pericia}`));

  blocos.push(
    paragrafo(
      "Após análise do objeto da perícia e dos elementos inicialmente disponibilizados nos autos, esta Perita informa que aceita o encargo pericial para o qual foi nomeada, declarando, neste momento, não identificar circunstância de impedimento ou suspeição que inviabilize sua atuação.",
    ),
  );
  blocos.push(
    paragrafo(
      "Declara, ainda, possuir competência técnica para realização da perícia dentro dos limites do objeto estabelecido pelo Juízo, comprometendo-se a desempenhar o encargo com independência, imparcialidade e observância das normas técnicas e processuais aplicáveis.",
    ),
  );
  if (processo.aceite_necessita_especialista) {
    blocos.push(
      paragrafo("Registra-se a necessidade de especialista complementar para a adequada realização da perícia."),
    );
  }

  return {
    secaoId: opts.secaoId,
    codigo: "fluxo_principal_aceite",
    titulo: "ACEITE DO ENCARGO PERICIAL",
    ordem: opts.ordem,
    blocos,
  };
}

/**
 * Módulo INFORMAÇÃO DE DADOS PARA DEPÓSITO DOS HONORÁRIOS.
 *
 * Os dados bancários (`configuracoes`) só entram no documento quando as DUAS
 * condições valem ao mesmo tempo: (1) `processo.deposito_forma_disponibilizacao
 * === 'dados_bancarios'` — quando for `'conta_judicial'`, ficam de fora
 * SEMPRE, em qualquer hipótese, não importa o resto; (2)
 * `opts.confirmarExposicaoDadosBancarios === true` — quem chama esta função
 * precisa passar essa confirmação explicitamente a cada geração (não existe
 * valor default "true"), exatamente como o modelo pede ("os dados bancários
 * devem ser... confirmados antes da geração").
 */
export function montarSecaoDeposito(
  processo: Pick<
    ProcessosRow,
    "honorario_arbitrado" | "deposito_situacao" | "deposito_valor" | "deposito_data" | "deposito_responsavel_adiantamento" | "deposito_forma_disponibilizacao"
  >,
  dadosBancarios: Pick<
    ConfiguracoesRow,
    "dados_bancarios_titular" | "dados_bancarios_cpf_cnpj" | "dados_bancarios_banco" | "dados_bancarios_codigo_banco" | "dados_bancarios_agencia" | "dados_bancarios_conta" | "dados_bancarios_tipo_conta" | "dados_bancarios_chave_pix"
  > | null,
  opts: { secaoId: string; ordem: number; confirmarExposicaoDadosBancarios: boolean },
): SecaoCompilada {
  const blocos: BlocoConteudo[] = [];

  if (processo.honorario_arbitrado != null) {
    blocos.push(paragrafo(`Valor fixado: R$ ${formatarValor(processo.honorario_arbitrado)}`));
  }
  if (processo.deposito_responsavel_adiantamento) {
    blocos.push(
      paragrafo(`Responsável pelo adiantamento: ${RESPONSAVEL_ADIANTAMENTO_ROTULOS[processo.deposito_responsavel_adiantamento]}`),
    );
  }

  const podeExporDadosBancarios =
    processo.deposito_forma_disponibilizacao === "dados_bancarios" &&
    opts.confirmarExposicaoDadosBancarios &&
    dadosBancarios !== null;
  if (podeExporDadosBancarios) {
    const linhas: [string, string][] = [
      ["Titular", dadosBancarios.dados_bancarios_titular ?? "—"],
      ["CPF/CNPJ", dadosBancarios.dados_bancarios_cpf_cnpj ?? "—"],
      ["Banco", dadosBancarios.dados_bancarios_banco ?? "—"],
      ["Código do banco", dadosBancarios.dados_bancarios_codigo_banco ?? "—"],
      ["Agência", dadosBancarios.dados_bancarios_agencia ?? "—"],
      ["Conta", dadosBancarios.dados_bancarios_conta ?? "—"],
      ["Tipo de conta", dadosBancarios.dados_bancarios_tipo_conta ?? "—"],
      ["Chave PIX", dadosBancarios.dados_bancarios_chave_pix ?? "—"],
    ];
    blocos.push({ tipo: "tabela", colunas: ["Campo", "Informação"], linhas: linhas.map(([campo, valor]) => [campo, valor]) });
  }

  blocos.push(
    paragrafo(
      "Para fins de regular prosseguimento da prova pericial, requer-se que o depósito dos honorários seja realizado na forma determinada por este Juízo, com posterior certificação/comprovação nos autos.",
    ),
  );
  blocos.push(
    paragrafo(
      `Situação do depósito: ${processo.deposito_situacao ? SITUACAO_DEPOSITO_ROTULOS[processo.deposito_situacao] : SITUACAO_DEPOSITO_ROTULOS.nao_realizado}`,
    ),
  );
  if (processo.deposito_valor != null) blocos.push(paragrafo(`Valor já depositado: R$ ${formatarValor(processo.deposito_valor)}`));
  if (processo.deposito_data) blocos.push(paragrafo(`Data do depósito: ${formatarDataPura(processo.deposito_data)}`));

  return {
    secaoId: opts.secaoId,
    codigo: "fluxo_principal_deposito",
    titulo: "INFORMAÇÃO DE DADOS PARA DEPÓSITO DOS HONORÁRIOS",
    ordem: opts.ordem,
    blocos,
  };
}
