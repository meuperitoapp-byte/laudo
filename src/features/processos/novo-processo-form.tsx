"use client";

import { useState, useTransition } from "react";
import { createProcesso } from "@/features/processos/actions";
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
  "w-full rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2";
const labelClass = "block text-sm font-medium mb-1";

export function NovoProcessoForm({ tiposLaudo }: { tiposLaudo: TiposLaudoRow[] }) {
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
    <form action={handleSubmit} className="max-w-2xl space-y-8">
      <fieldset className="space-y-3">
        <legend className="font-medium mb-2">1. Tipo de trabalho</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="tipo_trabalho"
            value="pericia_judicial"
            required
            checked={tipoTrabalho === "pericia_judicial"}
            onChange={() => setTipoTrabalho("pericia_judicial")}
          />
          Perícia Judicial
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="tipo_trabalho"
            value="assistencia_tecnica"
            checked={tipoTrabalho === "assistencia_tecnica"}
            onChange={() => setTipoTrabalho("assistencia_tecnica")}
          />
          Assistência Técnica
        </label>
      </fieldset>

      {tipoTrabalho === "pericia_judicial" && (
        <fieldset className="space-y-4">
          <legend className="font-medium mb-2">2. Dados do processo</legend>

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
              <input
                id="vara_numero"
                name="vara_numero"
                placeholder="ex.: 3ª, ou 3ª Vara Cível, 3ª Vara de Família, 3ª Vara do Trabalho..."
                className={inputClass}
              />
              <p className="text-xs text-zinc-500 mt-1">
                Se a vara tiver especialização (Cível, Família, do Trabalho...), inclua aqui — é o
                que vai pro endereçamento formal do laudo final.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label htmlFor="comarca_subsecao" className={labelClass}>
                Comarca / Subseção Judiciária
              </label>
              <input id="comarca_subsecao" name="comarca_subsecao" className={inputClass} />
            </div>
            <div>
              <label htmlFor="uf" className={labelClass}>
                UF
              </label>
              <input id="uf" name="uf" maxLength={2} className={inputClass} />
            </div>
          </div>

          <div>
            <label htmlFor="parte_autora" className={labelClass}>
              Parte autora / Reclamante
            </label>
            <input id="parte_autora" name="parte_autora" className={inputClass} />
          </div>

          <div>
            <label htmlFor="partes_re" className={labelClass}>
              Parte ré / Reclamada(s)
            </label>
            <input id="partes_re" name="partes_re" className={inputClass} />
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-4">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Dados do(a) periciando(a)
            </p>
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
          </div>

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
        </fieldset>
      )}

      {tipoTrabalho === "assistencia_tecnica" && (
        <fieldset className="space-y-2">
          <legend className="font-medium mb-2">2. Etapas contratadas</legend>
          {ETAPAS_CONTRATADAS.map((etapa) => (
            <label key={etapa.codigo} className="flex items-center gap-2">
              <input type="checkbox" name="etapas_contratadas" value={etapa.codigo} />
              {etapa.rotulo}
            </label>
          ))}
        </fieldset>
      )}

      {tipoTrabalho && (
        <fieldset>
          <legend className="font-medium mb-2">
            3. Natureza do processo (tipo de laudo)
          </legend>
          <select
            name="tipo_laudo_id"
            className={inputClass}
            defaultValue=""
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
            <p className="text-sm text-zinc-500 mt-1">
              Nenhum tipo de laudo ativo cadastrado ainda.
            </p>
          )}
        </fieldset>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {tipoTrabalho && (
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-foreground text-background px-5 py-2 font-medium disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Criar processo"}
        </button>
      )}
    </form>
  );
}
