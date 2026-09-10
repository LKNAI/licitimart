-- Fase T: RF-014 (Metricas de Produtividade) precisa de resultado real
-- da disputa, nao so a decisao Go/No-Go/Revisao Humana -- "incremento
-- de participacao e reducao de CAC" nao tem como ser calculado sem
-- saber se o tenant efetivamente ganhou ou perdeu depois de decidir Go.
-- Preenchido manualmente pelo usuario (nao ha fonte automatica de
-- resultado de pregao) -- nulo ate que o usuario registre.

alter table public.analises add column resultado text
  check (resultado in ('aguardando', 'ganhou', 'perdeu'));
