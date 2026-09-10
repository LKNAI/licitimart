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

## Pendência explícita (rodada 1)

Rodar `pipeline.py` com um `ClienteLLMReal` (a implementar) contra 3–5 editais reais, assim que houver `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY` configurada neste ambiente, para medir a taxa de citação literalmente válida na primeira tentativa. Sem esse número, RNF-010/011 está especificado corretamente mas não está validado contra o comportamento real de um modelo de produção.

## Rodada 2 (10/09/2026) — implementação real avançada, sem crédito de API

Ainda sem `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` neste ambiente. Por decisão explícita do usuário ("toda implementação deve ser realizada, ainda que não seja o ideal sem ter a API da LLM"), implementei `ClienteLLMReal` via LiteLLM em vez de deixar essa peça pendente:

- Etapa `localizar_citacao`: chama o modelo com Structured Outputs (`response_format json_object`), pedindo o trecho literal e a página; parseia o JSON de resposta.
- Etapa `refinar_interpretacao`: chamada de texto livre sobre a citação já confirmada (só roda depois que `citacao_e_valida()` aprovou — a ordem do pipeline não mudou).
- `pipeline.py --real` falha cedo com mensagem clara se não houver chave, em vez de fingir que rodou.

**O que foi de fato verificado nesta rodada:** o módulo importa, a classe instancia, a assinatura dos métodos bate com a interface `ClienteLLM`, `--real` recusa corretamente sem chave. **O que continua pendente, sem mudança:** nenhuma chamada de rede a um LLM real foi feita — a taxa de citação literalmente válida na primeira tentativa contra edital real (a pergunta original deste spike) segue sem resposta. Código pronto para o dia em que houver crédito; não é validação do comportamento do modelo, é preparação para ela.
