# Plan: Fase S — busca semântica sobre o texto do edital (extensão RF-005)

Escrito antes do código. Décima terceira fase.

## Problema
`/busca` só indexa `contratacoes.objeto` (uma frase). O texto completo do edital extraído (`documentos_contratacao.texto_extraido`) nunca entra na busca, mesmo já disponível para os documentos enriquecidos.

## Decisão de escopo
1. **Chunk por página, não o documento inteiro.** Um edital de 40 páginas não cabe num embedding só sem perder especificidade. `paginas_offsets` (Fase M) já marca onde cada página começa em `texto_extraido` — reaproveita isso pra fatiar, não introduz um chunker novo.
2. **DOCX (sem `paginas_offsets`) vira um chunk único** — mesma honestidade de Fase M: página não existe pra esse formato, não finge.
3. **Duas trilhas de escrita, mesmo padrão de Fase N/P:** o caminho **on-demand** (`buscarEnriquecimento` em Node) passa a gerar os embeddings de página assim que extrai um documento novo; um **backfill Python** (`gerar_embeddings_paginas.py`) cobre os documentos já extraídos antes dessa fase existir.
4. **RRF (full-text + vetor) igual à busca de contratações** (Fase J) — mesmo padrão, mesma função de combinação, só a tabela-fonte muda.
5. **`/busca` mostra dois grupos de resultado**, claramente rotulados: contratações (já existia) e trechos de edital (novo, cada um linkando pra a página exata via `/dossies/[id]/documento/[docId]`, Fase M).

## Files
- migration: tabela `documento_paginas` + índices (GIN/HNSW) + RPC `buscar_paginas_documento`.
- `scripts/gerar_embeddings_paginas.py` (novo, backfill).
- `src/licitimart/web/src/app/dossies/[id]/actions.ts` — `buscarEnriquecimento` passa a chamar uma função nova de chunk+embed depois de extrair o documento.
- `src/licitimart/web/src/lib/data/dossiesSupabase.ts` — `buscarPaginasSemelhantes`.
- `src/licitimart/web/src/app/busca/actions.ts` e `page.tsx` — segundo grupo de resultado.

## Order
1. Migration.
2. Backfill Python, rodar contra os poucos documentos já extraídos.
3. Hook on-demand em Node.
4. RPC + tela de busca, testar com termo que só existe dentro do corpo do edital (não no objeto).
