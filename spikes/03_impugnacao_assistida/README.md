# Spike 03 — Detector de Restritividade (base da Impugnação Assistida)

## Pergunta que este spike testa

Antes de investir num agente de produção (AG-06) e, mais importante, antes de qualquer conversa com advogado sobre risco jurídico (RN-006), vale saber: **um detector simples, baseado em padrão textual, já teria algum sinal real** contra cláusula restritiva/direcionada, ou o problema exige necessariamente um LLM (com todo o custo e risco de alucinação que isso traz)?

## O que este spike testa, e o que não testa

Testado aqui: um detector heurístico (regex + palavras-chave), novo, escrito para este projeto — **não copiado do SAU** — contra um punhado de trechos sintéticos de edital com e sem cláusula restritiva conhecida, verificando se ele acerta (sinaliza a restritiva, não sinaliza a limpa).

**Não testado aqui, e não é objetivo deste spike:**
- Se a fundamentação legal gerada é juridicamente correta — isso exige advogado, não código.
- Se o detector funciona em edital real e variado — a amostra é sintética e pequena, de propósito, só para checar se há sinal antes de investir mais.
- Qualquer decisão sobre lançar a funcionalidade — RN-006 é bloqueio de lançamento independente do resultado técnico aqui.

## Método

`detector.py` procura por padrões conhecidos de restritividade indevida (marca específica sem "ou similar/equivalente", exigência de quantidade minima de atestado desproporcional ao objeto, prazo de entrega incompatível com o objeto, exigência de certificação que só um fabricante possui) em `casos_teste/`: alguns trechos contêm a cláusula restritiva de propósito, outros são "controle" (cláusula legítima, não deveria disparar nada).

## Critério de aprovação / reprovação

| Resultado | Interpretação |
|---|---|
| Detector sinaliza os casos restritivos e não sinaliza os casos de controle | **Aprovado como sinal inicial** — vale a pena seguir para uma versão com LLM (localizar + explicar + fundamentar), sempre sob a regra de RN-006. |
| Detector sinaliza os casos de controle também (falso positivo) | **Sinal fraco** — ou o padrão precisa ser mais específico, ou a tarefa realmente exige LLM desde o início; regex sozinho não basta. |
| Detector não sinaliza nem os casos restritivos | **Reprovado** — abordagem puramente heurística não tem sinal nenhum; ir direto para abordagem com LLM. |

## Como rodar

```
python detector.py          # 14 casos de teste (rodada 2: 8 padrões, antes eram 4)
python exemplo_minuta.py    # gera resultados/minuta_exemplo.md a partir de um edital sintético
```

## Rodada 2 (09/09/2026) — sem LLM, avançou mesmo assim

Duas coisas avançaram sem precisar de `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`:

1. **Detector ampliado de 4 para 8 padrões** (registro de UF específica, atestado em contrato único/indivisível, garantia de proposta acima do limite legal de 1%, combinação visita técnica + prazo curto) — 14/14 casos de teste corretos, incluindo os controles negativos.
2. **`minuta.py`** — gerador de minuta de impugnação **por template determinístico, não por LLM**. A fundamentação de cada padrão já é texto fixo; montar o documento não exige geração de linguagem nenhuma, só preenchimento de campos — isso elimina o risco de alucinação nessa etapa por completo, porque não há conteúdo novo sendo gerado. O aviso de RN-006 é fixo no topo e no rodapé, sem parâmetro para remover. Ver `exemplo_minuta.py` e `resultados/minuta_exemplo.md`.

**O que ainda depende de LLM (não avança sem chave):** lapidar a prosa da minuta, extrair achados de edital real não sintético (texto livre, não os padrões fixos testados aqui), e qualquer citação que precise de validação por substring contra documento real (isso é o spike 02).
