-- Fase N: enriquecimento sob demanda (itens/documentos buscados no PNCP
-- em tempo real, quando um usuario autenticado abre uma contratacao) --
-- roda no runtime Node/TypeScript do Next.js com a sessao do proprio
-- usuario, nao com a service_role (ver plan_fase_n.md, decisao "Node/TS
-- nativo"). Ate aqui so o coletor Python (service_role) escrevia nessas
-- tabelas; precisa de policy de escrita para authenticated.
--
-- Continua sem isolamento de tenant nessas tabelas -- e dado publico do
-- PNCP (mesmo raciocinio das policies de select ja existentes), entao
-- qualquer usuario autenticado (de qualquer tenant) pode enriquecer o
-- dado compartilhado. Nenhuma policy nova em contratacoes -- a varredura
-- de metadados (RF-001) continua exclusiva do coletor Python/service_role.

create policy itens_licitacao_insert_autenticados on public.itens_licitacao
  for insert
  to authenticated
  with check (true);

create policy itens_licitacao_delete_autenticados on public.itens_licitacao
  for delete
  to authenticated
  using (true);

create policy documentos_contratacao_insert_autenticados on public.documentos_contratacao
  for insert
  to authenticated
  with check (true);

create policy documentos_contratacao_update_autenticados on public.documentos_contratacao
  for update
  to authenticated
  using (true)
  with check (true);

create policy editais_documentos_insert_autenticados on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'editais-documentos');

create policy editais_documentos_update_autenticados on storage.objects
  for update
  to authenticated
  using (bucket_id = 'editais-documentos')
  with check (bucket_id = 'editais-documentos');
