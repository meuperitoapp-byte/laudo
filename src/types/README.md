# types

Tipos correspondentes ao schema em
`supabase/migrations/20260821120000_schema_inicial.sql`. Escritos à mão (a CLI
do Supabase não está instalada) mas no formato que `supabase gen types
typescript` produziria — se a CLI for instalada depois, dá pra regenerar sem
quebrar o resto do app.

- **`enums.ts`** — union types das colunas `text` + `CHECK` (ex.: `TipoCampo`,
  `StatusProcesso`).
- **`json-fields.ts`** — interfaces das colunas `jsonb` (`CondicaoVisibilidade`,
  `OpcaoCampo`, `ConfigTabela`, `ValorSelecionado`, `SnapshotRespostas`, etc.).
- **`database.ts`** — uma `Row`/`Insert`/`Update` por tabela, mais o tipo
  `Database` usado em `createClient<Database>()` (ver `src/lib/supabase/client.ts`).
- **`index.ts`** — barrel: `import { ProcessosRow, TipoCampo, ... } from '@/types'`.

Se o schema mudar (nova migration), atualizar estes arquivos junto — nada aqui
é gerado automaticamente ainda.
