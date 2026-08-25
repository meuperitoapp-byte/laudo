-- ============================================================================
-- Correção pontual: Previdenciário, campo neuro_forca_muscular_mrc
-- ============================================================================
-- O seed original (previdenciario.sql) modelou este campo como tabela (4
-- membros x escala MRC 0-5), por inferência — a extração de texto do PDF
-- mostrava só os rótulos de membro (MSD/MSE/MID/MIE) sem a escala visível ao
-- lado. Renderizando a página 13 do PDF como imagem (não só texto extraído),
-- confirmou-se que é mesmo só 4 checkboxes soltos, sem tabela — igual a todos
-- os outros campos da página (Tônus, Reflexos, Sensibilidade etc.).
--
-- Corrige a linha já aplicada no banco (mesmo id determinístico do seed
-- original) para selecao_multipla com as 4 opções literais, sem config_tabela.
update public.campos_secao
set
  tipo_campo = 'selecao_multipla',
  opcoes = '[{"codigo": "msd", "rotulo": "MSD"}, {"codigo": "mse", "rotulo": "MSE"}, {"codigo": "mid", "rotulo": "MID"}, {"codigo": "mie", "rotulo": "MIE"}]'::jsonb,
  config_tabela = null
where id = '993d9920-4c58-5697-b2f7-f4fa727980ba'
  and codigo = 'neuro_forca_muscular_mrc';

-- ============================================================================
-- Correção pontual: Previdenciário, campo onco_status (13.11 Sistema oncológico)
-- ============================================================================
-- Revisão do julgamento única -> múltipla: "Ativa" + "Em tratamento" (ou
-- "Metastática") coexistem com frequência na prática oncológica — não são
-- estados mutuamente excludentes. Opções em si não mudaram, só a cardinalidade.
update public.campos_secao
set tipo_campo = 'selecao_multipla'
where id = '772eb0fe-e7d1-546b-899e-ee6778d365e4'
  and codigo = 'onco_status';
