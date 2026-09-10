-- Fase O: agregacao server-side para nao depender de carregar ate 1.000
-- linhas de contratacoes em memoria (fazia sentido com 248 linhas, quebra
-- com volume real -- ver plan_fase_o.md). Mesma convencao de
-- buscar_contratacoes_hibrida (Fase J): SQL puro, SEM security definer --
-- roda com o RLS do proprio chamador, contratacoes ja e select aberto a
-- qualquer autenticado e analises ja e tenant-scoped por RLS.

create or replace function public.metricas_contratacoes(p_tenant_id bigint)
returns table (
  total bigint,
  valor_total numeric,
  maior_valor numeric,
  go_total bigint,
  revisao_total bigint,
  no_go_total bigint
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
    count(*) filter (where coalesce(a.veredito, 'revisao_humana') = 'no_go') as no_go_total
  from public.contratacoes c
  left join public.analises a on a.contratacao_id = c.id and a.tenant_id = p_tenant_id;
$$;

revoke execute on function public.metricas_contratacoes(bigint) from public, anon;
grant execute on function public.metricas_contratacoes(bigint) to authenticated;

create or replace function public.pipeline_preview(p_tenant_id bigint, p_veredito text, p_limite int default 6)
returns table (
  id bigint,
  numero_controle_pncp text,
  objeto text,
  orgao text,
  municipio_uf text,
  valor_estimado numeric,
  data_publicacao timestamptz
)
language sql
stable
set search_path = ''
as $$
  select c.id, c.numero_controle_pncp, c.objeto, c.orgao, c.municipio_uf, c.valor_estimado, c.data_publicacao
  from public.contratacoes c
  left join public.analises a on a.contratacao_id = c.id and a.tenant_id = p_tenant_id
  where coalesce(a.veredito, 'revisao_humana') = p_veredito
  order by c.data_publicacao desc
  limit p_limite;
$$;

revoke execute on function public.pipeline_preview(bigint, text, int) from public, anon;
grant execute on function public.pipeline_preview(bigint, text, int) to authenticated;
