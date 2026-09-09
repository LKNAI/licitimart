-- Schema inicial do Licitimart v1.
--
-- Decisao de modelagem central (ver supabase/plan.md): contratacao (dado
-- do PNCP) e publica e compartilhada -- a mesma contratacao pode ser "Go"
-- para um tenant e "No-Go" para outro, dependendo do catalogo de cada um.
-- Por isso "contratacoes"/"itens_licitacao" nao tem tenant_id e sao de
-- leitura aberta; "analises"/"achados"/"impugnacoes" sao por tenant.
--
-- Escrito seguindo supabase-postgres-best-practices: bigint identity como
-- PK, indice em toda FK, RLS com (select auth.uid()) (nunca por linha),
-- funcao security definer para checagem de tenant em vez de logica
-- ad hoc repetida em cada policy.

create schema if not exists private;

-- ============================================================
-- TENANTS E RBAC (RF-004, RNF-005, RNF-007)
-- ============================================================

create table public.tenants (
  id bigint generated always as identity primary key,
  nome text not null,
  criado_em timestamptz not null default now()
);

create table public.tenant_membros (
  tenant_id bigint not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel text not null check (papel in ('analista', 'gestor_comercial', 'juridico_compliance', 'admin_tenant')),
  criado_em timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index tenant_membros_user_id_idx on public.tenant_membros (user_id);

-- Funcao helper (security definer) para checagem de pertencimento a
-- tenant -- evita repetir a mesma subquery em toda policy, e evita que a
-- policy chame auth.uid() por linha (ver security-rls-performance.md).
create or replace function private.is_tenant_member(p_tenant_id bigint)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.tenant_membros
    where tenant_id = p_tenant_id and user_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_tenant_member(bigint) from public, anon, authenticated;
grant execute on function private.is_tenant_member(bigint) to authenticated;

alter table public.tenants enable row level security;
alter table public.tenants force row level security;

create policy tenants_select_membros on public.tenants
  for select
  to authenticated
  using ((select private.is_tenant_member(id)));

alter table public.tenant_membros enable row level security;
alter table public.tenant_membros force row level security;

create policy tenant_membros_select_proprio on public.tenant_membros
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================
-- CONTRATACOES (PNCP) -- publico, compartilhado entre tenants
-- (RF-001, RF-003, RF-006, RF-019)
-- ============================================================

create table public.contratacoes (
  id bigint generated always as identity primary key,
  numero_controle_pncp text not null unique,
  fonte text not null default 'pncp',
  orgao text,
  municipio_uf text,
  objeto text,
  modalidade text,
  valor_estimado numeric(15, 2),
  data_publicacao timestamptz,
  -- Selo de Confiabilidade (RF-019): procedencia por linha, nunca um
  -- carimbo unico por lote que mentiria sobre parte dos dados.
  confiabilidade text not null default 'fonte_unica'
    check (confiabilidade in ('confirmado', 'fonte_unica', 'divergente')),
  coletado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

create index contratacoes_modalidade_idx on public.contratacoes (modalidade);
create index contratacoes_data_publicacao_idx on public.contratacoes (data_publicacao);

alter table public.contratacoes enable row level security;
alter table public.contratacoes force row level security;

-- Leitura aberta a qualquer usuario autenticado -- e dado publico do PNCP,
-- nao ha isolamento de tenant aqui. Escrita fica reservada ao
-- service_role (o coletor Python usa a service key, que ignora RLS).
create policy contratacoes_select_autenticados on public.contratacoes
  for select
  to authenticated
  using (true);

create table public.itens_licitacao (
  id bigint generated always as identity primary key,
  contratacao_id bigint not null references public.contratacoes (id) on delete cascade,
  descricao text not null,
  quantidade numeric(15, 3),
  valor_unitario_estimado numeric(15, 2)
);

create index itens_licitacao_contratacao_id_idx on public.itens_licitacao (contratacao_id);

alter table public.itens_licitacao enable row level security;
alter table public.itens_licitacao force row level security;

create policy itens_licitacao_select_autenticados on public.itens_licitacao
  for select
  to authenticated
  using (true);

-- ============================================================
-- ANALISES E ACHADOS -- por tenant (RF-006, RF-007, RNF-010, RNF-012)
-- ============================================================

create table public.analises (
  id bigint generated always as identity primary key,
  tenant_id bigint not null references public.tenants (id) on delete cascade,
  contratacao_id bigint not null references public.contratacoes (id) on delete cascade,
  -- "revisao_humana" e resultado de primeira classe, nao fallback de erro
  -- (ERS secao 4.1, regra 2) -- por isso e o default, nunca "go"/"no_go"
  -- por omissao.
  veredito text not null default 'revisao_humana'
    check (veredito in ('go', 'no_go', 'revisao_humana')),
  modelo_usado text,
  versao_prompt text,
  criado_por uuid references auth.users (id),
  criado_em timestamptz not null default now(),
  unique (tenant_id, contratacao_id)
);

create index analises_tenant_id_idx on public.analises (tenant_id);
create index analises_contratacao_id_idx on public.analises (contratacao_id);

alter table public.analises enable row level security;
alter table public.analises force row level security;

create policy analises_select_membros on public.analises
  for select
  to authenticated
  using ((select private.is_tenant_member(tenant_id)));

create policy analises_insert_membros on public.analises
  for insert
  to authenticated
  with check ((select private.is_tenant_member(tenant_id)));

create table public.achados (
  id bigint generated always as identity primary key,
  analise_id bigint not null references public.analises (id) on delete cascade,
  criterio text not null,
  achado text,
  citacao text,
  pagina integer,
  -- Honestidade epistemica (RNF-012): "dado_insuficiente" e um estado de
  -- primeira classe, nunca inferido silenciosamente como achado negativo.
  confianca text not null check (confianca in ('confirmada', 'dado_insuficiente')),
  criado_em timestamptz not null default now()
);

create index achados_analise_id_idx on public.achados (analise_id);

alter table public.achados enable row level security;
alter table public.achados force row level security;

create policy achados_select_membros on public.achados
  for select
  to authenticated
  using ((select private.is_tenant_member((select tenant_id from public.analises where id = analise_id))));

-- ============================================================
-- IMPUGNACOES -- por tenant (RF-017, RN-006)
-- ============================================================

create table public.impugnacoes (
  id bigint generated always as identity primary key,
  tenant_id bigint not null references public.tenants (id) on delete cascade,
  analise_id bigint references public.analises (id) on delete set null,
  contexto jsonb not null,
  minuta_markdown text not null,
  -- RN-006: minuta nunca e protocolada automaticamente. O status inicial
  -- e sempre "rascunho"; so um humano avanca para "revisado"/"protocolado".
  status text not null default 'rascunho'
    check (status in ('rascunho', 'revisado', 'protocolado')),
  gerado_por text not null default 'template_deterministico',
  criado_em timestamptz not null default now()
);

create index impugnacoes_tenant_id_idx on public.impugnacoes (tenant_id);
create index impugnacoes_analise_id_idx on public.impugnacoes (analise_id);

alter table public.impugnacoes enable row level security;
alter table public.impugnacoes force row level security;

create policy impugnacoes_select_membros on public.impugnacoes
  for select
  to authenticated
  using ((select private.is_tenant_member(tenant_id)));

create policy impugnacoes_insert_membros on public.impugnacoes
  for insert
  to authenticated
  with check ((select private.is_tenant_member(tenant_id)));

create policy impugnacoes_update_membros on public.impugnacoes
  for update
  to authenticated
  using ((select private.is_tenant_member(tenant_id)))
  with check ((select private.is_tenant_member(tenant_id)));

-- ============================================================
-- CATALOGO DO TENANT -- por tenant (RF-004)
-- ============================================================

create table public.tenant_catalogo_itens (
  id bigint generated always as identity primary key,
  tenant_id bigint not null references public.tenants (id) on delete cascade,
  descricao text not null,
  cnae text,
  criado_em timestamptz not null default now()
);

create index tenant_catalogo_itens_tenant_id_idx on public.tenant_catalogo_itens (tenant_id);

alter table public.tenant_catalogo_itens enable row level security;
alter table public.tenant_catalogo_itens force row level security;

create policy tenant_catalogo_itens_crud_membros on public.tenant_catalogo_itens
  for all
  to authenticated
  using ((select private.is_tenant_member(tenant_id)))
  with check ((select private.is_tenant_member(tenant_id)));

-- ============================================================
-- CONSUMO DE TOKENS -- por tenant (RF-015)
-- ============================================================

create table public.consumo_tokens (
  id bigint generated always as identity primary key,
  tenant_id bigint not null references public.tenants (id) on delete cascade,
  user_id uuid references auth.users (id),
  agente text not null,
  tokens_entrada integer not null default 0,
  tokens_saida integer not null default 0,
  criado_em timestamptz not null default now()
);

create index consumo_tokens_tenant_id_idx on public.consumo_tokens (tenant_id);

alter table public.consumo_tokens enable row level security;
alter table public.consumo_tokens force row level security;

create policy consumo_tokens_select_membros on public.consumo_tokens
  for select
  to authenticated
  using ((select private.is_tenant_member(tenant_id)));

-- ============================================================
-- INGESTAO -- procedencia e pendencias (RNF-013), visibilidade de
-- infraestrutura para o Admin Licitimart (PU-05), nao para tenants.
-- RLS habilitada sem nenhuma policy para "authenticated": nega tudo por
-- padrao. So o service_role (usado pelo coletor Python) enxerga --
-- service_role ignora RLS no Supabase, entao nao precisa de policy.
-- ============================================================

create table public.manifestos_ingestao (
  id bigint generated always as identity primary key,
  fonte text not null default 'pncp',
  consulta jsonb not null,
  contagem integer not null,
  sha256 text,
  coletado_em timestamptz not null default now()
);

alter table public.manifestos_ingestao enable row level security;
alter table public.manifestos_ingestao force row level security;

create table public.pendencias_ingestao (
  id bigint generated always as identity primary key,
  fonte text not null default 'pncp',
  modalidade integer,
  pagina integer,
  data_inicial date,
  data_final date,
  motivo text check (motivo in ('erro_taxa', 'erro_rede', 'outro')),
  tentativas_totais integer not null default 1,
  primeira_vez_em timestamptz not null default now(),
  resolvida_em timestamptz
);

alter table public.pendencias_ingestao enable row level security;
alter table public.pendencias_ingestao force row level security;
