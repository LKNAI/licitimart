# Spike 01 — Ingestão PNCP

## Pergunta que este spike testa

O SAU validou o comportamento do PNCP sob carga apenas para um recorte estreito (Ministério da Saúde, modalidade Pregão Eletrônico). A Licitimart precisa varrer **nacionalmente, todas as modalidades**. A pergunta é: o mesmo modelo de throttling adaptativo e o mesmo endpoint cumulativo (`/contratacoes/publicacao`) se sustentam num recorte muito mais largo, ou o volume nacional expõe um comportamento diferente (paginação mais profunda, latência maior, limite por outro eixo)?

## O que este spike **não** faz, por decisão deliberada

Não tenta reproduzir a falha de rate limit em rajada. Bombardear o PNCP para forçar 503 é abuso de infraestrutura pública de terceiro, não pesquisa — o comportamento (503 sem `Retry-After`, conexão pendurada, ~45s para normalizar) já está documentado pelo SAU como fato conhecido; este spike parte dele como premissa de design, não como algo a redescobrir.

## Método

1. `throttle.py` implementa um limitador adaptativo: espaçamento global mínimo de 0,35s entre requisições (piso, nunca menos), que **aumenta** automaticamente se detectar 429/503/timeout, e relaxa de volta ao piso após uma janela de sucesso — nunca abaixo do piso, mesmo sob sucesso prolongado.
2. `coletor.py` varre `/contratacoes/publicacao` em uma janela de datas curta (1–2 dias), sem filtro de órgão nem de modalidade, paginando até o fim, respeitando o throttle.
3. Cada requisição registra: timestamp, página, status HTTP, latência, tamanho da resposta.
4. Ao final, o script extrapola matematicamente (não empiricamente sob rajada) quanto tempo levaria para varrer um volume-alvo maior, dado o throughput seguro observado.

## Critério de aprovação / reprovação

| Resultado | Interpretação |
|---|---|
| Volume nacional pagina normalmente, latência estável, throughput seguro extrapola para um volume diário viável | **Aprovado** — o modelo de ingestão do ERS v1 (seção 3.2) se sustenta em escala nacional; construir `src/licitimart/ingestao/` sobre esse padrão. |
| Paginação nacional expõe comportamento diferente (ex.: profundidade de página limitada, campo de resposta trunca, latência degrada com o avanço da página) | **Reprovado parcial** — o modelo precisa de ajuste (ex.: particionar por órgão/UF além de por data) antes de generalizar; documentar o achado e voltar à ERS. |
| Throughput seguro extrapolado não se aproxima do volume-alvo (RNF-001) de forma alguma | **Reprovado** — a meta de volume da ERS precisa ser renegociada, ou o throttling adaptativo precisa evoluir para paralelismo controlado por múltiplas janelas de tempo/IP, o que é mudança de arquitetura, não de parâmetro. |

## Como rodar

```
pip install -r ../../requirements.txt
python coletor.py --data-inicial 20260901 --data-final 20260902
```

Resultado bruto (paginado) fica em `resultados/raw_<timestamp>.jsonl` (fora do git); o resumo interpretado fica em `resultados/resumo.md` (versionado).
