-- Fase G: Go/No-Go real (RF-007).
--
-- "analises" ja tinha select+insert para membros, mas faltava update --
-- um usuario precisa poder mudar de ideia sobre o veredito do mesmo
-- dossie (upsert por tenant_id+contratacao_id), nao so criar uma vez.
-- Mesmo padrao ja usado em impugnacoes_update_membros.

create policy analises_update_membros on public.analises
  for update
  to authenticated
  using ((select private.is_tenant_member(tenant_id)))
  with check ((select private.is_tenant_member(tenant_id)));
