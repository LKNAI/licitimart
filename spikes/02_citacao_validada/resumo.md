# Resumo — spike 02 (validador de citação)

**Executado em:** 09/09/2026, ambiente sem `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` configurada.

## Parte 1 — validador de substring (testado de fato)

Os 4 casos adversariais de `validador.py` passaram:

- citação idêntica → aceita (correto)
- citação com espaçamento/quebra de linha diferente → aceita (correto)
- citação parafraseada → rejeitada (correto)
- citação com número alterado (caso mais perigoso de alucinação sutil) → rejeitada (correto)

**Resultado: aprovado.** O mecanismo mecânico de validação por substring é confiável para os casos testados — não normaliza nada além de espaçamento, então não abre brecha para aceitar conteúdo alterado.

## Parte 2 — pipeline de ponta a ponta (só simulado, não testado com LLM real)

`pipeline.py` demonstrou o fluxo completo em modo simulado: quando o "modelo barato" simulado devolve a citação correta, o pipeline segue para interpretação; quando devolve uma citação com número alterado (alucinação forçada de propósito), o pipeline descarta antes de interpretar. Isso confirma que a integração entre localizar → validar → refinar está correta *na lógica*, mas **não confirma nada sobre o comportamento de um LLM real** — essa parte segue pendente.

## Pendência explícita

Rodar `pipeline.py` com um `ClienteLLMReal` (a implementar) contra 3–5 editais reais, assim que houver `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY` configurada neste ambiente, para medir a taxa de citação literalmente válida na primeira tentativa. Sem esse número, RNF-010/011 está especificado corretamente mas não está validado contra o comportamento real de um modelo de produção.
