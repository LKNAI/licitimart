# Spikes de risco — v1

Três premissas de alto risco da ERS v1 (`docs/ERS_Licitimart_v1.md` — cópia de referência; a fonte editável fica em `Planejamento/` no diretório pai), testadas isoladamente antes de se comprometer com a construção completa. Ver `CLAUDE.md` na raiz do projeto para o porquê dessa ordem.

| Spike | Testa | Status |
|---|---|---|
| [01_ingestao_pncp](01_ingestao_pncp/) | Comportamento do PNCP sob varredura nacional (todas as modalidades) | **Promovido a código de produção** (`src/licitimart/ingestao/`) após 3 rodadas. A arquitetura (paginar por modalidade, throttle com descoberta empírica, fila de pendências **persistente em disco**) se provou correta: nunca perde página silenciosamente, mesmo sob instabilidade real e sustentada do PNCP (confirmada de forma independente duas vezes em 09/09). Throughput sustentável em condição normal não foi medido de forma limpa ainda — as janelas testadas coincidiram com degradação do servidor. Ver `01_ingestao_pncp/resultados/resumo.md` (rodada 3) e `plan.md`. |
| [02_citacao_validada](02_citacao_validada/) | Robustez do validador de citação por substring (RNF-010/011) | Ver `02_citacao_validada/resumo.md` — aprovado na parte mecânica; parte com LLM real pendente de chave de API |
| [03_impugnacao_assistida](03_impugnacao_assistida/) | Sinal de um detector heurístico de restritividade | **Rodada 2:** 8 padrões, 14/14 casos corretos, e `minuta.py` — gerador de minuta por template determinístico (não LLM), sem risco de alucinação porque não gera conteúdo novo. Avança sem chave de LLM. **Ainda exige revisão jurídica antes de qualquer lançamento (RN-006)** — isso não muda com nenhum resultado técnico. |

Cada spike tem seu próprio README com hipótese, método e critério de aprovação/reprovação — leia antes de assumir que "passou" ou "falhou" sem contexto.
