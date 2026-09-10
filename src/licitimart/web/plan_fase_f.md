# Plan: Fase F — Perfil do Tenant (RF-004, catálogo real)

Escrito antes do código. Primeira de uma sequência de fases para fechar a v1 (ver roadmap na conversa) — prioridade por não depender de crédito de LLM.

## Estado atual
`tenant_catalogo_itens` já existe no schema (`descricao`, `cnae`, `tenant_id`) com policy `for all` para membros do tenant — **nenhuma migration nova nesta fase**. `/tenant` é só UI client-side com `useState`, avisando explicitamente "não persiste nada" (Fase C, quando não havia Supabase real ainda).

## Decisões de escopo
1. **Item de catálogo = descrição + CNAE opcional, um registro por linha da tabela** — não um blob de texto solto. Isso já é o que o schema modela; a UI antiga (textarea "um item por linha") era um placeholder da fase sem banco, não o formato real.
2. **Qualquer membro do tenant pode adicionar/remover item de catálogo, não só admin** — é dado operacional do negócio (o que a empresa vende), não gestão de acesso; a policy do banco já reflete isso (`for all` para qualquer membro).
3. **Upload de atestados/certidões continua fora desta fase** — depende de Supabase Storage, que não foi decidido/configurado ainda. Mantém o campo desabilitado com o aviso já existente.

## Files that change
- `src/licitimart/web/src/app/tenant/page.tsx` — vira server component: busca `tenant_id` do usuário + lista `tenant_catalogo_itens` real.
- `src/licitimart/web/src/app/tenant/actions.ts` — `adicionarItem`, `removerItem` (Server Actions, insert/delete direto — RLS já protege, sem RPC necessária pois não há regra de negócio especial além de "é membro").
- `src/licitimart/web/src/app/tenant/ItemCatalogoForm.tsx` / lista — client components, mesmo padrão visual de `tenant/membros`.

## Order of work
1. Reescrever a tela + actions.
2. `npm run build`.
3. Teste com sessão real (script Node, mesmo padrão da Fase E): usuário adiciona 2 itens, lista reflete, remove 1, lista reflete de novo; usuário de outro tenant não vê os itens (RLS já coberta na Fase D/C, só confirmar que não regrediu).

## Concluído (10/09/2026)

Testado com script Node descartável, sessão real de cada usuário (nunca `service_role` para verificar acesso), contra o Supabase real: dois tenants de teste, cada um com seu usuário. 5/5 checagens passaram.

## Proof
- [x] Adicionar/remover item de catálogo funciona com sessão real, refletido na tela.
- [x] Isolamento entre tenants não regrediu — usuário do tenant B não vê itens do tenant A.
