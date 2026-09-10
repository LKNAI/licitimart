-- Fase H: Diff de Retificacao real (RF-018).
--
-- Dado publico e compartilhado, mesmo padrao de contratacoes/
-- itens_licitacao -- nao e por tenant, e fato objetivo sobre o edital.
-- Escrita reservada ao coletor Python (service_role, ignora RLS).

create table public.retificacoes (
  id bigint generated always as identity primary key,
  contratacao_id bigint not null references public.contratacoes (id) on delete cascade,
  numero_controle_pncp text not null,
  campo text not null
    check (campo in ('objeto', 'modalidade', 'valor_estimado', 'data_publicacao', 'orgao', 'municipio_uf')),
  valor_anterior text,
  valor_novo text,
  detectado_em timestamptz not null default now()
);

create index retificacoes_contratacao_id_idx on public.retificacoes (contratacao_id);
create index retificacoes_detectado_em_idx on public.retificacoes (detectado_em);

alter table public.retificacoes enable row level security;
alter table public.retificacoes force row level security;

create policy retificacoes_select_autenticados on public.retificacoes
  for select
  to authenticated
  using (true);
