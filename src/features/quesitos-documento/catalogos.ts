import type { MeioEntrega, QuesitoParteProcessual } from "@/types/enums";

export const PARTE_ROTULOS: Record<QuesitoParteProcessual, string> = {
  autora: "Autora",
  re: "Ré",
  reclamante: "Reclamante",
  reclamada: "Reclamada",
  parte_assistida: "Parte assistida",
};
export const PARTES_ORDENADAS = Object.keys(PARTE_ROTULOS) as QuesitoParteProcessual[];

/** Meio de entrega dos documentos de AT (Quesitos, Réplica) — lote 15/10/2026. */
export const MEIO_ENTREGA_ROTULOS: Record<MeioEntrega, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  sistema: "Sistema",
};
export const MEIOS_ENTREGA_ORDENADOS = Object.keys(MEIO_ENTREGA_ROTULOS) as MeioEntrega[];

/** "da parte Autora" / "da parte assistida" — trecho usado na apresentação e na assinatura. */
export function trechoParte(parte: QuesitoParteProcessual | null): string {
  if (parte === "parte_assistida") return "da parte assistida";
  return `da parte ${parte ? PARTE_ROTULOS[parte] : "Autora"}`;
}

/**
 * Parágrafo de apresentação do Assistente Técnico — texto do modelo dela
 * (15/10/2026). Quando ela não edita, o documento usa este texto com a parte
 * atual; quando edita, o texto dela é salvo e vale como está.
 */
export function apresentacaoPadrao(parte: QuesitoParteProcessual | null): string {
  return `FERNANDA NASCIMENTO RESENDE, médica, CRM-CE nº 17266, Assistente Técnica ${trechoParte(parte)}, indicada nos autos em epígrafe, vem, respeitosamente, à presença de Vossa Excelência, apresentar os QUESITOS TÉCNICOS para adequada delimitação das questões médico-científicas.`;
}

/**
 * Sugestão de endereçamento a partir da vara/comarca do cadastro — só pra
 * não digitar do zero; ela confere e ajusta. `null` quando o cadastro não
 * tem vara nem comarca (comum na AT).
 */
export function enderecamentoSugerido(p: { vara_numero: string | null; comarca_subsecao: string | null; uf: string | null }): string | null {
  const vara = p.vara_numero?.trim();
  const comarca = p.comarca_subsecao?.trim();
  if (!vara && !comarca) return null;
  const trechoVara = vara ? (/^\d+$/.test(vara) ? `${vara}ª VARA` : vara) : "___ VARA";
  const trechoComarca = comarca ? `${comarca}${p.uf ? `/${p.uf}` : ""}` : "_______________";
  return `AO DOUTO JUÍZO DA ${trechoVara} DA COMARCA DE ${trechoComarca}`.toUpperCase();
}
