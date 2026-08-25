# geracao-laudo

Geração do laudo final compilado (PDF + Word), com versionamento — implementado.

Rota: `app/(dashboard)/processos/[id]/laudo/page.tsx` (server component — roda o compilador
pra decidir se pode gerar, lista as versões já geradas com signed URLs) + `GerarLaudoPanel`
(client, `gerar-laudo-panel.tsx`) com o botão "Gerar novo laudo" e a lista de versões.

Tabelas relacionadas: `laudos_gerados`, `documentos` (assinatura/logomarca — `processo_id`
nulo). Precisa da migration `20260825090000_storage_bucket_laudos_gerados.sql` (bucket
`laudos-gerados`, privado — SQL Editor do Supabase, mesmo fluxo das anteriores).

## Arquitetura: um modelo intermediário, dois renderizadores burros

Word e PDF são gerados a partir do **mesmo** `ModeloLaudo` (`modelo.ts`) — nunca duas
representações mantidas separadamente. Foi a razão de escolher `pdfmake` em vez de
Puppeteer/HTML pro PDF: um modelo único (lista de blocos: parágrafo, tabela, quesitos)
consumido por `renderizar-docx.ts` e `renderizar-pdf.ts`, cada um só "burro-percorre" os
mesmos blocos — garante paridade de conteúdo por construção, não por disciplina manual.

## Arquivos

- `modelo.ts` — tipos do modelo intermediário (`ModeloLaudo`, `SecaoCompilada`,
  `BlocoParagrafo`/`BlocoTabela`/`BlocoQuesitos`, `ResultadoCompilacao`).
- `compilar.ts` — `compilarLaudo(processoId)`: busca tudo no banco, monta o modelo E o
  `snapshot` (`SnapshotRespostas`, congelado em `laudos_gerados.snapshot_respostas`).
  Reaproveita as funções já validadas do preenchimento (`gerarNarrativoSecao`,
  `construirContexto`, `avaliarCondicao`) — preview do preenchimento e laudo final nunca
  "leem" a mesma resposta de dois jeitos diferentes. Retorna um de 3 estados: `ok`, `erro`,
  ou **`pendente_revisao`** (seção com conteúdo que nunca foi salva explicitamente — bloqueia
  a geração, não gera com aviso; ver comentário no topo do arquivo).
- `cabecalho.ts` — endereçamento formal ao juízo (3 variações por `processos.tipo_vara`),
  processo/partes. Só se aplica a `tipo_trabalho = 'pericia_judicial'`.
- `apresentacao.ts` — parágrafo de identificação do perito + metodologia. **Ainda
  placeholder** — a redação oficial não foi confirmada.
- `renderizar-docx.ts` / `renderizar-pdf.ts` — os dois renderizadores. `pdfmake-printer.d.ts`
  tem os tipos que faltam no pacote (só publica tipos pra API de browser).
- `dimensoes-imagem.ts` — leitor de largura/altura PNG/JPEG escrito à mão (a lib pronta
  testada tinha CVE conhecida em parsers de formato que nem usamos).
- `ativos-globais.ts` — busca assinatura da perita / logomarca da cliente
  (`documentos.tipo = 'assinatura_perito'/'logomarca'`, `processo_id` nulo) e baixa os bytes.
  **Sem tela de upload ainda** (fica pra "Configurações") — hoje sempre volta null; a
  mecânica de embutir já está pronta.
- `actions.ts` — Server Action `gerarLaudo`: compila, renderiza os dois formatos, sobe pro
  Storage, grava a versão em `laudos_gerados` com o snapshot.
- `constants.ts` — nome do bucket (`BUCKET_LAUDOS_GERADOS`), num arquivo à parte porque um
  arquivo `"use server"` só pode exportar função async.

## Regras aplicadas

- **Exibição crítica**: o modelo só contém o que foi efetivamente marcado — nunca opção em
  branco, nunca label de campo cru. Tabelas só trazem linhas preenchidas.
- **Cabeçalho formal**: sempre no topo, antes de qualquer seção, endereçamento + Apresentação
  fixos (não vêm de `secoes`, são blocos próprios).
- **Ordem dos blocos**: seções do tipo_laudo na ordem de `secoes.ordem`, com o bloco de
  Quesitos injetado na posição da seção estrutural `respostas_quesitos` (mesmo código nos 3
  tipos mapeados) — não mais sempre no fim, que jogava Quesitos depois de Encerramento e
  separava o texto de encerramento da assinatura.
- **O sistema não decide**: campo `requer_confirmacao_perito` sem confirmação nunca entra em
  texto nenhum (herdado do motor de narrativo). Seção com conteúdo mas nunca salva
  explicitamente bloqueia a geração inteira (`pendente_revisao`) — exceto a seção de
  Quesitos, que é revisada na própria tela de Quesitos, não faz sentido cobrar
  `respostas_secao` dela.
- **Assinatura/logomarca**: logomarca vira cabeçalho repetido em toda página; assinatura vai
  logo após a seção de Encerramento; sem asset cadastrado, cai num fallback de linha em
  branco pra assinatura manual.
- **Versionamento**: `versao` é sempre a maior já usada pro processo + 1 — nunca sobrescreve.
  Upload dos dois arquivos primeiro, só grava a linha em `laudos_gerados` se os dois
  subirem; desfaz o upload se o insert falhar (nunca deixa arquivo órfão no Storage nem
  linha sem arquivo).
- **Bucket próprio**: `laudos-gerados`, separado de `documentos-processos` — documento FONTE
  que a perita anexa é conceito diferente de documento OUTPUT que o sistema gera.

## Fora de escopo / pendências conhecidas

- Redação oficial do parágrafo de Apresentação — placeholder claramente marcado até a Dra.
  confirmar o texto (provavelmente varia por tipo de laudo).
- Tela de "Configurações" pra upload de assinatura/logomarca — sem ela, esses dois campos
  ficam sempre vazios na prática.
- Documentos processuais (PDFs/Word anexados) só aparecem **listados** na Matriz de
  Documentos — mesclar o arquivo inteiro dentro do gerado não foi implementado.
- Concorrência: dois cliques em "Gerar novo laudo" ao mesmo tempo podem colidir na mesma
  `versao` (constraint `unique(processo_id, versao)` barra o segundo insert) — o segundo
  clique falha com erro e pode ser refeito; não implementado retry/lock automático (risco
  baixo pra 2 usuárias).
