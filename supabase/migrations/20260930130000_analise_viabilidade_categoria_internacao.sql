-- ============================================================================
-- Análise de Viabilidade — categoria "Internação" na Linha do tempo (§11)
-- ============================================================================
-- Pedido dela (21/09/2026): faltava "Internação" entre as categorias da
-- linha do tempo médico-pericial. Entra entre "Cirurgia" e "Intercorrência"
-- (ordem cronológica natural: procedimento/cirurgia → internação →
-- intercorrência/piora → alta).

alter table public.caso_linha_tempo_medica
  drop constraint caso_linha_tempo_medica_categoria_check;

alter table public.caso_linha_tempo_medica
  add constraint caso_linha_tempo_medica_categoria_check check (categoria in (
    'sintoma', 'atendimento', 'consulta', 'diagnostico', 'exame', 'prescricao',
    'procedimento', 'cirurgia', 'internacao', 'intercorrencia', 'piora', 'oportunidade_diagnostica',
    'oportunidade_terapeutica', 'alta', 'incapacidade', 'dano', 'obito', 'outro'
  ));
