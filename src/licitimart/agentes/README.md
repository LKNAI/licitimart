# agentes/

Vazio até os spikes `spikes/02_citacao_validada` e `spikes/03_impugnacao_assistida` avançarem:

- AG-01 a AG-05 dependem do pipeline de citação validada (spike 02) — a parte mecânica já foi aprovada; falta testar com LLM real (ver pendência no `resumo.md` do spike 02) antes de construir os agentes de produção.
- AG-06 (Impugnação Assistida) depende do detector de restritividade (spike 03, aprovado como sinal inicial) **e** de revisão jurídica formal (RN-006) antes de qualquer versão que chegue a cliente real.
- AG-07 (Reconciliação de Fontes) depende do spike 01 confirmar que há mais de uma fonte estável para reconciliar.
