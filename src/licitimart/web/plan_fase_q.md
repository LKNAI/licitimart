# Plan: Fase Q — Impugnação Assistida sobre documento real (RF-017)

Escrito antes do código. Décima segunda fase da sequência.

## Problema

O detector (`spikes/03_impugnacao_assistida/detector.py`) é **regex/heurística determinística, sem LLM** (README do spike, rodada 2: 14/14 casos sintéticos corretos) e `minuta.py` gera o rascunho por **template fixo, sem geração de linguagem**. Mesmo assim, `/impugnacoes` só mostra exemplos sintéticos exportados por script — nunca foi ligado ao texto real extraído (`documentos_contratacao.texto_extraido`, disponível desde a Fase K/N). A tabela `impugnacoes` (schema inicial) já existe, tenant-scoped, com RLS de insert pronta — nunca foi usada.

## Decisão de escopo

1. **Portar detector + gerador de minuta pra TypeScript**, mesmo padrão de Fase N (execução on-demand no runtime Node, não subprocesso Python) — disparado por um botão em `/dossies/[id]`, sobre o texto já extraído daquele documento específico.
2. **Rótulo honesto sobre o que isso é**: o detector nunca foi validado contra texto real e variado (só sintético, no spike). Resultado real precisa dizer isso explicitamente — achado é "candidato", não conclusão, e a interface não pode sugerir que passou por validação que não aconteceu.
3. **Zero achado é resultado válido e mostrado**, não escondido — "nenhum padrão conhecido detectado neste documento" é diferente de "não avaliado ainda".
4. **RN-006 nunca opcional**: aviso fixo no topo/rodapé da minuta, sem parâmetro pra remover (mesma regra do Python).
5. **Sem migration nova** — a tabela `impugnacoes` e a RLS de insert (`impugnacoes_insert_membros`, já checa `is_tenant_member`) já existem desde o schema inicial e nunca foram usadas.

## Files that change

- `src/licitimart/web/src/lib/impugnacao/detector.ts` (novo) — porta os 8 padrões de `detector.py`.
- `src/licitimart/web/src/lib/impugnacao/minuta.ts` (novo) — porta `minuta.py` (template fixo + AVISO_RN006).
- `src/licitimart/web/src/app/dossies/[id]/actions.ts` — `detectarRestritividade(documentoId, contexto)`: lê `texto_extraido`, roda o detector, se achar algo gera a minuta e insere em `impugnacoes` pro tenant do usuário.
- `src/licitimart/web/src/app/dossies/[id]/page.tsx` — botão "Detectar restritividade no texto real" junto de cada documento com `status_extracao = extraido_nativo`.
- `src/licitimart/web/src/app/impugnacoes/page.tsx` — passa a listar também as impugnações reais do tenant (`impugnacoes` table), separadas visualmente dos exemplos sintéticos, com o aviso de "não validado em edital real e variado" bem visível.

## Order of work

1. `detector.ts` + `minuta.ts`, sem UI ainda — testar contra o texto real já extraído do edital de `real-68` via script isolado, comparando manualmente se dispara (ou não) de forma plausível antes de expor na tela.
2. Server Action + botão.
3. `/impugnacoes` com resultado real, `npm run build`.
4. Teste real: clicar no botão sobre o documento de `real-68` (edital de pavimentação, 40 páginas), conferir o resultado — seja achado ou "nenhum padrão detectado", ambos são resultado válido.
