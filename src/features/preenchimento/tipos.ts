import type { ValorSelecionado } from "@/types/json-fields";

/** Estado local (client) da resposta de UM campo, enquanto a seção é editada. */
export interface EstadoRespostaCampo {
  valorSelecionado: ValorSelecionado | null;
  textoLivre: string | null;
  confirmadoPeloPerito: boolean;
}

export type EstadoRespostas = Record<string, EstadoRespostaCampo>;

/** Item da navegação lateral entre seções (já filtrado por visibilidade no servidor). */
export interface SecaoNavItem {
  id: string;
  titulo: string;
  ordem: number;
  respondida: boolean;
  /** Seção estrutural (0 campos_secao, ex.: Matriz de Documentos, Quesitos) — sem formulário, só narrativo manual opcional. */
  estrutural: boolean;
}

export const ESTADO_VAZIO: EstadoRespostaCampo = {
  valorSelecionado: null,
  textoLivre: null,
  confirmadoPeloPerito: false,
};
