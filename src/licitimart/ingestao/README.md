# ingestao/

Código de produção real, promovido de `spikes/01_ingestao_pncp/` após 3 rodadas de teste contra o PNCP real.

- `throttle.py` — limitador de taxa com descoberta empírica da margem segura; distingue sinal forte (429/503) de sinal ambíguo (timeout/conexão pendurada).
- `pendencias.py` — fila de pendências **persistente em disco** (não em memória): página abandonada nunca desaparece, fica disponível para retentativa numa execução futura. Decisão motivada por evidência real: em 09/09, instabilidade do PNCP durou mais que uma segunda passada dentro do mesmo processo.
- `pncp.py` — `ColetorPublicacaoPNCP`, o conector real para `/contratacoes/publicacao`, com orçamento de tempo global respeitado tanto entre páginas quanto dentro do loop de retentativa de uma página (bug real corrigido nesta promoção — ver `CLAUDE.md`).

Ainda pendente: medir throughput sustentável em condição normal do servidor — as janelas testadas até agora coincidiram com degradação real do PNCP (ver `spikes/01_ingestao_pncp/resultados/resumo.md`, rodada 3).
