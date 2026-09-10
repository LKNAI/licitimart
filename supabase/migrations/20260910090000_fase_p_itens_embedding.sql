-- Fase P: Consultor de Precificacao semantico (RF-008). Embedding POR
-- ITEM (nao por contratacao inteira -- objeto_embedding de Fase J e
-- granularidade errada pra comparar preco de item especifico).

alter table public.itens_licitacao add column descricao_embedding extensions.vector(384);

create index itens_licitacao_descricao_embedding_idx on public.itens_licitacao
  using hnsw (descricao_embedding extensions.vector_cosine_ops);

-- Busca vetorial pura (sem RRF -- nao ha componente de texto aqui, so
-- similaridade semantica entre descricoes de item). Retorna a distancia
-- de cosseno junto -- quem chama decide o corte de "parecido o
-- suficiente" (ver precificacao.ts, DISTANCIA_MAXIMA), nao fixado aqui
-- no SQL, pra poder ajustar sem nova migration.
create or replace function public.itens_comparaveis_semanticos(
  p_embedding text,
  p_limite int default 50
)
returns table (
  descricao text,
  valor_unitario_estimado numeric,
  distancia double precision
)
language sql
stable
set search_path = ''
as $$
  select i.descricao, i.valor_unitario_estimado,
         i.descricao_embedding operator(extensions.<=>) (p_embedding::extensions.vector(384)) as distancia
  from public.itens_licitacao i
  where i.descricao_embedding is not null
    and i.valor_unitario_estimado > 0
  order by i.descricao_embedding operator(extensions.<=>) (p_embedding::extensions.vector(384))
  limit p_limite;
$$;

revoke execute on function public.itens_comparaveis_semanticos(text, int) from public, anon;
grant execute on function public.itens_comparaveis_semanticos(text, int) to authenticated;
