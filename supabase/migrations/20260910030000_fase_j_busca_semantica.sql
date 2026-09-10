-- Fase J: Prospeccao Semantica (RF-005), busca hibrida palavra-chave +
-- embedding. Embedding local (fastembed/transformers.js, sem chave de
-- LLM) -- ver plan_fase_j.md para a decisao completa. Escopo desta fase:
-- so contratacoes.objeto (unico texto estruturado confiavel sem RF-002).

create extension if not exists vector with schema extensions;

alter table public.contratacoes add column objeto_embedding extensions.vector(384);

create index contratacoes_objeto_fts_idx on public.contratacoes
  using gin (to_tsvector('portuguese', coalesce(objeto, '')));

create index contratacoes_objeto_embedding_idx on public.contratacoes
  using hnsw (objeto_embedding extensions.vector_cosine_ops);

-- Reciprocal Rank Fusion (RRF) -- combina o ranking de full-text com o
-- ranking vetorial sem precisar normalizar/pesar os dois scores na mao
-- (que sao escalas diferentes e nao comparaveis diretamente).
--
-- p_embedding e text (representacao "[0.1,0.2,...]"), nao vector direto:
-- e o padrao para supabase-js chamar RPC com pgvector -- o parametro
-- json-serializado do PostgREST nao faz cast automatico para vector.
create or replace function public.buscar_contratacoes_hibrida(
  p_texto text,
  p_embedding text,
  p_limite int default 20
)
returns table (
  id bigint,
  numero_controle_pncp text,
  objeto text,
  orgao text,
  municipio_uf text,
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
    select c.id,
           row_number() over (
             order by ts_rank(to_tsvector('portuguese', coalesce(c.objeto, '')), plainto_tsquery('portuguese', p_texto)) desc
           ) as posicao
    from public.contratacoes c
    where to_tsvector('portuguese', coalesce(c.objeto, '')) @@ plainto_tsquery('portuguese', p_texto)
    limit 50
  ),
  busca_vetor as (
    select c.id,
           row_number() over (
             order by c.objeto_embedding operator(extensions.<=>) (select v from vetor)
           ) as posicao
    from public.contratacoes c
    where c.objeto_embedding is not null
    order by c.objeto_embedding operator(extensions.<=>) (select v from vetor)
    limit 50
  ),
  combinado as (
    select coalesce(t.id, v.id) as id,
           (coalesce(1.0 / (60 + t.posicao), 0) + coalesce(1.0 / (60 + v.posicao), 0)) as score
    from busca_texto t
    full outer join busca_vetor v on t.id = v.id
  )
  select c.id, c.numero_controle_pncp, c.objeto, c.orgao, c.municipio_uf, combinado.score
  from combinado
  join public.contratacoes c on c.id = combinado.id
  order by combinado.score desc
  limit p_limite;
$$;

revoke execute on function public.buscar_contratacoes_hibrida(text, text, int) from public, anon;
grant execute on function public.buscar_contratacoes_hibrida(text, text, int) to authenticated;
