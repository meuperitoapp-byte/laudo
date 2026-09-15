# Plano técnico — Central de Gestão de Prazos e Tarefas

Pedido pela Dra. Fernanda junto com a Fase 2, na mesma encomenda do Pós-Laudo — única peça
daquele pacote que não foi construída. Requisitos dela: classificação de urgência em 6
níveis (crítica, urgente, alta, atenção, programada, sem prazo); cores por proximidade do
vencimento (verde ≤7 dias, amarelo ≤3 dias, laranja no último dia, vermelho vencida);
distinção evento (hora marcada) × tarefa (prazo até); status próprio por item; tarefas
recorrentes do domínio pericial; campo obrigatório "Próxima Providência"; painel "o que
fazer hoje".

**Recorte da fatia 1 (decisão do Jeferson):** só o painel que agrega o que o sistema já
sabe. Zero cadastro manual de tarefa. Motivo: uma central que ela precise alimentar à mão
compete com o caderno e o WhatsApp dela, e perde. O valor está nos itens nascerem sozinhos
dos dados que já existem.

Este documento cobre as 6 perguntas feitas antes de qualquer código ou migration.

**Alcance da v1 — registrado a pedido do Jeferson (11/09/2026):** o achado do §1 (um único
campo de prazo real no banco inteiro) limita o alcance desta primeira versão. A Central vai
listar pouca coisa até o Fluxo Principal do Perito Judicial existir e começar a gravar
datas de verdade por etapa. **Isso não é defeito do desenho da Central — é reflexo de onde
o resto do sistema está hoje.** a lista cresce sozinha conforme mais partes do sistema
passam a ter data estruturada; a Central não precisa ser refeita quando isso acontecer (ver
§5 — ela só ganha mais uma fonte).

**Decisões do Jeferson (11/09/2026), fecham os 3 pontos abertos:**
1. "Programada = tem prazo, mais de 7 dias" confirmado — régua fechada como estava no §2.
2. **Não promove nenhum item do Grupo B.** Tudo sem data fica em "Sem prazo" na v1.
   Justificativa dele, registrada: se o sistema atribuir urgência que a data não sustenta, a
   régua de cor perde o significado justamente onde ela precisa ser confiável — quando algo
   está de fato vencendo. Roda com dado real primeiro; ajusta depois se ela sentir falta.
3. **Tela própria, e é a porta de entrada do sistema** — depois do login, a Central é a
   primeira tela, com a lista de processos a um clique. Risco avaliado (ver §7): baixo, 3
   pontos de redirecionamento conhecidos, nenhuma mudança em lógica de autenticação.

**Requisito adicional dele:** item sem data e item com prazo folgado não podem competir
visualmente com o que está vencendo — a ordenação por nível de urgência resolve isso
estruturalmente (ver §6.1), não é um ajuste visual à parte.

**Respostas da Dra. Fernanda (repassadas pelo Jeferson, 11/09/2026) — as 4 perguntas
pendentes das fatias 2 e 3:**
1. **Vocabulário de status por item não é fixo** — ela quer poder editar as opções, não uma
   lista travada em código (mesmo espírito do catálogo de `situacao_processo`, editável).
2. **"Evento" com hora marcada entra já**, não fica pra depois — a fatia 2 não precisa se
   limitar a "tarefa" (granularidade de dia); "evento" nasce junto.
3. **Correção manual do nível sempre vence o cálculo automático** — ela pode sobrescrever o
   nível que o sistema calculou a qualquer momento, e essa correção manual tem prioridade
   sobre a régua automática, nunca o contrário.
4. **Recorrências do domínio pericial são ligadas a papel + estado do caso**, não uma lista
   solta de lembretes soltos — ela deu exemplos concretos da rotina dela pra servirem de
   base quando a fatia 3 for desenhada.

Essas 4 respostas destravam as fatias 2 e 3 da tabela do §6 (deixam de depender dela) — falta
o Jeferson priorizar e eu escrever o plano de cada uma antes de qualquer código.

---

## 1. Levantamento — o que já existe no banco com data, prazo ou estado pendente

Vasculhado em todas as migrations aplicadas (não só o schema inicial). **Achado central:
existe exatamente UM campo de prazo de verdade em todo o banco** —
`pos_laudo_ciclos.prazo`. Tudo o mais que é "pendente" hoje é um **estado sem data**
(`boolean`/`enum`/`null` significando "ainda não decidido/feito"), nunca um "vence em tal
dia". Isso já responde boa parte da pergunta 2.

Nenhum "evento com hora marcada" (data + horário) existe em lugar nenhum do banco hoje —
nem agendamento de perícia, nem reunião. `pos_laudo_ciclos.data_intimacao` é `date`, sem
hora. **Fatia 1 não vai produzir nenhum "evento"** — só "tarefas" (granularidade de dia) —
porque não há dado de evento pra agregar. Não é uma lacuna da fatia, é uma lacuna do que
existe pra ler.

| Tabela.coluna | Tipo | O que significa hoje | O que viraria na tela |
|---|---|---|---|
| `pos_laudo_ciclos.prazo` | `date`, nullable | Prazo pra responder à manifestação que abriu o ciclo | **Único item com data real.** Vira a cor (verde/amarelo/laranja/vermelho) + "Ciclo N — responder até DD/MM" |
| `pos_laudo_ciclos.status != 'encerrado'` | enum, default `'aberto'` | Ciclo ainda em aberto. **Na prática só assume `'aberto'`/`'encerrado'` hoje** — os valores intermediários do CHECK (`triagem`, `em_resposta`, `aguardando_protocolo`, `protocolado`) nunca são gravados por nenhuma action existente | "Ciclo N está aberto" — com ou sem `prazo` preenchido |
| `laudos_gerados` — `tipo='laudo' AND protocolado=false` | bool | Laudo já gerado, ainda não marcado como protocolado | "Laudo pronto — falta protocolar" |
| `laudos_gerados` (AT) — `protocolado=false AND entregue_ao_advogado_em IS NULL` | timestamptz nullable | Parecer/Quesitos AT gerado, ainda não entregue ao advogado | "Parecer AT pronto — falta entregar ao advogado" |
| `laudos_gerados` (AT) — `entregue_ao_advogado_em IS NOT NULL AND protocolado=false` | timestamptz | Entregue, aguardando confirmação de que o advogado protocolou | "Entregue em DD/MM — aguardando confirmação de protocolo" |
| `pos_laudo_pontos.resposta_tecnica IS NULL` (em ciclo `aberto`) | text nullable | Ponto da matriz ainda sem resposta | Não vira item próprio — fica dentro do card do ciclo (ver §5 sobre não duplicar granularidade) |
| `pos_laudo_quesitos.resposta IS NULL` (em ciclo `aberto`, fluxo judicial) | text nullable | Quesito do ciclo sem resposta | Idem — fica dentro do card do ciclo |
| `documentos.ilegivel_insuficiente = true` | bool | Documento marcado como ilegível/insuficiente, sem providência registrada | "Documento X precisa de providência (ilegível/insuficiente)" |
| `pos_laudo_documentos.ja_enfrentado = false` | bool | Documento superveniente ainda não confrontado na matriz do ciclo | Fica dentro do card do ciclo (mesmo motivo do ponto acima) |
| `processos.aceitou_nomeacao IS NULL` (só `pericia_judicial`) | enum nullable | Nomeação ainda sem resposta (aceitar/recusar) | "Decidir sobre a nomeação" |

Fora do escopo por não terem dado nenhum pra ler:
- **Agendamento de perícia / audiência.** `situacao_processo` tem os valores "Agendamento
  de perícia" / "Novo agendamento" no catálogo, mas é texto solto — não existe coluna de
  data amarrada a esse valor. Pra isso virar item com prazo, ela precisaria digitar uma
  data em algum lugar — ou seja, é cadastro manual, e cadastro manual é fatia 2+, não 1.
- **Honorários / financeiro** (`honorario_apresentado`, `honorario_arbitrado`,
  `situacao_financeira`) — mesma limitação: valores e status existem, prazo não.
- **Pendências de revisão do laudo principal** (`PendenciaSecao`,
  `CampoObrigatorioFaltando` de `compilarLaudo`) — existem, mas são **calculadas em tempo de
  geração**, não uma coluna. Trazer isso pro painel exigiria rodar `compilarLaudo` pra cada
  processo só pra saber se há pendência — mais pesado que uma consulta simples. Deixo como
  candidato de uma fatia posterior, não da 1.

---

## 2. Quantos dos 6 níveis dá pra derivar sem ela classificar nada

**Nenhum nível exige que ela classifique um item, um por um, à mão.** Mas a mecânica por
trás de cada nível não é uniforme — são dois grupos:

**Grupo A — data real, banda automática (o que você já especificou):**
Só existe pra itens presos a `pos_laudo_ciclos.prazo`. Aplico sua régua literal:

| Situação da data | Cor | Nível |
|---|---|---|
| vencida | vermelho | **Crítica** |
| último dia | laranja | **Urgente** |
| até 3 dias | amarelo | **Alta** |
| até 7 dias | verde | **Atenção** |
| mais de 7 dias (tem prazo, mas está longe) | — | **Programada** |

(Sua lista tinha 4 cores pra 6 níveis — assumi que "Programada" é a banda "tem data, mas
está confortável" e ocupa o espaço acima do verde. Sinalizando essa costura porque foi
inferência minha, não algo que você descreveu explicitamente — confirma se é essa a leitura
antes de eu travar isso em código.)

**Grupo B — sem data, nível por REGRA FIXA do sistema (não classificação manual):**
Os itens sem data do §1 (laudo sem protocolar, parecer AT sem entrega/confirmação de
protocolo, documento ilegível, nomeação sem decisão) caem estruturalmente em **Sem
prazo** — não porque ela marcou algo, mas porque a coluna que definiria a data não existe.
Isso é honesto: o sistema não inventa urgência que a data não sustenta.

A única decisão de política que cabe a você (ou a ela, se preferir perguntar) é se algum
desses itens do Grupo B deveria ter um nível **mais alto que "Sem prazo" por padrão** —
por exemplo, "laudo pronto sem protocolar" pode merecer aparecer como "Atenção" sempre,
mesmo sem data, porque documento pronto parado é objetivamente algo a fazer. Se topar, é
**uma regra aplicada de uma vez pro tipo de item inteiro** (ex.: "todo laudo sem protocolar
= Atenção"), nunca ela abrindo um item e escolhendo o nível — a distinção que importa pra
não virar cadastro disfarçado.

**Resumo em números:** 1 categoria de item usa a régua de cor real (ciclos com prazo); 6
categorias de item são reais e acionáveis mas caem em "Sem prazo" por regra fixa, a menos
que você decida promover alguma. Zero categorias dependem de ela preencher nível/data à
mão.

---

## 3. Precisa de tabela nova nesta fatia?

**Não.** Tudo do §1 já existe como coluna em tabela existente. O painel é uma consulta —
na prática, várias consultas pequenas (uma por categoria de item) combinadas em uma lista
única, ordenada por nível de urgência. Nenhuma migration nesta fatia.

(Uma tabela nova volta a fazer sentido a partir da fatia 2, quando existir tarefa criada
por ela — aí sim é um registro que precisa morar em algum lugar. Ver §6.)

---

## 4. Onde mora "Próxima Providência" nesta fatia

Ela é o que impede a central de virar lista morta — concordo que é o campo mais importante
do módulo inteiro. Mas "obrigatório" no requisito original descreve o módulo completo
(quando existir tarefa criada à mão, fatia 2+, ela é obrigatória no cadastro). Na fatia 1
**não há cadastro**, então não há onde ela ser digitada — e ainda assim todo item do painel
precisa de uma "próxima providência" pra não ser só um fato solto.

Resolvo assim: **cada categoria de item do §1 tem um texto de providência FIXO, definido
uma vez no código** (mesmo padrão de rótulo que o resto do sistema já usa — um mapa
`categoria → texto`, não uma tabela). Exemplos:

- Ciclo aberto com prazo → *"Responder os pontos pendentes e gerar as saídas cabíveis até
  o prazo."*
- Laudo pronto sem protocolar → *"Protocolar o laudo já gerado."*
- Parecer AT sem entrega → *"Entregar o parecer ao advogado."*
- Parecer AT entregue sem protocolo → *"Confirmar com o advogado se já protocolou."*
- Documento ilegível/insuficiente → *"Solicitar documento legível ao apresentante."*
- Nomeação sem decisão → *"Decidir se aceita a nomeação."*

Isso cumpre o requisito ("todo item mostra o que fazer") sem pedir cadastro. O que fica
**fora** da fatia 1, de propósito: ela **editar** esse texto por item (ex.: escrever uma
observação específica num ciclo específico). Isso exigiria um lugar pra guardar a edição —
ou seja, uma tabela pequena de "ajustes" — e vira uma fatia própria, pequena, plugável
depois sem mexer no que a fatia 1 entrega.

---

## 5. Sobreposição com o Fluxo Principal do Perito Judicial

São coisas diferentes, e a diferença é de **papel**, não de nome:

- **Fluxo Principal** é a régua de progressão do caso (NOMEADO → ... → PÓS-LAUDO → ... →
  RECEBIDO) — quando existir, ele é a **fonte de verdade** de em que etapa cada processo
  está e o que essa etapa exige.
- **Central** é a **superfície de agregação** — "o que fazer hoje", juntando o que quer que
  esteja pendente em qualquer canto do sistema. Hoje ela já agrega de várias fontes (ciclos,
  laudos, documentos) sem que nenhuma dessas fontes "seja" a Central. O Fluxo Principal,
  quando existir, é só **mais uma fonte** — do mesmo jeito.

Por isso a resposta é a opção (a): **a Central lê os eventos/tarefas do Fluxo Principal
quando ele existir** — nunca o inverso, e nunca a mesma tabela.

- **Por que não (b)** ("Fluxo Principal grava na Central"): criaria uma segunda cópia do
  estado de cada etapa (a "real", dentro do Fluxo Principal, e a "espelhada", na Central),
  com risco de as duas divergirem. É a mesma armadilha que o módulo Pós-Laudo evitou de
  propósito — nunca duplicar um dado que já tem dono.
- **Por que não (c)** ("são a mesma coisa"): forçaria o Fluxo Principal (uma máquina de
  estados com ~30 etapas ordenadas) a caber na mesma modelagem de "lista de itens
  pendentes" da Central — que é plana, sem noção de ordem/transição entre etapas. Também
  obrigaria redesenhar o Pós-Laudo pra caber nessa mesma tabela única, sem necessidade —
  o ciclo de pós-laudo não é uma etapa da régua, é seu próprio sub-processo repetível.

**Implicação prática pra fatia 1:** construir o agregador já como uma lista de "fontes"
plugáveis — cada fonte é uma função pequena que devolve itens no mesmo formato (`origem,
título, data ou null, nível, providência, link`) — em vez de uma função monolítica que já
sai sabendo de tudo. Quando o Fluxo Principal existir, ele vira só mais uma função nessa
lista. Não é trabalho extra agora: é a forma natural de escrever "consulta A, depois
consulta B, depois consulta C, junta tudo" — só evitando deixar isso amarrado de um jeito
que doa depois.

---

## 6. Fatiamento sugerido do módulo inteiro

**Correção de leitura (15/09/2026, decisão do Jeferson):** as fatias 2, 3 e 5 **não são fila
opcional** — são escopo da Fase 2. A Central foi pedida pela Dra. Fernanda junto com o
Pós-Laudo, na mesma encomenda; entregar só a fatia 1 (o painel que agrega o que já existe) não
fecha o que foi combinado com ela. Só a fatia 4 é opcional de verdade — depende dela pedir,
puro incremento de conveniência, sem compromisso prévio.

| # | Fatia | Depende de resposta da Dra. Fernanda? |
|---|---|---|
| 1 | **Painel "o que fazer hoje"** — só leitura, zero tabela nova, zero cadastro. Cobre tudo do §1-5 acima. | **FEITA (11/09/2026)** |
| 2 | **Cadastro manual de tarefa/evento avulso** — os campos que ela pediu (urgência, evento×tarefa, status próprio, Próxima Providência agora editável de verdade). Tabela nova aqui, pela primeira vez no módulo. | **FEITA (17/09/2026)** — ver §6.2. |
| 3 | **Tarefas recorrentes do domínio pericial** — ex.: lembretes que se repetem por natureza do trabalho dela, não por processo específico. | **Em andamento (18/09/2026)** — ver §6.2: documentos pendentes FEITA; pagamento em atraso com resposta da Dra. já recebida e desenho de dois mecanismos (judicial × AT) proposto, aguardando aprovação do Jeferson antes da migration. |
| 4 | **Edição da Próxima Providência dos itens automáticos** (fatia 1) — sobrescrever o texto fixo por item específico. Tabela pequena de ajustes. | **Não** — a única fatia realmente opcional do módulo: só entra se ela pedir, sem compromisso prévio. |
| 5 | **Integração com o Fluxo Principal do Perito Judicial** — pluga a régua como mais uma fonte do agregador (§5). | Escopo da Fase 2, não pergunta pra ela. **FEITA (16/09/2026)** — ver abaixo. |

**Ordem de fechamento da Fase 2, decidida pelo Jeferson (15/09/2026):** régua enxuta do
Fluxo Principal → **fatia 5** desta Central (menor, resultado visível imediato) → fatias 2 e
3 (cadastro manual + recorrência). A fatia 4 fica de fora dessa ordem — só entra se e quando
ela pedir.

**15/09/2026 — cuidado do Jeferson antes de codar a fatia 5, corrigindo o que eu tinha
listado:** das 3 datas novas do Fluxo Principal, só 2 são prazo de verdade —
`agendamento_data` e `nomeacao_prazo_manifestacao` "são coisas que vencem". `liberacao_
solicitada_em` **não é** — é registro do que já foi feito (quando ela pediu a liberação), não
algo com vencimento. Colocar como prazo faria o item aparecer "vencido" pra sempre a partir do
dia seguinte ao pedido — puro ruído.

**FEITO nesta fatia (sem migration, só leitura):**
- **Nomeação sem decisão** (categoria já existente) ganhou prazo real: usa
  `nomeacao_prazo_manifestacao` quando existir, em vez de cair sempre em "sem prazo" — a
  categoria não mudou, só passou a ter dado melhor pra ler (exatamente o "cresce sozinho" já
  previsto desde a fatia 1).
- **Agendamento marcado** (categoria nova) — primeira fonte de "evento" de verdade do painel.
  Só aparece enquanto **nenhum laudo** (rascunho ou protocolado) existir pro processo — se o
  laudo já saiu, a perícia aconteceu, e deixar a data do agendamento (já passada) competir
  como "vencida" seria o mesmo tipo de ruído do caso da liberação. Decisão minha, sinalizada
  ao Jeferson, ainda sem veto dele registrado.

**16/09/2026 — decisão do Jeferson: cria o campo.** Motivo dele, registrado verbatim: "o
trilho financeiro já existe no desenho e para em liberação por falta de um único dado. Pedido
de liberação protocolado e sem recebimento confirmado é dinheiro parado, é exatamente o tipo
de pendência que se perde de vista, e honorário depositado judicialmente costuma demorar."

**FEITO (migration `20260916120000`):** `processos.honorarios_recebidos_em` (`date`,
nullable, sem default) — preenchida pela perita quando o dinheiro cai, **nunca** inferida
(não há evento no sistema que prove recebimento). Entra na tela de Liberação do Fluxo
Principal, logo abaixo do "Forma de liberação", só visível quando `liberacao_solicitada_em`
já existe. **Fatia 5 fecha de vez**: processo com `liberacao_solicitada_em` preenchido e
`honorarios_recebidos_em` vazio vira item **sem prazo** — "Liberação sem recebimento
confirmado", providência "Conferir se o valor foi liberado" — que some sozinho assim que ela
preenche a data. A régua enxuta do Fluxo Principal também mudou: a etapa "Liberação" só
mostra "concluída" (sucesso) com recebimento confirmado — protocolar o pedido agora aparece
como estado intermediário (atenção "Solicitada em X — aguardando recebimento"), não como fim
do trilho.

Cada fatia continua no mesmo rito das outras: SQL pra revisão antes de aplicar (quando
houver), `tsc`/`eslint`/`build` limpos, commit dividido por camada, deploy só depois de
confirmado.

## 6.2 Fatias 2 e 3 — desenho final (16-17/09/2026)

**Fatia 2 — cadastro manual de tarefa/evento avulso.** Uma tabela só (`central_tarefas`),
`tipo` ('tarefa' | 'evento') discriminando — mesmo padrão de `laudos_gerados.tipo`. A
separação evento×tarefa que ela confirmou duas vezes vira trava estrutural: `hora` só existe
(e é exigida) quando `tipo='evento'` — CHECK garante isso —, e a tela de cadastro pergunta
"Evento ou Tarefa?" antes de abrir o formulário certo, nunca um campo de hora pendurado numa
tarefa. `processo_id` nullable (tarefa avulsa pode não ter processo). Vocabulário de
`status` é `text` livre sem CHECK — mesmo padrão de Vara/Comarca (`ComboboxCatalogo` +
`mesclarSugestoes`): semente no código (`Aguardando documentos`/`Em estudo`/`Em execução`/
`Aguardando agendamento`), cresce sozinho com o que ela digitar. `nivel_urgencia_manual`
(nullable) sempre vence o cálculo automático quando preenchido. `status_alterado_em`
(gravado pela aplicação a cada mudança de status) e `concluida_em` (fato explícito, separado
de `status` — o sistema não sabe qual valor de status "significa terminado") completam a
tabela.

**FEITO (17/09/2026):** migration `20260917120000_central_prazos_tarefas.sql` aplicada. Código:
`/tarefas/nova` e `/tarefas/[id]` (Server Components), `TarefaForm` (client, mesmo padrão de
`action={handleSubmit}` + `useTransition` do `processo-form.tsx`), `TarefaAcoes` (concluir/
reabrir + excluir, sem confirmação por digitação — tarefa avulsa não carrega documento nem
histórico, diferente de excluir processo), `actions.ts` (`criarTarefaCentral`,
`atualizarTarefaCentral`, `marcarTarefaConcluida`, `excluirTarefaCentral`),
`catalogos.ts` (`STATUS_TAREFA_SEED`, reaproveitando `mesclarSugestoes` já existente em
`features/processos/catalogos.ts`, sem duplicar). Fonte 8 do agregador (`agregador.ts`) lê
`central_tarefas` com `concluida_em is null`; é a única fonte que não filtra por processo
ativo — decisão registrada inline no código: "a tarefa é criação explícita dela, não
inferência do sistema sobre um processo específico" (ainda não confirmada pelo Jeferson).
Entrada "+ Nova tarefa/evento" adicionada em `/hoje`. `tsc`/`eslint`/`build` limpos.

**Fatia 3 — correção da leitura da recorrência (16/09/2026).** Eu tinha modelado a
recorrência como regra sobre o status de uma tarefa CADASTRADA À MÃO — o Jeferson corrigiu:
os dois exemplos dela ("lembrar de contatar o advogado quando o caso está aguardando
documentos", "lembrar o financeiro após X dias de atraso") são sobre **estado do caso**, não
sobre tarefa manual. Fazer do jeito que eu tinha desenhado inverteria o propósito da Central
(só funcionaria se ela alimentasse o sistema à mão primeiro).

**Investigação (17/09/2026) — o que o banco sustenta hoje pra cada um dos dois estados:**
- **Documentos pendentes**: nada. `situacao_processo` é pipeline fechado de etapas
  procedurais, sem valor pra isso (e conceitualmente "aguardando documentos" convive com
  qualquer etapa, não é uma etapa a mais). `documentos.ilegivel_insuficiente` é sobre
  documento que já existe e está ruim — conceito diferente de documento que ainda não chegou.
- **Atraso de pagamento**: `situacao_financeira` tem o valor qualitativo ("Aguardando
  Pagamento de Honorários") mas é texto livre sem nenhuma data anexada, e não existe
  timestamp de quando entrou nesse valor (só `updated_at` genérico da linha, contaminado por
  qualquer edição do processo). **Achado útil além da Central**: hoje o sistema sabe que está
  aguardando pagamento e não sabe desde quando.

**Decisão do Jeferson: caminho 1 (criar o estado), dividido em dois, por natureza diferente:**
- **Documentos pendentes — decidida agora.** Estado independente do pipeline (convive com
  qualquer etapa de `situacao_processo`): `processos.documentos_solicitados_em` (date,
  nullable — preenchida quando ela marca que solicitou, limpa quando os documentos chegam) +
  um campo de texto curto do que foi solicitado (sem isso o lembrete não diz o que cobrar).

  **FEITO (18/09/2026):** migration `20260918120000_processos_documentos_solicitados.sql`.
  `salvarDocumentosSolicitados` (`features/processos/actions.ts`) grava os dois campos juntos
  ao marcar como solicitado e limpa os dois juntos ao marcar como recebido (nunca deixa
  descrição órfã). `DocumentosPendentesPanel` na tela do processo (`/processos/[id]`, logo
  abaixo de "Situação e financeiro") — mesmo padrão de card com estado de "salvar explícito"
  já usado em `LiberacaoPanel`. 8ª fonte do agregador: `sem_prazo` (sem vencimento real, mesmo
  raciocínio de "liberação sem recebimento" — pendência que não vence, só persiste), some
  sozinho quando ela marca como recebido.
- **Atraso de pagamento — resposta da Dra. Fernanda voltou (18/09/2026).** São dois mundos
  diferentes, confirmando por que a pergunta não tinha resposta técnica sozinha:
  - **Perícia judicial**: não existe data previsível — quem determina como, quando e quanto
    se paga é o juiz. Existe um padrão que ela às vezes consegue (metade ao iniciar os
    trabalhos, metade na entrega do laudo), mas varia caso a caso conforme a determinação.
  - **Assistência técnica**: existe contrato fechado antes de começar, com datas definidas. A
    maioria paga por cartão ou pix (sem necessidade de cobrança); o que ela precisa é ser
    lembrada de cobrar quem paga por boleto ou transferência.

  **Instrução do Jeferson antes de codar**: "são dois mecanismos diferentes, não um só... não
  quero um campo genérico de vencimento que force os dois casos no mesmo molde." Desenho
  abaixo, ainda SEM migration — apresentado antes de codar, como sempre.

### Desenho proposto — dois mecanismos, não um (aguardando aprovação)

**Judicial — marco combinado, não vencimento calculado.** Não dá pra derivar uma data daqui
— não existe fórmula (nem sempre é 50/50, e mesmo quando é, a data de cada metade depende da
determinação daquele processo específico). O que existe de real é ELA sabendo, processo a
processo, se combinou um marco com data (ex.: "metade ao iniciar, combinado pra 10/10").
Proposta: `processos.honorarios_proximo_marco_em` (date, nullable) +
`honorarios_proximo_marco_descricao` (text, nullable) — mesmo par documentos_solicitados_em/
descricao já aprovado (fatia 3, documentos pendentes): preenchido só quando ela sabe de um
marco combinado para AQUELE caso, limpo quando resolvido (ela pode preencher de novo se
houver um segundo marco depois). Nunca preenchido/calculado sozinho pelo sistema — não existe
regra de "metade em X dias" nem nada parecido. Como é uma data que ela mesma confirmou (não
uma inferência), entra na Central de Prazos como prazo REAL (`nivelPorPrazo` de verdade,
cor/urgência normal) — diferente de "documentos pendentes"/"liberação sem recebimento", que
nunca têm data real e por isso ficam em `sem_prazo`.

**Assistência técnica — vencimento de contrato + forma de pagamento.** Aqui SIM existe data
definida e forma de pagamento conhecida de antemão. Proposta: `processos.
honorarios_forma_pagamento` (text, catálogo fechado: cartão / pix / boleto / transferência /
outro) + `honorarios_vencimento` (date, nullable) — preenchidos uma vez, no cadastro/edição do
processo AT, como qualquer outro dado de contrato. **Não preciso de um campo "pago" novo**: a
AT já tem `situacao_financeira` fechada (`Pago` / `Não pago` / `Em parcelamento`, `SITUACOES_
FINANCEIRAS_AT`) — reaproveito esse valor como sinal de resolvido, em vez de duplicar estado.

**Fonte da Central de Prazos (a mesma, com dois ramos, não um campo genérico):** aparece
quando `honorarios_vencimento` está preenchido, `honorarios_forma_pagamento` é boleto ou
transferência (cartão/pix nunca geram lembrete — não precisam de cobrança), e
`situacao_financeira !== 'Pago'`. Prazo real, mesma régua de urgência.

**Por que isso não é "um campo genérico forçando os dois casos":** os dois pares de campos
são fisicamente diferentes (um é marco manual e eventual, o outro é dado de contrato fixo),
preenchidos em momentos diferentes da tela (judicial: durante o trâmite, quando ela souber;
AT: no cadastro, porque já se sabe de antemão), e um deles nem sempre existe (judicial pode
nunca ter marco combinado; isso é normal, não uma lacuna). A única coisa que os dois
compartilham é entrar na mesma Central de Prazos no final — que é justamente o ponto da
Central: agregar fontes heterogêneas num painel só, sem forçar homogeneidade na origem.

**Ainda não codado** — aguardando o Jeferson aprovar este desenho antes da migration.

## 6.1 Ordenação — por que item sem data nunca compete com o que está vencendo

Requisito do Jeferson: se a lista abrir com sete itens sem prazo e um vencendo hoje
enterrado no meio, a tela falhou no que existe pra fazer. Resolvido estruturalmente, não
como ajuste visual:

- Cada nível tem um **rank fixo**: Crítica=1, Urgente=2, Alta=3, Atenção=4, Programada=5,
  Sem prazo=6.
- A lista inteira ordena por rank primeiro, sempre — não existe cenário em que um item
  Sem prazo (rank 6) apareça antes de um item Crítico/Urgente (rank 1/2), não importa
  quantos itens sem data existam.
- Dentro do mesmo rank, desempate por data (mais próxima primeiro) quando existir; sem
  data, desempate por há quanto tempo o item está pendente — o mais antigo sobe primeiro
  dentro do próprio grupo "Sem prazo", como um sinal honesto de que aquilo está parado há
  mais tempo (nunca uma urgência inventada, só uma ordem dentro do grupo neutro).

## 7. Risco de mudar a rota inicial

Conferido antes de mexer: são **3 lugares** que hoje mandam pra `/processos` depois do
login, nenhum deles com lógica de autenticação — só o destino final:

1. `src/app/page.tsx` — a rota `/` redireciona pra `/processos` (usada quando alguém abre
   o domínio direto).
2. `src/app/auth/callback/route.ts` — destino padrão depois de validar o link mágico do
   e-mail (o caminho que ela usa toda vez que entra pelo e-mail).
3. `src/lib/supabase/middleware.ts` — quando alguém já logado tenta abrir `/login`.

**Risco avaliado como baixo**: os 3 são troca de uma string (`/processos` → `/hoje`), sem
tocar em `getUser()`/`getSession()`/cookies/proteção de rota. Vou trocar os 3. O menu do
topo ganha "Hoje" e "Processos" como links separados (hoje só existe o logo apontando pra
`/processos`) — sem isso, a lista de processos deixaria de estar "a um clique" depois da
mudança.

## Uma decisão de estilo, não de dado, que vale registrar

O sistema de cores aprovado (`globals.css`) tem 3 famílias de estado — Musgo (sucesso),
Âmbar (atenção), Vinho (erro) — pensadas pra 3 níveis, não para os 4 que a régua de cor da
Central precisa (verde/amarelo/laranja/vermelho). Não criei uma família nova (ex.: um
token "laranja") sem sua aprovação — é mudança no sistema de cores publicado, não só nesta
fatia. Resolvi usando duas intensidades de Âmbar pra separar "Alta" (âmbar claro, o mesmo
tom que o resto do sistema já usa pra "atenção" genérica) de "Urgente" (âmbar forte/cheio,
mais próximo do vermelho). Crítica usa Vinho, Atenção usa Musgo, Programada/Sem prazo usam
Névoa neutro. Se quiser as 4 cores literalmente distintas (um laranja de verdade), é uma
conversa de design system à parte — troco depois sem reescrever a lógica de níveis.
