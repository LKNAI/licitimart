-- Fase N: pncp.py ja podia gravar motivo="prazo_estourado" desde a
-- regra de checar orcamento DENTRO do loop de retentativa de pagina
-- (achado real, spike 01 rodada 3 -- ver CLAUDE.md), mas a constraint
-- original de pendencias_ingestao.motivo nunca foi atualizada para
-- aceitar esse valor. So apareceu agora porque a varredura nacional foi
-- a primeira execucao a de fato abandonar uma pagina no meio do prazo
-- (volume alto o suficiente pra esgotar o orcamento por chunk).

alter table public.pendencias_ingestao drop constraint pendencias_ingestao_motivo_check;

alter table public.pendencias_ingestao add constraint pendencias_ingestao_motivo_check
  check (motivo in ('erro_taxa', 'erro_rede', 'prazo_estourado', 'outro'));
