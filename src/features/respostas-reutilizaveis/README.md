# respostas-reutilizaveis

Biblioteca pessoal de textos reaproveitáveis entre processos — implementado, em 2 partes.

Tabela relacionada: `respostas_reutilizaveis`. Sem migration nova — o schema já existia.

## Parte 1 — Biblioteca (gestão)

Rota: `app/(dashboard)/respostas-reutilizaveis/page.tsx` (fora do contexto de um processo —
link fixo no header do dashboard) + `BibliotecaPanel` (client, `biblioteca-panel.tsx`).

- Listagem agrupada: tipo_laudo (catálogo, na ordem de `tipos_laudo.ordem`; "Genérico" por
  último) → campo (`secao.titulo — campo.rotulo`, na ordem do laudo; "Texto livre" primeiro).
- Criar/editar usam o mesmo seletor em cascata: escolhe `tipo_laudo` primeiro (ou "Genérico");
  só então o `select` de campo é habilitado, filtrado pros campos daquele tipo. Isso evita o
  estado ambíguo "campo de um tipo específico sem o tipo_laudo_id preenchido" — toda resposta
  presa a um campo carrega o tipo_laudo_id junto, o que é o que faz o agrupamento da
  listagem funcionar sem precisar inferir o tipo a partir do campo.

## Parte 2 — Uso dentro do preenchimento

Em cada campo de texto do motor de preenchimento (`texto_livre`, ou o "Detalhamento" de
campos de seleção/tabela), `ReutilizavelControles` (`src/features/preenchimento/
reutilizavel-controles.tsx`) mostra dois botões:

- **Usar resposta salva** — lista as respostas com `campo_id` igual ao campo atual, ou
  genéricas (`campo_id` nulo, do mesmo `tipo_laudo_id` ou totalmente genéricas). Clicar
  insere o `conteudo` no campo (estado local — nada é salvo até a perita clicar em "Salvar
  seção", igual a qualquer outra edição no preenchimento).
- **Salvar como reutilizável** — mini-formulário só com título; salva o texto ATUAL do campo
  (o que está na tela, não precisa ter sido salvo na seção ainda) já com `campo_id` e
  `tipo_laudo_id` desse campo específico.

A lista de candidatas é buscada uma vez por seção (`page.tsx` do preenchimento, filtro
`tipo_laudo_id = deste processo OR tipo_laudo_id is null`) e filtrada por `campo_id` no
client (`campo-field.tsx`) — evita uma query por campo, e mantém a arquitetura já usada no
preenchimento (tudo buscado no servidor, client só filtra/edita em memória).

## Fora de escopo

- Busca/filtro por texto na biblioteca (Parte 1) — lista tudo agrupado, sem campo de busca.
  Vale reavaliar quando a biblioteca crescer.
- Contagem de quantas vezes uma resposta foi reutilizada, ou "mais usadas primeiro" — a
  listagem no preenchimento é só por título, sem ranking.
