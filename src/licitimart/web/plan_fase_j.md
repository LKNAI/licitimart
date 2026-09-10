# Plan: Fase J — Prospecção Semântica (RF-005)

Escrito antes do código. Quinta fase da sequência para fechar a v1.

## Decisão de infraestrutura (resolvida nesta fase, sem crédito de LLM)
1. **Embedding local via `fastembed` (Python, ONNX) no lado da coleta, `@huggingface/transformers` (Node, ONNX) no lado da busca em tempo real.** Sem chave de API — os dois rodam localmente. Testado empiricamente antes de codificar: os dois runtimes carregam o **mesmo modelo** (`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, multilíngue, 384 dimensões, ~220MB) com o mesmo pooling (mean, normalizado) e produzem **embeddings idênticos** — confirmado comparando a similaridade de cosseno do mesmo par de frases nos dois runtimes (0.572 nos dois). Isso evita depender de um serviço Python à parte só para embutir a busca do usuário — o Next.js embute a query direto.
2. **`pgvector` no Supabase** (extensão padrão, já disponível em todo projeto Supabase) para o índice vetorial + índice `GIN` de full-text (`to_tsvector('portuguese', ...)`) para a parte de palavra-chave.
3. **Busca híbrida por Reciprocal Rank Fusion (RRF)**, não por normalização manual de score — é a técnica padrão para combinar ranking de full-text com ranking vetorial sem ter que decidir um peso arbitrário entre os dois. Implementado como função SQL só, uma ida ao banco.
4. **Escopo do texto embutido nesta fase: só `contratacoes.objeto`.** É o único texto estruturado confiável que já temos sem RF-002 (extração de PDF) existir. Buscar sobre o edital inteiro fica para quando RF-002 tiver texto extraído — aditivo, não retrabalho (a mesma função de embedding serve para qualquer texto).
5. **Parâmetro de vetor no RPC é `text` (representação `"[0.1,0.2,...]"`), não `vector` direto** — é o padrão documentado para `supabase-js` chamar RPC com pgvector (o parâmetro json-serializado do PostgREST não faz cast automático para `vector`); a função faz o cast (`::extensions.vector`) internamente.

## Files that change
- `supabase/migrations/<timestamp>_fase_j_busca_semantica.sql` — `create extension vector`; coluna `contratacoes.objeto_embedding vector(384)`; índice `GIN` full-text; índice `HNSW` vetorial; função `buscar_contratacoes_hibrida(p_texto text, p_embedding text, p_limite int)` com RRF.
- `requirements.txt` — `fastembed`, `pypdf`, `python-docx` (as duas últimas só serão usadas na Fase K/RF-002, mas testadas juntas agora por conveniência de ambiente).
- `src/licitimart/web/package.json` — `@huggingface/transformers`.
- `scripts/gerar_embeddings.py` — lote limitado (`--limite`, mesmo padrão de `backfill_itens.py`) sobre contratações sem `objeto_embedding` ainda.
- `src/licitimart/web/src/lib/embedding.ts` — `embutirTexto(texto)`, carrega o pipeline uma vez (module-level singleton, evita recarregar o modelo a cada busca).
- `src/licitimart/web/src/app/busca/page.tsx` + `actions.ts` — tela de busca nova, chama a Server Action que embute a query e chama a RPC.

## Order of work
1. Migration + `supabase db push`.
2. `scripts/gerar_embeddings.py`, rodar em lote limitado contra as contratações já coletadas.
3. `embedding.ts` + tela `/busca` + Server Action.
4. `npm run build`.
5. Teste: comparar busca por palavra-chave pura vs. híbrida sobre um termo que não aparece literalmente no objeto mas é semanticamente relacionado (prova real de que a parte vetorial contribui, não só o full-text).

## Concluído (10/09/2026)

Migration aplicada via `supabase db push` (um bug de sintaxe pego na primeira tentativa: `<=>` sem schema-qualificar não resolve com `search_path=''` — corrigido com `operator(extensions.<=>)`, ver histórico do arquivo). 243 embeddings gerados em lote contra `contratacoes.objeto` real.

**Prova real da parte vetorial** (não só full-text disfarçado): busquei "sede para corporação de combate a incêndio" — sem a palavra "bombeiro" em lugar nenhum da consulta. Full-text sozinho não acharia nada com essa query. A busca híbrida trouxe contratações citando "40º Grupamento de Bombeiro Militar" e "Torre de Treinamento Operacional" (fundo de bombeiros) nos top-5 — só a similaridade de embedding explica isso. Teste de controle com termo mais literal ("obra pública de pavimentação de rua") também retornou resultados com sobreposição textual real, confirmando que o RRF está combinando as duas fontes corretamente, não ignorando uma delas.

## Proof
- [x] Migration aplicada, índices criados (GIN full-text + HNSW vetorial).
- [x] Embeddings gerados para 243 contratações reais.
- [x] Busca híbrida retorna resultado semanticamente relevante para um termo que não é substring literal do objeto — confirmado com sessão de usuário real via RPC.
