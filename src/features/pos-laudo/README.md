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

## Estado atual — fatias 1 a 6

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

### Fatia 5 — geração dos Esclarecimentos

Baseada em `MODELO_ESCLARECIMENTOS_AO_LAUDO_MEDICO_PERICIAL.pdf` (seções I–VIII).
Reaproveita o MESMO `ModeloLaudo` + `renderizarPdf`/`renderizarDocx` do laudo principal —
zero motor de PDF/Word duplicado. Duas mudanças pequenas e aditivas em
`geracao-laudo/` pra viabilizar isso: `CabecalhoFormal.paragrafoIntroducao` (parágrafo
extra antes do título, usado pelo Pós-Laudo; `undefined` no laudo principal, sem
mudança de comportamento) e a seção "APRESENTAÇÃO" só entra quando `modelo.apresentacao`
não é vazio (o laudo principal sempre preenche; o Pós-Laudo deixa em branco de propósito
e usa `paragrafoIntroducao` em vez disso).

- **`compilar-esclarecimentos.ts`** — `compilarEsclarecimentos(processoId, cicloId,
  paginasTexto?)`: monta as 8 seções a partir do ciclo (Registro da Demanda, matriz de
  pontos, documentos supervenientes, repercussão + conclusão vigente) e devolve
  `{status: "ok", modelo, snapshot}` | `{status:"erro", mensagem}` |
  `{status:"pendencias", itens}` — UMA lista de pendências, cada item com `href` pra
  âncora exata da tela (`#ponto-<id>`, `#repercussao-ciclo`), no mesmo espírito do bloco
  "Geração bloqueada" do laudo principal. É aqui que `podeGerarSaida` (fatia 4) é
  amarrado pela primeira vez. Bloqueia também `repercussao_laudo = 'substituicao_conclusao'`
  (exclusiva da Complementação — fatia 7, ainda não existe).
- **Two-pass de paginação** (`renderizarPdfComPaginas`, `geracao-laudo/renderizar-pdf.ts`):
  usa `bufferPages: true` do PDFKit pra ler `bufferedPageRange().count` — a contagem real
  de páginas — ANTES de finalizar o PDF, sem precisar reabrir o buffer com outra lib.
  `gerarEsclarecimentos` chama `compilarEsclarecimentos` duas vezes (1ª com placeholder
  "—" no lugar do número; mede; 2ª com o número real) e aborta se a paginação divergir
  entre as duas passadas.
- **`gerarEsclarecimentos(cicloId, processoId)`** — mesmo padrão de `gerarLaudo`:
  `versao` = maior já usada pelo processo + 1 (nunca sobrescreve), grava
  `laudos_gerados` com `tipo='esclarecimentos'`, `pos_laudo_ciclo_id`,
  `substitui_conclusao` = (`snapshot.conclusao_vigente_texto !== null`).
- **`marcarPosLaudoProtocolado(laudoGeradoId, processoId, cicloId, protocoloId)`** —
  mesmo contrato de `marcarLaudoProtocolado`, generalizado pra qualquer saída de
  pós-laudo (filtra por `pos_laudo_ciclo_id`, nunca alcança o laudo principal). Quando o
  snapshot JÁ CONGELADO por este UPDATE carrega uma Nova Conclusão Vigente, grava a linha
  em `pos_laudo_conclusoes_vigentes` **a partir do snapshot**, nunca da coluna viva do
  ciclo — gerar e protocolar continuam dois atos distintos; editar o rascunho depois de
  gerar não muda o que uma versão já gerada vai gravar se for protocolada.
- **`gerar-pos-laudo-panel.tsx`** (client) — mesmo padrão visual de `GerarLaudoPanel`.
  No diálogo de protocolar, quando a versão escolhida não é a mais recente gerada NESTE
  ciclo, mostra aviso (sem bloquear) com a versão mais nova e qual texto de conclusão
  vigente a versão ESCOLHIDA vai gravar.
- `gerar-laudo-panel.tsx` (laudo principal) ganhou um selo de tipo (`TIPO_ROTULOS`) nas
  linhas que não são `tipo='laudo'` — sem isso, uma vez que o Pós-Laudo gera versões,
  elas apareciam na lista de "Versões geradas" do laudo final como "Versão 2" sem dizer
  que é outro tipo de documento.

Simplificações registradas (nenhuma imprime `[___]` no documento — quando falta dado, a
frase é composta sem a cláusula):
- "ID da manifestação" do modelo não tem campo equivalente no schema — a seção I não a
  menciona.
- Nome/CRM/cidade de assinatura vêm de `VALORES_PADRAO_PERITO` (mesmo padrão já usado no
  motor de preenchimento), não de uma nova consulta às respostas do laudo original —
  "só existe uma perita usando o sistema" (CLAUDE.md), risco de divergência é próximo de
  zero.
- ~~Data da assinatura é sempre "hoje"~~ — **corrigido**: é a data do ATO (ela pode gerar
  num dia e protocolar dias depois), não a de hoje. Campo `<input type="date">` na tela de
  geração (`gerar-pos-laudo-panel.tsx`), pré-preenchido com hoje no fuso do navegador,
  editável — `formatarDataExtenso` em `compilar-esclarecimentos.ts` compõe "5 de setembro
  de 2026" a partir de "YYYY-MM-DD" sem passar por `Date` (mesmo cuidado de fuso de
  `formatarDataPura`).
- Seção VI não tem um campo de "Fundamentação da repercussão" à parte — a fundamentação
  já está nas respostas técnicas de cada ponto (seção IV); a seção VI só declara o nível
  marcado.
- Seção V (quesitos suplementares) nunca aparece ainda: `pos_laudo_quesitos` não tem CRUD
  (fatia 9).
- O número de páginas do `.docx` reusa o mesmo valor medido no PDF (o `.docx` não tem
  como medir sua própria paginação na geração — ela depende do Word/impressora de quem
  abrir o arquivo).

### Fatia 6 — Retificação de Erro Material

Baseada em `MODELO_RETIFICACAO_DE_ERRO_MATERIAL.pdf` (seções I–VII). Mesmo reuso direto
do `ModeloLaudo`/renderers, mesmo two-pass de paginação e campo de data-do-ato da fatia 5.
Migration `20260907120000`: 2 colunas em `pos_laudo_ciclos`.

- **Itens onde-se-lê / leia-se** (`pos_laudo_retificacao_itens`, seção III): CRUD por
  card, com botão explícito. `onde_se_le`/`leia_se` são `not null` no banco — item novo
  nasce com `""` (satisfaz a constraint), e a exigência de conteúdo de verdade é
  pendência de geração, não de save (mesmo "estado válido" da matriz de pontos).
  `documento_alvo_id` é pré-preenchido com o `laudo_base_id` do ciclo — **sem seletor por
  item** por ora (simplificação registrada): todos os itens de um ciclo retificam o mesmo
  documento-base.
- **Análise da Repercussão** (`AnaliseRepercussaoControl`, seção IV — a trava central):
  `retificacao_afeta_conclusao` (boolean, NÃO/SIM) + `retificacao_justificativa` (texto)
  em `pos_laudo_ciclos`. **Pergunta EXPLÍCITA — nunca inferida** de `repercussao_laudo`,
  de `natureza_erro` nem de nada. Justificativa obrigatória nas duas respostas (pelo
  modelo); quando NÃO, entra **verbatim** na seção IV do documento gerado.
- **`compilarRetificacao`** (`compilar-retificacao.ts`, não "use server"): seções I–VII.
  - **NÃO** → gera. Seção V (conclusão original mantida integralmente) só existe nesse
    caminho. `substitui_conclusao` sempre `false` — Retificação nunca cria Nova Conclusão
    Vigente (trava estrutural da fatia 0: `'retificacao'` ausente de
    `pos_laudo_conclusoes_vigentes.origem_tipo`).
  - **SIM** → pendência de **tom `"orientacao"`** (não `"bloqueio"`): ela acertou ao
    identificar a repercussão, o caminho técnico é a Complementação (fatia 7, ainda não
    existe). **Sem migração de dado** — `pos_laudo_retificacao_itens` já é chaveada só por
    `ciclo_id`, não pela saída que a consome (decisão da fatia 0). Sem beco sem saída: a
    resposta não trava (pode voltar pra NÃO), os itens ficam salvos, só a geração da
    Retificação fica indisponível enquanto SIM.
- **`BlocoPendencias`** (na page do ciclo): separa itens `tom:"orientacao"` (caixa calma,
  selo "Caminho indicado", nunca "Geração bloqueada") de `tom:"bloqueio"` (caixa âmbar
  padrão). `PendenciaGeracaoPosLaudo` foi movida pra `regras.ts` (compartilhada pelos dois
  `compilar-*.ts`).
- **`GerarPosLaudoPanel` generalizado**: agora recebe `gerar` (a server action), `chave`,
  `nomeDocumento` e `tituloBotao` por prop — a mesma tela serve Esclarecimentos e
  Retificação (e Complementação na fatia 7) sem duplicar ~250 linhas. Renderizada 2x na
  page do ciclo, cada instância com a lista de versões filtrada pelo seu `tipo`.

Simplificações da fatia 6 (mesmo critério: nunca imprime `[___]`):
- Sem "ID da manifestação"/"Data da identificação do erro"/"Origem da identificação" da
  seção I — não há campo equivalente no schema.
- Sem seletor de `documento_alvo_id` por item (default = `laudo_base_id`).
- Seção II não tem parágrafo de "Descrição objetiva do erro" à parte — os pares
  onde-se-lê/leia-se da seção III já são a descrição objetiva, em forma checável.

Inerte, esperando as próximas fatias: Complementação do Laudo (fatia 7, é ela quem
habilita `substituicao_conclusao` e recebe os itens quando a Retificação dá SIM),
quesitos do ciclo (fatia 9), encerramento do ciclo, mudança da situação do processo. O
`status` do ciclo continua sem avançar de "aberto".

## Arquivos

- `actions.ts` — `abrirCicloPosLaudo`, `salvarRegistroDemanda`, `salvarTriagemCiclo`,
  `adicionarPonto`, `salvarPonto`, `removerPonto`, `vincularEvidencia`,
  `desvincularEvidencia`, `adicionarDocumentoSuperveniente`,
  `salvarMetadadosSuperveniente`, `removerDocumentoSuperveniente`,
  `salvarRepercussaoCiclo`, `definirConclusaoVigenteInicial`, `gerarEsclarecimentos`,
  `marcarPosLaudoProtocolado`, `adicionarItemRetificacao`, `salvarItemRetificacao`,
  `removerItemRetificacao`, `salvarAnaliseRetificacao`, `gerarRetificacao` (+ helper
  `recomputarRascunhoComplementacao`).
- `consultas.ts` — **não** "use server": `conclusaoVigenteAtual`,
  `extrairConclusaoDoLaudo` (recebem o client do Supabase; usadas por páginas e por
  `actions.ts`).
- `regras.ts` — **não** "use server": `podeGerarSaida` + o tipo compartilhado
  `PendenciaGeracaoPosLaudo`.
- `compilar-esclarecimentos.ts` / `compilar-retificacao.ts` — **não** "use server":
  `compilarEsclarecimentos` / `compilarRetificacao` (busca no banco + monta o
  `ModeloLaudo` + `SnapshotPosLaudo` de cada saída).
- `abrir-ciclo-button.tsx` — client, botão do índice.
- `registro-demanda-form.tsx` — client, etapa Registro da Demanda (botão explícito).
- `matriz-pontos.tsx` — client, campo de ciclo + matriz de pontos + enfrentamento +
  `RepercussaoCicloControl` + evidências.
- `documentos-supervenientes.tsx` — client, upload + metadados dos supervenientes.
- `retificacao-panel.tsx` — client, itens onde-se-lê/leia-se + Análise da Repercussão.
- `conclusao-vigente-inicial.tsx` — client, bloco "Conclusão vigente" do laudo final.
- `gerar-pos-laudo-panel.tsx` — client, geração + protocolar (genérico por saída).
- `rotulos.ts` — rótulos pt-BR das colunas `text` + CHECK do módulo.

O anti-join vive em `src/features/geracao-laudo/compilar.ts` (não neste diretório). O
renderer de PDF/Word também: `geracao-laudo/renderizar-pdf.ts` e `renderizar-docx.ts`,
reaproveitados quase sem alteração (ver nota da fatia 5 acima).
