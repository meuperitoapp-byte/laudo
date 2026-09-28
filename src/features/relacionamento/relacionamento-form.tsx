"use client";

import { useState, useTransition } from "react";
import { criarRelacionamento, atualizarRelacionamento } from "@/features/relacionamento/actions";
import { Botao } from "@/components/ui/button";
import {
  TIPO_ROTULOS,
  ORIGEM_ROTULOS,
  MEU_PERITO_STATUS_ROTULOS,
  MEU_PERITO_POTENCIAL_ROTULOS,
  CS_TIPO_DEMANDA_ROTULOS,
  CS_NECESSIDADE_ROTULOS,
  CS_STATUS_ROTULOS,
  CS_SITUACAO_ATUAL_ROTULOS,
  PROF_PROFISSAO_ROTULOS,
  PROF_NECESSIDADE_ROTULOS,
} from "@/features/relacionamento/catalogos";
import type { RelacionamentosRow } from "@/types/database";
import type { RelacionamentoTipo, RelacionamentoOrigem, ClienteSaudeSituacaoAtual } from "@/types/enums";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "placeholder:text-nevoa-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-sm font-medium text-nevoa-700 dark:text-nevoa-300 mb-1.5";

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/40 p-6 space-y-4">
      <legend className="font-title text-base font-semibold text-nevoa-900 dark:text-nevoa-100 px-1">{titulo}</legend>
      {children}
    </fieldset>
  );
}

const TIPOS: RelacionamentoTipo[] = ["advogado_escritorio", "cliente_saude", "profissional"];
const ORIGENS: RelacionamentoOrigem[] = [
  "indicacao", "redes_sociais", "comercial_pericons", "evento_palestra_curso",
  "meu_perito", "site_busca", "cliente_antigo_retorno", "parceria_institucional", "acolher", "outro",
];

export function RelacionamentoForm({
  modo,
  relacionamento,
  possiveisIndicadores,
  possiveisFamiliares,
}: {
  modo: "criar" | "editar";
  relacionamento?: RelacionamentosRow | null;
  /** Escritórios/advogados já cadastrados — únicos que fazem sentido como "quem indicou". */
  possiveisIndicadores: { id: string; nome: string }[];
  /** Outros Cliente Saúde já cadastrados — únicos que fazem sentido como "familiar/responsável". */
  possiveisFamiliares: { id: string; nome: string }[];
}) {
  const editando = modo === "editar" && relacionamento != null;
  const [tipo, setTipo] = useState<RelacionamentoTipo>(relacionamento?.tipo ?? "advogado_escritorio");
  const [origem, setOrigem] = useState<RelacionamentoOrigem>(relacionamento?.origem ?? "outro");
  const [meuPerito, setMeuPerito] = useState(relacionamento?.meu_perito ?? false);
  const [csSituacao, setCsSituacao] = useState<ClienteSaudeSituacaoAtual | "">(relacionamento?.cs_situacao_atual ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = editando
        ? await atualizarRelacionamento(relacionamento!.id, formData)
        : await criarRelacionamento(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <Cartao titulo="1. Tipo de relacionamento">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIPOS.map((t) => (
            <label
              key={t}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm cursor-pointer ${
                tipo === t
                  ? "border-petroleo-500 bg-petroleo-50 dark:bg-petroleo-950/40 text-petroleo-700 dark:text-petroleo-300"
                  : "border-nevoa-300 dark:border-nevoa-700 text-nevoa-700 dark:text-nevoa-300"
              }`}
            >
              <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
              {TIPO_ROTULOS[t]}
            </label>
          ))}
        </div>
      </Cartao>

      <Cartao titulo="2. Identificação">
        <div>
          <label htmlFor="nome" className={labelClass}>
            {tipo === "advogado_escritorio" ? "Nome do escritório / advogado" : tipo === "cliente_saude" ? "Nome do cliente" : "Nome do profissional"}
          </label>
          <input id="nome" name="nome" type="text" required defaultValue={relacionamento?.nome ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="data_nascimento" className={labelClass}>Data de nascimento</label>
          <input id="data_nascimento" name="data_nascimento" type="date" defaultValue={relacionamento?.data_nascimento ?? ""} className={inputClass} />
          <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
            {tipo === "advogado_escritorio"
              ? "Só faz sentido pra um advogado solo (sem advogados vinculados) — se houver vários, cadastre o aniversário de cada um na lista de advogados vinculados."
              : "Opcional — alimenta o alerta de aniversário no Calendário Inteligente."}
          </p>
        </div>
        <div>
          <label htmlFor="observacoes" className={labelClass}>Observações</label>
          <textarea id="observacoes" name="observacoes" rows={2} defaultValue={relacionamento?.observacoes ?? ""} className={inputClass} />
        </div>
      </Cartao>

      <Cartao titulo="3. Origem do relacionamento">
        <div>
          <label htmlFor="origem" className={labelClass}>Origem *</label>
          <select
            id="origem"
            name="origem"
            required
            value={origem}
            onChange={(e) => setOrigem(e.target.value as RelacionamentoOrigem)}
            className={inputClass}
          >
            {ORIGENS.map((o) => (
              <option key={o} value={o}>{ORIGEM_ROTULOS[o]}</option>
            ))}
          </select>
        </div>
        {origem === "indicacao" && (
          <div>
            <label htmlFor="indicado_por_id" className={labelClass}>Quem indicou *</label>
            <select
              id="indicado_por_id"
              name="indicado_por_id"
              required
              defaultValue={relacionamento?.indicado_por_id ?? ""}
              className={inputClass}
            >
              <option value="">Selecione…</option>
              {possiveisIndicadores
                .filter((r) => r.id !== relacionamento?.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
            </select>
          </div>
        )}
      </Cartao>

      {tipo === "advogado_escritorio" && (
        <Cartao titulo="4. MEU PERITO">
          <label className="flex items-center gap-2 text-sm text-nevoa-800 dark:text-nevoa-200">
            <input type="checkbox" name="meu_perito" checked={meuPerito} onChange={(e) => setMeuPerito(e.target.checked)} />
            É MEU PERITO?
          </label>
          {meuPerito && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="meu_perito_status" className={labelClass}>Status</label>
                <select id="meu_perito_status" name="meu_perito_status" defaultValue={relacionamento?.meu_perito_status ?? ""} className={inputClass}>
                  <option value="">Selecione…</option>
                  {Object.entries(MEU_PERITO_STATUS_ROTULOS).map(([v, r]) => (
                    <option key={v} value={v}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="meu_perito_potencial" className={labelClass}>Potencial</label>
                <select id="meu_perito_potencial" name="meu_perito_potencial" defaultValue={relacionamento?.meu_perito_potencial ?? ""} className={inputClass}>
                  <option value="">Selecione…</option>
                  {Object.entries(MEU_PERITO_POTENCIAL_ROTULOS).map(([v, r]) => (
                    <option key={v} value={v}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="meu_perito_observacao" className={labelClass}>Observação</label>
                <textarea id="meu_perito_observacao" name="meu_perito_observacao" rows={2} defaultValue={relacionamento?.meu_perito_observacao ?? ""} className={inputClass} />
              </div>
            </div>
          )}
        </Cartao>
      )}

      {tipo === "cliente_saude" && (
        <Cartao titulo="4. Demanda">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cs_tipo_demanda" className={labelClass}>Tipo de demanda</label>
              <select id="cs_tipo_demanda" name="cs_tipo_demanda" defaultValue={relacionamento?.cs_tipo_demanda ?? ""} className={inputClass}>
                <option value="">Selecione…</option>
                {Object.entries(CS_TIPO_DEMANDA_ROTULOS).map(([v, r]) => (
                  <option key={v} value={v}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cs_necessidade" className={labelClass}>Necessidade</label>
              <select id="cs_necessidade" name="cs_necessidade" defaultValue={relacionamento?.cs_necessidade ?? ""} className={inputClass}>
                <option value="">Selecione…</option>
                {Object.entries(CS_NECESSIDADE_ROTULOS).map(([v, r]) => (
                  <option key={v} value={v}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cs_status" className={labelClass}>Status</label>
              <select id="cs_status" name="cs_status" defaultValue={relacionamento?.cs_status ?? "entrada"} className={inputClass}>
                {Object.entries(CS_STATUS_ROTULOS).map(([v, r]) => (
                  <option key={v} value={v}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </Cartao>
      )}

      {tipo === "cliente_saude" && (
        <Cartao titulo="5. Condição e acompanhamento">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cs_condicao_principal" className={labelClass}>Condição / doença principal</label>
              <input id="cs_condicao_principal" name="cs_condicao_principal" type="text" defaultValue={relacionamento?.cs_condicao_principal ?? ""} className={inputClass} />
            </div>
            <div>
              <label htmlFor="cs_area_clinica" className={labelClass}>Área clínica relacionada</label>
              <input id="cs_area_clinica" name="cs_area_clinica" type="text" placeholder="Ex.: Oncologia, Cardiologia…" defaultValue={relacionamento?.cs_area_clinica ?? ""} className={inputClass} />
            </div>
            <div>
              <label htmlFor="cs_situacao_atual" className={labelClass}>Situação atual</label>
              <select
                id="cs_situacao_atual"
                name="cs_situacao_atual"
                value={csSituacao}
                onChange={(e) => setCsSituacao(e.target.value as ClienteSaudeSituacaoAtual | "")}
                className={inputClass}
              >
                <option value="">Selecione…</option>
                {Object.entries(CS_SITUACAO_ATUAL_ROTULOS).map(([v, r]) => (
                  <option key={v} value={v}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cs_situacao_atualizada_em" className={labelClass}>Situação atualizada em</label>
              <input id="cs_situacao_atualizada_em" name="cs_situacao_atualizada_em" type="date" defaultValue={relacionamento?.cs_situacao_atualizada_em ?? ""} className={inputClass} />
            </div>
            {csSituacao === "falecido" && (
              <>
                <div>
                  <label htmlFor="cs_data_falecimento" className={labelClass}>Data do falecimento</label>
                  <input id="cs_data_falecimento" name="cs_data_falecimento" type="date" defaultValue={relacionamento?.cs_data_falecimento ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="cs_data_conhecimento" className={labelClass}>Data em que a PERICONS tomou conhecimento</label>
                  <input id="cs_data_conhecimento" name="cs_data_conhecimento" type="date" defaultValue={relacionamento?.cs_data_conhecimento ?? ""} className={inputClass} />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label htmlFor="cs_familiar_responsavel_id" className={labelClass}>Familiar / responsável vinculado</label>
              <select id="cs_familiar_responsavel_id" name="cs_familiar_responsavel_id" defaultValue={relacionamento?.cs_familiar_responsavel_id ?? ""} className={inputClass}>
                <option value="">Nenhum</option>
                {possiveisFamiliares.filter((f) => f.id !== relacionamento?.id).map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
              <p className="text-xs text-nevoa-500 dark:text-nevoa-400 mt-1">
                Só outro cadastro já existente — o sistema nunca cria um cliente novo automaticamente a partir daqui.
              </p>
            </div>
          </div>
          {csSituacao === "falecido" && (
            <p className="text-xs text-vinho-600 dark:text-vinho-400">
              Ao salvar como &ldquo;Falecido&rdquo;, este cadastro sai automaticamente das listas de aniversário e campanhas temáticas de saúde — o histórico continua preservado.
            </p>
          )}
        </Cartao>
      )}

      {tipo === "profissional" && (
        <Cartao titulo="4. Dados profissionais">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof_profissao" className={labelClass}>Profissão</label>
              <select id="prof_profissao" name="prof_profissao" defaultValue={relacionamento?.prof_profissao ?? ""} className={inputClass}>
                <option value="">Selecione…</option>
                {Object.entries(PROF_PROFISSAO_ROTULOS).map(([v, r]) => (
                  <option key={v} value={v}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="prof_profissao_outra" className={labelClass}>Se &ldquo;Outro&rdquo;, qual?</label>
              <input id="prof_profissao_outra" name="prof_profissao_outra" type="text" defaultValue={relacionamento?.prof_profissao_outra ?? ""} className={inputClass} />
            </div>
            <div>
              <label htmlFor="prof_conselho_registro" className={labelClass}>Conselho / registro</label>
              <input id="prof_conselho_registro" name="prof_conselho_registro" type="text" defaultValue={relacionamento?.prof_conselho_registro ?? ""} className={inputClass} />
            </div>
            <div>
              <label htmlFor="prof_especialidade" className={labelClass}>Especialidade</label>
              <input id="prof_especialidade" name="prof_especialidade" type="text" defaultValue={relacionamento?.prof_especialidade ?? ""} className={inputClass} />
            </div>
            <div>
              <label htmlFor="prof_cidade" className={labelClass}>Cidade</label>
              <input id="prof_cidade" name="prof_cidade" type="text" defaultValue={relacionamento?.prof_cidade ?? ""} className={inputClass} />
            </div>
            <div>
              <label htmlFor="prof_uf" className={labelClass}>UF</label>
              <input id="prof_uf" name="prof_uf" type="text" maxLength={2} defaultValue={relacionamento?.prof_uf ?? ""} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="prof_necessidade" className={labelClass}>Necessidade</label>
              <select id="prof_necessidade" name="prof_necessidade" defaultValue={relacionamento?.prof_necessidade ?? ""} className={inputClass}>
                <option value="">Selecione…</option>
                {Object.entries(PROF_NECESSIDADE_ROTULOS).map(([v, r]) => (
                  <option key={v} value={v}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="prof_produto_futuro_potencial" className={labelClass}>Potencial — futuro produto/ecossistema profissional</label>
              <select id="prof_produto_futuro_potencial" name="prof_produto_futuro_potencial" defaultValue={relacionamento?.prof_produto_futuro_potencial ?? ""} className={inputClass}>
                <option value="">Selecione…</option>
                {Object.entries(MEU_PERITO_POTENCIAL_ROTULOS).map(([v, r]) => (
                  <option key={v} value={v}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="prof_produto_futuro_observacao" className={labelClass}>Observação</label>
              <input id="prof_produto_futuro_observacao" name="prof_produto_futuro_observacao" type="text" defaultValue={relacionamento?.prof_produto_futuro_observacao ?? ""} className={inputClass} />
            </div>
          </div>
        </Cartao>
      )}

      {error && <p className="text-sm text-vinho-600 dark:text-vinho-400">{error}</p>}
      <Botao type="submit" carregando={isPending} textoCarregando={editando ? "Salvando…" : "Cadastrando…"}>
        {editando ? "Salvar alterações" : "Cadastrar"}
      </Botao>
    </form>
  );
}
