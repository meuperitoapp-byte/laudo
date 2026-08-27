-- ============================================================================
-- Encerramento no feminino + separação do bloco de assinatura
-- ============================================================================
-- Pedido da Dra. Fernanda (única perita usando o sistema, ver CLAUDE.md):
--
-- 1) O texto de encerramento usava a forma dupla "deste(a)"/"Médico(a)
--    Perito(a) Judicial" — trocado pelo feminino direto ("desta Médica
--    Perita Judicial"/"esta profissional"), mesma ressalva jurídica de cada
--    tipo mantida.
-- 2) O trecho final ("{{cidade_uf_assinatura}}, {{data_assinatura}}. Dr(a).
--    {{nome_perito}}, Médico(a) Perito(a) Judicial, CRM/{{crm_uf}}, RQE nº
--    {{rqe}}. Documento assinado eletronicamente.") saiu do
--    texto_automatico_template — agora é montado à parte pelo compilador
--    (BlocoAssinatura, ver src/features/geracao-laudo/modelo.ts e
--    compilar.ts), com alinhamento próprio no documento final (cidade/data à
--    direita; nome e "Médica Perita Judicial, CRM ..." centralizados, sem
--    RQE e sem "documento assinado eletronicamente" — não fazem parte do que
--    ela pediu).
--
-- Não precisa de UPDATE em respostas_secao: o texto que a perita já
-- editou/salvou manualmente (respostas_secao.texto_narrativo) não é tocado
-- por esta migration — só o template usado quando ela ainda não editou à
-- mão. Quem já salvou a seção Encerramento antes desta migration continua
-- vendo o texto antigo até recompor manualmente (mesmo padrão da correção
-- do Estado Mental, migration 20260823120000).
-- ============================================================================

update public.secoes s
set texto_automatico_template =
  'O presente laudo representa o entendimento técnico desta Perita Judicial, fundamentado nos elementos disponíveis e nos achados obtidos durante a avaliação médico-pericial, permanecendo esta profissional à disposição do Juízo para eventuais esclarecimentos que se façam necessários.'
from public.tipos_laudo t
where s.tipo_laudo_id = t.id
  and t.codigo = 'curatela'
  and s.codigo = 'encerramento';

update public.secoes s
set texto_automatico_template =
  'O presente laudo representa o entendimento técnico desta Médica Perita Judicial, fundamentado nos elementos documentais disponíveis, informações colhidas durante a entrevista, exame clínico realizado pessoalmente, avaliação funcional e correlação dos achados com as exigências da atividade laborativa objeto da perícia. Permanecendo esta profissional à disposição do Juízo para eventuais esclarecimentos que se façam necessários.'
from public.tipos_laudo t
where s.tipo_laudo_id = t.id
  and t.codigo = 'previdenciario'
  and s.codigo = 'encerramento';

update public.secoes s
set texto_automatico_template =
  'O presente laudo representa o entendimento técnico desta Médica Perita Judicial, fundamentado nos elementos disponibilizados nos autos, informações colhidas durante a avaliação, exame clínico realizado, dados ocupacionais, literatura médico-científica pertinente e metodologia médico-pericial aplicada ao caso concreto. As conclusões restringem-se às questões médico-periciais submetidas à análise, sem atribuição de responsabilidade jurídica, culpa ou infração ética. Permanecendo esta profissional à disposição do Juízo para eventuais esclarecimentos.'
from public.tipos_laudo t
where s.tipo_laudo_id = t.id
  and t.codigo = 'trabalhista'
  and s.codigo = 'encerramento';

update public.secoes s
set texto_automatico_template =
  'O presente laudo expressa o entendimento técnico desta Médica Perita Judicial, fundamentado nos elementos disponibilizados nos autos, no exame pericial quando realizado, na reconstrução documental da assistência e nos referenciais técnico-científicos pertinentes ao objeto da demanda. As conclusões restringem-se à matéria médico-pericial, cabendo ao Juízo a valoração jurídica dos fatos, a definição de culpa, responsabilidade civil, obrigação de indenizar e demais consequências jurídicas. Permanecendo esta profissional à disposição do Juízo para eventuais esclarecimentos.'
from public.tipos_laudo t
where s.tipo_laudo_id = t.id
  and t.codigo = 'erro_medico'
  and s.codigo = 'encerramento';
