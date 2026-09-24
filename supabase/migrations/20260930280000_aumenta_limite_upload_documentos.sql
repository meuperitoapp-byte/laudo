-- ============================================================================
-- Aumenta o limite de tamanho de arquivo do bucket de documentos (24/09/2026)
-- — feedback da Patrícia: não conseguia anexar o arquivo de orçamento (PDF
-- com fotos e arte mais elaborada), que passava do limite de 25MB.
-- ============================================================================

update storage.buckets
set file_size_limit = 52428800 -- 50MB
where id = 'documentos-processos';
