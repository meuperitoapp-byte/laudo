# quesitos

Quesitos do processo — implementado.

Rota: `app/(dashboard)/processos/[id]/quesitos/page.tsx` (server component, busca a lista
ordenada) + `QuesitosPanel` (client component, `quesitos-panel.tsx`) com o formulário de
criação e um card por quesito (editar origem/pergunta/resposta, mover, excluir).

Tabela relacionada: `quesitos`. Sem migration nova — o schema já existia.

## Regras aplicadas

- **Campo aberto, sem lista fixa**: `origem` e `pergunta` são texto livre — a perita cola o
  quesito que o juízo/parte mandou, não escolhe de uma lista pré-definida (CLAUDE.md, item 8
  do fluxo).
- **Resposta nunca obrigatória**: salvar um quesito sem resposta é permitido — quando não há
  elementos médico-periciais objetivos suficientes, a justificativa (texto livre) entra no
  lugar da resposta objetiva, não é um campo à parte. O botão "Sem elementos suficientes"
  só insere um texto-modelo editável no campo de resposta, pra agilizar; não salva sozinho.
- **Ordem**: quesito novo entra com `ordem` = maior já usada no processo + 1. Mover
  cima/baixo troca o `ordem` com o vizinho (`moverQuesito`, em `actions.ts`) — lê a lista do
  banco no momento da ação em vez de confiar só no que o client já tinha renderizado, pra não
  desalinhar se a perita e a secretária mexerem ao mesmo tempo.
- **Server Actions**: `criarQuesito`, `atualizarQuesito`, `excluirQuesito`, `moverQuesito` —
  todas em `actions.ts`, cada uma com `revalidatePath` na rota de quesitos do processo.

## Fora de escopo

- Vincular quesito a `resposta_evidencias` ou a respostas do preenchimento por seção — não
  pedido ainda.
- Importação automática de quesitos a partir de um documento anexado — o fluxo é sempre
  colar manualmente.
