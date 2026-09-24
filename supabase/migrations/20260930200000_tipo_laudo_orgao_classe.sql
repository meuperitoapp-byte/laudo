-- ============================================================================
-- Novo tipo de laudo: "Órgão de classe" (24/09/2026, pedido da Dra. Fernanda
-- ao notar que faltava na lista "Área da demanda"). 11º tipo do catálogo.
--
-- Diferente dos outros 10, este entra SEM seções ainda (estrutural = sem
-- campos, como o app já trata pra outros casos) — o conteúdo do laudo
-- (estrutura de seções/campos, igual aos outros 10 modelos mapeados de PDF
-- página a página) ainda não foi enviado por ela. Só a entrada no catálogo,
-- pra não travar quem for cadastrar um processo dessa área agora — mesmo
-- princípio dos 7 tipos que já estavam "aguardando o material da cliente"
-- (ver memória "tipos-laudo-status").
-- ============================================================================

insert into public.tipos_laudo (id, codigo, nome, descricao, ordem, ativo) values
  (gen_random_uuid(), 'orgao_classe', 'Órgão de classe',
   'Laudo médico-pericial em processos perante órgão de classe/conselho profissional (ex.: processo ético-disciplinar). Estrutura de seções ainda não mapeada — aguardando modelo da Dra. Fernanda.',
   11, true);
