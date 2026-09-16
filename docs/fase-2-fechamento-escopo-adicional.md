# Fechamento da Fase 2 — corte de escopo

Registro de referência pro Jeferson usar na conversa de fechamento financeiro
da Fase 2. Não é documentação técnica de módulo (isso já existe nos outros
`docs/plano-modulo-*.md`) — é só o corte de "o que era contratado" x "o que
veio depois", com commit de cada item.

## Corte

**Fase 2 fechou no fim do dia 14/09/2026**, no commit `22c866d` (último ajuste
da fatia 3 da Central de Prazos). Isso encerra: Fluxo Principal do Perito
Judicial completo (fatias 0-7, `docs/plano-modulo-fluxo-principal.md`) +
Central de Prazos e Tarefas fatias 1, 2, 3 e 5 (`docs/plano-modulo-central-
prazos.md`) — o commit `2c7c1ac` (mesmo dia) deixou por escrito que essas
fatias da Central eram Fase 2 contratada, não fila opcional.

**Tudo a partir do commit `a736d56` (15/09/2026, 14:24) é escopo adicional**,
fora do que foi orçado na Fase 2. Dois acabamentos residuais da própria Fase 2
aconteceram nessa janela mas não contam como escopo novo:
- `a736d56` — script de regressão do anti-join do Pós-Laudo (só teste,
  fechava dívida técnica que já existia).
- `eb878c9` + `16af4aa` — ajuste fino do Fluxo Principal (2 valores novos no
  catálogo de situação do processo + uma sugestão que passou a atualizar 2
  campos juntos), um dia depois do fechamento.

## Escopo adicional #1 — Redesign visual/UX

Pedido do Jeferson ("está feio e sem identidade visual, quero algo
profissional"). Commits `65d799c` até `aa3e5be` (15/09/2026):

- `65d799c`, `6661d7f` — campo `escritorio_indicacao` (origem de indicação).
- `958edbb` — barra superior escura + kit visual de dashboard.
- `937e464` — dashboard novo (KPIs + distribuições).
- `0e3fa4b`, `69772d6`, `a26f3e4`, `5e15f5a` — polimento visual de Processos,
  Configurações e Hoje.
- `b7596db` — fix do bug "0 processos" no dashboard + dashboard virando a
  tela de entrada do sistema (pedido da Dra. Fernanda, não do Jeferson).
- `aa3e5be` — centraliza todas as telas + blinda a barra superior contra
  scroll.

## Escopo adicional #2 — Fila de 10 melhorias da Dra. Fernanda

Pedidos dela, enviados um a um entre 19 e 20/09/2026, aplicados de uma vez a
pedido do Jeferson ("pode aplicar tudo"). Commits `8ab3250` até `596817d`:

| # | Pedido | Commit |
|---|---|---|
| 1 | Campo "responsável" em tarefa/evento | `8ab3250` |
| 2 | Rótulos Tarefa/Evento por caso de uso | `8ab3250` |
| 3 | Status opcional pra evento | `8ab3250` |
| 4 | Botão "concluída" reposicionado + tela de histórico | `8ab3250` |
| 5 | `/hoje` em duas abas (Hoje / Dentro do prazo) | `85f4952` |
| 6 | Bloqueio de data/hora no passado (antifraude) | `8ab3250` |
| 7 | Navegação reorganizada na estrutura PERICONS (só nav, sem módulo novo) | `596817d` |
| 8 | Logo real + favicon + renomeia pra "Sistema PERICONS" | `f450a09` |
| 9 | Excluir processo direto na lista | `3c32f06` |
| 10 | Situação financeira da AT no dashboard (parcial — ver pendências) | `319fd9d` |

**Complemento ao item 10 (21/09/2026)**: migration de honorários em atraso
aprovada e aplicada (`supabase/migrations/20260921120000_processos_
honorarios_atraso.sql`), com o campo de próximo marco (judicial) e forma de
pagamento/vencimento (AT) já construídos — commit `061e95b`. Falta só somar
isso numa visão do dashboard (ver pendências abaixo).

## Escopo adicional #3 — Correção de tratamento de erro de consulta (dívida estrutural anterior à Fase 2)

Diferente dos itens #1 e #2 acima: **não é redesign nem pedido da Dra.
Fernanda** — é conserto de um defeito estrutural que já existia no código
antes da própria Fase 2, só descoberto em 21/09/2026 ao investigar o bug do
dashboard "0 processos" (`b7596db`, escopo adicional #1).

**Causa raiz**: o cliente Supabase nunca lança exceção numa consulta que
falha — só devolve `{ data, error }`. Todo trecho que lia só `data` e
ignorava `error` fazia uma falha real de leitura (RLS, instabilidade,
coluna não propagada) virar silenciosamente "vazio"/"não encontrado" em vez
de mostrar que algo deu errado. Auditado e corrigido em TODAS as páginas do
grupo `(dashboard)` que consultam o Supabase — não só o dashboard.

**Caso mais grave encontrado**: em `processos/[id]/page.tsx`, uma falha de
consulta no processo caía no mesmo `notFound()` de um registro que de fato
não existe — ela veria "processo não encontrado" e concluiria que perdeu o
caso, quando era só uma falha de leitura passageira. Mesmo padrão
encontrado e corrigido em mais 5 telas que usam `.single()`/`.maybeSingle()`
como gate de "existe ou não". Também corrigido um risco de segurança lateral
em `processos/page.tsx`: se a consulta de documentos protocolados falhasse,
o botão de excluir liberaria processos que na verdade têm documento
protocolado — agora falha vira "bloqueado", nunca "liberado por engano".

Commits (21/09/2026): `a22cbcb`, `15cb479`, `2190ee0`, `aca1d14`, `f471adb`,
`e7380fc`, `eb5f042` — 16 arquivos ao todo (toda a árvore de
`processos/[id]/*`, `processos/novo`, `processos/[id]/editar`,
`tarefas/nova`, `tarefas/[id]`, `respostas-reutilizaveis`, `configuracoes`,
`processos` lista), mais o componente compartilhado `components/ui/erro-
consulta.tsx`.

## Pendências que ficam fora deste fechamento

Não fazem parte do que já foi entregue/cobrado até aqui:

- **Item #7 de verdade** (Agenda, Financeiro, Relacionamento e Biblioteca
  Pericial como funcionalidade, não só como nome no menu) — precisa de
  conversa de escopo/orçamento própria, não está nesta Fase 2 nem na fila de
  10 melhorias.
- **Item #10 da fila, parte de forma de pagamento/parcelas da AT no
  dashboard** — a migration de honorários em atraso (aprovada e aplicada em
  21/09/2026) já resolve o registro do dado; falta só somar isso numa visão
  do dashboard, não pedido ainda.
- Staffing/papéis/RLS (quem faz o quê no sistema) — leitura confirmada pela
  Dra. Fernanda, construção ainda não orçada.
