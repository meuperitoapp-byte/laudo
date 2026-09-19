-- ============================================================================
-- Financeiro — Saídas (despesas) + Nota fiscal por processo
-- ============================================================================
-- Pedido da Dra. Fernanda depois de ver o painel Financeiro: (1) falta a
-- parte de saídas pra fechar a contabilidade, (2) marcar se a nota fiscal
-- foi emitida e o número, por processo.

-- ---- 1) Saídas ----
-- Ledger genérico de despesas do negócio, independente de processo (repasse
-- a especialista, despesa operacional, imposto/taxa etc.) — sem vínculo com
-- processos por enquanto; se ela pedir despesa amarrada a um caso específico
-- depois, entra um processo_id nullable numa migration própria.
create table public.despesas (
  id          uuid primary key default gen_random_uuid(),
  data        date not null,
  categoria   text,      -- catálogo editável (Repasse a especialista, Despesa operacional, Imposto/Taxa, Outro) — texto livre sem CHECK, mesmo padrão de situacao_financeira
  descricao   text not null,
  valor       numeric(14, 2) not null,
  criado_por  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.despesas is
  'Saídas financeiras do negócio (não amarradas a processo) — repasse a especialistas, despesas operacionais, impostos/taxas etc. Fecha o painel Financeiro com o lado das saídas, que só tinha entradas até aqui.';

create index idx_despesas_data on public.despesas (data);
create index idx_despesas_categoria on public.despesas (categoria);

create trigger trg_set_updated_at
  before update on public.despesas
  for each row execute function public.set_updated_at();

alter table public.despesas enable row level security;

create policy "despesas_full_access" on public.despesas
  for all to authenticated using (true) with check (true);

-- ---- 2) Nota fiscal, por processo ----
alter table public.processos
  add column nota_fiscal_emitida text check (nota_fiscal_emitida in ('sim', 'nao')),
  add column nota_fiscal_numero  text;

comment on column public.processos.nota_fiscal_emitida is
  '''sim''/''nao'' — null = ainda não registrado (não presume "não emitida" por omissão). Preenchido manualmente pela perita/secretária, nunca inferido pelo sistema.';
comment on column public.processos.nota_fiscal_numero is
  'Número da nota fiscal — só tem sentido quando nota_fiscal_emitida = ''sim'', mas fica sem CHECK de consistência (aplicação garante isso na tela, mesmo padrão usado nos outros pares valor/estado do sistema).';
