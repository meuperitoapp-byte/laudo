import type { QuesitoParteProcessual } from "@/types/enums";

export const PARTE_ROTULOS: Record<QuesitoParteProcessual, string> = {
  autora: "Autora",
  re: "Ré",
  reclamante: "Reclamante",
  reclamada: "Reclamada",
  parte_assistida: "Parte assistida",
};
export const PARTES_ORDENADAS = Object.keys(PARTE_ROTULOS) as QuesitoParteProcessual[];
