# Plan: Fase I — Itens reais + Consultor de Precificação (RF-008)

Escrito antes do código. Quarta fase da sequência para fechar a v1.

## Descoberta empírica antes de codificar
`itens_licitacao` existe no schema desde a Fase C mas **nunca foi escrita** — o coletor (`pncp.py`) só chama `/contratacoes/publicacao`, nunca busca itens. Testei ao vivo (uma chamada GET, respeitando o throttle) contra um `numero_controle_pncp` real já coletado e confirmei o endpoint real de itens:

```
GET https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens
```

(base `/api/pncp/v1`, **diferente** da base `/api/consulta/v1` usada em `pncp.py` — testei as duas, só essa responde 200). `{cnpj}`, `{ano}`, `{sequencial}` vêm de parsear `numero_controle_pncp` (formato `{cnpj:14}-1-{sequencial:6}/{ano:4}`, confirmado nos 248 registros reais). Resposta: lista de itens com `descricao`, `quantidade`, `valorUnitarioEstimado`, `valorTotal` — bate com as colunas que `itens_licitacao` já tem.

## Decisões de escopo
1. **Itens não entram no rastreamento de retificação (RF-018) nesta fase** — só `contratacoes` tem histórico. Escrita de itens é delete-then-insert por `contratacao_id` (substitui o estado, não versiona) — mais simples, e itens raramente mudam sozinhos sem o resto do edital mudar junto.
2. **Backfill é em lote limitado, não as 248 contratações de uma vez.** Cada contratação = 1 chamada nova à API (N+1) — no throttle sustentável observado no spike 01 (~7,5–10s de espaçamento), 248 chamadas seriam ~30-40min só de espera. Rodo um lote de teste (bound configurável) para provar o pipeline funciona contra dado real, sem martelar a infraestrutura pública numa sessão só — coleta completa fica para rodar depois, fora desta sessão interativa.
3. **RF-008 "Consultor de Precificação" nesta fase = correspondência por texto exato, não busca semântica.** Comparar `descricao` de itens diferentes exige normalização/matching que é literalmente o problema de RF-005 (não construído ainda). Faixa de preço = percentis de `valor_unitario_estimado` entre itens com a **mesma string exata** de descrição. Isso é uma limitação real, não escondida — com poucos itens reais coletados e descrição livre (texto do órgão, não SKU padronizado), a maioria vai cair em "dado insuficiente" (RF-020: nunca inventar faixa com 1 amostra só). É a base honesta sobre a qual RF-005 melhora depois.
4. **Itens reais passam a aparecer em `/dossies/[id]`** — hoje a tabela de itens do dossiê está sempre vazia (`itens: []` hardcoded); com backfill parcial, os dossiês que tiverem itens coletados mostram dado real.

## Files that change
- `src/licitimart/ingestao/pncp.py` — `buscar_itens(cliente_http, throttle, numero_controle_pncp)`: parseia cnpj/ano/sequencial, chama o endpoint novo, usa o mesmo `ThrottleComDescoberta` (não um throttle separado — é a mesma infraestrutura PNCP).
- `src/licitimart/ingestao/supabase_store.py` — `upsert_itens_licitacao(cliente, contratacao_id, itens_pncp)`: delete-then-insert.
- `scripts/backfill_itens.py` — script novo, roda um lote limitado (parâmetro `--limite`) sobre contratações sem itens ainda, com throttle e log claro do que foi feito.
- `src/licitimart/web/src/lib/data/dossiesSupabase.ts` — busca `itens_licitacao` real por `contratacao_id` (hoje sempre `[]`).
- `src/licitimart/web/src/lib/precificacao.ts` (novo) — função pura `calcularFaixaPreco(itens, descricaoAlvo)`: percentis (min/mediana/max) entre itens com descrição exatamente igual; retorna "dado insuficiente" com `n` amostras se `n < 3` (limiar razoável para não fingir uma "faixa" com 1-2 pontos).
- `src/licitimart/web/src/app/dossies/[id]/page.tsx` — mostra a faixa de preço ao lado de cada item, com o mesmo padrão visual de "dado insuficiente" já usado para achados (RF-020).

## Order of work
1. `pncp.py` + `supabase_store.py` + teste com script Python descartável contra 1-2 contratações reais (já validei o endpoint manualmente acima).
2. `scripts/backfill_itens.py`, rodar com limite pequeno (ex. 15-20) contra o PNCP real.
3. `dossiesSupabase.ts` + `precificacao.ts` + UI.
4. `npm run build` + conferir em navegador/HTTP que um dossiê com itens reais mostra a tabela preenchida.

## Concluído (10/09/2026)

Backfill rodado em dois lotes (15 + 50 = 65 contratações processadas, 118 itens reais gravados, 0 falhas) — throttle relaxou naturalmente para ~1-2s de espaçamento com sucessos consecutivos, dentro do padrão sustentável descoberto no spike 01. Confirmado que `delete-then-insert` não duplica ao rodar a mesma contratação duas vezes.

**Achado honesto:** com 118 itens reais coletados, `0` descrições têm 3+ ocorrências exatas — a limitação de escopo prevista na decisão 3 (texto livre do órgão, não SKU padronizado) se confirmou imediatamente. `/dossies/[id]` vai mostrar "dado insuficiente" em todo item até que (a) mais backfill rode, ou (b) RF-005 (busca semântica) exista para agrupar descrições parecidas, não só idênticas. Isso é o comportamento certo, não um bug — registrado na própria tela.

**Não verificado nesta fase:** render real em navegador (sem ferramenta de navegador nesta sessão, mesma limitação já registrada nas Fases D/E) — verificado por: `npm run build` (TypeScript limpo), teste da função pura `calcularFaixaPreco` isolada, e confirmação de que a query de itens comparáveis usa o mesmo padrão `.in()` já testado com sessão real na Fase H.

## Proof
- [x] `buscar_itens` funciona contra o PNCP real — testado 3x manualmente + 65x no backfill.
- [x] Backfill grava itens reais em `itens_licitacao`, sem duplicar em execução repetida (delete-then-insert, confirmado rodando a mesma contratação 2x).
- [x] `/dossies/[id]` está ligado a itens reais (65 contratações já têm dado; o resto aguarda mais backfill, fora desta sessão).
- [x] `calcularFaixaPreco` retorna "dado insuficiente" honesto quando `n < 3` — testado com função pura isolada (n=1 → insuficiente; n=3/4 → calculada) e confirmado contra o dado real (0 correspondências exatas ainda, como esperado).
