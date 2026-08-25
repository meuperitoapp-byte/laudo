# documentos

Upload e listagem de documentos/imagens vinculados a um processo — implementado.

Rota: `app/(dashboard)/processos/[id]/documentos/page.tsx` (server component — busca a
lista ordenada e gera signed URLs em lote) + `DocumentosPanel` (client component,
`documentos-panel.tsx`) com o formulário de envio e um card por documento (editar
metadados, mover, excluir, abrir/baixar).

Tabela relacionada: `documentos` (só `processo_id` preenchido — `tipo` em
`documento_processual`/`imagem_pericia`). Precisa de uma migration nova, além do schema:
`20260824090000_storage_bucket_documentos.sql` — **precisa ser aplicada no Supabase** (SQL
editor) antes de testar, ver seção "Passo manual" abaixo.

## Arquivos

- `constants.ts` — nome do bucket, limite de tamanho, lista de sugestão de `categoria`
  (datalist, não é `enum`/CHECK — a coluna é texto livre por design, ver comentário dela na
  migration do Curatela).
- `actions.ts` — Server Actions `uploadDocumento`, `atualizarDocumento`, `excluirDocumento`,
  `moverDocumento`.
- `documentos-panel.tsx` — UI client-side (upload + lista + edição inline).

## Passo manual no Supabase (obrigatório antes de testar)

Rode a migration `20260824090000_storage_bucket_documentos.sql` no SQL Editor do Supabase.
Ela cria o bucket `documentos-processos` (privado, limite de 25MB por arquivo) e a policy de
RLS `authenticated_full_access_documentos_processos` em `storage.objects` — sem isso, o
upload falha (bucket não existe) ou é bloqueado pelo RLS padrão do Storage (nenhuma policy =
ninguém acessa, mesma lógica já usada nas outras tabelas do projeto). Nenhum outro passo no
painel é necessário — o bucket já sai configurado certo pela migration.

## Regras aplicadas

- **Storage privado, sem URL pública**: o bucket é `public = false`. A página gera signed
  URLs no servidor (`createSignedUrls`, 1 hora de validade, recalculadas a cada carregamento
  da página) — nunca expõe um link público direto pra um documento médico-pericial.
- **Miniatura vs. ícone**: `mime_type` começando com `image/` mostra a própria imagem
  (via signed URL); os demais mostram um ícone genérico por tipo (PDF, Word, planilha,
  outro).
- **Ilegível/insuficiente sem bloqueio**: marcar `ilegivel_insuficiente` não exige
  `observacao` pra salvar — é um aviso de interface (aparece destacado no card), não uma
  validação bloqueante. Mesma decisão já registrada no comentário da coluna na migration do
  schema inicial ("o fluxo permite salvar rascunho sem observação ainda preenchida").
- **Ordem**: documento novo entra com `ordem` = maior já usada no processo + 1. Mover
  cima/baixo troca `ordem` com o vizinho — mesmo padrão de `moverQuesito`
  (`src/features/quesitos/actions.ts`), relendo a lista do banco no momento da ação.
- **Excluir remove dos dois lugares**: a action tira o arquivo do Storage e só depois apaga
  a linha do banco — nunca deixa a linha órfã de um arquivo já removido, nem um arquivo
  órfão sem linha (e se o upload for bem-sucedido mas o insert falhar, desfaz o upload).
- **Categoria é sugestão, não lista fechada**: `<datalist>` com as categorias mais comuns
  dos 3 tipos de laudo mapeados (Petição inicial, ASO, PPP, Prontuário etc.) — o campo
  aceita qualquer texto, igual à coluna no banco.

## Fora de escopo (conforme combinado)

- Tela de assinatura da perita / logomarca da cliente (`tipo` = `assinatura_perito` /
  `logomarca`, `documentos.processo_id` nulo — assets globais da conta) — fica pra uma seção
  de "Configurações", quando chegar a etapa de geração do laudo final.
- Cálculo automático de `{{total_documentos}}`, `{{total_paginas}}`,
  `{{categorias_principais}}` pro narrativo da Seção VI (Matriz de Documentos Analisados) —
  os dados já existem aqui (`categoria`, `paginas` por documento), mas a leitura desses
  tokens pelo motor de preenchimento (`src/features/preenchimento/narrativo.ts`) ainda não
  foi implementada — é a lacuna que já estava documentada no README de `preenchimento`.
- Upload em lote (vários arquivos numa só submissão) — cada envio é de um arquivo por vez,
  já que os metadados (categoria, origem, data, páginas) são por documento.
