-- Fase R: completa RF-004 (Cadastro de Perfil Tenant) -- faltava NCM,
-- upload de atestado de capacidade tecnica e certidoes ativas. CRUD puro
-- + Storage, sem LLM.

alter table public.tenant_catalogo_itens add column ncm text;

-- Atestados de capacidade tecnica: upload proprio do tenant (distinto do
-- bucket editais-documentos, que e documento coletado do PNCP pelo
-- coletor -- escrita so service_role). Aqui o proprio tenant escreve.
create table public.tenant_atestados (
  id bigint generated always as identity primary key,
  tenant_id bigint not null references public.tenants (id) on delete cascade,
  titulo text not null,
  storage_path text not null,
  criado_em timestamptz not null default now()
);

create index tenant_atestados_tenant_id_idx on public.tenant_atestados (tenant_id);

alter table public.tenant_atestados enable row level security;
alter table public.tenant_atestados force row level security;

create policy tenant_atestados_crud_membros on public.tenant_atestados
  for all
  to authenticated
  using ((select private.is_tenant_member(tenant_id)))
  with check ((select private.is_tenant_member(tenant_id)));

insert into storage.buckets (id, name, public)
values ('tenant-atestados', 'tenant-atestados', false)
on conflict (id) do nothing;

-- Path sempre "{tenant_id}/{arquivo}" -- RLS do Storage checa o tenant
-- do primeiro segmento do path, nao um bucket global como
-- editais-documentos (aquele e dado publico do PNCP; este e documento
-- proprio do tenant, nunca visivel a outro tenant).
create policy tenant_atestados_select_membros on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'tenant-atestados'
    and (select private.is_tenant_member((split_part(name, '/', 1))::bigint))
  );

create policy tenant_atestados_insert_membros on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'tenant-atestados'
    and (select private.is_tenant_member((split_part(name, '/', 1))::bigint))
  );

create policy tenant_atestados_delete_membros on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'tenant-atestados'
    and (select private.is_tenant_member((split_part(name, '/', 1))::bigint))
  );

-- Certidoes ativas: tipo + validade, status (ativa/vencida) calculado a
-- partir da data de validade na hora de exibir, nunca guardado como
-- booleano que pode ficar defasado sozinho.
create table public.tenant_certidoes (
  id bigint generated always as identity primary key,
  tenant_id bigint not null references public.tenants (id) on delete cascade,
  tipo text not null,
  numero text,
  validade date not null,
  criado_em timestamptz not null default now()
);

create index tenant_certidoes_tenant_id_idx on public.tenant_certidoes (tenant_id);

alter table public.tenant_certidoes enable row level security;
alter table public.tenant_certidoes force row level security;

create policy tenant_certidoes_crud_membros on public.tenant_certidoes
  for all
  to authenticated
  using ((select private.is_tenant_member(tenant_id)))
  with check ((select private.is_tenant_member(tenant_id)));
