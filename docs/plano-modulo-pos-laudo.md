# Plano técnico — Módulo Pós-Laudo

Cobre Perícia Judicial **e** Assistência Técnica desde o início (não faseado). Base: os
13 PDFs de `Complementos adicionais do modulos modelos e fluxo/` +
`ESPECIFICACAO_ANALISE_LAUDO_E_PARECER_CONCORDANCIA_IMPUGNACAO_PERICONS` (colado na
conversa, tratado como parte deste escopo — é o Pós-Laudo do lado AT) +
`modulo-pos-laudo.md` (memória, com as respostas da Dra. Fernanda).

---

## ⚠️ PENDÊNCIA CRÍTICA EM ABERTO — teste do anti-join (fatia 3)

**É a única pendência do módulo cujo erro seria SILENCIOSO.** Se o anti-join do
`compilarLaudo` (`src/features/geracao-laudo/compilar.ts`, ver §1.7) estiver errado, o
laudo sai citando na tabela de documentos analisados — e contando em
`{{total_documentos}}` — um documento superveniente, ou seja, **um documento que não
existia à época da perícia**. Ninguém percebe isso olhando o PDF: parece um laudo
normal. Num laudo médico-legal é um vício grave passando despercebido.

Código escrito e no ar (commit f6cec1c), `tsc`/`eslint`/`build` limpos, mas **NÃO
testado em execução** (sem app/DB acessível pra quem escreveu). A Dra. Fernanda vai
testar o módulo na prática e reportar ao Jeferson.

**Roteiro de teste (5 passos):**
1. Num processo judicial com laudo (ou criar um). Anotar quantos documentos processuais
   ele tem; gerar o laudo; conferir a contagem e a tabela de documentos no PDF.
2. Marcar o laudo como protocolado → abrir um ciclo de pós-laudo → seção "Documentos
   supervenientes" → enviar um arquivo qualquer (papel "Superveniente").
3. Voltar em "Laudo final" → "Gerar novo laudo" (nova versão).
4. Abrir o PDF novo: o documento superveniente **não pode** estar na tabela de
   documentos analisados, e a contagem de documentos tem que ser **a mesma** do passo 1
   (não pode ter aumentado).
5. Conferir também na aba "Documentos" do processo: o superveniente aparece lá com o
   selo, mas na tabela do laudo não.

Se a contagem subir ou o documento aparecer na tabela do laudo → bug no anti-join,
corrigir antes de considerar o módulo fechado.

---

## 0. O que foi lido e o que está dentro/fora do escopo

**Dentro (base direta do módulo):**
- `MODELO_ESCLARECIMENTOS_AO_LAUDO_MEDICO_PERICIAL.pdf` — saída 1 (judicial). Seções
  I–VIII, com a matriz "Análise dos Pontos Questionados" (IV) e "Análise da Repercussão
  sobre o Laudo Original" (VI) obrigatória.
- `MODELO_COMPLEMENTACAO_AO_LAUDO_MEDICO_PERICIAL.pdf` — saída 3 (judicial). Documento
  **separado que só remete ao laudo**, não reabre seções. Seção IX "Repercussão sobre o
  laudo original" + X "Conclusão complementar" com trava de "Nova Conclusão Vigente".
- `MODELO_RETIFICACAO_DE_ERRO_MATERIAL.pdf` — saída 2 (judicial). Tabela "onde se lê /
  leia-se" + seção IV "Análise da Repercussão" = **a trava** (NÃO/SIM → se SIM, não
  finaliza como Retificação, vai pra Complementação).
- `ESPECIFICACAO_ANALISE_LAUDO_E_PARECER_CONCORDANCIA_IMPUGNACAO_PERICONS` — o módulo
  equivalente do lado **Assistência Técnica**: recebe o laudo do perito judicial, matriz
  de problemas do laudo, classificação global (FAVORÁVEL…DESFAVORÁVEL), decisão de
  providência (Concordância / Impugnação parcial-integral / Parecer divergente / etc.),
  quesitos de esclarecimento/suplementares gerados pra AT.
- `Fluxo_Principal_Perito_Judicial_PERICONS (1).pdf` — passos 21–25 e macrofase 8
  ("Pós-laudo: impugnação, esclarecimentos e complementação"), régua NOMEADO → … →
  LAUDO → **PÓS-LAUDO** → LIBERAÇÃO → RECEBIDO, e a regra dos dois trilhos (técnico ×
  financeiro) — o ciclo pós-laudo vive no trilho técnico.
- `GESTAO_PERICIA_JUDICIAL_ESPECIFICACAO_FUNCIONAL_v2.pdf` — contexto de papéis
  (Dra. Fernanda = técnico, Assessor = operacional, Financeiro; **Atendimento não entra
  no judicial**), etapa 10 "Pós-Laudo", "status próprio por serviço/tarefa".
- `Gestão Assistência Técnica.pdf` — seções 12–15 (Análise do Laudo Judicial → Decisão
  Pós-Laudo → Manifestação/Impugnação → Quesitos Suplementares/Esclarecimentos), e a
  régua AT com etapas ativáveis por contratação; aqui **Atendimento e Patrícia
  participam**.

**Fora deste módulo (mapeado, não implementar agora):**
- `integração MEU PERITO.pdf`, `MANIFESTACAO_CONSOLIDADA.pdf`,
  `MODELO_MANIFESTACAO_DE_ACEITE_DO_ENCARGO_PERICIAL.pdf`,
  `MODELO_COMUNICACAO_DE_AGENDAMENTO_DA_PERICIA.pdf`,
  `MODELO_INFORMACAO_DE_DADOS_PARA_DEPOSITO_DOS_HONORARIOS.pdf` — expedientes
  pré-perícia (aceite / honorários / depósito / agendamento) e portal externo. Outra
  frente.
- `MODULO_NAO_COMPARECIMENTO_PERICIANDO_PERICIA_JUDICIAL.pdf` — ocorrência da etapa Ato
  Pericial. Outra frente.
- Importação automática de Viabilidade/Estratégia/Contestação/Quesitos para dentro da
  matriz (é a arquitetura PERICONS maior — ver `pericons-arquitetura-caso.md`). O módulo
  nasce com **entrada manual / base mínima**, mas com os pontos da matriz modelados de
  um jeito que esses módulos possam alimentá-los depois sem migration.

**Respostas da Dra. Fernanda já fixadas (memória):** 3 saídas entregues juntas, não
faseado · Complementação = documento separado que não reabre seções · Retificação =
tabela onde-se-lê/leia-se + aviso se afeta conclusão · Triagem = uma classificação por
ponto, dispara ação automática · Quesitos suplementares ficam **só** no ciclo de
pós-laudo (não entram na aba Quesitos do laudo) · escopo Judicial + AT.

---

## 1. Modelo de dados

### 1.1 O que se reaproveita do schema atual (sem alterar)

| Tabela | Uso no Pós-Laudo |
|---|---|
| `processos` | É o "CASO". Todo ciclo de pós-laudo pendura em `processo_id`. Nenhuma coluna nova obrigatória (ver 1.4 sobre o ponteiro opcional). |
| `processo_partes` | Cabeçalho dos documentos gerados (Autor/Réu) — já consumido por `cabecalho.ts`. |
| `documentos` + bucket `documentos-processos` | Armazenamento físico dos arquivos supervenientes e do arquivo da intimação. Ver 1.3 — a metadata de pós-laudo fica em tabela satélite, não em colunas novas aqui. |
| `laudos_gerados` | **Estendida** (ver 1.3) para carregar também Esclarecimentos/Retificação/Complementação como versões V2, V3… do mesmo processo. |
| `secoes` / `respostas_secao` da seção de Conclusão do laudo | Fonte do texto da **conclusão vigente inicial** (V1), copiado para `pos_laudo_conclusoes_vigentes` no momento em que o primeiro ciclo é aberto (ou na geração do laudo V1). |
| `src/features/geracao-laudo` (`cabecalho.ts`, `compilar.ts`, `renderizar-docx.ts`, `renderizar-pdf.ts`, `ModeloLaudo`) | Reaproveitados pelos renderers. O Pós-Laudo cria um `ModeloPosLaudo` análogo ao `ModeloLaudo` e passa pelos **mesmos** dois renderizadores (docx + pdfmake) e pelos **mesmos** `montarCabecalhoFormal` / `montarCabecalhoAssistenciaTecnica`. |
| `quesitos` | **NÃO** é reutilizada para quesitos suplementares (decisão da Dra.: ficam só no ciclo). Continua sendo só dos quesitos do laudo original. |

### 1.2 Tabelas novas

Todas com `id uuid pk default gen_random_uuid()`, `created_at`/`updated_at timestamptz`,
trigger `set_updated_at`, RLS habilitada com policy `authenticated_full_access` (mesmo
padrão de `respostas_secao` / `processo_partes`).

#### `pos_laudo_ciclos` — a rodada pós-entrega (repetível por processo)
| coluna | tipo | nota |
|---|---|---|
| `processo_id` | uuid **not null** fk `processos(id)` on delete cascade | |
| `numero_ciclo` | int **not null** | 1, 2, 3… por processo. `unique (processo_id, numero_ciclo)`. |
| `fluxo` | text **not null** check `('judicial','assistencia_tecnica')` | denormalizado de `processos.tipo_trabalho` — congela o rito do ciclo mesmo que o processo mude. |
| `status` | text **not null** default `'aberto'` check `('aberto','triagem','em_resposta','aguardando_protocolo','protocolado','encerrado')` | status próprio do ciclo, independente de `processos.situacao_processo`. |
| `data_intimacao` | date | |
| `prazo` | date | alimenta agenda/alertas (futuro). |
| `origem` | text check `('autor','reu','ambos','juizo','mp','outro')` | |
| `natureza` | text[] | `concordancia / impugnacao / esclarecimentos / quesitos_suplementares / complementacao / documento_novo / nova_pericia / determinacao_judicial / outra`. |
| `documento_intimacao_id` | uuid fk `documentos(id)` on delete set null | arquivo da intimação (opcional — ver ponto aberto 5). |
| `laudo_base_id` | uuid fk `laudos_gerados(id)` on delete restrict | **judicial:** o Laudo V1 da própria perita. **AT:** null (o laudo do perito judicial é externo → vai como `documentos` + `pos_laudo_documentos`, marcado como o "laudo analisado"). |
| `classificacao_global` | text check `('favoravel','parc_favoravel','neutro','parc_desfavoravel','desfavoravel')` | **obrigatória no fluxo AT**, nula no judicial (validação na aplicação). |
| `pode_modificar_conclusao` | text check `('nao','potencialmente','sim','depende_complementacao')` | campo obrigatório da triagem, nível de ciclo. |
| `rascunho_complementacao` | boolean not null default false | ligado automaticamente quando algum ponto é classificado como `necessidade_complementacao` (ação automática confirmada pela Dra.). |
| `created_by` | uuid fk `auth.users(id)` on delete set null | |
| `encerrado_em` | timestamptz | |

#### `pos_laudo_pontos` — matriz de enfrentamento ponto a ponto
(unifica "Análise dos Pontos Questionados" do modelo de Esclarecimentos, "Matriz de
Problemas do Laudo" do spec AT, e "Matriz de enfrentamento" da memória.)
| coluna | tipo | nota |
|---|---|---|
| `ciclo_id` | uuid **not null** fk `pos_laudo_ciclos(id)` on delete cascade | |
| `ordem` | int not null | |
| `origem_ponto` | text | autor / réu / juízo / MP / at_interno / perito. |
| `tema` | text | |
| `sintese_alegacao` | text | o questionamento apresentado (importado da manifestação, quando houver). |
| `ja_abordado_no_laudo` | boolean | |
| `referencia_laudo` | text | página/item do laudo V1. |
| `classificacao_triagem` | text check (9 valores) | `questionamento_pertinente / esclarecimento_legitimo / quesito_suplementar_pertinente / documento_novo_relevante / necessidade_complementacao / divergencia_interpretativa / mero_inconformismo / reiteracao_quesito / questao_juridica_fora_objeto`. **Uma por ponto.** |
| `potencial_alterar_conclusao` | text check `('nao','potencialmente','sim','depende_complementacao')` | |
| `fundamentacao_adicional` | text | |
| `resposta_tecnica` | text | a resposta do perito àquele ponto (preenchida na fase "Matriz de enfrentamento"). |
| `repercussao` | text check `('ponto_ja_esclarecido','fundamentacao_complementada','retificacao_necessaria','conclusao_parcialmente_modificada','sem_repercussao')` | seção IV do modelo de Esclarecimentos. |
| `categoria_problema` | text | **só AT** — omissao / contradicao_interna / contradicao_documental / erro_tecnico / premissa_incorreta / ausencia_fundamentacao / etc. (spec AT §14). Null no judicial. |

#### `pos_laudo_ponto_evidencias` — rastreabilidade (paridade com `resposta_evidencias`)
| coluna | tipo | nota |
|---|---|---|
| `ponto_id` | uuid **not null** fk `pos_laudo_pontos(id)` on delete cascade | |
| `documento_id` | uuid fk `documentos(id)` on delete cascade | |
| `resposta_processo_id` | uuid fk `respostas_processo(id)` on delete cascade | vincula a um achado do laudo original. |
| `observacao` | text | |
| | | check: `documento_id is not null or resposta_processo_id is not null`. |

#### `pos_laudo_documentos` — metadados de ciclo para documentos supervenientes
**Decisão (Jeferson, 03/09/2026): abordagem híbrida — nem satélite puro nem colunas em
`documentos`.**
- O **arquivo** continua 100% em `documentos` (tipo `documento_processual`), subindo pelo
  **mesmo pipeline de upload / bucket `documentos-processos` privado / signed URL** que já
  funciona hoje. Zero coluna nova em `documentos`.
- `pos_laudo_documentos` guarda **só os metadados que são do ciclo**: vínculo com o ciclo,
  papel, classificação de impacto, se já foi enfrentado — apontando para `documento_id`.
- A regra "nunca incorporar ao acervo original" vira **um filtro de consulta** (anti-join):
  `compilarLaudo` exclui qualquer `documento_id` que apareça em `pos_laudo_documentos`
  daquele processo. Ver 1.8.

| coluna | tipo | nota |
|---|---|---|
| `ciclo_id` | uuid **not null** fk `pos_laudo_ciclos(id)` on delete cascade | |
| `documento_id` | uuid **not null** fk `documentos(id)` on delete restrict | o arquivo em si vive em `documentos`. |
| `papel` | text check `('superveniente','laudo_analisado','manifestacao_analisada')` | `laudo_analisado` = o laudo do perito judicial no fluxo AT; `manifestacao_analisada` = a impugnação/pedido que motivou o ciclo. |
| `apresentante` | text | autor / réu / juízo / outro. |
| `data_juntada` | date | |
| `paginas` | text | |
| `existencia_previa` | boolean | o documento já existia antes do laudo V1? |
| `disponivel_ao_perito_antes` | boolean | estava disponível ao perito à época? (rastreabilidade temporal — modelo de Esclarecimentos §II). |
| `relevancia` | text check `('sem_relevancia','complementar','relevante','potencialmente_modificador','determinante')` | |
| `impacto` | text | |
| `ja_enfrentado` | boolean not null default false | se o ponto já foi respondido na matriz do ciclo. |
| `observacao_tecnica` | text | |
| | | `unique (ciclo_id, documento_id)`. |

#### `pos_laudo_retificacao_itens` — tabela "onde se lê / leia-se"
| coluna | tipo | nota |
|---|---|---|
| `ciclo_id` | uuid **not null** fk `pos_laudo_ciclos(id)` on delete cascade | |
| `documento_alvo_id` | uuid fk `laudos_gerados(id)` | qual versão está sendo retificada (V1, ou um esclarecimento anterior). |
| `ordem` | int not null | |
| `pagina` | text | |
| `item_secao` | text | |
| `onde_se_le` | text not null | transcrição exata do trecho. |
| `leia_se` | text not null | |
| `natureza_erro` | text | digitação / grafia / nome / data / valor / referência / omissão / formatação / outro. |

> Estes itens vivem à parte de propósito: se a "Análise da Repercussão" der **SIM**, o
> ciclo é redirecionado para Complementação e estes itens são **carregados** para o
> fluxo de complementação sem serem perdidos (ver 1.5).

#### `pos_laudo_quesitos` — quesitos suplementares / de esclarecimento **do ciclo**
(separados de `quesitos` — decisão da Dra.)
| coluna | tipo | nota |
|---|---|---|
| `ciclo_id` | uuid **not null** fk `pos_laudo_ciclos(id)` on delete cascade | |
| `ponto_id` | uuid fk `pos_laudo_pontos(id)` on delete set null | o ponto da matriz que originou o quesito (quando "Gerar quesito de esclarecimento"). |
| `tipo` | text check `('suplementar','esclarecimento')` | |
| `origem` | text | autor / réu / juízo / outro. |
| `numero` | int | |
| `pergunta` | text not null | |
| `resposta` | text | **judicial:** a perita responde. **AT:** fica null — a AT *elabora* o quesito pro advogado apresentar, não responde. |
| `objetivo_estrategico_interno` | text | **só AT** — nunca migra pro documento gerado. |
| `status` | text check `('rascunho','revisado','aprovado','excluido')` default `'rascunho'` | |

#### `pos_laudo_conclusoes_vigentes` — log append-only da "Conclusão Vigente"
| coluna | tipo | nota |
|---|---|---|
| `processo_id` | uuid **not null** fk `processos(id)` on delete cascade | |
| `origem_tipo` | text **not null** check `('laudo','esclarecimentos','complementacao')` | **`retificacao` propositalmente ausente do check** — ver 1.6. |
| `origem_laudo_gerado_id` | uuid fk `laudos_gerados(id)` on delete restrict | o documento que estabeleceu esta conclusão. |
| `ciclo_id` | uuid fk `pos_laudo_ciclos(id)` on delete set null | null para a linha semente (V1). |
| `texto` | text **not null** | a conclusão vigente em si. |
| `escopo` | text not null check `('integral','parcial')` | "para os aspectos expressamente abordados neste documento" → `parcial`. |
| `vigente_desde` | timestamptz not null default now() | |
| `substituida_em` | timestamptz | null = é a vigente agora. |
| `substituida_por_id` | uuid fk `pos_laudo_conclusoes_vigentes(id)` | self-ref. |
| `created_by` | uuid fk `auth.users(id)` on delete set null | |

### 1.3 `laudos_gerados`: estender, **não** criar tabela nova

**Decisão: estender.** Colunas novas (todas nullable / com default, migração não destrói
nada):

| coluna nova | tipo | nota |
|---|---|---|
| `tipo` | text not null default `'laudo'` check `('laudo','esclarecimentos','retificacao','complementacao','parecer_at','manifestacao_at','impugnacao_at','parecer_divergente_at')` | V1 continua nascendo como `'laudo'`. |
| `pos_laudo_ciclo_id` | uuid fk `pos_laudo_ciclos(id)` on delete set null | null para o laudo V1. |
| `titulo` | text | "Esclarecimentos ao Laudo Médico-Pericial", "Complementação ao Laudo…", "Parecer Técnico — Impugnação Parcial", etc. — vira o título do documento. |
| `substitui_conclusao` | boolean not null default false | true só quando o documento altera/substitui a conclusão vigente. |
| `protocolado` | boolean not null default false | |
| `protocolo_id` | text | ID do protocolo nos autos. |
| `protocolado_em` | timestamptz | |
| `paginas` | int | preenchido só após o PDF definitivo (modelo pede `[X] páginas`). |

Constraints de guarda (rede de segurança, a regra de verdade é na aplicação):
- `check (not (tipo = 'retificacao' and substitui_conclusao = true))` — uma retificação
  nunca substitui conclusão.
- `versao` continua `unique (processo_id, versao)` e monotônica: **V1 Laudo, V2
  Esclarecimentos, V3 Complementação, V4 Novos esclarecimentos…** — exatamente a
  numeração que a Dra. descreveu.
- Imutabilidade: quando `protocolado = true`, a linha é congelada. Reforçar com trigger
  `BEFORE UPDATE` que rejeita alteração de qualquer coluna exceto nenhuma (ou permitir
  só campos de auditoria), além da checagem na server action.

**Por que estender e não uma tabela paralela:**
1. O ciclo de vida é idêntico ao do laudo: `compilar → renderizar docx+pdf → subir pro
   Storage → gravar snapshot imutável`. Uma tabela paralela duplicaria `storage_path_pdf`,
   `storage_path_docx`, `snapshot_respostas`, `gerado_por`, `versao` e a lógica de
   "próxima versão = max+1".
2. "Qual a última versão / mostre o histórico de versões do processo" vira **uma**
   query em `laudos_gerados` ordenada por `versao`. Com duas tabelas, todo lugar que
   lista versões precisa de `UNION` e reconciliação de numeração.
3. `snapshot_respostas` (jsonb) já serve pra congelar o conteúdo compilado — no
   pós-laudo ele congela a matriz de pontos + respostas + repercussão + conclusão
   daquele documento.
4. A régua "V1 Laudo → V2 Esclarecimentos → V3 Complementação" do próprio material trata
   os três como **a mesma sequência de versões do dossiê pericial**, não como coisas de
   naturezas diferentes.

O custo (uma tabela "gorda" com colunas que só valem para alguns `tipo`s) é pequeno e
já é o padrão do projeto (ex.: `processos` tem colunas só-judicial e só-AT).

**Impacto no código atual (decidido Jeferson 03/09/2026) — pequeno, sem refactor:**
- `src/features/geracao-laudo/actions.ts` (`gerarLaudo`): a query que lê `max(versao)`
  **continua sem filtro** — a numeração é global e monotônica de propósito. Ajuste:
  passar a gravar `tipo: 'laudo'` **explícito** no insert (não depender do default da
  coluna).
- `src/app/(dashboard)/processos/[id]/laudo/page.tsx`: a lista de "versões geradas"
  **passa a filtrar `.eq("tipo", "laudo")`** por enquanto — a função dessa tela é gerar
  e regerar o laudo; misturar esclarecimentos/retificações ali, antes da aba de
  Pós-laudo existir, mostraria documentos sem contexto e sem como abrir o ciclo que os
  originou. A **linha do tempo unificada** (V1 Laudo · V2 Esclarecimentos · V3
  Complementação…) fica na **fatia 12**, que é o lugar certo. Reverter o filtro depois é
  uma linha.
- `src/types/database.ts`: regen de `LaudosGeradosRow/Insert/Update` (mecânico).
- `src/types/json-fields.ts`: o tipo de `snapshot_respostas` vira **união discriminada
  por `tipo`** (`{ tipo: 'laudo'; ... } | { tipo: 'esclarecimentos' | 'complementacao' |
  ...; matriz: ...; repercussao: ...; conclusao: ... }`), **não** um tipo solto. É
  snapshot imutável de documento médico-legal — o discriminante é a garantia de que a
  forma do snapshot não muda em silêncio numa refatoração futura.
- `src/features/geracao-laudo/compilar.ts`: o anti-join do ponto 10 (ver 1.7) — uma
  query pequena + um `.filter`, aplicado uma vez.

### 1.4 Ponteiro de conclusão vigente em `processos`?

**Decisão: não agora — consulta direta.** "Conclusão vigente do processo X agora" =

```sql
select * from pos_laudo_conclusoes_vigentes
where processo_id = $1 and substituida_em is null;
```

Deve retornar **exatamente uma** linha (a semente V1 sempre existe assim que há laudo
protocolado). É barato (índice em `(processo_id, substituida_em)`), tem uma única fonte
de verdade e não precisa de trigger de sincronização. Um `processos.conclusao_vigente_id`
denormalizado só entra depois se algum relatório/listagem precisar disso em massa —
fica registrado como otimização possível, não como parte do MVP.

### 1.5 A trava da Retificação — onde mora

**Mora na aplicação (server action), com um CHECK de guarda no banco.**

Racional: não é um invariante de integridade de uma linha — é uma **transição de
estado multi-tabela**. Um CHECK não consegue expressar "se `afeta_conclusao = true`,
então este ciclo não pode ser finalizado *como* retificação **e** um fluxo de
Complementação precisa ser aberto carregando os itens `onde se lê / leia-se`".

Fluxo concreto — server action `finalizarRetificacao(cicloId)`:

1. Lê o campo obrigatório "A correção interfere na fundamentação/conclusão?"
   (`nao` | `sim`) + justificativa.
2. **`nao`** → gera o documento Retificação de Erro Material (`laudos_gerados` com
   `tipo='retificacao'`, `substitui_conclusao=false`, `versao = max+1`). **Não escreve
   nada em `pos_laudo_conclusoes_vigentes`.** Fim.
3. **`sim`** → **não gera** documento de retificação. Em vez disso:
   - garante que o ciclo tem `natureza` contendo `complementacao` (adiciona se faltar);
   - marca `pos_laudo_ciclos.rascunho_complementacao = true`;
   - os `pos_laudo_retificacao_itens` **já estão persistidos** e passam a ser exibidos
     como itens de partida da Complementação (seção "Elementos revistos ou modificados"
     do modelo de Complementação);
   - volta `status` do ciclo para `em_resposta`;
   - retorna `{ redirecionado: 'complementacao' }` → a UI leva a perita para a tela de
     Complementação com esses itens pré-carregados e um aviso ("Esta correção foi
     reclassificada como Complementação porque afeta a fundamentação/conclusão.").

O CHECK `not (tipo='retificacao' and substitui_conclusao=true)` em `laudos_gerados` é só
para impedir que um cliente com bug persista um estado impossível — a lógica de negócio
é a de cima.

### 1.6 "Nova Conclusão Vigente" — representação e por que Retificação nunca cria

- A conclusão vigente é um **log append-only** (`pos_laudo_conclusoes_vigentes`).
- **Semente:** quando o Laudo V1 é protocolado (ou quando o 1º ciclo é aberto), grava-se
  uma linha `origem_tipo='laudo'`, `escopo='integral'`, `texto` = texto da seção de
  Conclusão do laudo (de `respostas_secao` da seção de conclusão do template), `ciclo_id
  = null`.
- **Só** os fluxos de **Esclarecimentos** e **Complementação**, quando a seção
  "Repercussão sobre o laudo original" for marcada como *altera parcialmente* / *revisão
  substancial* / *substitui*, chamam `registrarNovaConclusaoVigente(...)`, que:
  1. insere nova linha (`origem_tipo` = `esclarecimentos` ou `complementacao`,
     `origem_laudo_gerado_id` = o doc gerado, `escopo` = `parcial` na maioria dos casos,
     `texto` = a "Nova Conclusão Vigente" que a perita foi **obrigada** a preencher);
  2. carimba `substituida_em = now()` e `substituida_por_id` na linha anteriormente
     vigente.
- A **Retificação nunca cria** porque:
  1. o check da tabela **não aceita** `origem_tipo='retificacao'` — é estruturalmente
     impossível atribuir uma conclusão vigente a uma retificação;
  2. a server action `finalizarRetificacao` no caminho `nao` **não tem branch** que
     chame `registrarNovaConclusaoVigente`;
  3. o caminho `sim` (que precisaria mexer na conclusão) é **desviado para
     Complementação** antes de qualquer documento ser finalizado (1.5). Ou seja: se uma
     "retificação" chegasse ao ponto de mexer na conclusão, ela já deixou de ser
     retificação.

"Qual a conclusão vigente em qualquer momento" = a única linha com `substituida_em IS
NULL` para aquele `processo_id`. O histórico completo (V1 → V2 → V3…) é a tabela inteira
ordenada por `vigente_desde`, com cada linha apontando para o documento que a
estabeleceu.

### 1.7 Impacto real em `compilarLaudo` (o "nunca incorporar ao acervo original")

Hoje `src/features/geracao-laudo/compilar.ts` faz `from("documentos").select("*").eq(
"processo_id", …)` (linha ~99) e usa o resultado filtrado por `tipo` em dois pontos:
`adicionarTokensComputados` (tokens `{{total_documentos}}` / `{{total_paginas}}` /
`{{categorias_principais}}`) e `compilarTabelaDocumentos` (a tabela "documentos
analisados" do laudo). Como documento superveniente é `tipo='documento_processual'`,
sem tratamento ele **entraria** na contagem e na tabela do laudo numa regeração.

Correção (uma consulta pequena + um `.filter`):
```
supervenientes = select documento_id from pos_laudo_documentos
                 where ciclo_id in (select id from pos_laudo_ciclos where processo_id = $1)
documentos = documentosDb.filter(d => !supervenientes.has(d.id))
```
Aplicado **uma vez** logo depois da query de `documentos` em `compilar.ts` — os dois
pontos a jusante já herdam o filtro. Se não houver nenhum ciclo pós-laudo, o Set é vazio
e nada muda.

### 1.8 Diagrama de relacionamentos (resumo)

```
processos 1─┬─* pos_laudo_ciclos 1─┬─* pos_laudo_pontos 1─* pos_laudo_ponto_evidencias ─> documentos / respostas_processo
            │                      ├─* pos_laudo_documentos ──────> documentos
            │                      ├─* pos_laudo_retificacao_itens ─> laudos_gerados (documento alvo)
            │                      ├─* pos_laudo_quesitos
            │                      └─* laudos_gerados (tipo != 'laudo', via pos_laudo_ciclo_id)
            └─* pos_laudo_conclusoes_vigentes ──> laudos_gerados (origem) / pos_laudo_ciclos
laudos_gerados: V1 tipo='laudo' (ciclo_id null) ; V2+ tipo esclarecimentos/retificacao/complementacao/parecer_at...
```

---

## 2. Telas e navegação

### 2.1 Entrada

- **Aba/botão "Pós-laudo"** na tela do processo (`src/app/(dashboard)/processos/[id]/page.tsx`,
  no bloco de botões, ao lado de "Laudo final") → `/processos/[id]/pos-laudo`.
- Habilitada só quando existe `laudos_gerados` protocolado do tipo âncora:
  - **judicial:** um `tipo='laudo'` protocolado;
  - **AT:** um `tipo IN ('parecer_at', …)` protocolado **ou** um documento anexado com
    `pos_laudo_documentos.papel = 'laudo_analisado'` (a AT pode analisar laudo alheio
    sem ter gerado nada antes — ver ponto aberto 7).
  - Antes disso: botão desabilitado com dica "disponível após o laudo protocolado".

### 2.2 `/processos/[id]/pos-laudo` — índice de ciclos

- Lista de ciclos: nº, natureza, status, data da intimação, prazo, documentos gerados
  (V2/V3…), conclusão vigente atual.
- Botão **"Abrir novo ciclo de pós-laudo"** → formulário curto (registro da demanda:
  data intimação, prazo, origem, natureza[multi], anexar arquivo da intimação) → cria
  `pos_laudo_ciclos` com `numero_ciclo = max+1`, `fluxo` = `processos.tipo_trabalho`,
  redireciona para a tela do ciclo.
- Ciclo **repetível**: nada impede abrir o ciclo 2, 3… (novo ciclo ou encerramento é
  decisão da perita, nunca automático).

### 2.3 `/processos/[id]/pos-laudo/[cicloId]` — workspace do ciclo

Mesma linguagem visual do preenchimento por seção (uma aba/etapa por vez, com "Salvo"
por etapa). Etapas:

1. **Registro da demanda** — dados de entrada, editáveis até o protocolo.
2. **Triagem** — a matriz de pontos: adicionar ponto, classificar cada um (1
   classificação/ponto), campo de ciclo "a manifestação pode modificar a conclusão?".
   Ao classificar um ponto como *necessidade de complementação* → liga
   `rascunho_complementacao` e mostra um aviso persistente.
3. **Documentos supervenientes** — anexar (reusa upload de `documentos`) + classificar
   (relevância, existência prévia, disponibilidade ao perito).
4. **Matriz de enfrentamento** — a mesma lista de pontos, agora com `resposta_tecnica` +
   `repercussao` por ponto, e evidências vinculadas.
5. **Quesitos suplementares / de esclarecimento** — do ciclo (`pos_laudo_quesitos`).
6. **Repercussão sobre o laudo original** (nível de ciclo, obrigatória) → se
   *altera/substitui*, exige "Nova Conclusão Vigente".
7. **Saídas** — Esclarecimentos / Retificação / Complementação (judicial) ou
   Parecer/Concordância/Impugnação/Divergente (AT). As aplicáveis são geradas **juntas**
   (Dra.: não faseado). Cada uma com botão "Gerar" + preview + registro de protocolo.
8. **Encerramento do ciclo** — só habilitado sem pendência técnica (todo ponto com
   resposta e repercussão, quesitos aprovados, saídas geradas).

### 2.4 Geração pré-preenchida (nunca folha em branco)

- `src/features/pos-laudo/compilar.ts` → `compilarPosLaudo(cicloId, tipoSaida)` produz um
  **`ModeloPosLaudo`** (intermediário análogo a `ModeloLaudo`) montado a partir de:
  - cabeçalho: `montarCabecalhoFormal(processo, partes)` (judicial) ou
    `montarCabecalhoAssistenciaTecnica(processo)` (AT) — reaproveitados de `cabecalho.ts`;
  - seção "Identificação" ← campos do `pos_laudo_ciclos` (IDs, datas, origem);
  - seção "Documentos supervenientes" ← `pos_laudo_documentos` (tabela);
  - seção "Análise dos pontos" ← `pos_laudo_pontos` (uma subseção por ponto:
    questionamento → esclarecimento pericial → elementos considerados → repercussão);
  - seção "Quesitos" ← `pos_laudo_quesitos` (texto original travado);
  - seção "Repercussão" + "Conclusão" ← campo de repercussão do ciclo + textos-base
    automáticos dos modelos ("Quando mantém integralmente", "Quando altera
    parcialmente", "Quando substitui a conclusão anterior") escolhidos pela opção
    marcada, **editáveis**;
  - "Nova Conclusão Vigente" quando aplicável.
- `src/features/pos-laudo/renderizar-*.ts` → **reusa** `renderizar-docx.ts` e
  `renderizar-pdf.ts` de `geracao-laudo` passando o `ModeloPosLaudo` (mesma estrutura de
  blocos). Sobe PDF+DOCX pro bucket, grava `laudos_gerados`.
- Resultado: a tela de geração mostra **todos os campos já preenchidos** com o que a
  perita registrou no workspace — ela revisa/edita o texto narrativo e confirma, nunca
  digita do zero.

---

## 3. Diferenças concretas Judicial × Assistência Técnica dentro do mesmo módulo

| Aspecto | Perícia Judicial | Assistência Técnica |
|---|---|---|
| Documento âncora do ciclo | Laudo Médico-Pericial **da própria perita** (`laudo_base_id` → `laudos_gerados` V1) | Laudo do **perito judicial** (externo) → anexado como `documentos` + `pos_laudo_documentos.papel='laudo_analisado'` |
| Cabeçalho dos documentos | `montarCabecalhoFormal` (EXMO. SR. JUIZ…) | `montarCabecalhoAssistenciaTecnica` (capa PERICONS, parte assistida, periciado, assistente técnico) |
| Saídas | Esclarecimentos · Retificação de Erro Material · Complementação do Laudo | Parecer de Concordância · Concordância com Ressalvas · Impugnação Técnica Parcial · Impugnação Técnica Integral · Parecer Divergente (+ quesitos de esclarecimento/suplementares, solicitação de complementação, sugestão de nova perícia) |
| Classificação global do laudo | não se aplica (a perita escreveu o próprio laudo) | **obrigatória**: FAVORÁVEL / PARC. FAVORÁVEL / NEUTRO / PARC. DESFAVORÁVEL / DESFAVORÁVEL (`pos_laudo_ciclos.classificacao_global` not null via validação da app) |
| "Nova Conclusão Vigente" | sim — a conclusão do laudo da própria perita pode mudar → `pos_laudo_conclusoes_vigentes` | a "posição da PERICONS sobre o laudo" (Concorda/Diverge/…) é registrada no ciclo/documento; **ver ponto aberto 1** se precisa do mesmo log versionado |
| Trava da Retificação | central (retifica o próprio laudo) | vale para retificação de **documento próprio** já entregue (parecer/manifestação AT anterior); ver ponto aberto 2 |
| Quesitos do ciclo | suplementares + de esclarecimento, **respondidos** pela perita | de esclarecimento/suplementares **elaborados** pela AT para o advogado apresentar (campo `resposta` fica null; `objetivo_estrategico_interno` usado) |
| Protocolo | a perita protocola direto → `laudos_gerados.protocolado/protocolo_id` | a AT **entrega ao advogado**; protocolo é do patrono → registrar "entrega ao advogado" + `protocolo_id` opcional quando informado |
| Papéis | Dra. Fernanda (técnico) + Assessor (operacional). **Sem Atendimento.** | Dra. Fernanda + Assessor + Atendimento + Patrícia/relacionamento |
| Origem do ciclo | intimação nos autos | evento "laudo juntado" **ou** serviço avulso "Análise do Laudo" contratado |
| Entrada avulsa (sem histórico do caso) | não | sim — base mínima (objeto, parte assistida, tese, quesitos, documentos essenciais) |

**Núcleo compartilhado** (idêntico nos dois): `pos_laudo_ciclos`, `pos_laudo_pontos`
(+ evidências), `pos_laudo_documentos`, `pos_laudo_quesitos`,
`pos_laudo_conclusoes_vigentes`, o pipeline `compilar → renderizar (docx+pdf) → Storage →
snapshot → protocolo/entrega`, e o versionamento em `laudos_gerados`. O que troca é
função de cabeçalho, o conjunto de tipos de saída, se a classificação global é
obrigatória, se "nova conclusão vigente" se aplica, e protocolo × entrega — tudo
decidido por `pos_laudo_ciclos.fluxo`.

---

## 4. Ordem de implementação (fatias testáveis isoladas)

| # | Fatia | Entregável testável isolado |
|---|---|---|
| 0 | **Schema + tipos** — ✍️ ESCRITO 03/09/2026, aguardando revisão do Jeferson antes de aplicar. Arquivos: `supabase/migrations/20260905120000_pos_laudo_schema.sql` (7 tabelas + ALTER de `laudos_gerados` + 2 triggers: supersede da conclusão vigente e freeze de linha protocolada), `src/types/enums.ts` (+14 unions do módulo), `src/types/database.ts` (7 Row/Insert/Update + `LaudosGeradosRow` estendida), `src/types/json-fields.ts` (`SnapshotPosLaudo` + união `SnapshotLaudoGerado`). `tsc` + `eslint src/types` limpos. **Sem UI, sem mudança em código de runtime.** | Aplicar migration; inserir linhas via SQL; validar CHECKs (`pos_laudo_conclusoes_vigentes.origem_tipo` sem `retificacao`; `not(laudos_gerados.tipo='retificacao' and substitui_conclusao)`); confirmar índice parcial único da conclusão vigente. |
| 1 | ✅ **FEITO 04/09/2026** (commit 2efaa79). Aba "Pós-laudo" gated no laudo protocolado; `/pos-laudo` índice; "abrir novo ciclo" (com dedup de ciclo aberto em branco); tela do ciclo só com "Registro da demanda" (data intimação, prazo, origem, natureza multi, doc da intimação **opcional** com selo "Pendente"; autosave). **Também nesta fatia:** `marcarLaudoProtocolado` + diálogo de confirmação irreversível na tela Laudo final (o gate depende disso). `fluxo` derivado de `tipo_trabalho`, sem seletor. `laudo_base_id` = maior `versao` com `tipo='laudo'` e `protocolado=true`. |
| 2 | ✅ **FEITO 04/09/2026** (commit 37a8b99). Matriz de pontos com CRUD (origem, tema, síntese, já abordado?, página/item, **1** classificação de triagem, fundamentação); campo de ciclo "pode modificar conclusão?"; evidências vinculando documentos já anexados (+ observação). `rascunho_complementacao` liga/desliga sozinho conforme a classificação `necessidade_complementacao` — **puro aviso "Sugestão", nunca condição de fluxo** (Jeferson pediu alinhar antes se isso mudar). Salvamento por botão explícito (gramática do `secao-workspace`, não autosave). |
| 3 | ✅ **FEITO 04/09/2026** (commit f6cec1c). `adicionarDocumentoSuperveniente` reusa 100% o pipeline de `documentos` (mesmo bucket, mesmo `storage_path`, sem caminho paralelo) e cria a linha em `pos_laudo_documentos` (papel + apresentante/data juntada/páginas/existência prévia/disponível ao perito/relevância/impacto/observação técnica/já enfrentado). Anti-join no `compilarLaudo` (§1.7) exclui esses docs da contagem e da tabela do laudo original. `/processos/[id]/documentos` marca os supervenientes com selo e bloqueia exclusão por ali. **PENDENTE: teste explícito do anti-join em produção pelo Jeferson** — gerar laudo num processo com doc superveniente e conferir ausência na tabela + contagem. |
| 4 | ✅ **FEITO 04/09/2026** (migration `20260906120000` + código). Por ponto: `resposta_tecnica` (textarea) + `repercussao` (5 valores) no card; ponto sem resposta técnica é estado válido (selo "Sem resposta técnica", trava só na geração). Ciclo: `RepercussaoCicloControl` com `repercussao_laudo` (6 valores) + **sugestão visual** derivada das repercussões dos pontos (modelo `rascunho_complementacao`, nunca condição de fluxo) + textarea `conclusao_vigente_nova` quando a repercussão exige. **Conclusão Vigente V1**: bloco na tela do laudo final (`conclusao-vigente-inicial.tsx`), **sem backfill retroativo** — a perita confirma uma vez; pré-preenchimento **conservador** (`extrairConclusaoDoLaudo`: só traz texto quando há 1 seção de conclusão inequívoca com narrativo salvo — allowlist de `codigo`; ambiguidade → campo vazio + instrução pra colar; quando extraído, avisa a seção de origem e pede conferência). `definirConclusaoVigenteInicial` só opera enquanto vigente for V1 do laudo (`origem_tipo='laudo'`, `ciclo_id IS NULL`). `abrirCicloPosLaudo` agora **exige conclusão vigente** além do laudo protocolado. **Trava** (`regras.ts` → `podeGerarSaida`): só definida, amarração no fluxo de geração fica na fatia 5. |
| 5 | **Geração — Esclarecimentos (judicial)** | `compilarPosLaudo` + `ModeloPosLaudo` + reuso dos renderers; grava `laudos_gerados` (tipo `esclarecimentos`, versão max+1). Tela de geração pré-preenchida + preview + PDF/DOCX. |
| 6 | **Retificação de Erro Material + trava** | `pos_laudo_retificacao_itens`, tela onde-se-lê/leia-se, campo "Análise da Repercussão". `finalizarRetificacao`: `nao` → gera doc; `sim` → reroteia p/ Complementação carregando itens, sem gerar retificação nem tocar conclusão. Testar os dois caminhos. |
| 7 | **Complementação do Laudo** | Documento separado que só remete ao laudo (não reabre seções). Consome itens vindos da retificação reroteada + novos elementos/exame/avaliação. Gera doc (tipo `complementacao`); pode alterar/substituir conclusão vigente. |
| 8 | **As 3 saídas juntas + encerramento do ciclo** | Tela que gera Esclarecimentos + Retificação + Complementação conforme aplicável no mesmo ciclo; numeração de versão coerente (V2, V3, V4…); encerrar ciclo só sem pendência técnica. |
| 9 | **Quesitos suplementares / de esclarecimento do ciclo** | `pos_laudo_quesitos` + tela; entram nos documentos de esclarecimentos/complementação; confirmar que **não** aparecem na aba Quesitos do laudo. |
| 10 | **Fluxo Assistência Técnica** | `fluxo='assistencia_tecnica'`: anexar laudo externo, classificação global obrigatória, saídas Parecer/Concordância/Impugnação/Divergente, cabeçalho AT, "posição PERICONS", entrega ao advogado (não protocolo). Reusa 1–9. Testar ciclo judicial × ciclo AT lado a lado. |
| 11 | **Ciclo pós-laudo × situação do processo** | Ao abrir ciclo, oferecer setar `situacao_processo` = "Manifestação/complementação/esclarecimentos/novos quesitos"; ao encerrar, oferecer voltar. Nunca automático sem confirmação. |
| 12 | *(opcional)* **Linha do tempo de versões unificada** | Aba/lista "V1 Laudo · V2 Esclarecimentos · V3 Complementação…" com data, protocolo, páginas, conclusão vigente à época. Só leitura sobre `laudos_gerados` + `pos_laudo_conclusoes_vigentes`. É aqui que o filtro `tipo='laudo'` da tela Laudo final deixa de valer (ou aquela tela ganha um link "ver linha do tempo completa"). |

Cada fatia é um commit (ou poucos), com `tsc` + `eslint` + `build` limpos antes de
seguir.

### 4.1 Até onde dá pra ir sem as 5 respostas pendentes da Dra. Fernanda

**Seguro agora, em ordem: fatias 0 → 7.** Nada nelas depende das 5 perguntas em aberto.
- **Fatia 11** pode ser puxada pra frente (rodar logo depois da fatia 2) — seu único
  bloqueio ("fim da rodada sugere, não muda sozinho") foi **decidido em 03/09/2026**.
- **Fatia 12** (opcional) pode entrar a qualquer momento depois da fatia 5.

**Primeira fatia que trava: 8** — "as 3 saídas juntas" depende da pergunta (d) (1 PDF
consolidado × 3 PDFs × só as aplicáveis). As fatias 5/6/7 geram **um** documento cada e
não dependem disso; a 8 é só a orquestração das três no mesmo ciclo.
- **Fatia 9** trava na pergunta (c) (numeração dos quesitos suplementares: continuar a
  contagem do laudo × reiniciar por ciclo/parte).
- **Fatia 10** trava nas perguntas (a), (b) e (e) — todas do fluxo AT.

**Ressalva sobre a fatia 0:** dois CHECKs nascem com a lista de valores só-conhecidos
(`pos_laudo_conclusoes_vigentes.origem_tipo` e `laudos_gerados.tipo`). Se a resposta (a)
ou (b) exigir um valor AT novo nesses CHECKs, é um `ALTER` de uma linha (drop + recreate
da constraint) — **não destrutivo**, porque nenhuma linha AT existe ainda. Fatia 0 sobe
sem risco.

---

## 5. Pontos que dependem de decisão antes de virar código

### Técnicos — TODOS DECIDIDOS (Jeferson, 03/09/2026)
9. ✅ **Estender `laudos_gerados`** (não tabela nova).
10. ✅ **Híbrido** — arquivo em `documentos` (pipeline de upload/Storage/signed URL
    reaproveitado, zero coluna nova em `documentos`); `pos_laudo_documentos` só com os
    metadados do ciclo referenciando `documento_id`; "não incorporar ao acervo original"
    = anti-join em `compilarLaudo` (ver 1.7).
11. ✅ **Consulta direta** ao log de conclusão vigente (sem ponteiro em `processos`; ver
    1.4).
12. ✅ **Tabela dedicada `pos_laudo_ponto_evidencias`** (paridade com
    `resposta_evidencias`; não jsonb).
13. ✅ **App-layer + CHECK de guarda** na trava da Retificação.
14. ✅ **Feature própria `src/features/pos-laudo`** com `compilarPosLaudo` próprio
    reusando `renderizar-docx`/`renderizar-pdf`/cabeçalhos de `geracao-laudo`.
15. ✅ **Two-pass no pdfmake**, com duas salvaguardas obrigatórias:
    (a) reservar **largura fixa** para o placeholder do número de páginas, para o texto
    não empurrar a paginação; (b) conferir que `pageCount` da 2ª passada é **igual** ao
    da 1ª — se divergir, **abortar a geração** com erro, nunca emitir o documento com
    contagem possivelmente errada. Fallback se o two-pass se mostrar instável: rodapé
    dinâmico `function(currentPage, pageCount)` + corpo sem número fixo.
16. ✅ **Seguir o padrão `authenticated_full_access`** em todas as 7 tabelas novas.

### Da Dra. Fernanda — 3 decididas (Jeferson, 03/09/2026), 5 encaminhadas

**Decididas:**
- **Arquivo da intimação ao abrir uma rodada:** **opcional**. Nunca bloquear a abertura
  da rodada por falta de arquivo; registrar a pendência de forma **visível** na tela do
  ciclo. → `pos_laudo_ciclos.documento_intimacao_id` nullable; a UI mostra um aviso de
  pendência enquanto estiver vazio.
- **Fim da rodada:** o sistema marca a rodada como concluída e **sugere** a mudança de
  `situacao_processo`, mas **não muda sozinho** — mesma regra de "o sistema não decide, a
  perita decide". → fatia 11 sem dependência aberta.
- **Quesito repetido numa rodada posterior:** entra como **resposta nova**, mantendo a
  anterior visível no histórico; **nunca substitui**. Mesma regra de não sobrescrever
  versão já protocolada. → `pos_laudo_quesitos` permite mais de uma linha para o "mesmo"
  quesito ao longo dos ciclos; a UI mostra o histórico.

**Encaminhadas à Dra. Fernanda (03/09/2026) — travam as fatias 8, 9 e 10:**
- **(a)** AT — a "posição sobre o laudo" precisa de histórico versionado (posição 1 →
  posição 2, com data) ou basta constar em cada documento? *(trava fatia 10)*
- **(b)** Retificação no AT — existe documento curto de "correção" de parecer já
  entregue, ou sempre um parecer novo? E se o erro mexe na conclusão? *(trava fatia 10)*
- **(c)** Numeração dos quesitos suplementares — continua a contagem do laudo (…15, 16)
  ou reinicia por ciclo/parte? *(trava fatia 9)*
- **(d)** "As 3 saídas juntas" — 1 PDF consolidado, 3 PDFs no mesmo protocolo, ou só as
  aplicáveis à rodada? *(trava fatia 8)*
- **(e)** Análise de laudo avulsa no AT — sempre dentro de um caso já acompanhado, ou
  pode ser contratada isolada (precisa de tela de entrada mínima)? *(trava fatia 10)*
