"use client";

import { useState, useTransition } from "react";
import { createProcesso, updateProcesso } from "@/features/processos/actions";
import { Botao } from "@/components/ui/button";
import { ComboboxCatalogo } from "@/components/ui/combobox-catalogo";
import type { ProcessosRow, TiposLaudoRow } from "@/types/database";
import type { EtapaContratada } from "@/types/enums";

const ETAPAS_CONTRATADAS: { codigo: EtapaContratada; rotulo: string }[] = [
  { codigo: "analise_viabilidade", rotulo: "Análise de viabilidade" },
  { codigo: "parecer_tecnico", rotulo: "Parecer técnico" },
  { codigo: "assistencia_tecnica_fase_1", rotulo: "Assistência técnica — fase 1" },
  { codigo: "assistencia_tecnica_fase_2", rotulo: "Assistência técnica — fase 2" },
  { codigo: "quesitos", rotulo: "Quesitos" },
  { codigo: "declaracao", rotulo: "Declaração" },
  { codigo: "atestados", rotulo: "Atestados" },
];

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "placeholder:text-nevoa-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-sm font-medium text-nevoa-700 dark:text-nevoa-300 mb-1.5";

/** Cartão de seção — agrupa um bloco relacionado do formulário (pedido #1 da passada de UI/UX). */
function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-6 space-y-4">
      <legend className="font-title text-base font-semibold text-nevoa-900 dark:text-nevoa-100 px-1">{titulo}</legend>
      {children}
    </fieldset>
  );
}

/** Radio customizado em formato de cartão selecionável — mesmo <input> nativo, só a casca visual muda. */
function OpcaoRadio({
  name,
  value,
  rotulo,
  checked,
  onChange,
  required,
}: {
  name: string;
  value: string;
  rotulo: string;
  checked: boolean;
  onChange: () => void;
  required?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm cursor-pointer transition-colors ${
        checked
          ? "border-petroleo-600 bg-petroleo-100 dark:border-petroleo-400 dark:bg-petroleo-950/50"
          : "border-nevoa-300 dark:border-nevoa-700 hover:bg-nevoa-50 dark:hover:bg-nevoa-800/60"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        required={required}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          checked ? "border-petroleo-600 dark:border-petroleo-400" : "border-nevoa-400 dark:border-nevoa-600"
        }`}
        aria-hidden="true"
      >
        {checked && <span className="h-2 w-2 rounded-full bg-petroleo-600 dark:bg-petroleo-400" />}
      </span>
      <span className="font-medium text-nevoa-900 dark:text-nevoa-100">{rotulo}</span>
    </label>
  );
}

/** Checkbox customizado no mesmo espírito do radio acima. */
function OpcaoCheckbox({
  name,
  value,
  rotulo,
  defaultChecked,
}: {
  name: string;
  value: string;
  rotulo: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked ?? false);
  return (
    <label
      className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm cursor-pointer transition-colors ${
        checked
          ? "border-petroleo-600 bg-petroleo-100 dark:border-petroleo-400 dark:bg-petroleo-950/50"
          : "border-nevoa-300 dark:border-nevoa-700 hover:bg-nevoa-50 dark:hover:bg-nevoa-800/60"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked
            ? "border-petroleo-600 bg-petroleo-600 dark:border-petroleo-400 dark:bg-petroleo-400"
            : "border-nevoa-400 dark:border-nevoa-600"
        }`}
        aria-hidden="true"
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white dark:text-nevoa-900" fill="none">
            <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="font-medium text-nevoa-900 dark:text-nevoa-100">{rotulo}</span>
    </label>
  );
}

/** Campo monetário — input numérico com prefixo "R$". Guarda o número puro. */
function CampoMoeda({
  id,
  name,
  rotulo,
  defaultValue,
}: {
  id: string;
  name: string;
  rotulo: string;
  defaultValue?: number | null;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {rotulo}
      </label>
      <div className="flex items-center rounded-md border border-nevoa-300 dark:border-nevoa-700 focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-petroleo-500">
        <span className="pl-3 pr-1 text-sm text-nevoa-500 dark:text-nevoa-400">R$</span>
        <input
          id={id}
          name={name}
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          defaultValue={defaultValue ?? ""}
          placeholder="0,00"
          className="w-full rounded-md bg-transparent px-2 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 placeholder:text-nevoa-400 focus-visible:outline-none"
        />
      </div>
    </div>
  );
}

export function ProcessoForm({
  modo,
  processo,
  tiposLaudo,
  sugestoesVara,
  sugestoesComarca,
  sugestoesSituacao,
  sugestoesFinanceira,
  sugestoesAcaoObjeto,
}: {
  modo: "criar" | "editar";
  processo?: ProcessosRow | null;
  tiposLaudo: TiposLaudoRow[];
  sugestoesVara: string[];
  sugestoesComarca: string[];
  sugestoesSituacao: string[];
  sugestoesFinanceira: string[];
  sugestoesAcaoObjeto: string[];
}) {
  const editando = modo === "editar" && processo != null;

  const [tipoTrabalho, setTipoTrabalho] = useState<
    "pericia_judicial" | "assistencia_tecnica" | null
  >(editando ? processo!.tipo_trabalho : null);
  const [error, setError] = useState<string | null>(null);
  const [tipoLaudoId, setTipoLaudoId] = useState(processo?.tipo_laudo_id ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editando
        ? await updateProcesso(processo!.id, formData)
        : await createProcesso(formData);
      if (result?.error) {
        setError(result.error);
      }
      // Em caso de sucesso, a action redireciona no servidor.
    });
  }

  const mostraJudicial = tipoTrabalho === "pericia_judicial";
  const mostraAssistencia = tipoTrabalho === "assistencia_tecnica";

  // O cabeçalho formal do laudo (cabecalho.ts) não sabe o tipo de laudo — só usa
  // processo.tipo_vara + vara_numero (texto livre). Para Criminal isso é
  // arriscado: se a perita não escrever "Vara Criminal", o endereçamento penal
  // sai genérico. Avisos condicionais no formulário reduzem o esquecimento sem
  // preencher nada por conta própria (o sistema não decide, o perito decide).
  const laudoSelecionado = tiposLaudo.find((tl) => tl.id === tipoLaudoId) ?? null;
  const laudoEhCriminal = laudoSelecionado?.codigo === "criminal";

  return (
    <form action={handleSubmit} className="space-y-6">
      {editando && <input type="hidden" name="tipo_trabalho" value={processo!.tipo_trabalho} />}

      {editando ? (
        <Cartao titulo="Situação do processo">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className={labelClass}>
                Andamento
              </label>
              <select id="status" name="status" className={inputClass} defaultValue={processo!.status}>
                <option value="em_andamento">Em andamento</option>
                <option value="finalizado">Finalizado</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="situacao_processo" className={labelClass}>
              Situação do Processo
            </label>
            <ComboboxCatalogo
              id="situacao_processo"
              name="situacao_processo"
              sugestoes={sugestoesSituacao}
              valorInicial={processo!.situacao_processo ?? ""}
              rotuloNovo="Nova situação do processo"
              placeholder="ex.: Aguardando Perícia, Aguardando Montagem de Laudo..."
            />
          </div>
        </Cartao>
      ) : (
        <Cartao titulo="1. Tipo de trabalho">
          <div className="grid grid-cols-2 gap-3">
            <OpcaoRadio
              name="tipo_trabalho"
              value="pericia_judicial"
              rotulo="Perícia Judicial"
              required
              checked={tipoTrabalho === "pericia_judicial"}
              onChange={() => setTipoTrabalho("pericia_judicial")}
            />
            <OpcaoRadio
              name="tipo_trabalho"
              value="assistencia_tecnica"
              rotulo="Assistência Técnica"
              checked={tipoTrabalho === "assistencia_tecnica"}
              onChange={() => setTipoTrabalho("assistencia_tecnica")}
            />
          </div>
        </Cartao>
      )}

      {mostraJudicial && (
        <Cartao titulo={editando ? "Dados do processo" : "2. Dados do processo"}>
          <div>
            <label htmlFor="numero_processo" className={labelClass}>
              Número do processo
            </label>
            <input
              id="numero_processo"
              name="numero_processo"
              className={inputClass}
              defaultValue={processo?.numero_processo ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tipo_vara" className={labelClass}>
                Vara
              </label>
              <select
                id="tipo_vara"
                name="tipo_vara"
                className={inputClass}
                defaultValue={processo?.tipo_vara ?? ""}
              >
                <option value="">Selecione...</option>
                <option value="federal">Federal</option>
                <option value="estadual">Estadual</option>
                <option value="trabalho">Trabalho</option>
              </select>
            </div>
            <div>
              <label htmlFor="vara_numero" className={labelClass}>
                Número da vara
              </label>
              <ComboboxCatalogo
                id="vara_numero"
                name="vara_numero"
                sugestoes={sugestoesVara}
                valorInicial={processo?.vara_numero ?? ""}
                rotuloNovo="Nova vara"
                placeholder="ex.: 3ª, ou 3ª Vara Cível, 3ª Vara de Família, 3ª Vara do Trabalho..."
              />
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
                Se a vara tiver especialização (Cível, Família, do Trabalho...), inclua aqui — é o
                que vai pro endereçamento formal do laudo final. Comece a digitar pra ver varas já
                usadas, ou cadastre uma nova na hora.
              </p>
              {laudoEhCriminal && (
                <p className="text-xs mt-2 rounded-md border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-100 dark:bg-ambar-950/30 text-nevoa-800 dark:text-nevoa-200 px-3 py-2">
                  <strong>Laudo Criminal:</strong> selecione <strong>Estadual</strong> em “Vara” e
                  escreva algo como <strong>“2ª Vara Criminal”</strong> aqui — é esse texto que vai
                  pro endereçamento penal do laudo final.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label htmlFor="comarca_subsecao" className={labelClass}>
                Comarca / Subseção Judiciária
              </label>
              <ComboboxCatalogo
                id="comarca_subsecao"
                name="comarca_subsecao"
                sugestoes={sugestoesComarca}
                valorInicial={processo?.comarca_subsecao ?? ""}
                rotuloNovo="Nova comarca"
              />
            </div>
            <div>
              <label htmlFor="uf" className={labelClass}>
                UF
              </label>
              <input
                id="uf"
                name="uf"
                maxLength={2}
                className={inputClass}
                defaultValue={processo?.uf ?? ""}
              />
            </div>
          </div>

          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            Polo Ativo e Polo Passivo (autor/réu, reclamante/reclamado, curatelando/curatelado etc.,
            com quantas pessoas forem necessárias) são cadastrados na própria tela do processo.
          </p>

          <div>
            <label htmlFor="objeto_pericia" className={labelClass}>
              Objeto da perícia (pontos controvertidos)
            </label>
            <textarea
              id="objeto_pericia"
              name="objeto_pericia"
              rows={3}
              className={inputClass}
              defaultValue={processo?.objeto_pericia ?? ""}
            />
          </div>
        </Cartao>
      )}

      {mostraJudicial && (
        <Cartao titulo="Dados do(a) periciando(a)">
          <div>
            <label htmlFor="periciando_nome" className={labelClass}>
              Nome
            </label>
            <input
              id="periciando_nome"
              name="periciando_nome"
              className={inputClass}
              defaultValue={processo?.periciando_nome ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="periciando_cpf" className={labelClass}>
                CPF
              </label>
              <input
                id="periciando_cpf"
                name="periciando_cpf"
                className={inputClass}
                defaultValue={processo?.periciando_cpf ?? ""}
              />
            </div>
            <div>
              <label htmlFor="periciando_data_nascimento" className={labelClass}>
                Data de nascimento
              </label>
              <input
                id="periciando_data_nascimento"
                name="periciando_data_nascimento"
                type="date"
                className={inputClass}
                defaultValue={processo?.periciando_data_nascimento ?? ""}
              />
            </div>
          </div>
        </Cartao>
      )}

      {mostraAssistencia && (
        <Cartao titulo={editando ? "Etapas contratadas" : "2. Etapas contratadas"}>
          <div className="grid grid-cols-2 gap-3">
            {ETAPAS_CONTRATADAS.map((etapa) => (
              <OpcaoCheckbox
                key={etapa.codigo}
                name="etapas_contratadas"
                value={etapa.codigo}
                rotulo={etapa.rotulo}
                defaultChecked={processo?.etapas_contratadas?.includes(etapa.codigo) ?? false}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label htmlFor="cliente_parte_assistida" className={labelClass}>
                Cliente / parte assistida
              </label>
              <input
                id="cliente_parte_assistida"
                name="cliente_parte_assistida"
                className={inputClass}
                defaultValue={processo?.cliente_parte_assistida ?? ""}
              />
            </div>
            <div>
              <label htmlFor="advogado_escritorio" className={labelClass}>
                Advogado(a) / escritório
              </label>
              <input
                id="advogado_escritorio"
                name="advogado_escritorio"
                className={inputClass}
                defaultValue={processo?.advogado_escritorio ?? ""}
              />
            </div>
          </div>
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
            Vão no cabeçalho do Parecer Técnico gerado. Opcionais.
          </p>
        </Cartao>
      )}

      {tipoTrabalho && (
        <Cartao titulo={editando ? "Natureza do processo (tipo de laudo)" : "3. Natureza do processo (tipo de laudo)"}>
          <select
            name="tipo_laudo_id"
            className={inputClass}
            value={tipoLaudoId}
            onChange={(e) => setTipoLaudoId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecione...
            </option>
            {tiposLaudo.map((tl) => (
              <option key={tl.id} value={tl.id}>
                {tl.nome}
              </option>
            ))}
          </select>
          {tiposLaudo.length === 0 && (
            <p className="text-sm text-nevoa-500 dark:text-nevoa-400 mt-1">
              Nenhum tipo de laudo ativo cadastrado ainda.
            </p>
          )}
          {laudoEhCriminal && mostraJudicial && (
            <p className="text-xs mt-2 rounded-md border border-ambar-400/60 dark:border-ambar-600/40 bg-ambar-100 dark:bg-ambar-950/30 text-nevoa-800 dark:text-nevoa-200 px-3 py-2">
              Confira o bloco <strong>Dados do processo</strong> acima: para Criminal, a Vara deve
              ser <strong>Estadual</strong> e o número precisa mencionar <strong>“Vara Criminal”</strong>.
            </p>
          )}
          <div className="pt-2">
            <label htmlFor="acao_objeto" className={labelClass}>
              Ação / Objeto da Perícia ou Assistência
            </label>
            <ComboboxCatalogo
              id="acao_objeto"
              name="acao_objeto"
              sugestoes={sugestoesAcaoObjeto}
              valorInicial={processo?.acao_objeto ?? ""}
              rotuloNovo="Nova ação/objeto"
              placeholder="Descreva a ação ou o objeto da perícia/assistência"
            />
            <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
              Campo livre, separado da Natureza acima (que define o modelo do laudo).
            </p>
          </div>
        </Cartao>
      )}

      {tipoTrabalho && (
        <Cartao titulo="Financeiro">
          <div>
            <label htmlFor="situacao_financeira" className={labelClass}>
              Situação Financeira do Processo
            </label>
            <ComboboxCatalogo
              id="situacao_financeira"
              name="situacao_financeira"
              sugestoes={sugestoesFinanceira}
              valorInicial={processo?.situacao_financeira ?? ""}
              rotuloNovo="Nova situação financeira de processo"
              placeholder="ex.: Aguardando Pagamento de Honorários, Pago..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <CampoMoeda
              id="valor_processo"
              name="valor_processo"
              rotulo="Valor Processo"
              defaultValue={processo?.valor_processo}
            />
            <CampoMoeda
              id="honorario_apresentado"
              name="honorario_apresentado"
              rotulo="Honorário Apre."
              defaultValue={processo?.honorario_apresentado}
            />
            <CampoMoeda
              id="honorario_arbitrado"
              name="honorario_arbitrado"
              rotulo="Honorário Arb."
              defaultValue={processo?.honorario_arbitrado}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="justica_gratuita" className={labelClass}>
                Justiça Gratuita
              </label>
              <select
                id="justica_gratuita"
                name="justica_gratuita"
                className={inputClass}
                defaultValue={processo?.justica_gratuita ?? ""}
              >
                <option value="">Selecione...</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
            <div>
              <label htmlFor="aceitou_nomeacao" className={labelClass}>
                Aceitou Nomeação
              </label>
              <select
                id="aceitou_nomeacao"
                name="aceitou_nomeacao"
                className={inputClass}
                defaultValue={processo?.aceitou_nomeacao ?? ""}
              >
                <option value="">Selecione...</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
                <option value="destituida">Destituída do cargo</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="url_processo" className={labelClass}>
              Url do Processo
            </label>
            <input
              id="url_processo"
              name="url_processo"
              type="url"
              inputMode="url"
              placeholder="https://..."
              className={inputClass}
              defaultValue={processo?.url_processo ?? ""}
            />
          </div>
        </Cartao>
      )}

      {error && <p className="text-sm text-vinho-600 dark:text-vinho-400">{error}</p>}

      {tipoTrabalho && (
        <Botao
          type="submit"
          carregando={isPending}
          textoCarregando={editando ? "Salvando…" : "Criando…"}
        >
          {editando ? "Salvar alterações" : "Criar processo"}
        </Botao>
      )}
    </form>
  );
}
