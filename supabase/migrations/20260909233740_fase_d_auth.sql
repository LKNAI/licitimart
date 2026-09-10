-- Fase D: autenticacao real.
--
-- Unica peca de banco desta fase: uma funcao RPC para criar o primeiro
-- tenant do usuario recem-logado. Nao abrimos policy de INSERT aberta em
-- "tenants"/"tenant_membros" de proposito -- uma funcao security definer
-- que sempre cria tenant NOVO (nunca aceita tenant_id existente como
-- parametro) evita qualquer jeito de um usuario se associar a um tenant
-- alheio, sem precisar de RLS recursiva sutil em tenant_membros.

create or replace function public.criar_tenant_e_associar(p_nome text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id bigint;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  insert into public.tenants (nome) values (p_nome) returning id into v_tenant_id;

  insert into public.tenant_membros (tenant_id, user_id, papel)
  values (v_tenant_id, v_user_id, 'admin_tenant');

  return v_tenant_id;
end;
$$;

revoke execute on function public.criar_tenant_e_associar(text) from public, anon;
grant execute on function public.criar_tenant_e_associar(text) to authenticated;
