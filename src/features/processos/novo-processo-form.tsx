"use client";

import { useState, useTransition } from "react";
import { createProcesso } from "@/features/processos/actions";
import { Botao } from "@/components/ui/button";
import { ComboboxCatalogo } from "@/components/ui/combobox-catalogo";
import type { TiposLaudoRow } from "@/types/database";
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
function OpcaoCheckbox({ name, value, rotulo }: { name: string; value: string; rotulo: string }) {
  const [checked, setChecked] = useState(false);
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

export function NovoProcessoForm({
  tiposLaudo,
  sugestoesVara,
  sugestoesComarca,
}: {
  tiposLaudo: TiposLaudoRow[];
  sugestoesVara: string[];
  sugestoesComarca: string[];
}) {
  const [tipoTrabalho, setTipoTrabalho] = useState<
    "pericia_judicial" | "assistencia_tecnica" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createProcesso(formData);
      if (result?.error) {
        setError(result.error);
      }
      // Em caso de sucesso, createProcesso já redireciona no servidor.
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
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

      {tipoTrabalho === "pericia_judicial" && (
        <Cartao titulo="2. Dados do processo">
          <div>
            <label htmlFor="numero_processo" className={labelClass}>
              Número do processo
            </label>
            <input id="numero_processo" name="numero_processo" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tipo_vara" className={labelClass}>
                Vara
              </label>
              <select id="tipo_vara" name="tipo_vara" className={inputClass} defaultValue="">
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
                rotuloNovo="Nova vara"
                placeholder="ex.: 3ª, ou 3ª Vara Cível, 3ª Vara de Família, 3ª Vara do Trabalho..."
              />
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
                Se a vara tiver especialização (Cível, Família, do Trabalho...), inclua aqui — é o
                que vai pro endereçamento formal do laudo final. Comece a digitar pra ver varas já
                usadas, ou cadastre uma nova na hora.
              </p>
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
                rotuloNovo="Nova comarca"
              />
            </div>
            <div>
              <label htmlFor="uf" className={labelClass}>
                UF
              </label>
              <input id="uf" name="uf" maxLength={2} className={inputClass} />
            </div>
          </div>

          <p className="text-xs text-nevoa-500 dark:text-nevoa-400">
            Polo Ativo e Polo Passivo (autor/réu, reclamante/reclamado, curatelando/curatelado etc.,
            com quantas pessoas forem necessárias) são cadastrados depois de criar o processo, na
            própria tela do processo.
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
            />
          </div>
        </Cartao>
      )}

      {tipoTrabalho === "pericia_judicial" && (
        <Cartao titulo="Dados do(a) periciando(a)">
          <div>
            <label htmlFor="periciando_nome" className={labelClass}>
              Nome
            </label>
            <input id="periciando_nome" name="periciando_nome" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="periciando_cpf" className={labelClass}>
                CPF
              </label>
              <input id="periciando_cpf" name="periciando_cpf" className={inputClass} />
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
              />
            </div>
          </div>
        </Cartao>
      )}

      {tipoTrabalho === "assistencia_tecnica" && (
        <Cartao titulo="2. Etapas contratadas">
          <div className="grid grid-cols-2 gap-3">
            {ETAPAS_CONTRATADAS.map((etapa) => (
              <OpcaoCheckbox
                key={etapa.codigo}
                name="etapas_contratadas"
                value={etapa.codigo}
                rotulo={etapa.rotulo}
              />
            ))}
          </div>
        </Cartao>
      )}

      {tipoTrabalho && (
        <Cartao titulo="3. Natureza do processo (tipo de laudo)">
          <select name="tipo_laudo_id" className={inputClass} defaultValue="" required>
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
        </Cartao>
      )}

      {error && <p className="text-sm text-vinho-600 dark:text-vinho-400">{error}</p>}

      {tipoTrabalho && (
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
          Criar processo
        </Botao>
      )}
    </form>
  );
}
