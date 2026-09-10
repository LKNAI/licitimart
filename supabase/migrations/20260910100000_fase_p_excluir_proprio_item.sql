-- Fase P (correção pós-teste real): a RPC original nao excluia o
-- proprio item da lista de comparaveis -- testando contra a base real,
-- o item buscado aparecia na propria lista de "itens parecidos" (as
-- vezes quase identico, por reformulacao minima de HTML/texto), o que
-- contaminaria a amostra (comparar um item contra ele mesmo como se
-- fosse dado de mercado independente).

-- Assinatura muda (novo parâmetro) -- overload antigo (text, int) fica
-- órfão se não for removido explicitamente.
drop function if exists public.itens_comparaveis_semanticos(text, int);

create or replace function public.itens_comparaveis_semanticos(
  p_embedding text,
  p_limite int default 50,
  p_excluir_id bigint default null
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
    and (p_excluir_id is null or i.id <> p_excluir_id)
  order by i.descricao_embedding operator(extensions.<=>) (p_embedding::extensions.vector(384))
  limit p_limite;
$$;

revoke execute on function public.itens_comparaveis_semanticos(text, int, bigint) from public, anon;
grant execute on function public.itens_comparaveis_semanticos(text, int, bigint) to authenticated;
