# Plan: Fase P — Consultor de Precificação semântico (RF-008)

Escrito antes do código. Décima primeira fase da sequência.

## Problema

`src/lib/precificacao.ts` casa itens por **string idêntica** de `descricao` — o próprio comentário no código já dizia que isso era "o problema de RF-005, não construído ainda". RF-005 (busca híbrida por embedding) foi construído na Fase J, mas nunca reaproveitado aqui. Com descrição livre de edital (texto do órgão, não SKU padronizado), match exato quase sempre cai em "dado insuficiente" mesmo quando existem itens claramente comparáveis (ex.: "Pavimentação com pedras irregulares de basalto..." vs. uma descrição parecida mas não idêntica de outro edital).

## Decisão de escopo

1. **Embedding por item (`itens_licitacao.descricao_embedding`), não por contratação.** A granularidade certa pra comparar preço é o item, não o objeto inteiro do edital — reaproveitar `contratacoes.objeto_embedding` misturaria itens de natureza diferente dentro da mesma contratação.
2. **Distância de corte, não só contagem mínima.** `AMOSTRAS_MINIMAS = 3` já existia (honestidade de RF-020: nunca fabricar faixa com poucas amostras) — mantido. Novo: um teto de distância de cosseno (`DISTANCIA_MAXIMA`) pra não juntar itens semanticamente distantes só porque bateu no top-N; sem isso, "3 amostras" viraria "3 itens quaisquer", não "3 itens parecidos". Valor inicial conservador, testado contra dado real antes de fechar.
3. **Embedding do item-alvo calculado em tempo real (Node), buscado via RPC** — mesmo padrão de `/busca` (RF-005): não pré-computa "o que é comparável a quê" em lote, calcula na hora que o dossiê é aberto.
4. **Backfill do embedding de item continua sendo lote Python** (`scripts/gerar_embeddings_itens.py`, mesmo padrão de `gerar_embeddings.py`) — não sob demanda, porque o valor de comparação só existe quando há massa de itens já processados, diferente do enriquecimento de um item específico.

## Files that change

- `supabase/migrations/<timestamp>_fase_p_itens_embedding.sql` — coluna `itens_licitacao.descricao_embedding vector(384)` + índice HNSW + RPC `itens_comparaveis_semanticos(p_embedding text, p_limite int default 50)` (retorna item + distância, sem RRF — é busca vetorial pura, não híbrida).
- `scripts/gerar_embeddings_itens.py` (novo) — backfill em lote, mesmo padrão de `gerar_embeddings.py`.
- `src/licitimart/web/src/lib/precificacao.ts` — nova função `calcularFaixaPrecoSemantica(itens: ItemComDistancia[])`, mesma lógica de amostra mínima + corte de distância.
- `src/licitimart/web/src/lib/data/dossiesSupabase.ts` — `buscarItensComparaveisSemanticos(embeddingTexto)`.
- `src/licitimart/web/src/app/dossies/[id]/page.tsx` — por item do dossiê, embute a descrição (Node, tempo real) e busca comparáveis semânticos em vez de exatos.

## Order of work

1. Migration + `supabase db push`.
2. `gerar_embeddings_itens.py`, rodar contra as 119 itens reais existentes (lote pequeno, rápido).
3. `precificacao.ts` + `dossiesSupabase.ts`.
4. `/dossies/[id]/page.tsx`, `npm run build`.
5. Teste real: abrir um dossiê com item real, confirmar que a faixa de preço aparece quando há itens semanticamente parecidos mesmo sem string idêntica — e que **não** aparece uma faixa forçada quando os itens comparáveis são claramente de natureza diferente (validação do corte de distância).
