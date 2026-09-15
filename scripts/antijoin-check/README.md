# Verificação do anti-join (Módulo Pós-Laudo)

Testa a regra mais importante do Módulo Pós-Laudo: um documento **superveniente**
(anexado depois do laudo já protocolado) nunca pode entrar na Matriz de Documentos
Analisados nem na contagem `{{total_documentos}}` de um laudo gerado depois — nem no
original, nem em nenhuma versão futura.

## Por que isso importa mais do que a maioria dos testes deste repositório

Se essa regra quebrar, **não dá nenhum sinal visível**. O PDF sai com aparência
normal — só que citando, como se já existisse à época da perícia, um documento que na
verdade chegou depois. Num laudo médico-legal isso é um vício grave, e ninguém
percebe olhando o próprio documento. É exatamente o tipo de regra que merece um teste
de regressão versionado, mesmo sem ter uma tela ou fluxo de usuário para "clicar e
ver" — a garantia mora inteira dentro de `compilarLaudo`
(`src/features/geracao-laudo/compilar.ts`), num filtro que exclui do acervo qualquer
`documento_id` presente em `pos_laudo_documentos` de qualquer ciclo do processo.

## Como funciona

`run.ts` não reimplementa nenhuma lógica de negócio — importa e chama diretamente as
mesmas Server Actions que a tela usa:

1. Sobe 2 documentos "originais" (`uploadDocumento`).
2. Gera o laudo v1 (`gerarLaudo`) e lê a Matriz de Documentos compilada.
3. Marca v1 como protocolado (`marcarLaudoProtocolado`) e confirma a Conclusão
   Vigente inicial (`definirConclusaoVigenteInicial` — pré-requisito pra abrir ciclo,
   ver aviso abaixo).
4. Abre um ciclo de pós-laudo (`abrirCicloPosLaudo`) e sobe um documento como
   **superveniente** (`adicionarDocumentoSuperveniente`).
5. Gera o laudo v2 (`gerarLaudo` de novo) e compara a Matriz compilada de v1 e v2 —
   têm que ser **byte-idênticas**, e o superveniente não pode aparecer em nenhuma das
   duas.
6. Baixa os dois PDFs pra inspeção visual opcional.
7. **Sempre** desfaz tudo que criou (`try/finally`) — documentos, laudos gerados,
   ciclo, conclusão vigente e as respostas de seção-stub usadas só pra viabilizar a
   geração. O processo de teste volta exatamente ao estado em que estava antes.

Roda contra um processo de teste **já existente** no banco ("João da Silva Teste",
`f9d9e4e6-5dd6-4463-b320-481e326d73ea`) — não cria nem apaga o processo em si.

## Por que precisa de um "shim"

As Server Actions reais chamam `createClient()` de `@/lib/supabase/server`, que
depende de `next/headers` (cookies de uma requisição Next.js real) — não existe fora
do runtime do Next. `tsconfig.script.json` substitui, só para este script, três
módulos:

- `@/lib/supabase/server` → `shims/supabase-server.ts`, que usa a **service role key**
  em vez de sessão de usuário (bypassa RLS, igual um admin do banco).
- `next/cache` → no-op (`revalidatePath` não tem efeito fora do Next, e não faz falta
  aqui).
- `next/navigation` → no-op que lança um erro reconhecível (`abrirCicloPosLaudo`
  chama `redirect()` só depois de já ter gravado no banco — o script ignora esse erro
  especificamente).

Nenhum outro import muda — o resto do código de produção roda sem alteração.

## Como rodar

Requer `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` (não fica lá por padrão — é uma
chave que ignora toda proteção de segurança do banco, então só deve existir no disco
enquanto está em uso; gere uma nova em Supabase → Settings → API sempre que for
rodar, e apague a linha do `.env.local` depois):

```
npx tsx --tsconfig scripts/antijoin-check/tsconfig.script.json scripts/antijoin-check/run.ts
```

## Última verificação

**18/09/2026** — ✅ anti-join OK. Matriz byte-idêntica entre v1 e v2, superveniente
ausente das duas. Achado registrado: abrir ciclo de pós-laudo também exige a
Conclusão Vigente confirmada (não só o laudo protocolado) — já documentado desde a
fatia 4 do módulo, mas faltava no roteiro de teste manual original (corrigido em
`docs/plano-modulo-pos-laudo.md`).
