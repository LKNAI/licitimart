# Spike 02 — Citação Validada

## Pergunta que este spike testa

O ERS v1 (RNF-010/011) exige que toda citação de IA passe por validação de correspondência literal (substring) contra o texto-fonte, antes de ser interpretada por um modelo mais robusto — o padrão que o SAU já usa em produção. A pergunta aqui não é "o padrão existe" (já existe, no SAU); é **"o mecanismo de validação é robusto o suficiente sozinho, ou passa citação alterada como válida"** — porque é essa peça, não o LLM em si, que sustenta a garantia de RNF-010.

## O que este spike testa de fato, e o que fica pendente

Este ambiente **não tem `ANTHROPIC_API_KEY` nem `OPENAI_API_KEY` configurada**. Por isso, o spike se divide em duas partes com honestidade sobre o que cada uma prova:

1. **Testado de verdade aqui:** o validador de substring (`validador.py`) — a peça mecânica, determinística, que decide se uma citação "existe de fato" no texto-fonte. Testado contra casos adversariais (`casos_teste/`): citação idêntica, citação com espaço/quebra de linha diferente, citação parafraseada (deveria falhar), citação com um número alterado (deveria falhar — é o caso mais perigoso de alucinação sutil).
2. **Não testado aqui, pendente de chave de API real:** se um LLM real, ao gerar a citação candidata, de fato produz o texto exato do documento com frequência suficiente para o pipeline ser útil na prática (e não rejeitar quase tudo). Isso só se testa com uma chave de LLM real contra editais reais — `pipeline.py` já está desenhado com essa etapa como interface plugável (`ClienteLLM`), com um `ClienteLLMSimulado` usado apenas para exercitar o fluxo de ponta a ponta sem custo, e um comentário explícito marcando onde a chave real entraria.

## Critério de aprovação / reprovação (só da parte 1 — validador)

| Resultado | Interpretação |
|---|---|
| Validador aceita as citações idênticas/com espaçamento diferente e rejeita as parafraseadas/alteradas | **Aprovado** — o mecanismo de verificação é confiável; falta só a etapa 2 (LLM real) para completar a validação do pipeline inteiro. |
| Validador aceita citação com número alterado como válida | **Reprovado crítico** — é exatamente o tipo de alucinação sutil que RNF-010 existe para prevenir; a normalização de texto do validador precisa ser mais estrita, não mais permissiva. |

## Rodada 2 (10/09/2026) — `ClienteLLMReal` implementado, ainda não testado

Sem crédito em nenhuma API de LLM neste ambiente — mas por decisão explícita do usuário, a implementação real avançou mesmo assim, em vez de esperar a chave: `ClienteLLMReal` (em `pipeline.py`) usa LiteLLM de verdade, com Structured Outputs (`response_format json_object`) na etapa de localizar citação. Isso é **código real, revisado e sintaticamente correto, instanciável** (`ClienteLLMReal()` importa e constrói sem erro) — mas **nenhuma chamada de rede foi feita**, porque não há `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` configurada aqui. `pipeline.py --real` falha cedo com um erro claro nesse caso, em vez de fingir sucesso.

## Próximo passo depois deste spike

Configurar `ANTHROPIC_API_KEY` (ou `OPENAI_API_KEY`) neste ambiente e rodar `pipeline.py --real` contra 3–5 editais reais para medir a taxa de citação válida na primeira tentativa — essa taxa é o dado que faltava para a parte 2, e é a única coisa que a rodada 2 não conseguiu resolver (falta de crédito, não falta de código).

## Como rodar

```
python validador.py          # roda os casos de teste adversariais, sem rede, sem custo
python pipeline.py           # roda o fluxo de ponta a ponta em modo simulado
python pipeline.py --real    # roda contra LLM real (LiteLLM) -- exige ANTHROPIC_API_KEY ou OPENAI_API_KEY
```
