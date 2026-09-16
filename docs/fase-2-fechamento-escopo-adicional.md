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

## Pendências que ficam fora deste fechamento

Não fazem parte do que já foi entregue/cobrado até aqui:

- **Migration de honorários em atraso** — desenho aprovado em 15/09/2026,
  migration escrita em `supabase/migrations/20260921120000_processos_
  honorarios_atraso.sql`, ainda não aplicada nem codada na tela. Item #10 da
  fila (parte de forma de pagamento/parcelas da AT) depende dela.
- **Item #7 de verdade** (Agenda, Financeiro, Relacionamento e Biblioteca
  Pericial como funcionalidade, não só como nome no menu) — precisa de
  conversa de escopo/orçamento própria, não está nesta Fase 2 nem na fila de
  10 melhorias.
- Staffing/papéis/RLS (quem faz o quê no sistema) — leitura confirmada pela
  Dra. Fernanda, construção ainda não orçada.
