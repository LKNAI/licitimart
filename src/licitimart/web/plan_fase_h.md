# Plan: Fase H — Diff de Retificação real (RF-018)

Escrito antes do código. Terceira fase da sequência para fechar a v1.

## Estado atual
`upsert_contratacoes` (`src/licitimart/ingestao/supabase_store.py`) faz `upsert` por `numero_controle_pncp` a cada coleta — **sobrescreve o valor anterior sem guardar rastro nenhum**. Não há como detectar retificação porque o "antes" já foi perdido no momento em que o "depois" chega. A tela `/retificacoes` mostra um diff real (algoritmo LCS já existe e funciona) sobre um par de textos **estático**, não sobre retificação de verdade.

## Decisão de escopo
1. **Diff é sobre os campos estruturados que já coletamos** (`objeto`, `modalidade`, `valor_estimado`, `data_publicacao`, `orgao`, `municipio_uf`) — **não** sobre o texto completo do edital em PDF, porque RF-002 (OCR/extração) não existe ainda. Isso é uma diferença real de escopo em relação ao mock atual (que mostra parágrafo de cláusula contratual) — registrado explicitamente na tela nova, não escondido.
2. **Detecção acontece no coletor, antes do upsert sobrescrever** — busca o estado atual de cada `numero_controle_pncp` do lote, compara campo a campo com o que está chegando, grava uma linha em `retificacoes` por campo que mudou, só então faz o upsert. Se não havia linha antes (primeira coleta daquele edital), não é retificação, é publicação — não gera diff.
3. **`retificacoes` é dado público (mesmo padrão de `contratacoes`/`itens_licitacao`)** — não é por tenant, é fato objetivo sobre o edital em si. RLS: select para qualquer autenticado, escrita só via `service_role` (mesmo padrão).
4. **Alerta proativo (notificação) fica fora desta fase** — RF-018 pede "alerta automático"; esta fase entrega a detecção e o registro real, que é pré-requisito. Alerta (e-mail/push) é aditivo depois.

## Files that change
- `supabase/migrations/<timestamp>_fase_h_retificacoes.sql` — tabela `retificacoes` (`contratacao_id`, `numero_controle_pncp`, `campo`, `valor_anterior`, `valor_novo`, `detectado_em`), RLS select-autenticados/nenhuma policy de escrita (só `service_role`).
- `src/licitimart/ingestao/supabase_store.py` — `upsert_contratacoes` passa a buscar o estado atual antes de sobrescrever, comparar, gravar `retificacoes`, só então upsert.
- `src/licitimart/web/src/app/retificacoes/page.tsx` — lista retificações reais do Supabase; para o campo `objeto` usa `diffPalavras` (word-level); para os demais campos, mostra "antes → depois" simples (não faz sentido diff de palavra em um valor numérico ou enum curto).

## Order of work
1. Migration + validar com `pglast` + `supabase db push` (agora automático, ver Fase G).
2. `supabase_store.py`: lógica de detecção + gravação.
3. Teste com script Python descartável (sem rodar o coletor completo contra o PNCP real — não precisa, é lógica pura de comparação): plantar uma `contratacao` via `service_role`, chamar `upsert_contratacoes` com valores diferentes para o mesmo `numero_controle_pncp`, confirmar que `retificacoes` recebeu as linhas certas (um `campo` por diferença) e que a segunda chamada sem mudança nenhuma não gera linha nova.
4. `page.tsx` real + `npm run build`.
5. Teste de RLS: usuário autenticado qualquer consegue ler `retificacoes` (dado público), igual a `contratacoes`.

## Concluído (10/09/2026)

Migration aplicada via `supabase db push`. Dois bugs reais pegos pelo teste (por isso o teste existe, não é formalidade):
1. `valor_estimado` comparado como string bruta (`"100000.0"` vs `"100000"`) gerava falso-positivo em alguns formatos — corrigido comparando como `float`.
2. `data_publicacao`: Postgres devolve com timezone explícito (`+00:00`), o PNCP manda sem timezone — comparar `datetime` aware vs naive nunca dá `True` (não lança erro, só nunca bate), gerando falso-positivo **mesmo sem nenhuma mudança real**. Corrigido normalizando os dois lados para naive antes de comparar.

Testado com script Python descartável (upsert 3x sobre o mesmo `numero_controle_pncp`: primeira coleta, coleta idêntica, coleta com objeto+valor mudados) e script Node (query real via PostgREST com `join` embutido em `contratacoes`, sessão de usuário autenticado). 3+3 checagens, todas passaram após as correções.

## Proof
- [x] Coletor detecta e grava retificação real quando um campo muda entre duas coletas do mesmo `numero_controle_pncp` — testado para `objeto` e `valor_estimado`.
- [x] Coletor NÃO grava nada quando não há mudança (inclusive descontando falso-positivo de timezone) nem quando é a primeira coleta.
- [x] `/retificacoes` lê dado real do Supabase via `join` PostgREST, confirmado com sessão de usuário real.
