# preenchimento

Preenchimento do laudo por seção — implementado (Etapa 4).

Rota: `app/(dashboard)/processos/[id]/preenchimento/[secaoId]/page.tsx` (server component,
busca todas as seções/campos/respostas do tipo_laudo) + `SecaoWorkspace` (client component,
`secao-workspace.tsx`) que concentra navegação entre seções, formulário e geração/edição do
texto narrativo.

## Arquivos

- `condicoes.ts` — avalia `secoes.condicao` / `campos_secao.condicao` contra as respostas
  atuais (seções e campos condicionais).
- `campo-tree.ts` — agrupa `campos_secao` por `parent_campo_id` (ex.: sub-campos do exame
  físico por sistema) numa árvore ordenada por `ordem`.
- `narrativo.ts` — geração de texto automático: por campo (`gerarNarrativoCampo`, a partir de
  `opcoes[].texto_automatico` ou `campos_secao.texto_automatico_template`) e por seção
  (`gerarNarrativoSecao`, a partir de `secoes.texto_automatico_template` ou, na ausência,
  concatenando os campos de topo da seção). Placeholders `{{codigo_do_campo}}` podem
  referenciar qualquer campo do mesmo tipo_laudo.
- `actions.ts` — Server Action `salvarSecao`: upsert em lote de `respostas_processo` +
  upsert de `respostas_secao`.
- `secao-workspace.tsx`, `campo-field.tsx`, `tabela-campo.tsx` — UI client-side.
- `tipos.ts` — tipos client-safe compartilhados entre esses arquivos.

## Decisão de schema desta etapa: `respostas_secao`

`respostas_processo.texto_narrativo` é por CAMPO. Mas a maioria das seções gera o narrativo
a partir de `secoes.texto_automatico_template` — um parágrafo ÚNICO combinando vários campos
da seção (ex.: Curatela IX "Exame Clínico Geral"). Não havia onde persistir esse texto
composto nem a edição manual da perita sobre ele. Criada a tabela `respostas_secao`
(`processo_id`, `secao_id`, `texto_narrativo`, `editado_manualmente`) — ver migration
`20260823110000_respostas_secao.sql`. **Precisa ser aplicada no Supabase** (SQL editor ou
`supabase db push`) antes de usar esta tela.

## Regras aplicadas

- **Exibição crítica**: a tela mostra todas as opções; o texto narrativo gerado só contém o
  que foi marcado.
- **Seleção única/múltipla**: radio/checkbox conforme `tipo_campo`; todo campo (exceto
  `texto_livre`, que já É o texto) ganha uma caixa extra de "Detalhamento".
- **Campos condicionais / exame físico por sistema**: sub-campos com `condicao` abrem/fecham
  sem reload, avaliados contra o estado local da seção.
- **Seções condicionais**: avaliadas no servidor contra as respostas já salvas do processo —
  só aparecem na navegação quando aplicável.
- **O sistema não decide**: campos com `requer_confirmacao_perito = true` exigem um checkbox
  de confirmação explícito, nunca marcado por padrão; sem confirmação, a marcação fica salva
  como rascunho mas não entra em nenhum texto narrativo (nem no da própria seção, nem em
  templates de outras seções que a referenciem).
- **Edição manual preservada**: editar o texto narrativo da seção marca
  `editado_manualmente = true` e trava a recomposição automática até a perita clicar em
  "Recompor automaticamente".
- **Salvamento**: botão explícito "Salvar seção" + auto-save ao navegar para outra seção
  quando há alterações não salvas (ver decisão abaixo) + aviso do navegador se tentar fechar
  a aba com alterações pendentes.
- **Tabelas (`tipo_campo = 'tabela'`)**: `tabela-campo.tsx` cobre os 3 formatos vistos nos
  3 tipos de laudo mapeados até agora — linhas fixas x 1 coluna fechada (Curatela); linhas
  fixas x N colunas, fechadas ou texto livre (Trabalhista — Matriz de Exposição a Riscos 6x6,
  Matriz de Análise do Nexo Causal 15x2); e linhas dinâmicas (a perita adiciona/remove linha)
  x N colunas (Trabalhista — Histórico de Empregos, Exames Complementares, Diagnóstico
  Nosológico; Previdenciário — Benefícios Anteriores). O valor salvo em
  `valor_selecionado` muda de forma conforme o caso: `{linha, valor}` só no formato
  original de 1 coluna (intocado, pra não arriscar quebrar Curatela);
  `{linha, valores: {coluna_codigo: valor}}` nos outros dois — ver
  `ValorTabelaLinhaSimples`/`ValorTabelaLinhaMultipla` em `src/types/json-fields.ts`. Em
  linhas dinâmicas, `linha` é um id gerado no client (`crypto.randomUUID()`) ao adicionar a
  linha, não um `codigo` de `config_tabela.linhas` (que fica vazio nesse caso).

### Por que botão + auto-save (não só um ou só outro)

Botão explícito dá controle e feedback claro num sistema onde dado errado tem peso jurídico.
Auto-save ao trocar de seção é uma rede de segurança contra perda de dado por navegação
acidental — ela não perde o que já marcou mesmo se esquecer de clicar em Salvar. As duas
coisas juntas cobrem tanto "quero ter certeza que salvou" quanto "não quero perder trabalho".

## Fora de escopo nesta etapa (conforme combinado)

- `resposta_evidencias` (rastreabilidade a documentos/respostas) — não implementado.
- `respostas_reutilizaveis` (biblioteca reaproveitável) — não implementado.
- Geração do laudo final compilado (PDF/Word) — etapa futura.
- Tokens computados em `texto_automatico_template` que não mapeiam pra um campo (ex.:
  `{{total_documentos}}`, `{{categorias_principais}}` da Matriz de Documentos) — a seção
  estrutural correspondente (0 `campos_secao`) fica só com um campo de texto livre manual por
  enquanto; o cálculo automático depende da feature de Documentos, ainda não construída.
- Tabelas ainda não alimentam texto narrativo automático (`valorExibivelCampo` retorna `null`
  pra `tipo_campo = 'tabela'` de propósito) — os dados ficam salvos em `valor_selecionado`,
  mas não geram frase nem entram em `{{placeholder}}` de nenhum template. Nenhum dos 3
  modelos mapeados até agora tenta referenciar uma tabela num template, então não bloqueou
  nada ainda, mas é uma lacuna real se isso aparecer num tipo de laudo futuro.
- Placeholders que referenciam campos de OUTRAS seções resolvem com os dados da última vez
  que o processo foi salvo/carregado, não em tempo real entre seções abertas em abas
  diferentes — só os placeholders da PRÓPRIA seção atualizam ao vivo enquanto edita.

Tabelas relacionadas: `respostas_processo`, `respostas_secao`.
