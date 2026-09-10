-- Fase S: busca semantica sobre o texto do edital, nao so o objeto da
-- contratacao (extensao de RF-005). Chunk por PAGINA (reaproveita
-- paginas_offsets, Fase M) -- documento inteiro nao cabe num embedding
-- so sem perder especificidade.

create table public.documento_paginas (
  id bigint generated always as identity primary key,
  documento_id bigint not null references public.documentos_contratacao (id) on delete cascade,
  contratacao_id bigint not null references public.contratacoes (id) on delete cascade,
  -- null = DOCX ou outro formato sem paginacao fixa (documento inteiro
  -- como um chunk so) -- nunca inventa numero de pagina.
  pagina integer,
  texto text not null,
  embedding extensions.vector(384),
  criado_em timestamptz not null default now(),
  unique (documento_id, pagina)
);

create index documento_paginas_contratacao_id_idx on public.documento_paginas (contratacao_id);

create index documento_paginas_fts_idx on public.documento_paginas
  using gin (to_tsvector('portuguese', texto));

create index documento_paginas_embedding_idx on public.documento_paginas
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.documento_paginas enable row level security;
alter table public.documento_paginas force row level security;

-- Mesmo padrao de documentos_contratacao: leitura aberta a qualquer
-- autenticado (dado publico do PNCP), escrita tambem aberta a
-- autenticado (caminho on-demand em Node escreve com a sessao do
-- proprio usuario, Fase N) -- sem tenant, sem segredo.
create policy documento_paginas_select_autenticados on public.documento_paginas
  for select
  to authenticated
  using (true);

create policy documento_paginas_insert_autenticados on public.documento_paginas
  for insert
  to authenticated
  with check (true);

create or replace function public.buscar_paginas_documento(
  p_texto text,
  p_embedding text,
  p_limite int default 10
)
returns table (
  documento_id bigint,
  contratacao_id bigint,
  pagina integer,
  trecho text,
  score double precision
)
language sql
stable
set search_path = ''
as $$
  with vetor as (
    select p_embedding::extensions.vector(384) as v
  ),
  busca_texto as (
    select dp.id,
           row_number() over (
             order by ts_rank(to_tsvector('portuguese', dp.texto), plainto_tsquery('portuguese', p_texto)) desc
           ) as posicao
    from public.documento_paginas dp
    where to_tsvector('portuguese', dp.texto) @@ plainto_tsquery('portuguese', p_texto)
    limit 50
  ),
  busca_vetor as (
    select dp.id,
           row_number() over (
             order by dp.embedding operator(extensions.<=>) (select v from vetor)
           ) as posicao
    from public.documento_paginas dp
    where dp.embedding is not null
    order by dp.embedding operator(extensions.<=>) (select v from vetor)
    limit 50
  ),
  combinado as (
    select coalesce(t.id, v.id) as id,
           (coalesce(1.0 / (60 + t.posicao), 0) + coalesce(1.0 / (60 + v.posicao), 0)) as score
    from busca_texto t
    full outer join busca_vetor v on t.id = v.id
  )
  select dp.documento_id, dp.contratacao_id, dp.pagina,
         left(dp.texto, 400) as trecho, combinado.score
  from combinado
  join public.documento_paginas dp on dp.id = combinado.id
  order by combinado.score desc
  limit p_limite;
$$;

revoke execute on function public.buscar_paginas_documento(text, text, int) from public, anon;
grant execute on function public.buscar_paginas_documento(text, text, int) to authenticated;
