/**
 * Funções montadoras de seção do Fluxo Principal do Perito Judicial
 * (docs/plano-modulo-fluxo-principal.md §2-3). Cada módulo (Aceite,
 * Depósito, Agendamento, Honorários) vira UMA função pura que devolve
 * `SecaoCompilada`, reaproveitada tanto por um documento standalone quanto
 * pela Manifestação Consolidada — mesmo padrão de
 * `pos-laudo/compilar-quesitos-secao.ts` (`montarSecaoQuesitos`).
 *
 * Não é "use server": helper puro, sem acesso a banco — recebe o `processo`
 * já carregado por quem chama.
 *
 * `montarSecaoHonorarios` só é chamada pela Consolidada — Honorários não
 * tem petição avulsa (o modelo confirma isso), então não existe um
 * `compilar-honorarios.ts` standalone como os outros 3 módulos têm.
 */

import type { BlocoConteudo, SecaoCompilada } from "@/features/geracao-laudo/modelo";
import type { ConfiguracoesRow, ProcessosRow } from "@/types/database";
import {
  RESPONSAVEL_ADIANTAMENTO_ROTULOS,
  SITUACAO_DEPOSITO_ROTULOS,
  AGENDAMENTO_NECESSIDADE_ACOMPANHANTE_ROTULOS,
  HONORARIOS_COMPLEXIDADE_ROTULOS,
} from "./rotulos";

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

/** "HH:MM:SS" ou "HH:MM" do Postgres -> "HH:MM". */
function formatarHorario(horario: string | null): string | null {
  const m = horario?.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : null;
}

/**
 * Módulo COMUNICAÇÃO DE AGENDAMENTO DA PERÍCIA. A trava (alerta reversível de
 * depósito prévio — `verificarAlertaAgendamento`, em regras.ts) é checada por
 * quem CHAMA esta função — esta função monta a peça já assumindo que a
 * geração pode prosseguir (com ou sem confirmação do alerta).
 *
 * "Orientações ao periciado" (seção IV do modelo) é uma lista fixa de
 * documentos — igual às declarações fixas de `montarSecaoAceite`, não um
 * dado do processo — porque o modelo não a trata como configurável por
 * caso.
 */
export function montarSecaoAgendamento(
  processo: Pick<
    ProcessosRow,
    | "agendamento_data"
    | "agendamento_horario"
    | "agendamento_modalidade"
    | "agendamento_local"
    | "agendamento_endereco"
    | "agendamento_complemento"
    | "agendamento_referencia_acesso"
    | "agendamento_necessidade_acompanhante"
    | "agendamento_orientacoes_especificas"
  >,
  opts: { secaoId: string; ordem: number },
): SecaoCompilada {
  const blocos: BlocoConteudo[] = [];

  const linhas: [string, string][] = [
    ["Data", processo.agendamento_data ? formatarDataPura(processo.agendamento_data) : "—"],
    ["Horário", formatarHorario(processo.agendamento_horario) ?? "—"],
    ["Modalidade", processo.agendamento_modalidade ?? "—"],
    ["Local", processo.agendamento_local ?? "—"],
    ["Endereço completo", processo.agendamento_endereco ?? "—"],
    ["Complemento / sala", processo.agendamento_complemento ?? "—"],
    ["Referência / orientações de acesso", processo.agendamento_referencia_acesso ?? "—"],
  ];
  blocos.push({ tipo: "tabela", colunas: ["Campo", "Informação"], linhas });

  blocos.push(
    paragrafo(
      "Estando presentes as condições necessárias à realização do ato pericial, fica a perícia designada para a data, horário e local acima informados.",
    ),
  );
  blocos.push(
    paragrafo(
      "Solicita-se a intimação das partes para ciência do ato pericial, bem como de seus assistentes técnicos, quando regularmente indicados nos autos, observadas as determinações do Juízo.",
    ),
  );

  blocos.push(
    paragrafo(
      "O(a) periciado(a) deverá comparecer ao ato pericial munido(a) de documento oficial de identificação e, quando existentes e pertinentes ao objeto da perícia, dos seguintes documentos: exames de imagem e respectivos laudos, relatórios/atestados médicos, receitas e relação de medicamentos em uso, prontuários/documentos médicos e documentos trabalhistas/previdenciários pertinentes, quando ainda não disponíveis nos autos.",
    ),
  );
  if (processo.agendamento_necessidade_acompanhante) {
    blocos.push(
      paragrafo(
        `Necessidade de acompanhante: ${AGENDAMENTO_NECESSIDADE_ACOMPANHANTE_ROTULOS[processo.agendamento_necessidade_acompanhante]}.`,
      ),
    );
  }
  if (processo.agendamento_orientacoes_especificas?.trim()) {
    blocos.push(paragrafo(`Orientações específicas: ${processo.agendamento_orientacoes_especificas.trim()}`));
  }

  return {
    secaoId: opts.secaoId,
    codigo: "fluxo_principal_agendamento",
    titulo: "COMUNICAÇÃO DE AGENDAMENTO DA PERÍCIA",
    ordem: opts.ordem,
    blocos,
  };
}

/**
 * Módulo HONORÁRIOS PERICIAIS (seção III da Manifestação Consolidada — não
 * tem petição avulsa, só existe embutido aqui). O texto do corpo muda
 * conforme `honorarios_situacao`: proposta (usa `honorario_apresentado`),
 * concordância (usa `honorario_arbitrado`), ou — pra "valor insuficiente/
 * majoração" e "impugnados" — o modelo pede o texto do expediente
 * financeiro correspondente (nº 4 e nº 8 da Biblioteca de 32, fora desta
 * fatia); nesses dois casos a seção só registra a situação e aponta pro
 * expediente próprio, sem inventar um texto de negociação que não existe
 * ainda no sistema.
 */
export function montarSecaoHonorarios(
  processo: Pick<
    ProcessosRow,
    | "honorario_apresentado"
    | "honorario_arbitrado"
    | "honorarios_situacao"
    | "honorarios_complexidade"
    | "honorarios_horas_tecnicas_estimadas"
    | "honorarios_valor_hora_tecnica"
  >,
  opts: { secaoId: string; ordem: number },
): SecaoCompilada {
  const blocos: BlocoConteudo[] = [];

  if (processo.honorarios_complexidade) {
    blocos.push(paragrafo(`Complexidade: ${HONORARIOS_COMPLEXIDADE_ROTULOS[processo.honorarios_complexidade]}`));
  }
  if (processo.honorarios_horas_tecnicas_estimadas != null) {
    blocos.push(paragrafo(`Horas técnicas estimadas: ${processo.honorarios_horas_tecnicas_estimadas}`));
  }
  if (processo.honorarios_valor_hora_tecnica != null) {
    blocos.push(paragrafo(`Valor da hora técnica: R$ ${formatarValor(processo.honorarios_valor_hora_tecnica)}`));
  }

  switch (processo.honorarios_situacao) {
    case "nao_fixados":
      blocos.push(
        paragrafo(
          processo.honorario_apresentado != null
            ? `Considerando a natureza e a complexidade do objeto pericial, o volume documental e as atividades técnicas necessárias à adequada realização da prova, esta Perita apresenta proposta de honorários periciais no valor de R$ ${formatarValor(processo.honorario_apresentado)}.`
            : "Esta Perita apresentará proposta de honorários periciais oportunamente.",
        ),
      );
      blocos.push(
        paragrafo(
          "O valor proposto contempla as atividades técnicas ordinariamente necessárias à realização da perícia, sem prejuízo de eventual atividade extraordinária ou diligência superveniente não inicialmente previsível, cuja necessidade, se existente, será oportunamente submetida à apreciação do Juízo.",
        ),
      );
      break;
    case "arbitrados_concordancia":
      blocos.push(
        paragrafo(
          `Quanto aos honorários periciais arbitrados por este Juízo${processo.honorario_arbitrado != null ? ` no valor de R$ ${formatarValor(processo.honorario_arbitrado)}` : ""}, esta Perita manifesta sua concordância, mantendo o aceite do encargo e aguardando as providências necessárias à etapa financeira subsequente.`,
        ),
      );
      break;
    case "arbitrados_insuficiente_majoracao":
      blocos.push(
        paragrafo(
          "Os honorários periciais arbitrados neste caso mostram-se insuficientes diante da complexidade e do trabalho técnico exigido — o pedido de majoração correspondente é tratado em expediente próprio, não incluído nesta manifestação.",
        ),
      );
      break;
    case "impugnados":
      blocos.push(
        paragrafo(
          "Os honorários periciais fixados neste caso foram objeto de impugnação por uma das partes — a manifestação sobre essa impugnação é tratada em expediente próprio, não incluído nesta manifestação.",
        ),
      );
      break;
    case "justica_gratuita_regime_especifico":
      blocos.push(
        paragrafo(
          "Este processo está sob justiça gratuita ou regime específico de honorários periciais, observadas as regras aplicáveis a essa condição.",
        ),
      );
      break;
    default:
      blocos.push(paragrafo("Situação dos honorários periciais ainda não informada."));
  }

  return {
    secaoId: opts.secaoId,
    codigo: "fluxo_principal_honorarios",
    titulo: "HONORÁRIOS PERICIAIS",
    ordem: opts.ordem,
    blocos,
  };
}
