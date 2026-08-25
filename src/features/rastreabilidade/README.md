# rastreabilidade

Vincular uma conclusão sensível (campo com `requer_confirmacao_perito = true`) aos elementos
que a sustentam — CLAUDE.md > "Regra: rastreabilidade". Implementado dentro do motor de
preenchimento, não como tela própria.

Tabela relacionada: `resposta_evidencias`. Sem migration nova — o schema já existia.

## Onde vive o código

- `actions.ts` (este diretório) — `vincularEvidencia` (achado OU documento) e
  `desvincularEvidencia`.
- `src/features/preenchimento/rastreabilidade-tipos.ts` — tipos compartilhados
  (`RespostaPersistida`, `AchadoParaVinculo`, `DocumentoParaVinculo`, `DadosRastreabilidade`).
- `src/features/preenchimento/rastreabilidade-evidencias.tsx` — o widget "Elementos que
  sustentam esta conclusão" (client), plugado em `campo-field.tsx`.
- `src/app/(dashboard)/processos/[id]/preenchimento/[secaoId]/page.tsx` — monta os dados
  (achados = todas as respostas não-vazias do processo, com resumo via `valorExibivelCampo`;
  documentos do processo; vínculos já existentes; e o snapshot persistido de cada campo, pra
  gating).

## Por que a FK de resposta_evidencias exige mais que só o checkbox marcado

`resposta_evidencias.resposta_id` referencia uma linha JÁ SALVA em `respostas_processo` — não
existe id nenhum enquanto a resposta só existe como rascunho no estado local do formulário
(`SecaoWorkspace`). Por isso vincular evidência não libera só com
`requer_confirmacao_perito` marcado na hora — a UI (`campo-field.tsx`) exige as 3 coisas ao
mesmo tempo:

1. já existe uma linha salva em `respostas_processo` pra este campo (`respostasPersistidas`);
2. essa linha salva tem `confirmado_pelo_perito = true`;
3. o que está na tela AGORA (valor marcado, confirmação, texto de detalhamento) é
   IDÊNTICO ao que está salvo — senão a evidência ficaria presa a uma versão da conclusão
   que já mudou e ainda nem foi salva de novo.

Enquanto isso não bate, o widget mostra só um aviso ("Salve esta seção com a conclusão
confirmada...") em vez da UI de vínculo — nunca deixa tentar vincular a um `resposta_id`
inexistente.

## Regras aplicadas

- **Achados candidatos**: qualquer resposta não-vazia de QUALQUER seção do processo (não só
  a atual) — a regra do CLAUDE.md fala em "elementos clínicos e ocupacionais", que podem
  estar em seções completamente diferentes da conclusão (ex.: nexo causal em XX referenciando
  achado do exame físico em XVI).
- **Sem duplicar vínculo**: achados/documentos já vinculados à mesma conclusão somem da lista
  de "vincular" (não impedido por constraint no banco, só uma checagem de UX que evita
  clique duplicado sem querer).
- **Sem texto narrativo**: como combinado, isso é só dado estruturado pra consulta — não
  entra em nenhum `texto_narrativo` gerado. Uso futuro: defesa de metodologia e/ou anexo na
  geração do laudo final.

## Mudança em campo-field.tsx: aditiva

Mesma verificação de sempre: os 4 blocos de renderização originais (`selecao_unica`,
`selecao_multipla`, `texto_livre`, `tabela`), o "Detalhamento" e a recursão pros sub-campos
condicionais não tiveram uma linha de lógica alterada. Só entraram: a prop nova
`rastreabilidade` (threadada até os sub-campos, igual `tipoLaudoId`/`reutilizaveis` já
eram), o cálculo de `podeVincularEvidencias`/`respostaPersistida` (variáveis novas, não
tocam em nada existente) e o `<RastreabilidadeEvidencias>` inserido depois do checkbox de
confirmação — em bloco condicional próprio (`campo.requer_confirmacao_perito &&`), então
não afeta nenhum campo comum.
