/** Bucket do Supabase Storage — ver migration 20260930390000_chat_upgrade_avatar_arquivo.sql. Privado: um anexo pode ser documento sensível. */
export const BUCKET_CHAT_ARQUIVOS = "chat-arquivos";

/** 25MB — mesmo limite original de Documentos, antes do aumento pra 50MB (o chat é conversa, não devia carregar arquivo gigante). */
export const TAMANHO_MAXIMO_ARQUIVO_BYTES = 26214400;
