# Plan: ampliar o detector + minuta template-based (spike 03, rodada 2)

Sem `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` neste ambiente — nada que dependa de LLM avança hoje. Mas duas coisas avançam sem LLM nenhum:

## Problema

1. O detector de restritividade (rodada 1) só tem 4 padrões e 6 casos de teste — sinal inicial fraco para generalizar.
2. RF-017 (Impugnação Assistida) pede "minuta de contestação" — hoje só existe o achado bruto (padrão + trecho + fundamentação candidata), sem nenhum documento montado. Gerar a minuta **não precisa ser tarefa de LLM**: com fundamentação já fixa por padrão (texto estático, não gerado), um gerador por template determinístico produz um rascunho real, auditável, sem risco de alucinação — e sem custo de API.

## Files that change
- `detector.py` — adicionar padrões (visita técnica combinada com prazo incompatível, exigência de registro/CRM de UF específica, quantidade de atestado por unidade indivisível, garantia de proposta acima do limite legal) + casos de teste adversariais para cada um (positivo e controle).
- `minuta.py` (novo) — `gerar_minuta(achados, contexto)` monta um documento Markdown determinístico (cabeçalho, fundamentação por achado, pedido padrão, aviso RN-006 fixo no topo e no rodapé, não removível por parâmetro nenhum).
- `README.md` — atualizar com o resultado da rodada 2.

## Order of work
1. Adicionar padrões + casos de teste em `detector.py`, rodar, conferir 100%.
2. Escrever `minuta.py`, com o aviso RN-006 hardcoded (nunca parâmetro opcional).
3. Gerar uma minuta de exemplo a partir de um caso de teste combinado (múltiplos achados) e conferir manualmente que lê como rascunho, não como peça pronta.

## Risks
- Fundamentação legal citada (artigo de lei) é "candidata", nunca definitiva — já rotulado assim desde a rodada 1; manter a mesma disciplina nos padrões novos.
- Template determinístico pode parecer "produto pronto demais" para quem não ler o aviso — por isso o aviso fica em duas posições (topo e rodapé), não uma só.

## Proof
- `python detector.py` continua 100% nos casos antigos + novos.
- `python minuta.py` gera um Markdown de exemplo com o aviso RN-006 visível nas duas pontas.
