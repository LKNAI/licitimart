# ingestao/

Código de produção real, promovido de `spikes/01_ingestao_pncp/` após 3 rodadas de teste contra o PNCP real.

- `throttle.py` — limitador de taxa com descoberta empírica da margem segura; distingue sinal forte (429/503) de sinal ambíguo (timeout/conexão pendurada).
- `pendencias.py` — fila de pendências **persistente em disco** (não em memória): página abandonada nunca desaparece, fica disponível para retentativa numa execução futura. Decisão motivada por evidência real: em 09/09, instabilidade do PNCP durou mais que uma segunda passada dentro do mesmo processo.
- `pncp.py` — `ColetorPublicacaoPNCP`, o conector real para `/contratacoes/publicacao`, com orçamento de tempo global respeitado tanto entre páginas quanto dentro do loop de retentativa de uma página (bug real corrigido nesta promoção — ver `CLAUDE.md`).
- `supabase_store.py` — escrita real no Supabase (`service_role`, ignora RLS) em `contratacoes` (upsert por `numero_controle_pncp`, idempotente — testado), `manifestos_ingestao` e `pendencias_ingestao`. Ver `plan_supabase.md`. Rodar via `scripts/exportar_para_supabase.py`, que exige `.env` na raiz (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — nunca no lado `web/`, ver `CLAUDE.md`).

Duas pontes de saída coexistem por decisão (`supabase/README.md`): `scripts/exportar_para_webapp.py` (JSON local, lido pelo webapp sem precisar de Supabase) e `scripts/exportar_para_supabase.py` (escrita real, agora que o projeto existe). Nenhuma substitui a outra ainda.

Ainda pendente: medir throughput sustentável em condição normal do servidor — as janelas testadas até agora coincidiram com degradação real do PNCP (ver `spikes/01_ingestao_pncp/resultados/resumo.md`, rodada 3).
