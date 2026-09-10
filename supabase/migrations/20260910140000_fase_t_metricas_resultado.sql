-- Fase T: metricas_contratacoes (Fase O) passa a contar tambem
-- resultado real da disputa -- sem isso, "taxa de vitoria" nao existe,
-- so contagem de decisao Go.

drop function if exists public.metricas_contratacoes(bigint);

create or replace function public.metricas_contratacoes(p_tenant_id bigint)
returns table (
  total bigint,
  valor_total numeric,
  maior_valor numeric,
  go_total bigint,
  revisao_total bigint,
  no_go_total bigint,
  ganhou_total bigint,
  perdeu_total bigint,
  aguardando_total bigint
)
language sql
stable
set search_path = ''
as $$
  select
    count(*) as total,
    coalesce(sum(c.valor_estimado), 0) as valor_total,
    coalesce(max(c.valor_estimado), 0) as maior_valor,
    count(*) filter (where coalesce(a.veredito, 'revisao_humana') = 'go') as go_total,
    count(*) filter (where coalesce(a.veredito, 'revisao_humana') = 'revisao_humana') as revisao_total,
    count(*) filter (where coalesce(a.veredito, 'revisao_humana') = 'no_go') as no_go_total,
    count(*) filter (where a.veredito = 'go' and a.resultado = 'ganhou') as ganhou_total,
    count(*) filter (where a.veredito = 'go' and a.resultado = 'perdeu') as perdeu_total,
    count(*) filter (where a.veredito = 'go' and (a.resultado is null or a.resultado = 'aguardando')) as aguardando_total
  from public.contratacoes c
  left join public.analises a on a.contratacao_id = c.id and a.tenant_id = p_tenant_id;
$$;

revoke execute on function public.metricas_contratacoes(bigint) from public, anon;
grant execute on function public.metricas_contratacoes(bigint) to authenticated;
