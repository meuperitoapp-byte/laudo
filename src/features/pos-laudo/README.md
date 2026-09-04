# Módulo Pós-Laudo

Esclarecimentos / retificação / complementação **depois do laudo entregue**. Vale para
Perícia Judicial e Assistência Técnica. Plano completo: `docs/plano-modulo-pos-laudo.md`.
Schema: `supabase/migrations/20260905120000_pos_laudo_schema.sql`.

## Dívida técnica

`src/features/quesitos/quesitos-panel.tsx` salva com **autosave debounced** (~1,2s),
enquanto o resto do sistema (motor de preenchimento, e agora todo o Pós-Laudo) salva
por **botão explícito** (`dirty ? "Salvar" : "Salvo"` + guard de `beforeunload`). A Dra.
Fernanda já usa a tela de Quesitos; mudar o comportamento de salvamento dela no meio do
Pós-Laudo é risco sem ganho. **Padronizar quando o Módulo Pós-Laudo fechar.**

## Estado atual — fatias 1 a 4

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

### Fatia 3 — documentos supervenientes

- **Upload** reaproveitando 100% o pipeline de `documentos`: MESMO bucket
  (`documentos-processos`), mesma convenção de `storage_path`, mesmo padrão "sobe,
  insere, desfaz se falhar". `adicionarDocumentoSuperveniente` cria a linha em
  `documentos` (`tipo='documento_processual'`) E a linha em `pos_laudo_documentos`
  (papel superveniente/laudo_analisado/manifestacao_analisada + apresentante,
  data_juntada, páginas, existência prévia, disponível ao perito à época, relevância,
  impacto, observação técnica, já enfrentado). Sem bucket novo, sem caminho paralelo.
- **Anti-join em `compilarLaudo`** (`compilar.ts`): documentos que aparecem em
  `pos_laudo_documentos` (de qualquer ciclo do processo) são excluídos da contagem
  (`{{total_documentos}}` etc.) E da tabela de documentos analisados do laudo original.
  Testar explicitamente: gerar laudo num processo com documento superveniente e conferir
  que ele não aparece em nenhum dos dois.
- **Rastreabilidade fora da tela do ciclo**: `/processos/[id]/documentos` marca esses
  documentos com um selo "Superveniente · pós-laudo ciclo N" e bloqueia a exclusão por
  ali (manda remover pela tela do ciclo). `removerDocumentoSuperveniente` remove o
  vínculo + a linha de `documentos` + o arquivo do Storage.

### Fatia 4 — matriz de enfrentamento + Conclusão Vigente V1

- **Enfrentamento por ponto** (`pos_laudo_pontos.resposta_tecnica` + `.repercussao`):
  no mesmo card de cada ponto, um textarea de **resposta técnica** e um select de
  **repercussão do ponto** (5 valores — `REPERCUSSAO_PONTO_*`). Ponto sem resposta
  técnica é **estado válido**: salva livre, marcado com selo "Sem resposta técnica",
  e só trava na geração da saída (fatia seguinte). `salvarPonto` estendido.
- **Repercussão de nível de ciclo** (`pos_laudo_ciclos.repercussao_laudo`, migration
  `20260906120000`): `RepercussaoCicloControl` — select de 6 valores
  (`REPERCUSSAO_LAUDO_*`), com **sugestão visual** derivada das repercussões dos
  pontos (`sugerirRepercussaoLaudo`), no mesmo modelo do `rascunho_complementacao`:
  só sinaliza, nunca preenche nem trava. `salvarRepercussaoCiclo`.
- **Nova Conclusão Vigente (rascunho)** (`pos_laudo_ciclos.conclusao_vigente_nova`):
  textarea que aparece quando `repercussao_laudo ∈
  REPERCUSSAO_LAUDO_EXIGE_NOVA_CONCLUSAO` (`modificacao_parcial` /
  `revisao_substancial` / `substituicao_conclusao`). É texto de trabalho no ciclo —
  só vira linha em `pos_laudo_conclusoes_vigentes` quando o documento de pós-laudo é
  protocolado (fatia seguinte).
- **Trava da Nova Conclusão Vigente** (`regras.ts` → `podeGerarSaida`): **só
  definida, ainda não amarrada**. Barra a GERAÇÃO do documento (não o encerramento
  do ciclo) quando a repercussão exige nova conclusão e o rascunho está vazio.
- **Bloco "Conclusão vigente" na tela do laudo final**
  (`conclusao-vigente-inicial.tsx` + `laudo/page.tsx`): aparece quando há laudo
  `tipo='laudo'` + `protocolado=true`. A conclusão vigente V1 **não é semeada
  retroativamente** — a perita a confirma uma vez aqui. Pré-preenchimento
  **conservador** via `extrairConclusaoDoLaudo`: só traz texto quando há **uma**
  seção de conclusão inequívoca com narrativo salvo (allowlist de `codigo`:
  `conclusao_medico_pericial`, `conclusao`, `conclusao_relatorio`,
  `conclusao_parecer`). Em qualquer ambiguidade o campo vem **vazio** com instrução
  pra colar o texto — nunca conteúdo de outra seção "plausível". Quando o texto foi
  extraído, a tela avisa de qual seção veio e pede conferência antes de confirmar.
  `definirConclusaoVigenteInicial` só opera enquanto a vigente for a V1 do laudo
  (`origem_tipo='laudo'` e `ciclo_id IS NULL`); depois vira read-only.
- **Gate de `abrirCicloPosLaudo` estendido**: além do laudo protocolado, agora exige
  que a conclusão vigente já exista. Sem ela, o erro aponta pra tela do laudo final.

Inerte, esperando as próximas fatias: quesitos do ciclo, geração de documento
(consome `conclusao_vigente_nova` no corpo e cria a linha de
`pos_laudo_conclusoes_vigentes` no protocolo), amarração de `podeGerarSaida`,
encerramento do ciclo, mudança da situação do processo. O `status` do ciclo continua
sem avançar de "aberto".

## Arquivos

- `actions.ts` — `abrirCicloPosLaudo`, `salvarRegistroDemanda`, `salvarTriagemCiclo`,
  `adicionarPonto`, `salvarPonto`, `removerPonto`, `vincularEvidencia`,
  `desvincularEvidencia`, `adicionarDocumentoSuperveniente`,
  `salvarMetadadosSuperveniente`, `removerDocumentoSuperveniente`,
  `salvarRepercussaoCiclo`, `definirConclusaoVigenteInicial` (+ helper
  `recomputarRascunhoComplementacao`).
- `consultas.ts` — **não** "use server": `conclusaoVigenteAtual`,
  `extrairConclusaoDoLaudo` (recebem o client do Supabase; usadas por páginas e por
  `actions.ts`).
- `regras.ts` — **não** "use server": `podeGerarSaida` (trava síncrona da Nova
  Conclusão Vigente; definida, ainda não amarrada).
- `abrir-ciclo-button.tsx` — client, botão do índice.
- `registro-demanda-form.tsx` — client, etapa Registro da Demanda (botão explícito).
- `matriz-pontos.tsx` — client, campo de ciclo + matriz de pontos + enfrentamento +
  `RepercussaoCicloControl` + evidências.
- `documentos-supervenientes.tsx` — client, upload + metadados dos supervenientes.
- `conclusao-vigente-inicial.tsx` — client, bloco "Conclusão vigente" do laudo final.
- `rotulos.ts` — rótulos pt-BR das colunas `text` + CHECK do módulo.

O anti-join vive em `src/features/geracao-laudo/compilar.ts` (não neste diretório).
