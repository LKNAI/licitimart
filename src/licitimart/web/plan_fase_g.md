# Plan: Fase G — Go/No-Go real (RF-007)

Escrito antes do código. Segunda fase da sequência para fechar a v1 (Fase F concluiu RF-004).

## Estado atual
`analises` já existe no schema (`tenant_id`, `contratacao_id`, `veredito` default `revisao_humana`, unique por `(tenant_id, contratacao_id)`) com policy de `select` e `insert` para membros — **mas sem policy de `update`**. Hoje `dossiesSupabase.ts` sempre retorna `veredito: "revisao_humana"` fixo (comentário no código confirma: não há leitura de `analises`), e o botão de mudar veredito não existe em lugar nenhum da UI.

## Decisão de escopo
1. **Upsert por `(tenant_id, contratacao_id)`, não insert simples** — um usuário pode mudar de ideia sobre o mesmo dossiê. Isso exige uma policy de `update` nova (falta no schema atual), no mesmo padrão de `impugnacoes_update_membros` (que já existe e cobre exatamente esse caso).
2. **Veredito é por tenant, nunca global** — a mesma `contratacao_id` pode ter veredito diferente por tenant (já é a decisão de modelagem documentada no comentário do schema inicial); a UI busca só a análise do tenant do usuário logado.
3. **Só dossiês reais (`origem: "pncp_real"`) recebem o controle de mudar veredito** — os 3 mock ilustrativos ficam como estão (são exemplo fixo, não têm `contratacao_id` real para gravar `analises` contra).
4. **Exportação de dossiê de decisão em .docx/PDF fica fora desta fase** — é a segunda metade de RF-007; melhor entregar "decisão real e persistida" primeiro, exportação é aditiva depois.

## Files that change
- `supabase/migrations/<timestamp>_fase_g_veredito.sql` — policy `analises_update_membros` (update, `using`/`with check` por `is_tenant_member(tenant_id)`, mesmo padrão de `impugnacoes_update_membros`).
- `src/licitimart/web/src/lib/data/dossiesSupabase.ts` — também busca `analises` do tenant do usuário logado e sobrepõe `veredito` por `contratacao_id` (default continua `revisao_humana` quando não há análise ainda).
- `src/licitimart/web/src/app/dossies/[id]/page.tsx` — 3 botões (Go/Revisão Humana/No-Go) que chamam a Server Action, visíveis só para `origem: "pncp_real"`.
- `src/licitimart/web/src/app/dossies/[id]/actions.ts` — `definirVeredito(contratacaoId, veredito)`: pega `tenant_id` do usuário, faz upsert em `analises`.

## Order of work
1. Migration (policy nova) + pedir para colar no SQL Editor.
2. Enquanto isso: `dossiesSupabase.ts` + botões + action.
3. `npm run build`.
4. Teste com sessão real: usuário A marca um dossiê real como "Go", `/dossies/[id]` e `/pipeline` refletem; usuário de outro tenant, olhando o mesmo dossiê, continua vendo "Revisão Humana" (veredito é por tenant); A muda de novo para "No-Go" (upsert, não duplicata — `unique(tenant_id, contratacao_id)` teria acusado erro se fosse insert simples).

## Concluído (10/09/2026)

Migration aplicada via `supabase db push` (primeira vez sem colagem manual — ver CLAUDE.md e `supabase/README.md`, `supabase login` feito pelo usuário nesta sessão). Testado com script Node descartável, sessão real de cada usuário: 5/5 checagens passaram, incluindo o ponto que a policy nova existe pra resolver — mudar de veredito duas vezes (upsert = insert depois update) funcionou sem erro de RLS.

## Proof
- [x] Marcar veredito funciona com sessão real.
- [x] Veredito é isolado por tenant (B não vê nenhuma análise da contratação de teste que só A analisou).
- [x] Mudar de veredito duas vezes funciona (upsert, exercitando a policy de update nova).
