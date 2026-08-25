/** Bucket do Supabase Storage — ver migration 20260824090000_storage_bucket_documentos.sql. */
export const BUCKET_DOCUMENTOS = "documentos-processos";

/** 25MB — mesmo limite configurado no bucket (file_size_limit); checado no
 * client antes do upload só pra dar feedback mais rápido, o bucket é quem
 * garante de verdade. */
export const TAMANHO_MAXIMO_BYTES = 26214400;

/**
 * Sugestões de categoria pra Matriz de Documentos Analisados (Seção VI de
 * Curatela/Previdenciário/Trabalhista). `documentos.categoria` é texto livre
 * no banco (ver comentário da coluna, migration 20260821130000) — este é só
 * um datalist de apoio, cobrindo os 3 tipos de laudo já mapeados; a perita
 * pode digitar qualquer outra coisa.
 */
export const CATEGORIAS_SUGERIDAS = [
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
