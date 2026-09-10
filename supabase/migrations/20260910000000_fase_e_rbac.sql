-- Fase E: RBAC (gestao de membros do tenant).
--
-- RNF-007 pede privilegios granulares entre analista/gestor_comercial/
-- juridico_compliance/admin_tenant. Nenhuma tela do produto hoje tem acao
-- que dependa de papel -- o que existe e precisa de dono e quem pode
-- convidar/remover gente e mudar papel. Ver plan_fase_e.md.
--
-- Toda escrita em tenant_membros continua via RPC security definer, nunca
-- policy de INSERT/UPDATE/DELETE aberta -- mesmo padrao de
-- criar_tenant_e_associar (Fase D): RLS recursiva sobre a propria tabela
-- de associacao e sutil e facil de errar.

create or replace function private.is_tenant_admin(p_tenant_id bigint)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.tenant_membros
    where tenant_id = p_tenant_id
      and user_id = (select auth.uid())
      and papel = 'admin_tenant'
  );
$$;

revoke execute on function private.is_tenant_admin(bigint) from public, anon, authenticated;
grant execute on function private.is_tenant_admin(bigint) to authenticated;

-- Admin ve todas as linhas do proprio tenant (a policy da Fase D so
-- cobria "ver a propria linha").
create policy tenant_membros_select_admin on public.tenant_membros
  for select
  to authenticated
  using ((select private.is_tenant_admin(tenant_id)));

-- Lista membros com e-mail -- so a funcao (security definer) pode juntar
-- com auth.users, PostgREST nao expoe esse schema para authenticated.
create or replace function public.listar_membros_tenant(p_tenant_id bigint)
returns table (user_id uuid, email text, papel text, criado_em timestamptz)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.is_tenant_member(p_tenant_id) then
    raise exception 'Você não é membro deste tenant.';
  end if;

  return query
    select tm.user_id, u.email::text, tm.papel, tm.criado_em
    from public.tenant_membros tm
    join auth.users u on u.id = tm.user_id
    where tm.tenant_id = p_tenant_id
    order by tm.criado_em asc;
end;
$$;

revoke execute on function public.listar_membros_tenant(bigint) from public, anon;
grant execute on function public.listar_membros_tenant(bigint) to authenticated;

-- Convida usuario JA CADASTRADO (busca por e-mail em auth.users) --
-- convite para quem nao tem conta ainda depende de envio de e-mail, fora
-- de escopo desta fase (ver plan_fase_e.md, decisao 2).
create or replace function public.convidar_membro(p_tenant_id bigint, p_email text, p_papel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if not private.is_tenant_admin(p_tenant_id) then
    raise exception 'Só administradores do tenant podem convidar membros.';
  end if;

  if p_papel not in ('analista', 'gestor_comercial', 'juridico_compliance', 'admin_tenant') then
    raise exception 'Papel inválido: %', p_papel;
  end if;

  select id into v_user_id from auth.users where email = p_email;
  if v_user_id is null then
    raise exception 'Nenhuma conta encontrada com o e-mail %. Peça para a pessoa se cadastrar em /login primeiro.', p_email;
  end if;

  if exists (select 1 from public.tenant_membros where tenant_id = p_tenant_id and user_id = v_user_id) then
    raise exception 'Este usuário já é membro do tenant.';
  end if;

  insert into public.tenant_membros (tenant_id, user_id, papel)
  values (p_tenant_id, v_user_id, p_papel);
end;
$$;

revoke execute on function public.convidar_membro(bigint, text, text) from public, anon;
grant execute on function public.convidar_membro(bigint, text, text) to authenticated;

-- Conta quantos admins um tenant tem -- usado pelas duas funcoes abaixo
-- para nunca deixar o tenant sem nenhum admin_tenant.
create or replace function private.contar_admins_tenant(p_tenant_id bigint)
returns bigint
language sql
security definer
set search_path = ''
stable
as $$
  select count(*) from public.tenant_membros
  where tenant_id = p_tenant_id and papel = 'admin_tenant';
$$;

revoke execute on function private.contar_admins_tenant(bigint) from public, anon, authenticated;

create or replace function public.alterar_papel_membro(p_tenant_id bigint, p_user_id uuid, p_papel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_papel_atual text;
begin
  if not private.is_tenant_admin(p_tenant_id) then
    raise exception 'Só administradores do tenant podem mudar papel de membro.';
  end if;

  if p_papel not in ('analista', 'gestor_comercial', 'juridico_compliance', 'admin_tenant') then
    raise exception 'Papel inválido: %', p_papel;
  end if;

  select papel into v_papel_atual from public.tenant_membros
  where tenant_id = p_tenant_id and user_id = p_user_id;

  if v_papel_atual is null then
    raise exception 'Usuário não é membro deste tenant.';
  end if;

  if v_papel_atual = 'admin_tenant' and p_papel <> 'admin_tenant'
     and private.contar_admins_tenant(p_tenant_id) <= 1 then
    raise exception 'Não é possível rebaixar o último administrador do tenant.';
  end if;

  update public.tenant_membros set papel = p_papel
  where tenant_id = p_tenant_id and user_id = p_user_id;
end;
$$;

revoke execute on function public.alterar_papel_membro(bigint, uuid, text) from public, anon;
grant execute on function public.alterar_papel_membro(bigint, uuid, text) to authenticated;

create or replace function public.remover_membro(p_tenant_id bigint, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_papel_atual text;
begin
  if not private.is_tenant_admin(p_tenant_id) then
    raise exception 'Só administradores do tenant podem remover membro.';
  end if;

  select papel into v_papel_atual from public.tenant_membros
  where tenant_id = p_tenant_id and user_id = p_user_id;

  if v_papel_atual is null then
    raise exception 'Usuário não é membro deste tenant.';
  end if;

  if v_papel_atual = 'admin_tenant' and private.contar_admins_tenant(p_tenant_id) <= 1 then
    raise exception 'Não é possível remover o último administrador do tenant.';
  end if;

  delete from public.tenant_membros
  where tenant_id = p_tenant_id and user_id = p_user_id;
end;
$$;

revoke execute on function public.remover_membro(bigint, uuid) from public, anon;
grant execute on function public.remover_membro(bigint, uuid) to authenticated;
