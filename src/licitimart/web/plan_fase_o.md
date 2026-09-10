# Plan: Fase O — corrigir teto de 1.000 linhas para o volume real (11.792 contratações)

Escrito antes do código. Décima fase da sequência.

## Problema

`dossiesSupabase.ts` carrega até 1.000 linhas de `contratacoes` numa consulta só (`.limit(1000)`) e todo o resto da camada de apresentação (`/dossies`, `/metricas`, `/pipeline`, `/dossies/[id]`) opera sobre esse array em memória. Fazia sentido com 248 linhas; com 11.792, isso quebra de dois jeitos:

1. **Bug real, não só limitação de escopo**: `buscarDossie(id)` (usado por `/dossies/[id]`) faz `listarTodosDossies().find(id)` — uma contratação real fora das 1.000 mais recentes por `data_publicacao` **não abre, 404**, mesmo existindo no banco. Isso é regressão funcional, não só métrica incompleta.
2. **Métricas e listagem incompletas**: `/metricas` soma/agrega só as 1.000 carregadas (~8,5% da base) e rotula isso corretamente no texto, mas o número mostrado não é o total real. `/dossies` só pagina até 1.000 — as outras ~10.800 não aparecem em lugar nenhum da UI.

## Decisão de escopo

1. **Agregação (`/metricas`, contagem por veredito) vira SQL server-side, não reduce em array Node.** Duas funções RPC novas (mesma convenção de `buscar_contratacoes_hibrida`, sem `security definer` — RLS do chamador se aplica igual): `metricas_contratacoes(p_tenant_id)` (total, valor total, maior valor, contagem por veredito) e `pipeline_preview(p_tenant_id, p_veredito, p_limite)` (as N mais recentes de um veredito, para os cards do Pipeline).
2. **Listagem (`/dossies`) vira paginação real via `.range()`**, não fetch-1000-depois-slice. Itens/veredito buscados só para os IDs da página atual (25), não para o lote inteiro.
3. **Detalhe (`/dossies/[id]`) busca a contratação diretamente por ID**, não filtra sobre a lista capada — corrige o bug de 404 acima.
4. **Mock ilustrativo continua existindo, só na página 1**, apendado depois dos reais — não entra em nenhuma agregação SQL (são 3 itens fixos, somados à mão no cliente como já era).

## Files that change

- `supabase/migrations/<timestamp>_fase_o_metricas_rpc.sql` (novo) — as duas funções RPC.
- `src/licitimart/web/src/lib/data/dossiesSupabase.ts`:
  - `buscarPaginaDossies(pagina, porPagina)` (novo) — substitui o uso de `carregarDossiesSupabase` em `/dossies`.
  - `buscarDossiePorId(id)` (novo) — substitui `buscarDossie` para IDs reais.
  - `buscarMetricas(tenantId)` (novo) — chama a RPC `metricas_contratacoes`.
  - `buscarPipelinePreview(tenantId, veredito, limite)` (novo) — chama a RPC `pipeline_preview`.
  - `carregarDossiesSupabase` mantido só onde ainda faz sentido (não mais usado pelas três telas acima).
- `src/licitimart/web/src/lib/mock/dossies.ts` — `buscarDossie` passa a despachar pra `buscarDossiePorId` quando `id` começa com `real-`.
- `src/licitimart/web/src/app/dossies/page.tsx` — paginação real.
- `src/licitimart/web/src/app/metricas/page.tsx` — RPC em vez de reduce.
- `src/licitimart/web/src/app/pipeline/page.tsx` — RPC em vez de filter/slice.

## Order of work

1. Migration + `supabase db push`.
2. Funções novas em `dossiesSupabase.ts`.
3. As três páginas, uma de cada vez, `npm run build` a cada uma.
4. Teste real: abrir uma contratação que sabidamente está fora das primeiras 1.000 (confirma o bug de 404 estava real e foi corrigido), conferir `/metricas` bate com `SELECT count(*)` direto, conferir `/dossies` pagina até o fim (~472 páginas).
