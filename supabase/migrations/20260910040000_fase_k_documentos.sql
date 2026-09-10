-- Fase K: Extracao de PDF/DOCX nato-digital (RF-002).
--
-- Bucket privado, mesmo padrao de contratacoes/itens_licitacao: leitura
-- para qualquer autenticado (documento publico do PNCP, nao segredo de
-- tenant), escrita so via service_role (ignora RLS, usado pelo coletor).

insert into storage.buckets (id, name, public)
values ('editais-documentos', 'editais-documentos', false)
on conflict (id) do nothing;

create policy editais_documentos_select_autenticados on storage.objects
  for select
  to authenticated
  using (bucket_id = 'editais-documentos');

create table public.documentos_contratacao (
  id bigint generated always as identity primary key,
  contratacao_id bigint not null references public.contratacoes (id) on delete cascade,
  sequencial_documento integer not null,
  titulo text,
  tipo_documento text,
  storage_path text not null,
  texto_extraido text,
  -- RF-020: "requer_ocr" e estado de primeira classe (PDF escaneado sem
  -- camada de texto), nunca confundido com "erro" nem com texto vazio
  -- silencioso.
  status_extracao text not null check (status_extracao in ('extraido_nativo', 'requer_ocr', 'erro')),
  paginas integer,
  coletado_em timestamptz not null default now(),
  unique (contratacao_id, sequencial_documento)
);

create index documentos_contratacao_contratacao_id_idx on public.documentos_contratacao (contratacao_id);

alter table public.documentos_contratacao enable row level security;
alter table public.documentos_contratacao force row level security;

create policy documentos_contratacao_select_autenticados on public.documentos_contratacao
  for select
  to authenticated
  using (true);
