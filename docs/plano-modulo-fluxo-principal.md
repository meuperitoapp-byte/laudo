# Plano técnico — Fluxo Principal do Perito Judicial

Peça grande que falta da Fase 2. Também é o que destrava a fatia 5 da
[Central de Prazos e Tarefas](plano-modulo-central-prazos.md) (a régua vira mais uma fonte
do painel "o que fazer hoje", sem refazer nada de lá).

Material lido: `Fluxo_Principal_Perito_Judicial_PERICONS (1).pdf` (a régua de 30 passos, 10
macrofases, os 2 trilhos), `GESTAO_PERICIA_JUDICIAL_ESPECIFICACAO_FUNCIONAL_v2.pdf` (a
especificação funcional completa — Central Judicial, papéis, status, encaminhamento),
`MODELO_MANIFESTACAO_DE_ACEITE_DO_ENCARGO_PERICIAL.pdf`,
`MODELO_COMUNICACAO_DE_AGENDAMENTO_DA_PERICIA.pdf`,
`MODELO_INFORMACAO_DE_DADOS_PARA_DEPOSITO_DOS_HONORARIOS.pdf`,
`MANIFESTACAO_CONSOLIDADA.pdf`, `MODULO_NAO_COMPARECIMENTO_PERICIANDO_PERICIA_JUDICIAL.pdf`.

## ⚠️ Antes de tudo — o mesmo alerta que valeu pra Viabilidade, com um recorte diferente

Estes documentos vieram do mesmo lote de specs da PERICONS que trouxe a Análise de
Viabilidade — e a ressalva que você mesmo levantou lá ("propostas de quem redigiu, não
decisões fechadas com a Dra. Fernanda") se aplica aqui também, mas **não do mesmo jeito em
todas as partes do material**. Dividi o que li em dois grupos de risco bem diferentes:

**Baixo risco — são documentos concretos, prontos pra virar peça, mesmo tratamento que os
modelos do Pós-Laudo receberam (não precisaram de validação clínica prévia, só de revisão
de redação):** os 4 "modelos de petição" (Aceite, Agendamento, Dados para Depósito,
Manifestação Consolidada) e o módulo de Não Comparecimento. Texto fechado, campos
concretos, travas explícitas. Dá pra modelar e codar direto, na mesma régua de revisão que
o Pós-Laudo usou (SQL pra você olhar antes de aplicar).

**Alto risco — isto é modelagem organizacional, não modelagem de documento, e colide com um
fato que já está fixado no projeto:** a especificação funcional inteira do Fluxo Principal
descreve **3 papéis de sistema com login e trabalho distintos** — Dra. Fernanda (técnico),
**Assessor Perícia Judicial** (operacional) e **Financeiro** — com tarefas atribuídas entre
eles, um botão "ENCAMINHAR" de um pro outro, e quatro painéis de central de trabalho
diferentes (um por papel). O `CLAUDE.md` deste projeto é explícito e nunca foi revisto:
**"Apenas 2 perfis de usuário... sem outros peritos ou assistentes técnicos usando o
sistema"** — perita e secretária, só. Construir "Assessor" e "Financeiro" como papéis de
verdade (com tarefa atribuída, encaminhamento, agenda própria) é uma decisão de produto bem
maior que qualquer coisa deste plano, e não é pergunta pra Dra. Fernanda responder — é
pergunta sobre como o escritório dela realmente está montado hoje, e é sua.

**Por isso este plano cobre as 5 perguntas que você fez tratando "Responsável" como rótulo
livre (texto, não um sistema de usuário/permissão) e deixando de fora, de propósito, a
Central Judicial com 4 painéis por papel e o botão de encaminhamento entre setores.** Isso
não invalida nada do resto — os documentos, a régua de status e os 2 trilhos continuam
valendo exatamente como estão pensados. Só o "para quem" de cada tarefa fica simples
(um campo de texto, se quiser) até essa decisão maior ser tomada.

---

## 1. Schema — o que já existe, o que é novo

### 1.1 A régua e os dois trilhos × `processos.situacao_processo`

**Convivem — não substitui.** `situacao_processo` continua sendo o rótulo único que a Dra.
Fernanda já lê e escolhe hoje (é texto livre com catálogo fechado, definido em
`src/features/processos/catalogos.ts`). Ele não muda de natureza.

O que muda: hoje esse rótulo é **a única coisa que existe** — não há data de depósito, não
há impedimento registrado, não há dado estruturado nenhum por trás dele. A régua de 30
passos do PDF, na prática, pede **dado estruturado por trás de cada etapa** (valor
depositado, data do aceite, se há impedimento) — isso sim é schema novo. `situacao_processo`
vira o resumo em uma palavra do que esse dado estruturado diz, não o dono do dado.

Aliás — o catálogo atual de `situacao_processo` já é, sem ter sido chamado assim, uma
aproximação em miniatura desta régua: "Aceite", "Proposta de honorários", "Agendamento de
perícia", "Elaboração de laudo", "Laudo protocolado" já existem lá. Faltam degraus que a
régua tem e o catálogo não cobre — o mais notável: não existe hoje um estado inicial
correspondente a "Nomeado, aguardando análise de aceite" (um processo, ao ser cadastrado,
já nasce sem essa situação marcada) nem um estado de depósito na régua TÉCNICA (o depósito
hoje só aparece do lado financeiro, ver 1.2).

**Recomendação de mecanismo**, reaproveitando algo que você já aprovou duas vezes nesta
sessão: quando o dado estruturado novo mudar (aceite gerado, depósito confirmado,
agendamento protocolado), oferecer — nunca aplicar sozinho — atualizar
`situacao_processo` pro valor correspondente. É o mesmo componente que a Central de Prazos
acabou de ganhar (`SituacaoProcessoSugestao`), reaproveitado aqui, não reinventado.

### 1.2 Os dois trilhos × o que `processos` já guarda

**Trilho técnico** (Nomeação → Perícia → Laudo → Pós-Laudo → Encerramento Técnico): já tem
âncoras reais no schema — `laudos_gerados` (laudo protocolado, todo o Pós-Laudo já
construído). O que falta é só a PARTE INICIAL do trilho (nomeação → aceite → agendamento →
ato pericial), que é justamente o que este plano cobre.

**Trilho financeiro** (Honorários → Depósito → Liberação → Recebimento): aqui está a lacuna
maior. `processos` hoje tem `honorario_apresentado` e `honorario_arbitrado` (dois números) e
`situacao_financeira` (texto livre com catálogo) — mas **nenhum campo de depósito, alvará ou
recebimento**. E o catálogo atual de `situacao_financeira`
(`SITUACOES_FINANCEIRAS_SEED`, em `catalogos.ts`) mistura duas coisas diferentes: valores
que descrevem o trilho financeiro do JUDICIAL de verdade ("Aguardando Pagamento de
Honorários", "Aguardando depósito processual") com valores que na verdade são da
Assistência Técnica ("Aguardando contratação fase 1/2 com/sem quesitos" — isso é
contratação de serviço AT, não depósito judicial). **Isso é schema novo, não ajuste**: o
trilho financeiro do judicial precisa de colunas de verdade — valor fixado, valor
depositado, data do depósito, situação do depósito (não realizado/parcial/integral/
dispensado/justiça gratuita — vocabulário que já está pronto no modelo de "Dados para
Depósito"), e depois valor liberado/recebido quando chegar a essa etapa. Um texto livre não
segura "quanto falta depositar" nem alimenta a trava da seção 4.

### 1.3 Resumo — o que é novo de fato

| Já existe, reaproveita | Novo |
|---|---|
| `laudos_gerados` + o motor de compilar/renderizar (ver §2) | Colunas estruturadas de depósito (valor fixado, valor depositado, data, situação) — provavelmente em `processos` ou tabela 1:1, mesmo critério do Pós-Laudo (tabela à parte quando são muitos campos específicos de um só assunto) |
| `processos.aceitou_nomeacao` (sim/não/destituída) | Granularidade que falta pra travar a geração do aceite: impedimento/suspeição (sim/não), competência técnica (sim/não), necessidade de especialista (sim/não) — hoje só existe o resultado final, não os 3 critérios que levam a ele |
| `montarCabecalhoFormal` (endereçamento ao Juízo) | Nada — os 5 documentos deste plano são todos judiciais, cabeçalho já pronto |
| `situacao_processo` (catálogo) | Talvez 1-2 valores novos no catálogo (ex.: um estado "Nomeado" inicial) — ajuste de lista, não de arquitetura |
| `situacao_financeira` (catálogo) | Reconsiderar: o trilho financeiro judicial provavelmente merece campos estruturados próprios, deixando o catálogo de texto como resumo (mesma relação de 1.1), não como fonte |
| Pipeline de upload de `documentos` | Nada novo — "Anexar processo integral" (spec §9) usa o mesmo pipeline; só precisa de mais um `tipo`/classificação na lista já existente |

---

## 2. As petições da fase inicial × o motor de geração existente

Mesmo padrão do Pós-Laudo, sem exceção: cada documento vira um `tipo` novo em
`laudos_gerados`, com um `compilar-*.ts` que monta um `ModeloLaudo` de verdade e reaproveita
`renderizarPdf`/`renderizarDocx` — zero motor de PDF/Word novo.

- **Aceite do Encargo Pericial** → `tipo = 'aceite_pericial'`.
- **Comunicação de Agendamento da Perícia** → `tipo = 'agendamento_pericia'`.
- **Informação de Dados para Depósito dos Honorários** → `tipo = 'dados_deposito'`.
- **Comunicação de Não Comparecimento do Periciando** → `tipo = 'nao_comparecimento'`
  (documento à parte — não é um dos 4 módulos da Consolidada, é ligado à etapa Ato
  Pericial, quando o periciando falta).
- **Manifestação Consolidada** → `tipo = 'manifestacao_inicial'` — ver §3, é o caso especial.

A "Proposta de Honorários" em si (item 4 da régua) não tem modelo de petição próprio nos
PDFs — ela aparece sempre embutida no bloco de honorários da Consolidada (§ III do modelo).
Não crio um `tipo` separado pra ela nesta fatia; se um dia precisar existir avulsa, é um
ajuste pequeno (mais um módulo na lista do §3), não uma peça nova de arquitetura.

---

## 3. Manifestação Consolidada — como monta só os blocos aplicáveis

Esta é estruturalmente igual ao que a fatia 10 do Pós-Laudo já resolveu duas vezes: o
parecer AT (um compilador, parametrizado, seções condicionais) e os Quesitos Suplementares
saindo tanto embutidos quanto isolados. Aqui a diferença é que, em vez de **escolher uma
entre várias modalidades**, a Dra. Fernanda **marca quais dos 4 módulos entram** — mais
parecido com `providencia_recomendada` (um `text[]` validado na aplicação) do que com
`at_modalidade` (um valor só).

**Desenho**: cada módulo (Aceite / Honorários / Depósito / Agendamento) vira uma função
**montadora de seção**, não um compilador à parte — `montarSecaoAceite`,
`montarSecaoHonorarios`, `montarSecaoDeposito`, `montarSecaoAgendamento` — cada uma
devolvendo `SecaoCompilada | null` a partir do estado real do processo, exatamente como
`montarSecaoQuesitos` já faz hoje pros Esclarecimentos e a Complementação. Essas MESMAS
funções são reaproveitadas dos dois lados:

- Os **4 documentos standalone** (§2) chamam a função do seu próprio módulo, sozinha.
- A **Manifestação Consolidada** chama as funções dos módulos marcados, na ordem do
  modelo, e pula as que não foram marcadas — sem duplicar texto, sem duplicar regra.

Isso já responde ao "sem marcar como concluídas as etapas que não entraram" (regra final
#2 do PDF): a atualização de estado, depois do protocolo, roda **por módulo selecionado**,
nunca em bloco. Concretamente, o protocolar de uma Consolidada com só "Aceite" e
"Agendamento" marcados:

- Atualiza `aceitou_nomeacao` (e os campos de impedimento/competência) — porque "Aceite"
  estava marcado.
- Atualiza os campos de agendamento — porque "Agendamento" estava marcado.
- **Não toca em nada de honorários nem de depósito** — porque esses módulos não entraram
  nesta versão. Se depois ela gerar uma segunda manifestação só com "Honorários", essa sim
  atualiza os campos de honorários, na hora certa.

O snapshot de cada versão grava `modulos_selecionados: string[]` — satisfaz a regra final
#3 do PDF ("manter histórico dos módulos que compuseram cada versão") de graça, porque é
exatamente o mesmo mecanismo do `SnapshotPosLaudo` já usado em todo o Pós-Laudo.

---

## 4. As duas travas

### 4.1 Aceite bloqueado por impedimento/falta de competência

Mesmo padrão da trava de Retificação do Pós-Laudo — **bloqueio real, com reroteamento
explicado, tom de orientação**. `compilarAceitePericial` (e o bloco de Aceite dentro da
Consolidada) checa: se `impedimento = sim` OU `competencia_tecnica = nao`, o documento
**não é gerado** — a tela mostra uma pendência explicando que, nesse caso, o caminho é
declarar impossibilidade/declínio do encargo, não apresentar aceite. **Não crio o documento
de declínio nesta fatia** (não tem modelo nos PDFs lidos, e não é uma situação do dia a dia
dela) — a pendência só explica a trava e para aí; o documento de declínio fica registrado
como possível fatia futura, se e quando ela precisar dele de verdade.

### 4.2 Agendamento sem depósito integral

**Diferente da trava anterior — é um alerta reversível, não um bloqueio.** O texto do
próprio modelo diz isso: "*o sistema deve alertar o usuário antes de permitir a emissão do
agendamento, salvo autorização expressa para prosseguir*." Ou seja: mostra o aviso, mas ela
pode confirmar e seguir mesmo assim — o sistema não decide por ela que o agendamento não
pode sair. Implemento como uma função pura que devolve aviso (não erro), e a tela pede uma
confirmação explícita antes de gerar quando o aviso existe — um clique a mais, nunca uma
porta fechada.

**Ponto que preciso que você confirme antes de fatiar isto de verdade**: o que faz um
processo "depender de depósito prévio" pra essa trava valer? Nem todo processo exige — hoje
não existe no schema um jeito de saber. Duas opções: (a) um campo novo, ela marca por
processo se o despacho exige depósito prévio; ou (b) o alerta só aparece quando já existe
algum registro de depósito pendente/parcial pra aquele processo (ou seja, o alerta nasce
sozinho a partir do dado, sem pedir mais um campo pra ela preencher). Prefiro (b) — é menos
cadastro manual, no mesmo espírito da Central de Prazos — mas é uma escolha sua, não da
Dra. Fernanda.

---

## 5. Fatiamento testável

O recorte deste plano é bem menor que o "Fluxo Principal completo" da spec (que inclui os 3
papéis, a Central Judicial com 4 painéis e as 30 etapas inteiras) — cobre só a fase inicial
(nomeação → aceite → honorários/depósito → agendamento) mais o Não Comparecimento, que é a
parte com material pronto e de baixo risco (ver alerta no topo). O resto fica descrito no
§6 como continuação possível, não como parte deste fatiamento.

| # | Fatia | Depende de quê |
|---|---|---|
| 0 | Schema: colunas de impedimento/competência (aceite), colunas estruturadas de depósito, ajuste pontual no catálogo de `situacao_processo`. SQL pra sua revisão antes de aplicar, mesmo rito de sempre. | Sua confirmação do ponto aberto do §4.2 (opção a ou b) |
| 1 | `compilar-aceite-pericial.ts` + geração + trava do §4.1 — documento standalone, testável sozinho | Não |
| 2 | Estrutura de depósito (campos + `montarSecaoDeposito`) + `compilar-dados-deposito.ts` standalone | Não |
| 3 | `compilar-agendamento-pericia.ts` standalone + trava do §4.2 | Sua confirmação do §4.2 |
| 4 | `montarSecaoHonorarios` + Manifestação Consolidada (monta os 4 módulos, reaproveitando as seções das fatias 1-3) | Não |
| 5 | Não Comparecimento do Periciando — documento + o pequeno subfluxo de status (não marca a perícia como realizada, mantém a data original na linha do tempo) | Não |
| 6 | *(fora deste fatiamento, decisão maior)* O resto da régua de 30 passos, os papéis Assessor/Financeiro, a Central Judicial com 4 painéis, o botão de encaminhamento entre setores | **Sim — é decisão sua, não da Dra. Fernanda**, sobre como o escritório está de fato organizado hoje (ver alerta no topo) |
| 7 | *(quando a fatia 6 existir)* Plugar a régua como mais uma fonte da Central de Prazos (fatia 5 daquele módulo) | Depende só da fatia 6 acima existir |

Nenhuma das fatias 0-5 depende de resposta da Dra. Fernanda no sentido em que Viabilidade
dependia (hipótese clínica) — os documentos e as travas já vêm fechados no material. As
duas confirmações que preciso são suas, de escopo/comportamento, não dela.

---

## Ponto em aberto registrado — acesso aos dados bancários (11/09/2026)

Os dados bancários da perita (migration `20260911120000`, tabela `configuracoes`) ficam
sob a mesma policy `authenticated_full_access` de todo o resto do sistema — ou seja, **a
secretária também tem acesso a eles**, pelo mesmo login que já usa pra tudo. É a política
padrão do projeto inteiro (2 perfis, ambos com acesso completo), não uma falha desta
fatia — mas dado bancário é mais sensível que rodapé de documento, então o Jeferson achou
que valia registrar como pergunta em aberto em vez de assumir que "sempre foi assim, então
tudo bem aqui também".

Jeferson vai confirmar com a Dra. Fernanda se ela quer separar esse acesso (só ela vendo os
dados bancários, não a secretária) antes de qualquer mudança. **Se a resposta for sim**,
restringir exigiria uma policy de RLS específica para essas colunas — o Postgres não
restringe RLS por coluna diretamente (RLS é por linha), então a forma de fazer isso seria
uma de duas: (a) mover os dados bancários pra uma tabela própria, com sua própria policy
mais restrita (baseada em qual usuário está logado, não simplesmente "autenticado"); ou
(b) uma `VIEW` sem essas colunas pra quem não deveria vê-las, com a tabela de baixo
continuando full-access só pra quem precisa. Nenhuma das duas é feita agora — fica
registrada aqui pra quando a resposta da Dra. Fernanda voltar.
