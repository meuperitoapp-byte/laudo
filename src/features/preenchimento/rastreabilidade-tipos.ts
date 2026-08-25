import type { RespostaEvidenciasRow } from "@/types/database";
import type { ValorSelecionado } from "@/types/json-fields";

/**
 * Estado de uma resposta JÁ SALVA em respostas_processo (não o rascunho local
 * do formulário) — é a que resposta_evidencias.resposta_id precisa apontar,
 * já que a FK exige uma linha existente. Ver campo-field.tsx: só libera
 * vincular evidência quando o rascunho local bate com isto (nada de vincular
 * evidência a uma marcação que ainda não foi salva).
 */
export interface RespostaPersistida {
  id: string;
  valorSelecionado: ValorSelecionado | null;
  textoLivre: string | null;
  confirmadoPeloPerito: boolean;
}

/** Uma resposta de OUTRO campo do mesmo processo, candidata a "achado clínico" de sustentação. */
export interface AchadoParaVinculo {
  respostaId: string;
  rotulo: string;
  secaoTitulo: string;
  resumo: string;
}

/** Um documento já anexado ao processo, candidato a evidência documental. */
export interface DocumentoParaVinculo {
  id: string;
  nomeArquivo: string;
  tipo: string;
  categoria: string | null;
}

/** Pacote de dados de rastreabilidade pro processo/seção atual — montado uma vez em SecaoWorkspace e repassado pra cada CampoField. */
export interface DadosRastreabilidade {
  processoId: string;
  secaoId: string;
  respostasPersistidas: Record<string, RespostaPersistida>;
  achadosDisponiveis: AchadoParaVinculo[];
  documentosDisponiveis: DocumentoParaVinculo[];
  evidencias: RespostaEvidenciasRow[];
}
