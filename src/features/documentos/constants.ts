/** Bucket do Supabase Storage — ver migration 20260824090000_storage_bucket_documentos.sql. */
export const BUCKET_DOCUMENTOS = "documentos-processos";

/** 50MB — mesmo limite configurado no bucket (file_size_limit, ver migration
 * 20260930280000); checado no client antes do upload só pra dar feedback mais
 * rápido, o bucket é quem garante de verdade. Aumentado de 25MB (24/09/2026,
 * feedback da Patrícia: PDF de orçamento com fotos/arte não cabia). */
export const TAMANHO_MAXIMO_BYTES = 52428800;

/**
 * Sugestões de categoria pra Matriz de Documentos Analisados (Seção VI de
 * Curatela/Previdenciário/Trabalhista), mais "Orçamento"/"Contrato" (pedido
 * dela, 21/09/2026 — comuns em Assistência Técnica). `documentos.categoria`
 * é texto livre no banco (ver comentário da coluna, migration
 * 20260821130000) — este é só um datalist de apoio; a perita pode digitar
 * qualquer outra coisa.
 */
export const CATEGORIAS_SUGERIDAS = [
  "Orçamento",
  "Contrato",
  "Petição inicial",
  "Contestação",
  "Despacho/decisão judicial",
  "Laudo pericial anterior",
  "Prontuário médico/hospitalar",
  "Relatório médico",
  "Receituário/prescrição médica",
  "Exame complementar (laudo/imagem)",
  "ASO — Atestado de Saúde Ocupacional",
  "PPP — Perfil Profissiográfico Previdenciário",
  "CAT — Comunicação de Acidente de Trabalho",
  "Carteira de trabalho (CTPS)",
  "Extrato do CNIS",
  "Processo administrativo do INSS",
  "Ficha/prontuário ocupacional da empresa",
  "Documento de identificação",
  "Procuração",
  "Quesitos das partes",
  "Outro",
];
