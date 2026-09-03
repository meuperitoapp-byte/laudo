# Módulo Pós-Laudo

Esclarecimentos / retificação / complementação **depois do laudo entregue**. Vale para
Perícia Judicial e Assistência Técnica. Plano completo: `docs/plano-modulo-pos-laudo.md`.
Schema: `supabase/migrations/20260905120000_pos_laudo_schema.sql`.

## Estado atual — fatias 1 e 2

O que já existe:

- **Gate**: a aba "Pós-laudo" (em `processos/[id]/page.tsx`) só aparece quando há um
  `laudos_gerados` com `tipo = 'laudo'` e `protocolado = true`. Antes disso, um rótulo
  desabilitado.
- **Marcar laudo como protocolado**: `marcarLaudoProtocolado` em
  `src/features/geracao-laudo/actions.ts` + diálogo de confirmação em
  `gerar-laudo-panel.tsx` (ação irreversível — o trigger `trg_laudos_gerados_congela`
  congela o conteúdo daquela versão). Recebe o nº do protocolo (opcional).
- **`/processos/[id]/pos-laudo`** — índice de ciclos + botão "Abrir novo ciclo".
- **`abrirCicloPosLaudo`** (`actions.ts`): cria `pos_laudo_ciclos` com
  `numero_ciclo = max+1`, `fluxo` **derivado de `processos.tipo_trabalho`** (nunca
  escolha do usuário), `laudo_base_id` = a **maior `versao` entre `tipo='laudo'` e
  `protocolado=true`** (filtro de tipo explícito). Dedup: se já há um ciclo `aberto` com
  o Registro da Demanda em branco, redireciona pra ele em vez de criar outro.
- **`/processos/[id]/pos-laudo/[cicloId]`** — só a etapa **"Registro da demanda"**:
  data da intimação, prazo, origem, natureza (multi), documento da intimação (escolhe um
  já anexado ao processo; opcional, com selo "Pendente" quando vazio). **Salvamento por
  botão explícito** (`dirty ? "Salvar" : "Salvo"` + guard de `beforeunload`) — mesma
  gramática do motor de preenchimento (`secao-workspace.tsx`), não o autosave debounced
  do quesitos-panel. `salvarRegistroDemanda` **não** mexe no `status` do ciclo.

### Fatia 2 — triagem + matriz de pontos

- **Campo de ciclo "a manifestação pode modificar a conclusão?"**
  (`pos_laudo_ciclos.pode_modificar_conclusao`) — `salvarTriagemCiclo`.
- **Matriz de pontos** (`pos_laudo_pontos`): adicionar / editar / remover pontos.
  Por ponto: origem, tema, síntese da alegação, já abordado no laudo?, página/item,
  **uma** classificação de triagem (9 valores), fundamentação adicional. Salvamento por
  botão explícito por card.
- **Evidências** (`pos_laudo_ponto_evidencias`): vincular / desvincular documentos já
  anexados ao processo a um ponto, com observação opcional. (Vincular a achados do laudo
  — `resposta_processo_id` — fica pra depois.)
- **`rascunho_complementacao`**: `recomputarRascunhoComplementacao` (em `actions.ts`)
  liga a flag quando algum ponto é classificado como `necessidade_complementacao` e
  desliga caso contrário. **É pura sinalização visual** — um aviso "Sugestão" na tela do
  ciclo. NUNCA é lida como condição de fluxo: não cria Complementação nem bloqueia
  Esclarecimentos. Se algum código futuro precisar dela como condição de fluxo, PARAR e
  alinhar com o Jeferson antes.

Inerte, esperando as próximas fatias: `resposta_tecnica` / `repercussao` por ponto
(matriz de enfrentamento — fatia 4), documentos supervenientes, quesitos do ciclo,
geração de documento, conclusão vigente, encerramento do ciclo, mudança da situação do
processo. O `status` do ciclo continua sem avançar de "aberto".

## Arquivos

- `actions.ts` — `abrirCicloPosLaudo`, `salvarRegistroDemanda`, `salvarTriagemCiclo`,
  `adicionarPonto`, `salvarPonto`, `removerPonto`, `vincularEvidencia`,
  `desvincularEvidencia` (+ helper `recomputarRascunhoComplementacao`).
- `abrir-ciclo-button.tsx` — client, botão do índice.
- `registro-demanda-form.tsx` — client, etapa Registro da Demanda (botão explícito).
- `matriz-pontos.tsx` — client, campo de ciclo + matriz de pontos + evidências.
- `rotulos.ts` — rótulos pt-BR das colunas `text` + CHECK do módulo.
