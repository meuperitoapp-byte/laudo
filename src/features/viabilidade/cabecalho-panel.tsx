"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarCabecalhoViabilidade } from "./actions";
import { POSICAO_CLIENTE_LITIGIO_SEED, ESPECIALIDADE_SEED, MATERIA_SEED, VIABILIDADE_STATUS_ORDENADOS, VIABILIDADE_STATUS_ROTULOS } from "./catalogos";
import { Botao } from "@/components/ui/button";
import { ComboboxCatalogo } from "@/components/ui/combobox-catalogo";
import { TagsCatalogo } from "@/components/ui/tags-catalogo";
import { Toast } from "@/components/ui/toast";
import type { AnalisesViabilidadeRow } from "@/types/database";

const inputClass =
  "w-full rounded-md border border-nevoa-300 dark:border-nevoa-700 bg-transparent px-3 py-2 text-sm text-nevoa-900 dark:text-nevoa-100 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petroleo-500";
const labelClass = "block text-xs font-medium text-nevoa-500 dark:text-nevoa-400 mb-1";

/**
 * Cabeçalho da Janela de Análise de Viabilidade (§3 do spec) — fatia 0.
 * Deliberadamente NÃO pede número de processo/tribunal/vara/comarca/prazo
 * processual (premissa pré-processual do spec) — esses continuam vivendo
 * em `processos`, e só entram se/quando o caso for ajuizado, numa edição
 * normal do processo (não desta tela).
 */
export function CabecalhoViabilidadePanel({
  analise,
  especialidadeSugestoes,
  materiaSugestoes,
}: {
  analise: AnalisesViabilidadeRow;
  especialidadeSugestoes: string[];
  materiaSugestoes: string[];
}) {
  const router = useRouter();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function salvar(formData: FormData) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await salvarCabecalhoViabilidade(formData);
      if ("error" in resultado) {
        setMensagem({ tipo: "erro", texto: resultado.error });
        return;
      }
      setMensagem({ tipo: "ok", texto: "Cabeçalho salvo." });
      router.refresh();
    });
  }

  return (
    <form action={salvar} className="rounded-xl border border-nevoa-200 dark:border-nevoa-800 bg-white dark:bg-nevoa-900/60 p-6 space-y-4">
      <input type="hidden" name="analise_id" value={analise.id} />
      <input type="hidden" name="processo_id" value={analise.processo_id} />

      <div>
        <label htmlFor="status" className={labelClass}>
          Status da análise
        </label>
        <select id="status" name="status" defaultValue={analise.status} className={inputClass} required>
          {VIABILIDADE_STATUS_ORDENADOS.map((s) => (
            <option key={s} value={s}>
              {VIABILIDADE_STATUS_ROTULOS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="posicao_cliente_litigio" className={labelClass}>
            Posição do cliente no potencial litígio
          </label>
          <ComboboxCatalogo
            id="posicao_cliente_litigio"
            name="posicao_cliente_litigio"
            sugestoes={[...POSICAO_CLIENTE_LITIGIO_SEED]}
            valorInicial={analise.posicao_cliente_litigio ?? ""}
            rotuloNovo="Nova posição"
          />
        </div>
        <div>
          <label htmlFor="especialidade" className={labelClass}>
            Especialidade
          </label>
          <ComboboxCatalogo
            id="especialidade"
            name="especialidade"
            sugestoes={especialidadeSugestoes.length > 0 ? especialidadeSugestoes : [...ESPECIALIDADE_SEED]}
            valorInicial={analise.especialidade ?? ""}
            rotuloNovo="Nova especialidade"
            placeholder="Ainda sem lista pré-definida — digite livremente"
          />
        </div>
      </div>

      <div>
        <label htmlFor="materia" className={labelClass}>
          Matéria
        </label>
        <TagsCatalogo
          id="materia"
          name="materia"
          sugestoes={materiaSugestoes.length > 0 ? materiaSugestoes : [...MATERIA_SEED]}
          valoresIniciais={analise.materia ?? []}
          rotuloNovo="Nova matéria"
          placeholder="Digite e pressione Enter para adicionar"
        />
      </div>

      <div>
        <label htmlFor="tags_tecnicas" className={labelClass}>
          Tags técnicas (opcional)
        </label>
        <TagsCatalogo
          id="tags_tecnicas"
          name="tags_tecnicas"
          sugestoes={[]}
          valoresIniciais={analise.tags_tecnicas ?? []}
          rotuloNovo="Nova tag"
          placeholder="Digite e pressione Enter para adicionar"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Botao type="submit" carregando={isPending} textoCarregando="Salvando…">
          Salvar cabeçalho
        </Botao>
        {mensagem && mensagem.tipo === "erro" && <span className="text-sm text-vinho-600 dark:text-vinho-400">{mensagem.texto}</span>}
      </div>

      {mensagem && mensagem.tipo === "ok" && <Toast tipo="ok" texto={mensagem.texto} onClose={() => setMensagem(null)} />}
    </form>
  );
}
