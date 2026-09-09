# Licitimart — webapp

SaaS multi-tenant de inteligência de licitações. Ver `CLAUDE.md` para o propósito do projeto, sua relação com o workspace SAU, e o princípio de escopo da v1.

**Estado atual:** fase de spikes de risco (`spikes/`) — três premissas de alto risco da ERS v1 estão sendo testadas isoladamente antes da construção completa. Ver `spikes/README.md` para o status de cada uma.

## Como navegar este repositório

- `CLAUDE.md` — instruções e contexto do projeto, incluindo o fluxo de artefatos adotado (`intent.md → spec.md → plan.md`).
- `docs/intent.md` — o problema e a motivação original do produto, sem RF/RNF.
- `docs/ERS_Licitimart_v1.md` — cópia de referência da especificação/`spec.md` (fonte canônica em `Planejamento/` no diretório pai).
- `spikes/` — as três provas de risco em andamento.
- `src/licitimart/` — esqueleto da v1 real; cada subpasta tem um README explicando de qual spike ela depende antes de crescer.
- `data/` — saída de spike e cache, fora do git.
